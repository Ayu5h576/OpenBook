// Web Audio API Synthesizer for cozy Reading Room ambient sounds and page turns

class AmbientAudioEngine {
  private ctx: AudioContext | null = null;
  private rainNode: AudioNode | null = null;
  private fireplaceNode: AudioNode | null = null;
  private isRunning: boolean = false;
  private currentSound: 'none' | 'rain' | 'fireplace' | 'library' | 'cafe' = 'none';

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setSound(sound: 'none' | 'rain' | 'fireplace' | 'library' | 'cafe', volume: number = 0.5) {
    this.initCtx();
    if (!this.ctx) return;

    this.stopAll();
    this.currentSound = sound;

    if (sound === 'none') return;

    if (sound === 'rain') {
      this.startRain(volume);
    } else if (sound === 'fireplace') {
      this.startFireplace(volume);
    } else if (sound === 'library' || sound === 'cafe') {
      // Warm layered pink noise + soft low pass murmur
      this.startRain(volume * 0.4);
      this.startFireplace(volume * 0.3);
    }
  }

  private startRain(volume: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Generate brown noise for warm rain
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5; // Gain adjustment
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    // Filter to soft rain sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.25, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start();
    this.rainNode = noise;
  }

  private startFireplace(volume: number) {
    if (!this.ctx) return;
    // Low rumble + crackle noise generator
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      // Crackle spikes
      const isCrackle = Math.random() > 0.998;
      data[i] = isCrackle ? (Math.random() * 2 - 1) * 0.8 : (Math.random() * 0.05 - 0.025);
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(volume * 0.3, this.ctx.currentTime);

    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.ctx.destination);

    noise.start();
    this.fireplaceNode = noise;
  }

  public stopAll() {
    if (this.rainNode) {
      try { (this.rainNode as any).stop(); } catch {}
      this.rainNode = null;
    }
    if (this.fireplaceNode) {
      try { (this.fireplaceNode as any).stop(); } catch {}
      this.fireplaceNode = null;
    }
  }

  public playPageTurnSound() {
    this.initCtx();
    if (!this.ctx) return;

    // Short paper rustle sound
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.12);
  }
}

export const ambientEngine = new AmbientAudioEngine();
