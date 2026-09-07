import {G0,clamp} from './math';
import type {FlightState} from './state';
export const STAGES=[{dry:25000,capacity:360000,thrust:7600000,isp:300},{dry:5500,capacity:95000,thrust:1300000,isp:370}];
export function mass(s:FlightState){return (s.phase==='ABORT'||s.phase==='LANDED'||s.phase==='IMPACT')?6000:6000+5500+s.fuel[1]+(s.stage===0?25000+s.fuel[0]:0);}
export function propulsion(s:FlightState,dt:number,density:number){
 const spec=STAGES[s.stage];
 const enabled=s.engineArmed&&s.systems.power&&s.systems.propulsion&&s.fuel[s.stage]>0&&!['PRELAUNCH','COUNTDOWN','ABORT','LANDED','IMPACT'].includes(s.phase);
 const target=enabled?s.throttle:0;
 s.actualThrottle+=clamp(target-s.actualThrottle,-dt*0.8,dt*0.45);
 if(!enabled)s.actualThrottle=0;
 const requested=spec.thrust*s.actualThrottle*(1-0.1*Math.min(1,density/1.225));
 const wanted=requested/(spec.isp*G0)*dt;
 const burned=Math.min(s.fuel[s.stage],wanted);
 s.fuel[s.stage]-=burned;s.fuelFlow=burned/dt;
 s.thrust=s.fuelFlow*spec.isp*G0;
 s.mass=mass(s);
 s.engineTemperature+=(22+860*s.actualThrottle-s.engineTemperature)*dt/14;
}
