import {summonOrbPose,orbGrowthStart} from './summon-orb-motion.mjs';
import {attractionParticleStates,attractionParticlePoint,attractionHeadRotation,attractionHeadJoin} from './attraction-particles.mjs';
import {NATIVE_ATTRACTION_PARTICLES} from './generated/native-attraction-particles.mjs';
import {nativeGradient} from './egg-streak.mjs';
import {SUMMON_TOTAL_SECONDS} from './summon-timing.mjs';
import {createRibbonLayer,ribbonWindow} from './beam-ribbon.mjs';
export {createRibbonLayer,ribbonWindow} from './beam-ribbon.mjs';
import {attachSummonShader,updateSummonShader,createNativeVortex} from './summon-shaders.mjs';
import {slotTiming,SYMBOL_CYCLE_SECONDS,SYMBOL_CYCLE_STEP_SECONDS,SYMBOL_PULSE_HALF_SECONDS,SYMBOL_HOLD_SECONDS,SYMBOL_DROP_SECONDS,SYMBOL_LAND_SECONDS} from './summon-timing.mjs';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const quadraticIn=x=>{const t=clamp(x);return t*t;};
export const sinusoidalInOut=x=>{const t=clamp(x);return 0.5-0.5*Math.cos(Math.PI*t);};
function seededUnit(seed,index,leg){
 const s=String(seed??0);let h=2166136261^((index+1)*0x9e3779b1)^((leg+1)*0x85ebca6b);
 for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;
 h=Math.imul(h^(h>>>16),0x85ebca6b)>>>0;h=Math.imul(h^(h>>>13),0xc2b2ae35)>>>0;
 return ((h^(h>>>16))>>>0)/4294967296;
}
export function symbolHoverDuration(seed,index,leg){return 3+(seededUnit(seed,index,leg)-0.5)*1.5;}
export function symbolHoverOffset(hoverElapsed,seed=0,symbolIndex=0){
 if(hoverElapsed<=0)return -0.4;
 if(!Number.isFinite(hoverElapsed))return 0.15;
 let t=hoverElapsed,dur=symbolHoverDuration(seed,symbolIndex,0);
 if(t<dur)return -0.4+0.55*sinusoidalInOut(t/dur);
 t-=dur;
 for(let leg=1;leg<10000;leg++){
  dur=symbolHoverDuration(seed,symbolIndex,leg);
  const from=leg%2===1?0.15:-0.15,to=-from;
  if(t<dur)return from+(to-from)*sinusoidalInOut(t/dur);
  t-=dur;
 }
 return 0;
}
export function symbolSpotPose(t,seed=0,symbolIndex=0){
 if(t<=0)return {opacity:0,yOffset:0,scale:1,locked:false,cycleIndex:0};
 if(t<SYMBOL_CYCLE_SECONDS){
  return {opacity:clamp(t/(SYMBOL_CYCLE_SECONDS*0.5)),yOffset:0.75*quadraticIn(t/SYMBOL_CYCLE_SECONDS),scale:1,locked:false,cycleIndex:Math.min(10,Math.floor(t/SYMBOL_CYCLE_STEP_SECONDS))};
 }
 const pulseMid=SYMBOL_CYCLE_SECONDS+SYMBOL_PULSE_HALF_SECONDS,pulseEnd=pulseMid+SYMBOL_PULSE_HALF_SECONDS,holdEnd=pulseEnd+SYMBOL_HOLD_SECONDS;
 if(t<pulseMid)return {opacity:1,yOffset:0.75,scale:1+0.25*quadraticIn((t-SYMBOL_CYCLE_SECONDS)/SYMBOL_PULSE_HALF_SECONDS),locked:true,cycleIndex:10};
 if(t<pulseEnd)return {opacity:1,yOffset:0.75,scale:1.25-0.25*quadraticIn((t-pulseMid)/SYMBOL_PULSE_HALF_SECONDS),locked:true,cycleIndex:10};
 if(t<holdEnd)return {opacity:1,yOffset:0.75,scale:1,locked:true,cycleIndex:10};
 if(t<SYMBOL_LAND_SECONDS)return {opacity:1,yOffset:0.75-1.15*quadraticIn((t-holdEnd)/SYMBOL_DROP_SECONDS),scale:1,locked:true,cycleIndex:10};
 return {opacity:1,yOffset:symbolHoverOffset(t-SYMBOL_LAND_SECONDS,seed,symbolIndex),scale:1,locked:true,cycleIndex:10};
}
export const castProgress=(active,now)=>clamp((now-active.summonAt)/(active.summonDoneAt-active.summonAt));
export function orbMotion(p){return summonOrbPose({summonAt:0,summonDoneAt:SUMMON_TOTAL_SECONDS*1000},p*SUMMON_TOTAL_SECONDS*1000);}

