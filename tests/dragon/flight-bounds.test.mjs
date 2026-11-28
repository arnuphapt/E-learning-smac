import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createFlightBounds} from '../../lib/dragon/flight-bounds.mjs';
import {createFlight,targetFlight,releaseFlight,stepFlight} from '../../lib/dragon/dragon-flight.mjs';

const read=p=>JSON.parse(fs.readFileSync(new URL('../../'+p,import.meta.url)));
const native=read('public/dragon/generated/dragon-colliders.json');
const map={MapItemData:[[-54.3,-58.19],[78.3,-58.19],[-54.3,0],[78.3,0]].map(([XPos,YPos],i)=>({SymbolID:'OuterWallMarker',GUID:String(i),XPos,YPos}))};
const bounds=createFlightBounds(map,native);
test('all 14 native colliders reject outside pointer samples without adding route nodes',()=>{
 assert.equal(native.colliders.length,14);
 for(let rig=0;rig<14;rig++)for(const scale of [.5,.9,1,2]){
  const c=createFlight(0,-20,1,0,rig,bounds,scale);
  for(const target of [{x:-1e9,y:1e9},{x:1e9,y:1e9},{x:1e9,y:-1e9},{x:-1e9,y:-1e9}]){
   c.state='Dragging';assert.equal(targetFlight(c,target),false);assert.equal(c.route.length,0);assert.deepEqual(c.target,{x:0,y:-20});
  }
  assert.throws(()=>targetFlight(c,{x:NaN,y:0}));
 }
});
test('native collider size ignores visual scale; near-wall samples use the 1.25 correction',()=>{
 assert.deepEqual(bounds.limits(5,'Fly',.5),bounds.limits(5,'Fly',2));
 const sample=bounds.accept({x:78,y:-30},5);assert(sample.corrected);assert(Math.abs(sample.point.x-74)<1e-5);assert(Math.abs(sample.point.y+30)<1e-5);
 const corner=bounds.accept({x:78,y:-.1},5);assert(corner.corrected);assert(Math.abs(corner.point.x-74)<1e-5);assert(Math.abs(corner.point.y+1.5375)<1e-5);
 const c=createFlight(70,-30,1,0,5,bounds,.9);assert(targetFlight(c,{x:78,y:-30}));assert.equal(c.route.length,1);releaseFlight(c);
 for(let n=0;n<80;n++){stepFlight(c,null,.016);assert(bounds.contains(c,5,c.state==='Hover'?'Hover':'Fly'));}assert.equal(c.state,'Hover');
});
test('forced first native sample records even an unchanged pointer position',()=>{
 const c=createFlight(0,-20,1,0,5,bounds);
 assert.equal(targetFlight(c,{x:0,y:-20},true),true);
 assert.deepEqual(c.route,[{x:0,y:-20}]);
 assert.equal(targetFlight(c,{x:0,y:-20}),false);
 assert.equal(targetFlight(c,{x:.5,y:-20}),false);
 assert.equal(c.route.length,1);
});
test('native playback consumes one waypoint per frame and does not spend remaining time on the next',()=>{
 const c=createFlight(0,-20,1,0,5,bounds);targetFlight(c,{x:1,y:-20});targetFlight(c,{x:2,y:-20});releaseFlight(c);stepFlight(c,null,.2);
 assert.equal(c.x,1);assert.equal(c.route.length,1);stepFlight(c,null,.2);assert.equal(c.x,2);assert.equal(c.route.length,0);
});
test('native movement distinguishes small correction from the .01 skip-node threshold',()=>{
 const limits=bounds.limits(5),small=bounds.movement({x:limits.right-.2,y:-30},{x:limits.right+.004,y:-30},{x:1,y:0},10,.016,5);
 assert.equal(small.skipNode,false);assert(Math.abs(small.point.x-(limits.right+.004-.004*1.25+.16))<1e-5);
 const large=bounds.movement({x:limits.right-.2,y:-30},{x:limits.right+.02,y:-30},{x:1,y:0},10,.016,5);
 assert.equal(large.skipNode,true);assert(Math.abs(large.point.x-(limits.right-.22))<1e-5);
});
