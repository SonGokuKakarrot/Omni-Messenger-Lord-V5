// Advanced Noise Suppression Module for Omni Messenger
// Integrates spectral subtraction, voice activity detection, and adaptive noise gating
// Seamlessly works with the main audio processing pipeline

class NoiseSuppressor {
  constructor(audioContext, analyser, sampleRate = 48000) {
    this.ctx = audioContext;
    this.analyser = analyser;
    this.sampleRate = sampleRate;

    // Voice Activity Detection (VAD) parameters
    this.voiceThresholdDb = -35;
    this.noiseFloorDb = -70;
    this.voiceConfidence = 0;
    this.smoothingFactor = 0.15;

    // Noise gate parameters - optimized for real-time performance
    this.gateThreshold = -45;
    this.gateAttack = 0.005;      // 5ms attack
    this.gateRelease = 0.1;       // 100ms release
    this.gateGain = 1.0;
    this.gateHistory = [];
    this.gateHistorySize = 5;

    // Spectral characteristics for voice detection (human speech ranges)
    this.voiceFreqRanges = [
      { min: 300, max: 1000, weight: 0.4 },   // Fundamental frequency
      { min: 1000, max: 4000, weight: 0.5 },  // Formants (most important)
      { min: 4000, max: 8000, weight: 0.1 }   // High-frequency detail
    ];

    // Adaptive noise profiling
    this.noiseProfile = null;
    this.noiseEstimate = new Uint8Array(128);
    this.calibrationCount = 0;
    this.calibrationTarget = 30;  // Calibrate with 30 frames of silence
    this.adaptationRate = 0.02;   // Slow noise profile adaptation

    // Performance optimization
    this.frequencyBinCache = null;
    this.lastProcessTime = 0;
  }

  /**
   * Calibrate noise profile from initial silent frames
   * Learns the background noise characteristics
   */
  calibrateNoiseProfile(frequencyData) {
    if (this.calibrationCount < this.calibrationTarget) {
      if (!this.noiseProfile) {
        this.noiseProfile = new Uint8Array(frequencyData.length);
      }

      // Conservative noise profile update
      for (let i = 0; i < frequencyData.length; i++) {
        this.noiseProfile[i] = Math.max(this.noiseProfile[i] || 0, frequencyData[i] * 0.8);
      }

      this.calibrationCount++;
      return false; // Still calibrating
    }
    return true; // Calibration complete
  }

  /**
   * Calculate RMS level in dB from time domain data
   */
  calculateRMSDb(timeData) {
    let sum = 0;
    for (let i = 0; i < timeData.length; i++) {
      const sample = (timeData[i] - 128) / 128;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / timeData.length);
    return 20 * Math.log10(Math.max(rms, 0.00001));
  }

  /**
   * Detect voice presence based on spectral energy distribution
   */
  detectVoiceActivity(frequencyData) {
    if (!frequencyData || frequencyData.length === 0) return 0;

    let voiceEnergy = 0;
    let totalEnergy = 0;
    const nyquist = this.sampleRate / 2;
    const binWidth = nyquist / frequencyData.length;

    // Calculate weighted energy in voice frequency ranges
    for (const range of this.voiceFreqRanges) {
      const startBin = Math.floor(range.min / binWidth);
      const endBin = Math.min(Math.ceil(range.max / binWidth), frequencyData.length);

      let rangeEnergy = 0;
      for (let i = startBin; i < endBin; i++) {
        rangeEnergy += frequencyData[i];
      }

      const avgEnergy = rangeEnergy / Math.max(1, endBin - startBin);
      voiceEnergy += avgEnergy * range.weight;
    }

    // Calculate total energy
    for (let i = 0; i < frequencyData.length; i++) {
      totalEnergy += frequencyData[i];
    }
    totalEnergy /= frequencyData.length;

    // Voice confidence based on ratio and absolute energy
    const ratio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;
    const confidence = Math.min(1, ratio * 2.5);

    // Smooth confidence to avoid rapid changes
    this.voiceConfidence = this.voiceConfidence * (1 - this.smoothingFactor) + confidence * this.smoothingFactor;

    return this.voiceConfidence;
  }

  /**
   * Adaptive noise gate with smooth attack/release
   */
  applyNoiseGate(inputLevelDb, voiceConfidence) {
    const isVoice = voiceConfidence > 0.3 || inputLevelDb > this.voiceThresholdDb;

    // Add to history for stability
    this.gateHistory.push(isVoice);
    if (this.gateHistory.length > this.gateHistorySize) {
      this.gateHistory.shift();
    }

    // Require majority vote to open/close gate
    const voiceCount = this.gateHistory.filter(v => v).length;
    const shouldOpen = voiceCount >= Math.ceil(this.gateHistorySize / 2);

    // Smooth gate gain
    const targetGain = shouldOpen ? 1.0 : 0.15; // Never fully mute to avoid artifacts
    const rate = targetGain > this.gateGain ? this.gateAttack : this.gateRelease;

    this.gateGain += (targetGain - this.gateGain) * rate * 60; // Assume ~60fps processing
    this.gateGain = Math.max(0.15, Math.min(1.0, this.gateGain));

    return this.gateGain;
  }

