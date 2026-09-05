import {DbConnection} from './module_bindings';
export const SERVER=(import.meta as any).env.VITE_SPACETIMEDB_URI||'https://maincloud.spacetimedb.com';
export const DATABASE=(import.meta as any).env.VITE_SPACETIMEDB_DATABASE||'singularity-relay-sankalphs';
export function connect(onReady:(c:DbConnection)=>void,onUpdate:()=>void,onError:(message:string)=>void){
 const token=sessionStorage.getItem('singularity-token-'+SERVER)||undefined;
 const conn=DbConnection.builder().withUri(SERVER).withDatabaseName(DATABASE).withToken(token).onConnect((c,_identity,token)=>{sessionStorage.setItem('singularity-token-'+SERVER,token);c.db.team.onInsert(onUpdate);c.db.team.onUpdate(onUpdate);c.db.room.onInsert(onUpdate);c.db.room.onUpdate(onUpdate);c.db.player.onInsert(onUpdate);c.db.player.onDelete(onUpdate);c.db.player.onUpdate(onUpdate);c.db.result.onInsert(onUpdate);c.subscriptionBuilder().onApplied(()=>onReady(c)).onError(ctx=>onError(String(ctx.event))).subscribe(['SELECT * FROM room','SELECT * FROM player','SELECT * FROM team','SELECT * FROM result']);}).onConnectError((_ctx,e)=>onError(e.message)).onDisconnect(()=>onError('Connection lost. Rejoin the room to reconnect.')).build();return conn;
}

