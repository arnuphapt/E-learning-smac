import {NATIVE_CURRENCY} from './generated/native-currency.mjs';
export const WALLET_KEY='dragon-base:wallet:v1';
const ratio=Math.max(NATIVE_CURRENCY.minRatio,Math.min(NATIVE_CURRENCY.maxRatio,Math.floor(NATIVE_CURRENCY.initialChopCost/NATIVE_CURRENCY.dividend)));
const checkCurrency=c=>{if(c!=='SC'&&c!=='HC')throw Error('สกุลเงินไม่ถูกต้อง');};
const checkAmount=n=>{if(!Number.isSafeInteger(n)||n<0)throw Error('จำนวนเงินไม่ถูกต้อง');};
export function createWallet({storage,now=Date.now,chopCosts=null}={}){
 if(storage===undefined){try{storage=globalThis.localStorage;}catch{storage=null;}}
 const listeners=new Set(),initial=()=>({version:1,SC:0,HC:50});
 let data,snapshot;
 function validate(d){if(d?.version!==1||!Number.isSafeInteger(d.SC)||d.SC<0||!Number.isSafeInteger(d.HC)||d.HC<0)throw Error('ข้อมูลกระเป๋าเงินไม่ถูกต้อง');return {version:1,SC:d.SC,HC:d.HC,...(d.expansions!==undefined?{expansions:structuredClone(d.expansions)}:{})};}
 function read(){
  let raw=null;try{raw=storage?.getItem(WALLET_KEY);}catch{return data??initial();}
  if(!raw){if(data)return data;const d=initial();try{storage?.setItem(WALLET_KEY,JSON.stringify(d));}catch{}return d;}
  try{return validate(JSON.parse(raw));}catch{throw Error('อ่านข้อมูลกระเป๋าเงินที่บันทึกไว้ไม่ได้ ข้อมูลเดิมยังไม่ถูกเขียนทับ');}
 }
 function emit(){snapshot=Object.freeze({SC:data.SC,HC:data.HC});for(const fn of listeners)fn(snapshot);}
 function save(next){validate(next);try{storage?.setItem(WALLET_KEY,JSON.stringify(next));}catch{throw Error('บันทึกกระเป๋าเงินไม่ได้ กรุณาตรวจพื้นที่จัดเก็บของเบราว์เซอร์');}data=next;emit();}
 data=read();emit();
 const quoteGold=hc=>{checkAmount(hc);data=read();const cost=chopCosts?.[Math.min(data.expansions?.paidChops??0,(chopCosts?.length??1)-1)],currentRatio=cost==null?ratio:Math.max(NATIVE_CURRENCY.minRatio,Math.min(NATIVE_CURRENCY.maxRatio,Math.floor(cost/NATIVE_CURRENCY.dividend)));return {HC:hc,SC:hc*currentRatio};};
 function credit(currency,n){checkCurrency(currency);checkAmount(n);data=read();const next=n>=Number.MAX_SAFE_INTEGER-data[currency]?Number.MAX_SAFE_INTEGER:data[currency]+n;save({...data,[currency]:next});return snapshot;}
 return {subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},getSnapshot:()=>snapshot,
  refresh(){const next=read();if(next.SC!==data.SC||next.HC!==data.HC||JSON.stringify(next.expansions)!==JSON.stringify(data.expansions)){data=next;emit();}return snapshot;},
  getExpansionProgress(){data=read();return data.expansions?structuredClone(data.expansions):null;},
  purchaseExpansion(currency,amount,progress){checkCurrency(currency);checkAmount(amount);data=read();if(data[currency]<amount)throw Error(currency==='SC'?'เงินไม่พอ':'เพชรไม่พอ');save({...data,[currency]:data[currency]-amount,expansions:structuredClone(progress)});return snapshot;},
  canAfford(currency,n){checkCurrency(currency);if(!Number.isSafeInteger(n)||n<0)return false;data=read();return data[currency]>=n;},
  spend(currency,n,_reason){checkCurrency(currency);checkAmount(n);data=read();if(data[currency]<n)throw Error(currency==='HC'?'เพชร (HC) ไม่พอ':'เหรียญทอง (SC) ไม่พอ');save({...data,[currency]:data[currency]-n});return snapshot;},
  credit,devGrant:(currency,n)=>credit(currency,n),quoteGold,
  exchangeGold(hc){if(!Number.isSafeInteger(hc)||hc<1)throw Error('จำนวนเพชรที่แลกไม่ถูกต้อง');if(hc>NATIVE_CURRENCY.maxHC)throw Error('แลกได้สูงสุดครั้งละ '+NATIVE_CURRENCY.maxHC+' HC');data=read();if(hc>data.HC)throw Error('เพชร (HC) ไม่พอ');const quote=quoteGold(hc),sc=quote.SC>=Number.MAX_SAFE_INTEGER-data.SC?Number.MAX_SAFE_INTEGER:data.SC+quote.SC;save({...data,SC:sc,HC:data.HC-hc});return quote;}
 };
}
