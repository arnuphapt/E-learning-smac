// Recovered native GLES Sprite Forward programs (Orb/Question/FlowerSymbol/Vortex) with source .mat uniforms.
// Model matrix, renderer bounds, PNG sampling and sprite alpha are bridged to Pixi; native main bodies are unchanged.
import {programs,materials} from './generated/native-summon-shaders.mjs';
import {nativeWindModel} from './wind.mjs';
const identity=()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);
const QUAD=[-.5,-.5,.5,-.5,.5,.5,-.5,.5];
// SummonOrb.SetShaderNoise scales both the noise multiplier and Vector2.up.
export function setSummonOrbNoise(mesh,value){const u=mesh.shader.uniforms;u._NoiseMultiplier=value;u._SineDirection=[0,value];}
export function createNativeSummonShader(PIXI,materialName,sampled,extra={}){
 const binding=materials[materialName];if(!binding)throw Error('Missing native summon material '+materialName);
 const program=programs[binding.program];
 const shader=PIXI.Shader.from(program.vertex,program.fragment,{...binding.uniforms,_TimeParameters:[0,0,1,0],hlslcc_mtx4x4unity_MatrixVP:identity(),hlslcc_mtx4x4unity_ObjectToWorld:identity(),hlslcc_mtx4x4unity_WorldToObject:identity(),uNativeWorldToLocal:identity(),unity_RendererBounds_Min:[0,0,0,0],unity_RendererBounds_Max:[1,1,0,0],unity_SpriteColor:[1,1,1,1],unity_SpriteProps:[1,1,0,0],_RendererColor:[1,1,1,1],_GlobalMipBias:[0,0],uPremultipliedSampler:sampled.baseTexture.alphaMode===PIXI.ALPHA_MODES.NPM?0:1,uOpacity:1,...extra});
 shader.nativeSource=program.source;shader.nativeMaterial=binding.material;return shader;
}
function setNativeModel(mesh,item){
 if(!item||typeof item!=='object'||!mesh.nativeRest)return false;
 const m=nativeWindModel(mesh.nativeRest,item);if(!m)return false;
 Object.assign(mesh.shader.uniforms,{hlslcc_mtx4x4unity_ObjectToWorld:m.model,hlslcc_mtx4x4unity_WorldToObject:m.inverse,uNativeWorldToLocal:m.inverse,unity_RendererBounds_Min:m.min,unity_RendererBounds_Max:m.max});
 return true;
}
export function attachSummonShader(PIXI,mesh,g,profile,itemOrKind){
 const name=profile?.material?.replace(/^Material\//,'').replace(/\.mat$/,'');
 if(!name||!materials[name])throw Error('Missing native summon profile '+(profile?.material??'unknown'));
 mesh.geometry.addAttribute('aNativeColor',new Float32Array(g.vertices.length*2).fill(1),4);
 mesh.shader=createNativeSummonShader(PIXI,name,mesh.texture,{_MainTex:mesh.texture});mesh.blendMode=PIXI.BLEND_MODES.NORMAL;mesh.nativeRest=Float32Array.from(g.vertices);
 const item=typeof itemOrKind==='object'&&itemOrKind!==null?itemOrKind:null;
 if(item)setNativeModel(mesh,item);return mesh;
}
// SummonVortex/Vortex: source Square sprite (1x1 unit quad), SummonVortex.mat, radial mask texture.
export function createNativeVortex(PIXI,maskTexture){
 const geometry=new PIXI.MeshGeometry(new Float32Array(QUAD),new Float32Array([0,0,1,0,1,1,0,1]),new Uint16Array([0,1,2,0,2,3])).addAttribute('aNativeColor',new Float32Array(16).fill(1),4);
 const mesh=new PIXI.Mesh(geometry,createNativeSummonShader(PIXI,'SummonVortex',maskTexture,{_MaskTex:maskTexture,_RendererColor:[1,1,1,0],uOpacity:0}));
 mesh.blendMode=PIXI.BLEND_MODES.NORMAL;mesh.nativeRest=Float32Array.from(QUAD);return mesh;
}
// opacity drives the SpriteRenderer colour alpha (vs_INTERP1); item supplies the native world model.
export function updateSummonShader(mesh,time,opacity,rollOrItem,maybeItem){
 const u=mesh.shader.uniforms;
 const roll=typeof rollOrItem==='number'?rollOrItem:0;
 const changed=u._TimeParameters[0]!==time||u.uOpacity!==opacity||u.uRoll!==roll;
 u._TimeParameters=[time,Math.sin(time),Math.cos(time),0];
 u.uOpacity=opacity;
 u.uRoll=roll;
 u._RendererColor=[1,1,1,opacity];
 const item=typeof rollOrItem==='object'&&rollOrItem!==null?rollOrItem:(typeof maybeItem==='object'&&maybeItem!==null?maybeItem:null);
 if(item)setNativeModel(mesh,item);
 return changed;
}
