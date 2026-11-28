import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createFlight} from '../../lib/dragon/dragon-flight.mjs';import {stepAdultBehaviour,createHoverFlight} from '../../lib/dragon/adult-behaviour.mjs';
import {startPerchAnimation,stepPerchAnimation} from '../../lib/dragon/adult-perch-animation.mjs';import {controlledAdultPose} from '../../lib/dragon/adult-animation.mjs';
import {createSpineActor} from '../../lib/dragon/spine-actor.mjs';import {parseNPCMixSource} from '../../lib/dragon/npc-mixer.mjs';
import {createRootOffsetNormalizer} from '../../lib/dragon/spine-root-offset.mjs';
import {NATIVE_ADULT_SPINE} from '../../lib/dragon/generated/native-adult-spine.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url))),perch={GUID:'perch',XPos:2,YPos:0,scaleX:1,SymbolID:'PerchMarker_Branch'};
function entry(){const c=createFlight(0,0);Object.assign(c,{state:'PreHover',takeOff:true,readyToHarvest:true,takeoffUntil:4000,currentAngle:1.2});return {actorId:'ready',kind:'adult',control:c,item:{ZPos:-30},perch};}
function step(e,now,extra={}){stepAdultBehaviour(e,{entries:[e],perches:[perch],now,dt:.016,random:()=>0,...extra});}
test('harvest-ready PreHover queues the nearest free perch and reaches Perching without requiring Hover',()=>{
 const e=entry();step(e,0);assert.equal(e.control.state,'PreHover');assert.equal(e.control.takeOff,false);assert.equal(e.control.destinationPerch.GUID,perch.GUID);assert(e.control.route.length);assert.equal(e.control.currentAngle,1.2,'ready branch does not level the body before flight');
 const states=[];for(let i=1;i<200;i++){step(e,i*16);states.push(e.control.state);}assert(states.includes('FlyToLocation'));assert(states.includes('Perching'));assert(!states.includes('Hover'));assert(e.control.readyToHarvest);
});
test('harvest-ready PreHover retries unavailable perches without stealing reservations',()=>{
 const e=entry();step(e,0,{reserved:['perch']});assert.equal(e.control.takeOff,false);assert(!e.control.destinationPerch);assert.equal(e.control.route.length,0);
 step(e,16,{reserved:['perch']});assert.equal(e.control.takeOff,true);step(e,32);assert.equal(e.control.destinationPerch.GUID,'perch');assert.equal(e.control.takeOff,false);
});
test('PreHover OnEnter does not execute OnUpdate heading on the transition frame',()=>{
 const e=entry();e.control.state='Hover';e.control.animationName='Fly';step(e,0);assert.equal(e.control.state,'PreHover');assert.equal(e.control.currentAngle,1.2);
});
class Container{children=[];addChild(p){this.children=this.children.filter(c=>c!==p);this.children.push(p);}}
class Mesh{constructor(t,v){this.vertices=v;this.geometry={getBuffer:()=>({update(){}})};}}
function load(family){const f=catalog.adult.families[family],root=new URL('../../public/dragon/',import.meta.url),{skeletonData:d}=parseNPCMixSource({atlasText:fs.readFileSync(new URL('.'+f.atlasUrl,root),'utf8'),binary:fs.readFileSync(new URL('.'+f.binaryUrl,root)),config:{}});return {f,d};}
test('real Spine finite queue has 11 individual Sleep entries, asset-derived delays, command mix .25 and Idle callback',()=>{
 const {f,d}=load('Classic_1'),species=catalog.species.find(s=>s.adultFamily==='Classic_1'),rig=createSpineActor({Container,SimpleMesh:Mesh},{skeletonData:d,skin:species.id,textures:new Map(Object.values(f.pages).map(p=>[p,{}])),pages:f.pages,mixSeconds:.25}),e={perch,control:{state:'Perching',animationName:'Branch/Idle'},live:{...rig,queueDefaultMix:f.queueDefaultMix}},c=e.control;
 rig.sample({name:'Branch/Idle',loop:true,realTime:true,key:'idle',elapsed:0},0);startPerchAnimation(c,0,()=>0);stepPerchAnimation(e,5000,()=>.999);const command=c.perchAnimation.phase.queue,starts=[],original=command.onStart;command.onStart=(name,t)=>{starts.push(name);original(name,t);};
 rig.sample(controlledAdultPose(c,perch,5000),5000);let t=rig.state.getCurrent(0),count=0;const duration=d.findAnimation('Branch/Sleep').duration;
 while(t.next){assert.equal(t.animation.name,'Branch/Sleep');assert.equal(t.loop,false);assert.equal(t.mixDuration,.25);assert(Math.abs(t.next.delay-(duration-NATIVE_ADULT_SPINE.Classic_1.queueDefaultMix))<1e-6);count++;t=t.next;}
 assert.equal(count,11);assert.equal(t.animation.name,'Branch/Idle');assert.equal(t.loop,true);
 for(let now=5016;now<45000&&c.perchAnimation.currentName!=='Branch/Idle';now+=16)rig.sample(controlledAdultPose(c,perch,now),now);
 assert.deepEqual(starts,[...Array(11).fill('Branch/Sleep'),'Branch/Idle']);assert.equal(c.colliderPose,'Branch/Idle');assert.equal(rig.state.getCurrent(0).animation.name,'Branch/Idle');
 c.state='FlyToLocation';rig.sample(controlledAdultPose(c,perch,46000),46000);assert.equal(rig.state.getCurrent(0).animation.name,'Fly');assert.equal(rig.state.getCurrent(0).next,null);
});
test('active flight/perch clips have no root motion across all 14 source rigs, including constant-key timelines',()=>{
 for(const family of Object.keys(catalog.adult.families)){const {d}=load(family),root=d.findBone('root');assert.equal(NATIVE_ADULT_SPINE[family].rootMotionBone,'root');assert(!d.physicsConstraints.some(p=>p.bone.index===root.index));
  for(const name of ['Fly','Hover','Branch/Idle','Branch/Sleep','Ground/Idle','Ground/Sleep'])for(const t of d.findAnimation(name).timelines.filter(t=>t.boneIndex===root.index)){
   const stride=t.getFrameEntries();for(let i=0;i<t.frames.length;i+=stride)for(let k=1;k<stride;k++)assert.equal(t.frames[i+k],t.frames[k],`${family} ${name} constant root key`);
  }
 }
});

