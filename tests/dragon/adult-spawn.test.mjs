import test from 'node:test';
import assert from 'node:assert/strict';
import {adultSpawnPosition} from '../../lib/dragon/adult-spawn.mjs';
import {createHoverFlight} from '../../lib/dragon/adult-behaviour.mjs';
import {NATIVE_HOVER} from '../../lib/dragon/generated/native-hover.mjs';

test('mature spawn uses native reticle pivot and family offsets for both nursery facings',()=>{
 const f=Math.fround;
 for(const {skeletonID,spawnOffset:[dx,dy]} of NATIVE_HOVER.skeletons)for(const facing of [-1,1]){
  const origin={XPos:23.7,YPos:-12.3,scaleX:facing,ZPos:3};
  const e={origin,skeletonID,item:{scaleX:1},dragonScale:2};
  const c=createHoverFlight(e,1000,()=>0);
  assert.equal(c.x,f(f(origin.XPos)+f(dx*facing)));
  assert.equal(c.y,f(f(f(origin.YPos)+1)+dy));
  assert.equal(c.state,'Hover');assert.equal(c.hoverUntil,6000);
  assert.deepEqual(adultSpawnPosition(origin,skeletonID),{x:c.x,y:c.y});
 }
});

test('restoring a floating adult does not apply nursery spawn offsets again',()=>{
 const e={origin:{XPos:20,YPos:30,scaleX:-1},skeletonID:0,item:{scaleX:1}};
 const c=createHoverFlight(e,1000,()=>0,{position:{x:2.75,y:8.125},deadline:4000});
 assert.equal(c.x,2.75);assert.equal(c.y,8.125);assert.equal(c.hoverUntil,4000);
});
