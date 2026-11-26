// The four source OuterWallMarkers describe an axis-aligned playable rectangle.
// Camera framing markers are a different, larger rectangle and must not be used.
import {pointInPolygon,nativeBoundaryCheck,nativeMagnitude} from './native-flight-boundary.mjs';
import {NATIVE_BOUNDARY} from './generated/native-boundary.mjs';
export function createFlightBounds(map,source){
 const markers=map.MapItemData.filter(i=>i.SymbolID==='OuterWallMarker');
 const xs=[...new Set(markers.map(p=>p.XPos))].sort((a,b)=>a-b),ys=[...new Set(markers.map(p=>p.YPos))].sort((a,b)=>a-b);
 if(markers.length!==4||xs.length!==2||ys.length!==2||new Set(markers.map(p=>p.XPos+','+p.YPos)).size!==4)throw Error('Unsupported original wall polygon');
 const rectangle={left:xs[0],right:xs[1],bottom:ys[0],top:ys[1]};
 const polygon=[[xs[0],ys[0]],[xs[1],ys[0]],[xs[1],ys[1]],[xs[0],ys[1]]].map(([x,y])=>({x:Math.fround(x),y:Math.fround(y)}));
 const collider=(id,pose)=>{const c=source.colliders[id]?.[pose];if(!c)throw Error('Missing native collider '+id+'/'+pose);return c.values;};
 // Native GetBoundariesAtPosition reads BoxCollider.size/offset, not transform scale.
 function limits(skeletonID=0,pose='Fly',_scale=1){const [x,y,w,h]=collider(skeletonID,pose);return {left:rectangle.left-(x-w/2),right:rectangle.right-(x+w/2),bottom:rectangle.bottom-(y-h/2),top:rectangle.top-(y+h/2)};}
 const inspect=(point,id=0,pose='Fly')=>nativeBoundaryCheck(point,collider(id,pose),polygon,NATIVE_BOUNDARY);
 function accept(point,id=0,pose='Fly'){
  if(!pointInPolygon(point,polygon))return null;
  const result=inspect(point,id,pose),{correction:c,size}=result;
  if(result.outside&&nativeMagnitude(c.x,c.y)>nativeMagnitude(size.x,size.y))return null;
  return {corrected:result.outside,point:result.outside?{x:Math.fround(point.x+c.x*NATIVE_BOUNDARY.correctionMultiplier),y:Math.fround(point.y+c.y*NATIVE_BOUNDARY.correctionMultiplier)}:{x:Math.fround(point.x),y:Math.fround(point.y)}};
 }
 function movement(current,proposed,direction,speed,dt,id=0,pose='Fly'){
  const result=inspect(proposed,id,pose),c=result.correction;if(!result.outside)return {point:proposed,skipNode:false};
  if(nativeMagnitude(c.x,c.y)>NATIVE_BOUNDARY.movementCorrectionThreshold)return {point:{x:Math.fround(current.x+c.x),y:Math.fround(current.y+c.y)},skipNode:true};
  const distance=nativeMagnitude(direction.x,direction.y),step=distance>1e-5?speed*dt/distance:0;
  return {point:{x:Math.fround(proposed.x+c.x*NATIVE_BOUNDARY.correctionMultiplier+direction.x*step),y:Math.fround(proposed.y+c.y*NATIVE_BOUNDARY.correctionMultiplier+direction.y*step)},skipNode:false};
 }
 return {rectangle,polygon,markerIDs:markers.map(m=>m.GUID),limits,inspect,accept,movement,hasPose(id,pose){return Boolean(source.colliders[id]?.[pose]);},contains(point,skeletonID=0,pose='Fly',scale=1){const b=limits(skeletonID,pose,scale);return point.x>=b.left-1e-5&&point.x<=b.right+1e-5&&point.y>=b.bottom-1e-5&&point.y<=b.top+1e-5;}};
}
export function flightColliderPose(state,perch){return ['Hover','PreHover'].includes(state)?'Hover':state==='Perching'?(perch?.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle'):'Fly';}
