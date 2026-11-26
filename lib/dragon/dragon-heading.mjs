import {NATIVE_BOUNDARY} from './generated/native-boundary.mjs';
import {NATIVE_FLIGHT as source} from './generated/native-flight.mjs';
// Port of SwitchDisplay, ViewForAngle, UpdateRPS and UpdateRotation.
// Native scale is reflected on local Y, then rotated in world space.
export function headingForAngle(angle){
 angle=Math.fround(angle);
 const view=source.views.find(v=>v.threshold<=angle)??source.views.at(-1);
 let basis=view.threshold;
 if(view.orientation<1)basis-=source.rotationHalfPi;
 else if(angle>0)basis+=source.rotationHalfPi;
 return {view:view.view,orientation:view.orientation,rotation:-(angle-basis)*source.radiansToDegrees,angle};
}
export function stepHeading(control,dx,dy,dt,updateRps=true){
 if(Math.fround(Math.fround(dx*dx)+Math.fround(dy*dy))<NATIVE_BOUNDARY.nearZeroSquared)return;
 const f=Math.fround,target=f(f(Math.atan2(f(dy),f(dx)))+source.pi);
 if(control.currentAngle==null){control.currentAngle=target;control.rps=source.initialRps;}
 let current=f(control.currentAngle);
 if(Math.abs(target-current)>=1||!updateRps)control.rps=source.initialRps;
 const maximum=f(f(control.rps*source.tau)*f(dt));
 let delta=f(target-current);
 if(Math.abs(delta)>source.pi)delta=f(delta+(target>source.pi?-source.tau:source.tau));
 const turn=Math.abs(delta)>maximum?Math.sign(delta):0;
 current=turn?f(current+turn*maximum):target;
 // These branches intentionally preserve the native endpoint snap at 0 / 2pi.
 if(current<0)current=source.tau;else if(current>source.tau)current=0;
 if(updateRps&&((target>source.pi&&target<source.rpsQuadrantBoundary)||(target>0&&target<source.rotationHalfPi))){
  if(turn===1||turn===0)control.rps=source.slowRps;else if(turn===-1)control.rps=source.normalRps;
 }
 if(updateRps&&((target>source.rotationHalfPi&&target<source.pi)||(target<source.tau&&target>source.rpsQuadrantBoundary))){
  if(turn===0||turn===-1)control.rps=source.slowRps;else if(turn===1)control.rps=source.normalRps;
 }
 control.currentAngle=current;
 Object.assign(control,headingForAngle(f(current-source.pi)));
}
