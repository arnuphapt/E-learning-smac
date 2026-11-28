import {NATIVE_ATTRACTION_PARTICLES} from './generated/native-attraction-particles.mjs';
// Exact integral of Unity's serialized Hermite velocity curves, in seconds.
export function integratedVelocity(curve,age,lifetime){
 const t=Math.max(0,Math.min(1,age/lifetime)),keys=curve.keys;
 if(curve.mode===0)return curve.scalar*t*lifetime;
 let sum=0;
 for(let i=1;i<keys.length;i++){
  const a=keys[i-1],b=keys[i],d=b.time-a.time,u=Math.max(0,Math.min(1,(t-a.time)/d));if(u<=0)break;
  const A=2*a.value-2*b.value+d*(a.outSlope+b.inSlope),B=-3*a.value+3*b.value-d*(2*a.outSlope+b.inSlope),C=d*a.outSlope;
  sum+=d*(A*u**4/4+B*u**3/3+C*u*u/2+a.value*u);
 }
 return sum*curve.scalar*lifetime;
}
export function attractionParticlePoint(emitter,age){
 const d=['x','y','z'].map(axis=>integratedVelocity(emitter.velocity[axis],age,emitter.lifetime)*emitter.speedModifier),b=emitter.pose.basis,p=emitter.pose;
 return {x:p.x+b[0]*d[0]+b[1]*d[1]+b[2]*d[2],y:p.y+b[3]*d[0]+b[4]*d[1]+b[5]*d[2]};
}
export function attractionHeadRotation(emitter,age){
 // Native particle coordinates use +Y up; the Pixi billboard uses +Y down.
 // Reflecting Y reverses the angular direction as well as the particle position.
 return -(emitter.head.initialRotation+integratedVelocity(emitter.head.rotation,age,emitter.lifetime));
}
// The ribbon ends at the billboard's center. Its last edge must share that
// billboard's transverse axis and span, including when the head rotates.
export function attractionHeadJoin(emitter,rotation){
 const horizontal=emitter.size>=emitter.sizeY,c=Math.cos(rotation),s=Math.sin(rotation);
 return {normal:horizontal?{x:-s,y:c}:{x:c,y:s},width:horizontal?emitter.sizeY:emitter.size,length:(horizontal?emitter.size:emitter.sizeY)*.5};
}
export function attractionParticleStates(elapsed,stopAt=Infinity){
 return NATIVE_ATTRACTION_PARTICLES.emitters.flatMap((emitter,index)=>{
  const last=Math.floor((Math.min(elapsed,stopAt)-emitter.delay)*emitter.rate+1e-9);
  if(last<1)return [];
  const born=emitter.delay+last/emitter.rate,age=elapsed-born;
  return age>=0&&age<emitter.lifetime?[{index,emitter,born,age,point:attractionParticlePoint(emitter,age)}]:[];
 });
}
