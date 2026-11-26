import {assetUrl} from './asset-base.mjs';
import {parseNPCMixSource} from './npc-mixer.mjs';
import {createSpineActor} from './spine-actor.mjs';
import {babyPose,feedingView} from './baby-feeding.mjs';
export const BABY_FOOD_CONSTANTS={
 clampDistanceSq:0.001,
 eatDistanceSq:8.0,
 animationTime:0.125,
 returnSpeed:0.25,
 dragTimeoutSeconds:1.0,
 minScale:1.0,
 maxScale:1.5,
 colliderSize:3.0,
 zOffset:-1,
};
export const babyFoodSinusoidalOut=u=>{const t=Math.max(0,Math.min(1,u));return Math.sin(t*Math.PI/2);};
export function babyFoodOffset(feeds=0,slotScaleX=1){
 // INFERRED: native _foodOffset defines keys 0..3; feeds 4 clamps to feeds >= 2 (-1.22, +2.0).
 const xBase=feeds>=2?-1.22:-1.05,facing=slotScaleX<0?-1:1;
 return {x:xBase*facing,y:2.0,z:BABY_FOOD_CONSTANTS.zOffset,facing};
}
export function babyFoodSpawnPosition(slot,feeds=0){
 const off=babyFoodOffset(feeds,slot?.scaleX??1);
 return {x:(slot?.XPos??0)+off.x,y:(slot?.YPos??0)+off.y,z:(slot?.ZPos??0)+off.z,facing:off.facing};
}
function startScaleTween(fs,to){
 fs.tweenFrom=fs.scale;fs.tweenTo=to;fs.tweenElapsed=0;fs.tweenDuration=BABY_FOOD_CONSTANTS.animationTime;
}
function stepScaleTween(fs,dt){
 if(fs.tweenDuration>0&&fs.tweenElapsed<fs.tweenDuration){
  fs.tweenElapsed=Math.min(fs.tweenDuration,fs.tweenElapsed+dt);
  const u=babyFoodSinusoidalOut(fs.tweenElapsed/fs.tweenDuration);
  fs.scale=fs.tweenFrom+(fs.tweenTo-fs.tweenFrom)*u;
 }else{
  fs.scale=fs.tweenTo;
 }
 return fs.tweenElapsed>=fs.tweenDuration;
}
export function createBabyFoodState({spawn,slotGUID,feeds=0}){
 return {
  state:'spawning',slotGUID,feeds,
  startX:spawn.x,startY:spawn.y,x:spawn.x,y:spawn.y,z:spawn.z,facing:spawn.facing,
  scale:0,tweenFrom:0,tweenTo:BABY_FOOD_CONSTANTS.minScale,tweenElapsed:0,tweenDuration:BABY_FOOD_CONSTANTS.animationTime,
  dragStartedAt:null,stallRemaining:BABY_FOOD_CONSTANTS.dragTimeoutSeconds,eatTriggered:false,
 };
}
export function hitBabyFoodCollider(fs,worldPoint){
 if(!fs||!worldPoint||fs.state!=='idle')return false;
 const half=BABY_FOOD_CONSTANTS.colliderSize/2;
 return Math.abs(worldPoint.x-fs.x)<=half&&Math.abs(worldPoint.y-fs.y)<=half;
}
export function beginBabyFoodDrag(fs,now=Date.now()){
 if(!fs||fs.state!=='idle')return false;
 fs.state='dragging';fs.dragStartedAt=now;fs.stallRemaining=BABY_FOOD_CONSTANTS.dragTimeoutSeconds;
 startScaleTween(fs,BABY_FOOD_CONSTANTS.maxScale);
 return true;
}
export function moveBabyFoodDrag(fs,worldPoint){
 if(!fs||fs.state!=='dragging'||!worldPoint)return false;
 fs.x=worldPoint.x;fs.y=worldPoint.y;fs.stallRemaining=BABY_FOOD_CONSTANTS.dragTimeoutSeconds;
 return true;
}
export function endBabyFoodDrag(fs,babyPos,dropPoint=null){
 if(!fs||fs.state!=='dragging')return false;
 if(dropPoint){fs.x=dropPoint.x;fs.y=dropPoint.y;}
 const sqBaby=(fs.x-babyPos.x)**2+(fs.y-babyPos.y)**2;
 if(sqBaby<BABY_FOOD_CONSTANTS.eatDistanceSq){
  fs.state='eating';startScaleTween(fs,0);return 'eating';
 }
 const sqStart=(fs.x-fs.startX)**2+(fs.y-fs.startY)**2;
 if(sqStart<=BABY_FOOD_CONSTANTS.clampDistanceSq){
  fs.state='idle';fs.x=fs.startX;fs.y=fs.startY;startScaleTween(fs,BABY_FOOD_CONSTANTS.minScale);return 'idle';
 }
 fs.state='returning';startScaleTween(fs,BABY_FOOD_CONSTANTS.minScale);return 'returning';
}
export function stepBabyFoodState(fs,dtSeconds,babyPos,spawnPos=null){
 if(!fs)return {event:null};
 if(spawnPos){fs.startX=spawnPos.x;fs.startY=spawnPos.y;fs.z=spawnPos.z;fs.facing=spawnPos.facing;}
 const dt=Math.max(0,dtSeconds);
 if(fs.state==='spawning'||fs.state==='idle'){fs.x=fs.startX;fs.y=fs.startY;}
 if(fs.state==='spawning'){
  if(stepScaleTween(fs,dt))fs.state='idle';
  return {event:null};
 }
 if(fs.state==='idle'){
  stepScaleTween(fs,dt);
  return {event:null};
 }
 if(fs.state==='dragging'){
  stepScaleTween(fs,dt);
  fs.stallRemaining-=dt;
  if(fs.stallRemaining<0){endBabyFoodDrag(fs,babyPos,null);return {event:'timeout'};}
  return {event:null};
 }
 if(fs.state==='returning'){
  const scaleDone=stepScaleTween(fs,dt);
  const factor=1-Math.pow(1-BABY_FOOD_CONSTANTS.returnSpeed,dt*60);
  fs.x+=(fs.startX-fs.x)*factor;fs.y+=(fs.startY-fs.y)*factor;
  const sqDist=(fs.startX-fs.x)**2+(fs.startY-fs.y)**2;
  if(sqDist<=BABY_FOOD_CONSTANTS.clampDistanceSq){
   fs.x=fs.startX;fs.y=fs.startY;
   if(scaleDone)fs.state='idle';
  }
  return {event:null};
 }
 if(fs.state==='eating'){
  const done=stepScaleTween(fs,dt);
  if(done&&!fs.eatTriggered){fs.eatTriggered=true;fs.state='done';return {event:'eat',x:fs.x,y:fs.y};}
  return {event:null};
 }
 return {event:null};
}
export function createBabySourceLoader(loadTexture){
 const families=new Map();
 return async(species,catalog)=>{
  const config=catalog.feeding.families[species.family];
  if(!families.has(species.family))families.set(species.family,Promise.all([fetch(assetUrl(config.atlasUrl)).then(r=>{if(!r.ok)throw Error('โหลด atlas ลูกมังกรไม่ได้');return r.text();}),fetch(assetUrl(config.binaryUrl)).then(r=>{if(!r.ok)throw Error('โหลดอนิเมชันลูกมังกรไม่ได้');return r.arrayBuffer();})]).then(([atlasText,binary])=>parseNPCMixSource({atlasText,binary:new Uint8Array(binary),config:{}})).catch(e=>{families.delete(species.family);throw e;}));
  const source=await families.get(species.family),skin=source.skeletonData.findSkin(species.id);if(!skin)throw Error('ไม่พบ skin ลูกมังกร '+species.id);
  const names=new Set([catalog.feeding.food.texture]);for(const s of [skin,source.skeletonData.defaultSkin])if(s)for(const slot of s.attachments)if(slot)for(const a of Object.values(slot))if(a.region){const name=config.pages[a.region.page.name];if(!name)throw Error('ไม่พบ atlas page '+a.region.page.name);names.add(name);}
  const textures=new Map(await Promise.all([...names].map(async name=>[name,await loadTexture(name)])));return {source,config,textures};
 };
}
export function createBabyActor(PIXI,baby,species,catalog,loaded){
 const rig=createSpineActor(PIXI,{skeletonData:loaded.source.skeletonData,skin:species.id,textures:loaded.textures,pages:loaded.config.pages,mixSeconds:catalog.feeding.mixSeconds}),{mesh,parts,state,skeleton}=rig;
 function update(actor,now,dev,anticipating=false){
  const f=feedingView(actor,now),pose=dev?{name:'Stage'+f.stage+'/Idle',elapsed:0,loop:true,key:'dev:'+f.stage}:anticipating?{name:'Stage'+f.stage+'/EatingAnticipation',elapsed:Math.max(0,(now-(typeof anticipating==='number'?anticipating:now))/1000),loop:true,key:'anticipate:'+f.stage+':'+anticipating}:babyPose(actor,catalog,now);
  return rig.sample(pose,now,dev);
 }
 return {mesh,parts,update,state,skeleton};
}
