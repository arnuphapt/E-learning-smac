import {feedingView} from './baby-feeding.mjs';

export const RETICLE_TEXTURE='sactx-0-1024x1024-ASTC 6x6-Reticle-54d38c2e.webp';

 // Exact serialized values from assets/Sprite/Attention_Cursor2.asset, Attention_Cursor1.asset,
 // Attention_Inner.asset, and ReticleObject.prefab.
 export const RETICLE_SPEC={
  texture:RETICLE_TEXTURE,
  atlasSize:{width:1024,height:1024},
  ppu:100,
  zOffset:-50,
  targetCircle:{
   sprite:'Attention_Cursor2',
   rect:{x:468.02676,y:0.026750565,width:281.94647,height:286.94647},
   pivot:{x:0.48581296,y:0.52439487},
   offset:{x:-0.04,y:0.289},
   delay:1,
   scaleDuration:1,
   fadeDuration:0.25,
   alphaIn:1,
   alphaOut:0,
   minScale:1,
   maxScale:1.5
  },
  innerCircle:{
   sprite:'Attention_Inner',
   rect:{x:0,y:0,width:465,height:477},
   pivot:{x:0.5,y:0.5},
   offset:{x:0,y:0.33},
   scale:0.81,
   rotateDirection:-1,
   rotateDuration:10
  },
  outerCircle:{
   sprite:'Attention_Cursor1',
   rect:{x:753,y:0,width:236,height:232},
   pivot:{x:0.5,y:0.5},
   offset:{x:0,y:0.33},
   scale:1.35,
   rotateDirection:1,
   rotateDuration:10
  },
  select:{
   fadeDuration:0.25,
   alphaIn:1,
   alphaOut:0
  }
 };

export function spriteQuad(spec=RETICLE_SPEC.targetCircle,atlas=RETICLE_SPEC.atlasSize){
 const ppu=spec.ppu??RETICLE_SPEC.ppu,{x,y,width,height}=spec.rect,{x:px,y:py}=spec.pivot;
 const w=width/ppu,h=height/ppu,left=-w*px,right=left+w,top=-h*(1-py),bottom=h*py;
 const u0=x/atlas.width,u1=(x+width)/atlas.width,vTop=1-(y+height)/atlas.height,vBottom=1-y/atlas.height;
 return {
  vertices:[left,top,right,top,right,bottom,left,bottom],
  uvs:[u0,vTop,u1,vTop,u1,vBottom,u0,vBottom],
  indices:[0,1,2,2,3,0]
 };
}

export function attentionState(t,cfg=RETICLE_SPEC.targetCircle){
 const period=cfg.delay+cfg.scaleDuration;
 if(!Number.isFinite(t)||t<0||period<=0)return {alpha:cfg.alphaOut,scale:cfg.maxScale,visible:false};
 const cycle=t%period;
 if(cycle<cfg.delay)return {alpha:cfg.alphaOut,scale:cfg.maxScale,visible:false};
 const u=(cycle-cfg.delay)/cfg.scaleDuration;
 const fade=Math.max(0,Math.min(1,u/cfg.fadeDuration)*Math.min(1,(1-u)/cfg.fadeDuration));
 return {
  alpha:cfg.alphaOut+(cfg.alphaIn-cfg.alphaOut)*fade,
  scale:cfg.maxScale-(cfg.maxScale-cfg.minScale)*u,
  visible:fade>0
 };
}

export function isEggReticleVisible(active,now=Date.now(),dev=false){
 if(dev||!active)return false;
 return active.status==='ready'||(active.phase==='incubating'&&now>=active.readyAt);
}

export function isBabyReticleVisible(baby,now=Date.now(),dev=false){
 if(dev||!baby)return false;
 return feedingView(baby,now).status==='mature-ready';
}

export function selectState(t,showing,changedAt=0,fromAlpha=null,cfg=RETICLE_SPEC.select){
 const fadeDuration=cfg.fadeDuration??0.25,alphaIn=cfg.alphaIn??1,alphaOut=cfg.alphaOut??0;
 const innerRot=(-2*Math.PI*(Number.isFinite(t)?t:0))/RETICLE_SPEC.innerCircle.rotateDuration;
 const outerRot=(2*Math.PI*(Number.isFinite(t)?t:0))/RETICLE_SPEC.outerCircle.rotateDuration;
 if(!showing&&changedAt==null)return {alpha:alphaOut,visible:false,innerRotation:innerRot,outerRotation:outerRot};
 const elapsed=Math.max(0,(Number.isFinite(t)?t:0)-(changedAt??0));
 const p=fadeDuration>0?Math.min(1,elapsed/fadeDuration):1;
 const start=fromAlpha??(showing?alphaOut:alphaIn),target=showing?alphaIn:alphaOut;
 const alpha=start+(target-start)*p;
 return {
  alpha,
  visible:Boolean(showing)||p<1,
  innerRotation:innerRot,
  outerRotation:outerRot
 };
}

function resolveReticleTexture(textureOrMap,spriteName){
 if(!textureOrMap)return textureOrMap;
 if(typeof textureOrMap.get==='function')return textureOrMap.get(spriteName)??textureOrMap.get(RETICLE_TEXTURE)??textureOrMap.values().next().value;
 if(textureOrMap.width!=null||textureOrMap.baseTexture!=null)return textureOrMap;
 return textureOrMap[spriteName]??textureOrMap[RETICLE_TEXTURE]??textureOrMap[spriteName==='Attention_Inner'?'inner':'outer']??Object.values(textureOrMap)[0];
}

