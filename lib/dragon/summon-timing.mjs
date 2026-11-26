// Native AttractionFlowerSymbolSpot timing: 1.125s cycle/rise + 0.25s pulse + 0.20s hold + 0.25s drop = 1.825s per spot, staggered in 4.8s roll + 2s Liv Summon clip.
export const SUMMON_ROLL_SECONDS=4.8;
export const SUMMON_GESTURE_SECONDS=2;
export const SUMMON_TOTAL_SECONDS=SUMMON_ROLL_SECONDS+SUMMON_GESTURE_SECONDS;
export const SUMMON_GESTURE_START=SUMMON_ROLL_SECONDS/SUMMON_TOTAL_SECONDS;
export const SYMBOL_CYCLE_SECONDS=1.125;
export const SYMBOL_CYCLE_STEP_SECONDS=1.125/11;
export const SYMBOL_PULSE_HALF_SECONDS=0.125;
export const SYMBOL_HOLD_SECONDS=0.2;
export const SYMBOL_DROP_SECONDS=0.25;
export const SYMBOL_LAND_SECONDS=SYMBOL_CYCLE_SECONDS+2*SYMBOL_PULSE_HALF_SECONDS+SYMBOL_HOLD_SECONDS+SYMBOL_DROP_SECONDS;
const SLOT_START_SECONDS=[0.17,1.50,2.83];
const SLOT_BEAM_END_SECONDS=[2.35,3.68,5.16];
export function slotTiming(index){
 const startSec=SLOT_START_SECONDS[index],lockSec=startSec+SYMBOL_CYCLE_SECONDS,landSec=startSec+SYMBOL_LAND_SECONDS,beamEndSec=SLOT_BEAM_END_SECONDS[index];
 return {startSec,lockSec,landSec,beamEndSec,start:startSec/SUMMON_TOTAL_SECONDS,lock:lockSec/SUMMON_TOTAL_SECONDS,land:landSec/SUMMON_TOTAL_SECONDS,beamEnd:beamEndSec/SUMMON_TOTAL_SECONDS};
}
