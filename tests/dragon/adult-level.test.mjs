import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {adultLevelFill,creditDragonBerry} from '../../lib/dragon/adult-level.mjs';
import {adultStatusMenu} from '../../lib/dragon/native-adult-status.mjs';
import {createHatchery,HATCHERY_KEY,nectarTargetForSpecies,adultWaitSeconds,adultCoinReward} from '../../lib/dragon/hatchery.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url))),map=JSON.parse(fs.readFileSync(new URL('../../public/dragon/data/source-map.json',import.meta.url))),sp=catalog.species[0];
function fixture(){const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},slot=map.MapItemData.find(i=>i.SymbolID==='Egg_Slot'),perch=map.MapItemData.find(i=>i.SymbolID==='PerchMarker_Branch');storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[],adults:[{id:'level',speciesId:sp.id,originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:0,flyUntil:0,level:0,nectar:0,coinStampedAt:0}]}));return {storage,model:createHatchery({catalog,map,storage,now:()=>10000})};}
test('real berry credits cross all five levels, update collision eligibility immediately and survive reload',()=>{
 const {model,storage}=fixture(),dragon={actorId:'level',adult:model.getSnapshot().adults[0],control:{}};
 for(let level=0;level<5;level++){
  const target=nectarTargetForSpecies(sp,level);
  for(let n=1;n<=target;n++){const r=creditDragonBerry(model,dragon);assert.equal(r.credited,1);assert.equal(dragon.adult.level,n===target?level+1:level);}
  assert.equal(dragon.adult.nectar,0);assert.equal(dragon.adult.levelUpAt,10000);
  assert.equal(dragon.adult.reward,adultCoinReward(sp,level+1));assert.equal(dragon.adult.coinReadyAt,10000+adultWaitSeconds(sp,level+1)*1000);
 }
 assert.equal(creditDragonBerry(model,dragon).credited,0);
 const restored=createHatchery({catalog,map,storage,now:()=>20000}).getSnapshot().adults[0];assert.equal(restored.level,5);assert.equal(restored.levelUpAt,10000);assert.equal(adultLevelFill(restored.levelUpAt,20000),0,'reload does not replay completed effects');
});
test('native fill sequence keeps opacity while returning the original colors',()=>{assert.equal(adultLevelFill(undefined,0),0);assert.equal(adultLevelFill(1000,999),0);assert.equal(adultLevelFill(1000,1125),.5);assert.equal(adultLevelFill(1000,1250),1);assert.equal(adultLevelFill(1000,3000),.5);assert.equal(adultLevelFill(1000,4750),0);});
test('native adult status uses the Moth layout, live nectar fill, pips and maximum indicator',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/native-adult-status.json',import.meta.url))),{model}=fixture();const adult={...model.getSnapshot().adults[0],level:2,nectar:3,target:10};
 const menu=adultStatusMenu(source,adult,sp),b=menu.bindings;assert.equal(menu.nodes.find(n=>n.id===b.progressFill).anchorMax.x,.3);assert.equal(menu.nodes.find(n=>n.id===8202).children.filter(id=>menu.nodes.find(n=>n.id===id).active).length,2);
 const max=adultStatusMenu(source,{...adult,level:5,target:0},sp);assert.equal(max.nodes.find(n=>n.id===6329).active,true);assert.equal(max.texts.find(t=>t.node===b.progressLabel).text,'MAX');assert.notEqual(source.nodes.find(n=>n.id===b.progressFill).anchorMax.x,.3,'source layout remains immutable');
});
