(() => {
  if (window.__micMaxInjectorReady) return;
  window.__micMaxInjectorReady = true;

  // Omni Messenger Lord V4 ULTRA — 250000x Quetta extreme profile
  const DEFAULTS = {
    profileVersion: 9,
    enabled: true,
    gainDb: 108.0,
    thresholdDb: -68,
    knee: 18,
    ratio: 20,
    attack: 0.00006,
    release: 0.03,
    lowShelfDb: 16,
    presenceDb: 30,
    highShelfDb: 20,
    presencePeakFreq: 5000,
    presencePeakQ: 2.1,
    presencePeakDb: 26,
    limiterDb: -0.2,
    drive: 2.3,
    loudness: 1.15,
    maxBoost: 200000,
    saturationCurveIntensity: 1.8,
    sustain: true,
    sustainTargetDb: 7,
    sustainMaxGain: 150,
    forceRawMic: true,
    reverbEnabled: true,
    reverbDelay: 0.05,
    reverbFeedback: 0.38,
    reverbWet: 0.18,
    keepAlive: true,
    keepAliveGain: 0.0015,
    senderRefreshMs: 150,
    isAndroidQuetta: /Android|Quetta/i.test(navigator.userAgent)
  };
  const MSG_CFG = 'MIC_MAXIMIZER_CONFIG';
  const AUDIO_SEND_MAX_BITRATE = 640000;
  const state = {
    config: { ...DEFAULTS },
    origMD: null,
    origLegacy: null,
    pipelines: new Set(),
    trackMap: new WeakMap(),
    processedTracks: new WeakSet(),
    processedMeta: new WeakMap(),
    senderWatchTracks: new WeakSet(),
    peerConnections: new Set(),
    senderRecords: new Set(),
    senderBySender: new WeakMap(),
    tunedSenders: new WeakSet(),
    refreshingSenders: new WeakSet(),
    recoverTimers: new Set(),
    recoveryScheduled: false,
    sourceTracks: new Set(),
    origApplyConstraints: null,
    lastAudioConstraints: { audio: true },
    lateJoinDetected: false,
    aggressiveRecoveryActive: false,
    lateJoinGraceUntil: 0
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number.isFinite(Number(value)) ? Number(value) : min));
  const dbToLinear = (db) => Math.pow(10, db / 20);

  function cfg(input = state.config) {
    const merged = { ...DEFAULTS, ...(input || {}) };
    merged.enabled = Boolean(merged.enabled);
    merged.maxBoost = clamp(merged.maxBoost, 1, 250000);
    merged.loudness = clamp(merged.loudness, 0.5, merged.maxBoost);
    merged.gainDb = clamp(merged.gainDb, 0, 125);
    merged.drive = clamp(merged.drive, 0, 15);
    merged.saturationCurveIntensity = clamp(merged.saturationCurveIntensity, 0.5, 5);
    merged.thresholdDb = clamp(merged.thresholdDb, -100, 0);
    merged.knee = clamp(merged.knee, 0, 40);
    merged.ratio = clamp(merged.ratio, 1, 20);
    merged.attack = clamp(merged.attack, 0.00001, 1);
    merged.release = clamp(merged.release, 0.01, 1);
    merged.lowShelfDb = clamp(merged.lowShelfDb, -60, 60);
    merged.presenceDb = clamp(merged.presenceDb, -60, 60);
    merged.highShelfDb = clamp(merged.highShelfDb, -60, 60);
    merged.presencePeakDb = clamp(merged.presencePeakDb, -60, 60);
    merged.presencePeakFreq = clamp(merged.presencePeakFreq, 1000, 12000);
    merged.presencePeakQ = clamp(merged.presencePeakQ, 0.5, 10);
    merged.limiterDb = clamp(merged.limiterDb, -24, 2);
    merged.sustain = Boolean(merged.sustain);
    merged.sustainTargetDb = clamp(merged.sustainTargetDb, -24, 12);
    merged.sustainMaxGain = clamp(merged.sustainMaxGain, 1, 200);
    merged.forceRawMic = Boolean(merged.forceRawMic);
    merged.reverbEnabled = Boolean(merged.reverbEnabled);
    merged.reverbDelay = clamp(merged.reverbDelay, 0.01, 0.35);
    merged.reverbFeedback = clamp(merged.reverbFeedback, 0, 0.75);
    merged.reverbWet = clamp(merged.reverbWet, 0, 0.6);
    merged.keepAlive = Boolean(merged.keepAlive);
    merged.keepAliveGain = clamp(merged.keepAliveGain, 0, 0.005);
    merged.senderRefreshMs = state.aggressiveRecoveryActive ? 80 : clamp(merged.senderRefreshMs, 100, 1500);
    return merged;
  }

  function makeSaturationCurve(amount = 0.5, intensity = 1) {
    const k = Math.max(0.0001, amount * 100 * intensity);
    const n = 4096;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i += 1) {
      const x = (i * 2) / n - 1;
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  function setParam(param, value, ctx) {
    if (!param) return;
    const safeValue = clamp(value, param.minValue ?? -Infinity, param.maxValue ?? Infinity);
    const now = ctx?.currentTime || 0;
    try {
      if (typeof param.cancelScheduledValues === 'function') param.cancelScheduledValues(now);
      if (typeof param.setTargetAtTime === 'function') param.setTargetAtTime(safeValue, now, 0.003);
      else param.value = safeValue;
    } catch (_) {
      try { param.value = safeValue; } catch (_) {}
    }
  }

  function applyPipeline(pipeline, raw) {
    if (!pipeline || !raw) return;
    const c = raw.enabled ? raw : {
      ...raw,
      lowShelfDb: 0,
      presenceDb: 0,
      presencePeakDb: 0,
      highShelfDb: 0,
      thresholdDb: -6,
      knee: 0,
      ratio: 1,
      loudness: 1,
      gainDb: 0,
      drive: 0,
      saturationCurveIntensity: 0.5,
      limiterDb: -0.5
    };
    const { ctx, nodes } = pipeline;
    setParam(nodes.low.gain, c.lowShelfDb, ctx);
    setParam(nodes.pres.gain, c.presenceDb, ctx);
    if (nodes.presencePeak) setParam(nodes.presencePeak.gain, c.presencePeakDb, ctx);
    setParam(nodes.high.gain, c.highShelfDb, ctx);
    setParam(nodes.comp1.threshold, c.thresholdDb, ctx);
    setParam(nodes.comp1.knee, c.knee, ctx);
    setParam(nodes.comp1.ratio, c.ratio, ctx);
    setParam(nodes.comp1.attack, c.attack, ctx);
    setParam(nodes.comp1.release, c.release, ctx);
    setParam(nodes.loudness.gain, c.loudness, ctx);
    setParam(nodes.gain.gain, dbToLinear(c.gainDb), ctx);
    nodes.saturator.curve = makeSaturationCurve(c.drive, c.saturationCurveIntensity);
    if (nodes.reverbDelay) setParam(nodes.reverbDelay.delayTime, c.reverbDelay, ctx);
    if (nodes.reverbFeedback) setParam(nodes.reverbFeedback.gain, c.reverbEnabled ? c.reverbFeedback : 0, ctx);
    if (nodes.reverbWet) setParam(nodes.reverbWet.gain, c.reverbEnabled ? c.reverbWet : 0, ctx);
    if (nodes.keepAliveGain) setParam(nodes.keepAliveGain.gain, c.keepAlive ? c.keepAliveGain : 0, ctx);
    if (nodes.sustain && !c.sustain) setParam(nodes.sustain.gain, 1, ctx);
    setParam(nodes.limiter.threshold, c.limiterDb, ctx);
  }

  function updateAllPipelines(inputConfig = state.config) {
    for (const pipeline of state.pipelines) applyPipeline(pipeline, inputConfig);
  }

  function resumePipeline(pipeline) {
    const ctx = pipeline?.ctx;
    if (!ctx || ctx.state === 'closed' || typeof ctx.resume !== 'function') return;
    if (ctx.state !== 'running') ctx.resume().catch(() => {});
  }

  function resumeAllPipelines() {
    for (const pipeline of state.pipelines) resumePipeline(pipeline);
  }

  function rmsDbFromAnalyser(analyser, buffer) {
    analyser.getByteTimeDomainData(buffer);
    let sum = 0;
    for (let i = 0; i < buffer.length; i += 1) {
      const sample = (buffer[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / buffer.length);
    return 20 * Math.log10(Math.max(rms, 0.00001));
  }

  function startSustainController(pipeline) {
    if (!pipeline || pipeline.sustainTimer) return;
    const { ctx, nodes } = pipeline;
    const c = cfg();
    const buffer = new Uint8Array(nodes.meter.fftSize);
    let currentGain = 1;
    pipeline.sustainTimer = setInterval(() => {
      if (!c.sustain || !nodes.sustain) return;
      const db = rmsDbFromAnalyser(nodes.meter, buffer);
      const target = c.sustainTargetDb;
      if (db < target) {
        const lift = 1 + Math.min(1.5, Math.max(0.03, (target - db) * 0.04));
        currentGain = Math.min(c.sustainMaxGain, currentGain * lift);
      } else {
        currentGain = Math.max(1, currentGain * 0.78);
      }
      setParam(nodes.sustain.gain, currentGain, ctx);
    }, 100);
  }

  function createAudioContext() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try {
      return new AC({ latencyHint: 'interactive', sampleRate: 48000 });
    } catch (_) {
      return new AC({ latencyHint: 'interactive' });
    }
  }

  function createKeepAliveNoise(ctx) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 2));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function build(stream, inputConfig) {
    const ctx = createAudioContext();
    if (!ctx || !stream.getAudioTracks().length) return stream;
    stream.getAudioTracks().forEach(enforceRawMicTrack);

    const source = ctx.createMediaStreamSource(stream);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 60;
    hp.Q.value = 0.8;

    const low = ctx.createBiquadFilter();
    low.type = 'lowshelf';
    low.frequency.value = 200;

    const pres = ctx.createBiquadFilter();
    pres.type = 'peaking';
    pres.frequency.value = 3200;
    pres.Q.value = 1.5;

    const presencePeak = ctx.createBiquadFilter();
    presencePeak.type = 'peaking';
    presencePeak.frequency.value = 5000;
    presencePeak.Q.value = 2.2;

    const high = ctx.createBiquadFilter();
    high.type = 'highshelf';
    high.frequency.value = 6000;

    const comp1 = ctx.createDynamicsCompressor();
    const comp2 = ctx.createDynamicsCompressor();
    comp2.threshold.value = -8;
    comp2.knee.value = 4;
    comp2.ratio.value = 14;
    comp2.attack.value = 0.0005;
    comp2.release.value = 0.04;

    const loudness = ctx.createGain();
    const gain = ctx.createGain();
    const saturator = ctx.createWaveShaper();
    saturator.oversample = '4x';
    const sustain = ctx.createGain();
    sustain.gain.value = 1;

    const reverbDelay = ctx.createDelay(0.5);
    const reverbFeedback = ctx.createGain();
    const reverbWet = ctx.createGain();
    const keepAliveGain = ctx.createGain();
    keepAliveGain.gain.value = 0;
    const keepAliveSource = createKeepAliveNoise(ctx);

    const limiter = ctx.createDynamicsCompressor();
    limiter.knee.value = 1;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.00008;
    limiter.release.value = 0.008;

    const meter = ctx.createAnalyser();
    meter.fftSize = 1024;
    meter.smoothingTimeConstant = 0.15;

    const dst = ctx.createMediaStreamDestination();
    source.connect(hp);
    hp.connect(low);
    low.connect(pres);
    pres.connect(presencePeak);
    presencePeak.connect(high);
    high.connect(comp1);
    comp1.connect(comp2);
    comp2.connect(loudness);
    loudness.connect(gain);
    gain.connect(saturator);
    saturator.connect(sustain);
    saturator.connect(reverbDelay);
    reverbDelay.connect(reverbFeedback);
    reverbFeedback.connect(reverbDelay);
    reverbDelay.connect(reverbWet);
    reverbWet.connect(sustain);
    sustain.connect(limiter);
    limiter.connect(meter);
    keepAliveSource.connect(keepAliveGain);
    keepAliveGain.connect(meter);
    meter.connect(dst);
    keepAliveSource.start(0);

    const pipeline = {
      ctx,
      nodes: { low, pres, presencePeak, high, comp1, loudness, gain, saturator, sustain, reverbDelay, reverbFeedback, reverbWet, keepAliveGain, limiter, meter },
      keepAliveSource,
      sustainTimer: null
    };
    applyPipeline(pipeline, inputConfig);
    state.pipelines.add(pipeline);
    startSustainController(pipeline);
    resumePipeline(pipeline);

    const outAudioTracks = dst.stream.getAudioTracks();
    outAudioTracks.forEach((track) => {
      state.processedTracks.add(track);
      state.processedMeta.set(track, { source: stream, pipeline });
    });

    const out = new MediaStream([
      ...outAudioTracks,
      ...stream.getTracks().filter((track) => track.kind !== 'audio')
    ]);

    const stop = () => {
      state.pipelines.delete(pipeline);
      if (pipeline.sustainTimer) clearInterval(pipeline.sustainTimer);
      stream.getAudioTracks().forEach((track) => state.sourceTracks.delete(track));
      try { pipeline.keepAliveSource?.stop(); } catch (_) {}
      try { ctx.close(); } catch (_) {}
    };
    outAudioTracks.forEach((track) => track.addEventListener('ended', stop, { once: true }));
    stream.getTracks().forEach((track) => track.addEventListener('ended', scheduleRecoveryPasses, { once: true }));
    return out;
  }

  function rawMicAudioConstraints(audio = {}) {
    const base = audio && typeof audio === 'object' ? audio : {};
    const processingOff = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      googEchoCancellation: false,
      googEchoCancellation2: false,
      googEchoCancellation3: false,
      googDAEchoCancellation: false,
      googExperimentalEchoCancellation: false,
      googHybridEchoCancellation: false,
      googHybridAec: false,
      googEchoCancellationHybrid: false,
      googAutoGainControl: false,
      googAutoGainControl2: false,
      googNoiseSuppression: false,
      googNoiseSuppression2: false,
      googExperimentalNoiseSuppression: false,
      googHighpassFilter: false,
      googTypingNoiseDetection: false,
      googAudioMirroring: false,
      googBeamforming: false,
      mozAutoGainControl: false,
      mozNoiseSuppression: false
    };
    return {
      ...base,
      ...processingOff,
      channelCount: { ideal: 1, max: 1 },
      sampleRate: { ideal: 48000 },
      sampleSize: { ideal: 16 },
      advanced: [
        ...(Array.isArray(base.advanced) ? base.advanced : []),
        processingOff,
        { channelCount: 1 },
        { sampleRate: 48000 },
        { sampleSize: 16 }
      ]
    };
  }

  function enforceRawMicTrack(track) {
    if (!track || track.kind !== 'audio' || !cfg().forceRawMic) return;
    state.sourceTracks.add(track);
    try { track.enabled = true; } catch (_) {}
    try { track.contentHint = 'speech'; } catch (_) {}
    if (typeof track.applyConstraints === 'function') {
      try { track.applyConstraints(rawMicAudioConstraints()).catch(() => {}); } catch (_) {}
    }
  }

  function enforceAllSourceConstraints() {
    for (const track of [...state.sourceTracks]) {
      if (!track || track.readyState === 'ended') {
        state.sourceTracks.delete(track);
        continue;
      }
      enforceRawMicTrack(track);
    }
  }

  function patchTrackConstraints() {
    const proto = window.MediaStreamTrack?.prototype;
    if (!proto || proto.__micMaxTrackPatched || typeof proto.applyConstraints !== 'function') return;
    state.origApplyConstraints = proto.applyConstraints;
    proto.applyConstraints = function applyConstraints(constraints = {}) {
      const next = cfg().enabled && cfg().forceRawMic && this.kind === 'audio'
        ? rawMicAudioConstraints(constraints)
        : constraints;
      return state.origApplyConstraints.call(this, next);
    };
    proto.__micMaxTrackPatched = true;
  }

  function normalizeConstraints(constraints) {
    if (!constraints) return { audio: true };
    const next = { ...constraints };
    if (typeof next.audio === 'object') next.audio = rawMicAudioConstraints(next.audio);
    return next;
  }

  function wantsAudio(constraints) {
    if (constraints === true) return true;
    if (!constraints || typeof constraints !== 'object') return false;
    return 'audio' in constraints ? Boolean(constraints.audio) : true;
  }

  function processedStreamFor(originalStream, rawTrack, processedTrack) {
    if (!originalStream || typeof originalStream.getTracks !== 'function') return new MediaStream([processedTrack]);
    return new MediaStream(originalStream.getTracks().map((track) => (track === rawTrack ? processedTrack : track)));
  }

  function liveAudioTrack(stream) {
    if (!stream || typeof stream.getAudioTracks !== 'function') return null;
    return stream.getAudioTracks().find((track) => track.readyState !== 'ended') || null;
  }

  function processedSourceIsLive(track) {
    if (!track || !state.processedTracks.has(track)) return true;
    const meta = state.processedMeta.get(track);
    if (!meta) return true;
    resumePipeline(meta.pipeline);
    const sourceTrack = liveAudioTrack(meta.source);
    return Boolean(sourceTrack && sourceTrack.enabled !== false && !sourceTrack.muted);
  }

  function inLateJoinGrace() {
    return state.lateJoinGraceUntil && Date.now() < state.lateJoinGraceUntil;
  }

  function trackNeedsRefresh(track) {
    if (!track || track.kind !== 'audio') return true;
    if (track.readyState === 'ended' || track.enabled === false) return true;
    if (track.muted && !inLateJoinGrace()) return true;
    if (!state.processedTracks.has(track)) return true;
    return !processedSourceIsLive(track);
  }

  function rebuildProcessedTrack(track) {
    const meta = state.processedMeta.get(track);
    const sourceTrack = liveAudioTrack(meta?.source);
    if (!sourceTrack) return track;
    try {
      const rebuiltStream = build(new MediaStream([sourceTrack]), state.config);
      return liveAudioTrack(rebuiltStream) || track;
    } catch (_) {
      return track;
    }
  }

  function cloneForSender(track) {
    const liveTrack = track?.readyState === 'ended' ? rebuildProcessedTrack(track) : track;
    if (!liveTrack || liveTrack.readyState === 'ended' || typeof liveTrack.clone !== 'function') return liveTrack;
    try {
      const clone = liveTrack.clone();
      state.processedTracks.add(clone);
      const meta = state.processedMeta.get(liveTrack);
      if (meta) state.processedMeta.set(clone, meta);
      return clone;
    } catch (_) {
      return liveTrack;
    }
  }

  function processAudioTrack(track, forSender = false) {
    if (!track || track.kind !== 'audio') return track;
    if (state.processedTracks.has(track)) {
      const nextTrack = track.readyState === 'ended' ? rebuildProcessedTrack(track) : track;
      return forSender ? cloneForSender(nextTrack) : nextTrack;
    }

    const existing = state.trackMap.get(track);
    if (existing) {
      const nextTrack = existing.readyState === 'ended' ? rebuildProcessedTrack(existing) : existing;
      if (nextTrack && nextTrack !== existing && nextTrack.readyState !== 'ended') state.trackMap.set(track, nextTrack);
      if (nextTrack && nextTrack.readyState !== 'ended') return forSender ? cloneForSender(nextTrack) : nextTrack;
    }

    const processedStream = build(new MediaStream([track]), state.config);
    const processedTrack = liveAudioTrack(processedStream) || track;
    if (processedTrack !== track) {
      state.processedTracks.add(processedTrack);
      state.trackMap.set(track, processedTrack);
      track.addEventListener('ended', () => {
        try { processedTrack.stop(); } catch (_) {}
      }, { once: true });
    }
    return forSender ? cloneForSender(processedTrack) : processedTrack;
  }

  function enhanceAudioSdp(sdp) {
    if (typeof sdp !== 'string' || !sdp.includes('m=audio')) return sdp;
    let next = sdp;
    next = next.replace(/a=fmtp:111 ([^\r\n]*)/g, (line, params) => {
      const additions = ['maxaveragebitrate=640000', 'stereo=0', 'sprop-stereo=0', 'useinbandfec=1', 'usedtx=0'];
      const merged = params || '';
      const suffix = additions.filter((item) => !new RegExp(`(^|;)\\s*${item.split('=')[0]}=`, 'i').test(merged));
      return suffix.length ? `${line};${suffix.join(';')}` : line;
    });
    next = next.replace(/b=AS:\d+/g, 'b=AS:640').replace(/b=TIAS:\d+/g, 'b=TIAS:640000');
    if (!/b=AS:640/.test(next)) next = next.replace(/(m=audio[^\r\n]*(?:\r?\n)c=IN[^\r\n]*)/, '$1\r\nb=AS:640');
    if (!/b=TIAS:640000/.test(next)) next = next.replace(/(b=AS:640)/, '$1\r\nb=TIAS:640000');
    return next;
  }

  function cloneDescriptionWithSdp(desc, sdp) {
    if (!desc || typeof desc !== 'object' || !sdp || sdp === desc.sdp) return desc;
    try {
      return new RTCSessionDescription({ type: desc.type, sdp });
    } catch (_) {
      try { return { ...desc, sdp }; } catch (_) { return desc; }
    }
  }

  function tuneAudioSender(sender) {
    if (!sender || typeof sender.getParameters !== 'function' || typeof sender.setParameters !== 'function') return;
    // Chrome applies setParameters on its WebRTC worker. Repeating the same write
    // during every health check can monopolize that worker and delay page input.
    if (state.tunedSenders.has(sender)) return;
    try {
      const params = sender.getParameters() || {};
      const encodings = Array.isArray(params.encodings) && params.encodings.length ? params.encodings : [{}];
      params.encodings = encodings.map((encoding) => ({
        ...encoding,
        active: encoding.active !== false,
        dtx: false,
        maxBitrate: Math.max(Number(encoding.maxBitrate) || 0, 640000),
        networkPriority: 'high',
        priority: 'high'
      }));
      Promise.resolve(sender.setParameters(params)).then(() => {
        state.tunedSenders.add(sender);
      }).catch(() => {});
    } catch (_) {}
  }

  function rememberPeerConnection(pc) {
    if (!pc || state.peerConnections.has(pc)) return;
    state.peerConnections.add(pc);
    
    // LATE JOIN DETECTION: PC joins after existing connections
    if (state.peerConnections.size > 1 && !state.lateJoinDetected) {
      state.lateJoinDetected = true;
      activateAggressiveRecovery();
    }
    
    if (typeof pc.addEventListener === 'function') {
      pc.addEventListener('connectionstatechange', () => {
        if (['closed', 'failed'].includes(pc.connectionState)) state.peerConnections.delete(pc);
      });
    }
  }

  function activateAggressiveRecovery() {
    if (state.aggressiveRecoveryActive) return;
    state.aggressiveRecoveryActive = true;
    state.lateJoinGraceUntil = Date.now() + 3500;
    
    // AGGRESSIVE RECOVERY FOR ANDROID/QUETTA LATE JOINERS
    [0, 40, 80, 150, 300, 600, 1200].forEach((delay) => {
      const timer = setTimeout(() => {
        state.recoverTimers.delete(timer);
        resumeAllPipelines();
        reconcileLiveSenders();
      }, delay);
      state.recoverTimers.add(timer);
    });
    
    // Reduce sender refresh interval
    console.log('[Omni] Aggressive recovery activated for late-join scenario');
  }

  function rememberSender(sender, track, pc = null) {
    if (!sender) return null;
    let record = state.senderBySender.get(sender);
    if (!record) {
      record = { sender, track: null, pc: null, kind: null };
      state.senderBySender.set(sender, record);
      state.senderRecords.add(record);
    }
    if (track) {
      record.track = track;
      record.kind = track.kind;
    }
    if (!record.kind && sender.track?.kind) record.kind = sender.track.kind;
    if (pc) record.pc = pc;
    return record;
  }

  function recordIsClosed(record) {
    const pc = record?.pc;
    if (!pc) return false;
    return ['closed', 'failed'].includes(pc.connectionState || pc.iceConnectionState || '');
  }

  async function reacquireProcessedTrackForSender() {
    if (!state.origMD) return null;
    try {
      const constraints = normalizeConstraints(state.lastAudioConstraints || { audio: true });
      const stream = await state.origMD(constraints);
      const rawTrack = liveAudioTrack(stream);
      if (!rawTrack) return null;
      return processAudioTrack(rawTrack, true);
    } catch (_) {
      return null;
    }
  }

  async function replaceSenderTrack(sender, track) {
    if (!sender || typeof sender.replaceTrack !== 'function') return null;
    try {
      const replacement = track?.readyState === 'ended' ? await reacquireProcessedTrackForSender() : processAudioTrack(track, true);
      if (!replacement) return null;
      await sender.replaceTrack(replacement);
      tuneAudioSender(sender);
      rememberSender(sender, replacement);
      watchSenderTrack(sender, replacement);
      return replacement;
    } catch (_) {
      return null;
    }
  }

  function queueSenderRefresh(sender, track, reason = 'refresh') {
    resumeAllPipelines();
    if (!sender || state.refreshingSenders.has(sender)) return;
    state.refreshingSenders.add(sender);
    const graceDelay = inLateJoinGrace() && reason === 'mute' ? 650 : 0;
    const refreshDelay = graceDelay || (state.aggressiveRecoveryActive ? 60 : 100);
    setTimeout(() => {
      replaceSenderTrack(sender, track).finally(() => state.refreshingSenders.delete(sender));
    }, refreshDelay);
  }

  function watchSenderTrack(sender, track) {
    if (!sender || !track || track.kind !== 'audio') return;
    rememberSender(sender, track);
    if (!state.processedTracks.has(track) || state.senderWatchTracks.has(track)) return;
    state.senderWatchTracks.add(track);
    track.addEventListener('ended', () => queueSenderRefresh(sender, track, 'ended'), { once: true });
    track.addEventListener('mute', () => setTimeout(() => queueSenderRefresh(sender, track, 'mute'), inLateJoinGrace() ? 650 : 120), { passive: true });
    track.addEventListener('unmute', () => tuneAudioSender(sender), { passive: true });
  }

  function scheduleRecoveryPasses() {
    if (!state.peerConnections.size || state.recoveryScheduled) return;
    state.recoveryScheduled = true;
    for (const timer of state.recoverTimers) clearTimeout(timer);
    state.recoverTimers.clear();
    
    // ADAPTIVE RECOVERY FOR ANDROID/QUETTA
    const recoveryIntervals = state.config.isAndroidQuetta 
      ? [0, 50, 100, 200, 400, 800, 1500]
      : [0, 120, 400, 1000, 2000, 4000, 7500];
    
    recoveryIntervals.forEach((delay) => {
      const timer = setTimeout(() => {
        state.recoverTimers.delete(timer);
        resumeAllPipelines();
        reconcileLiveSenders();
        if (!state.recoverTimers.size) state.recoveryScheduled = false;
      }, delay);
      state.recoverTimers.add(timer);
    });
  }

  function reconcileLiveSenders() {
    if (!cfg().enabled) return;
    resumeAllPipelines();
    for (const pc of [...state.peerConnections]) {
      if (typeof pc.getSenders === 'function') {
        try {
          for (const sender of pc.getSenders()) {
            const track = sender?.track;
            if (track?.kind === 'audio') rememberSender(sender, track, pc);
          }
        } catch (_) {}
      }
      if (typeof pc.getTransceivers === 'function') {
        try {
          for (const transceiver of pc.getTransceivers()) {
            const sender = transceiver?.sender;
            const receiverTrack = transceiver?.receiver?.track;
            const midLooksAudio = String(transceiver?.mid || '').toLowerCase().includes('audio');
            if (sender && (sender.track?.kind === 'audio' || receiverTrack?.kind === 'audio' || midLooksAudio)) {
              const record = rememberSender(sender, sender.track || null, pc);
              if (record) record.kind = 'audio';
            }
          }
        } catch (_) {}
      }
    }

    for (const record of [...state.senderRecords]) {
      if (recordIsClosed(record)) {
        state.senderRecords.delete(record);
        continue;
      }
      const sender = record.sender;
      const track = sender?.track || record.track;
      const isAudioRecord = track?.kind === 'audio' || record.kind === 'audio';
      if (!sender || !isAudioRecord) continue;
      if (!track || trackNeedsRefresh(track)) queueSenderRefresh(sender, track);
      else {
        tuneAudioSender(sender);
        watchSenderTrack(sender, track);
      }
    }
  }

  function patchPeerConnectionPaths() {
    const PC = window.RTCPeerConnection || window.webkitRTCPeerConnection;
    if (PC?.prototype && !PC.prototype.__micMaxPcPatched) {
      const originalAddTrack = PC.prototype.addTrack;
      if (typeof originalAddTrack === 'function') {
        PC.prototype.addTrack = function addTrack(track, ...streams) {
          rememberPeerConnection(this);
          if (cfg().enabled && track?.kind === 'audio') {
            const processedTrack = processAudioTrack(track, true);
            const patchedStreams = streams.length
              ? streams.map((stream) => processedStreamFor(stream, track, processedTrack))
              : [new MediaStream([processedTrack])];
            const sender = originalAddTrack.call(this, processedTrack, ...patchedStreams);
            tuneAudioSender(sender);
            rememberSender(sender, processedTrack, this);
            if (typeof sender?.replaceTrack === 'function') watchSenderTrack(sender, processedTrack);
            return sender;
          }
          return originalAddTrack.call(this, track, ...streams);
        };
      }

      const originalAddStream = PC.prototype.addStream;
      if (typeof originalAddStream === 'function') {
        PC.prototype.addStream = function addStream(stream) {
          rememberPeerConnection(this);
          if (cfg().enabled && stream?.getAudioTracks?.().length) {
            const processedStream = build(stream, state.config);
            return originalAddStream.call(this, processedStream);
          }
          return originalAddStream.call(this, stream);
        };
      }

      const originalAddTransceiver = PC.prototype.addTransceiver;
      if (typeof originalAddTransceiver === 'function') {
        PC.prototype.addTransceiver = function addTransceiver(trackOrKind, init = undefined) {
          rememberPeerConnection(this);
          if (cfg().enabled && trackOrKind?.kind === 'audio') {
            const processedTrack = processAudioTrack(trackOrKind, true);
            const patchedInit = init?.streams
              ? { ...init, streams: init.streams.map((stream) => processedStreamFor(stream, trackOrKind, processedTrack)) }
              : init;
            const transceiver = originalAddTransceiver.call(this, processedTrack, patchedInit);
            tuneAudioSender(transceiver?.sender);
            rememberSender(transceiver?.sender, processedTrack, this);
            if (typeof transceiver?.sender?.replaceTrack === 'function') watchSenderTrack(transceiver.sender, processedTrack);
            return transceiver;
          }
          const transceiver = originalAddTransceiver.call(this, trackOrKind, init);
          if (cfg().enabled && trackOrKind === 'audio') {
            const record = rememberSender(transceiver?.sender, transceiver?.sender?.track || null, this);
            if (record) record.kind = 'audio';
            tuneAudioSender(transceiver?.sender);
            setTimeout(() => queueSenderRefresh(transceiver?.sender, transceiver?.sender?.track || null), 0);
          }
          return transceiver;
        };
      }

      const originalCreateOffer = PC.prototype.createOffer;
      if (typeof originalCreateOffer === 'function') {
        PC.prototype.createOffer = function createOffer(...args) {
          rememberPeerConnection(this);
          return originalCreateOffer.apply(this, args).then((offer) => cloneDescriptionWithSdp(offer, enhanceAudioSdp(offer?.sdp)));
        };
      }

      const originalCreateAnswer = PC.prototype.createAnswer;
      if (typeof originalCreateAnswer === 'function') {
        PC.prototype.createAnswer = function createAnswer(...args) {
          rememberPeerConnection(this);
          return originalCreateAnswer.apply(this, args).then((answer) => cloneDescriptionWithSdp(answer, enhanceAudioSdp(answer?.sdp)));
        };
      }

      const originalSetLocalDescription = PC.prototype.setLocalDescription;
      if (typeof originalSetLocalDescription === 'function') {
        PC.prototype.setLocalDescription = function setLocalDescription(desc) {
          rememberPeerConnection(this);
          const patched = cloneDescriptionWithSdp(desc, enhanceAudioSdp(desc?.sdp));
          return originalSetLocalDescription.call(this, patched);
        };
      }

      const originalSetRemoteDescription = PC.prototype.setRemoteDescription;
      if (typeof originalSetRemoteDescription === 'function') {
        PC.prototype.setRemoteDescription = function setRemoteDescription(desc) {
          rememberPeerConnection(this);
          const patched = cloneDescriptionWithSdp(desc, enhanceAudioSdp(desc?.sdp));
          const result = originalSetRemoteDescription.call(this, patched);
          Promise.resolve(result).then(scheduleRecoveryPasses).catch(() => {});
          return result;
        };
      }

      PC.prototype.__micMaxPcPatched = true;
    }

    const Sender = window.RTCRtpSender;
    if (Sender?.prototype && !Sender.prototype.__micMaxSenderPatched) {
      const originalReplaceTrack = Sender.prototype.replaceTrack;
      if (typeof originalReplaceTrack === 'function') {
        Sender.prototype.replaceTrack = function replaceTrack(track) {
          const currentKind = this.track?.kind;
          const shouldProcess = cfg().enabled && (track?.kind === 'audio' || (!track && currentKind === 'audio'));
          if (shouldProcess && !track) {
            const record = rememberSender(this, this.track || null);
            if (record) record.kind = 'audio';
            queueSenderRefresh(this, this.track || null);
          }
          const nextTrack = shouldProcess && track?.kind === 'audio' ? processAudioTrack(track, true) : track;
          const result = originalReplaceTrack.call(this, nextTrack);
          if (nextTrack?.kind === 'audio') {
            rememberSender(this, nextTrack);
            Promise.resolve(result).then(() => {
              tuneAudioSender(this);
              watchSenderTrack(this, nextTrack);
            }).catch(() => {});
          }
          return result;
        };
      }
      Sender.prototype.__micMaxSenderPatched = true;
    }
  }

  async function getStreamWithFallback(orig, constraints, ctx) {
    try {
      return await orig.call(ctx, normalizeConstraints(constraints));
    } catch (_) {
      return orig.call(ctx, constraints);
    }
  }

  async function wrapped(orig, constraints, ctx) {
    if (wantsAudio(constraints)) state.lastAudioConstraints = constraints || { audio: true };
    if (!cfg().enabled) return orig.call(ctx, constraints);
    return getStreamWithFallback(orig, constraints, ctx).then((stream) => {
      if (!stream || !stream.getAudioTracks().length) return stream;
      return build(stream, state.config);
    });
  }

  // Main hooks
  if (navigator.mediaDevices?.getUserMedia) {
    state.origMD = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function getUserMedia(constraints) {
      return wrapped(state.origMD, constraints, navigator.mediaDevices);
    };
  }

  if (navigator.getUserMedia) {
    state.origLegacy = navigator.getUserMedia.bind(navigator);
    navigator.getUserMedia = (constraints, ok, fail) => {
      wrapped(state.origLegacy, constraints, navigator).then(ok).catch((err) => fail && fail(err));
    };
  }

  patchTrackConstraints();

  window.addEventListener('message', (event) => {
    if (event.source !== window || !event.data || event.data.type !== MSG_CFG) return;
    state.config = cfg(event.data.payload);
    updateAllPipelines(state.config);
    scheduleRecoveryPasses();
  });

  // Do not run WebRTC recovery for every click or touch. In current Chrome,
  // pointer interaction is on the same event loop as the page UI, so those
  // synchronous sender checks make call controls and dialogs feel unclickable.
  ['focus', 'pageshow', 'online'].forEach((type) => {
    window.addEventListener(type, scheduleRecoveryPasses, { passive: true });
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRecoveryPasses();
  });

  // Keep a lightweight fallback health check, rather than continuously writing
  // sender parameters at the initial 150 ms configuration cadence.
  setInterval(() => {
    enforceAllSourceConstraints();
    resumeAllPipelines();
    reconcileLiveSenders();
  }, 1000);
  window.postMessage({ type: 'MIC_MAXIMIZER_READY' }, '*');
})();
