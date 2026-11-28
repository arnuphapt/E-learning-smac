// Original burst sprite; pulse scale/time are browser choreography settings.
export function createMatureBurst({PIXI,assets,texture,actor,marker,layerZ,scale}){
 const mesh=new PIXI.Container(),g=assets.sprites[assets.mature.sprite],make=(tint,size)=>{const p=new PIXI.SimpleMesh(texture(g.texture),Float32Array.from(g.vertices),Float32Array.from(g.uvs),Uint16Array.from(g.indices));p.autoUpdate=false;p.tint=tint;p.scale.set(size);p.blendMode=PIXI.BLEND_MODES.ADD;mesh.addChild(p);return p;},rays=make(0x67f4ff,1.4),core=make(0xe2ffff,.8);
 mesh.eventMode='none';mesh.y=0;
 const start=(actor.maturing?.doneAt??actor.maturedAt)-350;
 let last=null;
 return {actorId:'mature-burst-'+actor.id,kind:'mature-burst',mesh,item:{...marker,GUID:'mature-burst-'+actor.id,SymbolID:'MatureBurst',isMarker:false,ZPos:marker.ZPos-.4,scaleX:marker.scaleX*scale,scaleY:marker.scaleY*scale},layerZ,update(now,dev){const t=(now-start)/1000,key=dev?'dev':t<0?'waiting':t>=1.15?'expired':Math.floor(t*30);if(last===key)return false;last=key;const visible=!dev&&t>=0&&t<1.15;this.gameplayHidden=!visible;mesh.visible=visible;if(visible){const envelope=Math.sin(Math.PI*Math.min(1,t/1.15))**.45;mesh.alpha=envelope;rays.rotation=t*.65;rays.scale.set(1.1+t*.9);core.scale.set(.5+t*.5);rays.y=core.y=-.9;}return true;}};
}
