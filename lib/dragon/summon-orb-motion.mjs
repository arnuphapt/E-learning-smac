import {NATIVE_SUMMON_ORB as source} from './generated/native-summon-orb.mjs';
import {slotTiming,SUMMON_TOTAL_SECONDS} from './summon-timing.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
export const quadraticInOut=x=>{const t=clamp(x);return t<.5?2*t*t:1-2*(1-t)*(1-t);};
export const quinticInOut=x=>{const t=clamp(x);return t<.5?16*t**5:1-16*(1-t)**5;};
const duration=active=>((active?.appearanceAt??active?.summonDoneAt??SUMMON_TOTAL_SECONDS*1000)-(active?.summonAt??0))/1000;
// Keep the saved egg spawn time compatible; native callbacks run relative to it.
// Absolute symbol scheduling is still the existing browser adapter.
export function orbGrowthStart(index,active){return index===2?duration(active)-source.moveDelay-source.moveSeconds-source.growthSeconds:slotTiming(index).landSec+source.growthDelay;}
export function summonOrbPose(active,now){
 const seconds=(now-(active.summonAt??0))/1000,spawn=duration(active);let scale=1;
 for(let i=0;i<3;i++){const t=quadraticInOut((seconds-orbGrowthStart(i,active))/source.growthSeconds);scale*=1+(source.growthMultiplier-1)*t;}
 const moveStart=spawn-source.moveSeconds,shrinkStart=spawn+source.shrinkDelay;
 scale*=1-quinticInOut((seconds-shrinkStart)/source.shrinkSeconds);
 const vortexAlpha=quadraticInOut((seconds-moveStart)/source.vortexInSeconds)*(1-quadraticInOut((seconds-shrinkStart)/source.vortexOutSeconds));
 return {scale,lift:source.lift*quadraticInOut((seconds-moveStart)/source.moveSeconds),alpha:scale>0?1:0,vortexAlpha,noise:1-clamp((seconds-moveStart)/source.moveSeconds)};
}
export function orbFinishing(active,now){return Boolean(active&&active.phase!=='summoning'&&now<(active.appearanceAt??active.summonDoneAt)+(source.shrinkDelay+source.shrinkSeconds)*1000);}
