import test from 'node:test';
import assert from 'node:assert/strict';
import {createPerchedFlight,beginAdultDrag,finishAdultDrag,tapAdult,stepAdultBehaviour} from '../../lib/dragon/adult-behaviour.mjs';
import {NATIVE_HOVER} from '../../lib/dragon/generated/native-hover.mjs';
import {NATIVE_PERCH} from '../../lib/dragon/generated/native-perch.mjs';
import {playAdultHover,stepAdultHover} from '../../lib/dragon/adult-hover.mjs';
import {perchFinalPosition,perchApproach,queuePerchApproach,beginPerchLanding,stepPerchLanding} from '../../lib/dragon/adult-perch.mjs';
import {createFlight,releaseFlight,targetFlight} from '../../lib/dragon/dragon-flight.mjs';
import {controlledAdultPose} from '../../lib/dragon/adult-animation.mjs';
import {NATIVE_DRAGON_STATE as native} from '../../lib/dragon/generated/native-dragon-states.mjs';
import {projectItem} from '../../lib/dragon/geometry.mjs';
import {guidedRoute,catmullPoint,beginGuidedFlight,stepGuidedFlight} from '../../lib/dragon/native-guided-flight.mjs';
import fs from 'node:fs';
import {parseNPCMixSource} from '../../lib/dragon/npc-mixer.mjs';
import {createSpineActor} from '../../lib/dragon/spine-actor.mjs';
const perch=(GUID,x)=>({GUID,XPos:x,YPos:-20,ZPos:1,LayerID:'markers',SymbolID:'PerchMarker_Branch',scaleX:1});
function fixture(){const e={actorId:'one',kind:'adult',perch:perch('old',0),item:{XPos:0,YPos:-20,ZPos:1,scaleX:1},skeletonID:0};const saved=[],freed=[];const step=(now,extra={})=>stepAdultBehaviour(e,{entries:[e],perches:[perch('near',2)],now,dt:.016,random:()=>0,onPerch:(...p)=>saved.push(p),onUnperch:()=>freed.push(now),...extra});return {e,saved,freed,step};}
test('a loaded perched adult starts its AI cycle without first being dragged',()=>{
 const {e,step,freed}=fixture();e.control=createPerchedFlight(e,0,()=>0);
 step(19989);assert.equal(e.control.state,'Perching');step(19991);assert.equal(e.control.state,'PreHover');assert(freed.length);assert.equal(e.item.ZPos,-34);
 step(23892);assert.equal(e.control.state,'Hover');step(23992);assert.equal(e.control.state,'Hover');assert(e.control.migrationTarget);step(24008);assert.equal(e.control.state,'FlyToLocation');
});
test('a rejected autonomous target leaves the adult hovering without claiming a perch',()=>{
 const {e,step,saved}=fixture();e.control=createFlight(0,-20);Object.assign(e.control,{state:'Hover',hoverUntil:0,bounds:{contains:()=>true,accept:()=>null}});
 step(100);assert.equal(e.control.state,'Hover');assert.equal(e.control.route.length,0);assert(!e.control.destinationPerch);assert.deepEqual(saved,[]);
});
test('a boundary-skipped migration cannot turn into a successful landing',()=>{
 const {e,step,saved}=fixture(),destination=perch('near',2);e.control=createFlight(0,-20);Object.assign(e.control,{state:'FlyToLocation',destinationPerch:destination,migrationTarget:{x:2,y:-20},route:[{x:2,y:-20}],bounds:{movement:()=>({point:{x:-1,y:-20},skipNode:true})}});
 step(100);assert.equal(e.control.state,'PreHover');assert.equal(e.perch.GUID,'old');assert.deepEqual(saved,[]);
});
test('release near a free perch follows ConsumingWaypoints -> FlyToLocation -> Perching',()=>{
 const {e,step,saved}=fixture();e.control=createFlight(0,-20);releaseFlight(e.control);e.control.finalDragDestination={x:0,y:-20};step(0);assert.equal(e.control.state,'FlyToLocation');assert.equal(e.control.destinationPerch.GUID,'near');
 for(let i=1;i<60;i++)step(i*16);assert.equal(e.control.state,'Perching');assert.equal(e.control.x,2);assert.deepEqual(saved,[['one','near']]);
});
test('release far outside the map cannot snap to a nearby perch',()=>{
 const {e,step,saved}=fixture();e.control=createFlight(0,-20);releaseFlight(e.control);e.control.finalDragDestination={x:native.finalDragDistance+1,y:-20};step(0);assert.equal(e.control.state,'PreHover');assert.deepEqual(saved,[]);
});
test('touch-down frees the perch and re-grab cancels the previous PreHover callback',()=>{
 const {e,step,freed}=fixture();e.control=createPerchedFlight(e,0,()=>0);e.control.animationName='Branch/Idle';
 beginAdultDrag(e,1,()=>0,()=>freed.push(1));assert.equal(e.control.state,'Dragging');assert(e.control.touchesDown);assert.equal(e.item.ZPos,-39);assert.equal(controlledAdultPose(e.control,e.perch,1).name,'Branch/Idle');
 releaseFlight(e.control);step(2);assert.equal(e.control.state,'PreHover');const deadline=e.control.takeoffUntil;
 beginAdultDrag(e,3,()=>0);targetFlight(e.control,{x:5,y:-20},true);step(deadline+100);assert.equal(e.control.state,'Dragging');assert(e.control.takeOff);assert.equal(e.control.takeoffUntil,undefined);
});
test('AI disable does not stop movement and small targets still pass through FlyToLocation',()=>{
 const {e,step}=fixture();e.control=createFlight(0,-20);Object.assign(e.control,{state:'Hover',hoverUntil:0});step(0,{perches:[perch('tiny',.01)]});step(16);assert.equal(e.control.state,'FlyToLocation');for(let i=2;i<45;i++)step(i*16);assert.equal(e.control.state,'Perching');
 beginAdultDrag(e,750,()=>0);targetFlight(e.control,{x:5,y:-20},true);e.control.disableAI=true;step(800);assert(e.control.x>.01);assert.equal(e.control.state,'Dragging');
});
test('native non-interactable flags prevent touch from interrupting another action',()=>{
 for(const key of ['disableAI','targetEgg','targetFuse']){
  const {e}=fixture();e.control=createPerchedFlight(e,0,()=>0);e.control[key]=true;
  assert.equal(beginAdultDrag(e,1,()=>0),null);assert.equal(e.control.state,'Perching');assert.equal(e.item.ZPos,1);
 }
});
test('a tap can enter Dragging and PreHover without changing its world plane or perspective anchor',()=>{
 const {e,step}=fixture();e.item.ZPos=1577;e.control=createPerchedFlight(e,0,()=>0);e.control.animationName='Branch/Idle';
 const camera={x:1,y:-19,z:-2292,fov:.25,near:.5,far:20000},screen={width:1100,height:900},before=projectItem(e.item,0,camera,screen);
 beginAdultDrag(e,1,()=>{throw Error('a tap must not choose a drag depth');},undefined,{deferDepth:true});
 step(1);assert.equal(e.control.state,'Dragging');assert.equal(e.control.dragDepthActive,false);assert.deepEqual(projectItem(e.item,0,camera,screen),before);
 assert(finishAdultDrag(e,{x:0,y:-20},undefined,()=>0));assert.equal(e.control.finalDragDestination,null);assert.equal(e.item.ZPos,-34);step(2);step(3);assert.equal(e.control.state,'PreHover');
});
test('actual movement activates drag depth once and release applies +2 only once',()=>{
 const {e}=fixture();e.control=createPerchedFlight(e,0,()=>0);beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});assert.equal(e.item.ZPos,1);
 beginAdultDrag(e,2,()=>0);assert.equal(e.control.dragDepthActive,true);assert.equal(e.item.ZPos,-39);
 beginAdultDrag(e,3,()=>.99);assert.equal(e.item.ZPos,-39,'repeated movement must not choose a new plane');
 assert(finishAdultDrag(e,{x:3,y:-20}));assert.equal(e.item.ZPos,-37);assert.deepEqual(e.control.finalDragDestination,{x:3,y:-20});assert.equal(finishAdultDrag(e),false);assert.equal(e.item.ZPos,-37);
});
test('reward-free harvest uses native offsets and Quadratic.Out for all 14 skeletons and both orientations',()=>{
 for(const {skeletonID,spawnOffset:[dx,dy]}of NATIVE_HOVER.skeletons)for(const orientation of [-1,1]){
  const {e,step}=fixture();e.skeletonID=skeletonID;e.control=createPerchedFlight(e,0,()=>0);Object.assign(e.control,{animationName:'Branch/Idle',orientation});
  beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});const startX=e.control.x,startY=e.control.y;
  step(1);assert(tapAdult(e,2,undefined,()=>0));const z=e.item.ZPos;assert.equal(e.control.readyToHarvest,false);assert.equal(controlledAdultPose(e.control,e.perch,2).name,'Hover');
  step(2);step(2);assert.equal(e.control.state,'PreHover');assert.equal(e.control.x,startX);assert.equal(e.control.y,startY);
  stepAdultHover(e,252);assert.equal(e.control.x,startX+dx*orientation*.75);assert.equal(e.control.y,startY+(2.5+dy)*.75);
  stepAdultHover(e,502);assert.equal(e.control.x,startX+dx*orientation);assert.equal(e.control.y,startY+(2.5+dy));assert.equal(e.item.ZPos,z);assert.equal(e.control.hoverMotion,undefined);
 }
});
test('re-grabbing stops native fly-up; a Hover tap keeps its phase without restarting lift or drifting',()=>{
 const {e,step}=fixture();e.control=createPerchedFlight(e,0,()=>0);e.control.animationName='Ground/Idle';beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});tapAdult(e,2);step(2);step(102);
 const start=e.control.animationStartedAt,position={x:e.control.x,y:e.control.y};beginAdultDrag(e,103,()=>0,undefined,{deferDepth:true});tapAdult(e,104);step(104);
 assert.equal(e.control.hoverMotion,undefined);assert.equal(e.control.animationStartedAt,start);step(502);assert.deepEqual({x:e.control.x,y:e.control.y},position);
 const {x,y}=e.control;beginAdultDrag(e,503,()=>0,undefined,{deferDepth:true});tapAdult(e,504);step(504);step(1004);assert.equal(e.control.x,x);assert.equal(e.control.y,y);
});
test('real dragging cancels fly-up; airborne Fly switches to Hover without adding perch lift',()=>{
 const {e,step}=fixture();e.control=createPerchedFlight(e,0,()=>0);e.control.animationName='Branch/Idle';beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});tapAdult(e,2);step(102);
 beginAdultDrag(e,103,()=>0);assert.equal(e.control.hoverMotion,undefined);const {x,y}=e.control;stepAdultHover(e,1000);assert.equal(e.control.x,x);assert.equal(e.control.y,y);
 e.control.animationName='Fly';assert(playAdultHover(e,1001));assert.equal(e.control.hoverMotion,undefined);
});
test('perch entry plays the correct pose above the marker and eases XYZ down with native Quadratic.In',()=>{
 for(const {skeletonID,perchOffset:[dx,dy]}of NATIVE_HOVER.skeletons)for(const sign of [-1,1])for(const ground of [false,true]){
  const {e}=fixture();const p={...perch('landing',5),scaleX:sign,ZPos:400,SymbolID:ground?'PerchMarker_Ground':'PerchMarker_Branch'};
  e.item.ZPos=-30;e.control=createFlight(4,-17,1,0,skeletonID);Object.assign(e.control,{state:'Perching',destinationPerch:p,animationName:'Fly'});
  beginPerchLanding(e,100);assert.equal(e.item.ZPos,-30);assert.equal(e.control.y,-17);assert.equal(controlledAdultPose(e.control,e.perch,100).name,ground?'Ground/Idle':'Branch/Idle');
  stepPerchLanding(e,225);assert.equal(e.control.x,4+(5+dx*sign-4)*.25);assert.equal(e.control.y,-17+(-20+dy+17)*.25);assert.equal(e.item.ZPos,77.5);
  stepPerchLanding(e,350);assert.deepEqual({x:e.control.x,y:e.control.y},perchFinalPosition(e.control,p));assert.equal(e.item.ZPos,400);assert.equal(e.control.landingMotion,undefined);
 }
});
test('native perch approach height depends on orientation and never targets the bare perch marker',()=>{
 const c=createFlight(5,-12);Object.assign(c,{orientation:1,currentAngle:Math.PI});const p=perch('target',2),final=perchFinalPosition(c,p);
 assert.equal(perchApproach(c,p).at(-1).y,final.y+1.850000023841858);
 c.orientation=-1;const points=perchApproach(c,p);assert.equal(points.length,3);assert.equal(points[2].y,final.y+2);assert.equal(points[1].x,final.x+6);
 assert(queuePerchApproach(c,p));assert.deepEqual(c.migrationTarget,points[2]);assert(c.route.length>1);
});
test('touch interrupts the landing coroutine without snapping to the final perch or replaying its callback',()=>{
 const {e,step}=fixture();e.control=createFlight(0,-17);Object.assign(e.control,{state:'Perching',destinationPerch:perch('near',2),perchUntil:60000,animationName:'Branch/Idle'});beginPerchLanding(e,0);stepPerchLanding(e,100);
 const position={x:e.control.x,y:e.control.y,z:e.item.ZPos};beginAdultDrag(e,101,()=>0,undefined,{deferDepth:true});assert.equal(e.control.landingMotion,undefined);step(500);assert.deepEqual({x:e.control.x,y:e.control.y,z:e.item.ZPos},position);
});
test('native guided curve uses floor segment count, start/end nodes and endpoint-clamped Catmull interpolation',()=>{
 const points=guidedRoute([{x:0,y:0},{x:1,y:1},{x:2,y:0}]);
 assert.deepEqual(points,[{x:0,y:0},{x:2,y:0}]);
 const nodes=[{x:0,y:0},{x:1,y:1},{x:2,y:0}];assert.deepEqual(catmullPoint(nodes,0,.5),{x:.4375,y:.5625});assert.deepEqual(catmullPoint(nodes,1,.5),{x:1.5625,y:.5625});
 const c=createFlight(0,0);beginGuidedFlight(c,nodes,8);stepGuidedFlight(c,.1,8);assert.equal(c.x,0,'native samples before incrementing lerp');assert.equal(c.guidedFlight.lerp,8/Math.sqrt(2)*.1);
 for(let i=0;i<50&&c.guidedFlight;i++)stepGuidedFlight(c,.016,8);assert.equal(c.guidedFlight,undefined);assert.deepEqual({x:c.x,y:c.y},{x:2,y:0});assert.equal(c.movingSpeed,-1);assert.equal(c.route.length,0);
});
test('real Spine adult transitions start at zero mix time and keep the movement clock through slow frames',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url))),species=catalog.species.find(s=>s.adultFamily==='Wyvern_1'),config=catalog.adult.families.Wyvern_1;
 const {skeletonData}=parseNPCMixSource({atlasText:fs.readFileSync(new URL('../../public/dragon'+config.atlasUrl,import.meta.url),'utf8'),binary:fs.readFileSync(new URL('../../public/dragon'+config.binaryUrl,import.meta.url)),config:{}});
 class Container{children=[];addChild(p){this.children.push(p);}}
 class Mesh{constructor(_t,v){this.vertices=v;this.geometry={getBuffer:()=>({update(){}})};}}
 const rig=createSpineActor({Container,SimpleMesh:Mesh},{skeletonData,skin:species.id,pages:config.pages,textures:new Map(Object.values(config.pages).map(p=>[p,{}])),mixSeconds:.25});
 const pose=(name,elapsed)=>({name,key:name,elapsed,mixElapsed:elapsed,loop:true,realTime:true});
 rig.sample(pose('Branch/Idle',1),1000);rig.sample(pose('Hover',0),1016);assert.equal(rig.state.getCurrent(0).mixTime,0,'no extra frame of mixing before the lift starts');
 rig.sample(pose('Hover',.125),1141);assert.equal(rig.state.getCurrent(0).mixTime,.125,'125ms frame is not capped at 50ms');
 rig.sample(pose('Hover',.25),1266);assert.equal(rig.state.getCurrent(0).mixTime,.25);assert.equal(rig.state.getCurrent(0).trackTime,.25);
});
test('A: tap follows native state path Perching -> Dragging -> ConsumingWaypoints -> PreHover via transition table',()=>{
 const {e,step}=fixture();e.control=createPerchedFlight(e,0,()=>0);assert.equal(e.control.state,'Perching');
 beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});assert(e.control.touchesDown);assert.equal(e.control.state,'Perching');
 step(2);assert.equal(e.control.state,'Dragging');
 tapAdult(e,3);assert.equal(e.control.touchesDown,false);assert.equal(e.control.state,'Dragging');
 step(4);assert.equal(e.control.state,'ConsumingWaypoints');
 step(5);assert.equal(e.control.state,'PreHover');
});
test('E: leaving a perch clears destinationPerch and reservation on every exit',()=>{
 const {e,step,freed}=fixture();e.control=createPerchedFlight(e,0,()=>0);assert.equal(e.control.destinationPerch?.GUID,'old');
 beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});step(2);
 assert.equal(e.control.state,'Dragging');assert.equal(e.control.destinationPerch,null);assert(freed.length>0);
});
test('C: migration completes within 3.5985 of a free perch -> perch reserved, state goes FlyToLocation then Perching; farther -> PreHover',()=>{
 const {e,step,saved}=fixture();e.control=createFlight(1,-20);
 Object.assign(e.control,{state:'FlyToLocation',migrationTarget:{x:1,y:-20},route:[{x:1,y:-20}]});
 step(16);
 assert.equal(e.control.state,'FlyToLocation');assert.equal(e.control.destinationPerch?.GUID,'near');
 for(let i=2;i<60;i++)step(i*16);
 assert.equal(e.control.state,'Perching');assert.deepEqual(saved,[['one','near']]);
 const {e:e2,step:step2}=fixture();e2.control=createFlight(10,-20);
 Object.assign(e2.control,{state:'FlyToLocation',migrationTarget:{x:10,y:-20},route:[{x:10,y:-20}]});
 step2(16);
 assert.equal(e2.control.state,'PreHover');assert.equal(e2.control.destinationPerch,null);
});
test('D: after landing with arrival heading opposite to perch facing, one small dt step has not reached facing; enough steps reach it',()=>{
 const {e,step}=fixture();e.control=createFlight(2,-20);
 Object.assign(e.control,{state:'FlyToLocation',destinationPerch:perch('near',2),migrationTarget:{x:2,y:-20},route:[{x:2,y:-20}],currentAngle:Math.PI});
 step(16);
 assert.equal(e.control.state,'Perching');assert.notEqual(e.control.currentAngle,null);
 assert(Math.abs(e.control.currentAngle-Math.PI)<1,'one small dt step has not reached facing');
 for(let i=2;i<50;i++)step(i*16);
 assert(e.control.currentAngle===0||Math.abs(e.control.currentAngle-2*Math.PI)<1e-5,'enough steps reach perch facing');
});
test('D2: far perch: first migration to perch + (0,1.79925) with FlyToLocation and perch reserved, then approach from arrival point, then Perching; near perch: approach immediately',()=>{
 const e=fixture().e;e.perch=perch('old',0);const far=perch('far',10),saved=[];
 const step=(now,extra={})=>stepAdultBehaviour(e,{entries:[e],perches:[far],now,dt:.016,random:()=>0,onPerch:(...p)=>saved.push(p),...extra});
 e.control=createFlight(0,-20);Object.assign(e.control,{state:'Hover',hoverUntil:0});
 step(16);assert.equal(e.control.destinationPerch?.GUID,'far');assert.deepEqual(e.control.migrationTarget,{x:10,y:-20+1.79925});assert(e.control.stage1);
 step(32);assert.equal(e.control.state,'FlyToLocation');assert.equal(e.control.destinationPerch?.GUID,'far');
 let now=32;while(e.control.stage1&&now<5000){now+=16;step(now);}
 assert.equal(e.control.stage1,undefined);assert.equal(e.control.state,'FlyToLocation');assert.equal(e.control.destinationPerch?.GUID,'far');
 assert(Math.abs(e.control.x-10)<1e-4);assert(Math.abs(e.control.y-(-18.20075))<1e-4);assert(e.control.perchApproachTarget);
 while(e.control.state!=='Perching'&&now<10000){now+=16;step(now);}
 assert.equal(e.control.state,'Perching');assert.deepEqual(saved,[['one','far']]);
 const {e:e2,step:step2,saved:saved2}=fixture();e2.control=createFlight(0,-20);Object.assign(e2.control,{state:'Hover',hoverUntil:0});
 step2(16);assert.equal(e2.control.destinationPerch?.GUID,'near');assert.equal(e2.control.stage1,undefined);assert(e2.control.perchApproachTarget);
 step2(32);assert.equal(e2.control.state,'FlyToLocation');
 now=32;while(e2.control.state!=='Perching'&&now<5000){now+=16;step2(now);}
 assert.equal(e2.control.state,'Perching');assert.deepEqual(saved2,[['one','near']]);
});
test('D3: type-1 migration covers less distance per second near its start than mid-route; a perch approach keeps constant speed',()=>{
 const {e,step}=fixture();e.control=createFlight(0,0);Object.assign(e.control,{state:'Hover',hoverUntil:0});
 const rooms=[{XPos:50,YPos:0}];
 step(10,{rooms,random:()=>.95,dt:.02});
 assert.equal(e.control.migrationTarget?.x,50);assert.equal(e.control.guidedFlight?.type,1);
 step(20,{rooms,random:()=>.95,dt:.02});assert.equal(e.control.state,'FlyToLocation');
 let now=20;while(e.control.guidedFlight.index<1){now+=20;step(now,{rooms,random:()=>.95,dt:.02});}
 const pStart={x:e.control.x,y:e.control.y};now+=20;step(now,{rooms,random:()=>.95,dt:.02});const distStart=Math.hypot(e.control.x-pStart.x,e.control.y-pStart.y);
 while(e.control.guidedFlight.index<25){now+=20;step(now,{rooms,random:()=>.95,dt:.02});}
 const pMid={x:e.control.x,y:e.control.y};now+=20;step(now,{rooms,random:()=>.95,dt:.02});const distMid=Math.hypot(e.control.x-pMid.x,e.control.y-pMid.y);
 assert(distStart<distMid,'type-1 migration covers less distance per second near its start than mid-route');
 const nodes=[{x:0,y:0},{x:2,y:0},{x:4,y:0},{x:6,y:0},{x:8,y:0}],c2=createFlight(0,0);beginGuidedFlight(c2,nodes,8,2);
 while(c2.guidedFlight.index<1)stepGuidedFlight(c2,.05,8);
 const s1=c2.guidedFlight.lerpSpeed,pP1={x:c2.x,y:c2.y};stepGuidedFlight(c2,.05,8);const distP1=Math.hypot(c2.x-pP1.x,c2.y-pP1.y);
 while(c2.guidedFlight.index<2)stepGuidedFlight(c2,.05,8);
 const s2=c2.guidedFlight.lerpSpeed,pP2={x:c2.x,y:c2.y};stepGuidedFlight(c2,.05,8);const distP2=Math.hypot(c2.x-pP2.x,c2.y-pP2.y);
 assert.equal(s1,s2,'perch approach lerpSpeed is constant');assert(Math.abs(distP1-distP2)<1e-4,'perch approach distance per second is constant');
});
test('a second drag re-selects the drag plane and a tap-only exit flies on the cruise plane',()=>{
 const {e,step}=fixture();e.item.ZPos=97.5;e.control=createPerchedFlight(e,0,()=>0);
 beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});step(2);beginAdultDrag(e,3,()=>0);
 assert.equal(e.item.ZPos,-39);assert(finishAdultDrag(e,{x:0,y:-20}));
 e.control.state='Perching';e.item.ZPos=97.5;
 beginAdultDrag(e,4,()=>0,undefined,{deferDepth:true});step(5);beginAdultDrag(e,6,()=>0);
 assert.equal(e.item.ZPos,-39,'second real drag must leave the perch plane');
 assert.equal(e.control.dragDepthActive,true);finishAdultDrag(e,{x:0,y:-20});
 e.control.state='Perching';e.item.ZPos=97.5;
 beginAdultDrag(e,7,()=>0,undefined,{deferDepth:true});step(8);
 assert(tapAdult(e,9,()=>{},()=>0));
 assert(e.item.ZPos>=-34&&e.item.ZPos<=-26,'tap exit must use cruise Z, not the perch plane');
});
test('perch approach fix 1: node list for a 3-anchor route has no B(1/n) node and starts at P0, ends at the drop',()=>{
 const a={x:0,y:0},b={x:5,y:5},c={x:10,y:0},points=guidedRoute([a,b,c]);
 const n=Math.floor(Math.hypot(b.x-a.x,b.y-a.y)+Math.hypot(c.x-b.x,c.y-b.y));
 assert.equal(points.length,n);assert.deepEqual(points[0],a);assert.deepEqual(points.at(-1),c);
 const t=1/n,u=1-t,b1={x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y};
 assert(!points.some(p=>Math.abs(p.x-b1.x)<1e-5&&Math.abs(p.y-b1.y)<1e-5),'has no B(1/n) node');
});
test('perch approach fix 2: same-sign case with sign(control.x - drop.x) != slotSign gives [pos, {x:pos.x, y:drop.y}]',()=>{
 const c=createFlight(0,-15);Object.assign(c,{orientation:1});
 const p=perch('p1',10),final=perchFinalPosition(c,p);
 const dropY=final.y+NATIVE_PERCH.sameSignHeight;
 const route=perchApproach(c,p);
 assert.deepEqual(route,[{x:0,y:-15},{x:0,y:dropY}]);
});
test('perch approach fix 3: null currentAngle gives way point == drop',()=>{
 const c=createFlight(0,-15);Object.assign(c,{orientation:-1,currentAngle:null});
 const p=perch('p1',10),route=perchApproach(c,p);
 assert.equal(route.length,3);assert.deepEqual(route[1],route[2]);
});
test('type-1 migration applies per-frame bounds movement correction rather than passing through a wall',()=>{
 const {e,step}=fixture(),wallX=5;let corrected=false;
 const bounds={
  accept:p=>({point:p,corrected:false}),
  contains:()=>true,
  movement:(current,proposed)=>{
   if(proposed.x>wallX){corrected=true;return {point:{x:wallX,y:proposed.y},skipNode:true};}
   return null;
  }
 };
 e.control=createFlight(0,-20);Object.assign(e.control,{state:'Hover',hoverUntil:0,bounds});
 const rooms=[{XPos:20,YPos:-20}];
 step(10,{rooms,perches:[],random:()=>.95,dt:.02});
 assert.equal(e.control.migrationTarget?.x,20);assert.equal(e.control.guidedFlight?.type,1);
 step(20,{rooms,perches:[],random:()=>.95,dt:.02});assert.equal(e.control.state,'FlyToLocation');
 let now=20;while(e.control.guidedFlight?.type===1&&now<3000){now+=20;step(now,{rooms,perches:[],random:()=>.95,dt:.02});assert(e.control.x<=wallX+1e-5,'dragon cannot pass through wall');}
 assert(corrected,'bounds.movement must correct the type-1 migration position');assert.equal(e.control.x,wallX);
});
test('R2: pointer-down then finishAdultDrag before any step clears touch and never enters Dragging',()=>{
 const {e,step}=fixture();e.control=createPerchedFlight(e,0,()=>0);
 beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});assert.equal(e.control.state,'Perching');assert.equal(e.control.touchesDown,true);
 assert.equal(finishAdultDrag(e,null,undefined,()=>0),true);
 assert.equal(e.control.touchesDown,false);assert.equal(e.control.dragDepthActive,false);assert.equal(e.control.dragRouteActive,false);assert.equal(e.control.wasPerchedOnTouch,undefined);
 for(let i=1;i<=60;i++){step(i*16);assert.notEqual(e.control.state,'Dragging');}
});
test('tap before first step leaves the dragon perched with unchanged Z and perch reservation',()=>{
 const {e,step,freed}=fixture();e.control=createPerchedFlight(e,0,()=>0);const startZ=e.item.ZPos;
 beginAdultDrag(e,1,()=>0,undefined,{deferDepth:true});
 assert.equal(tapAdult(e,2,()=>freed.push('tap'),()=>0),false);
 assert.equal(e.control.state,'Perching');assert.equal(e.item.ZPos,startZ);assert.equal(e.control.touchesDown,false);
 assert.equal(e.control.destinationPerch?.GUID,'old');assert.equal(e.control.hoverMotion,undefined);assert.equal(e.control.animationName,'Branch/Idle');
 assert.deepEqual(freed,[]);
 for(let i=1;i<=60;i++)step(i*16);
 assert.equal(e.control.state,'Perching');assert.equal(e.item.ZPos,startZ);
});
test('readyToHarvest keeps Perching/PreHover anchored, forces Hover->PreHover, and triggers onHarvest once on tap',()=>{
 const {e,step}=fixture();e.control=createPerchedFlight(e,0,()=>0);e.control.readyToHarvest=true;e.control.perchUntil=10;
 step(50);assert.equal(e.control.state,'Perching');
 beginAdultDrag(e,55,()=>0,undefined,{deferDepth:true});step(56);assert.equal(e.control.state,'Dragging');
 let harvested=0;tapAdult(e,60,undefined,()=>0,()=>harvested++);
 assert.equal(harvested,1);assert.equal(e.control.readyToHarvest,false);
 step(60);step(60);assert.equal(e.control.state,'PreHover');
 step(10000);assert.equal(e.control.state,'Hover');
 e.control.readyToHarvest=true;step(10020);assert.equal(e.control.state,'PreHover');
 step(20000);assert.equal(e.control.state,'PreHover');
});
