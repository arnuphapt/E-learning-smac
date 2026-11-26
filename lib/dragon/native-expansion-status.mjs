import {assetUrl} from './asset-base.mjs';
import {createNativeBookView,bookText,setBookNodes,cloneBookMenu} from './native-book-view.mjs';

export function createNativeExpansionStatus(React){
 const {createElement:h,useEffect,useState}=React,NativeView=createNativeBookView(React);
 return function NativeExpansionStatus({api,roomID,onClose}){
  const model=api.expansions,[source,setSource]=useState(null),[snapshot,setSnapshot]=useState(()=>model.getSnapshot()),[viewport,setViewport]=useState({width:innerWidth,height:innerHeight}),[error,setError]=useState('');
  useEffect(()=>model.subscribe(setSnapshot),[model]);
  useEffect(()=>{const controller=new AbortController();fetch(assetUrl('generated/native-expansion-status.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Unable to load expansion status');return r.json();}).then(setSource).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[]);
  useEffect(()=>{const resize=()=>setViewport({width:innerWidth,height:innerHeight}),key=e=>{if(e.key==='Escape')onClose();};window.addEventListener('resize',resize);window.addEventListener('keydown',key);return()=>{window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);};},[onClose]);
  useEffect(()=>{if(snapshot.open.includes(roomID)||roomID.startsWith('score:')&&snapshot.scoreOpen.includes(roomID.slice(6)))onClose();},[snapshot,roomID,onClose]);
  if(!source)return error?h('p',{role:'alert'},error):null;
  const gate=roomID.startsWith('score:')?model.source.scoreGates.find(g=>g.layer===roomID.slice(6)):null;
  const menu=cloneBookMenu(source),b=menu.bindings,active=snapshot.active.includes(roomID),chops=snapshot.chops[roomID]??0;
  setBookNodes(menu,[[menu.rootID,true],...menu.buttons.map((button,i)=>[button.node,i<2&&active&&(i===0||snapshot.hcAvailable)]),[b.descContainer,true],[8284,false],[b.progressbar,false],[b.bannerContainer,false],[b.levelContainer,false],[b.currencyContainer,false],[b.timeContainer,false],[b.titleIcon1,false],[b.titleIcon2,false],[b.descIcon,false],[b.descIconLabel,false]]);
  bookText(menu,b.title,gate?.name??'Strange Fog');bookText(menu,b.description,gate?`Forest score ${snapshot.score} / ${gate.score}`:active?'Clear to uncover a new forest area':'Cannot clear yet.');bookText(menu,b.progressLabel,gate?`${snapshot.score} / ${gate.score}`:`${chops} / ${snapshot.maxChops}`);
  menu.fitters=(menu.fitters??[]).filter(f=>f.node!==b.title);
  menu.horizontalGroups.find(g=>g.node===b.titleContainer).controlWidth=false;
  menu.nodes.find(n=>n.id===b.title).size.x=menu.nodes.find(n=>n.id===b.titleContainer).size.x;
  menu.nodes.find(n=>n.id===b.progressbar).position.y=-185;
  menu.nodes.find(n=>n.id===b.progressFill).anchorMax.x=gate?Math.min(1,snapshot.score/gate.score):chops/snapshot.maxChops;
  const handlers=new Map();
  for(const [i,currency]of ['SC','HC'].entries()){
   const button=menu.buttons[i],cost=currency==='SC'?snapshot.costSC:snapshot.costHC;
   bookText(menu,button.costLabelNode,String(cost));bookText(menu,button.externalLabelNode,'Clear');
   setBookNodes(menu,[[button.costLabelNode,true],[button.attnLabelNode,false]]);
   handlers.set(button.node,{label:`Clear fog with ${cost} ${currency==='SC'?'gold':'gems'}`,onClick:()=>{try{model.chop(roomID,currency);setError('');}catch(e){if(api.wallet.getSnapshot()[currency]<cost)api.requestCurrencyShop?.(currency);else setError(e.message);}}});
  }
  const scale=Math.min(viewport.width/source.scaler.width,viewport.height/source.scaler.height),width=viewport.width/scale,height=menu.nodes.find(n=>n.id===menu.rootID).size.y;
  return h(React.Fragment,null,h('button',{className:'native-baby-dismiss','aria-label':'Close fog',onClick:onClose}),h('section',{className:'native-baby-status','aria-label':'Strange Fog',style:{height:height*scale}},h('div',{style:{position:'absolute',bottom:0,left:0,width,height,transform:`scale(${scale})`,transformOrigin:'bottom left'}},h(NativeView,{menu,width,height,instance:'Expansion',art:menu.sprites,artBaseURL:assetUrl('generated/native-expansion-status-art/'),handlers})),error&&h('p',{role:'alert'},error)));
 };
}
