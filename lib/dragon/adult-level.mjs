import {NATIVE_ADULT_LEVEL} from './generated/native-adult-level.mjs';
// Native DragonEntity.PlayLevelUpSequence: fill to white in .25s, return in 3.5s.
export function adultLevelFill(levelUpAt,now){
 if(!Number.isFinite(levelUpAt))return 0;
 const age=(now-levelUpAt)/1000;
 const {fillInSeconds:fillIn,fillOutSeconds:fillOut}=NATIVE_ADULT_LEVEL;
 if(age<0||age>=fillIn+fillOut)return 0;
 const quintic=t=>t<.5?16*t**5:1-(-2*t+2)**5/2;
 return age<fillIn?quintic(age/fillIn):1-quintic((age-fillIn)/fillOut);
}

export function createAdultLevelFill(PIXI,mesh){
 let filter=null;
 return {update(adult,now,dev){
  const phase=dev?0:adultLevelFill(adult.levelUpAt,now);
  if(phase>0&&!filter&&PIXI.Filter){filter=new PIXI.Filter(undefined,'varying vec2 vTextureCoord; uniform sampler2D uSampler; uniform float phase; void main(){vec4 c=texture2D(uSampler,vTextureCoord);gl_FragColor=vec4(mix(c.rgb,vec3(c.a),phase),c.a);}',{phase});mesh.filters=[...(mesh.filters??[]),filter];}
  if(filter){filter.uniforms.phase=phase;filter.enabled=phase>0;}
 },destroy(){if(filter){mesh.filters=mesh.filters?.filter(f=>f!==filter)??null;filter.destroy();filter=null;}}};
}
