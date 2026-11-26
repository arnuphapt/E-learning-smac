// GameEntityAnimator.QueueTrackEntry: finite loops are separate non-looping
// entries. AddAnimation computes delay using SkeletonDataAsset.defaultMix,
// then AddTrackEntry overwrites the entry's mixDuration with the command mix.
export function setSpineCommandQueue(state,command){
 const previousMix=state.data.defaultMix;
 state.data.defaultMix=command.defaultMix;
 try{
  const configure=entry=>{entry.mixDuration=command.mix;entry.listener={start:track=>command.onStart?.(track.animation.name,track)};return entry;};
  const first=configure(state.setAnimation(0,command.name,false));
  command.onStart?.(first.animation.name,first);
  for(let i=1;i<command.loops;i++)configure(state.addAnimation(0,command.name,false,0));
  configure(state.addAnimation(0,command.then,true,0));
  return first;
 }finally{state.data.defaultMix=previousMix;}
}
