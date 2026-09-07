import * as T from 'three';
import {type FlightState} from '../sim/state';
import {navigation,basis} from '../sim/navigation';
import {RAD,clamp} from '../sim/math';
export type CameraMode='COCKPIT'|'EXTERNAL'|'CHASE'|'ORBIT'|'EARTH';
const v=(a:number[])=>new T.Vector3(...a as [number,number,number]);
const vertex=`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 n;varying vec3 p;void main(){n=normalize(normalMatrix*normal);p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`;
const noise=`
float hash(vec3 p){p=fract(p*.3183099+vec3(.1,.2,.3));p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float noise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){return .5*noise(p)+.25*noise(p*2.03)+.125*noise(p*4.01)+.0625*noise(p*8.07)+.03125*noise(p*16.1)+.015625*noise(p*32.2);}
`;
export class World{
 renderer:T.WebGLRenderer;scene=new T.Scene();camera=new T.PerspectiveCamera(58,1,.0002,100000);
 rocket=new T.Group();tower=new T.Group();booster=new T.Group();flame:T.Mesh;stars:T.Points;earth:T.Mesh;atmosphere:T.Mesh;
 mode:CameraMode='COCKPIT';look={x:0,y:0};target=new T.Vector3();smoothTarget=new T.Vector3();
 skyScene=new T.Scene();skyCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);skyMaterial=new T.ShaderMaterial({depthWrite:false,depthTest:false,uniforms:{atmosphere:{value:1},horizon:{value:.36}},vertexShader:`varying vec2 uvSky;void main(){uvSky=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`varying vec2 uvSky;uniform float atmosphere;uniform float horizon;${noise}
 void main(){float height=clamp((uvSky.y-horizon)*1.6,0.,1.);vec3 sky=mix(vec3(.69,.74,.71),vec3(.12,.31,.46),pow(height,.6));float wisps=smoothstep(.53,.64,fbm(vec3(uvSky.x*9.,uvSky.y*38.,1.)))*smoothstep(horizon+.06,horizon+.2,uvSky.y)*.22;sky=mix(sky,vec3(.86,.89,.87),wisps);float glow=exp(-length((uvSky-vec2(.76,horizon+.17))*vec2(1.,1.5))*5.);sky+=vec3(.16,.1,.035)*glow;gl_FragColor=vec4(mix(vec3(.006,.012,.023),sky,atmosphere),1.);}`});
 reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;observer:ResizeObserver;
 constructor(public host:HTMLElement){
 this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance',logarithmicDepthBuffer:true});
 this.skyScene.add(new T.Mesh(new T.PlaneGeometry(2,2),this.skyMaterial));
 this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));this.renderer.outputColorSpace=T.SRGBColorSpace;
 this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;host.append(this.renderer.domElement);
 this.scene.add(new T.HemisphereLight(0xbcd8ee,0x111a29,2));this.scene.add(new T.AmbientLight(0xb9ccd5,.7));
 const sun=new T.DirectionalLight(0xffe5bb,4);sun.position.set(8000,9000,4000);this.scene.add(sun);
 const material=new T.ShaderMaterial({vertexShader:vertex,fragmentShader:`
 #include <logdepthbuf_pars_fragment>
 varying vec3 n;varying vec3 p;${noise}
 void main(){
 float continent=fbm(p*4.5+vec3(1.8,3.,5.));
 float land=smoothstep(.495,.509,continent);
 float detail=fbm(p*58.);
 vec3 ocean=mix(vec3(.008,.055,.105),vec3(.025,.22,.31),detail);
 vec3 ground=mix(vec3(.055,.135,.10),vec3(.33,.30,.20),smoothstep(.53,.68,continent));
 vec3 col=mix(ocean,ground,land);
 float ice=smoothstep(.85,.95,abs(p.z));col=mix(col,vec3(.82,.91,.96),ice);
 float cloud=smoothstep(.53,.66,fbm(p*24.+vec3(fbm(p*12.)*3.,1.,2.)))*.88;
 col=mix(col,vec3(.87,.92,.94),cloud);
 float day=dot(p,normalize(vec3(.6,1.,.4)));
 float lighting=smoothstep(-.08,.3,day);col*=.05+lighting*.95;
 float city=step(.77,noise(p*1700.))*land*(1.-lighting)*smoothstep(.49,.6,continent);
 col+=vec3(1.,.58,.14)*city*.8;
 float rim=pow(1.-max(0.,dot(normalize(n),vec3(0,0,1))),3.);
 col+=vec3(.045,.22,.39)*rim*lighting*.5;
 gl_FragColor=vec4(col,1.);
 #include <logdepthbuf_fragment>
 }`});
 this.earth=new T.Mesh(new T.SphereGeometry(6371,192,128),material);this.scene.add(this.earth);
 this.atmosphere=new T.Mesh(new T.SphereGeometry(6450,96,64),new T.ShaderMaterial({vertexShader:vertex,fragmentShader:`
#include <logdepthbuf_pars_fragment>
varying vec3 n;varying vec3 p;void main(){float f=pow(max(0.,1.-abs(dot(normalize(n),vec3(0,0,1)))),5.);gl_FragColor=vec4(.16,.46,.85,f*.28);
#include <logdepthbuf_fragment>
}`,transparent:true,side:T.BackSide,blending:T.AdditiveBlending,depthWrite:false}));
 this.scene.add(this.atmosphere);
 const positions:number[]=[];let seed=43;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 for(let i=0;i<2200;i++){const z=rand()*2-1,a=rand()*Math.PI*2,r=Math.sqrt(1-z*z);positions.push(r*Math.cos(a)*40000,z*40000,r*Math.sin(a)*40000);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 this.stars=new T.Points(geo,new T.PointsMaterial({size:20,color:0xd5e6ff,transparent:true,opacity:0,sizeAttenuation:true}));this.scene.add(this.stars);
 const white=new T.MeshStandardMaterial({color:0xc9d4db,metalness:.7,roughness:.3});
 const dark=new T.MeshStandardMaterial({color:0x182432,metalness:.85,roughness:.3});
 const orange=new T.MeshStandardMaterial({color:0xdc6e3c,roughness:.35});
 const body=new T.Mesh(new T.CylinderGeometry(.0026,.003,.032,24),white);this.rocket.add(body);const spent=new T.Mesh(new T.CylinderGeometry(.003,.003,.023,24),white);this.booster.add(spent);this.scene.add(this.booster);
 const nose=new T.Mesh(new T.ConeGeometry(.0026,.008,24),white);nose.position.y=.020;this.rocket.add(nose);
 for(const y of [-.012,.006]){const band=new T.Mesh(new T.CylinderGeometry(.00265,.00265,.002,24),dark);band.position.y=y;this.rocket.add(band);}
 for(let i=0;i<4;i++){const fin=new T.Mesh(new T.BoxGeometry(.0007,.007,.009),orange);fin.position.y=-.013;fin.rotation.y=i*Math.PI/2;this.rocket.add(fin);}
 const nozzle=new T.Mesh(new T.CylinderGeometry(.0013,.0025,.003,24),dark);nozzle.position.y=-.017;this.rocket.add(nozzle);
 this.flame=new T.Mesh(new T.ConeGeometry(.0026,.04,20),new T.MeshBasicMaterial({color:0xffb566,transparent:true,opacity:.8,blending:T.AdditiveBlending,depthWrite:false}));
 this.flame.rotation.z=Math.PI;this.flame.position.y=-.038;this.rocket.add(this.flame);this.scene.add(this.rocket);
 const pad=new T.Mesh(new T.CylinderGeometry(.025,.025,.001,48),new T.MeshStandardMaterial({color:0x3e464a,roughness:.9}));
 pad.position.set(0,6371.001,0);this.scene.add(pad);
 const water=new T.Mesh(new T.PlaneGeometry(25,25),new T.MeshStandardMaterial({color:0x2e6476,metalness:.12,roughness:.65}));
 water.rotation.x=-Math.PI/2;water.position.y=6370.999;this.scene.add(water);
 const shore=new T.Mesh(new T.CircleGeometry(.38,64),new T.MeshStandardMaterial({color:0x677367,roughness:1}));
 shore.rotation.x=-Math.PI/2;shore.position.set(-.12,6371,0);this.scene.add(shore);
 for(let i=0;i<8;i++){const bunker=new T.Mesh(new T.BoxGeometry(.024,.006,.013),new T.MeshStandardMaterial({color:0x85939a,roughness:.9}));bunker.position.set(.18+i*.065,6371.003,-.22);this.scene.add(bunker);}
 const roadway=new T.Mesh(new T.BoxGeometry(.5,.0002,.008),new T.MeshStandardMaterial({color:0x505e65}));roadway.position.set(0,6371.0003,-.04);this.scene.add(roadway);
 const solarDisk=new T.Mesh(new T.SphereGeometry(220,32,16),new T.MeshBasicMaterial({color:0xffead0}));solarDisk.position.set(30000,11000,-16000);this.scene.add(solarDisk);
 const steel=new T.MeshStandardMaterial({color:0x667986,metalness:.25,roughness:.65});
 for(const x of [-.004,.004])for(const z of [-.004,.004]){
 const beam=new T.Mesh(new T.BoxGeometry(.0009,.09,.0009),steel);beam.position.set(x,.045,z);this.tower.add(beam);}
 for(let y=.005;y<.09;y+=.009){
 const deck=new T.Mesh(new T.BoxGeometry(.011,.001,.011),steel);deck.position.y=y;this.tower.add(deck);
 const lamp=new T.Mesh(new T.BoxGeometry(.001,.001,.001),new T.MeshBasicMaterial({color:0xffb34b}));lamp.position.set(.005,y,.005);this.tower.add(lamp);
 }
 const arm=new T.Mesh(new T.BoxGeometry(.06,.0015,.002),steel);arm.position.set(-.023,.065,0);this.tower.add(arm);
 this.tower.position.set(.07,6371,.028);this.scene.add(this.tower);
 this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);this.resize();
 }
 resize(){const {width,height}=this.host.getBoundingClientRect();this.camera.aspect=width/Math.max(height,1);this.camera.updateProjectionMatrix();this.renderer.setSize(width,height);}
 setMode(mode:CameraMode){this.mode=mode;this.look={x:0,y:0};}
 render(s:FlightState,dt:number){
 const nav=navigation(s),b=basis(s),p=v(s.position).multiplyScalar(.001),up=v(b.up),east=v(b.east),north=v(b.north);
 const direction=up.clone().multiplyScalar(Math.cos(s.pitch*RAD)).add(east.clone().multiplyScalar(Math.sin(s.pitch*RAD)*Math.sin(s.yaw*RAD))).add(north.clone().multiplyScalar(Math.sin(s.pitch*RAD)*Math.cos(s.yaw*RAD)));
 this.rocket.position.copy(p);this.rocket.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction);
 this.rocket.visible=this.mode!=='COCKPIT';this.rocket.scale.y=s.phase==='ABORT'?.35:s.stage===1?.7:1;this.flame.visible=s.thrust>100;
 this.booster.visible=s.stage===1&&s.time-s.stageTime<25&&s.time>=s.stageTime;
 this.booster.position.copy(p).addScaledVector(direction,-.04-(s.time-s.stageTime)*.008);this.booster.quaternion.copy(this.rocket.quaternion);
 this.flame.scale.y=s.actualThrottle*(1+.06*Math.sin(s.time*41));this.flame.position.y=-.018-.02*this.flame.scale.y;
 const atmosphere=1-clamp(nav.altitude/95000,0,1);
 this.scene.background=null;this.skyMaterial.uniforms.atmosphere.value=this.mode==='ORBIT'?0:atmosphere;this.skyMaterial.uniforms.horizon.value=.5-(8-24*clamp(nav.altitude/100000,0,1)+this.look.y*35)/58;
 this.scene.fog=atmosphere>.1?new T.Fog(0x9aafb7,.18,12):null;
 (this.stars.material as T.PointsMaterial).opacity=1-atmosphere;
 const pos=new T.Vector3(),target=new T.Vector3();
 if(this.mode==='COCKPIT'){
 pos.copy(p).addScaledVector(up,.005);
 const elevation=8-24*clamp(nav.altitude/100000,0,1)+this.look.y*35;
 const heading=s.yaw*RAD+this.look.x*1.2;
 target.copy(pos).addScaledVector(east,Math.sin(heading)*Math.cos(elevation*RAD)).addScaledVector(north,Math.cos(heading)*Math.cos(elevation*RAD)).addScaledVector(up,Math.sin(elevation*RAD));
 }else if(this.mode==='EARTH'){
 pos.copy(p).addScaledVector(up,Math.max(.025,nav.altitude*.0004));
 target.set(0,0,0);
 }else if(this.mode==='ORBIT'){
 const distance=16000;
 pos.copy(up).multiplyScalar(distance).addScaledVector(east,distance*.25).addScaledVector(north,distance*.1);target.set(0,0,0);
 }else if(this.mode==='CHASE'){
 pos.copy(p).addScaledVector(direction,-.09).addScaledVector(up,.02).addScaledVector(north,.02);target.copy(p).addScaledVector(direction,.03);
 }else{
 pos.copy(p).addScaledVector(east,.08).addScaledVector(up,.035).addScaledVector(north,.08);target.copy(p);
 }
 if(this.camera.position.length()===0){this.camera.position.copy(pos);this.smoothTarget.copy(target);}
 const smooth=1-Math.exp(-dt*5);
 this.camera.position.lerp(pos,smooth);this.smoothTarget.lerp(target,smooth);
 this.camera.up.copy(up).applyAxisAngle(direction,s.roll*RAD);
 if(!this.reduced&&this.mode==='COCKPIT'&&!s.paused){
 const amplitude=s.actualThrottle*.000012;
 this.camera.position.addScaledVector(east,Math.sin(s.time*49)*amplitude).addScaledVector(up,Math.sin(s.time*37)*amplitude);
 }
 this.camera.lookAt(this.smoothTarget);
 this.renderer.autoClear=false;this.renderer.clear();this.renderer.render(this.skyScene,this.skyCamera);this.renderer.clearDepth();this.renderer.render(this.scene,this.camera);
 }
 dispose(){this.observer.disconnect();this.skyMaterial.dispose();this.skyScene.traverse(o=>{if(o instanceof T.Mesh)o.geometry.dispose();});this.scene.traverse(o=>{if(o instanceof T.Mesh||o instanceof T.Points){o.geometry.dispose();const m=Array.isArray(o.material)?o.material:[o.material];m.forEach(x=>x.dispose());}});this.renderer.dispose();}
}
