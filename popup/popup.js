const EXT = globalThis.browser ?? globalThis.chrome;
const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;

// DEFAULTS tuned for the V5 popup controls
const DEFAULTS = {
  profileVersion: 10,
  enabled: true,
  gainDb: 18.0,
  loudness: 1.1,
  maxBoost: 12,
  drive: 0.5,
  saturationCurveIntensity: 1.0,
  thresholdDb: -38,
  ratio: 6,
  attack: 0.003,
  release: 0.015,
  limiterDb: -1.0,
  presenceDb: 5,
  presencePeakDb: 4,
  presencePeakFreq: 4500,
  presencePeakQ: 3.0,
  lowShelfDb: 4,
  highShelfDb: 3,
  sustain: true,
  sustainTargetDb: -4,
  sustainMaxGain: 12,
  forceRawMic: false,
  reverbEnabled: false,
  reverbDelay: 0.08,
  reverbFeedback: 0.55,
  reverbWet: 0.35,
  keepAlive: false,
  keepAliveGain: 0.004,
  senderRefreshMs: 600
};

// PRESETS ported from the V5 preset definitions (kept as-is where helpful)
const PRESETS = {
  royal: {
    profileVersion: 9,
    enabled: true,
    gainDb: 65.0,
    thresholdDb: -50,
    knee: 15,
    ratio: 8,
    attack: 0.0005,
    release: 0.04,
    lowShelfDb: 8,
    presenceDb: 12,
    highShelfDb: 10,
    presencePeakDb: 8,
    presencePeakFreq: 5000,
    presencePeakQ: 1.5,
    limiterDb: -1.5,
    drive: 0.8,
    loudness: 1.0,
    saturationCurveIntensity: 0.8,
    maxBoost: 50000,
    sustain: true,
    sustainTargetDb: 5,
    sustainMaxGain: 80,
    forceRawMic: true,
    reverbEnabled: false,
    reverbDelay: 0.02,
    reverbFeedback: 0.2,
    reverbWet: 0.1,
    keepAlive: true,
    keepAliveGain: 0.0008,
    senderRefreshMs: 300
  },
  lord: {
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
    presencePeakDb: 26,
    presencePeakFreq: 5000,
    presencePeakQ: 2.1,
    limiterDb: -0.2,
    drive: 2.3,
    loudness: 1.15,
    saturationCurveIntensity: 1.8,
    maxBoost: 200000,
    sustain: true,
    sustainTargetDb: 7,
    sustainMaxGain: 150,
    forceRawMic: true,
    reverbEnabled: true,
    reverbDelay: 0.05,
    reverbFeedback: 0.4,
    reverbWet: 0.2,
    keepAlive: true,
    keepAliveGain: 0.0015,
    senderRefreshMs: 200
  },
  ultraQuetta: {
    profileVersion: 9,
    enabled: true,
    gainDb: 112.0,
    thresholdDb: -72,
    knee: 20,
    ratio: 20,
    attack: 0.00005,
    release: 0.024,
    lowShelfDb: 18,
    presenceDb: 32,
    highShelfDb: 22,
    presencePeakDb: 28,
    presencePeakFreq: 5000,
    presencePeakQ: 2.2,
    limiterDb: -0.1,
    drive: 2.8,
    loudness: 1.25,
    saturationCurveIntensity: 2.1,
    maxBoost: 225000,
    sustain: true,
    sustainTargetDb: 8,
    sustainMaxGain: 165,
    forceRawMic: true,
    reverbEnabled: true,
    reverbDelay: 0.08,
    reverbFeedback: 0.55,
    reverbWet: 0.35,
    keepAlive: true,
    keepAliveGain: 0.003,
    senderRefreshMs: 150
  }
};

// Build ids from DEFAULTS so we only reference inputs that exist
const ids = Object.keys(DEFAULTS).filter((id) => id !== 'profileVersion' && id !== 'senderRefreshMs');
const STORAGE_DEBOUNCE_MS = 120;
let pendingConfig = null;
let pendingSaveTimer = 0;

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

function storageSet(value) {
  if (HAS_PROMISE_API) return EXT.storage.local.set(value);
  return new Promise((resolve) => {
    try {
      EXT.storage.local.set(value, () => resolve(!EXT.runtime?.lastError));
    } catch (_) {
      resolve(false);
    }
  });
}

function sendMessage(message) {
  if (HAS_PROMISE_API) return EXT.runtime.sendMessage(message);
  return new Promise((resolve) => {
    try {
      EXT.runtime.sendMessage(message, (res) => {
        if (EXT.runtime?.lastError) resolve(null);
        else resolve(res || null);
      });
    } catch (_) {
      resolve(null);
    }
  });
}

function numberText(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  if (Math.abs(n) < 0.01 && n !== 0) return n.toFixed(5);
  if (Math.abs(n) < 10 && !Number.isInteger(n)) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  return String(n);
}

