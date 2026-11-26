// Saved deadlines use wall time; rendering never advances growth on its own.
export function feedingView(baby,now){
 const g=baby.growth,feeds=g?.feeds??0;if(baby.maturing)return {feeds,stage:5,status:'maturing',remainingMs:Math.max(0,baby.maturing.doneAt-now),progress:1};
 if(!g)return {feeds:0,stage:1,status:'hungry',remainingMs:0,progress:0};
 const done=now>=g.readyAt,stage=Math.min(5,done?feeds+1:feeds);
 const status=done?(feeds===5?'mature-ready':'hungry'):now<g.eatDoneAt?'eating':now<g.digestUntil?'digesting':'growing';
 return {feeds,stage,status,remainingMs:Math.max(0,g.readyAt-now),progress:feeds/5};
}
export function feedingDeadlines(baby,species,catalog,time){
 const feeds=(baby.growth?.feeds??0)+1,family=catalog.feeding.families[species.family],eating=family.animations['Stage'+feeds+'/Eating'],transition=feeds<5?family.animations['Stage'+feeds+'/Transition']:0;
 const eatDoneAt=time+Math.round(eating*1000),digestUntil=eatDoneAt+Math.round(catalog.feeding.digestSeconds*1000);
 return {feeds,fedAt:time,eatDoneAt,digestUntil,readyAt:digestUntil+Math.round(transition*1000)};
}
export function babyPose(baby,catalog,now){
 const f=feedingView(baby,now),g=baby.growth,stage=f.stage;if(baby.maturing)return {name:'Stage5/Transition',elapsed:Math.max(0,(now-baby.maturing.startedAt)/1000),loop:false,key:'mature:'+baby.maturing.startedAt};
 if(f.status==='eating')return {name:'Stage'+stage+'/Eating',elapsed:(now-g.fedAt)/1000,loop:false,key:'eat:'+g.fedAt};
 if(f.status==='digesting')return {name:'Stage'+stage+'/Sleep',elapsed:(now-g.eatDoneAt)/1000,loop:true,key:'sleep:'+g.fedAt};
 if(f.status==='growing')return {name:'Stage'+stage+'/Transition',elapsed:(now-g.digestUntil)/1000,loop:false,key:'grow:'+g.fedAt};
 return {name:'Stage'+stage+(f.status==='mature-ready'?'/Idle':'/Hungry'),elapsed:Math.max(0,(now-(g?.readyAt??baby.hatchedAt))/1000),loop:true,key:f.status+':'+stage};
}
