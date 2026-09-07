import {R,MU,len,dot,cross,mul,unit,type V3} from './math';
import type {FlightState} from './state';
export function navigation(s:FlightState){
 const r=len(s.position),speed=len(s.velocity),up=unit(s.position),vertical=dot(s.velocity,up);
 const horizontal=Math.sqrt(Math.max(0,speed*speed-vertical*vertical));
 const energy=speed*speed/2-MU/r,h=len(cross(s.position,s.velocity));
 const eccentricity=Math.sqrt(Math.max(0,1+2*energy*h*h/(MU*MU)));
 const semiMajor=energy<0?-MU/(2*energy):Infinity;
 return {altitude:Math.max(0,r-R),speed,vertical,horizontal,gravity:MU/(r*r),density:1.225*Math.exp(-Math.max(0,r-R)/8500),
 apoapsis:Number.isFinite(semiMajor)?semiMajor*(1+eccentricity)-R:Infinity,
 periapsis:Number.isFinite(semiMajor)?semiMajor*(1-eccentricity)-R:-R,
 orbitalVelocity:Math.sqrt(MU/r),eccentricity,semiMajor,up};
}
export function basis(s:FlightState){
 const up=unit(s.position),east=unit(cross(up,[0,0,1])),north=unit(cross(east,up));
 return {up,east,north};
}
export function trajectory(s:FlightState,count=160):V3[]{
 // Two-body coast prediction; no engine or atmosphere in this overlay.
 let p=[...s.position] as V3,v=[...s.velocity] as V3;
 const points:V3[]=[];
 for(let i=0;i<count;i++){
  points.push([...p] as V3);
  const r=len(p);if(r<R-500)break;
  const a=mul(p,-MU/(r*r*r));
  v=[v[0]+a[0]*20,v[1]+a[1]*20,v[2]+a[2]*20];
  p=[p[0]+v[0]*20,p[1]+v[1]*20,p[2]+v[2]*20];
 }return points;
}
