// Serialized Unity particle parameters; emitter sampling/integration runs in Pixi.
const clamp=x=>Math.max(0,Math.min(1,x));
export function nativeCurve(keys,t){
 if(!keys?.length)return 0;
 if(t<=keys[0].time)return keys[0].value;if(t>=keys.at(-1).time)return keys.at(-1).value;
 const i=keys.findIndex(k=>k.time>=t),a=keys[i-1],b=keys[i],d=b.time-a.time,u=(t-a.time)/d;
 return (2*u**3-3*u*u+1)*a.value+(u**3-2*u*u+u)*d*a.outSlope+(-2*u**3+3*u*u)*b.value+(u**3-u*u)*d*b.inSlope;
}
function channel(g,t,times,c){let i=times.findIndex(v=>v>=t);if(i===0)return g.keys[0][c];if(i<0)return g.keys[times.length-1][c];const u=(t-times[i-1])/(times[i]-times[i-1]);return g.keys[i-1][c]*(1-u)+g.keys[i][c]*u;}
export function nativeGradient(g,t){return [0,1,2].map(c=>channel(g,t,g.colors,c)).concat(channel(g,t,g.alphas,3));}
export const seededRandom=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
// Freeze birth scheduling when emission stops, while existing particles keep aging.
export function particleElapsed(clock,born,cycle,stopClock=Infinity){const lastBorn=born+Math.floor((Math.min(clock,stopClock)-born)/cycle)*cycle;return clock-lastBorn;}
export function streakPoint(config,start,time,radialMix=1){
 // Unity default gravity, reversed by the serialized negative gravity modifier.
 let x=start.x,y=start.y,vy=0;const steps=48,dt=time/steps;
 for(let j=0;j<steps;j++){
  const u=(j+.5)*dt/config.lifetime;
  const rMax=nativeCurve(config.radial,u),rMin=config.radialMin?.length?nativeCurve(config.radialMin,u):rMax;
  const radial=(config.radialMode===2?rMin*(1-radialMix)+rMax*radialMix:rMax)*config.speedModifier,r=Math.hypot(x,y);
  vy+=9.81*config.gravityModifier*dt;
  if(r>1e-5){x+=x/r*radial*dt;y+=y/r*radial*dt;}
  y+=vy*dt;
 }
 return {x:x+config.position[0],y:y+config.position[1]};
}
function sampleStreakStart(config,assets,i){
 if(config.shapeType===12){
  const half=(config.shapeRadius??.4)*(config.shapeScale??1.5);
  return {x:(seededRandom(i+51)*2-1)*half,y:0};
 }
 const shape=assets.sprites[config.shapeSprite];
 const tri=Math.floor(seededRandom(i+13)*(shape.indices.length/3))*3,u=Math.sqrt(seededRandom(i+51)),v=seededRandom(i+77),weights=[1-u,u*(1-v),u*v],start={x:0,y:0};
 weights.forEach((w,k)=>{const p=shape.indices[tri+k]*2;start.x+=shape.vertices[p]*w*config.shapeScale;start.y+=shape.vertices[p+1]*w*config.shapeScale;});
 return start;
}
function evalCurve(c,u,mix){
 if(!c)return 0;
 if(c.mode===0)return c.scalar;
 if(c.mode===3)return c.minScalar+mix*(c.scalar-c.minScalar);
 const hi=nativeCurve(c.max,u),lo=c.min?.length?nativeCurve(c.min,u):hi;
 return c.scalar*(c.mode===2?lo*(1-mix)+hi*mix:hi);
}
function createStripMesh(PIXI,tex,steps,blendMode=PIXI.BLEND_MODES.NORMAL){
 const vertices=new Float32Array((steps+1)*4),uv=new Float32Array((steps+1)*4),colors=new Float32Array((steps+1)*8),indices=[];
 for(let j=0;j<=steps;j++){const tail=j/steps;uv.set([tail,0,tail,1],j*4);if(j<steps){const a=j*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
 const geometry=new PIXI.Geometry().addAttribute('aVertexPosition',vertices,2).addAttribute('aTextureCoord',uv,2).addAttribute('aColor',colors,4).addIndex(indices);
 const shader=PIXI.Shader.from('precision highp float;attribute vec2 aVertexPosition;attribute vec2 aTextureCoord;attribute vec4 aColor;uniform mat3 projectionMatrix;uniform mat3 translationMatrix;varying vec2 vUV;varying vec4 vColor;void main(){gl_Position=vec4((projectionMatrix*translationMatrix*vec3(aVertexPosition,1.)).xy,0.,1.);vUV=aTextureCoord;vColor=aColor;}', 'precision mediump float;varying vec2 vUV;varying vec4 vColor;uniform sampler2D uSampler;void main(){gl_FragColor=texture2D(uSampler,vUV)*vec4(vColor.rgb*vColor.a,vColor.a);}',{uSampler:tex});
 const mesh=new PIXI.Mesh(geometry,shader);mesh.eventMode='none';mesh.blendMode=blendMode;
 const head=new PIXI.Sprite(tex);head.anchor.set(.5);head.blendMode=blendMode;
 return {mesh,head,vertices,colors,geometry};
}
export const rgbHex=(r,g,b)=>((r*255+.5)&255)<<16|((g*255+.5)&255)<<8|(b*255+.5)&255;
export function createEggStreaks(PIXI,assets,texture){
 const config=assets.egg.streak,count=Math.ceil(config.rate*config.lifetime),steps=18,trailDur=config.trailLifetime*config.lifetime;
 return Array.from({length:count},(_,i)=>{
  const {mesh,head,vertices,colors,geometry}=createStripMesh(PIXI,texture(config.texture),steps);
  mesh.addChild(head);
  const start=sampleStreakStart(config,assets,i),radialMix=seededRandom(i+151);
  const baseSize=config.size[0]+seededRandom(i+99)*(config.size[1]-config.size[0]);
  const startRot=(config.startRotation?.[0]??0)+seededRandom(i+211)*((config.startRotation?.[1]??0)-(config.startRotation?.[0]??0));
  const rotSpeed=(config.rotationSpeed?.[0]??0)+seededRandom(i+241)*((config.rotationSpeed?.[1]??0)-(config.rotationSpeed?.[0]??0));
  mesh.updateStreak=(age,lift,enabled,stopAge=Infinity,startAge=1.55)=>{
   const stopped=stopAge<Infinity&&stopAge>=startAge,emitting=enabled||stopped;
   const clock=Math.max(0,age-startAge)*config.simulationSpeed,born=i/config.rate,cycle=count/config.rate,stopClock=stopped?Math.max(0,stopAge-startAge)*config.simulationSpeed:Infinity,elapsed=particleElapsed(clock,born,cycle,stopClock);
   mesh.visible=emitting&&age>=startAge&&Math.min(clock,stopClock)>=born&&elapsed>=0&&elapsed<config.lifetime;if(!mesh.visible)return;
   const lifeT=elapsed/config.lifetime,initial=nativeGradient(config.startColor,seededRandom(i+333)),base=nativeGradient(config.color,lifeT).map((v,k)=>v*initial[k]);
   const trailLife=config.trailColorOverLifetime?nativeGradient(config.trailColorOverLifetime,lifeT):[1,1,1,1];
   const headPos=streakPoint(config,start,elapsed,radialMix),headScale=baseSize*nativeCurve(config.sizeCurve,lifeT);
   head.position.set(headPos.x,headPos.y-lift);head.width=head.height=headScale;head.rotation=startRot+rotSpeed*elapsed;
   head.tint=rgbHex(base[0],base[1],base[2]);head.alpha=base[3];
   for(let j=0;j<=steps;j++){
    const tail=j/steps,t=elapsed-tail*trailDur,u=clamp(t/config.lifetime),p=streakPoint(config,start,Math.max(0,t),radialMix),q=streakPoint(config,start,Math.min(config.lifetime,Math.max(0,t)+.001),radialMix),dx=q.x-p.x,dy=q.y-p.y,n=Math.hypot(dx,dy)||1,width=baseSize*nativeCurve(config.sizeCurve,u)*.5,color=nativeGradient(config.trailColor,tail);
    vertices.set([p.x-dy/n*width,p.y+dx/n*width-lift,p.x+dy/n*width,p.y-dx/n*width-lift],j*4);
    const rgba=[base[0]*trailLife[0]*color[0],base[1]*trailLife[1]*color[1],base[2]*trailLife[2]*color[2],t<0?0:base[3]*trailLife[3]*color[3]];colors.set(rgba,j*8);colors.set(rgba,j*8+4);
   }
   geometry.getBuffer('aVertexPosition').update();geometry.getBuffer('aColor').update();
  };return mesh;
 });
}
export function sampleSideTrajectory(sp,emitter,start,elapsed,radialMix,samples){
 let x=start.x,y=start.y,z=0,vy=0;const dt=elapsed>0?elapsed/samples:0,pts=[];
 const radSpec={mode:sp.velocity.radialMode,scalar:1,minScalar:0,max:sp.velocity.radial,min:sp.velocity.radialMin};
 for(let s=0;s<=samples;s++){
  pts.push({x:emitter.position[0]+x*emitter.scale[0],y:emitter.position[1]-y*emitter.scale[1]});
  if(s===samples||dt<=0)continue;
  const u=((s+.5)*dt)/sp.lifetime,ox=evalCurve(sp.velocity.orbitalX,u,radialMix),oy=evalCurve(sp.velocity.orbitalY,u,radialMix),oz=evalCurve(sp.velocity.orbitalZ,u,radialMix);
  const dx=x-sp.velocity.orbitalOffset[0],dy=y-sp.velocity.orbitalOffset[1],dz=z-sp.velocity.orbitalOffset[2];
  let vx=evalCurve(sp.velocity.x,u,radialMix)+(oy*dz-oz*dy),voy=evalCurve(sp.velocity.y,u,radialMix)+(oz*dx-ox*dz),vz=evalCurve(sp.velocity.z,u,radialMix)+(ox*dy-oy*dx);
  const r=Math.hypot(x,y,z);if(r>1e-5){const rad=evalCurve(radSpec,u,radialMix);vx+=x/r*rad;voy+=y/r*rad;vz+=z/r*rad;}
  vy+=-9.81*sp.gravityModifier*dt;const sm=sp.velocity.speedModifier;
  x+=vx*sm*dt;y+=(voy*sm+vy)*dt;z+=vz*sm*dt;
 }
 return pts;
}
export function sideTrailSpan(elapsed,trailDuration){return elapsed>0?Math.min(1,trailDuration/elapsed):0;}
export function createSideParticles(PIXI,assets,texture){
 const sp=assets.egg.sideParticles,perSide=Math.round(sp.rate*sp.lifetime),steps=24,samples=64,tex=texture(sp.texture);
 const matTint=sp.material.tint,matAlpha=sp.material.opacityAlpha,trailDur=sp.trail.lifetime*sp.lifetime;
 const items=[],motes=[],trails=[];
 for(let eIdx=0;eIdx<sp.emitters.length;eIdx++){
  const emitter=sp.emitters[eIdx];
  for(let k=0;k<perSide;k++){
   const seed=eIdx*100+k,strip=createStripMesh(PIXI,tex,steps,PIXI.BLEND_MODES.ADD);
   const ang=seededRandom(seed+13)*Math.PI*2,rad0=Math.sqrt(seededRandom(seed+51))*sp.shapeRadius*sp.shapeScale;
   const start={x:Math.cos(ang)*rad0,y:Math.sin(ang)*rad0};
   const radialMix=seededRandom(seed+151),baseSize=sp.size[0]+seededRandom(seed+99)*(sp.size[1]-sp.size[0]);
   const startRot=sp.startRotation[0]+seededRandom(seed+211)*(sp.startRotation[1]-sp.startRotation[0]);
   const rotSpeed=evalCurve(sp.rotation.rate,0,seededRandom(seed+241)),startMix=seededRandom(seed+333);
   motes.push(strip.head);trails.push(strip.mesh);
   items.push({emitter,k,strip,start,radialMix,baseSize,startRot,rotSpeed,startMix});
  }
 }
 return {
  motes,trails,
  update(age,lift,enabled,stopAge=Infinity,startAge=1.65){
   const stopped=stopAge<Infinity&&stopAge>=startAge,started=(enabled||stopped)&&age>=startAge;
   const clock=Math.max(0,age-startAge)*sp.simulationSpeed,cycle=perSide/sp.rate,stopClock=stopped?Math.max(0,stopAge-startAge)*sp.simulationSpeed:Infinity;
   for(const it of items){
    const {emitter,k,strip,start,radialMix,baseSize,startRot,rotSpeed,startMix}=it,{mesh,head,vertices,colors,geometry}=strip;
    const born=k/sp.rate,elapsed=particleElapsed(clock,born,cycle,stopClock),active=started&&Math.min(clock,stopClock)>=born&&elapsed>=0&&elapsed<sp.lifetime;
    head.visible=mesh.visible=active;if(!active)continue;
    const lifeT=clamp(elapsed/sp.lifetime),pts=sampleSideTrajectory(sp,emitter,start,elapsed,radialMix,samples);
    const initial=nativeGradient(sp.startColor.gradient,startMix),lifeCol=nativeGradient(sp.color,lifeT);
    const baseRgb=[matTint[0]*initial[0]*lifeCol[0],matTint[1]*initial[1]*lifeCol[1],matTint[2]*initial[2]*lifeCol[2]];
    const headAlpha=initial[3]*lifeCol[3]*matAlpha,headSize=baseSize*nativeCurve(sp.sizeCurve,lifeT);
    const hp=pts[samples];
    head.position.set(hp.x,hp.y-lift);head.width=head.height=headSize;
    head.rotation=(startRot+rotSpeed*elapsed)*(emitter.scale[0]<0?-1:1);
    head.tint=rgbHex(baseRgb[0],baseRgb[1],baseRgb[2]);head.alpha=headAlpha;
    const trailCol=nativeGradient(sp.trail.colorOverLifetime,lifeT),spanFrac=sideTrailSpan(elapsed,trailDur);
    const trailFade=smoothstep01(elapsed/.15);
    for(let j=0;j<=steps;j++){
     const tail=j/steps,idx=clamp(1-tail*spanFrac)*samples,i0=Math.min(samples-1,Math.floor(idx)),f=idx-i0;
     const p={x:pts[i0].x*(1-f)+pts[i0+1].x*f,y:pts[i0].y*(1-f)+pts[i0+1].y*f};
     const pPrev=pts[Math.max(0,i0)],pNext=pts[Math.min(samples,i0+1)],dx=pNext.x-pPrev.x,dy=pNext.y-pPrev.y,n=Math.hypot(dx,dy)||1;
     const w=(dx===0&&dy===0?0:headSize*.5*evalCurve(sp.trail.widthOverTrail,tail,0)),ct=nativeGradient(sp.trail.colorOverTrail,tail);
     vertices.set([p.x-dy/n*w,p.y+dx/n*w-lift,p.x+dy/n*w,p.y-dx/n*w-lift],j*4);
     const rgba=[baseRgb[0]*trailCol[0]*ct[0],baseRgb[1]*trailCol[1]*ct[1],baseRgb[2]*trailCol[2]*ct[2],initial[3]*lifeCol[3]*trailCol[3]*ct[3]*matAlpha*trailFade];
     colors.set(rgba,j*8);colors.set(rgba,j*8+4);
    }
    geometry.getBuffer('aVertexPosition').update();geometry.getBuffer('aColor').update();
   }
  }
 };
}
function smoothstep01(x){x=clamp(x);return x*x*(3-2*x);}
