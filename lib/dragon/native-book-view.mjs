import {assetUrl} from './asset-base.mjs';
import {nativeBerryRects} from './native-berry-layout.mjs';

export const cloneBookMenu=menu=>structuredClone(menu);
export function setBookNodes(menu,states){for(const [id,active]of states){const node=menu.nodes.find(n=>n.id===id);if(node)node.active=active;}}
export function bookText(menu,node,value){const text=menu.texts.find(t=>t.node===node);if(text)text.text=value;}
export function bookImage(menu,node,sprite){const image=menu.images.find(i=>i.node===node);if(image){image.sprite=sprite;image.color=[1,1,1,1];image.enabled=Boolean(sprite);}}

export function getPartnerControlState({allowPartner,dragon,partnerPendingId=null}){
 if(!allowPartner||!dragon)return null;
 if(dragon.isPartner)return {kind:'label',label:'คู่ใจ'};
 return {kind:'button',label:partnerPendingId===dragon.id?'กำลังตั้ง…':'เลือกเป็นคู่ใจ',ariaLabel:'เลือกเป็นมังกรคู่ใจ',disabled:Boolean(partnerPendingId)};
}
export function renderPartnerControl(h,{allowPartner,dragon,partnerPendingId=null,onPartnerRequest}){
 const state=getPartnerControlState({allowPartner,dragon,partnerPendingId});
 if(!state)return null;
 if(state.kind==='label')return h('div',{className:'native-partner-bar'},h('span',{className:'native-partner-badge',role:'status'},state.label));
 return h('div',{className:'native-partner-bar'},h('button',{type:'button',className:'native-partner-btn','aria-label':state.ariaLabel,disabled:state.disabled,onClick:()=>onPartnerRequest?.(dragon.id)},state.label));
}

