import './style.css';
import {createState,SYSTEMS} from './sim/state';
import {type System,log} from './sim/state';
import {tick} from './sim/physics';
import {telemetry,warnings,clock} from './sim/telemetry';
import {readiness,launch,stage,abort,toggleSystem} from './sim/mission';
import {STEP,clamp} from './sim/math';
import {cockpit} from './ui/cockpit';
import {horizon,orbitMap} from './ui/instruments';
import {World,type CameraMode} from './render/world';
import {FlightAudio} from './audio';
import {input} from './input';

document.querySelector('#app')!.innerHTML=cockpit();
let state=createState();
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const textCache=new Map<string,string>();
const text=(id:string,value:string)=>{if(textCache.get(id)!==value){$(id).textContent=value;textCache.set(id,value);}};
const audio=new FlightAudio();
let world:World|null=null;
try{world=new World($('world'));}catch(error){console.error('3D renderer unavailable',error);$('renderer-error').hidden=false;}
let completedDismissed=false,engineering=false,tab='flight',manualPreviousPause=false;
function setTab(next:string){tab=next;engineering=next==='engineering';$('engineering').hidden=!engineering;document.querySelector<HTMLElement>('.console')!.hidden=engineering;document.querySelector<HTMLElement>('.console')!.dataset.tab=next;document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.classList.toggle('selected',b.dataset.tab===next));}
function pause(){state.paused=!state.paused;audio.tone(380);updateUI();}
function reset(){state=createState();completedDismissed=false;textCache.clear();audio.lastCount=-1;audio.lastPhase='';if(world)world.setMode('COCKPIT');setCamera('COCKPIT');updateUI();}
function doLaunch(){if(launch(state))audio.tone(700,.2);updateUI();}
function doStage(){if(stage(state)){audio.tone(240,.3);}else log(state,'Stage interlock: below 10% fuel and above 1 km required.');updateUI();}
function setCamera(mode:CameraMode){world?.setMode(mode);document.querySelector<HTMLElement>('.flightdeck')!.dataset.view=mode;document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(b=>{const selected=b.dataset.camera===mode;b.classList.toggle('selected',selected);b.setAttribute('aria-pressed',String(selected));});text('view-label',mode+(mode==='COCKPIT'?' / PILOT SEAT':' / OBSERVATION'));}

const controls=input(()=>state,{launch:doLaunch,stage:doStage,pause,reset,engineering:()=>setTab(engineering?'flight':'engineering')},(x,y)=>{if(world){world.look.x=clamp(world.look.x+x,-1,1);world.look.y=clamp(world.look.y+y,-1,1);}});
$('preflight').onclick=()=>{if(state.phase==='PRELAUNCH'){state.preparing=true;state.prepareTime=0;audio.tone();}};
document.querySelectorAll<HTMLButtonElement>('[data-system]').forEach(b=>b.onclick=()=>{toggleSystem(state,b.dataset.system as System);audio.tone();updateUI();});
$('engine-arm').onclick=()=>{if(state.systems.power&&state.systems.propulsion){state.engineArmed=!state.engineArmed;if(!state.engineArmed)state.launchArmed=false;audio.tone();}else log(state,'POWER and PROPULSION required before engine arming.');updateUI();};
$('launch-arm').onclick=()=>{if(SYSTEMS.every(k=>state.systems[k])&&state.engineArmed){state.launchArmed=!state.launchArmed;audio.tone();}else log(state,'Complete preflight and arm the engine first.');updateUI();};
$('launch').onclick=doLaunch;$('stage').onclick=doStage;$('abort').onclick=()=>{abort(state);audio.tone(180,.3);updateUI();};
$('guidance').onclick=()=>{state.guidance=!state.guidance;audio.tone();updateUI();};
$('throttle').oninput=()=>{state.guidance=false;state.throttle=Number($<HTMLInputElement>('throttle').value)/100;updateUI();};
$('pace').onchange=()=>state.speed=Number($<HTMLSelectElement>('pace').value);
$('engineering-toggle').onclick=()=>setTab(engineering?'flight':'engineering');
$('pause').onclick=pause;$('resume').onclick=pause;$('reset').onclick=reset;
$('audio').onclick=async()=>{try{const enabled=await audio.toggle();$('audio').innerHTML='AUDIO <span>'+(enabled?'ON':'OFF')+'</span>';if(enabled)audio.tone();}catch{log(state,'Audio unavailable. Visual flight indications remain active.');}};
const manual=$<HTMLDialogElement>('manual');
$('help').onclick=()=>{manualPreviousPause=state.paused;state.paused=true;manual.showModal();};
const closeManual=()=>{manual.close();state.paused=manualPreviousPause;};$('close-manual').onclick=closeManual;$('manual-ready').onclick=closeManual;manual.addEventListener('cancel',()=>state.paused=manualPreviousPause);
document.querySelectorAll<HTMLButtonElement>('[data-camera]').forEach(b=>b.onclick=()=>{setCamera(b.dataset.camera as CameraMode);audio.tone();});
document.querySelectorAll<HTMLButtonElement>('[data-tab]').forEach(b=>b.onclick=()=>setTab(b.dataset.tab!));
$('dismiss-complete').onclick=()=>{completedDismissed=true;};
document.addEventListener('visibilitychange',()=>{if(document.hidden)state.paused=true;});

