import {STEP,R,MU,G0,RAD,add,mul,len,clamp,type V3} from './math';
import {type FlightState,phase} from './state';
import {navigation,basis} from './navigation';
import {propulsion} from './propulsion';
import {guide} from './guidance';
import {mission} from './mission';
export function tick(s:FlightState,dt=STEP){
 if(s.paused||(s.phase==='LANDED'||s.phase==='IMPACT'))return;
 mission(s,dt);
 if(s.phase==='PRELAUNCH'||s.phase==='COUNTDOWN')return;
 s.time+=dt;
 guide(s);
 if(!s.guidance){
 s.pitch=clamp(s.pitch+s.pitchInput*dt*12,-30,180);
 s.yaw=(s.yaw+s.yawInput*dt*15+360)%360;
 s.roll=(s.roll+s.rollInput*dt*25+360)%360;
 }
 const n=navigation(s),b=basis(s);
 propulsion(s,dt,n.density);
 const horiz=add(mul(b.east,Math.sin(s.yaw*RAD)),mul(b.north,Math.cos(s.yaw*RAD)));
 const dir=add(mul(b.up,Math.cos(s.pitch*RAD)),mul(horiz,Math.sin(s.pitch*RAD)));
 s.parachute=s.phase==='ABORT'&&n.altitude<10000&&n.vertical<0;
 const area=s.parachute?1800:12;
 s.q=0.5*n.density*n.speed*n.speed;
 s.drag=s.parachute?Math.min(s.q*1.5*area,s.mass*4*G0):s.q*0.35*area;
 const gravity=mul(s.position,-MU/Math.pow(len(s.position),3));
 const thrust=mul(dir,s.thrust/s.mass);
 const drag=n.speed>0?mul(s.velocity,-s.drag/s.mass/n.speed):[0,0,0] as V3;
 s.acceleration=add(gravity,add(thrust,drag));
 s.g=len(add(thrust,drag))/G0;
 const grounded=n.altitude<=30.01&&n.vertical<=0&&s.thrust<s.mass*n.gravity;
 if(!grounded){
  s.velocity=add(s.velocity,mul(s.acceleration,dt));
  s.position=add(s.position,mul(s.velocity,dt));
 }else{s.velocity=[0,0,0];s.acceleration=[0,0,0];s.g=1;}
 if(len(s.position)<R+30){const impactSpeed=len(s.velocity);s.position=mul(s.position,(R+30)/len(s.position));s.velocity=[0,0,0];phase(s,impactSpeed<12?'LANDED':'IMPACT');s.abortReason=impactSpeed<12?'Capsule recovered safely.':'Surface impact at '+impactSpeed.toFixed(0)+' m/s.';s.throttle=0;s.thrust=0;s.actualThrottle=0;}
 s.battery=clamp(s.battery+(s.systems.power?0.01:-0.025)*dt,0,100);
 s.cabinPressure=clamp(s.cabinPressure+(s.systems['life support']?(101.3-s.cabinPressure)/8:-0.09)*dt,0,101.3);
 s.cabinTemperature+=(s.systems['life support']?22-s.cabinTemperature:0.3)*dt/20;
}
