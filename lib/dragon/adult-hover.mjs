import {NATIVE_HOVER} from './generated/native-hover.mjs';

// Harvest / OnTouchExit both call PlayHoverRoutine. Its guard is the current
// animation command, so a second tap cannot restart the clip or add another lift.
export function playAdultHover(entry,now){
 const c=entry.control;if(!c)return false;
 const previous=c.animationName??entry.live?.state.getCurrent(0)?.animation?.name;
 if(previous==='Hover')return false;
 delete c.hoverMotion;
 c.holdPose='Hover';c.movingSpeed=0;c.colliderPose='Hover';
 c.animationName='Hover';c.animationStartedAt=now;
 // Native excludes Fly from StartFlyUpRoutine, because its root is airborne.
 if(previous&&previous!=='Fly'){
  const [x,y]=NATIVE_HOVER.skeletons[c.skeletonID??0].spawnOffset;
  c.hoverMotion={startedAt:now,fromX:c.x,fromY:c.y,toX:c.x+x*((c.orientation??1)<0?-1:1),toY:c.y+NATIVE_HOVER.flyUpScalar+y};
 }
 return true;
}

export function stepAdultHover(entry,now,onUnperch){
 const c=entry.control,m=c?.hoverMotion;if(!m)return;
 const t=Math.max(0,Math.min(1,(now-m.startedAt)/(NATIVE_HOVER.flyUpSeconds*1000))),k=t*(2-t);
 c.x=m.fromX+(m.toX-m.fromX)*k;c.y=m.fromY+(m.toY-m.fromY)*k;
 if(t===1){delete c.hoverMotion;onUnperch?.(entry);}
}
