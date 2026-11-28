// PlayPerchRoutine -> repeating DelayAction(5..14s) -> PlayPerchAnimation.
// PerchAnimation runs Idle or Sleep for 9..11 loops, then returns to Idle.
const integer=(min,max,random)=>min+Math.floor(Math.max(0,Math.min(.999999,random()))*(max-min));
export function startPerchAnimation(control,now,random=Math.random){
 const period=integer(5,15,random)*1000;
 control.perchAnimation={period,nextAt:now+period,generation:0,phase:null};
}
export function stepPerchAnimation(entry,now,random=Math.random){
 const c=entry.control,plan=c.perchAnimation;if(!plan)return;
 const idle=entry.perch.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle';
 if(now<plan.nextAt)return;
 plan.nextAt=now+plan.period;
 const current=plan.currentName??c.animationName??idle;
 if(!['Branch/Idle','Ground/Idle'].includes(current))return;
 const loops=integer(9,12,random),name=c.readyToHarvest||integer(0,2,random)===0?idle:idle.replace('/Idle','/Sleep');
 const duration=entry.live?.skeleton?.data.findAnimation(name)?.duration;
 if(!(duration>0))return;
 const defaultMix=entry.live?.queueDefaultMix??Math.fround(.2);
 plan.currentName=name;
 plan.phase={name,startedAt:now,key:`perch:${++plan.generation}`,queue:{name,loops,then:idle,defaultMix,mix:.25,onStart(name,track){if(c.perchAnimation!==plan||c.state!=='Perching')return;plan.currentName=name;plan.currentTrack=track;c.animationName=name;c.colliderPose=name;}}};c.colliderPose=name;
}
export function perchAnimationPose(control,now){
 const plan=control.perchAnimation,phase=plan?.phase;
 if(!phase)return null;
 return {name:plan.currentName??phase.name,elapsed:plan.currentTrack?.trackTime??Math.max(0,(now-phase.startedAt)/1000),loop:false,key:phase.key,queue:phase.queue,realTime:true};
}
