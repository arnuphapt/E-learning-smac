// Browser review limits, not recovered original-game camera configuration.
export const CAMERA_LIMITS=Object.freeze({minDistance:1600,maxViewHeight:48,maxViewWidth:80,devMaxDistance:50000});
const clamp=(value,min,max)=>min<=max?Math.max(min,Math.min(max,value)):(min+max)/2;
export function backdropBounds(map,manifest){
 const layers=new Map(map.LayerData.map(l=>[l.name,l.ZPos]));let largest=null;
 for(const item of map.MapItemData.filter(i=>i.SymbolID==='Sky'&&!i.isMarker)){
  const geometry=manifest.bindings[item.SymbolID];if(!geometry)continue;
  const angle=-item.rotation*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle);
  let left=Infinity,right=-Infinity,bottom=Infinity,top=-Infinity;
  for(let i=0;i<geometry.vertices.length;i+=2){const x=geometry.vertices[i]*item.scaleX,y=-geometry.vertices[i+1]*item.scaleY,wx=item.XPos+x*cos-y*sin,wy=item.YPos+x*sin+y*cos;left=Math.min(left,wx);right=Math.max(right,wx);bottom=Math.min(bottom,wy);top=Math.max(top,wy);}
  const candidate={left,right,bottom,top,z:(layers.get(item.LayerID)||0)+item.ZPos};
  if(!largest||(right-left)*(top-bottom)>(largest.right-largest.left)*(largest.top-largest.bottom))largest=candidate;
 }
 return largest;
}
export function constrainCamera(camera,screen,bounds,{dev=false,backdrop=null}={}){
 const aspect=screen.width/Math.max(1,screen.height),tan=Math.tan(camera.fov*Math.PI/360);
 const maxDistance=dev?CAMERA_LIMITS.devMaxDistance:Math.max(CAMERA_LIMITS.minDistance,Math.min(CAMERA_LIMITS.maxViewHeight,CAMERA_LIMITS.maxViewWidth/aspect)/(2*tan));
 camera.z=-clamp(-camera.z,CAMERA_LIMITS.minDistance,maxDistance);
 if(dev){camera.x=clamp(camera.x,bounds.left-15,bounds.right+15);camera.y=clamp(camera.y,bounds.bottom-15,bounds.top+15);}
 else {
  const halfHeight=-camera.z*tan,halfWidth=halfHeight*aspect;
  let left=bounds.left+halfWidth,right=bounds.right-halfWidth,bottom=bounds.bottom+halfHeight,top=bounds.top-halfHeight;
  // Account for the background plane's separate depth, not only the z=0 map.
  if(backdrop){const bh=(backdrop.z-camera.z)*tan,bw=bh*aspect;left=Math.max(left,backdrop.left+bw);right=Math.min(right,backdrop.right-bw);bottom=Math.max(bottom,backdrop.bottom+bh);top=Math.min(top,backdrop.top-bh);}
  camera.x=clamp(camera.x,left,right);camera.y=clamp(camera.y,bottom,top);
 }
 camera.far=Math.max(20000,-camera.z+10000);
 return {maxDistance,minDistance:CAMERA_LIMITS.minDistance};
}
