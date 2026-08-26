(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime || !EXT?.storage?.local) return;

  const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;
  const DEFAULTS = {
    profileVersion: 10,
    enabled: true,
    gainDb: 18.0,
    thresholdDb: -38,
    knee: 16,
    ratio: 6,
    attack: 0.003,
    release: 0.1,
    lowShelfDb: 4,
    presenceDb: 5,
    highShelfDb: 3,
    presencePeakFreq: 5000,
    presencePeakQ: 1.5,
    presencePeakDb: 4,
    limiterDb: -1,
    drive: 0.5,
    loudness: 1.1,
    maxBoost: 12,
    saturationCurveIntensity: 1,
    sustain: true,
    sustainTargetDb: -4,
    sustainMaxGain: 12,
    forceRawMic: false,
    reverbEnabled: false,
    reverbDelay: 0.02,
    reverbFeedback: 0,
    reverbWet: 0,
    keepAlive: false,
    keepAliveGain: 0,
    senderRefreshMs: 600
  };
  const MSG_CFG = 'MIC_MAXIMIZER_CONFIG';
  let hookReady = false;

  function storageGet(key) {
    if (HAS_PROMISE_API) return EXT.storage.local.get(key);
    return new Promise((resolve) => {
      try {
        EXT.storage.local.get(key, (res) => {
          if (EXT.runtime?.lastError) resolve({});
          else resolve(res || {});
        });
      } catch (_) {
        resolve({});
      }
    });
  }

  function sendMessage(message) {
    if (HAS_PROMISE_API) return EXT.runtime.sendMessage(message);
    return new Promise((resolve) => {
      try {
        EXT.runtime.sendMessage(message, () => resolve(!EXT.runtime?.lastError));
      } catch (_) {
        resolve(false);
      }
    });
  }

  function pushConfig(config) {
    window.postMessage({ type: MSG_CFG, payload: config }, '*');
  }

  async function loadConfig() {
    try {
      const res = await storageGet('micMaximizerConfig');
      const stored = res.micMaximizerConfig || {};
      if (stored.profileVersion !== DEFAULTS.profileVersion) return { ...DEFAULTS };
      return { ...DEFAULTS, ...stored };
    } catch (_) {
      return { ...DEFAULTS };
    }
  }

  async function sync() {
    pushConfig(await loadConfig());
  }

  function heartbeat() {
    if (!hookReady) return;
    sendMessage({ type: 'MICMAX_HEARTBEAT' }).catch(() => {});
  }

  window.addEventListener('message', (event) => {
    if (event.source === window && event.data?.type === 'MIC_MAXIMIZER_READY') {
      hookReady = true;
      sync();
      heartbeat();
    }
  });

  EXT.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.micMaximizerConfig) {
      sync();
    }
  });

  // Keep the background status fresh without repeatedly reconfiguring the page
  // injector. A config push schedules WebRTC recovery, so it should happen only
  // when the injector becomes ready or storage actually changes.
  setInterval(() => {
    heartbeat();
  }, 8000);

  // Initial sync attempt
  setTimeout(sync, 1500);

  console.log('[Omni Messenger Lord V4 ULTRA] content service loaded');
})();
