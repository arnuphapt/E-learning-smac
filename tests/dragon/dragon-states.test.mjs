import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {DRAGON_TRANSITIONS,DRAGON_TRANSITION_ORDER,nextDragonState} from '../../lib/dragon/dragon-states.mjs';
import {NATIVE_DRAGON_STATE} from '../../lib/dragon/generated/native-dragon-states.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../../../_ref/hatch-dragons-base/reference/observations/dragon-state-native-1.6.3/proof.json',import.meta.url)));
const flags=['targetLocation','touchesDown','waypointsRemaining','targetEgg','targetFuse','targetPerch','timeRemaining','takeOff','readyToHarvest','missioning'];
// Execute the small, bounded ARM leaf checks, independently of the JS predicates.
function nativeCheck(range,p){
 const code=Buffer.from(range.hex,'hex'),r=new Uint32Array(16);let pc=0,z=false;
 for(let n=0;n<100;n++){
  assert(pc>=0&&pc+4<=code.length,'branch stays inside recovered method');
  const word=code.readUInt32LE(pc),op=word&0x0fffffff,condition=word>>>28;pc+=4;
  assert([0,1,14].includes(condition),'supported ARM condition');
  if(condition===0&&!z||condition===1&&z)continue;
  if(op===0x012fff1e)return Boolean(r[0]);
  if((op&0x0ff00000)===0x05d00000){const offset=(word&4095)+r[word>>>16&15];assert(offset>=0x2f8&&offset<=0x301);r[word>>>12&15]=Number(Boolean(p[flags[offset-0x2f8]]));}
  else if((op&0x0ff00000)===0x03500000){assert.equal(word&4095,0);z=r[word>>>16&15]===0;}
  else if((op&0x0ff00000)===0x03a00000){assert((word&4095)<=1);r[word>>>12&15]=word&255;}
  else if(op===0x01a01000)r[1]=r[0];
  else if(op===0x016f0f10)r[0]=Math.clz32(r[0]);
  else if(op===0x01a002a0)r[0]>>>=5;
  else if((op&0x0f000000)===0x0a000000)pc+=4+((word<<8)>>6);
  else throw Error('Unsupported ARM word '+word.toString(16));
 }
 throw Error('ARM check did not return');
}
test('all 24 transition predicates match the original ARM checks for all 1024 flag combinations',()=>{
 for(const [from,to,check]of DRAGON_TRANSITIONS){
  const range=proof.ranges.find(r=>r.name===from+'To'+to+'Check');assert(range,from+' -> '+to);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(range.hex,'hex')).digest('hex'),range.sha256);
  for(let bits=0;bits<1024;bits++){const p=Object.fromEntries(flags.map((key,i)=>[key,Boolean(bits&(1<<i))]));assert.equal(Boolean(check(p)),nativeCheck(range,p),from+' -> '+to+' flags='+bits);}
 }
});
test('SetupFSM priority order is preserved when several checks are true',()=>{
 assert.deepEqual(DRAGON_TRANSITION_ORDER,proof.transitionOrder);
 const source=fs.readFileSync(new URL('../../../_ref/hatch-dragons-base/reference/observations/dragon-state-native-1.6.3/extra.c',import.meta.url),'utf8');
 const setup=source.slice(source.indexOf('// 0x16f4080')).split('\n// ')[0],orders={};let ids=[];
 const stateNames=['Dragging','Hover','FlyToLocation','Fusing','Perching','ConsumingWaypoints','PreHover','LayEgg','Missioning'];
 for(const match of setup.matchAll(/uVar5 = \*\(undefined4 \*\)\(iVar1 \+ (0x[\da-f]+|\d+)\);|func_0x017174b0\(iVar1,(\d+),iVar7/g)){
  if(match[1])ids.push((Number(match[1])-16)/4);else{orders[stateNames[Number(match[2])]]=ids;ids=[];}
 }
 assert.deepEqual(orders,DRAGON_TRANSITION_ORDER,'independent SetupFSM listing preserves native transition list order');
 assert.deepEqual(NATIVE_DRAGON_STATE,proof.settings);
 for(const range of proof.ranges)assert.equal(crypto.createHash('sha256').update(Buffer.from(range.hex,'hex')).digest('hex'),range.sha256);
 assert.equal(nextDragonState('PreHover',{targetLocation:true,takeOff:false,touchesDown:true}),'FlyToLocation');
 assert.equal(nextDragonState('FlyToLocation',{targetPerch:true,targetLocation:true,touchesDown:true,waypointsRemaining:true}),'Dragging');
 assert.equal(nextDragonState('ConsumingWaypoints',{targetPerch:true}),'FlyToLocation');
 assert.equal(nextDragonState('Perching',{timeRemaining:false,readyToHarvest:true}),'Perching');
});
