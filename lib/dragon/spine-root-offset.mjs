// Active adult Fly/Hover/Idle/Sleep root timelines are constant, so their
// movement deltas are zero. Native ClearEffectiveBoneOffsets still clears the
// enabled root axes after AnimationState.Apply, including constant offsets.
const ACTIVE=new Set(['Fly','Hover','Branch/Idle','Branch/Sleep','Ground/Idle','Ground/Sleep']);
export function createRootOffsetNormalizer(skeleton,{bone='root',positionX=true,positionY=true,rotation=true}={}){
 const root=skeleton.findBone(bone);
 if(!root||root.parent)throw Error('Unsupported adult root-motion hierarchy');
 return name=>{if(!ACTIVE.has(name))return;if(positionX)root.x=0;if(positionY)root.y=0;if(rotation)root.rotation=0;};
}
