// Native GLES wind equations; model/bounds and PNG sampling are bridged to Pixi.
import {programs} from './generated/native-wind.mjs';
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
export function nativeWindModel(vertices,item){
 const r=-(item.rotation??0)*Math.PI/180,sx=item.scaleX??1,sy=item.scaleY??1,c=Math.cos(r),s=Math.sin(r),a=c*sx,b=s*sx,d=c*sy,k=-s*sy,det=a*d-b*k,tx=item.XPos??0,ty=item.YPos??0,z=item.ZPos??0;
 if(Math.abs(det)<1e-12)return null;
 const model=new Float32Array([a,b,0,0,k,d,0,0,0,0,1,0,tx,ty,z,1]),inverse=new Float32Array([d/det,-b/det,0,0,-k/det,a/det,0,0,0,0,1,0,(k*ty-d*tx)/det,(b*tx-a*ty)/det,-z,1]);
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(let i=0;i<vertices.length;i+=2){const x=a*vertices[i]-k*vertices[i+1]+tx,y=b*vertices[i]-d*vertices[i+1]+ty;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 return {model,inverse,min:[minX,minY,z,0],max:[maxX,maxY,z,0]};
}
export function createWind(mesh,vertices,item,profile){
 const PIXI=globalThis.PIXI,program=programs[item.materialID];if(!program)throw Error('Missing native wind program '+item.materialID);if(profile.nativeProgram!==program.source)throw Error('Wind profile/program mismatch '+item.materialID);
 const rest=Float32Array.from(vertices),originalShader=mesh.shader,texture=mesh.texture,tint=mesh.tint,originalBlend=mesh.blendMode,colors=new Float32Array(rest.length*2).fill(1);mesh.geometry.addAttribute('aNativeColor',colors,4);
 const uniforms={...program.uniforms,_TimeParameters:[0,0,1,0],hlslcc_mtx4x4unity_MatrixVP:identity(),hlslcc_mtx4x4unity_ObjectToWorld:identity(),hlslcc_mtx4x4unity_WorldToObject:identity(),uNativeWorldToLocal:identity(),unity_RendererBounds_Min:[0,0,0,0],unity_RendererBounds_Max:[1,1,0,0],unity_SpriteColor:[1,1,1,1],unity_SpriteProps:[1,1,0,0],_RendererColor:[1,1,1,1],_MainTex:texture,_GlobalMipBias:[0,0],uPremultipliedSampler:texture.baseTexture.alphaMode===PIXI.ALPHA_MODES.NPM?0:1};
 const shader=PIXI.Shader.from(program.vertex,program.fragment,uniforms);shader.texture=texture;shader.tint=tint;shader.alpha=1;shader.update=()=>{const color=shader.tint;uniforms._RendererColor=[((color>>16)&255)/255,((color>>8)&255)/255,(color&255)/255,shader.alpha];};
 let modelKey='',enabled=false;
 const extent=v=>Math.max(...(v??[0]).map(Math.abs)),u=program.uniforms,noise=extent(u._NoiseOutRange)*(u._NoiseMultiplier??0),sine=extent(u._SineOutRange),height=extent(u._HeightOutRange??u._HeightOutRangeNoise),heightSine=extent(u._HeightOutRangeSine??u._HeightOutRange),random=Math.max(Math.abs(u._RandomMin??1),Math.abs(u._RandomMax??1));
 const paddingWorld=Math.max(.5,(noise*height*Math.abs(u._HeightMultiplierNoise??u._HeightMultiplier??1)+sine*heightSine*Math.abs(u._HeightMultiplierSine??u._HeightMultiplier??1)*random)*Math.hypot(...u._WindDirection)*2);
 const wind={mesh,rest,paddingWorld,materialID:item.materialID,shader,program,updateModel(){const key=[item.XPos,item.YPos,item.ZPos,item.rotation,item.scaleX,item.scaleY].join(':');if(key===modelKey)return true;const m=nativeWindModel(rest,item);if(!m)return false;modelKey=key;Object.assign(uniforms,{hlslcc_mtx4x4unity_ObjectToWorld:m.model,hlslcc_mtx4x4unity_WorldToObject:m.inverse,uNativeWorldToLocal:m.inverse,unity_RendererBounds_Min:m.min,unity_RendererBounds_Max:m.max});return true;},
  update(seconds){if(!wind.updateModel()){wind.restore();return;}uniforms._TimeParameters=[seconds,Math.sin(seconds),Math.cos(seconds),0];mesh.shader=shader;mesh.blendMode=PIXI.BLEND_MODES.NORMAL;enabled=true;},
  restore(){if(!enabled)return;originalShader.tint=shader.tint;mesh.shader=originalShader;mesh.blendMode=originalBlend;enabled=false;},
  destroy(){wind.restore();shader.destroy();},
  get enabled(){return enabled;}
 };
 wind.updateModel();mesh.nativeWind=wind;return wind;
}
