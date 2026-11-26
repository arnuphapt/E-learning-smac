import {feedingView,feedingDeadlines} from './baby-feeding.mjs';
// Gameplay state is independent of source scene data and Dev layout overrides.
export const HATCHERY_KEY='dragon-base:hatchery:v2',LEGACY_HATCHERY_KEY='dragon-base:hatchery:v1';
export const ADULT_MAX_LEVEL=5;
export const isSpeciesDiscovered=(maturedSpecies,speciesId)=>Array.isArray(maturedSpecies)&&maturedSpecies.includes(speciesId);
export const isSpeciesAlreadySummoned=(speciesSummonCounts,speciesId,speciesLayCounts=null)=>((speciesSummonCounts?.[speciesId]??0)>1)||((speciesLayCounts?.[speciesId]??0)>1);
export const NECTAR_RARITY_MULT={COMMON:7,UNCOMMON:10,RARE:15,EPIC:20,LEGENDARY:24};
const clone=value=>JSON.parse(JSON.stringify(value));
export function roundHalfEven(x){
 const n=Math.floor(x),f=x-n;
 if(Math.abs(f-.5)<1e-9)return n%2===0?n:n+1;
 return Math.round(x);
}
export function nectarTargetForSpecies(species,level){
 if(level>=ADULT_MAX_LEVEL)return 0;
 const mult=NECTAR_RARITY_MULT[String(species?.rarity).toUpperCase()];
 if(!mult)throw Error('ไม่พบความหายากของสายพันธุ์');
 return Math.ceil((species.nectarTargetConstant??1)*(level+1)*mult);
}
export function adultWaitSeconds(species,level){
 const minutes=species?.sourceGrowthWaits?.[level]??species?.['stageWait'+level]??0;
 return Math.max(0,roundHalfEven(minutes*60));
}
export function adultCoinReward(species,level){
 return species?.stageYields?.[level]??species?.['stageYeild'+level]??0;
}
// INFERRED: baby has no adult level, so feed reward uses stageYields[0] (level 0) and half-up rounding (exact native rounding helper unresolved).
export function babyFeedReward(species){
 return Math.round(adultCoinReward(species,0)*0.25);
}
export function adultEconomy(adult,species,time){
 const level=adult.level??0,nectar=adult.nectar??0,target=nectarTargetForSpecies(species,level);
 const waitSeconds=adultWaitSeconds(species,level),coinReadyAt=(adult.coinStampedAt??0)+waitSeconds*1000;
 return {level,nectar,target,coinReadyAt,ready:time>=coinReadyAt,reward:adultCoinReward(species,level)};
}
export function createHatchery({catalog,map,storage,wallet=null,expansions=null,now=()=>Date.now(),random=()=>Math.random(),makeId=()=>globalThis.crypto.randomUUID()}){
 const species=new Map(catalog.species.map(s=>[s.id,s])),incubator=map.MapItemData.find(i=>i.SymbolID==='IncubatorEggMarker');
 const slots=map.MapItemData.filter(i=>i.isMarker&&i.SymbolID==='Egg_Slot').sort((a,b)=>Math.hypot(a.XPos-incubator.XPos,a.YPos-incubator.YPos)-Math.hypot(b.XPos-incubator.XPos,b.YPos-incubator.YPos)),slotIds=new Set(slots.map(s=>s.GUID)),listeners=new Set();
 const perches=map.MapItemData.filter(i=>i.isMarker&&['PerchMarker_Branch','PerchMarker_Ground'].includes(i.SymbolID)),perchIds=new Set(perches.map(p=>p.GUID));
 // Native GrowSpotEntity.CanBeTransitTarget also requires the paired Pupa slot to be empty; the JS has no pupa stage, so Egg_Slot emptiness is enough.
 function emptySlotList(d=data){
  const used=new Set(d.babies.map(b=>b.slotGUID));
  if(d.active?.slotGUID)used.add(d.active.slotGUID);
  return slots.filter(s=>!used.has(s.GUID)&&(!expansions||expansions.isSlotOpen(s)));
 }
 const initial=()=>({version:2,summoned:0,active:null,babies:[],adults:[],summonedSpecies:[],speciesSummonCounts:{},maturedSpecies:[]});
 function validate(d,version=2){
  if(d?.version!==version||!Number.isSafeInteger(d.summoned)||d.summoned<0||!Array.isArray(d.babies)||d.babies.length>slots.length)throw Error('ข้อมูลฟักไข่ไม่ถูกต้อง');
  if(d.summonedSpecies!==undefined&&(!Array.isArray(d.summonedSpecies)||d.summonedSpecies.some(id=>!species.has(id))||new Set(d.summonedSpecies).size!==d.summonedSpecies.length))throw Error('ประวัติสายพันธุ์ไม่ถูกต้อง');
  if(d.speciesSummonCounts!==undefined&&(!d.speciesSummonCounts||typeof d.speciesSummonCounts!=='object'||Array.isArray(d.speciesSummonCounts)||Object.entries(d.speciesSummonCounts).some(([id,c])=>!species.has(id)||!Number.isSafeInteger(c)||c<0)))throw Error('ประวัติจำนวนอัญเชิญสายพันธุ์ไม่ถูกต้อง');
  if(d.maturedSpecies!==undefined&&(!Array.isArray(d.maturedSpecies)||d.maturedSpecies.some(id=>!species.has(id))||new Set(d.maturedSpecies).size!==d.maturedSpecies.length))throw Error('ประวัติสายพันธุ์ที่โตแล้วไม่ถูกต้อง');
  if(d.active?.isNewSpecies!==undefined&&typeof d.active.isNewSpecies!=='boolean')throw Error('ข้อมูลเอฟเฟกต์ไข่ไม่ถูกต้อง');
  if(d.active?.alreadySummoned!==undefined&&typeof d.active.alreadySummoned!=='boolean')throw Error('ข้อมูลเอฟเฟกต์ไข่ไม่ถูกต้อง');
  const ids=new Set(),occupied=new Set(),occupiedPerches=new Set();
  if(d.adults!==undefined&&!Array.isArray(d.adults))throw Error('ข้อมูลมังกรโตไม่ถูกต้อง');
  for(const a of d.adults??[]){
   if(typeof a.id!=='string'||ids.has(a.id)||!species.has(a.speciesId)||!slotIds.has(a.originSlotGUID)||!perchIds.has(a.perchGUID)||(a.perchReserved!==false&&occupiedPerches.has(a.perchGUID))||(a.perchReserved!==undefined&&typeof a.perchReserved!=='boolean')||(a.perchReserved===false&&(!a.flightPosition||!['x','y','z'].every(k=>Number.isFinite(a.flightPosition[k]))||typeof a.flightPosition.layerID!=='string'))||!Number.isFinite(a.maturedAt)||!Number.isFinite(a.flyUntil)||a.flyUntil<a.maturedAt||(a.hoverUntil!==undefined&&(!Number.isFinite(a.hoverUntil)||a.hoverUntil<a.maturedAt||a.hoverUntil>a.flyUntil)))throw Error('ข้อมูลมังกรโตไม่ถูกต้อง');
   if(version===2&&(a.level!==undefined||a.nectar!==undefined||a.coinStampedAt!==undefined)&&(!Number.isInteger(a.level)||a.level<0||a.level>ADULT_MAX_LEVEL||!Number.isSafeInteger(a.nectar)||a.nectar<0||!Number.isFinite(a.coinStampedAt)))throw Error('ข้อมูลมังกรโตไม่ถูกต้อง');
   if(a.levelUpAt!==undefined&&!Number.isFinite(a.levelUpAt))throw Error('Invalid dragon level-up time');
   ids.add(a.id);if(a.perchReserved!==false)occupiedPerches.add(a.perchGUID);
  }
  for(const b of d.babies){
   if(typeof b.id!=='string'||ids.has(b.id)||!species.has(b.speciesId)||!slotIds.has(b.slotGUID)||occupied.has(b.slotGUID)||!Number.isFinite(b.hatchedAt))throw Error('ข้อมูลรังไม่ถูกต้อง');
   if(b.growth!==undefined){const g=b.growth;if(!g||!Number.isInteger(g.feeds)||g.feeds<1||g.feeds>5||!['fedAt','eatDoneAt','digestUntil','readyAt'].every(k=>Number.isFinite(g[k]))||g.eatDoneAt<g.fedAt||g.digestUntil<g.eatDoneAt||g.readyAt<g.digestUntil)throw Error('ข้อมูลการให้อาหารไม่ถูกต้อง');}
   if(b.maturing!==undefined){const m=b.maturing;if(b.growth?.feeds!==5||!Number.isFinite(m.startedAt)||!Number.isFinite(m.doneAt)||m.doneAt<m.startedAt||!perchIds.has(m.perchGUID)||occupiedPerches.has(m.perchGUID))throw Error('ข้อมูลการโตไม่ถูกต้อง');occupiedPerches.add(m.perchGUID);}
   ids.add(b.id);occupied.add(b.slotGUID);
  }
  if(d.active){
   const a=d.active;
   if(typeof a.id!=='string'||ids.has(a.id)||!species.has(a.speciesId)||!slotIds.has(a.slotGUID)||occupied.has(a.slotGUID)||!['summoning','arriving','incubating','hatching','hatched'].includes(a.phase)||!Number.isFinite(a.startedAt)||!Number.isFinite(a.readyAt)||a.readyAt<a.startedAt||(a.phase==='summoning'&&(!Number.isFinite(a.summonAt)||!Number.isFinite(a.summonDoneAt)||a.summonDoneAt<a.summonAt||a.startedAt<a.summonDoneAt))||(a.phase==='arriving'&&!Number.isFinite(a.appearanceAt))||(a.appearanceAt!==undefined&&(!Number.isFinite(a.appearanceAt)||a.appearanceAt>a.startedAt))||((a.phase==='hatching'||a.phase==='hatched')&&(!Number.isFinite(a.hatchAt)||!Number.isFinite(a.hatchDoneAt)||a.hatchDoneAt<a.hatchAt)))throw Error('ข้อมูลไข่ไม่ถูกต้อง');
  }
  return d;
 }
 function finalizeRead(d){
  d.adults=(d.adults??[]).map(a=>a.level===undefined&&a.nectar===undefined&&a.coinStampedAt===undefined?{...a,level:0,nectar:0,coinStampedAt:now()}:a);
  d.maturedSpecies=[...new Set([...(d.maturedSpecies??[]),...d.adults.map(a=>a.speciesId)])];
  const known=new Set([...(d.summonedSpecies??[]),...d.babies.map(b=>b.speciesId),...d.adults.map(a=>a.speciesId)]);
  if(d.active)known.add(d.active.speciesId);
  d.summonedSpecies=[...known];
  const counts={};for(const id of d.summonedSpecies)counts[id]=1;
  for(const [id,c] of Object.entries(d.speciesSummonCounts??{}))if(species.has(id)&&c>0)counts[id]=Math.max(counts[id]??0,c);
  d.speciesSummonCounts=counts;
  return d;
 }
 function migrateV1(d){
  validate(d,1);
  const time=now();
  return finalizeRead({...d,version:2,adults:(d.adults??[]).map(a=>({...a,level:0,nectar:0,coinStampedAt:time}))});
 }
 function read(){
  let raw=storage.getItem(HATCHERY_KEY);
  if(!raw){
   const legacy=storage.getItem(LEGACY_HATCHERY_KEY);
   if(legacy){
    let migrated;
    try{migrated=migrateV1(JSON.parse(legacy));}catch{throw Error('อ่านข้อมูลฟักไข่ที่บันทึกไว้ไม่ได้ ข้อมูลเดิมยังไม่ถูกเขียนทับ');}
    try{storage.setItem(HATCHERY_KEY,JSON.stringify(migrated));}catch{}
    return migrated;
   }
   return initial();
  }
  try{
   const parsed=JSON.parse(raw);
   if(parsed?.version===1){const migrated=migrateV1(parsed);try{storage.setItem(HATCHERY_KEY,JSON.stringify(migrated));}catch{}return migrated;}
   return finalizeRead(validate(parsed,2));
  }catch{throw Error('อ่านข้อมูลฟักไข่ที่บันทึกไว้ไม่ได้ ข้อมูลเดิมยังไม่ถูกเขียนทับ');}
 }
 let data=read(),snapshot;
 function view(){
  const time=now(),active=data.active?{...data.active,discovered:isSpeciesDiscovered(data.maturedSpecies,data.active.speciesId),isNewSpecies:!isSpeciesDiscovered(data.maturedSpecies,data.active.speciesId),alreadySummoned:isSpeciesAlreadySummoned(data.speciesSummonCounts,data.active.speciesId),status:data.active.phase==='summoning'?'summoning':data.active.phase==='arriving'?'arriving':data.active.phase==='hatched'?'hatched':data.active.phase==='hatching'?'hatching':time>=data.active.readyAt?'ready':'incubating',remainingMs:Math.max(0,data.active.readyAt-time)}:null;
  return {...clone(data),babies:data.babies.map(b=>({...clone(b),discovered:isSpeciesDiscovered(data.maturedSpecies,b.speciesId),isNewSpecies:!isSpeciesDiscovered(data.maturedSpecies,b.speciesId),feeding:feedingView(b,time)})),adults:data.adults.map(a=>({...clone(a),...adultEconomy(a,species.get(a.speciesId),time)})),active,capacity:slots.filter(s=>!expansions||expansions.isSlotOpen(s)).length};
 }
 function emit(){snapshot=view();for(const fn of listeners)fn(snapshot);}
 function save(next){validate(next,2);try{storage.setItem(HATCHERY_KEY,JSON.stringify(next));}catch{throw Error('บันทึกการฟักไข่ไม่ได้ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์');}data=next;emit();}
 function weighted(items){const total=items.reduce((s,i)=>s+i.weight,0);if(total<=0)throw Error('ไม่พบสายพันธุ์ในกลุ่มอัญเชิญ');let pick=Math.min(1-Number.EPSILON,Math.max(0,random()))*total;for(const i of items){pick-=i.weight;if(pick<0)return i.value;}return items.at(-1).value;}
 function chooseSpecies(){const rules=catalog.pools.filter(p=>p.summonsTier<=data.summoned&&p.pool.some(e=>species.has(e.key)||e.key==='dupe'||e.key==='new')).sort((a,b)=>b.summonsTier-a.summonsTier),rule=rules[0],key=rule?weighted(rule.pool.map(e=>({value:e.key,weight:e.entries}))):'new';if(species.has(key))return key;let candidates=catalog.species.filter(s=>catalog.normalSets.includes(s.region));const owned=new Set([...data.babies.map(b=>b.speciesId),...data.adults.map(a=>a.speciesId)]);const preferred=candidates.filter(s=>key==='dupe'?owned.has(s.id):!owned.has(s.id));if(preferred.length)candidates=preferred;const rarities=catalog.rarities.filter(r=>candidates.some(s=>s.rarity===r.id));const rarity=weighted(rarities.map(r=>({value:r.id,weight:r.weight}))),pool=candidates.filter(s=>s.rarity===rarity);return pool[Math.min(pool.length-1,Math.floor(Math.max(0,Math.min(1-Number.EPSILON,random()))*pool.length))].id;}
 function tick(){
  data=read();const a=data.active;let next;
  if(a?.phase==='summoning'&&now()>=a.summonDoneAt){next=clone(data);next.active.phase=now()<a.startedAt?'arriving':'incubating';}
  else if(a?.phase==='arriving'&&now()>=a.startedAt){next=clone(data);next.active.phase='incubating';}
  else if(a?.phase==='hatching'&&now()>=a.hatchDoneAt){next=clone(data);next.active.phase='hatched';}
  for(const baby of data.babies){if(!baby.maturing||now()<baby.maturing.doneAt)continue;next??=clone(data);const [min,max]=catalog.adult.spawnHoverRangeSeconds??[5,8],hoverUntil=baby.maturing.doneAt+(min+Math.min(max-min-1,Math.floor(random()*(max-min))))*1000;next.adults.push({id:'adult-'+baby.id,speciesId:baby.speciesId,originSlotGUID:baby.slotGUID,perchGUID:baby.maturing.perchGUID,maturedAt:baby.maturing.doneAt,hoverUntil,flyUntil:hoverUntil+Math.round(catalog.adult.flightSeconds*1000),level:0,nectar:0,coinStampedAt:baby.maturing.doneAt,initialFlightPending:true});if(!next.maturedSpecies.includes(baby.speciesId))next.maturedSpecies.push(baby.speciesId);next.babies=next.babies.filter(b=>b.id!==baby.id);}
  if(next)save(next);else emit();return snapshot;
 }
 emit();
 return {subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>snapshot,tick,
  isDiscovered(speciesId){return isSpeciesDiscovered(data.maturedSpecies,speciesId);},
  getAdultStatus(id){const a=data.adults.find(x=>x.id===id);return a?adultEconomy(a,species.get(a.speciesId),now()):null;},
  summon(){tick();if(data.active)throw Error('แท่นกำลังดูแลไข่อยู่');const occupied=new Set(data.babies.map(b=>b.slotGUID)),slot=emptySlotList(data)[0];if(!slot)throw Error('รังเต็มแล้ว');const time=now(),summonMs=Math.round(catalog.summoning.durationSeconds*1000),arrivalMs=Math.round((catalog.summoning.arrivalSeconds||0)*1000),duration=data.summoned===0?catalog.config.firstHatchSeconds:catalog.config.hatchSeconds,next=clone(data),speciesId=chooseSpecies();next.active={id:makeId(),speciesId,slotGUID:slot.GUID,phase:'summoning',summonAt:time,summonDoneAt:time+summonMs,appearanceAt:time+summonMs,startedAt:time+summonMs+arrivalMs,readyAt:time+summonMs+arrivalMs+duration*1000};next.summonedSpecies=[...new Set([...next.summonedSpecies,speciesId])];next.speciesSummonCounts={...(next.speciesSummonCounts??{}),[speciesId]:(next.speciesSummonCounts?.[speciesId]??0)+1};next.summoned++;save(next);return snapshot.active;},
  getEmptySlots(){data=read();return emptySlotList(data).map(s=>({...s}));},
  canMove(){return this.getEmptySlots().length>0;},
  move(slotGUID){tick();if(data.active?.phase!=='hatched')throw Error('ยังไม่มีลูกมังกรพร้อมย้าย');const next=clone(data),a=next.active;let targetSlot=a.slotGUID;if(slotGUID!==undefined){if(!slotIds.has(slotGUID))throw Error('ไม่พบช่องรังที่เลือก');const empty=new Set(emptySlotList(data).map(s=>s.GUID));if(slotGUID!==a.slotGUID&&!empty.has(slotGUID))throw Error('ช่องรังนี้ไม่ว่าง');targetSlot=slotGUID;}next.babies.push({id:'baby-'+a.id,speciesId:a.speciesId,slotGUID:targetSlot,hatchedAt:a.hatchDoneAt});next.active=null;save(next);return snapshot.babies.at(-1);},
  moveBaby(id,slotGUID){tick();const baby=data.babies.find(b=>b.id===id);if(!baby)throw Error('ไม่พบมังกรตัวนี้ในรัง');if(baby.maturing)throw Error('ลูกมังกรกำลังโตอยู่ ย้ายไม่ได้');if(!slotIds.has(slotGUID))throw Error('ไม่พบช่องรังที่เลือก');const empty=new Set(emptySlotList(data).map(s=>s.GUID));if(!empty.has(slotGUID))throw Error('ช่องรังนี้ไม่ว่าง');const next=clone(data);next.babies.find(b=>b.id===id).slotGUID=slotGUID;save(next);return snapshot.babies.find(b=>b.id===id);},
  matureBaby(id){data=read();const baby=data.babies.find(b=>b.id===id);if(!baby)throw Error('ไม่พบมังกรตัวนี้ในรัง');if(feedingView(baby,now()).status!=='mature-ready')throw Error('ลูกมังกรยังไม่พร้อมโต');const occupied=new Set([...data.adults.filter(a=>a.perchReserved!==false).map(a=>a.perchGUID),...data.babies.filter(b=>b.maturing).map(b=>b.maturing.perchGUID)]),slot=slots.find(s=>s.GUID===baby.slotGUID),perch=perches.filter(p=>!occupied.has(p.GUID)&&(!expansions||expansions.isSlotOpen(p))).sort((a,b)=>Math.hypot(a.XPos-slot.XPos,a.YPos-slot.YPos)-Math.hypot(b.XPos-slot.XPos,b.YPos-slot.YPos))[0];if(!perch)throw Error('พื้นที่สำหรับมังกรโตเต็มแล้ว');const next=clone(data),target=next.babies.find(b=>b.id===id),time=now(),family=catalog.feeding.families[species.get(baby.speciesId).family];target.maturing={startedAt:time,doneAt:time+Math.round(family.animations['Stage5/Transition']*1000),perchGUID:perch.GUID};save(next);return snapshot.babies.find(b=>b.id===id);},
  feedBaby(id,targetWallet=wallet){data=read();const baby=data.babies.find(b=>b.id===id);if(!baby)throw Error('ไม่พบมังกรตัวนี้ในรัง');const sp=species.get(baby.speciesId),status=feedingView(baby,now());if(status.status==='mature-ready')throw Error('ลูกมังกรกินครบแล้ว พร้อมโต');if(status.status!=='hungry')throw Error('ลูกมังกรกำลังกินหรือพักย่อยอาหาร');const next=clone(data),target=next.babies.find(b=>b.id===id);target.growth=feedingDeadlines(baby,sp,catalog,now());save(next);const reward=babyFeedReward(sp);if(reward>0&&targetWallet)targetWallet.credit('SC',reward);const updated=snapshot.babies.find(b=>b.id===id);return updated?{...updated,reward}:updated;},
  creditAdultNectar(id,amount=1){
   if(!Number.isSafeInteger(amount)||amount<0)throw Error('จำนวนน้ำหวานไม่ถูกต้อง');
   data=read();const current=data.adults.find(a=>a.id===id);if(!current)throw Error('ไม่พบมังกร');
   if((current.level??0)>=ADULT_MAX_LEVEL)return {credited:0,leftover:amount,leveledUp:false,adult:snapshot.adults.find(a=>a.id===id)};
   const next=clone(data),a=next.adults.find(x=>x.id===id),sp=species.get(a.speciesId),time=now();
   let rem=amount,leveledUp=false;
   while(rem>0&&a.level<ADULT_MAX_LEVEL){
    const target=nectarTargetForSpecies(sp,a.level),need=Math.max(0,target-a.nectar);
    if(rem<need){a.nectar+=rem;rem=0;break;}
    rem-=need;a.level++;a.nectar=0;a.coinStampedAt=time;a.levelUpAt=time;leveledUp=true;
   }
   save(next);return {credited:amount-rem,leftover:rem,leveledUp,adult:snapshot.adults.find(x=>x.id===id)};
  },
  harvestAdult(id,targetWallet=wallet){
   data=read();const current=data.adults.find(a=>a.id===id);if(!current)throw Error('ไม่พบมังกร');
   const time=now(),sp=species.get(current.speciesId),eco=adultEconomy(current,sp,time);
   if(!eco.ready)return {harvested:false,reward:0,adult:snapshot.adults.find(a=>a.id===id)};
   if(eco.reward>0&&!targetWallet)throw Error('ไม่พบกระเป๋าเงิน');
   const next=clone(data),a=next.adults.find(x=>x.id===id);a.coinStampedAt=time;
   save(next);if(eco.reward>0)targetWallet.credit('SC',eco.reward);
   return {harvested:true,reward:eco.reward,adult:snapshot.adults.find(a=>a.id===id)};
  },
  releaseAdultPerch(id,position){data=read();if(!data.adults.some(a=>a.id===id))throw Error('Unknown adult');if(!position||!['x','y','z'].every(k=>Number.isFinite(position[k]))||typeof position.layerID!=='string')throw Error('Invalid flight position');const next=clone(data),target=next.adults.find(a=>a.id===id);target.perchReserved=false;delete target.initialFlightPending;target.flightPosition={x:position.x,y:position.y,z:position.z,layerID:position.layerID};return save(next);},
  setAdultPerch(id,perchGUID){data=read();if(!perchIds.has(perchGUID))throw Error('ไม่พบจุดเกาะ');const adult=data.adults.find(a=>a.id===id);if(!adult)throw Error('ไม่พบมังกร');if(data.adults.some(a=>a.id!==id&&a.perchReserved!==false&&a.perchGUID===perchGUID)||data.babies.some(b=>b.maturing?.perchGUID===perchGUID))throw Error('จุดเกาะถูกใช้งานแล้ว');if(adult.perchReserved!==false&&adult.perchGUID===perchGUID&&adult.flyUntil<=now()&&!adult.initialFlightPending)return snapshot;const next=clone(data),target=next.adults.find(a=>a.id===id);target.perchGUID=perchGUID;target.perchReserved=true;delete target.initialFlightPending;delete target.flightPosition;target.flyUntil=Math.min(target.flyUntil,now());target.hoverUntil=Math.min(target.hoverUntil??target.maturedAt,target.flyUntil);return save(next);},
  removeBaby(id){data=read();if(!data.babies.some(b=>b.id===id))throw Error('ไม่พบมังกรตัวนี้ในรัง');const next=clone(data);next.babies=next.babies.filter(b=>b.id!==id);save(next);},
  hatch(){tick();if(!data.active||data.active.phase!=='incubating'||now()<data.active.readyAt)throw Error('ไข่ยังไม่พร้อมฟัก');const next=clone(data),time=now();next.active.phase='hatching';next.active.hatchAt=time;next.active.hatchDoneAt=time+Math.round(species.get(next.active.speciesId).hatchAnimationSeconds*1000);save(next);return snapshot.active;}
 };
}
