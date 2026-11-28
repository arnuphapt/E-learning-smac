import {NATIVE_FLIGHT} from './generated/native-flight.mjs';
import {stepHeading} from './dragon-heading.mjs';
import {flightColliderPose} from './flight-bounds.mjs';
import {NATIVE_BOUNDARY} from './generated/native-boundary.mjs';
import {nativeMagnitude} from './native-flight-boundary.mjs';
import {stepGuidedFlight,advanceGuidedNode} from './native-guided-flight.mjs';
// Native MovementController keeps its drag route on DragEntityEnded.
export function createFlight(x,y,facing=1,now=Date.now(),skeletonID=0,bounds=null,scale=1){
 return {x,y,target:{x,y},route:[],state:'Dragging',startedAt:now,updatedAt:now,facing,skeletonID,bounds,scale,speedScalar:NATIVE_FLIGHT.speedScalars[skeletonID]??1};
}
export function targetFlight(control,target,flush=false){
 if(!Number.isFinite(target.x)||!Number.isFinite(target.y))throw Error('Invalid flight target');
 let corrected=false;if(control.bounds){const accepted=control.bounds.accept(target,control.skeletonID,control.colliderPose??'Fly');if(!accepted)return false;target=accepted.point;corrected=accepted.corrected;}
 control.target={...target};const last=control.route.at(-1)??control.lastInput??control;
 const distance=nativeMagnitude(target.x-last.x,target.y-last.y);
 if(!corrected&&!flush&&distance<=NATIVE_BOUNDARY.inputDistance)return false;
 // Native appends one sampled mouse position, without inserting extra waypoints.
 control.route.push({...target});control.lastInput={...target};
 return true;
}
export function releaseFlight(control){control.pendingInput=null;control.touchesDown=false;control.state='ConsumingWaypoints';}
export function stepFlight(control,_perch,dt,speed=NATIVE_FLIGHT.dragSpeed*control.speedScalar,settle=true){
 control.arrivedThisFrame=false;
 const elapsed=Number.isFinite(dt)?Math.max(0,dt):0;let headingUpdated=false;
 const current={x:control.x,y:control.y},isType1=control.guidedFlight?.type===1;
 const guided=stepGuidedFlight(control,elapsed,speed);
 if(guided){
  if(isType1&&control.bounds){
   const proposed={x:control.x,y:control.y},dx=guided.finished?proposed.x-current.x:guided.dx,dy=guided.finished?proposed.y-current.y:guided.dy;
   const correction=control.bounds.movement(current,proposed,{x:dx,y:dy},speed,elapsed,control.skeletonID,control.colliderPose??flightColliderPose(control.state,_perch));
   if(correction){
    Object.assign(control,correction.point);
    if(correction.skipNode){advanceGuidedNode(control,speed);control.movingSpeed=0;}
   }
  }
  if(Math.hypot(guided.dx,guided.dy)>1e-6&&!guided.finished){stepHeading(control,guided.dx,guided.dy,elapsed);headingUpdated=true;}
 }
 else if(control.route.length){
  const target=control.route[0],dx=Math.fround(target.x-control.x),dy=Math.fround(target.y-control.y),distance=nativeMagnitude(dx,dy),step=Math.min(distance,Math.fround(speed*Math.fround(elapsed)));
  let proposed=distance<=step?{...target}:{x:Math.fround(control.x+Math.fround((distance>1e-5?Math.fround(dx/distance):0)*step)),y:Math.fround(control.y+Math.fround((distance>1e-5?Math.fround(dy/distance):0)*step))};
  if(distance<=step)control.route.shift();
  const correction=control.bounds?.movement(current,proposed,{x:dx,y:dy},speed,elapsed,control.skeletonID,control.colliderPose??flightColliderPose(control.state,_perch));
  if(correction){proposed=correction.point;if(correction.skipNode)control.route.shift();}
  control.movingSpeed=correction?.skipNode||!control.route.length?0:speed;
  Object.assign(control,proposed);
  if(distance>1e-5&&control.movingSpeed>0){if(Math.abs(dx)>.02)control.facing=dx<0?-1:1;stepHeading(control,dx,dy,elapsed);headingUpdated=true;}
 }
 if(settle&&control.state==='ConsumingWaypoints'&&!control.route.length){control.state='Hover';control.arrivedThisFrame=true;}
 // SwitchDisplayHovering passes (-orientation, 0) with updateRPS=false.
 if(['Hover','PreHover'].includes(control.state)&&!headingUpdated)stepHeading(control,-(control.orientation??1),0,elapsed,false);
 return control.state==='Hover';
}
export function segmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy,t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
