// Recovered IncubatorEntity native routing, confirmed in 1.5.1 and 1.6.3; see LIV-NATIVE-STATE.md.
export const LivState=Object.freeze({Locked:0,ReadyToSummon:1,PlaySummonSequence:2,Occupied:3,None:4});
export const LIV_FADE_IN_COMPLETE_SECONDS=1+.15; // Egg scale-in + fill fade.
export function livState(presentation){
 if(presentation?.tutorialLocked)return LivState.Locked;
 const phase=presentation?.active?.phase;
 if(phase==='summoning'||phase==='arriving')return LivState.PlaySummonSequence;
 if(phase)return LivState.Occupied;
 return presentation?.populationBelowMax===false?LivState.Locked:LivState.ReadyToSummon;
}
export function livBaseClip(state){return state===LivState.Locked?'Idle':state===LivState.PlaySummonSequence?'Summon':state===LivState.ReadyToSummon||state===LivState.Occupied?'Active':null;}
