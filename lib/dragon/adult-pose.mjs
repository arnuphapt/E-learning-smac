// Keep emergence Hover separate from travel Fly and the final perch pose.
export function adultPose(adult,perch,now,dev=false){
 const departure=adult.hoverUntil??adult.maturedAt;
 if(dev)return {name:perch.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle',elapsed:0,loop:true,key:'dev:perch'};
 const hovering=now<departure,flying=!hovering&&now<adult.flyUntil,name=hovering?'Hover':flying?'Fly':perch.SymbolID==='PerchMarker_Ground'?'Ground/Idle':'Branch/Idle';
 return {name,elapsed:Math.max(0,(now-(hovering?adult.maturedAt:flying?departure:adult.flyUntil))/1000),loop:true,key:name,realTime:true};
}