function updateLabels() {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    const label = document.getElementById(`${id}Val`);
    if (label && el?.type !== 'checkbox') label.textContent = numberText(el.value);
  });
}

function presetMatches(config, preset) {
  return Object.entries(preset).every(([key, value]) => Number(config[key]) === Number(value) || config[key] === value);
}

function activePreset(config) {
  if (presetMatches(config, PRESETS.royal)) return 'royal';
  if (presetMatches(config, PRESETS.lord)) return 'lord';
  if (presetMatches(config, PRESETS.ultraQuetta)) return 'ultraQuetta';
  return 'custom';
}

function updatePresetState(config) {
  const active = activePreset(config);
  document.body.dataset.theme = active;
  const royalButton = document.getElementById('royalPreset');
  const lordButton = document.getElementById('lordPreset');
  const ultraButton = document.getElementById('ultraQuettaPreset');
  royalButton?.classList.toggle('active', active === 'royal');
  royalButton?.setAttribute('aria-pressed', String(active === 'royal'));
  lordButton?.classList.toggle('active', active === 'lord');
  lordButton?.setAttribute('aria-pressed', String(active === 'lord'));
  ultraButton?.classList.toggle('active', active === 'ultraQuetta');
  ultraButton?.setAttribute('aria-pressed', String(active === 'ultraQuetta'));
}

function applyToControls(config) {
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = Boolean(config[id]);
    else el.value = config[id];
  });
  updateLabels();
  updatePresetState(config);
}

async function readConfig() {
  const stored = await storageGet('micMaximizerConfig');
  const config = stored.micMaximizerConfig || {};
  if (config.profileVersion !== DEFAULTS.profileVersion) return { ...DEFAULTS };
  return { ...DEFAULTS, ...config };
}

async function persistConfig(config) {
  const merged = { ...DEFAULTS, ...config, profileVersion: DEFAULTS.profileVersion };
  pendingConfig = merged;
  await storageSet({ micMaximizerConfig: merged });
  if (pendingConfig === merged) pendingConfig = null;
  return merged;
}

async function saveConfig(config, { render = true } = {}) {
  clearTimeout(pendingSaveTimer);
  pendingSaveTimer = 0;
  const merged = await persistConfig(config);
  if (render) applyToControls(merged);
  return merged;
}

function queueSave(config) {
  clearTimeout(pendingSaveTimer);
  pendingConfig = { ...DEFAULTS, ...config, profileVersion: DEFAULTS.profileVersion };
  pendingSaveTimer = setTimeout(() => {
    pendingSaveTimer = 0;
    persistConfig(pendingConfig).catch(() => {});
  }, STORAGE_DEBOUNCE_MS);
}

async function currentConfig() {
  return pendingConfig ? { ...DEFAULTS, ...pendingConfig } : readConfig();
}

async function onControlInput(id, el, immediate = false) {
  const merged = await currentConfig();
  merged[id] = el.type === 'checkbox' ? el.checked : Number(el.value);
  updateLabels();
  updatePresetState(merged);
  if (immediate) await saveConfig(merged, { render: false });
  else queueSave(merged);
}

async function init() {
  if (!EXT?.storage?.local) return;
  applyToControls(await readConfig());
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => onControlInput(id, el));
    el.addEventListener('change', () => onControlInput(id, el, true));
  });
  document.getElementById('royalPreset')?.addEventListener('click', () => saveConfig(PRESETS.royal));
  document.getElementById('lordPreset')?.addEventListener('click', () => saveConfig(PRESETS.lord));
  document.getElementById('ultraQuettaPreset')?.addEventListener('click', () => saveConfig(PRESETS.ultraQuetta));
}

async function refreshHookStatus() {
  const el = document.getElementById('hookStatus');
  if (!el || !EXT?.runtime) return;
  try {
    const status = await sendMessage({ type: 'MICMAX_STATUS_REQUEST' });
    const ageMs = status?.lastHeartbeat ? Date.now() - status.lastHeartbeat : Infinity;
    if (status?.ok && ageMs < 12000) {
      el.textContent = '✅ Hook Active | Current Facebook, Messenger, or Instagram tab is injected';
      el.className = 'status ok';
    } else if (status?.reason === 'not_target_page') {
      el.textContent = '⚠️ Not active here. Open a Facebook, Messenger, or Instagram tab.';
      el.className = 'status warn';
    } else {
      el.textContent = '⚠️ Waiting for this call page hook to load...';
      el.className = 'status warn';
    }
  } catch (_) {
    el.textContent = '⚠️ Open Messenger/Instagram call to activate';
    el.className = 'status warn';
  }
}

init();
setInterval(refreshHookStatus, 3000);
refreshHookStatus();
