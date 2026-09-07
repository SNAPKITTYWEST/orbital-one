import type {FlightState} from './sim/state';
export class FlightAudio{
 context:AudioContext|null=null;gain:GainNode|null=null;osc:OscillatorNode|null=null;enabled=false;lastPhase='';lastCount=-1;lastWarning=0;
 async toggle(){if(!this.context){this.context=new AudioContext();this.gain=this.context.createGain();this.gain.gain.value=0;this.gain.connect(this.context.destination);this.osc=this.context.createOscillator();this.osc.type='sawtooth';this.osc.frequency.value=35;const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=180;this.osc.connect(filter);filter.connect(this.gain);this.osc.start();}
 this.enabled=!this.enabled;await this.context.resume();if(!this.enabled){this.gain!.gain.setTargetAtTime(0,this.context.currentTime,.05);if('speechSynthesis' in window)speechSynthesis.cancel();}return this.enabled;}
 tone(frequency=600,duration=.07){if(!this.enabled||!this.context)return;const osc=this.context.createOscillator(),g=this.context.createGain();osc.frequency.value=frequency;g.gain.setValueAtTime(.04,this.context.currentTime);g.gain.exponentialRampToValueAtTime(.001,this.context.currentTime+duration);osc.connect(g);g.connect(this.context.destination);osc.start();osc.stop(this.context.currentTime+duration);osc.onended=()=>{osc.disconnect();g.disconnect();};}
 say(text:string){if(!this.enabled||!('speechSynthesis' in window))return;const speech=new SpeechSynthesisUtterance(text);speech.rate=1.05;speech.volume=.65;speechSynthesis.speak(speech);}
 update(s:FlightState,warning:boolean){if(!this.context||!this.gain)return;this.gain.gain.setTargetAtTime(this.enabled&&!s.paused?s.actualThrottle*.12:0,this.context.currentTime,.15);
 if(s.paused)return;
 if(s.phase!==this.lastPhase){this.lastPhase=s.phase;if(['IGNITION','LIFTOFF','STAGING','SPACE','ORBITAL FLIGHT','ABORT'].includes(s.phase))this.say(s.phase==='ORBITAL FLIGHT'?'Orbit achieved. You have the spacecraft.':s.phase);}
 if(s.phase==='COUNTDOWN'&&Math.ceil(s.countdown)!==this.lastCount){this.lastCount=Math.ceil(s.countdown);this.say(String(this.lastCount));}
 if(warning&&s.time-this.lastWarning>12){this.tone(880,.25);this.lastWarning=s.time;}
 }
 dispose(){if('speechSynthesis' in window)speechSynthesis.cancel();this.osc?.stop();void this.context?.close();}
}
