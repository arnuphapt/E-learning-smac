import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {adultLevelFill} from '../../lib/dragon/adult-level.mjs';
import {adultStatusMenu} from '../../lib/dragon/native-adult-status.mjs';
import {createHatchery,HATCHERY_KEY} from '../../lib/dragon/hatchery.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/hatching/catalog.json',import.meta.url))),map=JSON.parse(fs.readFileSync(new URL('../../public/dragon/data/source-map.json',import.meta.url))),sp=catalog.species[0];
function fixture(){const store=new Map(),storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},slot=map.MapItemData.find(i=>i.SymbolID==='Egg_Slot'),perch=map.MapItemData.find(i=>i.SymbolID==='PerchMarker_Branch');storage.setItem(HATCHERY_KEY,JSON.stringify({version:2,summoned:1,active:null,babies:[],adults:[{id:'adult-1',speciesId:sp.id,originSlotGUID:slot.GUID,perchGUID:perch.GUID,maturedAt:0,flyUntil:0,nectar:0,coinStampedAt:0}]}));return {storage,model:createHatchery({catalog,map,storage,now:()=>10000})};}
test('native fill sequence keeps opacity while returning the original colors',()=>{assert.equal(adultLevelFill(undefined,0),0);assert.equal(adultLevelFill(1000,999),0);assert.equal(adultLevelFill(1000,1125),.5);assert.equal(adultLevelFill(1000,1250),1);assert.equal(adultLevelFill(1000,3000),.5);assert.equal(adultLevelFill(1000,4750),0);});
test('every adult renders as the single adult look with level UI hidden',()=>{
 const source=JSON.parse(fs.readFileSync(new URL('../../public/dragon/generated/native-adult-status.json',import.meta.url))),{model}=fixture();
 const adult=model.getSnapshot().adults[0];
 const menu=adultStatusMenu(source,adult,sp),b=menu.bindings,d=b.dragonLevel;
 assert.equal(menu.nodes.find(n=>n.id===b.levelContainer).active,false);
 assert.equal(menu.nodes.find(n=>n.id===b.progressbar).active,false);
 assert.equal(menu.nodes.find(n=>n.id===d.full).active,false);
 assert.equal(menu.nodes.find(n=>n.id===d.fullParent).active,false);
 for(const pipId of d.fullPips)assert.equal(menu.nodes.find(n=>n.id===pipId).active,false);
 assert.equal(menu.texts.find(t=>t.node===b.title).text,sp.name);
});
