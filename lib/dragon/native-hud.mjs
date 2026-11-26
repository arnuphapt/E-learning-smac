import {assetUrl} from './asset-base.mjs';
import {createNativeBookView} from './native-book-view.mjs';
import {WALLET_KEY} from './wallet.mjs';

export function prepareNativeHud(source,wallet=null){
 const menu=structuredClone(source),nodes=new Map(menu.nodes.map(n=>[n.id,n]));
 function move(id,parent,first=false){const n=nodes.get(id);nodes.get(n.parent).children=nodes.get(n.parent).children.filter(child=>child!==id);n.parent=parent;const children=nodes.get(parent).children;if(first)children.unshift(id);else children.push(id);}
 const b=menu.bindings;
 // Exact 1.6.3 SetUpAlternateLayout: Shelf is inserted first, then Settings first.
 if(b.alternateTopLayout){move(b.shelfContainer,b.rightPortrait,true);move(b.settingsContainer,b.rightPortrait,true);}
 nodes.get(b.shelfContainer).active=false;
 const target=b.horizontalContainer;
 for(const control of menu.controls.filter(c=>['Book','Shop','Friends','Storage','Calendar','Decoration'].includes(c.name)))move(control.node,target);
 // Keep the main menu in a compact bottom row on every screen orientation.
 nodes.get(target).localScale={x:.75,y:.75};
 // Keep unrelated badges hidden until their systems supply state.
 for(const n of menu.nodes)if(['AttentionBadge','CostContainer','CancelOverlay'].includes(n.name))n.active=false;
 for(const id of [8383,6032])nodes.get(id).active=false;
 for(const text of menu.texts){if(text.node===8503)text.text='%';if(text.node===7060)text.text='';}
 for(const [id,currency]of [[b.goldLabel,'SC'],[b.gemsLabel,'HC']]){const text=menu.texts.find(t=>t.id===id);if(text)text.text=wallet?wallet[currency].toLocaleString('en'):'—';}
 return menu;
}

export function createNativeHud(React){
 const {createElement:h,useEffect,useMemo,useState}=React,View=createNativeBookView(React);
 return function NativeHud({api,onOpenBook,onOpenSettings,onOpenCurrency,settingsOpen=false}){
  const [source,setSource]=useState(null),[error,setError]=useState(''),[screen,setScreen]=useState(()=>({width:innerWidth,height:innerHeight}));
  const [wallet,setWallet]=useState(()=>api?.wallet.getSnapshot()??null);
  useEffect(()=>{if(!api?.wallet){setWallet(null);return;}const update=()=>setWallet(api.wallet.getSnapshot()),stop=api.wallet.subscribe(update),refresh=e=>{if(e.type==='storage'&&e.key!==null&&e.key!==WALLET_KEY)return;try{api.wallet.refresh();setError('');}catch(error){setError(error.message);}};update();window.addEventListener('storage',refresh);window.addEventListener('focus',refresh);return()=>{stop();window.removeEventListener('storage',refresh);window.removeEventListener('focus',refresh);};},[api]);
  useEffect(()=>{const abort=new AbortController();fetch(assetUrl('generated/native-hud.json'),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error('โหลดปุ่มต้นฉบับไม่สำเร็จ');return r.json();}).then(setSource).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>abort.abort();},[]);
  useEffect(()=>{const resize=()=>setScreen({width:innerWidth,height:innerHeight});window.addEventListener('resize',resize);return()=>window.removeEventListener('resize',resize);},[]);
  useEffect(()=>{if(!source)return;let alive=true;document.fonts.ready.then(()=>{if(alive)setScreen({width:innerWidth,height:innerHeight});});return()=>{alive=false;};},[source]);
  const landscape=screen.width>screen.height,menu=useMemo(()=>source?prepareNativeHud(source,wallet):null,[source,wallet]);
  if(error)return h('p',{className:'native-hud-error',role:'alert'},error);
  if(!menu)return null;
  // Preserve native offsets. Uniformly cap the scale on narrow screens so the source 975-unit row fits.
  const scale=Math.min(screen.height/menu.scaler.height,screen.width/menu.scaler.width),width=screen.width/scale,height=screen.height/scale;
  const handlers=new Map(menu.controls.map(c=>[c.node,c.name==='Book'?{label:'เปิดสมุดมังกร',onClick:onOpenBook}:c.name==='SettingsIcon'?{label:'ตั้งค่า / Debug',onClick:onOpenSettings,pressed:settingsOpen}:c.name==='SCIcon'||c.name==='Shop'?{label:c.label,onClick:()=>onOpenCurrency?.('SC')}:c.name==='HCIcon'?{label:c.label,onClick:()=>onOpenCurrency?.('HC')}:{label:c.label}]));
  return h('nav',{className:'native-hud','aria-label':'ปุ่มเกมต้นฉบับ','data-native-hud-orientation':landscape?'landscape':'portrait','data-native-hud-scale':scale},h(View,{menu,width,height,instance:'hud',art:menu.sprites,artBaseURL:assetUrl('generated/native-hud-art/'),handlers,rootStyle:{transform:`scale(${scale})`,transformOrigin:'top left'}}));
 };
}
