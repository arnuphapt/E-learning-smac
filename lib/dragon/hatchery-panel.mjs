import {assetUrl} from './asset-base.mjs';
import {createNativeBabyStatus} from './native-baby-status.mjs';
import {createNativeAdultStatus} from './native-adult-status.mjs';
﻿import {createHatchery,HATCHERY_KEY,isSpeciesDiscovered} from './hatchery.mjs';
export const UNDISCOVERED_DRAGON_TITLE='Undiscovered Dragon';
export const dragonPanelTitle=(species,discovered)=>discovered?(species?.name||UNDISCOVERED_DRAGON_TITLE):UNDISCOVERED_DRAGON_TITLE;
export function createHatcheryFeature(React){
 const {createElement:h,useEffect,useRef,useState}=React;
 const time=ms=>{const s=Math.ceil(ms/1000);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
 function SummonButton({api,image,disabled,onSummon}){
  const ref=useRef(null);useEffect(()=>{let frame;const update=()=>{const b=ref.current;if(!b)return;const p=api.getSummonButtonProjection();b.hidden=!p;if(p){Object.assign(b.style,{left:(p.x-p.size/2)+'px',top:(p.y-p.size/2)+'px',width:p.size+'px',height:p.size+'px',fontSize:Math.max(12,Math.min(21,p.size*.18))+'px'});}frame=requestAnimationFrame(update);};update();return()=>cancelAnimationFrame(frame);},[api]);
  return h('div',{className:'summon-world-overlay'},h('button',{ref,className:'summon-world-button',hidden:true,disabled,onClick:onSummon,'aria-label':'อัญเชิญไข่'},h('img',{src:image,alt:'',draggable:false}),h('span',null,'Summon')));
 }
 function EggStatus({api,active,species,discovered,moveImage,canMove,onHatch,onMove}){
  const title=dragonPanelTitle(species,discovered);
  const ref=useRef(null);useEffect(()=>{let frame;const update=()=>{const el=ref.current;if(!el)return;const p=api.getHatcheryProjection();el.hidden=!p;if(p){el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.width=Math.max(110,Math.min(200,p.scale*2.5))+'px';el.style.fontSize=Math.max(14,Math.min(22,p.scale*.3))+'px';el.style.setProperty('--egg-width',p.scale*1.5+'px');el.style.setProperty('--egg-height',p.scale*2+'px');el.style.setProperty('--move-size',Math.max(44,Math.min(82,p.scale))+'px');}frame=requestAnimationFrame(update);};update();return()=>cancelAnimationFrame(frame);},[api]);
  return h('div',{className:'summon-world-overlay'},h('div',{ref,className:'hatch-world-status',hidden:true},
   active.status==='incubating'&&h(React.Fragment,null,h('progress',{max:active.readyAt-active.startedAt,value:Math.max(0,active.readyAt-active.startedAt-active.remainingMs),'aria-label':'ระยะเวลาฟัก'}),h('strong',{'aria-label':'เวลาฟักที่เหลือ'},time(active.remainingMs))),
   active.status==='ready'&&h('button',{className:'hatch-world-hit',onClick:onHatch,'aria-label':'ฟักไข่',title:'แตะไข่เพื่อฟัก'}),
   active.status==='hatched'&&h(React.Fragment,null,h('div',{className:'hatch-world-name'},discovered?title:h(React.Fragment,null,'Undiscovered',h('br'),'Dragon')),h('button',{className:'hatch-world-move',disabled:!canMove,onClick:onMove,'aria-label':'Move / ย้ายเข้ารัง'},h('img',{src:moveImage,alt:'',draggable:false}),h('span',null,'Move')))
  ));
 }
 const NurseryStatus=createNativeBabyStatus(React);
 const AdultStatus=createNativeAdultStatus(React);
 return function HatcheryFeature({api,interaction,open,onClose,nurseryOnly=false}){
  const [catalog,setCatalog]=useState(null),[view,setView]=useState(null),[error,setError]=useState(''),[selectedBaby,setSelectedBaby]=useState(null),[selectedAdult,setSelectedAdult]=useState(null),model=useRef(null),openRef=useRef(open),catalogRef=useRef(null);openRef.current=open&&!nurseryOnly;
  useEffect(()=>{if(!api)return;let alive=true,interval,deadlineTimer,unsubscribe,catalogData,previousCount=null,previousAdults=null;const controller=new AbortController();
   const tick=()=>{try{model.current?.tick();}catch(e){if(alive)setError(e.message);}};
   const update=next=>{if(!alive)return;setView(next);api.expansions?.syncScore(next,catalogData);const newAdult=previousAdults!==null&&next.adults.length>previousAdults?next.adults.at(-1):null;api.syncHatchery({...next,selected:openRef.current},catalogData).then(()=>{if(alive&&newAdult&&!api.editor.enabled)api.focusHatcheryActor(newAdult.id);}).catch(e=>{if(alive)setError(e.message);});if(previousCount!==null&&next.babies.length>previousCount&&!api.editor.enabled)api.focusAt(next.babies.at(-1).slotGUID,12);previousCount=next.babies.length;if(previousAdults!==null&&next.adults.length>previousAdults&&!api.editor.enabled)api.focusAt(next.adults.at(-1).perchGUID,12);previousAdults=next.adults.length;clearTimeout(deadlineTimer);const a=next.active,deadline=a?.status==='summoning'?a.summonDoneAt:a?.status==='arriving'?a.startedAt:a?.status==='hatching'?a.hatchDoneAt:a?.status==='incubating'?a.readyAt:null;const babyDeadlines=next.babies.flatMap(b=>b.maturing?[b.maturing.doneAt]:b.growth?[b.growth.eatDoneAt,b.growth.digestUntil,b.growth.readyAt]:[]).filter(t=>t>Date.now()),deadlines=[...(deadline!==null?[deadline]:[]),...babyDeadlines];if(deadlines.length)deadlineTimer=setTimeout(tick,Math.max(1,Math.min(...deadlines)-Date.now()));};
   const storage=e=>{if(e.key===HATCHERY_KEY)tick();};
   fetch(assetUrl('generated/hatching/catalog.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('โหลดระบบฟักไข่ไม่สำเร็จ');return r.json();}).then(data=>{if(!alive)return;catalogData=data;catalogRef.current=data;setCatalog(data);const next=createHatchery({catalog:data,map:api.map,storage:localStorage,expansions:api.expansions});model.current=next;window.hatchery=next;api.setHatcheryModel?.(next);api.setAdultPerchHandler((id,guid)=>{try{next.setAdultPerch(id,guid);}catch(e){if(alive)setError(e.message);}});api.setAdultUnperchHandler((id,point)=>{try{next.releaseAdultPerch(id,point);}catch(e){if(alive)setError(e.message);}});unsubscribe=next.subscribe(update);next.tick();interval=setInterval(tick,1000);window.addEventListener('focus',tick);window.addEventListener('storage',storage);}).catch(e=>{if(alive&&e.name!=='AbortError')setError(e.message);});
   return()=>{alive=false;api.setHatcheryModel?.(null);api.setAdultPerchHandler(null);api.setAdultUnperchHandler(null);controller.abort();clearInterval(interval);clearTimeout(deadlineTimer);unsubscribe?.();window.removeEventListener('focus',tick);window.removeEventListener('storage',storage);if(window.hatchery===model.current)delete window.hatchery;model.current=null;catalogRef.current=null;};
  },[api]);
  useEffect(()=>{if(!open){setSelectedBaby(null);}if(model.current&&catalogRef.current)api.syncHatchery({...model.current.getSnapshot(),selected:open&&!nurseryOnly},catalogRef.current).catch(e=>setError(e.message));},[api,open,nurseryOnly]);
  useEffect(()=>{if(!interaction?.actorId||!model.current)return;try{const current=model.current.tick(),baby=current.babies.find(b=>b.id===interaction.actorId);if(baby){setSelectedAdult(null);setSelectedBaby(baby.id);setError('');return;}if(current.adults.some(a=>a.id===interaction.actorId)){setSelectedBaby(null);setSelectedAdult(interaction.actorId);return;}const active=current.active;if(active?.id===interaction.actorId&&active.status==='ready'){model.current.hatch();api.focusAt('IncubatorEggMarker',14);setError('');}}catch(e){setError(e.message);}},[interaction,api]);
  const act=fn=>{try{fn();setError('');}catch(e){setError(e.message);}};
  if(!open)return null;
  const selected=view?.babies.find(b=>b.id===selectedBaby),active=view?.active,full=view&&view.babies.length>=view.capacity,canMove=Boolean(model.current?.canMove()),getSpecies=id=>catalog?.species.find(s=>s.id===id);
  const summon=()=>act(()=>{model.current.summon();api.focusAt('IncubatorEggMarker',14);});
  const hatch=()=>act(()=>{model.current.hatch();api.focusAt('IncubatorEggMarker',14);});
  const move=()=>act(()=>{if(api.beginBabyMove?.({kind:'egg'})){setSelectedBaby(null);onClose?.();}});
  const moveBaby=()=>act(()=>{if(selected&&api.beginBabyMove?.({kind:'baby',babyId:selected.id})){setSelectedBaby(null);onClose?.();}});
  if(nurseryOnly&&selectedAdult){const adult=view?.adults.find(a=>a.id===selectedAdult);return adult?h(AdultStatus,{adult,species:getSpecies(adult.speciesId),onClose}):null;}
  if(nurseryOnly)return selected?h(NurseryStatus,{api,baby:selected,species:getSpecies(selected.speciesId),discovered:isSpeciesDiscovered(view?.maturedSpecies,selected.speciesId),moveImage:assetUrl(catalog.summoning.moveButtonImage),canMove,onMove:moveBaby,onClose}):null;
  const status=active?.status==='summoning'?'Liv กำลังอัญเชิญ…':active?.status==='arriving'?'ไข่กำลังลงแท่น…':active?.status==='hatching'?'กำลังฟัก…':null;
  return h('section',{className:'summon-menu','aria-label':'อัญเชิญไข่'},
   view&&!active&&h(SummonButton,{api,image:assetUrl(catalog.summoning.buttonImage),disabled:full,onSummon:summon}),
   active&&h(EggStatus,{api,active,species:getSpecies(active.speciesId),discovered:isSpeciesDiscovered(view?.maturedSpecies,active.speciesId),moveImage:assetUrl(catalog.summoning.moveButtonImage),canMove,onHatch:hatch,onMove:move}),
   status&&h('span',{className:'visually-hidden',role:'status'},status),
   error&&h('p',{className:'native-hud-error',role:'alert'},error)
  );
 };
}
