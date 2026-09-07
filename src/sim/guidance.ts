import {clamp,RAD} from './math';
import {navigation} from './navigation';
import type {FlightState} from './state';
export function guide(s:FlightState){
 if(!s.guidance||!s.systems.navigation||!s.systems.computers||s.phase==='ABORT')return;
 const n=navigation(s);
 if(s.phase==='PRELAUNCH'||s.phase==='COUNTDOWN')return;
 // Target a 220 km apogee; radial velocity closes as apogee approaches.
 const targetApo=220000;
 let targetVertical=n.altitude<1500?150:Math.sqrt(Math.max(0,2*n.gravity*(targetApo-n.altitude)))*0.55;
 targetVertical=clamp(targetVertical,0,1050);
 if(n.apoapsis>targetApo)targetVertical=Math.min(targetVertical,Math.max(-50,(targetApo-n.altitude)/200));
 const thrustAccel=(s.stage===0?7600000:1300000)/s.mass;
 const radial=clamp((targetVertical-n.vertical)/35+n.gravity-n.horizontal*n.horizontal/(n.altitude+6371000),-thrustAccel,thrustAccel);
 const targetPitch=n.altitude<700?0:Math.acos(clamp(radial/thrustAccel,-1,1))/RAD;
 s.pitch+=clamp(targetPitch-s.pitch,-0.65,0.65);
 s.yaw=90;s.roll*=0.99;
 s.throttle=clamp(3.5*9.80665/thrustAccel,0.2,1);
 if(s.q>34000)s.throttle=Math.min(s.throttle,0.55);
 if(n.periapsis>180000&&n.apoapsis<400000)s.throttle=0;
 if(s.orbitAchieved)s.throttle=0;
}
