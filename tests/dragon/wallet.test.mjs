import test from 'node:test';
import assert from 'node:assert/strict';
import {createWallet,WALLET_KEY} from '../../lib/dragon/wallet.mjs';

function stubStorage(initial={}){
 const map=new Map(Object.entries(initial));let writes=0;
 return {map,get writes(){return writes;},getItem:k=>map.get(k)??null,setItem:(k,v)=>{writes++;map.set(k,v);}};
}

test('new save starts at 0 SC / 50 HC and persists',()=>{
 const storage=stubStorage(),w=createWallet({storage});
 assert.deepEqual(w.getSnapshot(),{SC:0,HC:50});
 assert.equal(Object.isFrozen(w.getSnapshot()),true);
 assert.equal(storage.getItem(WALLET_KEY),'{"version":1,"SC":0,"HC":50}');
 assert.deepEqual(createWallet({storage}).getSnapshot(),{SC:0,HC:50});
});

test('refresh observes another wallet instance without rewriting balances and rejects corrupt updates',()=>{
 const storage=stubStorage(),first=createWallet({storage}),second=createWallet({storage}),seen=[];
 first.subscribe(s=>seen.push(s));second.credit('SC',120);second.spend('HC',4);
 const writes=storage.writes;assert.deepEqual(first.refresh(),{SC:120,HC:46});assert.equal(storage.writes,writes);assert.equal(seen.length,1);first.refresh();assert.equal(seen.length,1);
 storage.setItem(WALLET_KEY,'broken');assert.throws(()=>first.refresh());assert.deepEqual(first.getSnapshot(),{SC:120,HC:46});assert.equal(storage.getItem(WALLET_KEY),'broken');
});

test('spend checks affordability, throws Thai error when short or invalid, and leaves balances unchanged',()=>{
 const storage=stubStorage(),w=createWallet({storage});
 assert.equal(w.canAfford('HC',50),true);assert.equal(w.canAfford('HC',51),false);assert.equal(w.canAfford('SC',1),false);
 assert.throws(()=>w.spend('SC',1,'test'),/SC.*ไม่พอ/);
 assert.throws(()=>w.spend('HC',51,'test'),/HC.*ไม่พอ/);
 assert.throws(()=>w.spend('SC',-1),/จำนวนเงินไม่ถูกต้อง/);
 assert.throws(()=>w.spend('SC',1.5),/จำนวนเงินไม่ถูกต้อง/);
 assert.throws(()=>w.spend('BAD',1),/สกุลเงินไม่ถูกต้อง/);
 assert.deepEqual(w.getSnapshot(),{SC:0,HC:50});
 w.spend('HC',10,'hurry');
 assert.deepEqual(w.getSnapshot(),{SC:0,HC:40});
});

test('credit and devGrant clamp at Number.MAX_SAFE_INTEGER',()=>{
 const storage=stubStorage(),w=createWallet({storage});
 w.credit('SC',Number.MAX_SAFE_INTEGER-5);
 assert.equal(w.getSnapshot().SC,Number.MAX_SAFE_INTEGER-5);
 w.devGrant('SC',100);
 assert.equal(w.getSnapshot().SC,Number.MAX_SAFE_INTEGER);
});

test('quoteGold and exchangeGold enforce min(HC, 200) and update both in one save',()=>{
 const storage=stubStorage(),w=createWallet({storage});
 assert.deepEqual(w.quoteGold(0),{HC:0,SC:0});
 assert.deepEqual(w.quoteGold(4),{HC:4,SC:100});
 assert.throws(()=>w.exchangeGold(0),/จำนวนเพชร/);
 assert.throws(()=>w.exchangeGold(51),/HC.*ไม่พอ/);
 const writesBefore=storage.writes;
 assert.deepEqual(w.exchangeGold(4),{HC:4,SC:100});
 assert.equal(storage.writes,writesBefore+1);
 assert.deepEqual(w.getSnapshot(),{SC:100,HC:46});
 w.devGrant('HC',204);
 assert.throws(()=>w.exchangeGold(201),/200 HC/);
 const beforeMax=storage.writes;
 assert.deepEqual(w.exchangeGold(200),{HC:200,SC:5000});
 assert.equal(storage.writes,beforeMax+1);
 assert.deepEqual(w.getSnapshot(),{SC:5100,HC:50});
});

test('corrupt save throws Thai error and preserves existing storage',()=>{
 const storage=stubStorage({[WALLET_KEY]:'broken'});
 assert.throws(()=>createWallet({storage}),/อ่านข้อมูลกระเป๋าเงิน/);
 assert.equal(storage.getItem(WALLET_KEY),'broken');
 storage.setItem(WALLET_KEY,JSON.stringify({version:1,SC:-1,HC:0}));
 assert.throws(()=>createWallet({storage}),/อ่านข้อมูลกระเป๋าเงิน/);
});

test('subscribe fires on change and stops after unsubscribe; private mode storage works in memory',()=>{
 const storage=stubStorage(),w=createWallet({storage}),seen=[];
 const stop=w.subscribe(s=>seen.push(s));
 w.credit('SC',10);w.spend('HC',5);stop();w.credit('SC',1);
 assert.deepEqual(seen,[{SC:10,HC:50},{SC:10,HC:45}]);
 const broken={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};
 const mem=createWallet({storage:broken});
 assert.deepEqual(mem.getSnapshot(),{SC:0,HC:50});
 assert.throws(()=>mem.credit('SC',10),/บันทึกกระเป๋าเงินไม่ได้/);
 assert.deepEqual(mem.getSnapshot(),{SC:0,HC:50});
});
