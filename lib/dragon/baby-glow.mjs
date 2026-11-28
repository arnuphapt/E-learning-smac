import {nativeCurve,nativeGradient,particleElapsed,seededRandom,rgbHex} from './egg-streak.mjs';
import {isSpeciesDiscovered} from './hatchery.mjs';

// Prefab NewSpeciesGlow + NewSpeciesParticles on CaterpillarEntity00.
export function isBabyGlowVisible({speciesId,maturedSpecies,maturing,moving,dev}){
 if(dev||moving||maturing)return false;
 return !isSpeciesDiscovered(maturedSpecies,speciesId);
}

export function babyParticleSlotCount(cfg){
 return Math.max(1,Math.round(cfg.rate*cfg.lifetime));
}

export function babyParticleElapsed(cfg,slotIndex,ageSeconds){
 const count=babyParticleSlotCount(cfg),cycle=count/cfg.rate;
 const clock=(ageSeconds+(cfg.prewarm?cycle:0))*(cfg.simulationSpeed??1);
 const born=slotIndex/cfg.rate;
 const elapsed=particleElapsed(clock,born,cycle);
 const gen=Math.floor((clock-born)/cycle);
 return {elapsed,gen,lifeT:elapsed/cfg.lifetime};
}

export function babyParticleState(cfg,slotIndex,elapsed,gen=0){
 if(elapsed<0||elapsed>=cfg.lifetime)return {alive:false};
 const lifeT=elapsed/cfg.lifetime,seed=slotIndex*97+gen*31;
 const half=(cfg.shapeRadius??.5)*(cfg.shapeScale??1.5);
 const x=(cfg.position?.[0]??0)+(seededRandom(seed+51)*2-1)*half;
 // Pixi +Y points down, so negative Unity gravityModifier accelerates particles upward (-Y).
 const ay=9.81*cfg.gravityModifier,startSpeed=cfg.startSpeed??0;
 const y=(cfg.position?.[1]??0)-startSpeed*elapsed+.5*ay*elapsed*elapsed;
 const baseSize=cfg.size[0]+seededRandom(seed+99)*(cfg.size[1]-cfg.size[0]);
 const size=Math.min(cfg.maxParticleSize??1,baseSize*nativeCurve(cfg.sizeCurve,lifeT));
 const startRot=cfg.startRotation[0]+seededRandom(seed+211)*(cfg.startRotation[1]-cfg.startRotation[0]);
 const rotRate=cfg.rotationSpeed[0]+seededRandom(seed+241)*(cfg.rotationSpeed[1]-cfg.rotationSpeed[0]);
 const rotSign=seededRandom(seed+257)<(cfg.randomizeRotation??0)?-1:1;
 const rotation=startRot+rotSign*rotRate*elapsed;
 const startColor=cfg.startColor?.gradient?nativeGradient(cfg.startColor.gradient,seededRandom(seed+333)):[1,1,1,1];
 const lifeColor=nativeGradient(cfg.color,lifeT);
 const matTint=cfg.materialProps?.tint??[1,1,1,1],matAlpha=cfg.materialProps?.opacityAlpha??1;
 const rgb=[matTint[0]*startColor[0]*lifeColor[0],matTint[1]*startColor[1]*lifeColor[1],matTint[2]*startColor[2]*lifeColor[2]];
 const alpha=startColor[3]*lifeColor[3]*matAlpha*matTint[3];
 return {alive:true,x,y,size,rotation,rgb,tint:rgbHex(rgb[0],rgb[1],rgb[2]),alpha,lifeT};
}

export function sampleBabyParticles(cfg,ageSeconds=0){
 const count=babyParticleSlotCount(cfg),out=[];
 for(let i=0;i<count;i++){
  const {elapsed,gen}=babyParticleElapsed(cfg,i,ageSeconds);
  out.push(babyParticleState(cfg,i,elapsed,gen));
 }
 return out;
}

