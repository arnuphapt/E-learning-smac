// One reset requested by the user; subsequent reloads retain new progress.
export const GAME_RESET_KEY='dragon-base:reset-revision';
export const GAME_RESET_REVISION='2026-11-17-clear-game-1';
const owned=key=>key.startsWith('dragon-base:')||key.startsWith('hatch-dragons-layout:');
function clearOwned(storage){
 const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(key=>key&&owned(key)&&key!==GAME_RESET_KEY);
 for(const key of keys)storage.removeItem(key);
 return keys.length;
}
export function resetGameDataOnce(storage,sessionStorage){
 if(storage.getItem(GAME_RESET_KEY)===GAME_RESET_REVISION)return false;
 clearOwned(storage);if(sessionStorage)clearOwned(sessionStorage);
 // Mark complete only after both current and legacy game data have been removed.
 storage.setItem(GAME_RESET_KEY,GAME_RESET_REVISION);
 return true;
}