function itemAt(anchor,x,y,z){return {...anchor,GUID:'summon-decoration',SymbolID:'SummonEffect',isMarker:false,XPos:anchor.XPos+x,YPos:anchor.YPos+y,ZPos:anchor.ZPos+z,rotation:0,scaleX:1,scaleY:1};}
// Preview and cast share the recovered native Trail program and source gradient profile.
export function drawSummonRibbon(layer,PIXI,start,end,t,opacity=1,time=t){layer.drawRibbon(start,end,t,opacity,time);}
export function createCastDecorations({PIXI,assets,active,texture,layerZ,resolvedOnly=false}){
 const anchor=assets.anchor,entries=[],make=(id,kind,mesh,item)=>({actorId:id,kind,mesh,item,layerZ,lastEffectFrame:-1});
 if(!resolvedOnly){const v=assets.vortex.pose,vortex=createNativeVortex(PIXI,texture(assets.vortex.maskTexture));vortex.eventMode='none';
 entries.push(make('summon-vortex','summon-vortex',vortex,{...itemAt(anchor,v.x,v.y,v.z),scaleX:v.scaleX,scaleY:v.scaleY}));
 const pops=new PIXI.Container();const popParticles=Array.from({length:36},(_,i)=>{const v=new PIXI.Sprite(texture(assets.egg.quadTexture));v.anchor.set(.5);v.tint=i%3===0?0xffffff:0x92ffe3;pops.addChild(v);return v;});const popEntry=make('summon-slot-pops','summon-slot-pops',pops,itemAt(anchor,0,0,-.6));popEntry.particles=popParticles;entries.push(popEntry);
 const trails=createRibbonLayer(PIXI,{profile:assets.beam,texture:texture(assets.egg.quadTexture)});trails.eventMode='none';entries.push(make('summon-trails','summon-trails',trails,itemAt(anchor,0,0,-.55)));
 }
 const names=assets.symbols[active.speciesId];
 const spots=assets.effects.filter(e=>e.name==='QuestionSymbol').map(f=>({...f,type:f.x<-1?'region':f.x>1?'rarity':'size'})).sort((a,b)=>['region','size','rarity'].indexOf(a.type)-['region','size','rarity'].indexOf(b.type));
 for(const [index,spot]of spots.entries()){
  const result=names[spot.type],pool=[...new Set(Object.values(assets.symbols).map(s=>s[spot.type]))],container=new PIXI.Container();container.eventMode='none';
  const variants=pool.map(name=>{const g=assets.sprites[name];if(!g)throw Error('Missing summon symbol '+name);
   const mesh=new PIXI.SimpleMesh(texture(g.texture),Float32Array.from(g.vertices),Float32Array.from(g.uvs),Uint16Array.from(g.indices));mesh.autoUpdate=false;mesh.eventMode='none';attachSummonShader(PIXI,mesh,g,assets.shaderProfiles.AttractionFlowerSymbol);updateSummonShader(mesh,0,0);
   mesh.scale.set(.43);mesh.visible=false;container.addChild(mesh);return {name,mesh};});
  const glow=assets.sprites[assets.egg.glowSprite],halo=new PIXI.SimpleMesh(texture(glow.texture),Float32Array.from(glow.vertices),Float32Array.from(glow.uvs),Uint16Array.from(glow.indices));halo.autoUpdate=false;halo.scale.set(.8);halo.tint=0x7bfff2;halo.alpha=0;container.addChildAt(halo,0);
  const e=make('summon-symbol-'+spot.type,'summon-symbol',container,itemAt(anchor,spot.x,spot.y,-.4));e.cycleGlow=halo;e.symbolIndex=index;e.originY=e.item.YPos;e.variants=variants;e.resultSymbol=result;e.displayedSymbol=null;e.symbolLocked=false;entries.push(e);
 }
 return entries;
}
export function updateCastDecoration(e,{active,assets,now,dev,PIXI}){
 let changed=false;if(e.gameplayHidden!==Boolean(dev)){e.gameplayHidden=Boolean(dev);changed=true;}if(dev)return changed;
 const summonAt=active.summonAt??active.appearanceAt??active.startedAt??now,rawSec=Math.max(0,(now-summonAt)/1000);
 const p=active.phase==='summoning'?castProgress(active,now):1,frame=rawSec;if(e.lastEffectFrame===frame)return changed;e.lastEffectFrame=frame;
 const motion=summonOrbPose(active,now),orb={x:0,y:-2+motion.lift};
 if(e.kind==='summon-vortex'){
  // Native SummonVortex fades its sprite to alpha 1 over 0.75s (SummonVortex ctor).
  updateSummonShader(e.mesh,rawSec,motion.vortexAlpha,e.item);
 }else if(e.kind==='summon-symbol'){
  const {startSec,landSec}=slotTiming(e.symbolIndex),ageSec=active.phase==='summoning'?rawSec:Math.max(rawSec,landSec);
  const pose=symbolSpotPose(ageSec-startSec,active.id??active.summonAt??0,e.symbolIndex),cycle=pose.cycleIndex;
  e.symbolLocked=pose.locked;e.displayedSymbol=pose.locked?e.resultSymbol:e.variants[cycle%e.variants.length].name;
  e.item.YPos=e.originY+pose.yOffset;e.item.scaleX=pose.scale;e.item.scaleY=pose.scale;
  for(const [i,v]of e.variants.entries()){const current=i===cycle%e.variants.length;v.mesh.visible=pose.locked?v.name===e.resultSymbol:current;v.mesh.y=0;updateSummonShader(v.mesh,rawSec,pose.opacity,{XPos:e.item.XPos,YPos:e.item.YPos,ZPos:e.item.ZPos,rotation:0,scaleX:e.item.scaleX*v.mesh.scale.x,scaleY:e.item.scaleY*v.mesh.scale.y});}
  e.cycleGlow.alpha=pose.locked||pose.opacity<=0?0:pose.opacity*(.18+.07*Math.sin(Math.max(0,ageSec-startSec)*25));
 }else if(e.kind==='summon-slot-pops'){
  const spots=assets.effects.filter(f=>f.name==='QuestionSymbol').sort((a,b)=>(a.x<-1?0:a.x>1?2:1)-(b.x<-1?0:b.x>1?2:1));
  e.particles.forEach((v,i)=>{const index=Math.floor(i/12),spot=spots[index],{land}=slotTiming(index),t=(p-land)/.06,angle=(i%12)*2.39996;v.visible=t>=0&&t<1;const age=clamp(t),r=.12+.8*age;v.x=spot.x+Math.cos(angle)*r;v.y=-spot.y+.35+Math.sin(angle)*r*.4-age*.35;v.rotation=angle+age;v.width=v.height=.075*(1-age*.4);v.alpha=(1-age)*.9;});
 }else{
  const g=e.mesh;g.clear();const spots=assets.effects.filter(f=>f.name==='QuestionSymbol').sort((a,b)=>(a.x<-1?0:a.x>1?2:1)-(b.x<-1?0:b.x>1?2:1));
  spots.forEach((spot,index)=>{
   const {landSec}=slotTiming(index),end=orbGrowthStart(index,active),t=(rawSec-landSec)/(end-landSec);if(t<=0||t>=1)return;
   drawSummonRibbon(g,PIXI,{x:spot.x,y:spot.y},orb,t,1,performance.now()/1000);
  });
 }
 return true;
}
export function createPreviewDecoration({PIXI,assets,texture,layerZ}){
 const mesh=createRibbonLayer(PIXI,{profile:assets.beam,texture:texture(assets.egg.quadTexture)});mesh.eventMode='none';const particles=Array.from({length:assets.idleParticles.burstCount*3},(_,i)=>{const sprite=new PIXI.Sprite(texture(assets.egg.quadTexture));sprite.anchor.set(.5);sprite.tint=i%3===0?0xffffff:0xc6ffdf;sprite.visible=false;mesh.addChild(sprite);return sprite;});
 const heads=NATIVE_ATTRACTION_PARTICLES.emitters.map(e=>{const sprite=new PIXI.Sprite(texture(e.head.texture));sprite.anchor.set(.5);sprite.tint=e.head.color.slice(0,3).reduce((v,c)=>(v<<8)|Math.round(c*255),0);sprite.visible=false;mesh.addChild(sprite);return sprite;});
 return {actorId:'summon-preview-trails',kind:'summon-preview-trails',mesh,particles,heads,item:itemAt(assets.anchor,0,0,NATIVE_ATTRACTION_PARTICLES.emitters[0].pose.z),layerZ,lastEffectFrame:-1};
}
export function updatePreviewDecoration(e,{presentation,assets,now,dev,PIXI}){
 let changed=false;if(e.gameplayHidden!==Boolean(dev)){e.gameplayHidden=Boolean(dev);changed=true;}if(dev)return changed;
 const age=Math.max(0,(now-presentation.idleSince)/1000),stopAt=presentation.active?(presentation.active.summonAt-presentation.idleSince)/1000:Infinity;
 if(e.lastEffectFrame===age)return changed;e.lastEffectFrame=age;const g=e.mesh;g.clear();for(const p of e.particles)p.visible=false;for(const head of e.heads)head.visible=false;
 const rule=assets.idleParticles;e.nativeParticles=attractionParticleStates(age,stopAt);
 for(const {index,emitter,age:elapsed}of e.nativeParticles){
  // Unity Particle.startSize is the X scalar of startSize3D, not min(X, Y).
  // Y controls billboard height; do not substitute it for the trail size scalar.
  // Unity stores trail lifetime as a fraction of the owning particle lifetime.
  // Trail color has its own lifetime gradient (inheritParticleColor is disabled).
  const trailColor=nativeGradient(emitter.trail.colorOverLifetime,elapsed/emitter.lifetime);
  const particleWidth=emitter.trail.sizeAffectsWidth?emitter.size:1;
  const rotation=attractionHeadRotation(emitter,elapsed),join=attractionHeadJoin(emitter,rotation);
  g.drawParticleTrail(t=>attractionParticlePoint(emitter,t),elapsed,emitter.trail.lifetime*emitter.lifetime,1,age,particleWidth,{color:trailColor,particleLifetime:emitter.lifetime,join});
  const point=attractionParticlePoint(emitter,elapsed),head=e.heads[index];head.position.set(point.x,-point.y);head.rotation=attractionHeadRotation(emitter,elapsed);head.width=emitter.size;head.height=emitter.sizeY;head.alpha=nativeGradient(emitter.color,elapsed/emitter.lifetime)[3]*emitter.head.color[3];head.visible=true;
  const spot=emitter.pose,t=elapsed/rule.burstLifetime;for(let j=0;j<rule.burstCount;j++){const v=e.particles[index*rule.burstCount+j],angle=j*2.3999632297;v.visible=t<1;v.x=spot.x+Math.cos(angle)*(.16+.55*t);v.y=-spot.y+Math.sin(angle)*(.12+.4*t)-t*.25;v.width=v.height=.16*(1-.5*t);v.rotation=angle+t*.8;v.alpha=(1-clamp(t))*.8;}
 }
 return true;
}
