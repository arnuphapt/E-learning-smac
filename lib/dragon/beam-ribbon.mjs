import {vertex,fragment,provenance} from './generated/native-trail.mjs';
const clamp=x=>Math.max(0,Math.min(1,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);};
export const DEFAULT_BEAM_PROFILE={particleSize:.5,widthMultiplier:.7,widthEnd:.75,colorStart:[0,.9884035,1],colorEnd:[1,1,1],colorTimes:[32768/65535,1],alphaTimes:[6554/65535,65466/65535],noiseScale:30,noiseSpeed:-.25,noiseSaturation:.8,textureScale:[.25,.5]};
export function ribbonWindow(t){return {head:smooth(t/.78),tail:smooth((t-.25)/.75),alpha:smooth(t/.10)*(1-smooth((t-.86)/.14))};}
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
// Use a fixed birth-to-death arc table. Trimming expired trail vertices must not
// reset Static UVs, or change the noise phase on the surviving part of the path.
export function particleTrailArc(pointAt,lifetime){
 const count=Math.max(1,Math.ceil(lifetime*240)),distances=new Float64Array(count+1);let previous=pointAt(0);
 for(let i=1;i<=count;i++){const next=pointAt(lifetime*i/count);distances[i]=distances[i-1]+Math.hypot(next.x-previous.x,next.y-previous.y);previous=next;}
 return age=>{const t=clamp(age/lifetime)*count,i=Math.min(count-1,Math.floor(t));return distances[i]+(distances[i+1]-distances[i])*(t-i);};
}
export function createNativeTrailShader(PIXI,profile={},texture){
 const p={...DEFAULT_BEAM_PROFILE,...profile};
 return PIXI.Shader.from(vertex,fragment,{
  hlslcc_mtx4x4unity_MatrixVP:identity(),hlslcc_mtx4x4unity_ObjectToWorld:identity(),
  _RendererColor:[1,1,1,1],unity_SpriteColor:[1,1,1,1],unity_SpriteProps:[1,1,0,0],
  _MainTex:texture??PIXI.Texture.WHITE,_GlobalMipBias:[0,0],_TimeParameters:[0,0,1,0],
  _NoiseScale:p.noiseScale,_NoiseSpeed:Array.isArray(p.noiseSpeed)?p.noiseSpeed:[p.noiseSpeed,0],_NoiseSaturation:p.noiseSaturation
 });
}
function makeRibbon(PIXI,profile,texture){
 const segments=40,capSegments=8,rows=segments+1+capSegments*2,positions=new Float32Array(rows*4),uvs=new Float32Array(rows*4),colors=new Float32Array(rows*8),indices=new Uint16Array((rows-1)*6);
 for(let i=0;i<rows-1;i++)indices.set([i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2],i*6);
 const geometry=new PIXI.MeshGeometry(positions,uvs,indices).addAttribute('aNativeColor',colors,4),mesh=new PIXI.Mesh(geometry,createNativeTrailShader(PIXI,profile,texture));
 mesh.blendMode=PIXI.BLEND_MODES.NORMAL_NPM;mesh.eventMode='none';mesh.visible=false;mesh.nativeShaderSource=provenance;
 return {mesh,positions,uvs,colors,segments,capSegments,rows};
}
export function createRibbonLayer(PIXI,{profile={},texture}={}){
 const config={...DEFAULT_BEAM_PROFILE,...profile},layer=new PIXI.Container(),parts=Array.from({length:3},()=>makeRibbon(PIXI,config,texture));let used=0;
 for(const p of parts)layer.addChild(p.mesh);layer.ribbons=parts.map(p=>p.mesh);layer.eventMode='none';
 layer.clear=()=>{used=0;for(const p of parts)p.mesh.visible=false;};
 layer.drawRibbon=(start,end,t,opacity=1,time=t,native=null)=>{
  if(t<=0||t>=1||used>=parts.length)return;
  const p=parts[used++],{head,tail,alpha}=native?{head:1,tail:0,alpha:1}:ribbonWindow(t),dx=end.x-start.x,dy=end.y-start.y,d=Math.hypot(dx,dy)||1,control={x:(start.x+end.x)/2-dy/d*.60,y:(start.y+end.y)/2+dx/d*.60};
  const point=q=>{if(native){const p=native.pointAt(Math.max(0,native.age-native.trailLifetime)+(Math.min(native.age,native.trailLifetime))*q);return {x:p.x,y:-p.y};}return {x:(1-q)**2*start.x+2*(1-q)*q*control.x+q*q*end.x,y:-((1-q)**2*start.y+2*(1-q)*q*control.y+q*q*end.y)};},direction=q=>{if(native){const a=point(Math.max(0,q-.0001)),b=point(Math.min(1,q+.0001)),n=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/n,y:(b.y-a.y)/n};}const x=2*(1-q)*(control.x-start.x)+2*q*(end.x-control.x),y=-(2*(1-q)*(control.y-start.y)+2*q*(end.y-control.y)),n=Math.hypot(x,y)||1;return {x:x/n,y:y/n};};
  let length=0,previous=point(tail);for(let i=1;i<=p.segments;i++){const next=point(tail+(head-tail)*i/p.segments);length+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next;}if(length<.00001){p.mesh.visible=false;return;}
  // Static trail UVs stay anchored to travelled distance instead of stretching as the tail contracts.
  const distances=new Float32Array(129);let last=point(0);for(let i=1;i<=128;i++){const next=point(i/128);distances[i]=distances[i-1]+Math.hypot(next.x-last.x,next.y-last.y);last=next;}
  const distanceAt=q=>{const x=clamp(q)*128,i=Math.min(127,Math.floor(x));return distances[i]+(distances[i+1]-distances[i])*(x-i);};
  const nativeDistance=native?particleTrailArc(native.pointAt,native.particleLifetime):null;
  // Joined billboards define the visible diameter for the whole ribbon. Merely
  // narrowing its last edge leaves an inflated body immediately behind the cap.
  const headWidth=native?.join?.width??(native?.particleWidth??config.particleSize)*config.widthMultiplier;
  for(let row=0;row<p.rows;row++){
   const body=row-p.capSegments,s=clamp(body/p.segments),q=tail+(head-tail)*s,center=point(q),dir=direction(q),half=headWidth*(1+(config.widthEnd-1)*smooth(1-s))*.5;
   let across=half,extension=0;
   // Rounded silhouette is geometry, not a fabricated fragment lighting formula.
   if(!native&&body<0){const angle=(body/p.capSegments)*Math.PI/2;extension=Math.sin(angle)*half;across=Math.cos(angle)*half;}
   if(!native&&body>p.segments){const angle=((body-p.segments)/p.capSegments)*Math.PI/2;extension=Math.sin(angle)*half;across=Math.cos(angle)*half;}
   center.x+=dir.x*extension;center.y+=dir.y*extension;
   let offsetX=-dir.y*across,offsetY=dir.x*across;
   if(native?.join){
    const join=native.join,age=Math.max(0,native.age-native.trailLifetime)+Math.min(native.age,native.trailLifetime)*q;
    const remaining=nativeDistance(native.age)-nativeDistance(age),blend=smooth(1-remaining/join.length);
    const sign=(-dir.y*join.normal.x+dir.x*join.normal.y)<0?-1:1;
    // Interpolate direction, then normalize it. Interpolating edge vectors also
    // interpolates their lengths, creating a neck as the two normals rotate.
    const nx=-dir.y*(1-blend)+join.normal.x*sign*blend,ny=dir.x*(1-blend)+join.normal.y*sign*blend,n=Math.hypot(nx,ny)||1;
    offsetX=nx/n*across;
    offsetY=ny/n*across;
   }
   const along=1-s,ramp=clamp((along-config.colorTimes[0])/(config.colorTimes[1]-config.colorTimes[0])),a=(1-clamp((along-config.alphaTimes[0])/(config.alphaTimes[1]-config.alphaTimes[0])))*alpha*opacity;
   for(let side=0;side<2;side++){
    const v=side?1:-1,k=row*4+side*2,c=row*8+side*4;p.positions[k]=center.x+offsetX*v;p.positions[k+1]=center.y+offsetY*v;
    const travelled=nativeDistance?nativeDistance(Math.max(0,native.age-native.trailLifetime)+Math.min(native.age,native.trailLifetime)*q):distanceAt(q)+extension;
    p.uvs[k]=travelled*config.textureScale[0];p.uvs[k+1]=side*config.textureScale[1];
    for(let j=0;j<3;j++)p.colors[c+j]=(config.colorStart[j]+(config.colorEnd[j]-config.colorStart[j])*ramp)*(native?.color?.[j]??1);p.colors[c+3]=a*(native?.color?.[3]??1);
   }
  }
  for(const name of ['aVertexPosition','aTextureCoord','aNativeColor'])p.mesh.geometry.getBuffer(name).update();
  p.mesh.shader.uniforms._TimeParameters=[time,Math.sin(time),Math.cos(time),0];p.mesh.visible=true;
 };
 layer.drawParticleTrail=(pointAt,age,trailLifetime,opacity=1,time=age,particleWidth=config.particleSize,{color=[1,1,1,1],particleLifetime=Math.max(age,trailLifetime),join=null}={})=>{if(age<=0)return;layer.drawRibbon({x:0,y:0},{x:0,y:0},.5,opacity,time,{pointAt,age,trailLifetime,particleWidth,color,particleLifetime,join});};
 return layer;
}