// Draw the recovered Unity hierarchy, including its nine-slice borders and Image tint.
// The browser scales this complete native canvas; it does not rearrange the game UI.
export function createNativeBookView(React){const h=React.createElement;
 return function NativeBookView({menu,width,height,instance,art,artBaseURL,handlers=new Map(),slots=new Map(),sources=new Map(),rootStyle={}}){
  const nodes=new Map(menu.nodes.map(n=>[n.id,{...n,size:{...n.size}}])),images=new Map(menu.images.map(i=>[i.node,i])),texts=new Map(menu.texts.map(t=>[t.node,t])),measure=document.createElement('canvas').getContext('2d');
  function textSize(text,maxWidth,fontSize=text.fontSize){measure.font=`${text.style&2?'italic ':''}${text.fontWeight>=600?'600 ':''}${fontSize}px BookFont${instance}_${text.font?.replace(':','_')}`;let lines=0,width=0;for(const para of text.text.split('\n')){let line='';for(const word of para.split(/\s+/)){const next=line?line+' '+word:word;if(line&&measure.measureText(next).width>maxWidth){width=Math.max(width,measure.measureText(line).width);lines++;line=word;}else line=next;}width=Math.max(width,measure.measureText(line).width);lines++;}return {width,height:lines*fontSize*1.3};}
  for(const fitter of menu.fitters??[]){const n=nodes.get(fitter.node),t=texts.get(fitter.node);if(t&&fitter.horizontal===2)n.size.x=textSize(t,10000).width;}
  const rects=nativeBerryRects({...menu,nodes:[...nodes.values()]},id=>{const t=texts.get(id);return t?textSize(t,Math.max(30,nodes.get(id).size.x||700)):null;},{width,height});
  function graphic(image,r){const sprite=art[image.sprite],src=sources.get(image.node)??(sprite?artBaseURL+encodeURIComponent(image.sprite)+'.webp':null),button=menu.buttons?.find(b=>b.graphic===image.id),buttonState=button?handlers.get(button.node):null,color=buttonState?.disabled?image.color.map((c,i)=>c*button.disabled[i]):image.color,id=`book-tint-${instance}-${image.id}`,content=[];
   if(!src)return h('div',{key:'image',style:{position:'absolute',inset:0,background:`rgba(${color.slice(0,3).map(x=>Math.round(x*255))},${color[3]})`}});
   const original=sprite?.rect??{width:r.width,height:r.height};
   const filter=h('defs',{key:'filter'},h('filter',{id,colorInterpolationFilters:'sRGB'},h('feColorMatrix',{type:'matrix',values:`${color[0]} 0 0 0 0 0 ${color[1]} 0 0 0 0 0 ${color[2]} 0 0 0 0 0 ${color[3]} 0`})));
   if(image.type===1&&sprite?.border&&!sources.has(image.node)){
    const b=sprite.border,factor=sprite.ppu/menu.scaler.referencePixelsPerUnit*image.pixelsPerUnitMultiplier,left=Math.min(r.width/2,b.x/factor),right=Math.min(r.width/2,b.z/factor),top=Math.min(r.height/2,b.w/factor),bottom=Math.min(r.height/2,b.y/factor),xs=[0,left,r.width-right,r.width],ys=[0,top,r.height-bottom,r.height],us=[0,b.x,original.width-b.z,original.width],vs=[0,b.w,original.height-b.y,original.height];
    for(let y=0;y<3;y++)for(let x=0;x<3;x++){if(us[x+1]<=us[x]||vs[y+1]<=vs[y]||xs[x+1]<=xs[x]||ys[y+1]<=ys[y])continue;content.push(h('svg',{key:x+':'+y,x:xs[x],y:ys[y],width:xs[x+1]-xs[x],height:ys[y+1]-ys[y],viewBox:`${us[x]} ${vs[y]} ${us[x+1]-us[x]} ${vs[y+1]-vs[y]}`,preserveAspectRatio:'none',overflow:'hidden'},h('image',{href:src,width:original.width,height:original.height,preserveAspectRatio:'none'})));}
   }else content.push(h('image',{key:'sprite',href:src,width:r.width,height:r.height,preserveAspectRatio:image.preserveAspect||sources.has(image.node)?'xMidYMid meet':'none'}));
   return h('svg',{key:'image',width:r.width,height:r.height,viewBox:`0 0 ${r.width} ${r.height}`,style:{position:'absolute',inset:0,overflow:'visible','pointerEvents':'none'},'aria-hidden':true},filter,h('g',{filter:`url(#${id})`},...content));
  }
  function render(id){const n=nodes.get(id);if(!n?.active)return null;const r=rects.get(id);if(!r||r.width<=0||r.height<=0)return null;const image=images.get(id),text=texts.get(id),handler=handlers.get(id),parts=[];
   if(image?.enabled)parts.push(graphic(image,r));
   if(text?.enabled){let fontSize=text.fontSize;while(fontSize>20&&textSize(text,r.width,fontSize).height>r.height+4)fontSize--;const c=text.color;parts.push(h('span',{key:'label',className:'native-book-label',style:{fontFamily:`BookFont${instance}_${text.font?.replace(':','_')},BookPoppins,sans-serif`,fontSize,fontWeight:text.fontWeight>=600?600:400,fontStyle:text.style&2?'italic':'normal',color:`rgba(${c.slice(0,3).map(x=>Math.round(x*255))},${c[3]})`,textAlign:text.horizontal===1?'left':text.horizontal===4?'right':'center',alignItems:text.vertical===256?'flex-start':text.vertical===1024?'flex-end':'center',justifyContent:text.horizontal===1?'flex-start':text.horizontal===4?'flex-end':'center'}},text.text.replace(/<[^>]+>/g,'')));}
   parts.push(...n.children.map(render));if(slots.has(id))parts.push(h(React.Fragment,{key:'slot'},slots.get(id)));
   if(handler)parts.push(h('button',{key:'hit',className:'native-book-hit','aria-label':handler.label,'aria-pressed':handler.pressed,disabled:handler.disabled,onClick:handler.onClick,title:handler.label}));
   return h('div',{key:id,'data-native-book-node':id,'data-native-book-name':n.name,style:{position:'absolute',left:id===menu.rootID?0:r.x,top:id===menu.rootID?0:r.y,width:r.width,height:r.height,pointerEvents:'none',transform:n.localScale?`scale(${n.localScale.x},${n.localScale.y})`:undefined,transformOrigin:`${(n.pivot?.x??.5)*100}% ${(1-(n.pivot?.y??.5))*100}%`,...(id===menu.rootID?rootStyle:{})}},parts);
  }
  return h(React.Fragment,null,h('style',null,Object.entries(menu.fonts).filter(([,f])=>f.url).map(([key,f])=>`@font-face{font-family:BookFont${instance}_${key.replace(':','_')};src:url('${assetUrl(f.url)}')}`).join('\n')),render(menu.rootID));
 };
}