function makeCircleMesh(PIXI,tex,spec,spriteData,atlas){
 const geo=spriteData?{vertices:spriteData.vertices,uvs:spriteData.uvs,indices:spriteData.indices}:spriteQuad(spec,atlas);
 const mesh=new PIXI.SimpleMesh(tex,Float32Array.from(geo.vertices),Float32Array.from(geo.uvs),Uint16Array.from(geo.indices));
 mesh.autoUpdate=false;mesh.eventMode='none';mesh.tint=0xffffff;
 mesh.blendMode=PIXI.BLEND_MODES?.NORMAL??0;
 mesh.position.set(spec.offset.x,-spec.offset.y);
 if(spec.scale!=null)mesh.scale?.set?.(spec.scale,spec.scale);
 mesh.alpha=0;mesh.visible=false;
 return mesh;
}

export function createReticle(PIXI,textures,{mode='attention',sprite=null,selectSprites=null}={}){
 if(mode!=='attention'&&mode!=='select')throw Error('Unsupported reticle mode: '+mode);
 const root=new PIXI.Container();root.eventMode='none';root.visible=false;
 if(mode==='select'){
  const innerTex=resolveReticleTexture(textures,RETICLE_SPEC.innerCircle.sprite);
  const outerTex=resolveReticleTexture(textures,RETICLE_SPEC.outerCircle.sprite);
  const atlas={width:innerTex?.width||outerTex?.width||RETICLE_SPEC.atlasSize.width,height:innerTex?.height||outerTex?.height||RETICLE_SPEC.atlasSize.height};
  const inner=makeCircleMesh(PIXI,innerTex,RETICLE_SPEC.innerCircle,selectSprites?.inner??selectSprites?.Attention_Inner,atlas);
  const outer=makeCircleMesh(PIXI,outerTex,RETICLE_SPEC.outerCircle,selectSprites?.outer??selectSprites?.Attention_Cursor1,atlas);
  root.addChild(inner,outer);
  let showing=false,startedAt=null,changedAt=null,startAlpha=0,currentAlpha=0;
  function setVisible(visible,now=Date.now(),instant=false){
   const next=Boolean(visible);
   if(!next&&instant){
    const changed=showing||root.visible||currentAlpha!==0;
    showing=false;startedAt=null;changedAt=null;startAlpha=0;currentAlpha=0;
    root.visible=false;inner.visible=false;outer.visible=false;inner.alpha=0;outer.alpha=0;
    return changed;
   }
   if(next===showing)return false;
   if(next&&startedAt==null)startedAt=now;
   showing=next;changedAt=now;startAlpha=currentAlpha;
   if(next){root.visible=true;inner.visible=true;outer.visible=true;}
   return true;
  }
  function update(visible,now=Date.now()){
   const edge=setVisible(visible,now);
   if(startedAt==null)return edge;
   const t=Math.max(0,(now-startedAt)/1000);
   const changedSec=changedAt!=null?Math.max(0,(changedAt-startedAt)/1000):0;
   const st=selectState(t,showing,changedSec,startAlpha);
   currentAlpha=st.alpha;
   root.visible=st.visible;
   inner.visible=st.visible;outer.visible=st.visible;
   inner.alpha=st.alpha;outer.alpha=st.alpha;
   inner.rotation=st.innerRotation;outer.rotation=st.outerRotation;
   if(!st.visible){startedAt=null;changedAt=null;startAlpha=0;currentAlpha=0;return true;}
   return true;
  }
  function destroy(){root.destroy({children:true,texture:false,baseTexture:false});}
  return {mode,root,inner,outer,get active(){return showing;},get startedAt(){return startedAt;},get changedAt(){return changedAt;},setVisible,update,destroy};
 }
 const texture=resolveReticleTexture(textures,RETICLE_SPEC.targetCircle.sprite);
 const atlas={width:texture?.width||RETICLE_SPEC.atlasSize.width,height:texture?.height||RETICLE_SPEC.atlasSize.height};
 const target=makeCircleMesh(PIXI,texture,RETICLE_SPEC.targetCircle,sprite,atlas);
 root.addChild(target);
 let active=false,startedAt=0;
 function setVisible(visible,now=Date.now()){
  const next=Boolean(visible);
  if(!next){
   const changed=active||root.visible||target.alpha!==0||target.visible;
   active=false;root.visible=false;target.visible=false;target.alpha=0;
   return changed;
  }
  if(!active){
   active=true;startedAt=now;
   const st=attentionState(0);
   root.visible=true;target.alpha=st.alpha;target.visible=st.visible;target.scale?.set?.(st.scale);
   return true;
  }
  return false;
 }
 function update(visible,now=Date.now()){
  const edge=setVisible(visible,now);
  if(!active)return edge;
  const t=Math.max(0,(now-startedAt)/1000),st=attentionState(t);
  root.visible=true;target.alpha=st.alpha;target.visible=st.visible;target.scale?.set?.(st.scale);
  return true;
 }
 function destroy(){root.destroy({children:true,texture:false,baseTexture:false});}
 return {mode,root,target,get active(){return active;},get startedAt(){return startedAt;},setVisible,update,destroy};
}
