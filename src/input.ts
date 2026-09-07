import {type FlightState} from './sim/state';
import {clamp} from './sim/math';
export interface Actions{launch:()=>void;stage:()=>void;pause:()=>void;reset:()=>void;engineering:()=>void;}
export function input(get:()=>FlightState,actions:Actions,look:(x:number,y:number)=>void){
 const abort=new AbortController(),options={signal:abort.signal};const keys=new Set<string>();
 const reset=()=>{keys.clear();const s=get();s.pitchInput=0;s.yawInput=0;s.rollInput=0;};
 window.addEventListener('keydown',e=>{
  if((e.target as HTMLElement).matches('input,select,textarea')||document.querySelector('dialog[open]'))return;
  const key=e.key.toLowerCase();
  if(['arrowup','arrowdown','arrowleft','arrowright',' ','enter','escape'].includes(key))e.preventDefault();
  if(!e.repeat){if(key==='enter')actions.launch();if(key===' ')actions.stage();if(key==='escape')actions.pause();if(key==='r')actions.reset();if(key==='e')actions.engineering();}
  keys.add(key);
 },options);
 window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()),options);
 window.addEventListener('blur',reset,options);
 document.querySelectorAll<HTMLButtonElement>('[data-hold]').forEach(button=>{
  const [axis,value]=button.dataset.hold!.split(':');const prop=(axis+'Input') as 'pitchInput'|'yawInput'|'rollInput';
  button.addEventListener('pointerdown',e=>{if(get().paused)return;button.setPointerCapture(e.pointerId);get().guidance=false;get()[prop]=Number(value);},options);
  const release=()=>{get()[prop]=0;};button.addEventListener('pointerup',release,options);button.addEventListener('pointercancel',release,options);button.addEventListener('lostpointercapture',release,options);
 });
 const viewport=document.querySelector<HTMLElement>('.viewport')!;let dragging=false,lastX=0,lastY=0;
 viewport.addEventListener('pointerdown',e=>{if((e.target as HTMLElement).closest('button'))return;dragging=true;lastX=e.clientX;lastY=e.clientY;viewport.setPointerCapture(e.pointerId);},options);
 viewport.addEventListener('pointermove',e=>{if(!dragging)return;look((e.clientX-lastX)/350,(lastY-e.clientY)/250);lastX=e.clientX;lastY=e.clientY;},options);
 viewport.addEventListener('pointerup',()=>dragging=false,options);viewport.addEventListener('pointercancel',()=>dragging=false,options);
 return {update(dt:number){const s=get();if(s.paused)return;
  if(keys.has('w')||keys.has('s')){s.guidance=false;s.throttle=clamp(s.throttle+dt*.3*(Number(keys.has('w'))-Number(keys.has('s'))),0,1);}
  const pitch=Number(keys.has('arrowdown'))-Number(keys.has('arrowup')),yaw=Number(keys.has('arrowright'))-Number(keys.has('arrowleft')),roll=Number(keys.has('d'))-Number(keys.has('a'));
  if(pitch||yaw||roll){s.guidance=false;s.pitchInput=pitch;s.yawInput=yaw;s.rollInput=roll;}
  else if(!document.querySelector('[data-hold]:active')){s.pitchInput=0;s.yawInput=0;s.rollInput=0;}
 },dispose(){abort.abort();reset();}};
}
