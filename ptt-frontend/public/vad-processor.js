
class VadProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    // --- SETTINGS ---
    this.minThreshold = 0.015;   // Catch whispers (below this, VAD is OFF)
    this.sensitivity = 2.5;      // Voice must be louder than noise to OPEN
    this.hysteresis = 0.8;       // Sustain multiplier: % of threshold to STAY open

    this.echoRatio = 0.50;       // Dynamic Echo Threshold (% of recent peak)

    // Timings (in blocks of 128 samples @ 48kHz => ~2.6ms per block)
    this.holdTime = 100;         // Hold open for ~260ms after speaking stops (prevents chopped endings)
    this.fadeSpeed = 0.2;        // How fast to fade audio in/out (0.0 to 1.0). Prevents clicking.

    // --- INTERNAL STATE ---
    this.noiseFloor = 0.005;
    this.voicePeak = 0.02;
    this.prevVolume = 0;

    this.holdCounter = 0;
    this.isOpen = false;         // Logic State (Open/Closed)
    this.envelope = 0.0;         // Audio State (0.0 to 1.0) - For Soft Gating

    this.alpha = 0.05;           // Adaptation rate
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const output = outputs[0];

    if (!input || !input.length) return true;

    const inputChannel = input[0];
    const outputChannel = output[0];

    // 1. Calculate RMS Volume (Root Mean Square)
    let sum = 0;
    for (let i = 0; i < inputChannel.length; i++) {
      sum += inputChannel[i] * inputChannel[i];
    }
    const currentRms = Math.sqrt(sum / inputChannel.length);

    // 2. ADAPTIVE NOISE FLOOR **Cannot exceed 50% of voice peak (prevents runaway adaptation)
    if (!this.isOpen && this.envelope < 0.01) {
      this.noiseFloor = (this.noiseFloor * (1 - this.alpha)) + (currentRms * this.alpha);
      this.noiseFloor = Math.min(Math.max(0.002, this.noiseFloor), this.voicePeak * 0.5);

      // Decay voice peak slowly during silence
      this.voicePeak *= 0.9995;
      this.voicePeak = Math.max(this.voicePeak, this.noiseFloor * 3);
    } else {
      // Track Peak while speaking
      if (currentRms > this.voicePeak) {
        this.voicePeak = currentRms;
      }
    }

    // 3. TRANSIENT DETECTION
    // "Close" sound has sharp attack. "Far" sound (echo) is smeared.
    const attackSpeed = currentRms - this.prevVolume;
    this.prevVolume = currentRms;
    const isSudden = attackSpeed > 0.002;

    // 4. TRIGGER LOGIC (HYSTERESIS)
    // A. Open Threshold: Strict. Needs to be loud + sudden.
    // B. Sustain Threshold: Relaxed. Just needs to be reasonably loud.
    const baseThreshold = Math.max(
      this.noiseFloor * this.sensitivity, // Standard SNR
      this.voicePeak * this.echoRatio     // Echo Rejection
    );

    // Safety: Never go below absolute minimum
    const openThreshold = Math.max(this.minThreshold, baseThreshold);
    const sustainThreshold = openThreshold * this.hysteresis; 

    if (this.isOpen) {
      // To stay open, need to be above the lower 'sustainThreshold'
      // Do NOT check 'isSudden' here (vowels are smooth, not sudden)
      if (currentRms > sustainThreshold) {
        this.holdCounter = this.holdTime; // Reset timer
      } else {
        if (this.holdCounter > 0) {
          this.holdCounter--;
        } else {
          this.isOpen = false; // Time to close
        }
      }
    } else {
      // STATE: CLOSED
      // To open, breach the higher 'openThreshold' AND be sudden
      if (currentRms > openThreshold && isSudden) {
        this.isOpen = true;
        this.holdCounter = this.holdTime;
      }
    }

    // 5. SOFT GATE (THE DE-CLICKER)
    // Instead of snapping to 0 or 1, move 'this.envelope' towards target
    const targetEnvelope = this.isOpen ? 1.0 : 0.0;

    // Move envelope towards target
    if (this.envelope < targetEnvelope) {
      this.envelope += this.fadeSpeed; // Attack (Fade In)
      if (this.envelope > 1.0) this.envelope = 1.0;
    } else if (this.envelope > targetEnvelope) {
      this.envelope -= this.fadeSpeed; // Release (Fade Out)
      if (this.envelope < 0.0) this.envelope = 0.0;
    }

    // 6. APPLY ENVELOPE
    for (let i = 0; i < outputChannel.length; i++) {
      outputChannel[i] = inputChannel[i] * this.envelope;
    }

    // 7. SEND DEBUG DATA
    // Send threshold used based on state (Open vs Closed) for accurate visual
    const displayThreshold = this.isOpen ? sustainThreshold : openThreshold;

    if (currentTime % 0.05 < 0.003) {
      this.port.postMessage({
        volume: currentRms,
        threshold: displayThreshold,
        isOpen: this.isOpen
      });
    }

    return true;
  }
}

registerProcessor('vad-processor', VadProcessor);