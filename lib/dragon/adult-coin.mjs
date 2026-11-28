import {nativeCurve} from './egg-streak.mjs';
export const COIN_ATLAS_NAME='sactx-0-2048x2048-ASTC 6x6-GenericIcons-5677c548.webp';
export const SPARKLE_TEXTURE_NAME='QuadSoft.webp';
export const COIN_SPRITE={x:1108.0762,y:932.0761,width:113.881,height:107.897,pivotX:0.49985,pivotY:0.49977,ppu:100,atlasSize:2048,scale:0.6};
const HEADER_OFFSET_Y=new Map([[0,1.5],[1,1.5],[2,1.75],[3,1.25],[4,1.5],[5,1.5],[6,1.75],[7,1.25],[8,1.75],[9,1.5],[10,1.5],[11,1.25],[12,1.5],[13,1.5]]);
const BODY_BONE_IDS=new Set([3,7,8]);
export const coinHeaderOffsetY=skeletonID=>HEADER_OFFSET_Y.get(skeletonID)??1.5;
export const coinBoneName=({skeletonID,adultFamily}={})=>BODY_BONE_IDS.has(skeletonID)||/^(Long)?Loong|^Micro/i.test(adultFamily??'')?'Body':'Head';
export const coinSpinScaleX=tSeconds=>Math.cos(Math.PI*tSeconds)*COIN_SPRITE.scale;
export function stepCoinVisibility({shown=false,state,readyToHarvest=false,harvested=false,dev=false}){
 const nextShown=harvested?false:(!dev&&state==='Perching')?Boolean(readyToHarvest):Boolean(shown);
 return {shown:nextShown,visible:nextShown&&!dev};
}
export function elasticOut(u){
 if(u<=0)return 0;if(u>=1)return 1;
 return Math.pow(2,-10*u)*Math.sin((u-0.075)*(2*Math.PI)/0.3)+1;
}
export const sinusoidalOut=u=>u<=0?0:u>=1?1:Math.sin(u*Math.PI/2);
export function coinParticleState(tSeconds){
 const t=Math.max(0,tSeconds);
 const offsetY=t<0.8?2.0*elasticOut(t/0.8):2.0;
 const alpha=t<2.8?1:t>=3.8?0:1-sinusoidalOut((t-2.8)/1.0);
 return {offsetY,labelVisible:t>=0.25&&t<3.8,alpha,sparkleSpawned:t>=0.25,done:t>=3.8};
}
export const COLLECT_SC_START_ALPHA_KEYS=[
 {time:21627/65535,value:1},
 {time:43253/65535,value:0.39215687},
 {time:65535/65535,value:0.78431374},
];
export function evalFixedGradient(keys,t){
 const u=Math.max(0,Math.min(1,t));
 for(const k of keys)if(k.time>=u)return k.value;
 return keys.length?keys[keys.length-1].value:1;
}
export const COLLECT_SC_VELOCITY={
 scalar:2,
 speedModifier:6.34,
 x:{
  min:[{time:0,value:1,inSlope:0,outSlope:0},{time:0.3123231,value:0,inSlope:0,outSlope:0}],
  max:[{time:0,value:-1,inSlope:0,outSlope:0},{time:0.3176179,value:0,inSlope:0,outSlope:0}],
 },
 y:{
  min:[{time:0,value:1,inSlope:0,outSlope:0},{time:0.3202896,value:0,inSlope:0,outSlope:0}],
  max:[{time:0,value:-1,inSlope:0,outSlope:0},{time:0.3182013,value:0,inSlope:0,outSlope:0}],
 },
 z:{
  min:[{time:0,value:1,inSlope:0,outSlope:0},{time:0.31199706,value:0,inSlope:0,outSlope:0}],
  max:[{time:0.005317688,value:-1,inSlope:0,outSlope:0},{time:0.31996214,value:0,inSlope:0,outSlope:0}],
 },
};
export const REF_CAMERA_DIST=40/(2*Math.tan(0.25*Math.PI/360));
export const collectSCPerspective=(dz,depth0=REF_CAMERA_DIST)=>depth0/Math.max(0.5,depth0+dz);
export function sampleCollectSCVelocityAxis(axis,t,mix){
 const lo=nativeCurve(axis.min,t)*COLLECT_SC_VELOCITY.scalar,hi=nativeCurve(axis.max,t)*COLLECT_SC_VELOCITY.scalar;
 return (lo+(hi-lo)*mix)*COLLECT_SC_VELOCITY.speedModifier;
}
export function integrateCollectSCVelocityAxis(axis,dtSeconds,mix,steps=24){
 const span=Math.min(Math.max(0,dtSeconds),0.325);
 if(span<=0)return 0;
 const dt=span/steps;let pos=0;
 for(let s=0;s<steps;s++)pos+=sampleCollectSCVelocityAxis(axis,(s+0.5)*dt,mix)*dt;
 return pos;
}
export function sampleDonutSpawn({radius=0.0001,donutRadius=0.2,radiusThickness=1,arcDeg=360,arcSpeed=1,arcSpread=0,systemTime=0,duration=1,random=Math.random}={}){
 const normTime=duration>0?Math.max(0,systemTime/duration):0;
 let phase=(normTime*arcSpeed)%1;
 if(arcSpread>0)phase=Math.floor(phase/arcSpread)*arcSpread;
 const theta=phase*arcDeg*Math.PI/180,inner=1-radiusThickness;
 const r=donutRadius*Math.sqrt(inner*inner+(1-inner*inner)*random()),phi=random()*Math.PI*2,rho=radius+r*Math.cos(phi);
 return {x:rho*Math.cos(theta),y:rho*Math.sin(theta),z:r*Math.sin(phi),theta};
}
const sizeOverLifetime=p=>{
 const u=Math.max(0,Math.min(1,p));
 // CollectSCParticle.prefab SizeModule curve: (0,1)->(1,0) with outWeight 1/3, inWeight 0.18018.
 const inv=1-u;return inv*inv*inv+3*inv*inv*u;
};
const sampleColor=p=>{
 const stops=[[0.05,255,255,255],[0.12477,255,254,248],[0.27004,249,232,143],[0.99818,251,237,143]];
 if(p<=stops[0][0])return (stops[0][1]<<16)|(stops[0][2]<<8)|stops[0][3];
 for(let i=1;i<stops.length;i++){
  const [t1,r1,g1,b1]=stops[i],[t0,r0,g0,b0]=stops[i-1];
  if(p<=t1){const f=(p-t0)/(t1-t0),r=Math.round(r0+(r1-r0)*f),g=Math.round(g0+(g1-g0)*f),b=Math.round(b0+(b1-b0)*f);return (r<<16)|(g<<8)|b;}
 }
 return 0xfbed8f;
};
export function sparkleQuadState(dtSeconds,startSize,{startAlpha=1,spin=0}={}){
 const dt=Math.max(0,dtSeconds),p=Math.min(1,dt/1.0);
 const peak=2568/65535,end=65100/65535;
 const curveAlpha=p<=0?0:p<peak?p/peak:p>=end?0:Math.max(0,1-(p-peak)/(end-peak));
 return {alpha:curveAlpha*startAlpha,size:Math.max(0,startSize*sizeOverLifetime(p)),droopY:0.04905*dt*dt,rotation:Math.PI/4+spin*dt,tint:sampleColor(p),done:p>=1};
}
export function coinMeshGeometry(){
 const {x,y,width,height,pivotX,pivotY,ppu,atlasSize}=COIN_SPRITE;
 const tw=width/ppu,th=height/ppu,left=-tw*pivotX,right=left+tw,top=-th*(1-pivotY),bottom=top+th;
 const topY=atlasSize-y-height,u0=x/atlasSize,u1=(x+width)/atlasSize,v0=topY/atlasSize,v1=(topY+height)/atlasSize;
 return {vertices:[left,top,right,top,right,bottom,left,bottom],uvs:[u0,v0,u1,v0,u1,v1,u0,v1],indices:[0,1,2,2,3,0]};
}
export function createCoinMesh(PIXI,atlasTexture){
 const g=coinMeshGeometry();
 const mesh=new PIXI.SimpleMesh(atlasTexture,Float32Array.from(g.vertices),Float32Array.from(g.uvs),Uint16Array.from(g.indices));
 mesh.autoUpdate=false;mesh.eventMode='none';return mesh;
}
export function dragonBoneWorldXY(entry,boneName){
 const bone=entry.live?.skeleton?.findBone?.(boneName),item=entry.item;
 if(!bone||!Number.isFinite(bone.worldX)||!Number.isFinite(bone.worldY))return {x:item.XPos,y:item.YPos};
 const point=entry.live.skeletonPointToMesh?.(bone.worldX,bone.worldY)??{x:bone.worldX,y:bone.worldY};
 const sx=item.scaleX*point.x*0.01,sy=item.scaleY*(-point.y*0.01),theta=(item.rotation||0)*Math.PI/180,c=Math.cos(theta),s=Math.sin(theta);
 return {x:item.XPos+sx*c-sy*s,y:item.YPos-(sx*s+sy*c)};
}
export function createCoinParticleEntry({PIXI,actorId,reward,x,y,zPos,layerZ,atlasTexture,quadTexture,now=Date.now(),random=Math.random}){
 const root=new PIXI.Container();root.eventMode='none';
 // CollectSCParticle sortingOrder 0 vs CurrencyParticle icon/label sortingOrder 2.
 const burst=new PIXI.Container();burst.eventMode='none';burst.visible=false;root.addChild(burst);
 const icon=atlasTexture?createCoinMesh(PIXI,atlasTexture):null;
 if(icon){icon.scale.set(COIN_SPRITE.scale);root.addChild(icon);}
 const label=PIXI.Text?new PIXI.Text(String(reward),{fontFamily:'DragonSourceUI, Tahoma, sans-serif',fontWeight:'700',fontSize:64,fill:'#ffffff',dropShadow:true,dropShadowColor:'#000000',dropShadowAlpha:0.5,dropShadowBlur:4,dropShadowDistance:2,dropShadowAngle:Math.PI/2}):null;
 if(label){label.anchor.set(0,0.5);label.position.set(0.68,0);label.scale.set(0.7/64);label.visible=false;root.addChild(label);}
 const quads=[];
 const startAlpha=evalFixedGradient(COLLECT_SC_START_ALPHA_KEYS,0),baseDepth=Math.max(0.5,(layerZ??0)+(zPos??0)+REF_CAMERA_DIST);
 if(quadTexture){
  for(let i=0;i<12;i++){
   const q=new PIXI.SimpleMesh(quadTexture,Float32Array.from([-0.5,-0.5,0.5,-0.5,0.5,0.5,-0.5,0.5]),Float32Array.from([0,0,1,0,1,1,0,1]),Uint16Array.from([0,1,2,2,3,0]));
   q.autoUpdate=false;q.eventMode='none';
   burst.addChild(q);
   const s=sampleDonutSpawn({systemTime:0,duration:1,random});
   const mixX=random(),mixY=random(),mixZ=random(),size=0.3+random()*0.2,spin=(random()*2-1)*Math.PI*2;
   quads.push({mesh:q,x0:s.x,y0:s.y,z0:s.z,mixX,mixY,mixZ,size,spin,startAlpha});
  }
 }
 const targetY=y+2.0;
 const item={GUID:'coin-particle-'+actorId+'-'+now,SymbolID:'CurrencyParticle',isMarker:false,XPos:x,YPos:y,ZPos:zPos,rotation:0,scaleX:1,scaleY:1};
 return {
  actorId:item.GUID,kind:'coin-particle',mesh:root,label,item,layerZ,gameplayHidden:false,
  destroy(){
   if(label&&!label.destroyed){root.removeChild?.(label);label.destroy?.({texture:true,baseTexture:true});}
   root.destroy?.({children:true,texture:false,baseTexture:false});
  },
  update(curNow,dev){
   const t=(curNow-now)/1000,st=coinParticleState(t);
   item.YPos=y+st.offsetY;
   if(dev){this.gameplayHidden=true;root.visible=false;return st.done;}
   this.gameplayHidden=st.done;root.visible=!st.done;
   if(icon)icon.alpha=st.alpha;
   if(label){label.visible=st.labelVisible;label.alpha=st.alpha;}
   if(st.sparkleSpawned){
    const dt=t-0.25;burst.visible=dt<1.0;burst.y=item.YPos-targetY;
    if(burst.visible){
     for(const q of quads){
      const qs=sparkleQuadState(dt,q.size,{startAlpha:q.startAlpha,spin:q.spin});
      const dx=q.x0+integrateCollectSCVelocityAxis(COLLECT_SC_VELOCITY.x,dt,q.mixX);
      const dy=q.y0+integrateCollectSCVelocityAxis(COLLECT_SC_VELOCITY.y,dt,q.mixY)-qs.droopY;
      const dz=q.z0+integrateCollectSCVelocityAxis(COLLECT_SC_VELOCITY.z,dt,q.mixZ);
      const persp=collectSCPerspective(dz,baseDepth);
      q.mesh.position.set(dx*persp,-dy*persp);
      q.mesh.scale.set(qs.size*Math.SQRT1_2*persp,qs.size*persp);q.mesh.rotation=qs.rotation;q.mesh.alpha=qs.alpha;q.mesh.tint=qs.tint;
     }
    }
   }
   return st.done;
  },
 };
}
