import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {babyReticlePosition,babyReticleFrame} from '../../lib/dragon/baby-reticle.mjs';
import {attentionState,isBabyReticleVisible,RETICLE_SPEC} from '../../lib/dragon/reticle.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../../../_ref/hatch-dragons-base/reference/observations/baby-native-1.6.3/proof.json',import.meta.url)));
test('ready ring uses native parent offset, independent of species mesh size and idle pose',()=>{
 const baby={item:{XPos:10,YPos:20,scaleX:-1.05,scaleY:1.05},species:{babyScale:1.05},parts:[]};
 assert.deepEqual(babyReticlePosition(baby),{x:10,y:21});assert.deepEqual(babyReticleFrame(baby),{scaleX:-1,scaleY:1,rotation:0});
 baby.parts=[{vertices:[-100,-100,100,100]}];assert.deepEqual(babyReticlePosition(baby),{x:10,y:21});
 baby.item.rotation=90;const p=babyReticlePosition(baby);assert(Math.abs(p.x-9)<1e-10);assert(Math.abs(p.y-20)<1e-10);
});
test('attention timing matches recovered native call arguments and linear max-to-min pulse',()=>{
 const cfg=RETICLE_SPEC.targetCircle;for(const k of ['delay','scaleDuration','fadeDuration','alphaIn','alphaOut','minScale','maxScale'])assert.equal(cfg[k],proof.reticle[k]);
 for(const [t,alpha,scale] of [[0,0,1.5],[.999,0,1.5],[1,0,1.5],[1.125,.5,1.4375],[1.25,1,1.375],[1.5,1,1.25],[1.875,.5,1.0625],[2,0,1.5],[3.25,1,1.375]]){const s=attentionState(t);assert.equal(s.alpha,alpha);assert.equal(s.scale,scale);}
});
test('ring appears only when ready and disappears immediately when maturation begins',()=>{
 const baby={growth:{feeds:5,fedAt:0,eatDoneAt:1,digestUntil:2,readyAt:3}};
 assert.equal(isBabyReticleVisible(baby,2),false);assert.equal(isBabyReticleVisible(baby,3),true);assert.equal(isBabyReticleVisible(baby,3,true),false);
 baby.maturing={startedAt:3,doneAt:4};assert.equal(isBabyReticleVisible(baby,3),false);
});
