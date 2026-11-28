import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHatchery,HATCHERY_KEY,LEGACY_HATCHERY_KEY,roundHalfEven,nectarTargetForSpecies,adultWaitSeconds,adultCoinReward,isSpeciesDiscovered} from '../../lib/dragon/hatchery.mjs';import {eggNewSpeciesGlow,EGG_ARRIVAL_END_SECONDS,eggGlowStart} from '../../lib/dragon/egg-effects.mjs';import {dragonPanelTitle,UNDISCOVERED_DRAGON_TITLE} from '../../lib/dragon/hatchery-panel.mjs';import {createHatcheryRenderer} from '../../lib/dragon/hatchery-renderer.mjs';import {createWallet} from '../../lib/dragon/wallet.mjs';import {createBabyMoveController} from '../../components/dragon/baby-move.ts';import {projectItem} from '../../lib/dragon/geometry.mjs';import {RETICLE_SPEC} from '../../lib/dragon/reticle.mjs';import {coinBoneName,coinHeaderOffsetY,coinParticleState,coinSpinScaleX,elasticOut,sparkleQuadState,stepCoinVisibility,COLLECT_SC_START_ALPHA_KEYS,evalFixedGradient,COLLECT_SC_VELOCITY,sampleCollectSCVelocityAxis,integrateCollectSCVelocityAxis,sampleDonutSpawn,collectSCPerspective,createCoinParticleEntry} from '../../lib/dragon/adult-coin.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url))),map=JSON.parse(fs.readFileSync(new URL('../../public/dragon/data/source-map.json',import.meta.url)));
function fixture(){const values=new Map();let time=1000,id=0;const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},options={catalog,map,storage,now:()=>time,random:()=>0,makeId:()=>String(++id)};return {values,storage,options,advance:ms=>time+=ms,at:t=>time=t,create:()=>createHatchery(options)};}
function ready(f,a){const egg=a.summon();f.at(egg.readyAt);a.tick();return egg;}
function hatched(f,a){ready(f,a);const egg=a.hatch();f.at(egg.hatchDoneAt);a.tick();return egg;}
test('manual landing persists its perch and cannot replay the unfinished emergence after reload',()=>{const f=fixture(),perches=map.MapItemData.filter(p=>p.isMarker&&p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.SymbolID==='Egg_Slot');f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:1,summoned:1,active:null,babies:[],adults:[{id:'a',speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perches[0].GUID,maturedAt:0,hoverUntil:5000,flyUntil:8000}],summonedSpecies:['001']}));const a=f.create();a.setAdultPerch('a',perches[1].GUID);const restored=f.create().getSnapshot().adults[0];assert.equal(restored.perchGUID,perches[1].GUID);assert.equal(restored.flyUntil,1000);assert.equal(restored.hoverUntil,1000);assert.throws(()=>a.setAdultPerch('a','missing'));});
test('video tutorial: cast, arrival, five-second incubation, hatch, then explicit Move',()=>{const f=fixture(),a=f.create(),egg=a.summon();assert.equal(egg.speciesId,'001');assert.equal(egg.startedAt-egg.appearanceAt,2000);assert.equal(egg.readyAt-egg.startedAt,5000);assert.throws(()=>a.summon());f.at(egg.summonDoneAt);assert.equal(a.tick().active.status,'arriving');assert.throws(()=>a.hatch());f.at(egg.startedAt-1);assert.equal(a.tick().active.status,'arriving');f.advance(1);assert.equal(a.tick().active.status,'incubating');assert.equal(a.getSnapshot().active.remainingMs,5000);f.at(egg.readyAt-1);assert.equal(a.tick().active.status,'incubating');f.advance(1);assert.equal(a.tick().active.status,'ready');const h=a.hatch();f.at(h.hatchDoneAt);assert.equal(a.tick().active.status,'hatched');assert.equal(a.getSnapshot().babies.length,0);assert.throws(()=>a.summon());assert.throws(()=>a.hatch());const baby=a.move();assert.equal(baby.speciesId,'001');assert.equal(baby.slotGUID,egg.slotGUID);assert.equal(a.getSnapshot().active,null);assert.equal(a.getSnapshot().babies.length,1);assert.throws(()=>a.move());const next=a.summon();assert.equal(next.speciesId,'002');assert.notEqual(next.slotGUID,baby.slotGUID);assert.equal(next.readyAt-next.startedAt,30000);});
test('reload during arrival and offline incubation preserve existing deadlines',()=>{const f=fixture(),a=f.create(),egg=a.summon();f.at(egg.appearanceAt+500);const b=f.create();assert.equal(b.tick().active.status,'arriving');assert.equal(b.getSnapshot().active.startedAt,egg.startedAt);f.at(egg.readyAt+86400000);const c=f.create();assert.equal(c.tick().active.status,'ready');assert.equal(c.getSnapshot().babies.length,0);});
test('completed hatch waits at the incubator across reload/offline until Move',()=>{const f=fixture(),a=f.create(),egg=hatched(f,a);f.advance(86400000);const b=f.create();assert.equal(b.tick().active.status,'hatched');assert.equal(b.getSnapshot().active.id,egg.id);assert.equal(b.getSnapshot().babies.length,0);b.move();const c=f.create();assert.equal(c.tick().babies.length,1);assert.equal(c.getSnapshot().active,null);assert.equal(c.getSnapshot().babies[0].id,'baby-'+egg.id);});
test('another tab cannot summon, hatch or Move the same dragon twice',()=>{const f=fixture(),a=f.create(),b=f.create(),egg=a.summon();assert.throws(()=>b.summon());f.at(egg.readyAt);b.hatch();assert.throws(()=>a.hatch());f.advance(10000);a.tick();b.tick();a.move();assert.throws(()=>b.move());assert.equal(b.tick().babies.length,1);assert.equal(a.tick().babies.length,1);});
test('a failed Move write keeps the dragon at the incubator without creating a nursery copy',()=>{const f=fixture(),a=f.create();hatched(f,a);const write=f.storage.setItem;f.storage.setItem=()=>{throw Error('quota');};assert.throws(()=>a.move(),/บันทึก/);assert.equal(a.getSnapshot().active.status,'hatched');assert.equal(a.getSnapshot().babies.length,0);f.storage.setItem=write;a.move();assert.equal(a.getSnapshot().babies.length,1);});
test('full nursery blocks new summons; invalid save is preserved',()=>{const f=fixture(),slots=map.MapItemData.filter(i=>i.SymbolID==='Egg_Slot');f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:1,summoned:85,active:null,babies:slots.map((s,i)=>({id:String(i),speciesId:'001',slotGUID:s.GUID,hatchedAt:1}))}));assert.throws(()=>f.create().summon(),/รังเต็ม/);f.storage.setItem(HATCHERY_KEY,'broken');assert.throws(()=>f.create(),/อ่านข้อมูล/);assert.equal(f.storage.getItem(HATCHERY_KEY),'broken');});
test('a failed summon write cannot consume a summon or create a phantom egg',()=>{const f=fixture(),a=f.create();f.storage.setItem=()=>{throw Error('quota');};assert.throws(()=>a.summon(),/บันทึก/);assert.equal(a.getSnapshot().summoned,0);assert.equal(a.getSnapshot().active,null);});
test('visual progress never changes the selected species or reserved slot',()=>{const f=fixture(),a=f.create(),egg=a.summon();f.advance(1000);const b=f.create();assert.equal(b.tick().active.id,egg.id);assert.throws(()=>b.summon());f.at(egg.startedAt);const v=b.tick();assert.equal(v.active.status,'incubating');assert.equal(v.summoned,1);assert.equal(v.active.speciesId,egg.speciesId);assert.equal(v.active.slotGUID,egg.slotGUID);});
test('old v1 incubation saves retain their own timer rather than adopting five seconds',()=>{const f=fixture(),old={version:1,summoned:1,babies:[],active:{id:'existing',speciesId:'001',slotGUID:'g92056',phase:'incubating',startedAt:0,readyAt:20000}};f.storage.setItem(HATCHERY_KEY,JSON.stringify(old));const a=f.create();assert.equal(a.getSnapshot().active.readyAt,20000);f.at(20000);assert.equal(a.tick().active.status,'ready');a.hatch();assert.equal(a.getSnapshot().active.id,'existing');});
test('old two-second casts without an arrival phase retain their saved deadlines',()=>{const f=fixture(),old={version:1,summoned:1,babies:[],active:{id:'old-cast',speciesId:'001',slotGUID:'g92056',phase:'summoning',summonAt:0,summonDoneAt:2000,startedAt:2000,readyAt:22000}};f.storage.setItem(HATCHERY_KEY,JSON.stringify(old));const a=f.create();assert.equal(a.getSnapshot().active.summonDoneAt,2000);f.at(2000);assert.equal(a.tick().active.status,'incubating');assert.equal(a.getSnapshot().active.readyAt,22000);});
test('existing nursery babies remain moved and are never pulled back into the incubator',()=>{const f=fixture(),old={version:1,summoned:1,active:null,babies:[{id:'baby-existing',speciesId:'001',slotGUID:'g92056',hatchedAt:1}]};f.storage.setItem(HATCHERY_KEY,JSON.stringify(old));const a=f.create();assert.equal(a.tick().active,null);assert.equal(a.getSnapshot().babies[0].id,'baby-existing');assert.throws(()=>a.move());});

