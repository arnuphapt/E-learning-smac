import {createEggStreaks,createSideParticles,rgbHex} from './egg-streak.mjs';
import {isSpeciesDiscovered,isSpeciesAlreadySummoned} from './hatchery.mjs';
import {RETICLE_TEXTURE,createReticle,isEggReticleVisible} from './reticle.mjs';
// Native particle textures + prefab parameters; serialized NewSpeciesGlow playback in Pixi.
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const EGG_ARRIVAL_END_SECONDS=2.4;
export const EGG_GLOW_DELAY_SECONDS=1.0;
export const EGG_GLOW_DURATION_SECONDS=1.0;
// INFERRED: native NewSpeciesGlow.Refresh calls FadeSprite(..., 0.5) setting absolute alpha 0.5 rather than prefab alpha 0.384.
export const EGG_GLOW_TARGET_ALPHA=0.5;
export const eggGlowStart=(arrivalEnd=EGG_ARRIVAL_END_SECONDS)=>arrivalEnd+EGG_GLOW_DELAY_SECONDS;
export const sinusoidalInOut=u=>{const t=clamp(u);return 0.5-0.5*Math.cos(Math.PI*t);};
const quadraticIn=u=>{const t=clamp(u);return t*t;};
const quadraticOut=u=>{const t=clamp(u);return 1-(1-t)*(1-t);};
const quinticInOut=u=>{const t=clamp(u);return t<0.5?16*t*t*t*t*t:1-Math.pow(-2*t+2,5)/2;};
export function eggNewSpeciesGlow(active,maturedSpecies,speciesSummonCounts){
 if(!active)return false;
 const discovered=Array.isArray(maturedSpecies)?isSpeciesDiscovered(maturedSpecies,active.speciesId):typeof active.discovered==='boolean'?active.discovered:active.isNewSpecies!==true;
 if(discovered)return false;
 const alreadySummoned=speciesSummonCounts!=null?isSpeciesAlreadySummoned(speciesSummonCounts,active.speciesId):typeof active.alreadySummoned==='boolean'?active.alreadySummoned:Number.isInteger(active.summonCount)&&active.summonCount>1;
 return !alreadySummoned;
}
export function eggArrival(age){
 if(age<=0)return {lift:1.4,scaleX:0,scaleY:0,alpha:1};
 const lift=age<1.4?1.4:age<1.9?1.4*(1-quadraticIn((age-1.4)/0.5)):0;
 let scaleX=1,scaleY=1;
 if(age<1.0){const s=quinticInOut(age/1.0);scaleX=s;scaleY=s;}
 else if(age>=1.9&&age<2.15){const k=quadraticOut((age-1.9)/0.25);scaleX=1+0.25*k;scaleY=1-0.25*k;}
 else if(age>=2.15&&age<EGG_ARRIVAL_END_SECONDS){const k=quadraticIn((age-2.15)/0.25);scaleX=1.25-0.25*k;scaleY=0.75+0.25*k;}
 return {lift,scaleX,scaleY,alpha:1};
}
export function updateEggArrival(entry,active,now,dev){
 if(entry.kind!=='egg')return false;const rest=entry.eggRest??={...entry.item},age=dev?Infinity:Math.max(0,(now-(active.appearanceAt??active.startedAt))/1000),pose=eggArrival(age),y=rest.YPos+pose.lift,sx=rest.scaleX*pose.scaleX,sy=rest.scaleY*pose.scaleY;
 if(entry.item.YPos===y&&entry.item.scaleX===sx&&entry.item.scaleY===sy&&entry.mesh.alpha===pose.alpha)return false;
 entry.item.YPos=y;entry.item.scaleX=sx;entry.item.scaleY=sy;entry.mesh.alpha=pose.alpha;return true;
}
function glow(PIXI,assets,texture,width,height,sprite=assets.egg.glowSprite){
 const g=assets.sprites[sprite],vertices=Float32Array.from(g.vertices),xs=g.vertices.filter((_,i)=>i%2===0),ys=g.vertices.filter((_,i)=>i%2===1),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2,w=Math.max(...xs)-Math.min(...xs),h=Math.max(...ys)-Math.min(...ys);
 for(let i=0;i<vertices.length;i+=2){vertices[i]=(vertices[i]-cx)*width/w;vertices[i+1]=(vertices[i+1]-cy)*height/h;}
 const m=new PIXI.SimpleMesh(texture(g.texture),vertices,Float32Array.from(g.uvs),Uint16Array.from(g.indices));m.autoUpdate=false;m.eventMode='none';m.tint=0x64fff1;m.blendMode=PIXI.BLEND_MODES.ADD;return m;
}
export function createEggDecorations({PIXI,assets,active,marker,layerZ,texture}){
 const back=new PIXI.Container(),front=new PIXI.Container();back.eventMode=front.eventMode='none';
 const floor=glow(PIXI,assets,texture,3,.7),halo=glow(PIXI,assets,texture,2.1,2.6),flash=glow(PIXI,assets,texture,2.8,2.8);
 floor.visible=halo.visible=false;floor.alpha=halo.alpha=0;halo.y=-.75;flash.tint=0xc5fff9;back.addChild(floor,halo);front.addChild(flash);
 const side=createSideParticles(PIXI,assets,texture);front.addChild(...side.trails,...side.motes);
 const rays=createEggStreaks(PIXI,assets,texture);front.addChild(...rays);
 const particles=Array.from({length:28},(_,i)=>{const s=new PIXI.Sprite(texture(assets.egg.quadTexture));s.anchor.set(.5);s.tint=i%3===0?0xddfff4:0x6effd6;s.blendMode=PIXI.BLEND_MODES.ADD;front.addChild(s);return s;});
 const frontContainer=new PIXI.Container();frontContainer.eventMode='none';frontContainer.scale.set(0);
 const frontCfg=assets.egg.front,fs=assets.sprites[frontCfg.sprite],fxs=fs.vertices.filter((_,i)=>i%2===0),fys=fs.vertices.filter((_,i)=>i%2===1);
 const frontGlow=glow(PIXI,assets,texture,(Math.max(...fxs)-Math.min(...fxs))*frontCfg.scale[0],(Math.max(...fys)-Math.min(...fys))*frontCfg.scale[1],frontCfg.sprite);
 frontGlow.position.set(frontCfg.position[0],frontCfg.position[1]);
 frontGlow.tint=rgbHex(frontCfg.color[0]*frontCfg.material.tint[0],frontCfg.color[1]*frontCfg.material.tint[1],frontCfg.color[2]*frontCfg.material.tint[2]);
 frontGlow.blendMode=PIXI.BLEND_MODES.NORMAL;frontGlow.alpha=0;frontContainer.addChild(frontGlow);front.addChild(frontContainer);
 const ring=new PIXI.Graphics();front.addChild(ring);
 const readySprite=assets.sprites?.[assets.egg?.readySprite];
 const reticle=readySprite?createReticle(PIXI,texture(readySprite.texture??RETICLE_TEXTURE),{mode:'attention',sprite:readySprite}):null;
 // INFERRED: centers the Attention reticle vertically over the egg (matching old readyRing y = -0.8) instead of screen-origin targetCircle.
 if(reticle){reticle.root.position.set(0,-.8);front.addChild(reticle.root);}
 const make=(kind,mesh,z)=>({actorId:kind+'-'+active.id,kind,mesh,item:{...marker,GUID:kind+'-'+active.id,SymbolID:'EggEffects',isMarker:false,ZPos:marker.ZPos+z,rotation:0,scaleX:1,scaleY:1},layerZ,lastEffectFrame:null});
 const aura=make('egg-aura',back,.20),pop=make('egg-particles',front,-.3);aura.floor=floor;aura.halo=halo;pop.flash=flash;pop.rays=rays;pop.particles=particles;pop.ring=ring;pop.reticle=reticle;pop.frontContainer=frontContainer;pop.frontGlow=frontGlow;pop.glowShown=false;pop.glowHide=null;pop.glowScale=0;pop.glowAlpha=0;pop.motes=side.motes;pop.sideTrails=side.trails;pop.updateSide=side.update;return [aura,pop];
}
export function updateEggDecoration(e,{active,maturedSpecies,speciesSummonCounts,assets,now,dev,PIXI}){
 let changed=false;if(e.gameplayHidden!==Boolean(dev)){e.gameplayHidden=Boolean(dev);changed=true;}
 if(e.kind==='egg-particles'&&e.reticle){if(e.reticle.update(isEggReticleVisible(active,now,dev),now))changed=true;}
 if(dev)return changed;
 const eligible=eggNewSpeciesGlow(active,maturedSpecies,speciesSummonCounts),newSpecies=eligible&&active.phase!=='hatched';
 const age=Math.max(0,(now-(active.appearanceAt??active.startedAt))/1000),hatching=active.phase==='hatching',ready=active.phase==='incubating'&&now>=active.readyAt,hatchAge=hatching?(now-active.hatchAt)/1000:0,key=active.phase+':'+newSpecies+':'+Math.round((hatching?hatchAge:age)*1000);
 if(e.lastEffectFrame===key)return changed;e.lastEffectFrame=key;const lift=hatching||active.phase==='hatched'?0:eggArrival(age).lift;
 if(e.kind==='egg-aura'){
  e.floor.alpha=0;e.halo.alpha=0;
 }else{
  const glowStart=eggGlowStart(),time=hatching||active.phase==='hatched'?Infinity:age-.45,duration=assets.egg.particleLifetime,t=clamp(time/duration),alive=time>=0&&time<duration;
  e.flash.y=-.7-lift;e.flash.alpha=alive?.5*(1-t)**3:0;e.flash.scale.set(1+t*.5);
  let glowScale=0,glowAlpha=0;
  // Native UpdateNewSpeciesGlow hides when GetEggInIncubator returns null.
  // Keep the stop time in saved coordinates so reloads cannot restart emission.
  if(eligible&&active.phase==='hatched'&&Number.isFinite(active.hatchDoneAt)&&!e.glowHide){
   e.glowShown=true;
   e.glowHide={age:(active.hatchDoneAt-(active.appearanceAt??active.startedAt))/1000,fromScale:1,fromAlpha:EGG_GLOW_TARGET_ALPHA};
  }
  if(newSpecies){
   e.glowHide=null;
   if(age>=glowStart){e.glowShown=true;const k=sinusoidalInOut((age-glowStart)/EGG_GLOW_DURATION_SECONDS);glowScale=k;glowAlpha=EGG_GLOW_TARGET_ALPHA*k;}
  }else if(e.glowShown){
   e.glowHide??={age,fromScale:e.glowScale??1,fromAlpha:e.glowAlpha??EGG_GLOW_TARGET_ALPHA};
   const k=1-sinusoidalInOut((age-e.glowHide.age)/EGG_GLOW_DURATION_SECONDS);
   glowScale=e.glowHide.fromScale*k;glowAlpha=e.glowHide.fromAlpha*k;
  }
  e.glowScale=glowScale;e.glowAlpha=glowAlpha;
  e.frontContainer?.scale?.set(glowScale,glowScale);e.frontGlow.alpha=glowAlpha;
  const stopAge=e.glowHide?.age??Infinity;
  for(const r of e.rays)r.updateStreak(age,lift,newSpecies,stopAge,glowStart);
  for(let i=0;i<e.particles.length;i++){
   const p=e.particles[i],angle=i*2.3999632297,radius=.45+(i%7)*.12+2.6*t;p.visible=alive;p.x=Math.cos(angle)*radius;p.y=-.7-lift+Math.sin(angle)*radius*.8+t*t*.65;p.rotation=angle+t*(i%2?2:-2);p.width=p.height=(.10+(i%4)*.035)*(1-t*.5);p.alpha=alive?Math.sin(Math.PI*t)**.45:0;
  }
  e.updateSide(age,lift,newSpecies,stopAge,glowStart);
  e.ring.clear();if(alive){e.ring.lineStyle({width:.045*(1-t),color:0x9dfff1,alpha:(1-t)*.7});e.ring.drawEllipse(0,-.15-lift,.35+1.8*t,.12+.45*t);}
 }
 return true;
}
