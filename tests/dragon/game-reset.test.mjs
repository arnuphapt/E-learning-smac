import test from 'node:test';
import assert from 'node:assert/strict';
import {resetGameDataOnce,GAME_RESET_KEY,GAME_RESET_REVISION} from '../../lib/dragon/game-reset.mjs';
function storage(entries={}){const values=new Map(Object.entries(entries));return {get length(){return values.size;},key:i=>[...values.keys()][i]??null,getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};}
test('requested reset removes current/legacy game saves, wallet, berries and local map edits while preserving unrelated storage',()=>{
 const local=storage({'dragon-base:hatchery:v1':'old','dragon-base:hatchery:v2':'three adults','dragon-base:wallet:v1':'wallet','dragon-base:berries:v2':'berries','hatch-dragons-layout:v1:map':'edited','unrelated':'keep'}),session=storage({'dragon-base:session':'remove','unrelated':'keep'});
 assert.equal(resetGameDataOnce(local,session),true);assert.equal(local.length,2);assert.equal(local.getItem('unrelated'),'keep');assert.equal(local.getItem(GAME_RESET_KEY),GAME_RESET_REVISION);assert.equal(session.length,1);
});
test('new game progress survives every reload after the one requested reset',()=>{
 const local=storage();resetGameDataOnce(local);local.setItem('dragon-base:hatchery:v2','new progress');assert.equal(resetGameDataOnce(local),false);assert.equal(local.getItem('dragon-base:hatchery:v2'),'new progress');
});
test('a failed reset does not record completion, allowing retry',()=>{
 const local=storage({'dragon-base:hatchery:v2':'old'}),remove=local.removeItem;local.removeItem=()=>{throw Error('storage unavailable');};assert.throws(()=>resetGameDataOnce(local),/storage unavailable/);assert.equal(local.getItem(GAME_RESET_KEY),null);local.removeItem=remove;assert.equal(resetGameDataOnce(local),true);
});
