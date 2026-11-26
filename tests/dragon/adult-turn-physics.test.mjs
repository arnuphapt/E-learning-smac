import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Skeleton,AnimationState,AnimationStateData,Physics} from '@esotericsoftware/spine-core';
import {parseNPCMixSource} from '../../lib/dragon/npc-mixer.mjs';
import {createAdultActor} from '../../lib/dragon/adult-animation.mjs';
import {createSpineActor} from '../../lib/dragon/spine-actor.mjs';
import {dragonBoneWorldXY} from '../../lib/dragon/adult-coin.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url)));
class Container{children=[];addChild(p){this.children=this.children.filter(c=>c!==p);this.children.push(p);}}
class Mesh{constructor(t,v){this.vertices=v;this.geometry={getBuffer:()=>({update(){}})};}}
const PIXI={Container,SimpleMesh:Mesh};
function load(family){const f=catalog.adult.families[family],{skeletonData:d}=parseNPCMixSource({atlasText:fs.readFileSync(new URL('../../public/dragon'+f.atlasUrl,import.meta.url),'utf8'),binary:fs.readFileSync(new URL('../../public/dragon'+f.binaryUrl,import.meta.url)),config:{}});return {config:f,source:{skeletonData:d},textures:new Map(Object.values(f.pages).map(p=>[p,{}]))};}

test('adult turns match a native-style root override before constraints across all 14 rigs, including reflected Y',()=>{
 for(const family of Object.keys(catalog.adult.families)){
  const loaded=load(family),species=catalog.species.find(s=>s.adultFamily===family),d=loaded.source.skeletonData,adult={maturedAt:0,flyUntil:0},perch={XPos:0,YPos:0,SymbolID:'PerchMarker_Branch',scaleX:1},item={},rig=createAdultActor(PIXI,adult,species,catalog,loaded);
  // Independent oracle: AnimationState -> utility root override -> world pose -> physics.
  const oracle=new Skeleton(d);oracle.setSkinByName(species.id);oracle.setToSetupPose();
  const data=new AnimationStateData(d);data.defaultMix=.25;const state=new AnimationState(data);state.setAnimation(0,'Fly',true);
  let previous=null,previousNow=0,maxError=0;
  for(let i=0;i<180;i++){
   const now=i*1000/60,angle=i<60?i*1.4:i<120?84-(i-60)*2.8:-84+(i-120)*1.4,orientation=i<60?1:i<120?-1:1;
   const control={state:'FlyToLocation',x:i*.03,y:Math.sin(i*.05)*.2,orientation,rotation:angle,animationName:'Fly',animationStartedAt:0};
   rig.update(adult,item,perch,perch,now,false,control);
   const dt=i?(now-previousNow)/1000:0;previousNow=now;state.update(dt);state.getCurrent(0).trackTime=now/1000;oracle.update(dt);
   // Heading belongs to the bone hierarchy; entity inherits translation only.
   if(previous)oracle.physicsTranslate((control.x-previous.x)/species.dragonScale*100,(control.y-previous.y)/species.dragonScale*100);
   state.apply(oracle);const root=oracle.findBone('root');root.x=0;root.y=0;root.rotation=-angle;root.scaleX=1;root.scaleY=orientation;
   oracle.updateWorldTransform(Physics.pose);oracle.updateWorldTransform(Physics.update);previous=control;
   for(let b=0;b<oracle.bones.length;b++)for(const k of ['a','b','c','d','worldX','worldY'])maxError=Math.max(maxError,Math.abs(oracle.bones[b][k]-rig.skeleton.bones[b][k]));
   assert(rig.parts.every(p=>p.vertices.every(Number.isFinite)),family+' finite mesh');
   const point=dragonBoneWorldXY({live:rig,item},'Head'),head=oracle.findBone('Head');
   if(head){assert(maxError<1e-4, family+': frame '+i+' error '+maxError);assert(Math.abs(point.x-(item.XPos+head.worldX*species.dragonScale*.01))<1e-5);assert(Math.abs(point.y-(item.YPos+head.worldY*species.dragonScale*.01))<1e-5);}
  }
  assert(maxError<1e-4,`${family}: bone/constraint error ${maxError}`);
 }
});

test('Insect turn exposes the old external-heading mismatch while keeping physics active',()=>{
 const loaded=load('Insect_1'),species=catalog.species.find(s=>s.id==='007'),d=loaded.source.skeletonData,options={skeletonData:d,skin:species.id,textures:loaded.textures,pages:loaded.config.pages,mixSeconds:.25,transformPhysics:{position:[1,1],rotation:1}},old=createSpineActor(PIXI,options),adult={maturedAt:0,flyUntil:0},perch={XPos:0,YPos:0,SymbolID:'PerchMarker_Branch',scaleX:1},fixed=createAdultActor(PIXI,adult,species,catalog,loaded);
 let calls=[];const rotate=fixed.skeleton.physicsRotate.bind(fixed.skeleton);fixed.skeleton.physicsRotate=(x,y,r)=>{calls.push(r);rotate(x,y,r);};
 for(let i=0;i<120;i++){
  const now=i*1000/60,rotation=i<60?i:120-i,orientation=i<60?1:-1,item={},control={state:'FlyToLocation',x:i*.04,y:0,rotation,orientation,animationName:'Fly',animationStartedAt:0};
  fixed.update(adult,item,perch,perch,now,false,control);old.sample({name:'Fly',key:'Fly',loop:true,realTime:true,elapsed:now/1000},now,false,item);
 }
 assert(calls.every(r=>r===0),'root turn must not also inject entity angular physics');
 assert(fixed.skeleton.physicsConstraints.some((p,i)=>Math.abs(p.bone.worldX-old.skeleton.physicsConstraints[i].bone.worldX)>1),'old and native hierarchy must differ');
 assert(fixed.skeleton.physicsConstraints.some(p=>Math.abs(p.rotateOffset)>1e-5||Math.abs(p.xOffset)>1e-5||Math.abs(p.yOffset)>1e-5),'physics is retained');
});
