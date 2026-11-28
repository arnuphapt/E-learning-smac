import {NATIVE_HOVER} from './generated/native-hover.mjs';
import {NATIVE_PERCH} from './generated/native-perch.mjs';
import {stepHeading} from './dragon-heading.mjs';
import {guidedRoute,beginGuidedFlight} from './native-guided-flight.mjs';
import {NATIVE_FLIGHT} from './generated/native-flight.mjs';

export function perchFinalPosition(control,perch){
 const [x,y]=NATIVE_HOVER.skeletons[control.skeletonID??0].perchOffset;
 return {x:perch.XPos+x*(Math.sign(perch.scaleX)||1),y:perch.YPos+y};
}
export function perchApproach(control,perch){
 const final=perchFinalPosition(control,perch),sign=Math.sign(perch.scaleX)||1;
 const same=(control.orientation??1)===sign,drop={x:final.x,y:final.y+(same?NATIVE_PERCH.sameSignHeight:NATIVE_PERCH.differentSignHeight)};
 if(same){const s=(control.x-drop.x<0)?-1:1;return s===sign?[{x:control.x,y:control.y},drop]:[{x:control.x,y:control.y},{x:control.x,y:drop.y}];}
 const way=control.currentAngle!=null?{x:drop.x+Math.cos(control.currentAngle-Math.PI)*NATIVE_PERCH.wayDistance,y:drop.y+Math.sin(control.currentAngle-Math.PI)*NATIVE_PERCH.wayDistance}:drop;
 return [{x:control.x,y:control.y},way,drop];
}
export function queuePerchApproach(control,perch){
 const anchors=perchApproach(control,perch),last=anchors.at(-1),points=guidedRoute(anchors);
 const final=perchFinalPosition(control,perch),pose=perch.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle';
 if(control.bounds&&(!control.bounds.contains(final,control.skeletonID,pose)||points.some(p=>!control.bounds.contains(p,control.skeletonID,'Fly')||!control.bounds.accept(p,control.skeletonID,'Fly'))))return false;
 delete control.hoverMotion;
 beginGuidedFlight(control,points,NATIVE_FLIGHT.migrationSpeed*control.speedScalar);
 control.target={...last};control.lastInput={...last};control.migrationTarget={...last};control.destinationPerch=perch;control.perchApproachTarget={...last};
 return true;
}
export function beginPerchLanding(entry,now,dt=0){
 const c=entry.control,p=c.destinationPerch,final=perchFinalPosition(c,p);
 delete c.hoverMotion;
 c.movingSpeed=0;c.holdPose=null;
 c.landingMotion={startedAt:now,fromX:c.x,fromY:c.y,fromZ:entry.item.ZPos,toX:final.x,toY:final.y,toZ:p.ZPos};
 entry.perch=p;
 facePerch(c,p,dt);
}
export function stepPerchLanding(entry,now){
 const c=entry.control,m=c?.landingMotion;if(!m)return;
 const t=Math.max(0,Math.min(1,(now-m.startedAt)/(NATIVE_PERCH.flyDownSeconds*1000))),k=t*t;
 c.x=m.fromX+(m.toX-m.fromX)*k;c.y=m.fromY+(m.toY-m.fromY)*k;entry.item.ZPos=m.fromZ+(m.toZ-m.fromZ)*k;
 if(t===1){entry.item.LayerID=entry.perch.LayerID;delete c.landingMotion;}
 return true;
}
export function facePerch(control,perch,dt){stepHeading(control,-(Math.sign(perch.scaleX)||1),0,dt,false);}
