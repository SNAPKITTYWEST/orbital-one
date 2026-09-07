import test from 'node:test';import assert from 'node:assert/strict';
import {createState,SYSTEMS} from '../src/sim/state';
import {launch,stage,abort} from '../src/sim/mission';
import {tick} from '../src/sim/physics';
import {navigation} from '../src/sim/navigation';
import {STEP,MU,R} from '../src/sim/math';
function armed(){const s=createState();SYSTEMS.forEach(k=>s.systems[k]=true);s.engineArmed=s.launchArmed=true;return s;}
test('launch interlocks and real ten-second countdown',()=>{const s=createState();assert.equal(launch(s),false);const ready=armed();assert.equal(launch(ready),true);for(let i=0;i<599;i++)tick(ready);assert.equal(ready.phase,'COUNTDOWN');for(let i=0;i<3;i++)tick(ready);assert.equal(ready.phase,'IGNITION');});
test('fixed-step replay is deterministic',()=>{const a=armed(),b=armed();launch(a);launch(b);for(let i=0;i<9000;i++){tick(a);tick(b);}assert.deepEqual(a,b);});
test('fuel burns, mass decreases, thrust lifts vehicle',()=>{const s=armed();launch(s);for(let i=0;i<2400;i++)tick(s);assert.ok(s.fuel[0]<360000);assert.ok(s.mass<491500);assert.ok(navigation(s).altitude>1000);assert.ok(s.thrust>0);});
test('abort safes propulsion and changes mission without reset',()=>{const s=armed();launch(s);for(let i=0;i<2400;i++)tick(s);const time=s.time;abort(s);tick(s);assert.equal(s.phase,'ABORT');assert.equal(s.thrust,0);assert.ok(s.time>time);assert.equal(s.engineArmed,false);});
test('staging requires altitude and low fuel',()=>{const s=armed();assert.equal(stage(s),false);s.position=[0,R+5000,0];s.fuel[0]=100;assert.equal(stage(s),true);assert.equal(s.stage,1);assert.equal(stage(s),false);});
test('pause freezes simulation',()=>{const s=armed();s.paused=true;const before=structuredClone(s);tick(s);assert.deepEqual(s,before);});
test('navigation recognizes a circular two-body orbit',()=>{const s=armed();const r=R+220000;s.position=[0,r,0];s.velocity=[Math.sqrt(MU/r),0,0];const n=navigation(s);assert.ok(Math.abs(n.apoapsis-220000)<1);assert.ok(Math.abs(n.periapsis-220000)<1);});
test('guided flight reaches orbit using only integrated forces',()=>{const s=armed();launch(s);for(let i=0;i<60*1000&&!s.orbitAchieved;i++)tick(s);const n=navigation(s);console.log(JSON.stringify({phase:s.phase,time:s.time,alt:n.altitude,apo:n.apoapsis,peri:n.periapsis,speed:n.speed,fuel:s.fuel,pitch:s.pitch}));assert.ok(s.orbitAchieved);assert.ok(n.periapsis>180000);assert.ok(n.apoapsis<400000);});

test('aborted capsule reaches a safe parachute touchdown',()=>{const s=armed();s.phase='ASCENT';s.position=[0,R+2500,0];s.velocity=[0,-40,0];abort(s);for(let i=0;i<60000&&s.phase!=='LANDED'&&s.phase!=='IMPACT';i++)tick(s);assert.equal(s.phase,'LANDED');assert.equal(s.mass,6000);assert.equal(s.thrust,0);});
test('unprotected high-speed contact is an impact',()=>{const s=armed();s.phase='ASCENT';s.guidance=false;s.throttle=0;s.engineArmed=false;s.position=[0,R+31,0];s.velocity=[0,-300,0];tick(s);assert.equal(s.phase,'IMPACT');});
test('manual attitude changes thrust direction',()=>{const s=armed();s.phase='ASCENT';s.guidance=false;s.position=[0,R+100000,0];s.pitch=90;s.yaw=0;s.yawInput=1;for(let i=0;i<120;i++)tick(s);assert.ok(s.yaw>20);assert.ok(s.velocity[0]>0);assert.ok(s.velocity[2]>0);});
test('fuel never goes negative at exhaustion',()=>{const s=armed();s.phase='SPACE';s.guidance=false;s.fuel=[0.01,0];s.position=[0,R+100000,0];for(let i=0;i<120;i++)tick(s);assert.equal(s.fuel[0],0);assert.equal(s.thrust,0);});