test('native spawn starts Hover, releases the old planned perch, then uses movement time instead of a three-second landing deadline',()=>{
 const far={...perch,GUID:'far',XPos:60},e={actorId:'spawn',kind:'adult',origin:{XPos:0,YPos:0,scaleX:1},perch:far,item:{ZPos:-30,scaleX:1},adult:{flyUntil:8000}};
 e.control=createHoverFlight(e,0,()=>0,{releasePerch:true});assert.equal(e.control.state,'Hover');assert.equal(e.control.hoverUntil,5000);let released=0;
 for(let now=0;now<=8000;now+=50)step(e,now,{perches:[far],dt:.05,onUnperch:()=>released++});
 assert.equal(released,1);assert.equal(e.control.state,'FlyToLocation');assert(e.control.x<far.XPos-1,'legacy 3-second flight limit must not snap to the perch');
 for(let now=8050;now<=30000&&e.control.state!=='Perching';now+=50)step(e,now,{perches:[far],dt:.05});assert.equal(e.control.state,'Perching');assert.equal(e.perch.GUID,'far');
});
test('root normalization clears constant offsets only on native-enabled axes',()=>{
 const {d}=load('Wyvern_1'),root=d.findBone('root'),bone={data:root,x:-1.48,y:2,rotation:5,parent:null},normalize=createRootOffsetNormalizer({findBone:()=>bone},{positionX:true,positionY:true,rotation:false});
 normalize('Branch/Sleep');assert.deepEqual([bone.x,bone.y,bone.rotation],[0,0,5]);bone.x=12;normalize('Fly2');assert.equal(bone.x,12,'unported locomotion clips must not be silently normalized');
});
