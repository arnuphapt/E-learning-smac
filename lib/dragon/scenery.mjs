// Browser reconstruction of permanent perimeter scenery, distinct from room gates.
// The source supplies OuterWallMarker positions and filler placements; native
// room-to-filler membership and depth-of-field parameters are not recovered.
export function perimeterScenery(map){
 const markers=map.MapItemData.filter(i=>i.SymbolID==='OuterWallMarker');
 if(markers.length<4)throw Error('Missing source outer-wall markers');
 const bounds={left:Math.min(...markers.map(i=>i.XPos)),right:Math.max(...markers.map(i=>i.XPos)),bottom:Math.min(...markers.map(i=>i.YPos)),top:Math.max(...markers.map(i=>i.YPos))};
 const placementIDs=map.MapItemData.filter(i=>!i.isMarker&&i.SymbolID==='ExpansionFiller'&&(i.XPos<=bounds.left+1e-6||i.XPos>=bounds.right-1e-6||i.YPos<=bounds.bottom+1e-6)).map(i=>i.GUID);
 return {bounds,placementIDs,rule:'Retain only base ExpansionFiller centers on/outside source left/right/bottom OuterWallMarker bounds; omit all interior and score-unlock fog.',nativeMembershipVerified:false};
}
export function softEdgeKind(item,perimeterIDs){
 if(perimeterIDs.has(item.GUID))return 'perimeter';
 if(item.SymbolID==='FGBushBlurry'&&item.LayerID.startsWith('FG_Blur'))return 'foreground';
 return null;
}

// Keep enough offscreen input for the blur kernel at viewport borders. Pixi's
// default autoFit clips this input and makes opaque foreground fade at the edge.
// Intersect with a padded viewport so extreme zoom never allocates a full-world
// filter texture for an enormous foreground mesh.
export function updateSoftFilterArea(target,bounds,screen,padding){
 const left=Math.max(bounds.left,-padding),top=Math.max(bounds.top,-padding);
 const right=Math.min(bounds.right,screen.width+padding),bottom=Math.min(bounds.bottom,screen.height+padding);
 target.x=left;target.y=top;target.width=Math.max(0,right-left);target.height=Math.max(0,bottom-top);
 return target;
}
