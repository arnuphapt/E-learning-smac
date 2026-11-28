import {assetUrl} from './asset-base.mjs';
import {TextureAtlas,FakeTexture,AtlasAttachmentLoader,SkeletonBinary,Skeleton,AnimationStateData,AnimationState,Physics,RegionAttachment,MeshAttachment} from '@esotericsoftware/spine-core';
// Mixing occurs in the original Spine rig, before skinning. No world-vertex interpolation.
export function parseNPCMixSource({atlasText,binary,config}){
 const atlas=new TextureAtlas(atlasText);for(const page of atlas.pages)page.setTexture(new FakeTexture({width:page.width,height:page.height}));
 const reader=new SkeletonBinary(new AtlasAttachmentLoader(atlas));reader.scale=1;const skeletonData=reader.readSkeletonData(Uint8Array.from(binary));
 return {skeletonData,config};
}
export async function loadNPCMixSource({signal}={}){
 const read=async(url,type)=>{const r=await fetch(url,{signal});if(!r.ok)throw Error(url+': HTTP '+r.status);return r[type]();};
 const [atlasText,buffer,config]=await Promise.all([read(assetUrl('assets/TextAsset/Elf.atlas.txt'),'text'),read(assetUrl('assets/TextAsset/Elf.skel.bytes'),'arrayBuffer'),read(assetUrl('data/npc-animation-config.json'),'json')]);
 return parseNPCMixSource({atlasText,binary:new Uint8Array(buffer),config});
}
const direct=pose=>pose?{parts:pose.clip.frames[pose.frame],key:pose.key+':'+pose.frame,progress:1}:null;
export function createNPCMixer(entity,{native}={}){
 if(entity.name!=='Incubator')return {sample:direct};
 if(!native)throw Error('Native Elf skeleton/config must be loaded before creating its player');
 const skeleton=new Skeleton(native.skeletonData);skeleton.setSkinByName(entity.data.skin);skeleton.setToSetupPose();
 const stateData=new AnimationStateData(native.skeletonData);stateData.defaultMix=native.config.defaultMix;for(const mix of native.config.mixes)stateData.setMix(mix.from,mix.to,mix.duration);
 const state=new AnimationState(stateData),shapeIds=new Map(entity.data.shapes.map((s,i)=>[[s.slot,s.name,s.region].join('|'),i])),bindings=new Map();
 let overlayKey=null;let targetKey='prefab',lastSeconds=null,restored=true,wasEnabled=true;
 function reset(){state.clearTracks();overlayKey=null;skeleton.setToSetupPose();const idle=state.setAnimation(0,'Idle',true);idle.trackTime=0;state.apply(skeleton);skeleton.updateWorldTransform(Physics.reset);targetKey='prefab';restored=true;}
 reset();
 function capture(){const parts=[];for(const slot of skeleton.drawOrder){const a=slot.getAttachment();if(!a)continue;if(!(a instanceof RegionAttachment||a instanceof MeshAttachment))throw Error('Unsupported visible native attachment '+a.name);
  let id=bindings.get(a)?.id;if(id===undefined){id=shapeIds.get([slot.data.name,a.name,a.region.name].join('|'));if(id===undefined)throw Error('Unbound native Elf attachment '+a.name);const source=entity.data.shapes[id];if(source.uv.length!==a.uvs.length)throw Error('Native atlas topology mismatch '+a.name);
   const order=source.uv.reduce((out,u,i)=>{if(i%2===0){let index=-1;for(let j=0;j<a.uvs.length;j+=2)if(Math.abs(u-a.uvs[j])<1e-5&&Math.abs(source.uv[i+1]-a.uvs[j+1])<1e-5){index=j;break;}if(index<0)throw Error('Native atlas UV mismatch '+a.name);out.push(index);}return out;},[]);
   // Spine Java and TypeScript enumerate region corners differently; bind by UV, never by array index.
   bindings.set(a,{id,order});}
  const binding=bindings.get(a);id=binding.id;
  const positions=new Float32Array(a instanceof RegionAttachment?8:a.worldVerticesLength);if(a instanceof RegionAttachment)a.computeWorldVertices(slot,positions,0,2);else a.computeWorldVertices(slot,0,positions.length,positions,0,2);
  const ordered=new Float32Array(positions.length);binding.order.forEach((j,i)=>{ordered[i*2]=positions[j];ordered[i*2+1]=positions[j+1];});parts.push([id,ordered,slot.color.a*a.color.a]);
 }return parts;}
 return {state,skeleton,stateData,sample(pose,seconds,enabled=true){
  const dt=lastSeconds===null?0:Math.min(.05,Math.max(0,seconds-lastSeconds));lastSeconds=seconds;
  if(!enabled){if(wasEnabled)reset();wasEnabled=false;return direct(pose);}wasEnabled=true;
  if(!pose&&restored)return null;
  const base=pose?.base??pose,key=base?.key||'prefab',name=base?.clip.name||'Idle',elapsed=base?.elapsed??(base?base.frame/base.clip.frames.length*base.clip.duration:0),overlay=pose?.trackIndex===1?pose:null;
  if(key!==targetKey){state.setAnimation(0,name,base?.loop??false);targetKey=key;restored=false;}
  if(overlay){if(overlay.key!==overlayKey){state.setAnimation(1,overlay.clip.name,false);overlayKey=overlay.key;}}else if(overlayKey!==null){state.clearTrack(1);overlayKey=null;}
  state.update(dt);const entry=state.getCurrent(0);if(!base?.continuous)entry.trackTime=elapsed;if(overlay)state.getCurrent(1).trackTime=overlay.elapsed;state.apply(skeleton);skeleton.update(dt);skeleton.updateWorldTransform(Physics.update);
  const progress=entry.mixingFrom?Math.min(1,entry.mixTime/entry.mixDuration):1;
  if(!pose&&progress===1){restored=true;return null;}
  return {parts:capture(),key:(pose?.key??key)+':native:'+Math.floor(seconds*30),progress,native:true,mixDuration:entry.mixDuration};
 }};
}