  /**
   * Adaptive noise floor estimation
   */
  updateNoiseFloor(inputLevelDb, voiceConfidence) {
    // Only update noise floor when voice confidence is low
    if (voiceConfidence < 0.2 && inputLevelDb < this.voiceThresholdDb) {
      this.noiseFloorDb = this.noiseFloorDb * 0.98 + inputLevelDb * 0.02;
    }
    return this.noiseFloorDb;
  }

  /**
   * Get frequency bin index for a given frequency
   */
  getFrequencyBin(frequency, dataLength) {
    const nyquist = this.sampleRate / 2;
    return Math.floor((frequency / nyquist) * dataLength);
  }

  /**
   * Spectral subtraction noise reduction
   * Returns gain reduction factor for each frequency bin
   */
  calculateSpectralGains(frequencyData, voiceConfidence) {
    const gains = new Float32Array(frequencyData.length);

    if (!this.noiseProfile || voiceConfidence > 0.7) {
      // High voice confidence - minimal suppression
      gains.fill(1.0);
      return gains;
    }

    for (let i = 0; i < frequencyData.length; i++) {
      const signal = frequencyData[i];
      const noise = this.noiseProfile[i] || 0;

      if (signal <= noise) {
        gains[i] = 0.3; // Strong suppression but not complete removal
      } else {
        const snr = signal / Math.max(noise, 1);
        gains[i] = Math.min(1.0, Math.max(0.4, 1 - 0.5 / snr));
      }
    }

    return gains;
  }

  /**
   * Process audio analysis data and return suppression parameters
   */
  process(timeData, frequencyData) {
    const now = performance.now();

    // Throttle processing to ~30fps for performance
    if (now - this.lastProcessTime < 33) {
      return {
        voiceConfidence: this.voiceConfidence,
        gateGain: this.gateGain,
        noiseFloorDb: this.noiseFloorDb,
        calibrated: this.calibrationCount >= this.calibrationTarget
      };
    }

    this.lastProcessTime = now;

    // Calculate input level
    const inputLevelDb = this.calculateRMSDb(timeData);

    // Calibrate noise profile
    const calibrated = this.calibrateNoiseProfile(frequencyData);

    // Detect voice activity
    const voiceConfidence = this.detectVoiceActivity(frequencyData);

    // Update noise floor
    const noiseFloorDb = this.updateNoiseFloor(inputLevelDb, voiceConfidence);

    // Apply noise gate
    const gateGain = this.applyNoiseGate(inputLevelDb, voiceConfidence);

    return {
      voiceConfidence,
      gateGain,
      noiseFloorDb,
      inputLevelDb,
      calibrated,
      spectralGains: calibrated ? this.calculateSpectralGains(frequencyData, voiceConfidence) : null
    };
  }

  /**
   * Create a noise gate gain node controlled by this suppressor
   */
  createNoiseGateNode() {
    const gainNode = this.ctx.createGain();
    gainNode.gain.value = 1.0;
    return gainNode;
  }

  /**
   * Update noise gate gain node based on current analysis
   */
  updateGateNode(gainNode, analysisResult) {
    if (!gainNode || !analysisResult) return;

    const now = this.ctx.currentTime;
    try {
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setTargetAtTime(analysisResult.gateGain, now, 0.01);
    } catch (_) {
      gainNode.gain.value = analysisResult.gateGain;
    }
  }

  /**
   * Reset noise profile calibration
   */
  resetCalibration() {
    this.noiseProfile = null;
    this.calibrationCount = 0;
    this.voiceConfidence = 0;
    this.gateGain = 1.0;
    this.gateHistory = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config = {}) {
    if (typeof config.voiceThresholdDb === 'number') {
      this.voiceThresholdDb = config.voiceThresholdDb;
    }
    if (typeof config.gateThreshold === 'number') {
      this.gateThreshold = config.gateThreshold;
    }
    if (typeof config.smoothingFactor === 'number') {
      this.smoothingFactor = Math.max(0.01, Math.min(0.5, config.smoothingFactor));
    }
  }

  /**
   * Get current statistics
   */
  getStats() {
    return {
      voiceConfidence: this.voiceConfidence,
      noiseFloorDb: this.noiseFloorDb,
      gateGain: this.gateGain,
      calibrated: this.calibrationCount >= this.calibrationTarget,
      calibrationProgress: Math.min(1, this.calibrationCount / this.calibrationTarget)
    };
  }
}

// Export for use in injector
if (typeof window !== 'undefined') {
  window.NoiseSuppressor = NoiseSuppressor;
}
