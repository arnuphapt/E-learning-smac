export function createExpansionCovers({PIXI,source,texture,layerZ}){
 const g=source.cover;
 return source.covers.map(({roomID,item})=>{const mesh=new PIXI.SimpleMesh(texture,Float32Array.from(g.vertices),Float32Array.from(g.uvs),Uint16Array.from(g.indices));mesh.autoUpdate=false;mesh.eventMode='none';mesh.tint=0x1f2838;return {mesh,expansionCover:true,expansionRoomID:roomID,item:{...item,GUID:'expansion-'+item.GUID,isMarker:false,SymbolID:'ExpansionEntity',ZPos:item.ZPos-3,scaleX:g.scale,scaleY:g.scale},layerZ:layerZ.get(item.LayerID)??0,binding:{file:g.source}};});
}
export function expansionAppearance(entry,snapshot,source,now,dev=false){
 if(dev)return {hidden:false,alpha:1};
 if(entry.expansionHint)return {hidden:!snapshot.active.includes(entry.expansionRoomID),alpha:1};
 if(entry.expansionScoreHint)return {hidden:snapshot.scoreOpen.includes(entry.expansionScoreHint),alpha:1};
 if(entry.expansionScoreLayer){const layer=entry.expansionScoreLayer;if(!snapshot.scoreOpen.includes(layer))return {hidden:false,alpha:1};const at=snapshot.scoreClearedAt?.[layer],alpha=Number.isFinite(at)?Math.max(0,1-(now-at)/1500):0;return {hidden:alpha<=0,alpha};}
 if(entry.expansionRoomID){if(!snapshot.open.includes(entry.expansionRoomID))return {hidden:false,alpha:1};const at=snapshot.clearedAt[entry.expansionRoomID],alpha=Number.isFinite(at)?Math.max(0,1-(now-at)/(source.clearSeconds*1000)):0;return {hidden:alpha<=0,alpha};}
 return {hidden:false,alpha:1};
}

export function createExpansionHints({PIXI,source,textures,layerZ}){
 const makeSprite=(g,scale=1)=>{const mesh=new PIXI.SimpleMesh(textures.get(g.texture),Float32Array.from(g.vertices),Float32Array.from(g.uvs),Uint16Array.from(g.indices));mesh.autoUpdate=false;mesh.scale.set(scale);return mesh;};
 const label=(text,size)=>{const t=new PIXI.Text(text,{fontFamily:'Poppins, sans-serif',fontSize:size*100,fill:0xffffff,stroke:0x1f2838,strokeThickness:4});t.anchor.set(.5);t.scale.set(.01);t.resolution=2;return t;};
 const result=[];
 for(const order of source.orders.filter(o=>o.primary&&/^\d+$/.test(o.set))){const room=source.rooms.find(r=>r.id===order.roomID),mesh=new PIXI.Container(),cost=label('1',.65),coin=makeSprite(source.hintSprites.coin,.6);coin.x=-.9;cost.x=.2;mesh.addChild(coin,cost);const pips=Array.from({length:source.maxChops},(_,i)=>{const p=makeSprite(source.hintSprites.coin,.4);p.position.set((i-2)*.48,.85);p.tint=0xffcb7a;mesh.addChild(p);return p;});result.push({mesh,cost,pips,expansionHint:true,expansionRoomID:room.id,item:{GUID:'expansion-hint-'+room.id,SymbolID:'ChopContainer',XPos:room.x,YPos:room.y,ZPos:-24,scaleX:1,scaleY:1,rotation:0,LayerID:'RoomMarkers'},layerZ:layerZ.get('RoomMarkers')??0});}
 for(const gate of source.scoreGates){const mesh=new PIXI.Container(),icon=makeSprite(source.hintSprites.score),text=label(String(gate.score),.7);icon.position.set(-1.47,-.02);icon.alpha=.78431374;mesh.addChild(icon,text);result.push({mesh,expansionScoreHint:gate.layer,item:{...gate.marker,GUID:'expansion-score-'+gate.layer,SymbolID:'ScoreUnlock',ZPos:gate.marker.ZPos-.3,scaleX:1,scaleY:1},layerZ:layerZ.get(gate.layer)??0});}
 return result;
}

export function updateExpansionHints(entries,snapshot){for(const o of entries)if(o.expansionHint){o.cost.text=String(snapshot.costSC);const chops=snapshot.chops[o.expansionRoomID]??0;o.pips.forEach((p,i)=>{p.alpha=i<chops?1:.25;});}}
