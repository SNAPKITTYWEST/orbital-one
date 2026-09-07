import {R,type V3} from './math';
export const SYSTEMS=['power','avionics','navigation','comms','life support','propulsion','computers'] as const;
export type System=typeof SYSTEMS[number];
export type Phase='PRELAUNCH'|'COUNTDOWN'|'IGNITION'|'LIFTOFF'|'ASCENT'|'MAX-Q'|'STAGING'|'UPPER ATMOSPHERE'|'SPACE'|'ORBIT INSERTION'|'ORBITAL FLIGHT'|'ABORT'|'LANDED'|'IMPACT';
export interface FlightState{
position:V3;velocity:V3;acceleration:V3;time:number;phase:Phase;previousPhase:Phase;
systems:Record<System,boolean>;engineArmed:boolean;launchArmed:boolean;guidance:boolean;
throttle:number;actualThrottle:number;pitch:number;yaw:number;roll:number;pitchInput:number;yawInput:number;rollInput:number;
fuel:[number,number];stage:0|1;stageTime:number;countdown:number;ignitionTime:number;
paused:boolean;speed:number;preparing:boolean;prepareTime:number;
engineTemperature:number;cabinPressure:number;cabinTemperature:number;battery:number;
thrust:number;fuelFlow:number;drag:number;q:number;g:number;mass:number;
orbitAchieved:boolean;abortReason:string;parachute:boolean;events:{time:number;text:string}[];
}
export const createState=():FlightState=>({
position:[0,R+30,0],velocity:[0,0,0],acceleration:[0,0,0],time:0,phase:'PRELAUNCH',previousPhase:'PRELAUNCH',
systems:Object.fromEntries(SYSTEMS.map(s=>[s,false])) as Record<System,boolean>,
engineArmed:false,launchArmed:false,guidance:true,throttle:1,actualThrottle:0,pitch:0,yaw:90,roll:0,pitchInput:0,yawInput:0,rollInput:0,
fuel:[360000,95000],stage:0,stageTime:-100,countdown:10,ignitionTime:0,paused:false,speed:20,preparing:false,prepareTime:0,
engineTemperature:22,cabinPressure:101.3,cabinTemperature:22,battery:100,thrust:0,fuelFlow:0,drag:0,q:0,g:1,mass:491500,
orbitAchieved:false,abortReason:'',parachute:false,events:[{time:0,text:'Flight deck ready. Run preflight to begin.'}]
});
export function log(s:FlightState,text:string){s.events.push({time:s.time,text});if(s.events.length>60)s.events.shift();}
export function phase(s:FlightState,next:Phase){if(s.phase!==next){s.previousPhase=s.phase;s.phase=next;log(s,next);}}
