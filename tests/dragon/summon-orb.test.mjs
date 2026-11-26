import test from 'node:test';import assert from 'node:assert/strict';
import {summonOrbPose,orbGrowthStart,orbFinishing,quadraticInOut,quinticInOut} from '../../lib/dragon/summon-orb-motion.mjs';
import {updateCastDecoration} from '../../lib/dragon/summon-effects.mjs';
const active={id:'orb',phase:'summoning',summonAt:10000,summonDoneAt:16800,appearanceAt:16800},pose=seconds=>summonOrbPose(active,active.summonAt+seconds*1000),near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('native orb uses multiplicative 1.25 growth and does not restart an alpha fade on Summon',()=>{
 near(pose(0).scale,1);near(pose(0).alpha,1);near(pose(orbGrowthStart(0,active)+.3).scale,1.25);near(pose(orbGrowthStart(1,active)+.3).scale,1.25**2);near(pose(5.9).scale,1.25**3);
 for(let t=0;t<9;t+=.01)assert(pose(t).scale<=1.25**3+1e-7,'no invented 2.4x expansion');
 near(quadraticInOut(.25),.125);near(quinticInOut(.25),.015625);
});
test('orb rises 1.25 units before egg spawn and shrinks after spawn with Quintic.InOut',()=>{
 near(pose(6.05).lift,0);near(pose(6.425).lift,.625);near(pose(6.8).lift,1.25);near(pose(6.8).scale,1.25**3);near(pose(7.05).scale,1.25**3);near(pose(7.55).scale,1.25**3/2);near(pose(8.05).scale,0);
 near(pose(6.425).vortexAlpha,.5);near(pose(6.8).vortexAlpha,1);near(pose(7.55).vortexAlpha,.5);near(pose(8.05).vortexAlpha,0);
});
test('saved egg time anchors the final native callbacks and a reload in arrival preserves the tail',()=>{
 const arriving={...active,phase:'arriving'};assert(orbFinishing(arriving,17550));assert(!orbFinishing(arriving,18050));assert.deepEqual(summonOrbPose(arriving,17550),summonOrbPose(JSON.parse(JSON.stringify(arriving)),17550));
 const longer={...active,summonDoneAt:20000,appearanceAt:20000};near(summonOrbPose(longer,20000).lift,1.25);near(summonOrbPose(longer,20750).scale,1.25**3/2);
});
test('vortex remains active in egg arrival and updates at sub-30-fps intervals',()=>{
 const e={kind:'summon-vortex',mesh:{shader:{uniforms:{_TimeParameters:[0],uOpacity:0,uRoll:0}}},item:{},lastEffectFrame:-1},arriving={...active,phase:'arriving'};
 assert(updateCastDecoration(e,{active:arriving,assets:{anchor:{}},now:17550,dev:false}));near(e.mesh.shader.uniforms.uOpacity,.5);
 assert(updateCastDecoration(e,{active:arriving,assets:{anchor:{}},now:17551,dev:false}));assert(e.mesh.shader.uniforms.uOpacity<.5);
});
