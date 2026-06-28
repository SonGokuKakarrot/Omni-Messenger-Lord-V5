// OMNI V5 ANDROID - FOR QUETTA BROWSER
(() => {
  const inject = () => {
    const s = document.createElement('script');
    s.textContent = `
(() => {
  console.log('%c[OMNI V5 ANDROID] ACTIVE', 'color: #00ff00; font-size: 18px;');
  const LOUD = 6.5; // CHANGE THIS: 5.5=safe, 6.5=LOUD, 8=GOD MODE
  
  const origGUM = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);

  navigator.mediaDevices.getUserMedia = async function(c){
    if(c && c.audio){
      // KILL ANDROID AGC - THIS IS 90% OF THE FIX
      c.audio = {
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
        googEchoCancellation: false, googAutoGainControl: false, googNoiseSuppression: false,
        channelCount: 1, sampleRate: 44100
      };
    }
    const stream = await origGUM(c);
    if(!c || !c.audio) return stream;

    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      const ctx = new AC({latencyHint: 'interactive'});
      
      // ANDROID FIX #1: NEVER LET AUDIO SUSPEND
      const keepAlive = () => ctx.state !== 'running' && ctx.resume();
      ['touchstart','click','touchend'].forEach(e => document.addEventListener(e, keepAlive, {passive:true}));
      setInterval(keepAlive, 700);
      navigator.wakeLock?.request('screen').catch(()=>{});
      
      const src = ctx.createMediaStreamSource(stream);
      const hp = ctx.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=90;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -42; comp.ratio.value = 18; comp.attack.value = 0.002; comp.release.value = 0.06;
      const gain = ctx.createGain(); gain.gain.value = LOUD;
      
      // Mobile CPU light soft-clipper (no hard clip = no mute)
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for(let i=0;i<256;i++){ curve[i] = Math.tanh(((i-128)/128)*2.5); }
      shaper.curve = curve; shaper.oversample = '2x';
      
      const dest = ctx.createMediaStreamDestination();
      
      // ANDROID FIX #2: Anti-VAD inaudible tone
      const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      nb.getChannelData(0).forEach((v,i,a)=>a[i]=(Math.random()-0.5)*0.0008);
      const ns = ctx.createBufferSource(); ns.buffer=nb; ns.loop=true;
      ns.connect(ctx.createGain()).connect(dest); ns.start();
      
      src.connect(hp).connect(comp).connect(gain).connect(shaper).connect(dest);
      
      const out = dest.stream;
      out.getAudioTracks()[0].label = 'OMNI_ANDROID';
      return out;
    } catch(e){ return stream; }
  };

  // ANDROID FIX #3: LATE-JOIN RE-INJECTION
  const PC = window.RTCPeerConnection;
  window.RTCPeerConnection = function(...a){
    const pc = new PC(...a);
    const fix = async ()=>{
      for(const s of pc.getSenders()){
        if(s.track?.kind==='audio' && s.track.label!=='OMNI_ANDROID'){
          try { const ns = await origGUM({audio:true}); await s.replaceTrack(ns.getAudioTracks()[0]); } catch(e){}
        }
      }
    };
    setInterval(fix, 1200); // check every 1.2s
    pc.addEventListener('negotiationneeded', fix);
    return pc;
  };
  window.RTCPeerConnection.prototype = PC.prototype;
})();
    `;
    document.documentElement.appendChild(s);
    s.remove();
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
})();
