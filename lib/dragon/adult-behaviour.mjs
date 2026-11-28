import {startPerchAnimation,stepPerchAnimation} from './adult-perch-animation.mjs';
import {stepFlight,targetFlight,createFlight,releaseFlight} from './dragon-flight.mjs';
import {NATIVE_FLIGHT} from './generated/native-flight.mjs';
import {nextDragonState} from './dragon-states.mjs';
import {NATIVE_DRAGON_STATE} from './generated/native-dragon-states.mjs';
import {stepHeading} from './dragon-heading.mjs';
import {playAdultHover,stepAdultHover} from './adult-hover.mjs';
import {perchFinalPosition,queuePerchApproach,beginPerchLanding,stepPerchLanding,facePerch} from './adult-perch.mjs';
import {beginGuidedFlight} from './native-guided-flight.mjs';
import {NATIVE_SPAWN} from './generated/native-spawn.mjs';
import {adultSpawnPosition} from './adult-spawn.mjs';
const integer=(min,max,random)=>min+Math.floor(Math.max(0,Math.min(.999999,random()))*(max-min));
export function chooseFreePerch(entry,entries,perches,reserved=[],random=Math.random,randomChoice=false){
 const occupied=new Set(reserved);
 for(const other of entries){if(other===entry||other.kind!=='adult')continue;const c=other.control;if(!c||c.state==='Perching')occupied.add(other.perch.GUID);if(c?.destinationPerch)occupied.add(c.destinationPerch.GUID);}
 const c=entry.control,available=perches.filter(p=>!occupied.has(p.GUID)&&(!c.bounds||c.bounds.contains({x:p.XPos,y:p.YPos},c.skeletonID,'Fly',c.scale)&&c.bounds.contains({x:p.XPos,y:p.YPos},c.skeletonID,p.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle',c.scale)));if(!available.length)return null;
 if(randomChoice)return available[integer(0,available.length,random)];
 return available.sort((a,b)=>Math.hypot(a.XPos-entry.control.x,a.YPos-entry.control.y)-Math.hypot(b.XPos-entry.control.x,b.YPos-entry.control.y))[0];
}
// The state checks/order are native; map route construction remains a browser adapter.
export function createHoverFlight(entry,now,random=Math.random,{position=null,deadline=null,releasePerch=false}={}){
 const point=position??adultSpawnPosition(entry.origin,entry.skeletonID??0),facing=Math.sign(entry.origin?.scaleX??entry.item.scaleX)||1;
 const c=createFlight(point.x,point.y,facing,now,entry.skeletonID??0,entry.bounds??null,entry.dragonScale??1);
 Object.assign(c,{state:NATIVE_SPAWN.initialState,takeOff:true,touchesDown:false,colliderPose:'Hover',animationName:'Hover',animationStartedAt:now,hoverUntil:deadline??now+integer(...NATIVE_SPAWN.hoverWait,random)*1000,spawnPendingRelease:releasePerch});
 stepHeading(c,-facing,0,0,false);
 return c;
}
export function createPerchedFlight(entry,now,random=Math.random){
 const c=createFlight(entry.perch.XPos,entry.perch.YPos,Math.sign(entry.item.scaleX)||1,now,entry.skeletonID??0,entry.bounds??null,entry.dragonScale??1);
 Object.assign(c,perchFinalPosition(c,entry.perch));
 const idlePose=entry.perch.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle',track=entry.live?.state.getCurrent(0);
 if(track&&track.animation.name===idlePose)Object.assign(c,{animationName:track.animation.name,animationStartedAt:now-track.trackTime*1000});
 else Object.assign(c,{animationName:idlePose,animationStartedAt:now});
 Object.assign(c,{state:'Perching',destinationPerch:entry.perch,takeOff:true,touchesDown:false,perchedAt:now,perchUntil:now+integer(...NATIVE_FLIGHT.perchWait,random)*1000,rotation:entry.perch.rotation??0,orientation:1});
 stepHeading(c,-(Math.sign(entry.perch.scaleX)||1),0,0,false);
 startPerchAnimation(c,now,random);return c;
}
export function beginAdultDrag(entry,now,random=Math.random,onUnperch,{deferDepth=false}={}){
 if(entry.control&&(entry.control.disableAI||entry.control.targetEgg||entry.control.targetFuse))return null;
 const c=entry.control??createFlight(entry.item.XPos,entry.item.YPos,Math.sign(entry.item.scaleX)||1,now,entry.skeletonID??0,entry.bounds??null,entry.dragonScale??1);
 if(deferDepth||c.dragDepthActive===undefined)c.dragDepthActive=false;
 if(deferDepth)c.dragRouteActive=false;
 if(deferDepth||c.wasPerchedOnTouch===undefined)c.wasPerchedOnTouch=c.state==='Perching'||Boolean(c.landingMotion);
 c.touchesDown=true;c.destinationPerch=null;c.migrationTarget=null;c.perchApproachTarget=null;c.approachTarget=null;delete c.stage1;
 delete c.hoverMotion;delete c.landingMotion;
 if(!deferDepth){
  c.state='Dragging';c.dragRouteActive=true;c.takeOff=true;c.route=[];c.pendingInput=null;c.inputInitialized=false;c.lastInput=null;c.finalDragDestination=null;c.checkedDragDestination=false;
  c.holdPose=c.animationName??entry.live?.state.getCurrent(0)?.animation?.name??'Hover';c.dragHasMoved=false;c.movingSpeed=0;
  delete c.perchApproachTarget;delete c.guidedFlight;delete c.hoverUntil;delete c.takeoffUntil;
  if(c.currentAngle==null)stepHeading(c,-(Math.sign(entry.item.scaleX)||1),0,0,false);
  if(!c.dragDepthActive){delete c.hoverMotion;entry.item.ZPos=Math.fround(NATIVE_FLIGHT.dragZRange[0]+random()*(NATIVE_FLIGHT.dragZRange[1]-NATIVE_FLIGHT.dragZRange[0]));c.dragDepthActive=true;}
 }
 entry.control=c;if(!deferDepth)onUnperch?.(entry);return c;
}
export function finishAdultDrag(entry,finalPoint,onUnperch,random=Math.random){
 const c=entry.control;if(!c?.touchesDown)return false;
 if(c.state!=='Dragging'){c.touchesDown=false;c.pendingInput=null;c.dragDepthActive=false;c.dragRouteActive=false;delete c.wasPerchedOnTouch;if(c.state==='Perching'&&entry.perch&&!c.destinationPerch)c.destinationPerch=entry.perch;return true;}
 const wasPerched=c.wasPerchedOnTouch??(c.state==='Perching'||Boolean(c.landingMotion));
 c.touchesDown=false;c.pendingInput=null;
 c.finalDragDestination=c.dragDepthActive&&finalPoint?{...finalPoint}:null;
 if(c.dragDepthActive)entry.item.ZPos=Math.fround(entry.item.ZPos+NATIVE_FLIGHT.releaseZOffset);
 else if(wasPerched)entry.item.ZPos=Math.fround(NATIVE_DRAGON_STATE.cruiseZRange[0]+random()*(NATIVE_DRAGON_STATE.cruiseZRange[1]-NATIVE_DRAGON_STATE.cruiseZRange[0]));
 c.dragDepthActive=false;delete c.wasPerchedOnTouch;
 onUnperch?.(entry);return true;
}
export function tapAdult(entry,now,onUnperch,random=Math.random,onHarvest){
 const c=entry.control;
 if(!c||c.disableAI||c.targetEgg||c.targetFuse||c.dragDepthActive)return false;
 if(c.state!=='Dragging'){if(c.readyToHarvest){onHarvest?.(entry);c.readyToHarvest=false;}c.touchesDown=false;c.pendingInput=null;c.dragDepthActive=false;c.dragRouteActive=false;delete c.wasPerchedOnTouch;if(c.state==='Perching'&&entry.perch&&!c.destinationPerch)c.destinationPerch=entry.perch;return false;}
 const wasPerched=c.wasPerchedOnTouch??(c.state==='Perching'||Boolean(c.landingMotion));
 c.touchesDown=false;c.pendingInput=null;if(c.readyToHarvest)onHarvest?.(entry);c.readyToHarvest=false;
 playAdultHover(entry,now);
 if(wasPerched)entry.item.ZPos=Math.fround(NATIVE_DRAGON_STATE.cruiseZRange[0]+random()*(NATIVE_DRAGON_STATE.cruiseZRange[1]-NATIVE_DRAGON_STATE.cruiseZRange[0]));
 c.dragDepthActive=false;delete c.wasPerchedOnTouch;
 c.destinationPerch=null;c.migrationTarget=null;c.perchApproachTarget=null;c.approachTarget=null;delete c.stage1;
 onUnperch?.(entry);return true;
}
function preHover(c,now,random){
 c.takeOff=true;c.migrationTarget=null;c.destinationPerch=null;delete c.stage1;
 c.hoverUntil=now+integer(...NATIVE_FLIGHT.idleWait,random)*1000;
 c.takeoffUntil=c.hoverUntil+NATIVE_FLIGHT.takeoffCallbackOffset*1000;
}
function startType1Migration(control,target){
 if(!Number.isFinite(target.x)||!Number.isFinite(target.y))throw Error('Invalid flight target');
 if(control.bounds){const accepted=control.bounds.accept(target,control.skeletonID,control.colliderPose??'Fly');if(!accepted)return false;target=accepted.point;}
 const dx=target.x-control.x,dy=target.y-control.y,n=Math.max(1,Math.floor(Math.hypot(dx,dy))),nodes=[{x:control.x,y:control.y}];
 for(let i=1;i<=n;i++)nodes.push({x:control.x+dx*i/n,y:control.y+dy*i/n});
 delete control.hoverMotion;
 beginGuidedFlight(control,nodes,NATIVE_FLIGHT.migrationSpeed*control.speedScalar,1);
 control.target={...target};control.lastInput={...target};control.migrationTarget={...target};
 return true;
}
function migrateToPerch(control,destination){
 if(Math.hypot(destination.XPos-control.x,destination.YPos-control.y)<=NATIVE_DRAGON_STATE.snapToPerchDistance)return queuePerchApproach(control,destination);
 delete control.perchApproachTarget;
 if(!startType1Migration(control,{x:destination.XPos,y:destination.YPos+1.79925}))return false;
 control.stage1=true;control.destinationPerch=destination;return true;
}
export function stepAdultBehaviour(entry,{entries,perches,rooms=[],reserved=[],now,dt,random=Math.random,onPerch,onUnperch,onStateChange}){
 const c=entry.control;if(!c)return;
 if(c.spawnPendingRelease){c.spawnPendingRelease=false;onUnperch?.(entry);}
 stepAdultHover(entry,now,onUnperch);
 if(stepPerchLanding(entry,now))onStateChange?.(entry,c.state,c.state);
 c.arrivedThisFrame=false;
 // Movement runs independently of EvaluateAI. It does not choose a gameplay state.
 if(c.route.length&&['Dragging','ConsumingWaypoints','FlyToLocation'].includes(c.state)){
  stepFlight(c,entry.perch,dt,(c.migrationTarget?NATIVE_FLIGHT.migrationSpeed:NATIVE_FLIGHT.dragSpeed)*c.speedScalar,false);
  if(c.movingSpeed>0)c.dragHasMoved=true;
  if(!c.route.length){
   c.arrivedThisFrame=true;
   if(c.migrationTarget){
    const wasPerchApproach=Boolean(c.destinationPerch);
    c.migrationTarget=null;
    if(c.stage1&&c.destinationPerch){
     const perch=c.destinationPerch;delete c.stage1;
     if(!queuePerchApproach(c,perch))c.destinationPerch=null;
    }else{
     // A rejected/corrected route must not reserve a perch the actor never reached.
     const target=c.perchApproachTarget??(c.destinationPerch?{x:c.destinationPerch.XPos,y:c.destinationPerch.YPos}:null);
     if(c.destinationPerch&&target&&Math.hypot(c.x-target.x,c.y-target.y)>.001)c.destinationPerch=null;
     if(!wasPerchApproach){
      const perch=chooseFreePerch(entry,entries,perches,reserved,random);
      if(perch&&Math.hypot(c.x-perch.XPos,c.y-perch.YPos)<=NATIVE_DRAGON_STATE.snapToPerchDistance){
       const target={x:perch.XPos,y:perch.YPos};
       if(!c.bounds||c.bounds.accept(target,c.skeletonID,c.colliderPose??'Fly')){c.destinationPerch=perch;if(!queuePerchApproach(c,perch))c.destinationPerch=null;}
      }
     }
    }
   }
  }
 }
 if(c.state==='ConsumingWaypoints'&&!c.route.length)c.dragRouteActive=false;
 if(c.disableAI)return;
 if(c.state==='ConsumingWaypoints'&&!c.route.length&&!c.checkedDragDestination){
  c.checkedDragDestination=true;
  const final=c.finalDragDestination;
  if(final&&Math.hypot(c.x-final.x,c.y-final.y)<=NATIVE_DRAGON_STATE.finalDragDistance){
   const perch=chooseFreePerch(entry,entries,perches,reserved,random);
   if(perch&&Math.hypot(c.x-perch.XPos,c.y-perch.YPos)<=NATIVE_DRAGON_STATE.snapToPerchDistance){
    const target={x:perch.XPos,y:perch.YPos};
    if(!c.bounds||c.bounds.accept(target,c.skeletonID,c.colliderPose??'Fly')){c.destinationPerch=perch;c.approachTarget=target;}
   }
  }
 }
 // The native delayed callback only clears takeoff while still in PreHover.
 if(c.state==='PreHover'&&now>=c.takeoffUntil)c.takeOff=false;
 const state=c.state,parameters={targetLocation:Boolean(c.migrationTarget),touchesDown:Boolean(c.touchesDown),waypointsRemaining:c.route.length>0,targetEgg:Boolean(c.targetEgg),targetFuse:Boolean(c.targetFuse),targetPerch:Boolean(c.destinationPerch),timeRemaining:(c.perchUntil-now)/1000>NATIVE_DRAGON_STATE.timerThreshold,takeOff:Boolean(c.takeOff),readyToHarvest:Boolean(c.readyToHarvest),missioning:Boolean(c.missioning)};
 const next=nextDragonState(state,parameters);
 if(next!==state){
  if(state==='Perching'){
   delete c.perchAnimation;
   delete c.landingMotion;if(next!=='Dragging')entry.item.ZPos=Math.fround(NATIVE_DRAGON_STATE.cruiseZRange[0]+random()*(NATIVE_DRAGON_STATE.cruiseZRange[1]-NATIVE_DRAGON_STATE.cruiseZRange[0]));c.destinationPerch=null;onUnperch?.(entry);
  }
  if(!['Dragging','ConsumingWaypoints'].includes(next))c.dragRouteActive=false;
  c.state=next;
  if(next==='PreHover'){preHover(c,now,random);playAdultHover(entry,now);if(state!=='Perching')onUnperch?.(entry);}
  else if(next==='Hover')c.takeOff=true;
  else if(next==='FlyToLocation'){
   c.takeOff=true;
   if(c.approachTarget){delete c.approachTarget;if(!queuePerchApproach(c,c.destinationPerch))c.destinationPerch=null;}
  }
  else if(next==='Dragging'){
   c.takeOff=true;c.route=[];c.migrationTarget=null;c.destinationPerch=null;c.approachTarget=null;c.perchApproachTarget=null;delete c.stage1;
   c.pendingInput=null;c.inputInitialized=false;c.lastInput=null;c.finalDragDestination=null;c.checkedDragDestination=false;
   c.holdPose=c.animationName??entry.live?.state.getCurrent(0)?.animation?.name??'Hover';c.dragHasMoved=false;c.movingSpeed=0;
   delete c.hoverMotion;delete c.landingMotion;delete c.perchApproachTarget;delete c.guidedFlight;delete c.hoverUntil;delete c.takeoffUntil;
   if(c.currentAngle==null)stepHeading(c,-(Math.sign(entry.item.scaleX)||1),0,0,false);
   onUnperch?.(entry);
  }
  else if(next==='Perching'){
   c.perchedAt=now;c.perchUntil=now+integer(...NATIVE_FLIGHT.perchWait,random)*1000;
   beginPerchLanding(entry,now,dt);startPerchAnimation(c,now,random);
   onPerch?.(entry.actorId,entry.perch.GUID);
  }
  onStateChange?.(entry,state,next);return;
 }
 if(state==='Perching'){stepPerchAnimation(entry,now,random);facePerch(c,entry.perch,dt);return;}
 // Native OnUpdatePreHover: a harvest-ready dragon seeks a free perch instead
 // of waiting indefinitely for the Hover transition (which harvest blocks).
 if(state==='PreHover'&&c.readyToHarvest){
  if(!c.destinationPerch&&c.takeOff&&!c.migrationTarget){
   const destination=chooseFreePerch(entry,entries,perches,reserved,random);
   if(destination)migrateToPerch(c,destination);
   c.takeOff=false;
  }else{
   if(c.destinationPerch){c.destinationPerch=null;c.migrationTarget=null;delete c.stage1;delete c.perchApproachTarget;onUnperch?.(entry);}
   if(!c.takeOff&&!c.destinationPerch&&!c.migrationTarget)c.takeOff=true;
  }
  return;
 }
 if(state==='PreHover'||state==='Hover'){
  if(!c.route.length)stepFlight(c,entry.perch,dt,undefined,false);
  if(state!=='Hover'||now<c.hoverUntil)return;
  const choice=integer(...NATIVE_FLIGHT.policyRoll,random);
  let destination=null,target;
  if(choice>NATIVE_FLIGHT.randomThreshold&&rooms.length){const room=rooms[integer(0,rooms.length,random)];target={x:room.XPos,y:room.YPos};}
  else{destination=chooseFreePerch(entry,entries,perches,reserved,random,choice>NATIVE_FLIGHT.nearestThreshold);if(destination)target={x:destination.XPos,y:destination.YPos};}
  if(!target)return;
  c.route=[];
  if(destination){
   if(!migrateToPerch(c,destination))return;
  }
  else{delete c.perchApproachTarget;if(!startType1Migration(c,target))return;c.destinationPerch=null;}
  // OnUpdateHover queues a command; EvaluateAI transitions on the following tick.
 }
}
