import type {FlightState} from '../sim/state';import {navigation,trajectory} from '../sim/navigation';import {R,RAD} from '../sim/math';
function context(canvas:HTMLCanvasElement){const d=Math.min(devicePixelRatio,2),w=canvas.clientWidth,h=canvas.clientHeight;if(canvas.width!==w*d||canvas.height!==h*d){canvas.width=w*d;canvas.height=h*d;}const c=canvas.getContext('2d')!;c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);return {c,w,h};}
export function horizon(canvas:HTMLCanvasElement,s:FlightState){
 const {c,w,h}=context(canvas);const cx=w/2,cy=h/2,r=Math.min(w*.39,h*.43);
 c.save();c.translate(cx,cy);c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.clip();c.rotate(-s.roll*RAD);
 const pitch=(90-s.pitch)*.62;
 c.fillStyle='#183644';c.fillRect(-w,-h,w*2,h*2);c.fillStyle='#473d31';c.fillRect(-w,pitch,w*2,h*2);
 c.strokeStyle='#a7d8d2';c.lineWidth=1;c.beginPath();c.moveTo(-w,pitch);c.lineTo(w,pitch);c.stroke();
 c.font='9px monospace';c.textAlign='center';
 for(let deg=-90;deg<=90;deg+=15){const y=pitch+deg*.62;if(!deg)continue;c.strokeStyle='#608a8c';c.beginPath();c.moveTo(-22,y);c.lineTo(22,y);c.stroke();c.fillStyle='#a2bdbd';c.fillText(String(Math.abs(deg)),-34,y+3);}
 c.restore();c.strokeStyle='#ecb582';c.lineWidth=2;c.beginPath();c.moveTo(cx-33,cy);c.lineTo(cx-10,cy);c.lineTo(cx,cy+7);c.lineTo(cx+10,cy);c.lineTo(cx+33,cy);c.stroke();
 c.strokeStyle='#435861';c.lineWidth=3;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke();
 c.fillStyle='#9bb5bf';c.font='9px monospace';c.textAlign='center';c.fillText('N',cx,cy-r-8);
}
export function orbitMap(canvas:HTMLCanvasElement,s:FlightState){
 const {c,w,h}=context(canvas),cx=w*.46,cy=h*.56,r=Math.min(w*.25,h*.37);
 c.strokeStyle='#243942';c.lineWidth=1;
 for(let x=0;x<w;x+=22){c.beginPath();c.moveTo(x,0);c.lineTo(x,h);c.stroke();}
 for(let y=0;y<h;y+=22){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();}
 const gradient=c.createRadialGradient(cx-r*.4,cy-r*.4,0,cx,cy,r);gradient.addColorStop(0,'#326879');gradient.addColorStop(.6,'#1b4050');gradient.addColorStop(1,'#0b202e');
 c.fillStyle=gradient;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.fill();c.strokeStyle='#4f9dad';c.stroke();
 c.strokeStyle='#445c61';c.setLineDash([3,4]);c.beginPath();c.ellipse(cx,cy,r*1.2,r*1.2,0,0,Math.PI*2);c.stroke();c.setLineDash([]);
 const points=trajectory(s,160);c.strokeStyle='#e4ac75';c.lineWidth=1.3;c.beginPath();
 points.forEach((p,i)=>{const x=cx+p[0]/R*r,y=cy-p[1]/R*r;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
 const x=cx+s.position[0]/R*r,y=cy-s.position[1]/R*r;c.fillStyle='#fff0d7';c.beginPath();c.arc(x,y,3,0,Math.PI*2);c.fill();
 c.fillStyle='#8ba9b3';c.font='9px monospace';c.fillText('COAST PREDICTION',8,13);
 const n=navigation(s);c.fillText('e '+n.eccentricity.toFixed(3),w-58,h-9);
}
