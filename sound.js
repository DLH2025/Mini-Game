class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.5;
        this.sfxVolume = 0.7;
        this.musicVolume = 0.3;
        this.enabled = true;
        
        this.sounds = {};
        this.musicPlaying = false;
        this.musicOscillator = null;
        this.musicGain = null;
        
        this.initAudio();
        this.loadSettings();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            this.enabled = false;
        }
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

    playShoot() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.1 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    playExplosion() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const bufferSize = this.audioContext.sampleRate * 0.3;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        
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
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.15 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.15);
    }

    playHit() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, this.audioContext.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.2 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.1);
    }

    playSkill1() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.3);
        
        gain.gain.setValueAtTime(0.15 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.3);
    }

    playSkill2() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1000, this.audioContext.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.15 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.2);
    }

    playSkill3() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(100, this.audioContext.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.2 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.4);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.4);
    }

    playObstacleBreak() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const bufferSize = this.audioContext.sampleRate * 0.2;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
        }
        
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
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, this.audioContext.currentTime);
        
        gain.gain.setValueAtTime(0.2 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
        
        osc.connect(gain);
        gain.connect(this.audioContext.destination);
        
        osc.start(this.audioContext.currentTime);
        osc.stop(this.audioContext.currentTime + 0.2);
    }

    playVictory() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const notes = [523, 659, 784, 1047];
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.15);
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime + i * 0.15);
            gain.gain.linearRampToValueAtTime(0.2 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime + i * 0.15 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.15 + 0.3);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(this.audioContext.currentTime + i * 0.15);
            osc.stop(this.audioContext.currentTime + i * 0.15 + 0.3);
        });
    }

    playDefeat() {
        if (!this.enabled || !this.audioContext) return;
        this.resumeContext();
        
        const notes = [400, 350, 300, 200];
        notes.forEach((freq, i) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, this.audioContext.currentTime + i * 0.2);
            
            gain.gain.setValueAtTime(0, this.audioContext.currentTime + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.15 * this.sfxVolume * this.masterVolume, this.audioContext.currentTime + i * 0.2 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + i * 0.2 + 0.3);
            
            osc.connect(gain);
            gain.connect(this.audioContext.destination);
            
            osc.start(this.audioContext.currentTime + i * 0.2);
            osc.stop(this.audioContext.currentTime + i * 0.2 + 0.3);
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
