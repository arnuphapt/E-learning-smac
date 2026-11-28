import {assetUrl} from './asset-base.mjs';
import {createNativeBookView,bookText,setBookNodes,cloneBookMenu,renderPartnerControl} from './native-book-view.mjs';

// EntityStatusCaterpillarPupa from GameScene, including the original bottom anchors.
export function createNativeBabyStatus(React){
 const {createElement:h,useEffect,useState}=React,NativeView=createNativeBookView(React);
 return function NativeBabyStatus({baby,species,discovered,canMove,onMove,onClose,viewOnly=false,allowPartner=false,partnerPendingId=null,onPartnerRequest}){
  const [source,setSource]=useState(null),[viewport,setViewport]=useState({width:innerWidth,height:innerHeight}),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();fetch(assetUrl('generated/native-baby-status.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Unable to load native baby status');return r.json();}).then(setSource).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[]);
  useEffect(()=>{const resize=()=>setViewport({width:innerWidth,height:innerHeight}),key=e=>{if(e.key==='Escape')onClose?.();};window.addEventListener('resize',resize);window.addEventListener('keydown',key);return()=>{window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);};},[onClose]);
  useEffect(()=>{if(['mature-ready','maturing'].includes(baby.feeding.status))onClose?.();},[baby.feeding.status,onClose]);
  if(error)return h('p',{role:'alert'},error);
  if(!source)return null;
  const menu=cloneBookMenu(source),b=menu.bindings,title=discovered?(species?.name||'Undiscovered Dragon'):'Undiscovered Dragon',busy=baby.feeding.status==='maturing';
  setBookNodes(menu,[[menu.rootID,true],...menu.buttons.map((button,i)=>[button.node,i===2&&!viewOnly]),[6209,false],[b.descContainer,false],[b.bannerContainer,false],[b.levelContainer,false],[b.currencyContainer,false],[b.timeContainer,false]]);
  bookText(menu,b.title,title);bookText(menu,b.progressLabel,baby.isEgg?'รอฟัก':`${baby.feeding.stage} / 5`);
  // The serialized title contains a short placeholder; let the native title group
  // measure the actual name within its existing 570-unit container.
  menu.nodes.find(n=>n.id===b.title).size.x=menu.nodes.find(n=>n.id===b.titleContainer).size.x;
  const fill=menu.nodes.find(n=>n.id===b.progressFill);fill.anchorMax.x=Math.max(0,Math.min(1,baby.feeding.feeds/5));
  const scale=Math.min(viewport.width/source.scaler.width,viewport.height/source.scaler.height),width=viewport.width/scale,height=source.nodes.find(n=>n.id===source.rootID).size.y;
  const handlers=new Map([[menu.buttons[2].node,{label:'Move / ??????????? '+title,onClick:onMove,disabled:!canMove||busy}]]);
  const partnerControl=renderPartnerControl(h,{allowPartner,dragon:baby,partnerPendingId,onPartnerRequest});
  return h(React.Fragment,null,
   h('button',{className:'native-baby-dismiss','aria-label':'ปิดรังลูกมังกร',onClick:onClose}),
   h('section',{className:'native-baby-status','aria-label':'สถานะลูกมังกร',style:{height:height*scale}},h('div',{style:{position:'absolute',bottom:0,left:0,width,height,transform:`scale(${scale})`,transformOrigin:'bottom left'}},h(NativeView,{menu,width,height,instance:'Baby',art:menu.sprites,artBaseURL:assetUrl('generated/native-baby-status-art/'),handlers})),partnerControl)
  );
 };
}
