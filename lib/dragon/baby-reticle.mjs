// PupaEntity..ctor 0x175f248: _reticleOffset=(0,1,0).
// The reticle is parented to the entity, separate from the species-scaled root bone.
export const BABY_RETICLE_OFFSET={x:0,y:1};
export function babyReticleFrame(baby){
 const speciesScale=baby.species?.babyScale??1;
 return {scaleX:(baby.item.scaleX??1)/speciesScale,scaleY:(baby.item.scaleY??1)/speciesScale,rotation:baby.item.rotation??0};
}
export function babyReticlePosition(baby){
 const frame=babyReticleFrame(baby),angle=frame.rotation*Math.PI/180;
 return {x:baby.item.XPos-Math.sin(angle)*BABY_RETICLE_OFFSET.y*frame.scaleY,y:baby.item.YPos+Math.cos(angle)*BABY_RETICLE_OFFSET.y*frame.scaleY};
}
