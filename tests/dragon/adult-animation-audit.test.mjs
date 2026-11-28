import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spineTransformDelta,createSpineTransformPhysics} from '../../lib/dragon/spine-transform-physics.mjs';
import {startPerchAnimation,stepPerchAnimation,perchAnimationPose} from '../../lib/dragon/adult-perch-animation.mjs';
import {controlledAdultPose,createAdultActor} from '../../lib/dragon/adult-animation.mjs';
import {adultPose} from '../../lib/dragon/adult-pose.mjs';
import {headingForAngle,stepHeading} from '../../lib/dragon/dragon-heading.mjs';
import {parseNPCMixSource} from '../../lib/dragon/npc-mixer.mjs';
import {createSpineActor} from '../../lib/dragon/spine-actor.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url)));
class Container{children=[];addChild(p){this.children=this.children.filter(c=>c!==p);this.children.push(p);}}
class Mesh{constructor(t,v,u,i){this.vertices=v;this.geometry={getBuffer:()=>({update(){}})};}}
const PIXI={Container,SimpleMesh:Mesh};
const root=new URL('../../public/dragon/',import.meta.url),read=p=>fs.readFileSync(new URL('.'+p,root));
function load(family){const config=catalog.adult.families[family],source=parseNPCMixSource({atlasText:read(config.atlasUrl).toString(),binary:read(config.binaryUrl),config:{}});return {config,source,textures:new Map(Object.values(config.pages).map(p=>[p,{}]))};}
test('Unity transform movement converts to local Spine units after rotation and mirrored Y',()=>{
 const prev={XPos:0,YPos:0,rotation:0,scaleX:2,scaleY:-2};
 const d=spineTransformDelta(prev,{...prev,XPos:2,YPos:4});assert.deepEqual(d,{x:100,y:-200,rotation:0});
 const turned=spineTransformDelta(prev,{...prev,XPos:2,rotation:-90});assert(Math.abs(turned.x)<1e-10);assert.equal(turned.y,100);assert.equal(turned.rotation,90);
 const calls=[],apply=createSpineTransformPhysics({physicsTranslate:(...a)=>calls.push(a),physicsRotate:(...a)=>calls.push(a)});
 apply(prev);assert.equal(calls.length,0);apply({...prev,XPos:2,YPos:4});assert.deepEqual(calls,[[100,-200],[0,0,0]]);
 apply(null);apply({...prev,XPos:10000});assert.equal(calls.length,2,'resume resets origin without a teleport impulse');
});
test('all 14 native rigs inherit motion in real Spine physics, with finite vertices through a turn',()=>{
 for(const family of Object.keys(catalog.adult.families)){
  const loaded=load(family),species=catalog.species.find(s=>s.adultFamily===family),options={skeletonData:loaded.source.skeletonData,skin:species.id,pages:loaded.config.pages,textures:loaded.textures,mixSeconds:.25};
  assert(options.skeletonData.physicsConstraints.length>0,family);
  const moving=createSpineActor(PIXI,{...options,transformPhysics:{position:[1,1],rotation:1}}),reference=createSpineActor(PIXI,options);
  for(let frame=0;frame<45;frame++){
   const now=frame*1000/60,pose={name:'Fly',key:'Fly',loop:true,realTime:true,elapsed:now/1000};
   moving.sample(pose,now,false,{XPos:frame*.08,YPos:Math.sin(frame*.1)*.15,scaleX:1,scaleY:1,rotation:frame*.5});reference.sample(pose,now);
  }
  assert(moving.parts.every(p=>p.vertices.every(Number.isFinite)),family+' vertices');
  assert(moving.skeleton.physicsConstraints.some((p,i)=>Math.abs(p.xOffset-reference.skeleton.physicsConstraints[i].xOffset)>1e-5||Math.abs(p.rotateOffset-reference.skeleton.physicsConstraints[i].rotateOffset)>1e-5),family+' must respond to world movement');
 }
});
test('sub-30fps-quantum adult frames still advance Spine, with native .25 second mix',()=>{
 const species=catalog.species[0],loaded=load(species.adultFamily),perch={XPos:0,YPos:0,scaleX:1,SymbolID:'PerchMarker_Branch'},adult={maturedAt:0,hoverUntil:5000,flyUntil:8000},item={};
 const rig=createAdultActor(PIXI,adult,species,catalog,loaded);assert(rig.update(adult,item,perch,perch,10,false));assert(rig.update(adult,item,perch,perch,11,false));assert.equal(rig.state.data.defaultMix,.25);assert.equal(rig.state.getCurrent(0).trackTime,.011);assert.equal(adultPose(adult,perch,11).realTime,true);
});
function perched(ground=false){return {perch:{SymbolID:ground?'PerchMarker_Ground':'PerchMarker_Branch'},control:{state:'Perching',animationName:ground?'Ground/Idle':'Branch/Idle'},live:{skeleton:{data:{findAnimation:name=>({duration:name.endsWith('Sleep')?2:1})}}}};}
test('native perch schedule delays 5..14 seconds, runs 9..11 Sleep loops, then returns to Idle',()=>{
 for(const ground of [false,true]){const entry=perched(ground),c=entry.control;startPerchAnimation(c,0,()=>.999);assert.equal(c.perchAnimation.period,14000);stepPerchAnimation(entry,13999,()=>.999);assert.equal(perchAnimationPose(c,13999),null);
  stepPerchAnimation(entry,14000,()=>.999);assert.equal(c.perchAnimation.phase.name,ground?'Ground/Sleep':'Branch/Sleep');assert.equal(c.perchAnimation.phase.queue.defaultMix,Math.fround(.2));assert.equal(controlledAdultPose(c,entry.perch,15000).elapsed,1);
  stepPerchAnimation(entry,28000,()=>.999);assert.equal(c.perchAnimation.phase.startedAt,14000,'sleep cannot be interrupted by a repeating perch callback');
  assert.equal(c.perchAnimation.phase.queue.loops,11);assert.equal(c.perchAnimation.phase.queue.then,ground?'Ground/Idle':'Branch/Idle');
 }
});
test('coin-ready perched dragons remain Idle; changing to Fly does not retain a Sleep command',()=>{
 const entry=perched(),c=entry.control;startPerchAnimation(c,0,()=>0);c.readyToHarvest=true;stepPerchAnimation(entry,5000,()=>.999);assert.equal(c.perchAnimation.phase.name,'Branch/Idle');
 c.readyToHarvest=false;c.animationName='Branch/Idle';c.perchAnimation.nextAt=6000;stepPerchAnimation(entry,6000,()=>.999);assert.equal(controlledAdultPose(c,entry.perch,6000).name,'Branch/Sleep');c.state='FlyToLocation';assert.equal(controlledAdultPose(c,entry.perch,6016).name,'Fly');
});
test('native float32 cardinal threshold chooses UpLeft at +pi/2; near-zero movement preserves heading',()=>{
 assert.equal(headingForAngle(Math.PI/2).view,'UpLeft');const c={currentAngle:1,rps:1};stepHeading(c,1e-6,0,.016);assert.equal(c.currentAngle,1);
});
