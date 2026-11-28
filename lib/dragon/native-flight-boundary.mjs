// Ports of MathUtils.PointInPolygon / ProjectedPointOnPolygon / ComputeCorrection.
// Provenance and original ARM ranges: reference/observations/flight-exact-1.6.3/.
const f=Math.fround,add=(a,b)=>f(f(a)+f(b)),sub=(a,b)=>f(f(a)-f(b)),mul=(a,b)=>f(f(a)*f(b));
export const nativeMagnitude=(x,y)=>f(Math.sqrt(add(mul(x,x),mul(y,y))));
export function pointInPolygon(point,polygon){
 let inside=false,previous=polygon.at(-1);const x=f(point.x),y=f(point.y);
 for(const next of polygon){if((previous.y>y)!==(next.y>y)&&sub(x,next.x)<f(mul(sub(previous.x,next.x),sub(y,next.y))/sub(previous.y,next.y)))inside=!inside;previous=next;}
 return inside;
}
export function projectedDelta(point,polygon){
 let delta={x:0,y:0},minimum=Number.MAX_VALUE;
 for(let i=0;i<polygon.length;i++){
  const a=polygon[i],b=polygon[(i+1)%polygon.length],dx=sub(b.x,a.x),dy=sub(b.y,a.y),t=f(add(mul(sub(point.x,a.x),dx),mul(sub(point.y,a.y),dy))/add(mul(dx,dx),mul(dy,dy)));
  // The native function skips projections outside a segment; it does not clamp t.
  if(t<0||t>1)continue;
  const x=sub(point.x,add(a.x,mul(dx,t))),y=sub(point.y,add(a.y,mul(dy,t))),distance=add(mul(x,x),mul(y,y));
  if(distance<minimum){minimum=distance;delta={x,y};}
 }
 return delta;
}
export function nativeBoundaryCheck(point,collider,polygon,settings){
 const [offsetX,offsetY,width,height]=collider,center={x:add(point.x,offsetX),y:add(point.y,offsetY)};
 const corners=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([x,y])=>({x:add(center.x,mul(x,width/2)),y:add(center.y,mul(y,height/2))}));
 let outside=false;
 const deltas=corners.map((corner,i)=>{
  if(pointInPolygon(corner,polygon))return {x:0,y:0};outside=true;
  let d=projectedDelta(corner,polygon);
  if(add(mul(d.x,d.x),mul(d.y,d.y))<settings.nearZeroSquared)d={x:i%2?-settings.cornerFallback:settings.cornerFallback,y:i<2?settings.cornerFallback:-settings.cornerFallback};
  return d;
 });
 // Native compares pairs (BL,BR), (TL,TR), then the two winners; ties keep A.
 const compare=(a,b,key)=>Math.abs(a[key])<Math.abs(b[key])?b:a;
 const axis=key=>compare(compare(deltas[0],deltas[1],key),compare(deltas[2],deltas[3],key),key)[key];
 return {outside,size:{x:width,y:height},correction:{x:f(-axis('x')),y:f(-axis('y'))},corners};
}
