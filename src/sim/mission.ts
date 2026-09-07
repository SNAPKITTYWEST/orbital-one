import {SYSTEMS,type FlightState,type System,log,phase} from './state';
import {navigation} from './navigation';
export function readiness(s:FlightState){
 const missing=SYSTEMS.filter(k=>!s.systems[k]);
 if(missing.length)return 'Activate '+missing[0].toUpperCase();
 if(!s.engineArmed)return 'ARM THE ENGINE';
 if(!s.launchArmed)return 'ARM THE LAUNCH SYSTEM';
 return 'READY FOR IGNITION';
}
export function toggleSystem(s:FlightState,key:System){s.systems[key]=!s.systems[key];log(s,key.toUpperCase()+' '+(s.systems[key]?'ONLINE':'OFFLINE'));}
export function launch(s:FlightState){
 if(s.phase!=='PRELAUNCH')return false;
 if(readiness(s)!=='READY FOR IGNITION'){log(s,readiness(s));return false;}
 s.countdown=10;phase(s,'COUNTDOWN');return true;
}
export function stage(s:FlightState){
 if(s.stage!==0||s.fuel[0]>36000||navigation(s).altitude<1000||s.phase==='ABORT')return false;
 s.stage=1;s.stageTime=s.time;s.actualThrottle=0;phase(s,'STAGING');log(s,'Stage 01 separated. Upper-stage ignition.');return true;
}
export function abort(s:FlightState,reason='Pilot initiated abort'){
 if(s.phase==='LANDED'||s.phase==='IMPACT'||s.phase==='ABORT')return;
 s.abortReason=reason;s.throttle=0;s.actualThrottle=0;s.thrust=0;s.engineArmed=false;s.launchArmed=false;s.guidance=false;
 if(s.phase==='PRELAUNCH'||s.phase==='COUNTDOWN'||navigation(s).altitude<40){s.velocity=[0,0,0];}
 phase(s,'ABORT');log(s,reason+'. Propulsion safed. Recovery active.');
}
export function mission(s:FlightState,dt:number){
 if(s.preparing&&s.phase==='PRELAUNCH'){
  s.prepareTime+=dt;const index=Math.floor(s.prepareTime/0.22);
  SYSTEMS.forEach((key,i)=>{if(i<=index)s.systems[key]=true;});
  if(index>=SYSTEMS.length){s.preparing=false;log(s,'Preflight complete. Arm engine and launch.');}
 }
 if(s.phase==='COUNTDOWN'){
  if(!SYSTEMS.every(k=>s.systems[k])||!s.engineArmed||!s.launchArmed){abort(s,'Launch interlock opened');return;}
  s.countdown-=dt;if(s.countdown<=0){s.countdown=0;phase(s,'IGNITION');}
 }
 const n=navigation(s);
 if(['PRELAUNCH','COUNTDOWN','ABORT','LANDED'].includes(s.phase))return;
 if(s.phase==='IGNITION'){s.ignitionTime+=dt;if(s.thrust>s.mass*n.gravity)phase(s,'LIFTOFF');return;}
 if(s.guidance&&s.stage===0&&s.fuel[0]<100)stage(s);
 if(s.time-s.stageTime<3)return;
 if(!s.orbitAchieved&&n.periapsis>180000&&n.apoapsis<400000){s.orbitAchieved=true;phase(s,'ORBITAL FLIGHT');log(s,'Orbit achieved. Mission objective complete. Free flight available.');}
 else if(s.orbitAchieved)phase(s,'ORBITAL FLIGHT');
 else if(n.altitude>=100000)phase(s,n.horizontal>5500?'ORBIT INSERTION':'SPACE');
 else if(n.altitude>=50000)phase(s,'UPPER ATMOSPHERE');
 else if(s.q>25000)phase(s,'MAX-Q');
 else if(n.altitude>150)phase(s,'ASCENT');
}
