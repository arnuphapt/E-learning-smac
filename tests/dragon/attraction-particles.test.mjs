import test from 'node:test';import assert from 'node:assert/strict';
import {integratedVelocity,attractionParticlePoint,attractionParticleStates,attractionHeadRotation} from '../../lib/dragon/attraction-particles.mjs';
import {NATIVE_ATTRACTION_PARTICLES as native} from '../../lib/dragon/generated/native-attraction-particles.mjs';
import {nativeCurve,nativeGradient} from '../../lib/dragon/egg-streak.mjs';
import {particleTrailArc} from '../../lib/dragon/beam-ribbon.mjs';
import {summonOrbPose} from '../../lib/dragon/summon-orb-motion.mjs';
import {setSummonOrbNoise} from '../../lib/dragon/summon-shaders.mjs';
const near=(a,b,eps=1e-6)=>assert(Math.abs(a-b)<eps,`${a} != ${b}`);

test('three native particle paths retain different delays, velocities and speed modifiers',()=>{
 const [left,middle,right]=native.emitters;
 assert.deepEqual(native.emitters.map(e=>e.delay),[0,.5,1.3]);assert.deepEqual(native.emitters.map(e=>e.speedModifier),[1.2,1.5,-1.2]);
 near(attractionParticlePoint(left,.75).x,.23);near(attractionParticlePoint(right,.75).x,-.06);near(attractionParticlePoint(middle,.75).y,-2.25);
 assert(attractionParticlePoint(left,.2).y>left.pose.y);assert(attractionParticlePoint(right,.2).y<right.pose.y);
 assert(attractionParticlePoint(middle,.2).x>0);
});

test('analytic integration agrees with independent midpoint integration of all source Hermite curves',()=>{
 for(const e of native.emitters)for(const axis of ['x','y','z'])for(const age of [.073,.28,.51,.749]){
  const curve=e.velocity[axis],steps=6000,dt=age/steps;let sum=0;
  for(let i=0;i<steps;i++)sum+=nativeCurve(curve.keys,(i+.5)*dt/e.lifetime)*curve.scalar*dt;
  near(integratedVelocity(curve,age,e.lifetime),sum,1e-7);
 }
});

test('emission waits for rate accumulation, stops new births, and lets living trails finish at their source lifetime',()=>{
 const born=1/.6;
 assert.deepEqual(attractionParticleStates(born-.001),[]);
 const first=attractionParticleStates(born+.1);assert.equal(first[0].index,0);near(first[0].age,.1);
 assert(attractionParticleStates(born+.35,born+.1).some(p=>p.index===0),'stop does not freeze or instantly fade a living trail');
 assert.deepEqual(attractionParticleStates(born+1,born+.1),[]);
 assert(attractionParticleStates(3000).every(p=>p.age>=0&&p.age<p.emitter.lifetime),'large time jumps cannot replay expired particles');
});

test('summon lift fades the native noise multiplier and sine motion together without altering attraction orbs',()=>{
 const active={summonAt:10000,appearanceAt:16800,summonDoneAt:16800},mesh={shader:{uniforms:{_NoiseMultiplier:1,_SineDirection:[0,1]}}};
 near(summonOrbPose(active,16050).noise,1);near(summonOrbPose(active,16425).noise,.5);near(summonOrbPose(active,16800).noise,0);
 setSummonOrbNoise(mesh,.5);assert.equal(mesh.shader.uniforms._NoiseMultiplier,.5);assert.deepEqual(mesh.shader.uniforms._SineDirection,[0,.5]);
});

test('native trail vertices expire at 0.675s and use their own fade before the particle dies',()=>{
 for(const e of native.emitters){
  near(e.trail.lifetime*e.lifetime,.675);assert.equal(e.trail.textureMode,4);assert.equal(e.trail.inheritParticleColor,false);
  near(nativeGradient(e.trail.colorOverLifetime,.8)[3],1);near(nativeGradient(e.trail.colorOverLifetime,.95)[3],.25);near(nativeGradient(e.trail.colorOverLifetime,1)[3],0);
 }
});

test('Static trail UV distance retains birth history when its tail is trimmed',()=>{
 const distance=particleTrailArc(t=>({x:3*t,y:4*t}),.75);
 // At age .72, the last .675 seconds remain: the tail starts at age .045.
 // Its U coordinate must retain .225 world units rather than restarting at zero.
 near(distance(.72-.675),.225);near(distance(.72),3.6);near(distance(.72)-distance(.72-.675),3.375);
 const circular=particleTrailArc(t=>({x:Math.cos(t*2),y:Math.sin(t*2)}),.75);
 near(circular(.5),1,3e-6);
});

test('particle heads integrate the authored angular velocity and use start color rather than unused material tint',()=>{
 for(const e of native.emitters){
  assert.equal(e.head.shader,'Mobile/Particles/Alpha Blended');assert.deepEqual(e.head.color,[0,.9884035,1,1]);assert.notDeepEqual(e.head.color,e.head.ignoredMaterialTint);
  for(const age of [.05,.2,.4,.6,.73]){let expected=e.head.initialRotation;const steps=4000,dt=age/steps;
   for(let i=0;i<steps;i++)expected+=nativeCurve(e.head.rotation.keys,(i+.5)*dt/e.lifetime)*e.head.rotation.scalar*dt;
   near(attractionHeadRotation(e,age),-expected,1e-7);
  }
  assert(Math.abs(attractionHeadRotation(e,.2))>.05,'head must rotate during flight');near(attractionHeadRotation(e,0),0);
 }
});

test('head rotation and particle position use the same reflected Y coordinate system',()=>{
 const e={lifetime:1,head:{initialRotation:0,rotation:{mode:0,scalar:Math.PI/2,keys:[]}}};
 // A native +90 degree rotation sends +X to +Y. In screen coordinates that is up.
 const angle=attractionHeadRotation(e,1);near(Math.cos(angle),0);near(Math.sin(angle),-1);
});