export function createBabyGlowDecorations({PIXI,assets,actor,babyEntry,texture,now=Date.now()}){
 const glowCfg=assets.baby.glow,pCfg=assets.baby.particles,g=assets.sprites[glowCfg.sprite];
 const glowMesh=new PIXI.Container();glowMesh.eventMode='none';
 const spriteMesh=new PIXI.SimpleMesh(texture(g.texture),Float32Array.from(g.vertices),Float32Array.from(g.uvs),Uint16Array.from(g.indices));
 spriteMesh.autoUpdate=false;spriteMesh.eventMode='none';
 spriteMesh.position.set(glowCfg.position[0],glowCfg.position[1]);
 spriteMesh.scale.set(glowCfg.scale[0],glowCfg.scale[1]);
 spriteMesh.tint=rgbHex(glowCfg.color[0],glowCfg.color[1],glowCfg.color[2]);
 spriteMesh.alpha=glowCfg.color[3];
 spriteMesh.blendMode=PIXI.BLEND_MODES.ADD;
 glowMesh.addChild(spriteMesh);
 const glowEntry={
  actorId:'baby-glow-'+actor.id,ownerId:actor.id,kind:'baby-glow',gameplayHidden:true,
  mesh:glowMesh,spriteMesh,layerZ:babyEntry.layerZ,
  item:{...babyEntry.item,GUID:'baby-glow-'+actor.id,SymbolID:'BabyNewGlow_'+actor.speciesId,ZPos:babyEntry.item.ZPos+glowCfg.zOffset,rotation:babyEntry.item.rotation}
 };
 const pMesh=new PIXI.Container();pMesh.eventMode='none';
 const pTex=texture(pCfg.texture),count=babyParticleSlotCount(pCfg);
 const sprites=Array.from({length:count},()=>{const s=new PIXI.Sprite(pTex);s.anchor.set(.5);s.blendMode=PIXI.BLEND_MODES.NORMAL;s.visible=false;pMesh.addChild(s);return s;});
 const particlesEntry={
  actorId:'baby-particles-'+actor.id,ownerId:actor.id,kind:'baby-particles',gameplayHidden:true,
  mesh:pMesh,sprites,spawnAt:now,lastNow:null,layerZ:babyEntry.layerZ,
  item:{...babyEntry.item,GUID:'baby-particles-'+actor.id,SymbolID:'BabyNewParticles_'+actor.speciesId,ZPos:babyEntry.item.ZPos+pCfg.zOffset,rotation:babyEntry.item.rotation}
 };
 return [glowEntry,particlesEntry];
}

export function updateBabyGlowEntry(e,{babyEntry,maturedSpecies,assets,now,dev,moving=false}){
 if(!babyEntry||!assets?.baby){const changed=!e.gameplayHidden;e.gameplayHidden=true;return {changed,zChanged:false};}
 const cfg=e.kind==='baby-glow'?assets.baby.glow:assets.baby.particles;
 const targetZ=babyEntry.item.ZPos+cfg.zOffset;
 const zChanged=e.item.ZPos!==targetZ||e.layerZ!==babyEntry.layerZ;
 const posChanged=e.item.XPos!==babyEntry.item.XPos||e.item.YPos!==babyEntry.item.YPos||e.item.scaleX!==babyEntry.item.scaleX||e.item.scaleY!==babyEntry.item.scaleY||e.item.rotation!==babyEntry.item.rotation||e.item.LayerID!==babyEntry.item.LayerID;
 e.item.XPos=babyEntry.item.XPos;e.item.YPos=babyEntry.item.YPos;e.item.ZPos=targetZ;
 e.item.scaleX=babyEntry.item.scaleX;e.item.scaleY=babyEntry.item.scaleY;e.item.rotation=babyEntry.item.rotation;
 e.item.LayerID=babyEntry.item.LayerID;e.layerZ=babyEntry.layerZ;
 const visible=isBabyGlowVisible({speciesId:babyEntry.speciesId,maturedSpecies,maturing:babyEntry.baby?.maturing,moving:moving||babyEntry.moving,dev});
 const hidden=!visible;
 let changed=e.gameplayHidden!==hidden||posChanged||zChanged;
 e.gameplayHidden=hidden;
 if(hidden)return {changed,zChanged};
 if(e.kind==='baby-glow')return {changed,zChanged};
 if(e.lastNow===now)return {changed,zChanged};
 e.lastNow=now;
 const ageSeconds=Math.max(0,(now-e.spawnAt)/1000);
 for(let i=0;i<e.sprites.length;i++){
  const s=e.sprites[i],{elapsed,gen}=babyParticleElapsed(cfg,i,ageSeconds),st=babyParticleState(cfg,i,elapsed,gen);
  s.visible=st.alive;
  if(!st.alive)continue;
  s.position.set(st.x,st.y);s.width=s.height=st.size;s.rotation=st.rotation;s.tint=st.tint;s.alpha=st.alpha;
 }
 return {changed:true,zChanged};
}
