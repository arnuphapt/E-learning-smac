import {assetUrl} from './asset-base.mjs';
import {createNativeBookView,bookText,setBookNodes,cloneBookMenu,renderPartnerControl} from './native-book-view.mjs';

export function adultStatusMenu(source,adult,species){
 const menu=cloneBookMenu(source),b=menu.bindings,d=b.dragonLevel;
 setBookNodes(menu,[[menu.rootID,true],[b.template,true],[b.titleIcon1,false],[b.titleIcon2,false],[b.buttonContainer,false],[b.descContainer,false],[b.bannerContainer,false],[b.levelContainer,false],[b.currencyContainer,true],[b.timeContainer,true],[b.progressbar,false],[d.fuseParent,false],[d.remarkable,false],[d.sparkle,false],[d.full,false],[d.fullParent,false],[d.labelContainer,false]]);
 setBookNodes(menu,d.fullPips.map(id=>[id,false]));
 bookText(menu,b.title,species.name);
 bookText(menu,b.currencyLabel,String(adult.reward));
 const seconds=Math.max(0,Math.ceil((adult.coinReadyAt-Date.now())/1000));
 bookText(menu,b.timeLabel,adult.ready?'Ready':`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`);
 menu.nodes.find(n=>n.id===b.title).size.x=menu.nodes.find(n=>n.id===b.titleContainer).size.x;
 return menu;
}

export function createNativeAdultStatus(React){
 const {createElement:h,useState,useEffect}=React,NativeView=createNativeBookView(React);
 return function NativeAdultStatus({adult,species,onClose,allowPartner=false,partnerPendingId=null,onPartnerRequest}){
  const [source,setSource]=useState(null),[viewport,setViewport]=useState({width:innerWidth,height:innerHeight}),[error,setError]=useState('');
  useEffect(()=>{const controller=new AbortController();fetch(assetUrl('generated/native-adult-status.json'),{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('Unable to load native dragon status');return r.json();}).then(setSource).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>controller.abort();},[]);
  useEffect(()=>{const resize=()=>setViewport({width:innerWidth,height:innerHeight}),key=e=>{if(e.key==='Escape')onClose?.();};window.addEventListener('resize',resize);window.addEventListener('keydown',key);return()=>{window.removeEventListener('resize',resize);window.removeEventListener('keydown',key);};},[onClose]);
  if(error)return h('p',{role:'alert'},error);if(!source)return null;
  const menu=adultStatusMenu(source,adult,species),scale=Math.min(viewport.width/source.scaler.width,viewport.height/source.scaler.height),width=viewport.width/scale,height=source.nodes.find(n=>n.id===source.rootID).size.y;
  const sources=new Map([[menu.bindings.levelBacking,assetUrl(`generated/dragon-book/${species.id}-portrait.webp`)]]);
  const partnerControl=renderPartnerControl(h,{allowPartner,dragon:adult,partnerPendingId,onPartnerRequest});
  return h(React.Fragment,null,h('button',{className:'native-baby-dismiss','aria-label':'ปิดสถานะมังกร',onClick:onClose}),h('section',{className:'native-baby-status','aria-label':'สถานะมังกรโต',style:{height:height*scale}},h('div',{style:{position:'absolute',bottom:0,left:0,width,height,transform:`scale(${scale})`,transformOrigin:'bottom left'}},h(NativeView,{menu,width,height,instance:'Adult',art:menu.sprites,artBaseURL:assetUrl('generated/native-adult-status-art/'),sources})),partnerControl),h('span',{className:'visually-hidden',role:'status'},`${species.name} ตัวเต็มวัย`));
 };
}
