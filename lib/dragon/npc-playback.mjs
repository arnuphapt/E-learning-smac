import {livState,livBaseClip,LIV_FADE_IN_COMPLETE_SECONDS} from './liv-state.mjs';
// Native state selects track 0; egg fade completion triggers Surprise on track 1.
export function npcPlayback({entity,data,ambient,dev,presentation,nowMs,seconds}){
 const sample=(name,elapsed,key,loop=true)=>{const clip=data.clips.find(c=>c.name===name);if(!clip)throw Error('Missing original NPC clip '+name);const frame=loop?Math.floor((elapsed%clip.duration)/clip.duration*clip.frames.length):Math.min(clip.frames.length-1,Math.floor(elapsed/clip.duration*clip.frames.length+1e-7));return {clip,frame,key,elapsed,loop};};
 if(entity!=='Incubator'||dev)return ambient?sample('Idle',seconds,'Idle'):null;
 const state=livState(presentation),name=livBaseClip(state),base={...sample(name,name==='Summon'?Math.max(0,(nowMs-(presentation?.active?.summonAt??nowMs))/1000):seconds,'Liv:'+name),continuous:true,state,trackIndex:0},active=presentation?.active;
 if(active?.appearanceAt===undefined||active.phase==='summoning')return base;
 const startedAt=active.fadeInCompleteAt??active.appearanceAt+LIV_FADE_IN_COMPLETE_SECONDS*1000,age=(nowMs-startedAt)/1000,reaction=data.clips.find(c=>c.name==='Surprise');
 if(age>=0&&age<reaction.duration)return {...sample('Surprise',age,'Surprise:'+active.id,false),base,trackIndex:1,state};
 return base;
}
