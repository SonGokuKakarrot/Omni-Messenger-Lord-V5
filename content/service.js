(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime || !EXT?.storage?.local) return;

  const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;
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
    senderRefreshMs: 200
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

  // Periodic sync and heartbeat
  setInterval(() => {
    if (hookReady) {
      sync();
      heartbeat();
    }
  }, 8000);

  // Initial sync attempt
  setTimeout(sync, 1500);

  console.log('[Omni Messenger Lord V4 ULTRA] content service loaded');
})();
