import {NATIVE_HOVER} from './generated/native-hover.mjs';

// PupaEntity.Hatch (1.6.3): EntityData.GetPos + _reticleOffset (0,1,0),
// then DragonSkelInfo._spawnOffset, with X multiplied by the baby's orientation.
// DragonEntity.Start subsequently chooses its own cruise Z; this is the XY root.
export function adultSpawnPosition(origin,skeletonID=0){
 const [dx,dy]=NATIVE_HOVER.skeletons[skeletonID].spawnOffset;
 const facing=Math.sign(origin.scaleX)||1,f=Math.fround;
 return {x:f(f(origin.XPos)+f(dx*facing)),y:f(f(f(origin.YPos)+1)+dy)};
}