test('removing a nursery dragon persists, preserves the active egg and other dragons',()=>{const f=fixture(),a=f.create();hatched(f,a);const first=a.move();hatched(f,a);const second=a.move(),active=a.summon(),before=a.getSnapshot();a.removeBaby(first.id);const b=f.create().getSnapshot();assert.deepEqual(b.babies,[second]);assert.equal(b.summoned,before.summoned);assert.deepEqual(b.active,active);assert.throws(()=>a.removeBaby(active.id),/ไม่พบมังกร/);assert.deepEqual(a.tick().babies,[second]);});
test('deleting from a full nursery frees precisely the deleted slot for the next summon',()=>{const f=fixture(),slots=map.MapItemData.filter(i=>i.SymbolID==='Egg_Slot');const babies=slots.map((s,i)=>({id:'owned-'+i,speciesId:'001',slotGUID:s.GUID,hatchedAt:1}));f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:1,summoned:85,active:null,babies}));const a=f.create(),removed=babies[4];assert.throws(()=>a.summon(),/รังเต็ม/);a.removeBaby(removed.id);assert.equal(a.getSnapshot().babies.length,slots.length-1);assert.equal(a.summon().slotGUID,removed.slotGUID);});
test('failed deletes and stale tabs cannot erase a different dragon or revive a deleted one',()=>{const f=fixture(),a=f.create();hatched(f,a);const first=a.move();hatched(f,a);const second=a.move(),b=f.create(),original=f.storage.getItem(HATCHERY_KEY),write=f.storage.setItem;f.storage.setItem=()=>{throw Error('quota');};assert.throws(()=>a.removeBaby(first.id),/บันทึก/);assert.equal(f.storage.getItem(HATCHERY_KEY),original);assert.deepEqual(a.getSnapshot().babies,[first,second]);f.storage.setItem=write;a.removeBaby(first.id);assert.throws(()=>b.removeBaby(first.id),/ไม่พบมังกร/);b.removeBaby(second.id);assert.deepEqual(a.tick().babies,[]);assert.deepEqual(f.create().getSnapshot().babies,[]);});

