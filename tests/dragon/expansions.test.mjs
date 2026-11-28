import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {createExpansions,nearestExpansionRoom,expansionFlightBounds,expansionScore} from '../../lib/dragon/expansions.mjs';
import {createWallet,WALLET_KEY} from '../../lib/dragon/wallet.mjs';import {createHatchery} from '../../lib/dragon/hatchery.mjs';import {expansionAppearance} from '../../lib/dragon/expansion-renderer.mjs';
const source=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/expansions.json',import.meta.url))),map=JSON.parse(fs.readFileSync(new URL('../../public/dragon/data/source-map.json',import.meta.url))),catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url)));
function fixture(hatcherySave=null){const records=new Map();let fail=false,writes=0;const storage={getItem:k=>records.get(k)??null,setItem(k,v){if(fail)throw Error('Quota exceeded');writes++;records.set(k,v);}},wallet=createWallet({storage,chopCosts:source.costs});wallet.credit('SC',1e9);const model=createExpansions({source,wallet,map,hatcherySave,now:()=>1000});return {storage,wallet,model,records,get writes(){return writes;},set fail(v){fail=v;}};}
test('fresh forest has an accessible starter nursery, food, and a perch without spending gems',()=>{
 const f=fixture(),slots=map.MapItemData.filter(i=>i.SymbolID==='Egg_Slot'),perches=map.MapItemData.filter(i=>i.SymbolID.startsWith('PerchMarker')),manifest=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/manifest.json',import.meta.url)));
 assert(slots.some(s=>f.model.isSlotOpen(s)));assert(perches.some(p=>f.model.isPointOpen(p)));assert(manifest.fruitBushes.some(b=>f.model.isPointOpen(b.item)));assert.equal(f.wallet.getSnapshot().HC,50);
 const hatchery=createHatchery({catalog,map,storage:f.storage,expansions:f.model,now:()=>1000,random:()=>0});assert(hatchery.getSnapshot().capacity<slots.length);const egg=hatchery.summon();assert(f.model.isSlotOpen(map.MapItemData.find(i=>i.GUID===egg.slotGUID)));
});
test('five atomic purchases consume the source cost sequence and open primary plus secondary rooms',()=>{
 const f=fixture(),room=f.model.getSnapshot().active[0],o=source.orders.find(o=>o.roomID===room),before=f.wallet.getSnapshot().SC,writes=f.writes;
 for(let i=0;i<5;i++){f.model.chop(room);assert.equal(f.model.getSnapshot().chops[room],i+1);assert.equal(f.model.isRoomOpen(room),i===4);}
 assert.equal(f.writes-writes,5);assert.equal(before-f.wallet.getSnapshot().SC,source.costs.slice(0,5).reduce((a,b)=>a+b));assert(source.orders.filter(r=>r.set===o.set&&r.order===o.order).every(r=>f.model.getSnapshot().open.includes(r.roomID)));assert(!f.model.getSnapshot().active.includes(room));assert.throws(()=>f.model.chop(room));
});
test('finishing set one activates sets two to five independently',()=>{
 const f=fixture();for(let i=0;i<source.orders.filter(o=>o.set==='1'&&o.primary).length;i++){const id=f.model.getSnapshot().active.find(id=>source.orders.find(o=>o.roomID===id).set==='1');if(!id)break;for(let n=0;n<5;n++)f.model.chop(id);}
 assert.deepEqual(f.model.getSnapshot().active.map(id=>source.orders.find(o=>o.roomID===id).set).sort(),['2','3','4','5']);
});
test('gems pay the native rounded conversion, and failed or unaffordable writes lose neither money nor chops',()=>{
 const f=fixture();assert(!f.model.getSnapshot().hcAvailable);assert.throws(()=>f.model.chop(f.model.getSnapshot().active[0],'HC'));while(!f.model.getSnapshot().hcAvailable){const id=f.model.getSnapshot().active[0];for(let n=0;n<5;n++)f.model.chop(id);}const id=f.model.getSnapshot().active[0],cost=f.model.quote('HC');f.model.chop(id,'HC');assert.equal(f.wallet.getSnapshot().HC,50-cost);
 const raw=f.records.get(WALLET_KEY),state=f.model.getSnapshot(),money=f.wallet.getSnapshot();f.fail=true;assert.throws(()=>f.model.chop(id));assert.equal(f.records.get(WALLET_KEY),raw);assert.deepEqual(f.model.getSnapshot(),state);assert.deepEqual(f.wallet.getSnapshot(),money);f.fail=false;
 f.wallet.spend('SC',money.SC);const state2=f.model.getSnapshot();assert.throws(()=>f.model.chop(id));assert.deepEqual(f.model.getSnapshot(),state2);assert.throws(()=>f.model.chop(id,'invalid'));
});
test('reload, another wallet instance, and gold exchange retain fog progress',()=>{
 const f=fixture(),secondWallet=createWallet({storage:f.storage}),other=createExpansions({source,wallet:secondWallet,map}),id=f.model.getSnapshot().active[0];f.model.chop(id);other.chop(id);f.wallet.refresh();assert.equal(f.model.getSnapshot().chops[id],2);f.wallet.exchangeGold(1);f.wallet.credit('SC',10);assert.equal(f.model.getSnapshot().chops[id],2);assert.deepEqual(createExpansions({source,wallet:createWallet({storage:f.storage}),map}).getSnapshot(),f.model.getSnapshot());
});
test('legacy occupied rooms, flight positions and connecting corridors survive migration',()=>{
 const slot=map.MapItemData.find(i=>i.SymbolID==='Egg_Slot'),perch=map.MapItemData.find(i=>i.SymbolID==='PerchMarker_Branch'),save={babies:[{slotGUID:slot.GUID}],adults:[{originSlotGUID:slot.GUID,perchGUID:perch.GUID,flightPosition:{x:3.5,y:-10.16}}]},f=fixture(save);
 for(const p of [slot,perch,save.adults[0].flightPosition])assert(f.model.isPointOpen(p));assert(f.model.getSnapshot().scoreOpen.includes('ScoreUnlockLayer_3'));
});
test('score gates use 150/300/500/550 and retain highest levels without farming duplicate dragons',{todo:'Species cut to S001-S003 (11 species -> max score 600 vs 1200; spec: จำกัดสายพันธุ์)'},()=>{
 const f=fixture(),species=catalog.species.filter(s=>s.rarity==='Common').slice(0,10),save={maturedSpecies:species.map(s=>s.id),adults:species.map((s,i)=>({id:'a'+i,speciesId:s.id,level:5}))};
 assert.equal(expansionScore(source,{adults:[{speciesId:species[0].id,level:5}]},catalog).score,120);
 f.model.syncScore(save,catalog);assert.equal(f.model.getSnapshot().score,1200);assert.equal(f.model.getSnapshot().scoreOpen.length,4);assert(source.orders.filter(o=>['Gacha','Mission','MiniEvent'].includes(o.set)).every(o=>f.model.isRoomOpen(o.roomID)));const original=f.model.getSnapshot();f.model.syncScore({...save,adults:[...save.adults,...save.adults]},catalog);assert.deepEqual(f.model.getSnapshot(),original);f.model.syncScore({adults:[],maturedSpecies:[]},catalog);assert.equal(f.model.getSnapshot().score,1200);
 const gates=source.scoreGates.map(g=>g.score).sort((a,b)=>a-b);assert.deepEqual(gates,[150,300,500,550]);
});
test('score gated fog stays independent of regular room payments',()=>{
 const f=fixture(),gate=source.scoreGates.find(g=>g.layer==='ScoreUnlockLayer_3'),id=source.orders.find(o=>o.set==='Mission').roomID;assert(!f.model.isRoomOpen(id));assert.throws(()=>f.model.chop(id));assert.equal(expansionAppearance({expansionScoreLayer:gate.layer},f.model.getSnapshot(),source,10000).hidden,false);
});
test('closed points, targets and crossing segments are rejected; cleared fog fades across reload',()=>{
 const f=fixture(),closed=source.rooms.find(r=>!f.model.isRoomOpen(r.id)),open=source.rooms.find(r=>f.model.isRoomOpen(r.id)),base={contains:()=>true,accept:p=>({point:p}),movement:(_a,b)=>({point:b})},bounds=expansionFlightBounds(base,f.model);
 assert(!bounds.contains(closed));assert.equal(bounds.accept(closed),null);assert(bounds.contains(open));assert.deepEqual(bounds.movement(open,closed),{point:open,skipNode:true});
 const id=f.model.getSnapshot().active[0];for(let i=0;i<5;i++)f.model.chop(id);const entry={expansionRoomID:id};assert.equal(expansionAppearance(entry,f.model.getSnapshot(),source,1250).alpha,.5);assert(expansionAppearance(entry,f.model.getSnapshot(),source,2001).hidden);assert.equal(nearestExpansionRoom(source,source.rooms[0]).id,source.rooms[0].id);
});
test('corrupt fog save remains untouched and cannot debit the wallet',()=>{
 const f=fixture(),raw=JSON.parse(f.records.get(WALLET_KEY));raw.expansions.open.push('unknown-room');const broken=JSON.stringify(raw);f.records.set(WALLET_KEY,broken);assert.throws(()=>createExpansions({source,wallet:createWallet({storage:f.storage}),map}));assert.equal(f.records.get(WALLET_KEY),broken);
});
