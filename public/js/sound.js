// ===== Sound Manager =====
export const soundManager = {
    audioCtx: null,
    isMuted: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted && this.expressAudio) {
            this.stopExpress();
        }
        return this.isMuted;
    },

    _playAudio(src) {
        if (this.isMuted) return null;
        const audio = new Audio(src);
        audio.play().catch(e => console.warn('Audio play error:', e));
        return audio;
    },

    init() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        // Resume context if suspended (browser policy)
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    playTone(freq, type, duration, vol = 0.1) {
        if (this.isMuted) return;
        if (!this.audioCtx) this.init();
        if (!this.audioCtx) return;

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        gain.gain.setValueAtTime(vol, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + duration);
    },

    playCorrect() {
        this._playAudio('assets/sounds/foundletter.mp3');
    },

    playCash() {
        this._playAudio('assets/sounds/cash.mp3');
    },

    playError() {
        this._playAudio('assets/sounds/notfoundletter.mp3');
    },

    playReveal() {
        this.playTone(800, 'sine', 0.1, 0.05);
    },

    playClick() {
        this._playAudio('assets/sounds/click.mp3');
    },

    // CROWD REACTIONS
    playCrowdApplause() {
        // Applause: white noise burst
        if (this.isMuted) return;
        if (!this.audioCtx) this.init();
        if (!this.audioCtx) return;

        const bufferSize = this.audioCtx.sampleRate * 0.5;
        const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.15; // Soft white noise
        }

        const source = this.audioCtx.createBufferSource();
        const gain = this.audioCtx.createGain();
        source.buffer = buffer;
        gain.gain.setValueAtTime(0.3, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);

        source.connect(gain);
        gain.connect(this.audioCtx.destination);
        source.start();
    },

    playCrowdCheer() {
        // Cheer: rising pitch sweep
        this.playTone(200, 'sawtooth', 0.3, 0.2);
        setTimeout(() => this.playTone(400, 'sawtooth', 0.3, 0.2), 100);
        setTimeout(() => this.playTone(600, 'sawtooth', 0.4, 0.2), 200);
    },

    playCrowdAww() {
        // Aww: descending pitch
        this.playTone(400, 'sine', 0.2, 0.15);
        setTimeout(() => this.playTone(300, 'sine', 0.3, 0.15), 150);
        setTimeout(() => this.playTone(200, 'sine', 0.4, 0.15), 300);
    },

    playGameOver() {
        this._playAudio('assets/sounds/gameover.mp3');
    },

    playWin() {
        // Play Synthetic Victory Fanfare
        // Arpeggio C Major: C5 - E5 - G5 - C6
        this.playTone(523.25, 'triangle', 0.1, 0.2); // C5
        setTimeout(() => this.playTone(659.25, 'triangle', 0.1, 0.2), 150); // E5
        setTimeout(() => this.playTone(783.99, 'triangle', 0.1, 0.2), 300); // G5
        setTimeout(() => {
            // Sustain final note
            this.playTone(1046.50, 'triangle', 0.4, 0.3); // C6
            this.playTone(523.25, 'sine', 0.4, 0.3); // Low octave harmony
        }, 450);

        // Final flourish
        setTimeout(() => this.playTone(1318.51, 'sine', 0.6, 0.1), 600); // E6
    },

    _tickAudio: null,
    playWheelTick() {
        if (this.isMuted) return;
        if (!this._tickAudio) {
            this._tickAudio = new Audio('assets/sounds/rotation.mp3');
        }
        // Use cloneNode to allow overlapping without reloading/delay
        const tick = this._tickAudio.cloneNode();
        tick.volume = 0.7;
        tick.play().catch(e => console.warn('Tick audio error:', e));
    },

    // Aliases for missing methods
    playSpin() {
        this.playWheelTick();
    },

    playBonus() {
        this.playCorrect();
    },

    playWinner() {
        this._playAudio('assets/sounds/winner.mp3');
    },

    playFinalWin() {
        // Final victory sound: cheers.mp3
        this._playAudio('assets/sounds/cheers.mp3');
    },

    expressAudio: null,
    playExpress() {
        if (this.isMuted) return;
        if (!this.expressAudio) {
            this.expressAudio = new Audio('assets/sounds/express.mp3');
            this.expressAudio.loop = true;
        }
        this.expressAudio.currentTime = 0;
        this.expressAudio.play().catch(e => console.warn('Express audio play error:', e));
    },

    stopExpress() {
        if (this.expressAudio) {
            this.expressAudio.pause();
            this.expressAudio.currentTime = 0;
        }
    }
};
