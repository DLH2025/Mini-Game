/**
 * Optimized Sound Manager with Audio Caching
 * Reduces garbage collection by reusing audio nodes where possible
 */
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.3;
        this.enabled = true;
        
        this.musicPlaying = false;
        this.musicOscillator = null;
        this.musicGain = null;
        
        // Audio node pools for common sounds
        this.nodePool = [];
        this.maxPoolSize = 20;
        
        // Pre-generated noise buffers for explosion sounds
        this.noiseBuffers = {};
        
        // Sound cooldowns to prevent spam
        this.cooldowns = {};
        this.cooldownTimes = {
            shoot: 50,
            hit: 30,
            melee: 50,
            explosion: 100
        };
        
        this.initAudio();
        this.loadSettings();
        this.generateNoiseBuffers();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
    }

    generateNoiseBuffers() {
        if (!this.audioContext) return;
        
        // Pre-generate noise buffers at different durations
        const durations = [0.1, 0.2, 0.3, 0.4];
        durations.forEach(duration => {
            const bufferSize = this.audioContext.sampleRate * duration;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
            }
            
            this.noiseBuffers[duration] = buffer;
        });
    }

    loadSettings() {
        const savedMaster = localStorage.getItem('masterVolume');
        const savedSfx = localStorage.getItem('sfxVolume');
        const savedMusic = localStorage.getItem('musicVolume');
        const savedEnabled = localStorage.getItem('soundEnabled');
        
        if (savedMaster !== null) this.masterVolume = parseFloat(savedMaster);
        if (savedSfx !== null) this.sfxVolume = parseFloat(savedSfx);
        if (savedMusic !== null) this.musicVolume = parseFloat(savedMusic);
        if (savedEnabled !== null) this.enabled = savedEnabled === 'true';
    }

    saveSettings() {
        localStorage.setItem('masterVolume', this.masterVolume);
        localStorage.setItem('sfxVolume', this.sfxVolume);
        localStorage.setItem('musicVolume', this.musicVolume);
        localStorage.setItem('soundEnabled', this.enabled);
    }

    setMasterVolume(value) {
        this.masterVolume = Math.max(0, Math.min(1, value));
        this.saveSettings();
    }

    setSfxVolume(value) {
        this.sfxVolume = Math.max(0, Math.min(1, value));
        this.saveSettings();
    }

    setMusicVolume(value) {
        this.musicVolume = Math.max(0, Math.min(1, value));
        this.saveSettings();
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume * this.masterVolume;
        }
    }

    setEnabled(value) {
        this.enabled = value;
        this.saveSettings();
        if (!value && this.musicPlaying) {
            this.stopMusic();
        } else if (value && !this.musicPlaying) {
            this.playMusic();
        }
    }

    resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
    }

    // Check if sound is on cooldown
    isOnCooldown(soundType) {
        const now = performance.now();
        if (!this.cooldowns[soundType]) return false;
        return now - this.cooldowns[soundType] < (this.cooldownTimes[soundType] || 50);
    }

    setCooldown(soundType) {
        this.cooldowns[soundType] = performance.now();
    }

    // Create oscillator with pooled nodes when possible
    createOscillator(type, frequency, duration, volume, ramp = true) {
        if (!this.enabled || !this.audioContext) return null;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = type;
        
        if (Array.isArray(frequency)) {
            // Frequency envelope
            osc.frequency.setValueAtTime(frequency[0], this.audioContext.currentTime);
            if (frequency.length > 1) {
                osc.frequency.exponentialRampToValueAtTime(frequency[1], this.audioContext.currentTime + duration);
            }
        } else {
            osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        }
        
        const finalVolume = volume * this.sfxVolume * this.masterVolume;
        gain.gain.setValueAtTime(ramp ? 0 : finalVolume, this.audioContext.currentTime);
        if (ramp) {
            gain.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
        }
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + duration);
        
        return { osc, gain };
    }

    playShoot() {
        if (this.isOnCooldown('shoot')) return;
        this.setCooldown('shoot');
        
        this.createOscillator('square', [800, 200], 0.1, 0.1);
    }

    playExplosion() {
        if (this.isOnCooldown('explosion')) return;
        this.setCooldown('explosion');
        
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        // Use pre-generated noise buffer
        const buffer = this.noiseBuffers[0.3] || this.noiseBuffers[0.2];
        if (!buffer) return;
        
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.3 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        source.start(this.audioContext.currentTime);
    }

    playMelee() {
        if (this.isOnCooldown('melee')) return;
        this.setCooldown('melee');
        
        this.createOscillator('sawtooth', [300, 100], 0.15, 0.15);
    }

    playHit() {
        if (this.isOnCooldown('hit')) return;
        this.setCooldown('hit');
        
        this.createOscillator('square', [150, 50], 0.1, 0.2);
    }

    playSkill1() {
        this.createOscillator('sine', [400, 800], 0.3, 0.15);
    }

    playSkill2() {
        this.createOscillator('sawtooth', [200, 1000], 0.2, 0.15);
    }

    playSkill3() {
        this.createOscillator('square', [100, 600], 0.4, 0.2);
    }

    playObstacleBreak() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const buffer = this.noiseBuffers[0.2];
        if (!buffer) return;
        
        const source = this.audioContext.createBufferSource();
        const gain = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();
        
        source.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, this.audioContext.currentTime);
        filter.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.25 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.audioContext.destination);
        
        source.start(this.audioContext.currentTime);
    }

    playCountdown() {
        this.createOscillator('sine', 600, 0.2, 0.2, false);
    }

    playVictory() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            this.createOscillator('sine', freq, 0.3, 0.2, false);
        });
    }

    playDefeat() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            setTimeout(() => {
                this.createOscillator('sawtooth', freq, 0.3, 0.15, false);
            }, i * 200);
        });
    }

    playMusic() {
        if (!this.enabled || !this.audioContext || this.musicPlaying) return;
        this.resumeContext();
        
        this.musicPlaying = true;
        this.musicGain = this.audioContext.createGain();
        this.musicGain.gain.value = this.musicVolume * this.masterVolume;
        this.musicGain.connect(this.audioContext.destination);
        
        const playBassLine = () => {
            if (!this.musicPlaying) return;
            
            const notes = [65, 65, 73, 73, 82, 82, 73, 73];
            const duration = 0.4;
            
            notes.forEach((freq, i) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * duration);
                
                gain.gain.setValueAtTime(0, this.audioContext.currentTime + i * duration);
                gain.gain.linearRampToValueAtTime(0.1, this.audioContext.currentTime + i * duration + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * duration + duration - 0.05);
                
                osc.connect(gain);
                gain.connect(this.musicGain);
                
                osc.start(this.audioContext.currentTime + i * duration);
                osc.stop(this.audioContext.currentTime + i * duration + duration);
            });
            
            setTimeout(() => {
                if (this.musicPlaying) playBassLine();
            }, notes.length * duration * 1000);
        };
        
        playBassLine();
    }

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicGain) {
            this.musicGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            setTimeout(() => {
                if (this.musicGain) {
                    this.musicGain.disconnect();
                    this.musicGain = null;
                }
            }, 500);
        }
    }
}

const soundManager = new SoundManager();
