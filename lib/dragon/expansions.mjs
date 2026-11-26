import {NATIVE_CURRENCY} from './generated/native-currency.mjs';
const clone=value=>structuredClone(value);
// Retain each species' highest reached level when an individual leaves the forest.
export function expansionScore(source,save,catalog,previous={}){
 const levels={...previous},species=new Map(catalog.species.map(s=>[s.id,s]));
 for(const id of save?.maturedSpecies??[])if(species.has(id))levels[id]=Math.max(levels[id]??0,0);
 for(const adult of save?.adults??[])if(species.has(adult.speciesId))levels[adult.speciesId]=Math.max(levels[adult.speciesId]??0,adult.level??0);
 let score=0;for(const [id,level]of Object.entries(levels)){const rarity=species.get(id)?.rarity?.[0];if(!rarity)continue;score+=(source.scoreRules?.['bflyScoreUnique'+rarity]??0)+Math.min(level,4)*(source.scoreRules?.['bflyScoreLeveledUp'+rarity]??0);if(level>=5)score+=source.scoreRules?.['bflyScoreMaxMax'+rarity]??0;}
 return {score,levels};
}
export function nearestExpansionRoom(source,point){const x=point.XPos??point.x,y=point.YPos??point.y;return source.rooms.reduce((a,r)=>Math.hypot(r.x-x,r.y-y)<Math.hypot(a.x-x,a.y-y)?r:a);}
export function createExpansions({source,wallet,map,hatcherySave=null,now=Date.now}){
 const roomIDs=new Set(source.rooms.map(r=>r.id)),orderMap=new Map(source.orders.map(o=>[o.roomID,o])),listeners=new Set();let data,snapshot;
 const roomAt=p=>nearestExpansionRoom(source,p).id;
 function initial(){const open=new Set(source.rooms.filter(r=>!orderMap.has(r.id)).map(r=>r.id));for(const o of source.orders)if(o.set==='1'&&o.order<=(source.initialOpenOrder??1))open.add(o.roomID);
  // Preserve occupied nursery/perch/flight positions from the previous open-map save.
  const guids=[...(hatcherySave?.babies??[]).map(b=>b.slotGUID),...(hatcherySave?.adults??[]).flatMap(a=>[a.originSlotGUID,a.perchGUID]),hatcherySave?.active?.slotGUID].filter(Boolean),targets=guids.map(id=>map.MapItemData.find(i=>i.GUID===id)).filter(Boolean);for(const a of hatcherySave?.adults??[])if(a.flightPosition)targets.push(a.flightPosition);
  const root=source.orders.find(o=>o.set==='1'&&o.order===1).roomID;
  for(const point of targets){const target=roomAt(point),queue=[root],parents=new Map([[root,null]]);for(let i=0;i<queue.length&&!parents.has(target);i++)for(const id of source.rooms.find(r=>r.id===queue[i]).neighbours)if(!parents.has(id)){parents.set(id,queue[i]);queue.push(id);}for(let id=target;id;id=parents.get(id))open.add(id);}
  return {version:1,open:[...open],chops:{},paidChops:0,clearedAt:{},scoreOpen:(source.scoreGates??[]).filter(g=>targets.some(p=>g.roomIDs?.includes(roomAt(p)))).map(g=>g.layer)};
 }
 function validate(d){if(d?.version!==1||!Array.isArray(d.open)||new Set(d.open).size!==d.open.length||d.open.some(id=>!roomIDs.has(id))||!d.chops||!Number.isSafeInteger(d.paidChops)||d.paidChops<0||!d.clearedAt)throw Error('ข้อมูลหมอกไม่ถูกต้อง');for(const [id,n]of Object.entries(d.chops))if(!roomIDs.has(id)||!Number.isInteger(n)||n<0||n>source.maxChops)throw Error('ข้อมูลการเคลียร์พื้นที่ไม่ถูกต้อง');for(const [id,time]of Object.entries(d.clearedAt))if(!roomIDs.has(id)||!Number.isFinite(time))throw Error('ข้อมูลเวลาเปิดพื้นที่ไม่ถูกต้อง');if(d.score!==undefined&&(!Number.isSafeInteger(d.score)||d.score<0))throw Error('Invalid forest score');if(d.scoreOpen!==undefined&&(!Array.isArray(d.scoreOpen)||d.scoreOpen.some(layer=>!source.scoreGates?.some(g=>g.layer===layer))))throw Error('Invalid score gate save');for(const n of Object.values(d.speciesLevels??{}))if(!Number.isInteger(n)||n<0||n>5)throw Error('Invalid species score level');for(const [layer,time]of Object.entries(d.scoreClearedAt??{}))if(!source.scoreGates?.some(g=>g.layer===layer)||!Number.isFinite(time))throw Error('Invalid score clear time');return d;}
 const baseOpened=id=>data.open.includes(id);
 const gateOpen=id=>(source.scoreGates??[]).every(g=>!g.roomIDs?.includes(id)||(data.scoreOpen??[]).includes(g.layer));
 const opened=id=>baseOpened(id)&&(source.scoreGates??[]).every(g=>!g.roomIDs?.includes(id)||(data.scoreOpen??[]).includes(g.layer));
 function activeIDs(){const result=[];const set1Done=source.orders.filter(o=>o.set==='1'&&o.primary).every(o=>baseOpened(o.roomID));for(const set of ['1',...(set1Done?['2','3','4','5']:[])]){const order=source.orders.filter(o=>o.set===set&&o.primary&&!baseOpened(o.roomID)).sort((a,b)=>a.order-b.order)[0];if(order&&gateOpen(order.roomID))result.push(order.roomID);}return result;}
 function quote(currency='SC'){const sc=source.costs[Math.min(data.paidChops,source.costs.length-1)],ratio=Math.max(NATIVE_CURRENCY.minRatio,Math.min(NATIVE_CURRENCY.maxRatio,Math.floor(sc/NATIVE_CURRENCY.dividend)));return currency==='HC'?Math.max(1,Math.ceil(sc/ratio)):sc;}
 function hcAvailable(){return source.orders.filter(o=>o.primary&&baseOpened(o.roomID)).length>=(source.hcUnlockPrimaryRooms??10);}
 function view(){const active=activeIDs();return {hcAvailable:hcAvailable(),...clone(data),score:data.score??0,scoreOpen:clone(data.scoreOpen??[]),active,costSC:quote('SC'),costHC:quote('HC'),maxChops:source.maxChops};}
 function emit(){snapshot=view();for(const f of listeners)f(snapshot);}
 const old=wallet.getExpansionProgress();data=validate(old??initial());if(!old)wallet.purchaseExpansion('SC',0,data);snapshot=view();
 const unsubscribe=wallet.subscribe(()=>{data=validate(wallet.getExpansionProgress());emit();});
 return {source,roomAt,isRoomOpen:opened,isPointOpen:p=>opened(roomAt(p)),getSnapshot:()=>snapshot,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},quote,
  isSlotOpen(p){return opened(roomAt(p));},
  syncScore(save,catalog){data=validate(wallet.getExpansionProgress());const result=expansionScore(source,save,catalog,data.speciesLevels),next=clone(data);next.score=Math.max(data.score??0,result.score);next.speciesLevels=result.levels;next.scoreOpen??=[];next.scoreClearedAt??={};for(const gate of source.scoreGates??[]){if(next.score<gate.score||next.scoreOpen.includes(gate.layer))continue;next.scoreOpen.push(gate.layer);next.scoreClearedAt[gate.layer]=now();for(const o of source.orders.filter(o=>o.set===gate.set)){if(!next.open.includes(o.roomID)){next.open.push(o.roomID);next.clearedAt[o.roomID]=now();}}}if(JSON.stringify(next)!==JSON.stringify(data))wallet.purchaseExpansion('SC',0,next);return snapshot;},
  chop(id,currency='SC'){data=validate(wallet.getExpansionProgress());if(!['SC','HC'].includes(currency))throw Error('สกุลเงินไม่ถูกต้อง');if(!activeIDs().includes(id)||opened(id))throw Error('พื้นที่นี้ยังเคลียร์ไม่ได้');if(currency==='HC'&&!hcAvailable())throw Error('Gem clearing is not unlocked yet');const cost=quote(currency),next=clone(data),n=(next.chops[id]??0)+1;next.chops[id]=n;next.paidChops++;if(n===source.maxChops){const o=orderMap.get(id);for(const r of source.orders.filter(r=>r.set===o.set&&r.order===o.order)){if(!next.open.includes(r.roomID))next.open.push(r.roomID);next.clearedAt[r.roomID]=now();}}wallet.purchaseExpansion(currency,cost,validate(next));return snapshot;},
  destroy(){unsubscribe();listeners.clear();}
 };
}

export function expansionFlightBounds(base,expansions){
 const allowed=p=>expansions.isPointOpen(p),clearSegment=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)));for(let i=1;i<=n;i++)if(!allowed({x:a.x+(b.x-a.x)*i/n,y:a.y+(b.y-a.y)*i/n}))return false;return true;};
 return {...base,contains(p,...args){return allowed(p)&&base.contains(p,...args);},accept(p,...args){return allowed(p)?base.accept(p,...args):null;},movement(current,proposed,...args){if(!clearSegment(current,proposed))return {point:current,skipNode:true};return base.movement(current,proposed,...args);}};
}
