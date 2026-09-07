import {navigation} from './navigation';import {STAGES} from './propulsion';import type {FlightState} from './state';
export function telemetry(s:FlightState){return {...navigation(s),fuelPercent:100*s.fuel[s.stage]/STAGES[s.stage].capacity,throttlePercent:100*s.actualThrottle};}
export function warnings(s:FlightState){
 const w:{level:'caution'|'critical';text:string}[]=[];
 if(s.phase==='PRELAUNCH'||s.phase==='COUNTDOWN')return w;
 if(s.fuel[s.stage]<STAGES[s.stage].capacity*0.1)w.push({level:'caution',text:'LOW FUEL'});
 if(s.engineTemperature>870)w.push({level:'caution',text:'ENGINE TEMPERATURE'});
 if(s.g>4.5)w.push({level:'critical',text:'EXCESSIVE G'});
 if(s.q>45000)w.push({level:'critical',text:'STRUCTURAL LOAD'});
 if(!s.systems.navigation)w.push({level:'critical',text:'GUIDANCE OFFLINE'});
 if(!s.systems.comms)w.push({level:'caution',text:'COMMS OFFLINE'});
 if(s.cabinPressure<85)w.push({level:'critical',text:'CABIN PRESSURE'});
 if(s.pitch>115&&navigation(s).altitude<100000)w.push({level:'caution',text:'ATTITUDE ERROR'});
 return w;
}
export function clock(seconds:number){seconds=Math.max(0,Math.floor(seconds));return [Math.floor(seconds/3600),Math.floor(seconds%3600/60),seconds%60].map(n=>String(n).padStart(2,'0')).join(':');}
