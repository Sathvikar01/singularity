export const DT=1/30;
export const ROLES=['Eyes / head','Left arm','Right arm','Torso / back','Left leg','Right leg'];
export type Input={x:number;z:number;action:boolean};
export type Node={x:number;y:number;z:number;px:number;py:number;pz:number};
export type Body={nodes:Node[];stage:number;falls:number;ticks:number;finished:boolean;grip:number;cube:Node;delivered:boolean;look:number};
export const neutralInputs=():Input[]=>Array.from({length:6},()=>({x:0,z:0,action:false}));
const node=(x:number,y:number,z:number):Node=>({x,y,z,px:x,py:y,pz:z});
export function createBody(z=0):Body{return {nodes:[node(0,2,z),node(0,3,z),node(-1,2,z),node(1,2,z),node(-.45,.35,z),node(.45,.35,z)],stage:0,falls:0,ticks:0,finished:false,grip:-1,cube:node(0,.5,18),delivered:false,look:0};}
export const LINKS=[[0,1,1],[0,2,1],[0,3,1],[0,4,1.7],[0,5,1.7],[4,5,.9],[1,2,1.4],[1,3,1.4]];
export function ground(x:number,z:number){if(z>7&&z<15)return Math.abs(x)<1.3?0:-30;return Math.abs(x)<4.6&&z>-5&&z<47?0:-30;}
function integrate(n:Node,fx=0,fy=0,fz=0){const vx=(n.x-n.px)*.93,vy=(n.y-n.py)*.98,vz=(n.z-n.pz)*.93;n.px=n.x;n.py=n.y;n.pz=n.z;n.x+=vx+fx*DT*DT;n.y+=vy+(fy-15)*DT*DT;n.z+=vz+fz*DT*DT;}
export function step(b:Body,inputs:Input[]){
 if(b.finished)return;
 if(b.nodes[0].y<-5||b.cube.y<-8){const fresh=createBody(b.stage===0?0:b.stage===1?16:28);b.nodes=fresh.nodes;if(!b.delivered)b.cube=fresh.cube;b.falls++;b.grip=-1;return;}
 b.ticks++;const n=b.nodes,torso=n[0];
 // Upright assistance is a spring, not a kinematic lock. Torso player adds balance.
 for(let i=0;i<6;i++){const role=i===0?3:i===1?0:i===2?1:i===3?2:i;const u=inputs[role];const leg=i>=4;const target=i===0?2:i===1?3:i<4?2:.35;const support=ground(torso.x,torso.z)>-1;let fy=support?(target-n[i].y)*70-(n[i].y-n[i].py)*130:0;
 if(u.action&&leg&&n[i].y<.65)fy+=180;
 integrate(n[i],u.x*(leg?48:i===0?35:18),fy,u.z*(leg?65:i===0?22:15));}
 b.look+=inputs[0].x*.045;
 for(let pass=0;pass<7;pass++){for(const [a,c,len]of LINKS){const p=n[a],q=n[c],dx=q.x-p.x,dy=q.y-p.y,dz=q.z-p.z,d=Math.hypot(dx,dy,dz)||1,k=(d-len)/d*.5;p.x+=dx*k;p.y+=dy*k;p.z+=dz*k;q.x-=dx*k;q.y-=dy*k;q.z-=dz*k;}for(let i=0;i<n.length;i++){const p=n[i],floor=ground(p.x,p.z)+.25;if(p.y<floor){p.y=floor;p.py=p.y;}}}
 integrate(b.cube);const floor=ground(b.cube.x,b.cube.z)+.45;if(b.cube.y<floor){b.cube.y=floor;b.cube.py=floor;}
 if(b.grip>=0&&!inputs[b.grip].action)b.grip=-1;
 if(b.grip<0)for(const role of [1,2]){const hand=n[role+1];if(inputs[role].action&&Math.hypot(hand.x-b.cube.x,hand.y-b.cube.y,hand.z-b.cube.z)<2.6)b.grip=role;}
 if(b.grip>=0){const h=n[b.grip+1];Object.assign(b.cube,{x:h.x,y:h.y-.45,z:h.z+.7,px:h.x,py:h.y-.45,pz:h.z+.7});}
 if(b.stage===0&&torso.z>=15&&torso.z<18&&torso.y>.7)b.stage=1;
 if(b.stage===1&&b.cube.z>24&&b.cube.z<28&&Math.abs(b.cube.x)<2.5){b.delivered=true;b.stage=2;b.grip=-1;}
 // Oscillating sweeper physically knocks the body off balance.
 if(torso.z>30&&torso.z<37){const sweep=Math.sin(b.ticks*DT*1.8)*3.6;if(Math.abs(torso.x-sweep)<.65){for(const p of n){p.x+=.13*Math.cos(b.ticks*DT*1.8);p.py-=.014;}}}
 if(b.stage===2&&torso.z>=42&&torso.z<46&&torso.y>.7){b.stage=3;b.finished=true;}
 if(torso.y<-5||b.cube.y<-8){const fresh=createBody(b.stage===0?0:b.stage===1?16:28);b.nodes=fresh.nodes;if(!b.delivered)b.cube=fresh.cube;b.falls++;b.grip=-1;}
}
export const elapsedMs=(b:Body)=>Math.round(b.ticks*1000/30)+b.falls*3000;
export const formatTime=(ms:number)=>`${Math.floor(ms/60000).toString().padStart(2,'0')}:${((ms%60000)/1000).toFixed(2).padStart(5,'0')}`;
