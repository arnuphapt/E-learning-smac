import test from 'node:test';
import assert from 'node:assert/strict';
import {headingForAngle,stepHeading} from '../../lib/dragon/dragon-heading.mjs';
import {NATIVE_FLIGHT as source} from '../../lib/dragon/generated/native-flight.mjs';
import {createFlight,targetFlight,releaseFlight,stepFlight} from '../../lib/dragon/dragon-flight.mjs';
test('native Y reflection and world rotation aim a left-facing rig along all eight headings',()=>{
 for(const angle of [-Math.PI,-3*Math.PI/4,-Math.PI/2,-Math.PI/4,0,Math.PI/4,Math.PI/2,3*Math.PI/4,Math.PI]){
  const h=headingForAngle(angle),r=h.rotation*Math.PI/180;
  assert(Math.abs(-Math.cos(r)-Math.cos(angle))<1e-6,`horizontal direction ${angle}`);
  assert(Math.abs(-Math.sin(r)+Math.sin(angle))<1e-6,`screen Y direction ${angle}`);
  // Reflected local up must retain its world-space vertical component.
  assert(Math.abs(-h.orientation*Math.cos(r)+Math.abs(Math.cos(angle)))<1e-6,`upright wings ${angle}`);
 }
});
test('turning uses the short arc across the wrap boundary and respects the native RPS cap',()=>{
 const c={currentAngle:source.tau-.05,rps:source.initialRps};
 stepHeading(c,Math.cos(-Math.PI+.05),Math.sin(-Math.PI+.05),.001);
 assert(c.currentAngle>source.tau-.05,'turn across 2pi rather than back through pi');
 assert(c.currentAngle-(source.tau-.05)<=source.initialRps*source.tau*.001+1e-6);
 for(let i=0;i<300;i++)stepHeading(c,Math.cos(-Math.PI+.05),Math.sin(-Math.PI+.05),.016);
 assert(Math.abs(c.angle-(-Math.PI+.05))<1e-5);
});
test('native drag speed replaces the prototype speed and hover levels the rig after a diagonal route',()=>{
 const c=createFlight(0,0);targetFlight(c,{x:5,y:5});stepFlight(c,{},.05);
 assert(Math.abs(Math.hypot(c.x,c.y)-.5)<1e-6,'10 units per second');
 releaseFlight(c);for(let i=0;i<300;i++)stepFlight(c,{},.016);
 assert.equal(c.state,'Hover');assert(Math.abs(Math.sin(c.rotation*Math.PI/180))<1e-6,'upright hover after release');assert.equal(c.x,5);assert.equal(c.y,5);
});
import {controlledAdultPose} from '../../lib/dragon/adult-animation.mjs';
test('drag release and a re-grab keep the Fly phase; PreHover to Hover keeps the Hover phase',()=>{
 const c={state:'Dragging'},perch={SymbolID:'PerchMarker_Branch'},start=controlledAdultPose(c,perch,100);assert.equal(start.elapsed,0);c.state='ConsumingWaypoints';const release=controlledAdultPose(c,perch,500);assert.equal(release.key,start.key);assert.equal(release.elapsed,.4);
 const again={...c,state:'Dragging'};assert.equal(controlledAdultPose(again,perch,1100).elapsed,1);c.state='PreHover';assert.equal(controlledAdultPose(c,perch,1200).elapsed,0);c.state='Hover';assert.equal(controlledAdultPose(c,perch,1500).elapsed,.3);
});