function updateUI(){
 const t=telemetry(state),ws=warnings(state);
 text('phase',state.phase);text('alt',(t.altitude/1000).toFixed(2));text('velocity',(t.speed/1000).toFixed(3));
 text('vs',(t.vertical>=0?'↑ ':'↓ ')+Math.abs(t.vertical).toFixed(0)+' M/S');text('gforce',state.g.toFixed(2)+' G');
 text('heading',String(Math.round(state.yaw)).padStart(3,'0'));text('pitch',state.pitch.toFixed(1)+'°');text('roll',((state.roll+180)%360-180).toFixed(1)+'°');
 text('apo',Number.isFinite(t.apoapsis)?Math.max(-6371,t.apoapsis/1000).toFixed(0):'ESC');
 text('peri',(t.periapsis/1000).toFixed(0));text('thrust',(state.thrust/1e6).toFixed(2)+' MN');text('fuel',t.fuelPercent.toFixed(1)+' %');
 text('temperature',state.engineTemperature.toFixed(0)+' °C');text('cabin',state.cabinPressure.toFixed(1));text('battery',state.battery.toFixed(0));text('met',clock(state.time));
 text('throttle-value',Math.round(state.throttle*100)+'%');$<HTMLInputElement>('throttle').value=String(Math.round(state.throttle*100));$<HTMLSelectElement>('pace').value=String(state.speed);
 $('fuel-bar').style.width=t.fuelPercent+'%';document.documentElement.style.setProperty('--burn',state.actualThrottle.toFixed(2));
 text('stage-indicator','S'+(state.stage+1));text('systems-count',SYSTEMS.filter(k=>state.systems[k]).length+' / 7');
 const context=state.phase==='PRELAUNCH'?(state.preparing?'Running vehicle checks…':readiness(state)==='READY FOR IGNITION'?'All stations go. Initiate launch when ready.':readiness(state)+'.'):
 state.phase==='COUNTDOWN'?'All systems go. Hold for ignition.':state.phase==='ABORT'?state.abortReason+' / recovery active.':
 state.phase==='IMPACT'?state.abortReason+' Reset to fly again.':state.phase==='LANDED'?'Capsule recovered. Reset to fly again.':state.orbitAchieved?'Stable orbit established. Continue with manual free flight.':
 state.stage===0?'Ascent underway. Next event: first-stage separation.':'Upper stage active. Guidance targeting a stable low Earth orbit.';
 text('context',context);
 $('countdown').hidden=state.phase!=='COUNTDOWN';$('countdown').querySelector('strong')!.textContent=String(Math.ceil(state.countdown));
 $('completion').hidden=!state.orbitAchieved||completedDismissed;
 $('paused').hidden=!state.paused||manual.open;
 $('pause').setAttribute('aria-label',state.paused?'Resume simulation':'Pause simulation');
 $('guidance').setAttribute('aria-pressed',String(state.guidance));$('guidance').classList.toggle('active',state.guidance);$('guidance').querySelector('b')!.textContent=state.guidance?'ENGAGED':'MANUAL';
 $('engine-arm').setAttribute('aria-pressed',String(state.engineArmed));$('launch-arm').setAttribute('aria-pressed',String(state.launchArmed));
 $<HTMLButtonElement>('launch').disabled=state.phase!=='PRELAUNCH'||readiness(state)!=='READY FOR IGNITION';
 $<HTMLButtonElement>('stage').disabled=state.stage!==0||state.fuel[0]>36000||t.altitude<1000||state.phase==='ABORT';
 $<HTMLButtonElement>('preflight').disabled=state.phase!=='PRELAUNCH'||state.preparing;
 document.querySelectorAll<HTMLButtonElement>('[data-system]').forEach(b=>{const enabled=state.systems[b.dataset.system as System];b.setAttribute('aria-pressed',String(enabled));b.querySelector('small')!.textContent=enabled?'ON':'OFF';});
 const warningHTML=ws.slice(0,3).map(w=>'<span class="'+w.level+'">'+w.text+'</span>').join('');
 if($('warnings').innerHTML!==warningHTML)$('warnings').innerHTML=warningHTML;
 text('comms',state.events.at(-1)!.text);
 if(engineering)text('engineering-data',[
 'TIMESTEP       '+STEP.toFixed(6)+' s','THRUST         '+state.thrust.toFixed(0)+' N','MASS           '+state.mass.toFixed(0)+' kg',
 'FUEL FLOW      '+state.fuelFlow.toFixed(2)+' kg/s','GRAVITY        '+t.gravity.toFixed(4)+' m/s²','DRAG           '+state.drag.toFixed(1)+' N',
 'DYNAMIC Q      '+(state.q/1000).toFixed(2)+' kPa','DENSITY        '+t.density.toExponential(3)+' kg/m³',
 'ACCELERATION   '+state.acceleration.map(x=>x.toFixed(2)).join(', ')+' m/s²','POSITION       '+state.position.map(x=>x.toFixed(0)).join(', ')+' m',
 'VELOCITY       '+state.velocity.map(x=>x.toFixed(1)).join(', ')+' m/s','ATTITUDE       '+[state.pitch,state.yaw,state.roll].map(x=>x.toFixed(2)).join(', ')+' deg',
 'ECCENTRICITY   '+t.eccentricity.toFixed(6),'ORBITAL SPEED  '+t.orbitalVelocity.toFixed(2)+' m/s','BATTERY        '+state.battery.toFixed(2)+' %',
 'CABIN TEMP     '+state.cabinTemperature.toFixed(2)+' °C','APOAPSIS       '+t.apoapsis.toFixed(0)+' m','PERIAPSIS      '+t.periapsis.toFixed(0)+' m'
 ].join('\n'));
 audio.update(state,ws.length>0);
}
let last=performance.now(),accumulator=0,uiTime=0,mapTime=0,raf=0,disposed=false;
function frame(now:number){
 if(disposed)return;
 const dt=Math.min((now-last)/1000,.1);last=now;controls.update(dt);
 if(!state.paused){const pace=['PRELAUNCH','COUNTDOWN'].includes(state.phase)?1:state.speed;accumulator=Math.min(accumulator+dt*pace,STEP*100);
 let iterations=0;while(accumulator>=STEP&&iterations<100){tick(state);accumulator-=STEP;iterations++;}}
 else accumulator=0;
 world?.render(state,dt);
 uiTime+=dt;mapTime+=dt;
 if(uiTime>=.08){updateUI();horizon($<HTMLCanvasElement>('horizon'),state);uiTime=0;}
 if(mapTime>=.4){orbitMap($<HTMLCanvasElement>('orbit-map'),state);mapTime=0;}
 raf=requestAnimationFrame(frame);
}
Object.defineProperty(window,'orbitalTelemetry',{get:()=>({...structuredClone(state),navigation:telemetry(state)})});
updateUI();horizon($<HTMLCanvasElement>('horizon'),state);orbitMap($<HTMLCanvasElement>('orbit-map'),state);raf=requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>{disposed=true;cancelAnimationFrame(raf);controls.dispose();world?.dispose();audio.dispose();},{once:true});
