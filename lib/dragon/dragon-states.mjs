// ARM32 1.6.3 checks and SetupFSM priority order. See dragon-state-native-1.6.3.
export const DRAGON_TRANSITIONS=[
 ['PreHover','FlyToLocation',p=>!p.takeOff&&(p.targetLocation||p.targetPerch)],
 ['PreHover','Hover',p=>!p.takeOff&&!p.targetEgg&&!p.targetFuse&&!p.readyToHarvest],
 ['PreHover','Dragging',p=>p.touchesDown],
 ['PreHover','Missioning',p=>p.missioning&&!p.touchesDown],
 ['FlyToLocation','PreHover',p=>!p.waypointsRemaining&&!p.targetEgg&&!p.targetFuse&&!p.targetPerch],
 ['FlyToLocation','Fusing',p=>p.targetFuse&&!p.targetLocation],
 ['FlyToLocation','LayEgg',p=>p.targetEgg&&!p.targetLocation],
 ['FlyToLocation','Perching',p=>!p.targetLocation&&!p.touchesDown&&p.targetPerch&&!p.targetFuse&&!p.targetEgg],
 ['FlyToLocation','Dragging',p=>p.touchesDown&&!p.readyToHarvest&&!p.targetEgg&&!p.targetFuse],
 ['Perching','PreHover',p=>!p.timeRemaining&&!p.readyToHarvest&&!p.touchesDown],
 ['Perching','Dragging',p=>p.touchesDown],
 ['Perching','FlyToLocation',p=>!p.touchesDown&&!p.takeOff&&p.targetLocation],
 ['Hover','PreHover',p=>p.readyToHarvest],
 ['Hover','FlyToLocation',p=>p.targetLocation],
 ['Hover','Dragging',p=>p.touchesDown],
 ['ConsumingWaypoints','PreHover',p=>!p.waypointsRemaining&&!p.touchesDown&&!p.targetPerch],
 ['ConsumingWaypoints','Dragging',p=>p.touchesDown],
 ['ConsumingWaypoints','FlyToLocation',p=>!p.waypointsRemaining&&!p.touchesDown&&p.targetPerch],
 ['Dragging','ConsumingWaypoints',p=>!p.touchesDown],
 ['Dragging','FlyToLocation',p=>p.touchesDown&&p.targetLocation],
 ['Fusing','PreHover',p=>!p.targetFuse&&!p.targetLocation],
 ['LayEgg','FlyToLocation',p=>!p.targetEgg&&p.targetLocation],
 ['Missioning','Dragging',p=>p.missioning&&p.touchesDown],
 ['Missioning','FlyToLocation',p=>!p.missioning&&!p.touchesDown],
];
// ConsumingWaypoints checks migration before re-grab in SetupFSM, unlike enum order.
export const DRAGON_TRANSITION_ORDER={PreHover:[0,1,2,3],FlyToLocation:[4,5,6,7,8],Perching:[9,10,11],Hover:[12,13,14],ConsumingWaypoints:[15,17,16],Dragging:[18,19],Fusing:[20],LayEgg:[21],Missioning:[22,23]};
export function nextDragonState(state,parameters){
 for(const id of DRAGON_TRANSITION_ORDER[state]??[])if(DRAGON_TRANSITIONS[id][2](parameters))return DRAGON_TRANSITIONS[id][1];
 return state;
}