test('new-species flag stays true through summon, hatch, and reload until an adult matures',()=>{const f=fixture(),a=f.create(),egg=a.summon();assert.equal(egg.isNewSpecies,true);assert.equal(egg.discovered,false);assert.deepEqual(a.getSnapshot().summonedSpecies,['001']);assert.deepEqual(a.getSnapshot().maturedSpecies,[]);assert.equal(a.isDiscovered(egg.speciesId),false);f.at(egg.readyAt);const b=f.create(),hatchedEgg=b.hatch();assert.equal(hatchedEgg.isNewSpecies,true);assert.equal(b.getSnapshot().active.id,egg.id);});
test('a repeated species stays new even after summoning or deleting a nursery baby when none matured',()=>{const f=fixture();f.options.catalog={...catalog,pools:[{summonsTier:0,pool:[{key:'001',entries:1}]}]};const a=f.create();hatched(f,a);const baby=a.move();assert.equal(baby.isNewSpecies,true);a.removeBaby(baby.id);const b=f.create(),duplicate=b.summon();assert.equal(duplicate.speciesId,'001');assert.equal(duplicate.isNewSpecies,true);assert.deepEqual(b.getSnapshot().summonedSpecies,['001']);assert.deepEqual(b.getSnapshot().maturedSpecies,[]);assert.equal(b.getSnapshot().babies.length,0);assert.equal(f.create().getSnapshot().active.isNewSpecies,true);});
test('legacy saves seed maturedSpecies from adults while keeping summonedSpecies and egg progress',()=>{const f=fixture(),perch=map.MapItemData.find(p=>p.isMarker&&p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.isMarker&&p.SymbolID==='Egg_Slot'),legacy={version:1,summoned:2,babies:[{id:'known',speciesId:'001',slotGUID:'g92056',hatchedAt:1}],active:null};f.storage.setItem(HATCHERY_KEY,JSON.stringify(legacy));const a=f.create();a.removeBaby('known');assert.deepEqual(f.create().getSnapshot().summonedSpecies,['001']);assert.deepEqual(f.create().getSnapshot().maturedSpecies,[]);f.options.catalog={...catalog,pools:[{summonsTier:0,pool:[{key:'001',entries:1}]}]};assert.equal(f.create().summon().isNewSpecies,true);const withAdult={version:2,summoned:1,babies:[],adults:[{id:'ad1',speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:0,flyUntil:0,level:0,nectar:0,coinStampedAt:10}],active:null,summonedSpecies:['001']};f.storage.setItem(HATCHERY_KEY,JSON.stringify(withAdult));const migrated=f.create();assert.deepEqual(migrated.getSnapshot().maturedSpecies,['001']);assert.equal(migrated.isDiscovered('001'),true);});
test('a failed summon cannot mark a species as seen and malformed history is not overwritten',()=>{const f=fixture(),a=f.create();f.storage.setItem=()=>{throw Error('quota');};assert.throws(()=>a.summon(),/บันทึก/);assert.deepEqual(a.getSnapshot().summonedSpecies,[]);assert.deepEqual(f.create().getSnapshot().summonedSpecies,[]);const bad=JSON.stringify({version:1,summoned:0,active:null,babies:[],summonedSpecies:['missing']});f.values.set(HATCHERY_KEY,bad);assert.throws(()=>f.create(),/อ่านข้อมูล/);assert.equal(f.storage.getItem(HATCHERY_KEY),bad);const badMatured=JSON.stringify({version:2,summoned:0,active:null,babies:[],maturedSpecies:['missing']});f.values.set(HATCHERY_KEY,badMatured);assert.throws(()=>f.create(),/อ่านข้อมูล/);assert.equal(f.storage.getItem(HATCHERY_KEY),badMatured);});
test('a flying adult frees its origin for another adult without invalidating a reload',()=>{
 const f=fixture(),perches=map.MapItemData.filter(p=>p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.SymbolID==='Egg_Slot');
 f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:1,summoned:2,active:null,babies:[],adults:['a','b'].map((id,i)=>({id,speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perches[i].GUID,maturedAt:0,flyUntil:0}))}));
 const model=f.create(),point={x:0,y:-20,z:-38,layerID:perches[0].LayerID};model.releaseAdultPerch('a',point);model.setAdultPerch('b',perches[0].GUID);
 const restored=f.create().getSnapshot();assert.equal(restored.adults.find(a=>a.id==='a').perchReserved,false);assert.deepEqual(restored.adults.find(a=>a.id==='a').flightPosition,point);assert.equal(restored.adults.find(a=>a.id==='b').perchReserved,true);
 assert.throws(()=>model.setAdultPerch('a',perches[0].GUID));model.setAdultPerch('a',perches[1].GUID);assert.equal(f.create().getSnapshot().adults.find(a=>a.id==='a').perchReserved,true);assert.equal(model.getSnapshot().adults.find(a=>a.id==='a').flightPosition,undefined);
});
test('failed unperching writes preserve the occupied perch and existing save',()=>{
 const f=fixture(),perch=map.MapItemData.find(p=>p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.SymbolID==='Egg_Slot');f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:1,summoned:1,active:null,babies:[],adults:[{id:'a',speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:0,flyUntil:0}]}));
 const model=f.create(),before=f.storage.getItem(HATCHERY_KEY);f.storage.setItem=()=>{throw Error('quota');};assert.throws(()=>model.releaseAdultPerch('a',{x:1,y:-20,z:-38,layerID:perch.LayerID}));assert.equal(f.storage.getItem(HATCHERY_KEY),before);assert.equal(model.getSnapshot().adults[0].perchReserved,undefined);
});
test('adult is final stage: nectarTargetForSpecies returns 0 and creditAdultNectar is a no-op',()=>{
 const byRarity=r=>catalog.species.find(s=>s.rarity===r);
 assert.equal(nectarTargetForSpecies(byRarity('Common'),0),0);
 const f=fixture(),perch=map.MapItemData.find(p=>p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.SymbolID==='Egg_Slot');
 f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[],adults:[{id:'a',speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:100,flyUntil:200,level:0,nectar:0,coinStampedAt:5000}],summonedSpecies:['001']}));
 const maxed=f.create().creditAdultNectar('a',3);
 assert.equal(maxed.credited,0);assert.equal(maxed.leftover,3);assert.equal(maxed.leveledUp,false);
});
test('roundHalfEven, coin readiness without stacking, harvest SC reward, and matured adults',()=>{
 assert.deepEqual([1.5,2.5,3.5,4.5].map(roundHalfEven),[2,2,4,4]);
 const sp001=catalog.species.find(s=>s.id==='001');
 assert.equal(adultWaitSeconds(sp001,0),roundHalfEven(sp001.sourceGrowthWaits[0]*60));
 assert.equal(adultCoinReward(sp001,0),sp001.stageYields[0]);
 const f=fixture(),wallet=createWallet({storage:f.storage,now:f.options.now}),perch=map.MapItemData.find(p=>p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.SymbolID==='Egg_Slot');
 f.options.wallet=wallet;
 f.storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[],adults:[{id:'a',speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:0,flyUntil:0,level:0,nectar:0,coinStampedAt:1000}],summonedSpecies:['001']}));
 const h=f.create();
 assert.equal(h.getAdultStatus('a').ready,false);assert.equal(h.harvestAdult('a').harvested,false);assert.equal(wallet.getSnapshot().SC,0);
 const waitMs=adultWaitSeconds(sp001,0)*1000;
 f.at(1000+waitMs*5);
 assert.equal(h.tick().adults[0].ready,true);assert.equal(h.getAdultStatus('a').ready,true);
 const res=h.harvestAdult('a');
 assert.equal(res.reward,sp001.stageYields[0]);assert.equal(wallet.getSnapshot().SC,sp001.stageYields[0]);
 assert.equal(h.getAdultStatus('a').ready,false);
 f.at(1000+waitMs*5+1);
 hatched(f,h);const baby=h.move();for(let i=0;i<5;i++){const fed=h.feedBaby(baby.id);f.at(fed.growth.readyAt);}const mat=h.matureBaby(baby.id);f.at(mat.maturing.doneAt);const snap=h.tick();
 const newest=snap.adults.find(a=>a.speciesId===baby.speciesId);
 assert.equal(newest.level,0);assert.equal(newest.nectar,0);assert.equal(newest.coinStampedAt,mat.maturing.doneAt);
});
test('renderer sync updates reused adult entry on harvestAdult without rebuild',async()=>{
 class Container{children=[];position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};addChild(c){this.children.push(c);return c;}destroy(){}}
 class SimpleMesh{constructor(t,v,u,i){this.texture=t;this.vertices=v;this.uvs=u;this.indices=i;this.position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};this.scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};this.geometry={getBuffer:()=>({update(){}}),addAttribute(){return this;}};}destroy(){}}
 class Mesh extends SimpleMesh{constructor(g,s){super({},g.vertices,g.uvs,g.indices);this.geometry=g;this.shader=s;}}
 class MeshGeometry{constructor(v,u,i){this.vertices=v;this.uvs=u;this.indices=i;}addAttribute(){return this;}getBuffer(){return {update(){}};}}
 class Sprite{anchor={set(){}};position={set(){}};scale={set(){}};destroy(){}}
 const PIXI={Container,SimpleMesh,Mesh,MeshGeometry,Sprite,Texture:{WHITE:{}},Shader:{from:(_v,_f,u)=>({uniforms:{...u}})},BLEND_MODES:{NORMAL:0,NORMAL_NPM:0,ADD:1},ALPHA_MODES:{NPM:0}};
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},perch=map.MapItemData.find(p=>p.SymbolID==='PerchMarker_Branch'),slot=map.MapItemData.find(p=>p.SymbolID==='Egg_Slot'),sp001=catalog.species.find(s=>s.id==='001'),realNow=Date.now();
 let time=realNow-60000;
 const wallet=createWallet({storage,now:()=>time});
 storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[],adults:[{id:'a',speciesId:'001',originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:realNow-70000,flyUntil:realNow-65000,level:0,nectar:0,coinStampedAt:time}],summonedSpecies:['001']}));
 const h=createHatchery({catalog,map,storage,wallet,now:()=>time}),entries=[],renderer=createHatcheryRenderer({PIXI,map,bounds:null,entries,sortScene:()=>{},invalidate:()=>{},loadTexture:async()=>({baseTexture:{alphaMode:1,width:512,height:512},width:512,height:512})});
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const buf=fs.readFileSync(new URL('../../public'+url,import.meta.url));return {ok:true,json:async()=>JSON.parse(buf.toString('utf8')),text:async()=>buf.toString('utf8'),arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};};
 try{
  await renderer.sync(h.getSnapshot(),catalog);
  const entry=entries.find(e=>e.actorId==='a');
  renderer.update(0,false);
  assert.equal(entry.control.readyToHarvest,true);
  time=Date.now();
  h.harvestAdult('a');
  await renderer.sync(h.getSnapshot(),catalog);
  renderer.update(.016,false);
  assert.equal(entries.find(e=>e.actorId==='a'),entry);
  assert.equal(entry.control.readyToHarvest,false);
 }finally{globalThis.fetch=oldFetch;}
});
test('currency HUD roll duration and requestCurrencyShop routing match native spec',{todo:'Removed feature: currency shop / gold flow (spec: เงินในเกม)'},()=>{
 assert.equal(currencyRollDuration(0),.25);
 assert.equal(currencyRollDuration(2),.25);
 assert.equal(currencyRollDuration(-5),.5);
 assert.equal(currencyRollDuration(10),1);
 assert.equal(currencyRollDuration(500),1);
 assert.deepEqual(routeCurrencyShop('SC_PLURAL'),{initialCurrency:'SC',initialStage:'insufficient'});
 assert.deepEqual(routeCurrencyShop('SC_PLURAL',{shop:true}),{initialCurrency:'SC',initialStage:'shop'});
 assert.deepEqual(routeCurrencyShop('HC_PLURAL'),{initialCurrency:'HC',initialStage:'insufficientGems'});
 assert.deepEqual(routeCurrencyShop('HC_PLURAL',{shop:true}),{initialCurrency:'HC',initialStage:'insufficientGems'});
 assert.equal(routeCurrencyShop('UNKNOWN'),null);
});
test('native world-space adult coin offsets, visibility state machine, spin, and harvest particle timeline',()=>{
 assert.deepEqual([0,1,2,3,4,5,6,7,8,9,10,11,12,13].map(coinHeaderOffsetY),[1.5,1.5,1.75,1.25,1.5,1.5,1.75,1.25,1.75,1.5,1.5,1.25,1.5,1.5]);
 assert.equal(coinBoneName({skeletonID:0,adultFamily:'Classic_1'}),'Head');
 assert.equal(coinBoneName({skeletonID:3,adultFamily:'Loong_1'}),'Body');
 assert.equal(coinBoneName({skeletonID:7,adultFamily:'LongLoong_1'}),'Body');
 assert.equal(coinBoneName({skeletonID:8,adultFamily:'Micro_1'}),'Body');
 assert.equal(coinSpinScaleX(0),.6);
 assert.ok(Math.abs(coinSpinScaleX(1)+.6)<1e-9);
 assert.ok(Math.abs(coinSpinScaleX(.5))<1e-9);
 let v=stepCoinVisibility({shown:false,state:'PreHover',readyToHarvest:true});assert.deepEqual(v,{shown:false,visible:false});
 v=stepCoinVisibility({shown:v.shown,state:'Perching',readyToHarvest:false});assert.deepEqual(v,{shown:false,visible:false});
 v=stepCoinVisibility({shown:v.shown,state:'Perching',readyToHarvest:true});assert.deepEqual(v,{shown:true,visible:true});
 v=stepCoinVisibility({shown:v.shown,state:'Dragging',readyToHarvest:true});assert.deepEqual(v,{shown:true,visible:true});
 v=stepCoinVisibility({shown:v.shown,state:'Hover',readyToHarvest:false});assert.deepEqual(v,{shown:true,visible:true});
 v=stepCoinVisibility({shown:v.shown,state:'Hover',readyToHarvest:false,dev:true});assert.deepEqual(v,{shown:true,visible:false});
 v=stepCoinVisibility({shown:v.shown,state:'Perching',readyToHarvest:true,harvested:true});assert.deepEqual(v,{shown:false,visible:false});
 assert.equal(elasticOut(0),0);assert.equal(elasticOut(1),1);
 assert.deepEqual(coinParticleState(0),{offsetY:0,labelVisible:false,alpha:1,sparkleSpawned:false,done:false});
 const t25=coinParticleState(.25);assert.equal(t25.labelVisible,true);assert.equal(t25.alpha,1);assert.equal(t25.sparkleSpawned,true);assert.ok(t25.offsetY>0);
 const t80=coinParticleState(.8);assert.equal(t80.offsetY,2);assert.equal(t80.alpha,1);assert.equal(t80.done,false);
 const t280=coinParticleState(2.8);assert.equal(t280.offsetY,2);assert.equal(t280.labelVisible,true);assert.equal(t280.alpha,1);
 const t330=coinParticleState(3.3);assert.equal(t330.offsetY,2);assert.equal(t330.labelVisible,true);assert.ok(Math.abs(t330.alpha-(1-Math.SQRT1_2))<1e-9);
 const t380=coinParticleState(3.8);assert.deepEqual(t380,{offsetY:2,labelVisible:false,alpha:0,sparkleSpawned:true,done:true});
 assert.equal(sparkleQuadState(0,.4).alpha,0);assert.equal(sparkleQuadState(2568/65535,.4).alpha,1);assert.equal(sparkleQuadState(65100/65535,.4).alpha,0);assert.equal(sparkleQuadState(1,.4).size,0);
 assert.ok(Math.abs(sparkleQuadState(0,.4).rotation-Math.PI/4)<1e-9);
 assert.ok(Math.abs(sparkleQuadState(.5,.4,{spin:Math.PI}).rotation-(Math.PI/4+Math.PI/2))<1e-9);
 // Fixed-mode gradient evaluation for CollectSCParticle startColor alpha keys.
 assert.equal(evalFixedGradient(COLLECT_SC_START_ALPHA_KEYS,0),1);
 assert.ok(Math.abs(evalFixedGradient(COLLECT_SC_START_ALPHA_KEYS,0.5)-0.39215687)<1e-7);
 assert.ok(Math.abs(evalFixedGradient(COLLECT_SC_START_ALPHA_KEYS,1)-0.78431374)<1e-7);
 // Per-axis mode-2 velocity curves (scalar 2, speedModifier 6.34) for min/max curves.
 assert.ok(Math.abs(sampleCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,0,0)-12.68)<1e-6);
 assert.ok(Math.abs(sampleCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,0,1)+12.68)<1e-6);
 assert.ok(Math.abs(sampleCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,0.32,0))<1e-6);
 assert.ok(Math.abs(sampleCollectSCVelocityAxis(COLLECT_SC_VELOCITY.z,0,1)+12.68)<1e-6);
 assert.ok(integrateCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,0.32,0)>1.5&&Math.abs(integrateCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,1,0)-integrateCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,0.33,0))<1e-9);
 assert.ok(collectSCPerspective(10,100)<1&&collectSCPerspective(-10,100)>1);
 // Donut shape: samples within 0.2 of the ring, Loop arc angle at t=0 -> 0 for all samples.
 for(const r of [0,0.25,0.5,0.99]){
  let k=0;const rng=()=>[r,r*0.7][k++%2];
  const s=sampleDonutSpawn({systemTime:0,duration:1,random:rng});
  assert.equal(s.theta,0);
  const distToRing=Math.hypot(s.x-0.0001*Math.cos(s.theta),s.y-0.0001*Math.sin(s.theta),s.z);
  assert.ok(distToRing<=0.2+1e-9);
 }
 // Burst container behind icon/label (sortingOrder 0 vs 2), and label texture disposal frees its own texture without touching shared textures.
 const destroyedTextures=[],labelObj=[];
 class MockContainer{constructor(){this.children=[];this.destroyed=false;this.scale={set(){}};this.position={set(){}};this.anchor={set(){}};}addChild(c){this.children.push(c);c.parent=this;return c;}removeChild(c){const i=this.children.indexOf(c);if(i>=0)this.children.splice(i,1);c.parent=null;}destroy(opts){this.destroyed=true;if(opts?.children)for(const c of [...this.children])c.destroy?.(opts);}}
 class MockMesh extends MockContainer{}
 class MockText extends MockContainer{constructor(t){super();this.text=t;labelObj.push(this);}destroy(opts){if(opts?.texture&&opts?.baseTexture)destroyedTextures.push(this.text);super.destroy(opts);}}
 const sharedTex={destroyed:false,destroy(){this.destroyed=true;}};
 const entry=createCoinParticleEntry({PIXI:{Container:MockContainer,SimpleMesh:MockMesh,Text:MockText},actorId:'a1',reward:15,x:0,y:0,zPos:-0.5,layerZ:0,atlasTexture:sharedTex,quadTexture:sharedTex,now:1000});
 assert.equal(entry.mesh.children.length,3);
 assert.ok(entry.mesh.children[0].children.length===12);
 assert.equal(entry.mesh.children[2],labelObj[0]);
 entry.destroy();
 assert.deepEqual(destroyedTextures,['15']);
 assert.equal(sharedTex.destroyed,false);
});
test('maturing an adult clears isNewSpecies for existing and future dragons and persists across reload',()=>{
 const f=fixture();
 f.options.catalog={...catalog,pools:[{summonsTier:0,pool:[{key:'001',entries:1}]}]};
 const h=f.create();
 hatched(f,h);
 const b1=h.move();
 for(let i=0;i<5;i++){const fed=h.feedBaby(b1.id);assert.equal(fed.isNewSpecies,true);f.at(fed.growth.readyAt);}
 h.tick();
 assert.equal(h.getSnapshot().babies[0].isNewSpecies,true);
 // Summon a second egg of the same species before b1 matures: still new.
 const egg2=h.summon();
 assert.equal(egg2.isNewSpecies,true);
 assert.equal(isSpeciesDiscovered(h.getSnapshot().maturedSpecies,'001'),false);
 const mat=h.matureBaby(b1.id);
 f.at(mat.maturing.doneAt);
 const after=h.tick();
 assert.deepEqual(after.maturedSpecies,['001']);
 assert.equal(after.active.isNewSpecies,false);
 assert.equal(after.active.discovered,true);
 assert.equal(h.isDiscovered('001'),true);
 const reloaded=f.create();
 assert.deepEqual(reloaded.getSnapshot().maturedSpecies,['001']);
 assert.equal(reloaded.isDiscovered('001'),true);
 assert.equal(reloaded.getSnapshot().active.isNewSpecies,false);
});
test('egg new-species glow stays active through hatched phase and follows maturedSpecies',()=>{
 const active={speciesId:'001',phase:'hatched',isNewSpecies:true,discovered:false};
 assert.equal(eggNewSpeciesGlow(active),true);
 assert.equal(eggNewSpeciesGlow({...active,phase:'appear'}),true);
 assert.equal(eggNewSpeciesGlow({...active,phase:'idle'}),true);
 assert.equal(eggNewSpeciesGlow({...active,phase:'ready'}),true);
 assert.equal(eggNewSpeciesGlow(active,[]),true);
 assert.equal(eggNewSpeciesGlow(active,['001']),false);
 assert.equal(eggNewSpeciesGlow({...active,isNewSpecies:false,discovered:true}),false);
 assert.equal(eggNewSpeciesGlow(null),false);
});
test('dragonPanelTitle returns Undiscovered Dragon until species is discovered',()=>{
 const sp=catalog.species.find(s=>s.id==='001');
 assert.equal(UNDISCOVERED_DRAGON_TITLE,'Undiscovered Dragon');
 assert.equal(dragonPanelTitle(sp,false),'Undiscovered Dragon');
 assert.equal(dragonPanelTitle(sp,true),sp.name);
 assert.equal(dragonPanelTitle(null,true),'Undiscovered Dragon');
});
test('renderer sync attaches sorted baby glow and prewarmed particles that follow visibility hooks',async()=>{
 class Container{children=[];position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};addChild(...cs){this.children.push(...cs);return cs[0];}destroy(){}}
 class SimpleMesh{constructor(t,v,u,i){this.texture=t;this.vertices=v;this.uvs=u;this.indices=i;this.position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};this.scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};this.geometry={getBuffer:()=>({update(){}}),addAttribute(){return this;}};}destroy(){}}
 class Mesh extends SimpleMesh{constructor(g,s){super({},g.vertices,g.uvs,g.indices);this.geometry=g;this.shader=s;}}
 class MeshGeometry{constructor(v,u,i){this.vertices=v;this.uvs=u;this.indices=i;}addAttribute(){return this;}getBuffer(){return {update(){}};}}
 class Sprite{anchor={set(){}};position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};destroy(){}}
 const PIXI={Container,SimpleMesh,Mesh,MeshGeometry,Sprite,Texture:{WHITE:{}},Shader:{from:(_v,_f,u)=>({uniforms:{...u}})},BLEND_MODES:{NORMAL:0,NORMAL_NPM:0,ADD:1},ALPHA_MODES:{NPM:0}};
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},slot=map.MapItemData.find(p=>p.isMarker&&p.SymbolID==='Egg_Slot'),sp001=catalog.species.find(s=>s.id==='001');
 storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[{id:'b1',speciesId:'001',slotGUID:slot.GUID,hatchedAt:100}],adults:[],summonedSpecies:['001'],maturedSpecies:[]}));
 const h=createHatchery({catalog,map,storage,now:()=>1000}),entries=[],renderer=createHatcheryRenderer({PIXI,map,bounds:null,entries,sortScene:()=>{},invalidate:()=>{},loadTexture:async()=>({baseTexture:{alphaMode:1,width:128,height:128},width:128,height:128})});
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const buf=fs.readFileSync(new URL('../../public'+url,import.meta.url));return {ok:true,json:async()=>JSON.parse(buf.toString('utf8')),text:async()=>buf.toString('utf8'),arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};};
 try{
  await renderer.sync(h.getSnapshot(),catalog);
  const baby=entries.find(e=>e.actorId==='b1'&&e.kind==='baby'),glow=entries.find(e=>e.kind==='baby-glow'&&e.ownerId==='b1'),particles=entries.find(e=>e.kind==='baby-particles'&&e.ownerId==='b1');
  assert.ok(baby&&glow&&particles);
  assert.ok(glow.item.ZPos>baby.item.ZPos&&particles.item.ZPos<baby.item.ZPos);
  assert.equal(glow.item.scaleX,slot.scaleX*sp001.babyScale);
  assert.equal(particles.sprites.length,9);
  renderer.update(0,false);
  assert.equal(glow.gameplayHidden,false);assert.equal(particles.gameplayHidden,false);
  assert.equal(particles.sprites.filter(s=>s.visible).length,9);
  renderer.setBabyMoving('b1',true);
  renderer.update(.05,false);
  assert.equal(glow.gameplayHidden,true);assert.equal(particles.gameplayHidden,true);
  renderer.setBabyMoving('b1',false);
  renderer.update(.1,true);
  assert.equal(glow.gameplayHidden,true);assert.equal(particles.gameplayHidden,true);
  renderer.update(.15,false);
  assert.equal(glow.gameplayHidden,false);assert.equal(particles.gameplayHidden,false);
  // Snapshot marks species matured -> glow hides on update.
  await renderer.sync({...h.getSnapshot(),maturedSpecies:['001']},catalog);
  renderer.update(.2,false);
  assert.equal(glow.gameplayHidden,true);assert.equal(particles.gameplayHidden,true);
 }finally{globalThis.fetch=oldFetch;}
});
test('renderer sync attaches baby reticle only when mature-ready, hides on tap/Dev, and stays visible while moving',async()=>{
 class Container{children=[];position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};addChild(...cs){this.children.push(...cs);return cs[0];}destroy(){}}
 class SimpleMesh{constructor(t,v,u,i){this.texture=t;this.vertices=v;this.uvs=u;this.indices=i;this.position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};this.scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};this.geometry={getBuffer:()=>({update(){}}),addAttribute(){return this;}};}destroy(){}}
 class Mesh extends SimpleMesh{constructor(g,s){super({},g.vertices,g.uvs,g.indices);this.geometry=g;this.shader=s;}}
 class MeshGeometry{constructor(v,u,i){this.vertices=v;this.uvs=u;this.indices=i;}addAttribute(){return this;}getBuffer(){return {update(){}};}}
 class Sprite{anchor={set(){}};position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};destroy(){}}
 const PIXI={Container,SimpleMesh,Mesh,MeshGeometry,Sprite,Texture:{WHITE:{}},Shader:{from:(_v,_f,u)=>({uniforms:{...u}})},BLEND_MODES:{NORMAL:0,NORMAL_NPM:0,ADD:1},ALPHA_MODES:{NPM:0}};
 const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)},slot=map.MapItemData.find(p=>p.isMarker&&p.SymbolID==='Egg_Slot'&&p.scaleX<0)||map.MapItemData.find(p=>p.isMarker&&p.SymbolID==='Egg_Slot');
 let time=1000;
 const h=createHatchery({catalog,map,storage,now:()=>time,random:()=>0,makeId:()=>'b1'});
 const egg=h.summon();time=egg.readyAt;h.tick();const hx=h.hatch();time=hx.hatchDoneAt;h.tick();
 const moved=h.move();
 for(let i=0;i<5;i++){const fed=h.feedBaby(moved.id);time=fed.growth.readyAt;}
 h.tick();
 const entries=[],renderer=createHatcheryRenderer({PIXI,map,bounds:null,entries,sortScene:()=>{},invalidate:()=>{},loadTexture:async()=>({baseTexture:{alphaMode:1,width:1024,height:1024},width:1024,height:1024})});
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const buf=fs.readFileSync(new URL('../../public'+url,import.meta.url));return {ok:true,json:async()=>JSON.parse(buf.toString('utf8')),text:async()=>buf.toString('utf8'),arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};};
 try{
  const snap=h.getSnapshot();
  await renderer.sync(snap,catalog);
  const baby=entries.find(e=>e.actorId===moved.id&&e.kind==='baby'),ret=entries.find(e=>e.kind==='baby-reticle'&&e.ownerId===moved.id);
  assert.ok(baby&&ret);
  assert.equal(ret.gameplayHidden,false);
  assert.equal(ret.reticle.active,true);
  assert.equal(ret.item.scaleX,slot.scaleX);
  assert.equal(ret.item.ZPos,baby.item.ZPos-1.5);
  baby.item.XPos=12;baby.item.YPos=-4;
  renderer.setBabyMoving(moved.id,true);
  renderer.update(.05,false);
  assert.equal(ret.gameplayHidden,false,'reticle stays visible while moving baby');
  assert(Number.isFinite(ret.item.XPos)&&Number.isFinite(ret.item.YPos));
  assert(ret.item.YPos>baby.item.YPos,'reticle follows the body above the slot');
  assert.equal(ret.projectionZPos,baby.item.ZPos,'reticle projects at the baby depth');
  renderer.update(.1,true);
  assert.equal(ret.gameplayHidden,true,'Dev hides baby reticle');
  renderer.update(.15,false);
  assert.equal(ret.gameplayHidden,false);
  await renderer.sync({...snap,babies:[{...snap.babies[0],growth:{...snap.babies[0].growth,readyAt:Date.now()+60000}}]},catalog);
  assert.equal(ret.gameplayHidden,true,'non-mature-ready hides baby reticle');
  await renderer.sync({...snap,babies:[{...snap.babies[0],maturing:{perchGUID:'p',startedAt:Date.now(),doneAt:Date.now()+5000}}]},catalog);
  assert.equal(ret.gameplayHidden,true,'maturing tap hides baby reticle immediately');
 }finally{globalThis.fetch=oldFetch;}
});
test('getEmptySlots, canMove, moveBaby and move(slotGUID) support relocating babies across free Egg_Slots',()=>{
 const f=fixture(),slots=map.MapItemData.filter(i=>i.isMarker&&i.SymbolID==='Egg_Slot');
 const a=f.create();
 assert.equal(a.canMove(),true);
 const initEmpty=a.getEmptySlots();
 assert.equal(initEmpty.length,slots.length);
 hatched(f,a);
 const b1=a.move();
 assert.equal(a.getEmptySlots().length,slots.length-1);
 assert.equal(a.canMove(),true);
 const targetSlot=a.getEmptySlots()[2].GUID;
 const moved=a.moveBaby(b1.id,targetSlot);
 assert.equal(moved.slotGUID,targetSlot);
 assert.equal(f.create().getSnapshot().babies[0].slotGUID,targetSlot,'moveBaby persists');
 assert.throws(()=>a.moveBaby('missing',a.getEmptySlots()[0].GUID));
 assert.throws(()=>a.moveBaby(b1.id,'missing-slot'));
 assert.throws(()=>a.moveBaby(b1.id,targetSlot),'own slot rejected');
 // Hatched egg moves to chosen empty slot and excludes its active.slotGUID from empty slots while hatched.
 const egg2=hatched(f,a);
 const emptyDuringActive=a.getEmptySlots();
 assert.equal(emptyDuringActive.some(s=>s.GUID===egg2.slotGUID),false,'active slot reserved');
 const chosenSlot=emptyDuringActive.at(-1).GUID;
 assert.throws(()=>a.moveBaby(b1.id,egg2.slotGUID),'cannot move baby into active egg reserved slot');
 assert.throws(()=>a.move(targetSlot),'cannot move hatched egg onto occupied slot');
 const b2=a.move(chosenSlot);
 assert.equal(b2.slotGUID,chosenSlot);
 assert.throws(()=>a.moveBaby(b1.id,chosenSlot),'occupied slot rejected');
 // Maturing baby cannot move.
 for(let i=0;i<5;i++){const fed=a.feedBaby(b1.id);f.at(fed.growth.readyAt);}
 a.matureBaby(b1.id);
 assert.throws(()=>a.moveBaby(b1.id,a.getEmptySlots()[0].GUID));
 // Full nursery disables canMove.
 const full=fixture();
 full.storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:slots.length,active:null,babies:slots.map((s,i)=>({id:'x'+i,speciesId:'001',slotGUID:s.GUID,hatchedAt:1}))}));
 const fullH=full.create();
 assert.deepEqual(fullH.getEmptySlots(),[]);
 assert.equal(fullH.canMove(),false);
});
test('transit state machine handles canMove gating, off-target taps, cancel, and drop on valid slot',()=>{
 const f=fixture(),a=f.create(),slots=map.MapItemData.filter(i=>i.isMarker&&i.SymbolID==='Egg_Slot');
 hatched(f,a);
 const b1=a.move();
 const movingCalls=[],transitCalls=[];let afterCount=0,errors=[];
 const renderer={setBabyMoving:(id,v)=>movingCalls.push([id,v]),setTransitSlots:s=>transitCalls.push([...s])};
 const ctrl=createBabyMoveController({getModel:()=>a,renderer,onAfterSuccess:()=>afterCount++,onError:e=>errors.push(e)});
 assert.equal(ctrl.begin({kind:'baby',babyId:'missing'}),false);
 const emptyIds=a.getEmptySlots().map(s=>s.GUID);
 assert.equal(emptyIds.includes(b1.slotGUID),false);
 assert.equal(ctrl.begin({kind:'baby',babyId:b1.id}),true);
 assert.deepEqual(ctrl.state.targetSlotGUIDs,emptyIds);
 assert.deepEqual(movingCalls.at(-1),[b1.id,true]);
 assert.deepEqual(transitCalls.at(-1),emptyIds);
 // Tapping own slot or unknown point does nothing and stays in transit.
 assert.equal(ctrl.drop(b1.slotGUID),false);
 assert.equal(ctrl.drop(null),false);
 assert.ok(ctrl.state);
 // Cancel restores glow and exits transit.
 assert.equal(ctrl.cancel(),true);
 assert.equal(ctrl.state,null);
 assert.deepEqual(movingCalls.at(-1),[b1.id,false]);
 assert.deepEqual(transitCalls.at(-1),[]);
 // Drop on valid target slot relocates once and closes transit.
 assert.equal(ctrl.begin({kind:'baby',babyId:b1.id}),true);
 const target=emptyIds[1];
 assert.equal(ctrl.drop(target),true);
 assert.equal(ctrl.state,null);
 assert.equal(afterCount,1);
 assert.equal(a.getSnapshot().babies[0].slotGUID,target);
 assert.deepEqual(movingCalls.at(-1),[b1.id,false]);
 assert.deepEqual(transitCalls.at(-1),[]);
 assert.deepEqual(errors,[]);
 // Full nursery refuses transit entry.
 const full=fixture();
 full.storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:slots.length,active:null,babies:slots.map((s,i)=>({id:'x'+i,speciesId:'001',slotGUID:s.GUID,hatchedAt:1}))}));
 const fullModel=full.create();
 const fullCtrl=createBabyMoveController({getModel:()=>fullModel,renderer});
 assert.equal(fullCtrl.begin({kind:'baby',babyId:'x0'}),false);
 assert.equal(fullCtrl.state,null);
});
test('renderer setTransitSlots places Select reticles on getEmptySlots only and slotAt hits projected outer radius',async()=>{
 class Container{children=[];position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};addChild(...cs){this.children.push(...cs);return cs[0];}destroy(){}}
 class SimpleMesh{constructor(t,v,u,i){this.texture=t;this.vertices=v;this.uvs=u;this.indices=i;this.position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};this.scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};this.geometry={getBuffer:()=>({update(){}}),addAttribute(){return this;}};}destroy(){}}
 class Mesh extends SimpleMesh{constructor(g,s){super({},g.vertices,g.uvs,g.indices);this.geometry=g;this.shader=s;}}
 class MeshGeometry{constructor(v,u,i){this.vertices=v;this.uvs=u;this.indices=i;}addAttribute(){return this;}getBuffer(){return {update(){}};}}
 class Sprite{anchor={set(){}};position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};destroy(){}}
 const PIXI={Container,SimpleMesh,Mesh,MeshGeometry,Sprite,Texture:{WHITE:{}},Shader:{from:(_v,_f,u)=>({uniforms:{...u}})},BLEND_MODES:{NORMAL:0,NORMAL_NPM:0,ADD:1},ALPHA_MODES:{NPM:0}};
 const f=fixture(),h=f.create();
 hatched(f,h);const b1=h.move();
 const emptyIds=h.getEmptySlots().map(s=>s.GUID);
 const entries=[],renderer=createHatcheryRenderer({PIXI,map,bounds:null,entries,sortScene:()=>{},invalidate:()=>{},loadTexture:async()=>({baseTexture:{alphaMode:1,width:1024,height:1024},width:1024,height:1024})});
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const buf=fs.readFileSync(new URL('../../public'+url,import.meta.url));return {ok:true,json:async()=>JSON.parse(buf.toString('utf8')),text:async()=>buf.toString('utf8'),arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};};
 try{
  await renderer.sync(h.getSnapshot(),catalog);
  renderer.setTransitSlots(emptyIds);
  const reticles=entries.filter(e=>e.kind==='slot-reticle');
  assert.deepEqual(reticles.map(r=>r.ownerSlotGUID),emptyIds);
  assert.equal(reticles.some(r=>r.ownerSlotGUID===b1.slotGUID),false);
  const pick=reticles[0],screen={width:1280,height:720},camera={x:pick.item.XPos,y:pick.item.YPos,z:-25,fov:30};
  const proj=projectItem(pick.item,pick.layerZ,camera,screen);
  const center={x:proj.x+RETICLE_SPEC.outerCircle.offset.x*proj.scale,y:proj.y-RETICLE_SPEC.outerCircle.offset.y*proj.scale};
  assert.equal(renderer.slotAt(center,camera,screen),pick.ownerSlotGUID);
  assert.equal(renderer.slotAt({x:center.x+500,y:center.y+500},camera,screen),null);
  renderer.setTransitSlots([]);
  renderer.update(.1,false);
  assert.equal(renderer.slotAt(center,camera,screen),null,'cleared transitSlots disables slotAt immediately');
 }finally{globalThis.fetch=oldFetch;}
});
test('renderer sync updates reused baby placement and companions when slotGUID changes without rebuilding entry',async()=>{
 class Container{children=[];position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};addChild(...cs){this.children.push(...cs);return cs[0];}destroy(){}}
 class SimpleMesh{constructor(t,v,u,i){this.texture=t;this.vertices=v;this.uvs=u;this.indices=i;this.position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};this.scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};this.geometry={getBuffer:()=>({update(){}}),addAttribute(){return this;}};}destroy(){}}
 class Mesh extends SimpleMesh{constructor(g,s){super({},g.vertices,g.uvs,g.indices);this.geometry=g;this.shader=s;}}
 class MeshGeometry{constructor(v,u,i){this.vertices=v;this.uvs=u;this.indices=i;}addAttribute(){return this;}getBuffer(){return {update(){}};}}
 class Sprite{anchor={set(){}};position={x:0,y:0,set(x,y=x){this.x=x;this.y=y;}};scale={x:1,y:1,set(x,y=x){this.x=x;this.y=y;}};destroy(){}}
 const PIXI={Container,SimpleMesh,Mesh,MeshGeometry,Sprite,Texture:{WHITE:{}},Shader:{from:(_v,_f,u)=>({uniforms:{...u}})},BLEND_MODES:{NORMAL:0,NORMAL_NPM:0,ADD:1},ALPHA_MODES:{NPM:0}};
 const f=fixture(),h=f.create(),sp001=catalog.species.find(s=>s.id==='001');
 hatched(f,h);const b1=h.move();
 const nextSlot=h.getEmptySlots().find(s=>s.GUID!==b1.slotGUID);
 assert.ok(nextSlot);
 let sortCalls=0;
 const entries=[],renderer=createHatcheryRenderer({PIXI,map,bounds:null,entries,sortScene:()=>{sortCalls++;},invalidate:()=>{},loadTexture:async()=>({baseTexture:{alphaMode:1,width:1024,height:1024},width:1024,height:1024})});
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async url=>{const buf=fs.readFileSync(new URL('../../public'+url,import.meta.url));return {ok:true,json:async()=>JSON.parse(buf.toString('utf8')),text:async()=>buf.toString('utf8'),arrayBuffer:async()=>buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)};};
 try{
  await renderer.sync(h.getSnapshot(),catalog);
  const baby=entries.find(e=>e.actorId===b1.id&&e.kind==='baby'),glow=entries.find(e=>e.kind==='baby-glow'&&e.ownerId===b1.id),particles=entries.find(e=>e.kind==='baby-particles'&&e.ownerId===b1.id),reticle=entries.find(e=>e.kind==='baby-reticle'&&e.ownerId===b1.id);
  assert.ok(baby&&glow&&particles&&reticle);
  const originalGuid=baby.item.GUID;
  const sortBefore=sortCalls;
  h.moveBaby(b1.id,nextSlot.GUID);
  await renderer.sync(h.getSnapshot(),catalog);
  assert.ok(sortCalls>sortBefore,'sync calls sortScene after moving baby');
  const reused=entries.find(e=>e.actorId===b1.id&&e.kind==='baby');
  assert.equal(reused,baby,'reuses same baby entry object without rebuild');
  assert.equal(reused.item.GUID,originalGuid);
  assert.equal(reused.item.XPos,nextSlot.XPos);
  assert.equal(reused.item.YPos,nextSlot.YPos);
  assert.equal(reused.item.ZPos,nextSlot.ZPos);
  assert.equal(reused.item.LayerID,nextSlot.LayerID);
  assert.equal(reused.item.scaleX,nextSlot.scaleX*sp001.babyScale);
  assert.equal(reused.item.scaleY,nextSlot.scaleY*sp001.babyScale);
  const expectedLayerZ=map.LayerData.find(l=>l.name===nextSlot.LayerID).ZPos;
  assert.equal(reused.layerZ,expectedLayerZ);
  renderer.update(.1,false);
  assert.equal(glow.item.XPos,nextSlot.XPos);
  assert.equal(glow.item.YPos,nextSlot.YPos);
  assert.equal(glow.layerZ,expectedLayerZ);
  assert.equal(particles.item.XPos,nextSlot.XPos);
  assert.equal(particles.item.YPos,nextSlot.YPos);
  assert.equal(particles.layerZ,expectedLayerZ);
  assert(Math.abs(reticle.item.XPos-nextSlot.XPos)<2,'reticle moves to the new baby position');
  assert(reticle.item.YPos>nextSlot.YPos,'reticle is centered above the new slot');
  assert.equal(reticle.projectionZPos,nextSlot.ZPos);
  assert.equal(reticle.layerZ,expectedLayerZ);
 }finally{globalThis.fetch=oldFetch;}
});
test('egg new-species glow only triggers on first summon of an undiscovered species and migration seeds summon counts',()=>{
 const f=fixture();
 f.options.catalog={...catalog,pools:[{summonsTier:0,pool:[{key:'001',entries:1}]}]};
 const h=f.create();
 const egg1=hatched(f,h);
 assert.equal(egg1.alreadySummoned,false);
 assert.equal(h.getSnapshot().speciesSummonCounts['001'],1);
 assert.equal(eggNewSpeciesGlow(egg1),true);
 assert.equal(eggNewSpeciesGlow(egg1,['001']),false);
 h.move();
 const egg2=h.summon();
 assert.equal(h.getSnapshot().speciesSummonCounts['001'],2);
 assert.equal(egg2.alreadySummoned,true);
 assert.equal(eggNewSpeciesGlow(egg2),false);
 // Migration from save with summonedSpecies but no speciesSummonCounts seeds 1 per species; next summon -> 2 -> no glow.
 const slot=map.MapItemData.find(i=>i.isMarker&&i.SymbolID==='Egg_Slot');
 const mf=fixture();
 mf.options.catalog={...catalog,pools:[{summonsTier:0,pool:[{key:'001',entries:1}]}]};
 mf.storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[{id:'b1',speciesId:'001',slotGUID:slot.GUID,hatchedAt:100}],adults:[],summonedSpecies:['001'],maturedSpecies:[]}));
 const mh=mf.create();
 assert.deepEqual(mh.getSnapshot().speciesSummonCounts,{'001':1});
 const eggNext=mh.summon();
 assert.equal(mh.getSnapshot().speciesSummonCounts['001'],2);
 assert.equal(eggNext.alreadySummoned,true);
 assert.equal(eggNewSpeciesGlow(eggNext),false);
 const bad=JSON.stringify({version:2,summoned:0,active:null,babies:[],speciesSummonCounts:{'001':-1}});
 mf.storage.setItem(HATCHERY_KEY,bad);
 assert.throws(()=>mf.create(),/อ่านข้อมูล/);
 assert.equal(mf.storage.getItem(HATCHERY_KEY),bad);
 assert.equal(eggGlowStart(),EGG_ARRIVAL_END_SECONDS+1);
});
