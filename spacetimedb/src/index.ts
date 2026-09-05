import {schema,table,t,SenderError} from 'spacetimedb/server';
import {ScheduleAt} from 'spacetimedb';
import {createBody,step,neutralInputs,elapsedMs,type Body} from '../../shared/physics';
const room=table({public:true},{id:t.string().primaryKey(),host:t.identity(),state:t.string(),startAt:t.u64(),created:t.u64()});
const player=table({public:true},{id:t.identity().primaryKey(),room:t.string(),team:t.u32(),role:t.u32(),name:t.string(),x:t.f64(),z:t.f64(),action:t.bool(),seen:t.u64()});
const team=table({public:true},{id:t.string().primaryKey(),room:t.string(),number:t.u32(),body:t.string(),finishMs:t.u32()});
const result=table({public:true},{id:t.u64().primaryKey().autoInc(),room:t.string(),team:t.u32(),names:t.string(),timeMs:t.u32(),created:t.u64()});
const tick=table({},{id:t.u64().primaryKey().autoInc(),scheduledAt:t.scheduleAt()});
const db=schema({room,player,team,result,tick});export default db;
const now=(ctx:{timestamp:{microsSinceUnixEpoch:bigint}})=>ctx.timestamp.microsSinceUnixEpoch;
export const init=db.init(ctx=>{ctx.db.tick.insert({id:0n,scheduledAt:ScheduleAt.interval(33333n)});});
export const join=db.reducer({code:t.string(),name:t.string(),teamNumber:t.u32(),role:t.u32()},(ctx,a)=>{
 const code=a.code.trim().toUpperCase();if(!/^[A-Z0-9]{3,12}$/.test(code)||a.role>5||a.teamNumber>3||!a.name.trim())throw new SenderError('Enter a room code (3–12 letters/numbers), name, and valid role.');
 let r=ctx.db.room.id.find(code);if(!r){if([...ctx.db.room.iter()].length>=200)throw new SenderError('Lobby capacity reached.');r=ctx.db.room.insert({id:code,host:ctx.sender,state:'lobby',startAt:0n,created:now(ctx)});}
 const previous=ctx.db.player.id.find(ctx.sender);
 if(r.state!=='lobby'&&!(previous?.room===code&&previous.team===a.teamNumber))throw new SenderError('This race has started. Choose another room.');
 for(const p of ctx.db.player.iter())if(p.room===code&&p.team===a.teamNumber&&p.role===a.role&&!p.id.isEqual(ctx.sender))throw new SenderError('That body part already has a pilot.');
 ctx.db.player.id.delete(ctx.sender);ctx.db.player.insert({id:ctx.sender,room:code,team:a.teamNumber,role:a.role,name:a.name.trim().slice(0,20),x:0,z:0,action:false,seen:now(ctx)});
 const id=code+':'+a.teamNumber;if(!ctx.db.team.id.find(id))ctx.db.team.insert({id,room:code,number:a.teamNumber,body:JSON.stringify(createBody()),finishMs:0});
});
export const input=db.reducer({x:t.f64(),z:t.f64(),action:t.bool()},(ctx,a)=>{const p=ctx.db.player.id.find(ctx.sender);if(!p)return;if(!Number.isFinite(a.x)||!Number.isFinite(a.z))throw new SenderError('Invalid input');if(now(ctx)-p.seen<25000n)return;ctx.db.player.id.update({...p,x:Math.max(-1,Math.min(1,a.x)),z:Math.max(-1,Math.min(1,a.z)),action:a.action,seen:now(ctx)});});
export const start=db.reducer(ctx=>{const p=ctx.db.player.id.find(ctx.sender);if(!p)throw new SenderError('Join first');const r=ctx.db.room.id.find(p.room)!;if(!r.host.isEqual(ctx.sender))throw new SenderError('Only the room host can start a race');if(r.state!=='lobby'&&r.state!=='finished')throw new SenderError('Race already running');for(const tm of ctx.db.team.iter())if(tm.room===r.id)ctx.db.team.id.update({...tm,body:JSON.stringify(createBody()),finishMs:0});ctx.db.room.id.update({...r,state:'countdown',startAt:now(ctx)+3000000n});});
export const leave=db.reducer(ctx=>{ctx.db.player.id.delete(ctx.sender);});
export const disconnected=db.clientDisconnected(ctx=>{ctx.db.player.id.delete(ctx.sender);});
export const simulate=db.reducer({onSchedule:tick},{arg:tick.rowType},ctx=>{
 const time=now(ctx);const players=[...ctx.db.player.iter()];
 for(const r0 of ctx.db.room.iter()){
 let r=r0;const members=players.filter(p=>p.room===r.id);
 if(!members.length){for(const tm of ctx.db.team.iter())if(tm.room===r.id)ctx.db.team.id.delete(tm.id);ctx.db.room.id.delete(r.id);continue;}
 if(!members.some(p=>p.id.isEqual(r.host))){r={...r,host:members[0].id};ctx.db.room.id.update(r);}
 if(r.state==='countdown'&&time>=r.startAt){r={...r,state:'racing'};ctx.db.room.id.update(r);}
 if(r.state!=='racing')continue;
 let active=0,finished=0;
 for(const tm of ctx.db.team.iter()){if(tm.room!==r.id||!members.some(p=>p.team===tm.number))continue;active++;if(tm.finishMs){finished++;continue;}
 const b=JSON.parse(tm.body) as Body;const inputs=neutralInputs();for(const p of members)if(p.team===tm.number&&time-p.seen<500000n)inputs[p.role]={x:p.x,z:p.z,action:p.action};step(b,inputs);
 // Wall-clock time is authoritative; simulation lag never improves a ranked result.
 const finishMs=b.finished?Number((time-r.startAt)/1000n)+b.falls*3000:0;
 ctx.db.team.id.update({...tm,body:JSON.stringify(b),finishMs});
 if(finishMs){finished++;ctx.db.result.insert({id:0n,room:r.id,team:tm.number,names:members.filter(p=>p.team===tm.number).map(p=>p.name).join(', '),timeMs:finishMs,created:time});}
 }
 if((active>0&&finished===active)||time-r.startAt>600000000n)ctx.db.room.id.update({...r,state:'finished'});
 }
});
