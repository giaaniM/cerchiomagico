// ===== Sound Manager =====
const soundManager = {
    audioCtx: null,
    isMuted: false,

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

// Wheel Segments moved to line ~620 to be near renderWheelToCache and avoid duplication


// Wheel Animation Cache Variables
let wheelCacheCanvas = null;
let wheelCacheCtx = null;

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const VOWEL_COST = 1000;
const TOTAL_MANCHES = 5;

// ===== WebSocket / Multiplayer =====
let socket = null;
let currentLobbyId = null;
let isMobileMode = false;
const API_URL = window.location.origin;

// ===== Game State =====
const gameState = {
    phrase: '',
    originalPhrase: '', // Original phrase for file removal
    pendingPenalty: null, // Track CROLLO or PASSA for jolly choice
    pointerAngle: 0, // Pointer oscillation angle for animation
    hint: '',
    normalizedPhrase: '',
    revealedLetters: new Set(),
    usedLetters: new Set(),
    players: [],
    currentPlayerIndex: 0,
    currentManche: null,
    partialScores: {},
    totalScores: {},
    hasShield: {}, // Track which players have Shield protection
    pendingWheelValue: null,
    nextValueMultiplier: 1, // For Raddoppia (x2)
    wheelPhase: 'idle', // 'idle', 'spinning', 'call_consonant', 'choose_action'
    allConsonantsRevealed: false,
    wheelRotation: 0,
    usedPhrases: new Set(), // Track used phrases in current session
    excludedPhrases: new Set(), // Track phrases won and saved in localStorage
    finalSpinComplete: false, // For Manhattan/Final Round 
    finalRoundValue: 0 // Secured value for final round
};

// ===== Offline Phrases Database (Updated for Length) =====
const OFFLINE_PHRASES = [
    { phrase: "CHI DORME NON PIGLIA PESCI", hint: "Proverbio" }, // 22
    { phrase: "NON DIRE GATTO SE NON CE L HAI NEL SACCO", hint: "Proverbio" }, // 29
    { phrase: "LA RUOTA DELLA FORTUNA GIRA PER TUTTI", hint: "Modo di dire" }, // 30
    { phrase: "NON TUTTO QUEL CHE LUCCICA E ORO", hint: "Proverbio" }, // 26
    { phrase: "CHI TROVA UN AMICO TROVA UN TESORO", hint: "Proverbio" }, // 26
    { phrase: "FINCHE LA BARCA VA LASCIALA ANDARE", hint: "Canzone" }, // 28
    { phrase: "CANTARE SOTTO LA PIOGGIA BATTENTE", hint: "Film (Titolo lungo)" }, // 28
    { phrase: "L IMPORTANTE NON E VINCERE MA PARTECIPARE", hint: "Citazione Sportiva" }, // 35
    { phrase: "ROSSO DI SERA BEL TEMPO SI SPERA", hint: "Proverbio" }, // 24
    { phrase: "A CAVAL DONATO NON SI GUARDA IN BOCCA", hint: "Proverbio" }, // 29
    { phrase: "BALLA COI LUPI NELLA FORESTA", hint: "Film (Esteso)" }, // 23
    { phrase: "L APPETITO VIEN MANGIANDO E BEVENDO", hint: "Modo di dire" }, // 30
    { phrase: "MOGLIE E BUOI DEI PAESI TUOI", hint: "Proverbio" }, // 22
    { phrase: "IL MATTINO HA L ORO IN BOCCA", hint: "Proverbio" }, // 21
    { phrase: "TUTTE LE STRADE PORTANO A ROMA", hint: "Proverbio" } // 24
];
// ===== DOM Elements =====
const elements = {
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    winScreen: document.getElementById('win-screen'),
    modalOverlay: document.getElementById('modal-overlay'),
    popupMessage: document.getElementById('popup-message'),

    // Setup
    playerCountInput: document.getElementById('player-count-input'),
    playerNamesContainer: document.getElementById('player-names-container'),
    // Setup - New Modes
    modeSelection: document.getElementById('mode-selection'),
    modeLocalBtn: document.getElementById('mode-local-btn'),
    modeSmartphoneBtn: document.getElementById('mode-smartphone-btn'),
    setupLocalPlayers: document.getElementById('setup-local-players'),
    setupLocalNames: document.getElementById('setup-local-names'),
    setupSmartphoneMode: document.getElementById('setup-smartphone-mode'),
    startLocalGameBtn: document.getElementById('start-local-game-btn'),
    startSmartphoneGameBtn: document.getElementById('start-smartphone-game-btn'),
    backModeBtns: document.querySelectorAll('.btn-back-mode'),
    nextLocalNamesBtn: document.getElementById('next-local-names-btn'),
    backLocalPlayersBtn: document.getElementById('back-local-players-btn'),

    // Local Mode
    localNamesContainer: document.getElementById('local-names-container'),

    // Smartphone Big View
    bigLobbyIdDisplay: document.getElementById('big-lobby-id-display'),
    bigMobileLink: document.getElementById('big-mobile-link'),
    lobbyQrContainer: document.getElementById('lobby-qr-container'),
    bigPlayersGrid: document.getElementById('big-players-grid'),

    // Old elements kept if needed (or to avoid reference errors)
    setupStep1: document.getElementById('setup-step-1'),
    setupStep2: document.getElementById('setup-step-2'),
    nextStepBtn: document.getElementById('next-step-btn'),
    backStepBtn: document.getElementById('back-step-btn'),
    startGameBtn: document.getElementById('start-game-btn'),

    // Game
    mancheNumber: document.getElementById('manche-number'),
    playersList: document.getElementById('players-list'),
    hintText: document.getElementById('hint-text'),
    gameBoard: document.getElementById('game-board'),
    boardInner: document.querySelector('.game-board-inner'),
    currentWheelValue: document.getElementById('current-wheel-value'),
    wheelCanvas: document.getElementById('wheel-canvas'),
    spinBtn: document.getElementById('spin-btn'),
    consonantInput: document.getElementById('consonant-input'),
    consonantBtn: document.getElementById('consonant-btn'),
    vowelInput: document.getElementById('vowel-input'),
    vowelBtn: document.getElementById('vowel-btn'),
    solutionInput: document.getElementById('solution-input'),
    solveBtn: document.getElementById('solve-btn'),
    passBtn: document.getElementById('pass-btn'),
    messageDisplay: document.getElementById('message-display'),
    newGameBtn: document.getElementById('new-game-btn'),
    totalWinningsList: document.getElementById('total-winnings-list'),

    // Express Specialized UI
    expressContainer: document.getElementById('express-input-container'),
    expressConsonantInput: document.getElementById('express-consonant-input'),
    expressConsonantBtn: document.getElementById('express-consonant-btn'),
    expressVowelInput: document.getElementById('express-vowel-input'),
    expressVowelBtn: document.getElementById('express-vowel-btn'),

    // Final Round Specialized UI
    finalRoundContainer: document.getElementById('final-round-input-container'),
    finalConsonantInput: document.getElementById('final-consonant-input'),
    finalConsonantBtn: document.getElementById('final-consonant-btn'),
    finalVowelInput: document.getElementById('final-vowel-input'),
    finalVowelBtn: document.getElementById('final-vowel-btn'),

    // Win
    winTitle: document.getElementById('win-title'),
    winPhrase: document.getElementById('win-phrase'),
    winMessage: document.getElementById('win-message'),
    nextLevelBtn: document.getElementById('next-level-btn')
};

// ===== Utility Functions =====
function normalizeChar(char) {
    return char.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizePhrase(phrase) {
    return phrase.toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/['’]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function sanitizePhrase(p) {
    if (!p) return "";
    const map = { 'A': 'À', 'E': 'È', 'I': 'Ì', 'O': 'Ò', 'U': 'Ù' };
    return p.toUpperCase()
        // Convert substitutes like E' or A' to real accented characters
        .replace(/\b([AEIOU])['’](\b|\s|$)/g, (match, char, boundary) => (map[char] || char) + boundary)
        .replace(/([AEIOU])['’]\b/g, (match, char) => map[char] || match)
        // Convert all remaining apostrophes to spaces as requested
        .replace(/['’]/g, ' ')
        // Clean characters - keep only letters and spaces
        .replace(/[^A-ZÀ-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function getUniqueLetters(phrase) {
    const letters = new Set();
    for (const char of phrase) {
        if (/[A-Z]/.test(normalizeChar(char))) letters.add(normalizeChar(char));
    }
    return Array.from(letters);
}

function isVowel(letter) {
    return VOWELS.includes(normalizeChar(letter));
}

function isConsonant(letter) {
    return /[A-Z]/.test(normalizeChar(letter)) && !isVowel(letter);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId)?.classList.add('active');
}

function showMessage(text, type = 'info') {
    elements.messageDisplay.textContent = text;
    elements.messageDisplay.className = `message-display ${type}`;
    setTimeout(() => {
        if (elements.messageDisplay.textContent === text) {
            elements.messageDisplay.textContent = '';
            elements.messageDisplay.className = 'message-display';
        }
    }, 3000);
}

function popup(icon, title, body = '') {
    return `<div class="popup-body">
        ${icon ? `<div class="popup-icon">${icon}</div>` : ''}
        <div class="popup-title">${title}</div>
        ${body ? `<div class="popup-text">${body}</div>` : ''}
    </div>`;
}

function showPopup(html, duration = 2000, className = '') {
    elements.modalOverlay.style.display = 'flex';
    elements.popupMessage.style.display = 'block';
    elements.popupMessage.className = 'popup-message' + (className ? ' ' + className : '');
    elements.popupMessage.innerHTML = html;
    if (duration > 0) {
        setTimeout(() => {
            elements.popupMessage.style.display = 'none';
            elements.modalOverlay.style.display = 'none';
        }, duration);
    }
}

// ===== Board Creation =====
// ===== Board Creation =====
function createBoard() {
    elements.gameBoard.innerHTML = '';
    const words = gameState.phrase.split(' ');
    const BOARD_ROWS = 4;
    const ROW_CAPACITIES = [12, 14, 14, 12];
    const FIXED_CAPACITY = 14;

    // Tentativo: Area completa (12-14-14-12)
    let contentRows = splitPhraseIntoRows(words, ROW_CAPACITIES);

    if (!contentRows) {
        console.error("Frase troppo lunga per il tabellone!");
        return;
    }

    // Centramento verticale se le righe usate sono meno di 4
    const verticalOffset = Math.floor((BOARD_ROWS - contentRows.length) / 2);

    for (let row = 0; row < BOARD_ROWS; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'board-row';

        const contentRowIndex = row - verticalOffset;
        const contentRow = (contentRowIndex >= 0 && contentRowIndex < contentRows.length) ? contentRows[contentRowIndex] : null;

        const rowLimit = ROW_CAPACITIES[row];

        // Allineamento a sinistra (coerente con la forma 12-14-14-12)
        // La casella 1 è l'inizio "standard" per tutte le righe.
        // Solo per le righe 1 e 2 usiamo la casella 0 se la parola è più lunga di 12.
        let startCol;
        if (row === 0 || row === 3) {
            startCol = 1;
        } else {
            // Righe centrali (14 caselle)
            if (contentRow && contentRow.length > 12) {
                startCol = 0;
            } else {
                startCol = 1;
            }
        }

        for (let col = 0; col < FIXED_CAPACITY; col++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';

            const isRowEdge = (row === 0 || row === 3) && (col === 0 || col === 13);

            if (isRowEdge) {
                tileElement.classList.add('invisible');
            } else {
                const charIndex = col - startCol;
                const content = (contentRow && charIndex >= 0 && charIndex < contentRow.length) ? contentRow[charIndex] : null;

                if (content && content.type === 'letter') {
                    tileElement.classList.add('letter');
                    tileElement.dataset.letter = normalizeChar(content.char);
                    tileElement.textContent = content.char.toUpperCase();
                } else {
                    tileElement.classList.add('empty');
                }
            }
            rowElement.appendChild(tileElement);
        }
        elements.gameBoard.appendChild(rowElement);
    }
}

// Verifica se la frase può entrare nel tabellone
function canFitOnBoard(phrase) {
    const words = phrase.split(' ');
    // Prova l'area completa (12-14-14-12)
    const contentRows = splitPhraseIntoRows(words, [12, 14, 14, 12]);
    return !!contentRows;
}

// Funzione helper per dividere la frase in righe rispettando i limiti forniti
function splitPhraseIntoRows(words, rowLimits) {
    const rows = [];
    let currentRow = [];
    let currentLen = 0;

    for (const word of words) {
        const spaceNeeded = currentRow.length > 0 ? 1 : 0;
        const wordLen = word.length;

        // Controlla se il limite della riga corrente è superato
        if (currentLen + spaceNeeded + wordLen <= rowLimits[rows.length]) {
            if (spaceNeeded) {
                currentRow.push({ type: 'space', char: ' ' });
                currentLen += 1;
            }
            for (const char of word) {
                currentRow.push({ type: 'letter', char: char });
                currentLen += 1;
            }
        } else {
            // Vai alla riga successiva
            rows.push(currentRow);
            currentRow = [];
            currentLen = 0;

            if (rows.length >= rowLimits.length) return null; // Non ci sta

            // Inserisci la parola nella nuova riga
            if (wordLen <= rowLimits[rows.length]) {
                for (const char of word) {
                    currentRow.push({ type: 'letter', char: char });
                    currentLen += 1;
                }
            } else {
                return null; // Parola singola più lunga del limite riga
            }
        }
    }
    if (currentRow.length > 0) rows.push(currentRow);
    return rows.length <= rowLimits.length ? rows : null;
}

function revealLetter(letter, animate = true, onRevealIndividual = null) {
    const normalizedLetter = normalizeChar(letter);
    const tiles = document.querySelectorAll(`.tile.letter[data-letter="${normalizedLetter}"]`);
    let count = 0;
    tiles.forEach((tile, index) => {
        if (!tile.classList.contains('revealed')) {
            count++;
            if (animate) {
                setTimeout(() => {
                    tile.classList.add('revealed', 'just-revealed');

                    // INCREMENTAL JACKPOT SOUND (no particles)
                    soundManager.playCorrect();

                    // Incremental score update
                    if (onRevealIndividual) onRevealIndividual();

                    setTimeout(() => tile.classList.remove('just-revealed'), 1100);
                }, index * 1500); // 1.5s delay between each letter per user request
            } else {
                tile.classList.add('revealed');
                if (onRevealIndividual) onRevealIndividual();
            }
        }
    });
    gameState.revealedLetters.add(normalizedLetter);

    // Lock all interactive controls during tile reveal animation, restore via updateUI when done
    if (animate && count > 0) {
        const lockEls = [
            elements.spinBtn,
            elements.consonantInput, elements.consonantBtn,
            elements.vowelInput, elements.vowelBtn,
            elements.expressConsonantInput, elements.expressConsonantBtn,
            elements.expressVowelInput, elements.expressVowelBtn,
            elements.finalConsonantInput, elements.finalConsonantBtn,
            elements.finalVowelInput, elements.finalVowelBtn,
        ];
        lockEls.forEach(el => { if (el) el.disabled = true; });
        setTimeout(() => updateUI(), (count - 1) * 1500 + 1200);
    }

    return count;
}

// Particle explosion effect for revealed letters
function triggerParticleExplosion(tileElement) {
    if (typeof confetti === 'undefined') return; // Library not loaded

    const rect = tileElement.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
        particleCount: 20,
        spread: 60,
        origin: { x, y },
        colors: ['#FFD700', '#00d4ff', '#8b5cf6', '#ec4899'],
        ticks: 100,
        gravity: 1.2,
        scalar: 0.8
    });
}

// Confetti rain celebration for manche win
function triggerConfettiRain() {
    if (typeof confetti === 'undefined') return; // Library not loaded

    const duration = 3000; // 3 seconds
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
            return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Confetti from left
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));

        // Confetti from right
        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}

function revealAllLetters() {
    const uniqueLetters = getUniqueLetters(gameState.phrase);
    uniqueLetters.forEach(letter => {
        if (!gameState.revealedLetters.has(letter)) revealLetter(letter, true);
    });
}

function countLetterOccurrences(letter) {
    const normalizedLetter = normalizeChar(letter);
    let count = 0;
    for (const char of gameState.phrase) {
        if (normalizeChar(char) === normalizedLetter) count++;
    }
    return count;
}

function checkAllConsonantsRevealed() {
    for (const char of gameState.phrase) {
        if (/[A-ZÀ-ÿ]/i.test(char) && isConsonant(char)) {
            if (!gameState.revealedLetters.has(normalizeChar(char))) {
                return false;
            }
        }
    }
    return true;
}

function checkWin() {
    const revealed = document.querySelectorAll('.tile.letter.revealed').length;
    const total = document.querySelectorAll('.tile.letter').length;
    return revealed === total;
}

// ===== Players =====
// ===== Players =====
function renderPlayersList() {
    elements.playersList.innerHTML = '';

    // Create a list of players with their current index to preserve tracking
    const playersWithIndex = gameState.players.map((player, index) => ({
        player,
        originalIndex: index,
        score: gameState.partialScores[player.name] || 0
    }));

    // Do NOT sort by score, keep the unique fixed random order as requested
    // playersWithIndex.sort((a, b) => b.score - a.score);

    playersWithIndex.forEach((item) => {
        const li = document.createElement('li');
        // Check if this player is the current active player
        li.className = item.originalIndex === gameState.currentPlayerIndex ? 'active' : '';

        // Add Jolly shield if player has it (with pulsing animation)
        const shieldIcon = gameState.hasShield[item.player.name] ? '<span class="shield-icon">🛡️</span>' : '';

        // Avatar URL using DiceBear (Fun Emoji style)
        const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(item.player.name)}&radius=20`;

        li.innerHTML = `
            <div class="player-avatar-wrap">
                <img src="${avatarUrl}" class="player-avatar" alt="Avatar">
            </div>
            <div class="player-info-wrap">
                <span class="player-name">${item.player.name} ${shieldIcon}</span>
                <span class="player-score">€${item.score}</span>
            </div>
        `;
        elements.playersList.appendChild(li);
    });

    renderTotalWinnings();
}

function renderTotalWinnings() {
    if (!elements.totalWinningsList) return;
    elements.totalWinningsList.innerHTML = '';

    // Create a list of players with their cumulative total scores
    const playersWithTotals = gameState.players.map((player) => ({
        name: player.name,
        total: gameState.totalScores[player.name] || 0
    }));

    // Sort by total score descending
    playersWithTotals.sort((a, b) => b.total - a.total);

    playersWithTotals.forEach((item) => {
        const li = document.createElement('li');
        // Small Avatar URL using DiceBear
        const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(item.name)}&radius=20`;

        li.innerHTML = `
            <img src="${avatarUrl}" class="total-avatar" alt="Avatar">
            <span class="win-name">${item.name}</span>
            <span class="win-amount">€${item.total}</span>
        `;
        elements.totalWinningsList.appendChild(li);
    });
}

function getCurrentPlayer() {
    return gameState.players[gameState.currentPlayerIndex];
}

function passTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.pendingWheelValue = null;

    // Logic for Final Round (Manche 5)
    if (gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_play';
    } else {
        gameState.wheelPhase = 'idle';
    }

    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';
    if (gameState.currentManche === 5) {
        elements.currentWheelValue.textContent = `€${gameState.finalRoundValue}`;
        elements.currentWheelValue.className = 'wheel-value final-round-active';
    }

    updateUI();
    if (isMobileMode) syncGameState();

    const nextPlayer = getCurrentPlayer();
    // Show turn popup (without hint - hint only at manche start)
    showPopup(popup('🎯', `TURNO DI ${nextPlayer.name}`), 2500);
}

// ===== Wheel Segments (Patterned: Purple -> DeepBlue -> DarkBlue -> Blue -> LiteBlue -> Special) =====
// Palette:
// Purple: #7e22ce (Purple 700)
// Deep Blue: #172554 (Blue 950)
// Dark Blue: #1e3a8a (Blue 900)
// Blue: #2563eb (Blue 600)
// Light Blue: #60a5fa (Blue 400)
// Specials: 1000, PASSA, CROLLO, RADDOPPIA
// Note: SCUDO replaces the "Purple" slot in the last group to fit.

// ===== Wheel Segments =====
const WHEEL_SEGMENTS = [
    // Group 1
    { value: 300, color: '#b45309', label: '300€' }, // Amber
    { value: 200, color: '#065f46', label: '200€' }, // Deep Emerald
    { value: 700, color: '#0f766e', label: '700€' }, // Teal
    { value: 500, color: '#0891b2', label: '500€' }, // Cyan
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },
    { value: 1000, color: 'RAINBOW', label: '1000€', glowing: true }, // 1000 Rainbow

    // Group 2
    { value: 'CROLLO', color: '#111827', label: 'CROLLO' },
    { value: 350, color: '#9a3412', label: '350€' }, // Burnt Orange
    { value: 300, color: '#065f46', label: '300€' }, // Deep Emerald
    { value: 450, color: '#0f766e', label: '450€' }, // Teal
    { value: 700, color: '#0891b2', label: '700€' }, // Cyan
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },

    // Group 3
    { value: 'RADDOPPIA', color: 'GOLD', label: 'RADDOPPIA', glowing: true },
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },
    { value: 800, color: '#0f766e', label: '800€' }, // Teal
    { value: 300, color: '#0891b2', label: '300€' }, // Cyan
    { value: 'MEGATURNO', color: 'EXPRESS', label: 'MEGATURNO', glowing: true },
    { value: '?500', color: '#166534', label: '?500' }, // Forest Green

    // Group 4
    { value: 'SCUDO', color: '#0369a1', label: 'SCUDO' }, // Ocean Blue
    { value: 300, color: '#065f46', label: '300€' }, // Deep Emerald
    { value: 500, color: '#0891b2', label: '500€' }, // Cyan
    { value: 200, color: '#34d399', label: '200€' }, // Mint
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },
    { value: 200, color: '#b45309', label: '200€' } // Amber
];

// ===== Wheel Drawing =====
function renderWheelToCache() {
    const canvas = elements.wheelCanvas;
    if (!canvas) return;

    // Create or resize off-screen canvas to match wheel canvas
    if (!wheelCacheCanvas) {
        wheelCacheCanvas = document.createElement('canvas');
    }
    wheelCacheCanvas.width = canvas.width;
    wheelCacheCanvas.height = canvas.height;
    wheelCacheCtx = wheelCacheCanvas.getContext('2d');

    const ctx = wheelCacheCtx;
    const centerX = wheelCacheCanvas.width / 2;
    const centerY = wheelCacheCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const scale = wheelCacheCanvas.width / 300;

    ctx.clearRect(0, 0, wheelCacheCanvas.width, wheelCacheCanvas.height);

    const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

    WHEEL_SEGMENTS.forEach((segment, i) => {
        const startAngle = i * segmentAngle;
        const endAngle = startAngle + segmentAngle;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.clip(); // Ensure everything stays within the segment slice

        // Reset Effects for each segment to prevent "bleeding"
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Radial Gradient Logic (Universal Vignette Effect)
        let fillStyle;

        if (segment.color === 'RAINBOW') {
            // RAINBOW GRADIENT (Dark Center -> Rainbow Rim)
            const rainGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            rainGrad.addColorStop(0, '#000000'); // Black center
            rainGrad.addColorStop(0.3, '#330033'); // Deep purple
            rainGrad.addColorStop(0.5, '#ff0000'); // Red
            rainGrad.addColorStop(0.65, '#ffcc00'); // Yellow
            rainGrad.addColorStop(0.8, '#00ff00'); // Green
            rainGrad.addColorStop(0.9, '#00ccff'); // Blue
            rainGrad.addColorStop(1, '#ff00ff'); // Rim
            fillStyle = rainGrad;

        } else if (segment.color === 'EXPRESS') {
            const expGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            expGrad.addColorStop(0, '#c084fc'); // Bright center (Fuchsia/Purple)
            expGrad.addColorStop(0.5, '#9333ea'); // Purple
            expGrad.addColorStop(1, '#3b0764'); // Very dark rim for contrast
            fillStyle = expGrad;
            ctx.shadowColor = '#d946ef'; // Fuchsia glow
            ctx.shadowBlur = 15 * scale;
        } else if (segment.color === '#9333EA') {
            // SCUDO - violet radial gradient
            const scudoGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            scudoGrad.addColorStop(0, '#c084fc');
            scudoGrad.addColorStop(0.5, '#9333ea');
            scudoGrad.addColorStop(1, '#3b0764');
            fillStyle = scudoGrad;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10 * scale;
        } else if (segment.color === 'GOLD' || segment.glowing) {
            // INVERTED GOLD GRADIENT (Radial, Bright Center -> Dark Rim)
            const goldGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            goldGrad.addColorStop(0, '#fef3c7'); // Bright Gold center
            goldGrad.addColorStop(0.4, '#f59e0b'); // Amber
            goldGrad.addColorStop(0.8, '#422006'); // Dark brown
            goldGrad.addColorStop(1, '#000000'); // Black rim
            fillStyle = goldGrad;

            // Add internal glow (contained by clip)
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15 * scale;
        } else {
            // Standard Segments - Deep Vignette
            const baseColor = segment.color;
            const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            if (baseColor === '#FFFFFF' || baseColor === '#f8fafc') {
                // For White segments (PASSA, ?500, CRISTALLO), keep center bright
                vignetteGrad.addColorStop(0, '#FFFFFF'); // Bright center
                vignetteGrad.addColorStop(0.6, '#f8fafc'); // Mostly white
                vignetteGrad.addColorStop(1, '#cbd5e1'); // Light gray rim
            } else {
                vignetteGrad.addColorStop(0, '#000000'); // Black center
                vignetteGrad.addColorStop(0.3, '#0f172a'); // Dark area
                vignetteGrad.addColorStop(1, baseColor);
            }
            fillStyle = vignetteGrad;
        }

        ctx.fillStyle = fillStyle;
        ctx.fill();

        // ADD GLITTER (BRILLANTINATO) FOR SPECIAL SEGMENTS
        if (segment.color === 'EXPRESS' || segment.color === 'RAINBOW') {
            ctx.save();
            const sparkleCount = segment.color === 'RAINBOW' ? 200 : 150;
            for (let j = 0; j < sparkleCount * scale; j++) {
                const r = Math.random() * radius;
                const a = startAngle + Math.random() * segmentAngle;
                const gx = centerX + r * Math.cos(a);
                const gy = centerY + r * Math.sin(a);

                if (segment.color === 'EXPRESS') {
                    // Random white/silver/violet sparkles
                    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#e9d5ff';
                } else {
                    // Rainbow sparkles: mostly white to pop over colors
                    ctx.fillStyle = '#ffffff';
                }

                ctx.globalAlpha = 0.1 + Math.random() * 0.6;

                ctx.beginPath();
                // Tiny sparkles
                const size = Math.random() * 1.2 * scale;
                ctx.arc(gx, gy, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore(); // Stop clipping

        // Draw Stroke (Outside the clip to avoid cutting border in half)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        ctx.restore();

        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);

        // Text Color Logic
        const label = segment.label;
        if (label === 'PASSA') {
            ctx.fillStyle = '#000000';
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'transparent'; // No stroke either
        }
        else if (label === 'CROLLO') ctx.fillStyle = '#FFFFFF';
        else if (label === 'MEGATURNO') {
            ctx.fillStyle = '#fbbf24'; // Vivid yellow as requested
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3 * scale;
        }
        else if (label === 'SCUDO') {
            ctx.fillStyle = '#FFFFFF'; // White text on purple background
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3 * scale;
        }
        else if (label === '?500') {
            ctx.fillStyle = '#FFFF00'; // Yellow text on dark green
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4 * scale;
        }
        else if (label === 'RADDOPPIA') ctx.fillStyle = '#FFFFFF';
        else {
            ctx.fillStyle = '#FFFF00'; // All other numeric values YELLOW
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3 * scale;
        }

        ctx.textAlign = 'center';
        if (label !== 'PASSA') ctx.lineWidth = 3 * scale;

        const chars = label.replace(/\s/g, '').split('');

        // Text Styling (Refined)
        let fontSize = 21 * scale;
        if (label === 'CROLLO') fontSize = 10.5 * scale;
        else if (label === 'PASSA') fontSize = 16 * scale;
        else if (label === 'RADDOPPIA') fontSize = 9 * scale;
        else if (label === 'MEGATURNO') fontSize = 10 * scale;
        else if (label === 'SCUDO') fontSize = 13 * scale;
        else if (label === '?500') fontSize = 18 * scale;
        else if (label === 'EXPRESS') fontSize = 14 * scale;

        ctx.font = `bold ${fontSize}px Lexend, sans-serif`;

        // Text Radius Logic
        let baseRadius = 0.86;

        if (label === 'MEGATURNO') baseRadius = 0.88;
        if (label === 'PASSA') baseRadius = 0.87;
        if (label === 'RADDOPPIA') baseRadius = 0.89;
        if (label === 'EXPRESS') baseRadius = 0.88;
        if (label === 'CROLLO') baseRadius = 0.89;
        if (label === 'SCUDO') baseRadius = 0.87;
        if (label === '?500') baseRadius = 0.86;

        let currentRadius = radius * baseRadius;

        // Extremely tight spacing for long words
        const charSpacing = (label === 'CROLLO' || label === 'RADDOPPIA') ? 0.78 : 0.85;

        // Draw Characters
        chars.forEach(char => {
            ctx.save();
            ctx.translate(currentRadius, 0);
            ctx.rotate(Math.PI / 2);

            // "Euro piu piccolino" e Avvicinalo moltissimo allo zero
            if (char === '€') {
                ctx.font = `bold ${fontSize * 0.55}px Lexend, sans-serif`;
            } else {
                ctx.font = `bold ${fontSize}px Lexend, sans-serif`;
            }

            ctx.fillText(char, 0, 0);
            ctx.restore();
            // Extremely tight spacing
            const currentSpacing = (char === '€') ? charSpacing * 0.2 : charSpacing;
            currentRadius -= fontSize * currentSpacing;
        });

        // DRAW ICONS (🛡️, 🚀, 🎲) AFTER TEXT
        if (label === 'SCUDO') {
            ctx.save();
            ctx.translate(currentRadius - (6 * scale), 0);
            ctx.rotate(Math.PI / 2);
            ctx.font = `${16 * scale}px Lexend, sans-serif`;
            ctx.fillText('🛡️', 0, 0);
            ctx.restore();
        } else if (label === 'MEGATURNO') {
            ctx.save();
            ctx.translate(currentRadius - (6 * scale), 0);
            ctx.rotate(Math.PI / 2);
            ctx.font = `${14 * scale}px Lexend, sans-serif`;
            ctx.fillText('⚡', 0, 0);
            ctx.restore();
        }

        ctx.restore();
    });
    // Pegs removed per user request
}

function drawWheel(rotation = 0) {
    const canvas = elements.wheelCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Lazy initialize cache
    if (!wheelCacheCanvas) {
        renderWheelToCache();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pre-rendered wheel with rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(wheelCacheCanvas, -centerX, -centerY);
    ctx.restore();

    // Draw center circle (always on top, no rotation needed)
    const scale = canvas.width / 300;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
    // Pointer is handled by HTML element .wheel-pointer
}

// ===== Wheel Spinning =====
let wheelAnimationId = null;

function spinWheel() {
    // Special handling for Final Spin Phase
    if (gameState.wheelPhase === 'final_spin') {
        // Proceed to spin logic below...
    } else if (gameState.wheelPhase !== 'idle' && gameState.wheelPhase !== 'choose_action') {
        return;
    }

    gameState.wheelPhase = 'spinning';
    updateUI();

    const overlay = document.getElementById('wheel-overlay');
    if (overlay) overlay.classList.add('active');

    const pointerEl = document.querySelector('.wheel-pointer');
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;

    // TEST MODE: force MEGATURNO — remove this line when done
    const randomSegmentIndex = WHEEL_SEGMENTS.findIndex(s => s.value === 'MEGATURNO');
    // const randomSegmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const resultFragment = WHEEL_SEGMENTS[randomSegmentIndex];

    // Stop near the EDGE of the segment (in bilico)
    // 0.4 to 0.5 = right edge, -0.4 to -0.5 = left edge
    const edgeSide = Math.random() > 0.5 ? 1 : -1;
    const edgeOffset = edgeSide * (0.4 + Math.random() * 0.08); // 40-48% from center

    const segmentCenter = randomSegmentIndex * segmentAngle + segmentAngle / 2;
    let targetRotationDelta = 270 - segmentCenter + (edgeOffset * segmentAngle);
    targetRotationDelta = (targetRotationDelta % 360 + 360) % 360;

    const minSpins = 3 + Math.floor(Math.random() * 2);
    const startRotation = gameState.wheelRotation;
    const targetRotation = startRotation + targetRotationDelta + (minSpins * 360);
    const totalRotation = targetRotation - startRotation;

    const duration = 8000;
    const startTime = performance.now();
    let lastTickSegment = -1;
    let pointerAngle = 0;
    let pointerVelocity = 0;
    let lastRotation = startRotation;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Single smooth ease-out curve - NO phases, NO jumps
        // Using quartic easing that naturally slows down at the end
        const ease = 1 - Math.pow(1 - progress, 5); // Quintic ease out

        const currentRotation = startRotation + totalRotation * ease;
        const rotationDelta = currentRotation - lastRotation;
        lastRotation = currentRotation;

        gameState.wheelRotation = currentRotation;
        drawWheel(currentRotation);

        const currentSegment = Math.floor(((270 - currentRotation) % 360 + 360) % 360 / segmentAngle);

        if (currentSegment !== lastTickSegment && rotationDelta > 0.02) {
            soundManager.playWheelTick();
            lastTickSegment = currentSegment;
        }
        // Pointer is fixed - no animation

        if (progress < 1) {
            wheelAnimationId = requestAnimationFrame(animate);
        } else {
            // Calculate the ACTUAL segment from final position
            const finalAngle = ((270 - currentRotation) % 360 + 360) % 360;
            const actualSegmentIndex = Math.floor(finalAngle / segmentAngle);
            const actualResult = WHEEL_SEGMENTS[actualSegmentIndex];

            onWheelStop(actualResult);

            setTimeout(() => {
                const overlay = document.getElementById('wheel-overlay');
                if (overlay) overlay.classList.remove('active');
            }, 1000);
        }
    }

    wheelAnimationId = requestAnimationFrame(animate);
}
function onWheelStop(result) {
    // --- FINAL ROUND INITIAL SPIN (TOP PRIORITY) ---
    // This is the global spin to set the value before ANY player turn
    if (gameState.currentManche === 5 && !gameState.finalSpinComplete) {
        const baseValue = typeof result.value === 'number' ? result.value : 0;

        if (baseValue > 0) {
            // Success: Numerical value hit
            gameState.finalRoundValue = baseValue + 1000;
            gameState.finalSpinComplete = true;
            gameState.wheelPhase = 'final_play';

            elements.currentWheelValue.textContent = `€${gameState.finalRoundValue}`;
            elements.currentWheelValue.className = 'wheel-value final-round-active';

            checkFinalRoundBanner();

            showPopup(popup('⭐', 'VALORE FISSATO!', `€${baseValue} + €1000 bonus<br>Ogni lettera vale <strong style="color:#fbbf24">€${gameState.finalRoundValue}</strong><br><br>Gioca: ${getCurrentPlayer().name}`), 6000, 'warning');

            setTimeout(() => {
                updateUI();
                if (isMobileMode) syncGameState();
            }, 3000);
        } else {
            // Failure: Special segment hit (PASSA, CROLLO, etc.)
            soundManager.playError();
            gameState.wheelPhase = 'final_spin'; // Allow re-spin
            elements.currentWheelValue.textContent = 'GIRA ANCORA';
            updateUI();

            const label = result.label || result.value;
            showPopup(popup('⚠️', 'VALORE NON VALIDO', `Uscito: ${label} — Gira di nuovo`), 3500, 'danger');
        }
        return; // Important: Consume the event
    }

    if (result.value === 'MEGATURNO' || result.value === 'EXPRESS') {
        soundManager.playExpress();
        elements.currentWheelValue.textContent = 'MEGATURNO';
        elements.currentWheelValue.className = 'wheel-value express-active';
        gameState.wheelPhase = 'express';
        gameState.expressAccumulated = 0; // Reset accumulated for this turn

        // Gold background for Express Mode
        if (elements.boardInner) elements.boardInner.classList.add('express-active');

        updateUI();
        if (isMobileMode) syncGameState();
        showPopup(popup('⚡', 'MEGATURNO!', 'Consonante: +€500 per occorrenza<br>Vocale: −€500<br><br>⚠️ Sbagliare = Perditutto!'), 5000, 'special');
        return;
    }

    const player = getCurrentPlayer();

    if (result.value === 'PASSA') {
        if (gameState.hasShield[player.name]) {
            // Use Shield to avoid PASSA
            handlePenaltyWithShield(player, 'PASSA');
        } else {
            soundManager.playError();
            elements.currentWheelValue.textContent = 'PASSA';
            elements.currentWheelValue.className = 'wheel-value passa';
            showPopup(popup('⏭️', 'PASSA!', 'Turno perso'), 2000, 'warning');
            setTimeout(passTurn, 2500);
        }
    } else if (result.value === 'RADDOPPIA') {
        // RADDOPPIA - Set special pending value and wait for consonant
        elements.currentWheelValue.textContent = 'RADDOPPIA';
        elements.currentWheelValue.className = 'wheel-value raddoppia';
        gameState.pendingWheelValue = 'RADDOPPIA';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        if (isMobileMode) syncGameState();
        showMessage('RADDOPPIA! Chiama una consonante per raddoppiare il tuo punteggio!', 'info');
    } else if (result.value === 'SCUDO') {
        // SCUDO - Set special pending value and wait for consonant
        elements.currentWheelValue.textContent = 'SCUDO';
        elements.currentWheelValue.className = 'wheel-value megaturno';
        gameState.pendingWheelValue = 'SCUDO';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        if (isMobileMode) syncGameState();
        showMessage('SCUDO! Chiama una consonante per ottenere la protezione!', 'info');
    } else if (result.value === 'CROLLO') {
        // Check if player has shield protection
        if (gameState.hasShield[player.name]) {
            // Offer choice: use Shield or accept Perditutto
            handlePenaltyWithShield(player, 'CROLLO');
        } else {
            // Normal Perditutto - lose ALL scores (partial + total)
            soundManager.playGameOver();
            elements.currentWheelValue.textContent = 'CROLLO';
            elements.currentWheelValue.className = 'wheel-value crollo';
            gameState.partialScores[player.name] = 0;
            gameState.totalScores[player.name] = 0; // Lose global score too
            renderPlayersList();
            showPopup(popup('💥', 'CROLLO!', 'Hai perso tutto il bottino'), 4000, 'danger');
            if (isMobileMode) syncGameState();
            setTimeout(passTurn, 4500);
        }
    } else if (result.value === '?500') {
        soundManager.playClick();
        handleMysterySegment();
    } else {
        // Normal value - apply multiplier if active
        soundManager.playClick();
        const baseValue = result.value;
        const finalValue = baseValue * gameState.nextValueMultiplier;

        gameState.pendingWheelValue = finalValue;
        const displayValue = isNaN(finalValue) ? '?' : `€${finalValue}`;
        elements.currentWheelValue.textContent = displayValue;
        elements.currentWheelValue.className = 'wheel-value';

        // Reset multiplier after use
        if (gameState.nextValueMultiplier > 1) {
            showMessage(`🔥 Valore RADDOPPIATO! Chiama una consonante (vale €${finalValue})`, 'success');
            gameState.nextValueMultiplier = 1;
        } else {
            showMessage(`Chiama una consonante (vale €${finalValue})`, 'info');
        }

        gameState.wheelPhase = 'call_consonant';
        updateUI();
        if (isMobileMode) syncGameState();
    }
}

function handlePenaltyWithShield(player, penaltyType) {
    gameState.pendingPenalty = penaltyType;
    const title = penaltyType === 'CROLLO' ? '💥 CROLLO!' : '⏭️ PASSA';
    const penaltyText = penaltyType === 'CROLLO'
        ? 'Hai lo SCUDO DI PROTEZIONE! 🛡️<br>Vuoi usarlo per salvarti dalla Perditutto?'
        : 'Hai lo SCUDO DI PROTEZIONE! 🛡️<br>Vuoi usarlo per non perdere il turno?';

    const html = `
        <div class="popup-megaturno-choice">
            <div class="jolly-choice-title">${title}</div>
            <p class="jolly-choice-text">${penaltyText}</p>
            <div class="mystery-cards-container">
                <!-- Use Shield -->
                <div class="mystery-card left" onclick="resolveShieldChoice(true)">
                    <div class="card-content">
                        <span class="card-icon">🛡️</span>
                        <span class="card-text">USA<br>SCUDO</span>
                    </div>
                </div>

                <!-- Accept Penalty -->
                <div class="mystery-card right" onclick="resolveShieldChoice(false)">
                    <div class="card-content">
                        <span class="card-icon">${penaltyType === 'CROLLO' ? '💥' : '⏭️'}</span>
                        <span class="card-text">ACCETTA<br>${penaltyType}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    showPopup(html, 0);
}

window.resolveShieldChoice = function (useShield) {
    const player = getCurrentPlayer();
    const penaltyType = gameState.pendingPenalty;
    elements.modalOverlay.style.display = 'none';
    elements.popupMessage.style.display = 'none';

    if (useShield) {
        // Use Shield - keep money/turn, lose shield
        soundManager.playReveal();
        gameState.hasShield[player.name] = false;
        renderPlayersList();
        showPopup(popup('🛡️', 'SCUDO UTILIZZATO!', `${player.name} è salvo!`), 2500, 'subtle-success');
        
        setTimeout(() => {
            gameState.wheelPhase = 'idle';
            updateUI();
            showMessage('Sei salvo! Gira di nuovo!', 'success');
        }, 2500);
    } else {
        // Accept Penalty
        if (penaltyType === 'CROLLO') {
            soundManager.playGameOver();
            gameState.partialScores[player.name] = 0;
            gameState.totalScores[player.name] = 0;
            renderPlayersList();
            showPopup(popup('💥', 'CROLLO!', 'Hai perso tutto il bottino<br><small>(Scudo conservato)</small>'), 4000, 'danger');
            if (isMobileMode) syncGameState();
            setTimeout(passTurn, 4500);
        } else {
            // It was PASSA
            soundManager.playError();
            showPopup(popup('⏭️', 'PASSA', `${player.name} passa la mano<br><small>(Scudo conservato)</small>`), 2500, 'warning');
            setTimeout(passTurn, 3000);
        }
    }
    delete gameState.pendingPenalty;
};

function handleMysterySegment() {
    // If mobile mode, ALSO offer choice on phone
    if (isMobileMode && socket && currentLobbyId) {
        const player = getCurrentPlayer();
        const sockId = player.id || player.socketId;

        if (sockId) {
            console.log('Sending mystery offer to mobile player:', sockId);
            socket.emit('host:mystery-offer', { lobbyId: currentLobbyId, playerId: sockId });
        }
    }

    // Always show the selection cards on the host screen (web) as well
    const html = `
        <div class="popup-mystery-minimal">
            <div class="mystery-title">SCELTA MISTERIOSA</div>
            <div class="mystery-cards-container">
                <!-- Card 1: Risk (500) -->
                <div class="mystery-card left" onclick="resolveMysteryChoice(500)">
                    <div class="card-content">
                        <span class="card-icon">💶</span>
                        <span class="card-text">SICURO<br>€500</span>
                    </div>
                </div>

                <!-- Card 2: Raffle -->
                <div class="mystery-card right" onclick="resolveMysteryChoice('RAFFLE')">
                    <div class="card-content">
                        <span class="card-icon">🎲</span>
                        <span class="card-text">RISCHIA<br>ESTRAI</span>
                    </div>
                </div>
            </div>
            <p class="mystery-note">Scegli tra i 500€ sicuri o tenta la sorte!</p>
        </div>
    `;
    showPopup(html, 0); // Permanent until clicked
}

// Setup listener for remote choice if we are host
if (typeof socket !== 'undefined') {
    // We need to listen to 'lobby:mystery-choice' IF we initialized the socket.
    // The socket initialization happens in initSmartphoneLobby usually.
    // We'll add a hook there or check here.
}

window.resolveMysteryChoice = function (choice) {
    elements.modalOverlay.style.display = 'none';
    elements.popupMessage.style.display = 'none';

    let finalValue;
    if (choice === 'RAFFLE') {
        soundManager.playSpin();
        // Raffle: Pool with 3 low and 3 high values (500 is excluded as per user request)
        const rafflePool = [200, 300, 400, 700, 800, 1000];

        // Uniform probability for all values in the pool
        const selectedIdx = Math.floor(Math.random() * rafflePool.length);
        finalValue = rafflePool[selectedIdx];

        console.log('Raffle result:', finalValue, 'from', rafflePool.length, 'eligible segments');
        showPopup(popup('🎲', 'ESTRATTO!', `€${finalValue}`), 2000, 'warning');
    } else {
        soundManager.playReveal();
        finalValue = Number(choice);
        showPopup(popup('💶', 'HAI SCELTO', `€${finalValue}`), 2000, 'warning');
    }

    // Notify mobile players to close their modals if we are in mobile mode
    if (isMobileMode && socket && currentLobbyId) {
        socket.emit('host:mystery-resolved', currentLobbyId);
    }

    gameState.pendingWheelValue = finalValue;

    // Update UI and phase after popup
    setTimeout(() => {
        elements.currentWheelValue.textContent = `€${gameState.pendingWheelValue}`;
        elements.currentWheelValue.className = 'wheel-value';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        showMessage(`Chiama una consonante (vale €${gameState.pendingWheelValue})`, 'info');
        if (isMobileMode) syncGameState();
    }, 2000);
};

// ===== Letter Actions =====
function callConsonant() {
    const letter = elements.consonantInput.value.trim().toUpperCase();
    elements.consonantInput.value = '';

    if (!letter || !/^[A-ZÀ-ÿ]$/.test(letter)) {
        showMessage('Inserisci una lettera valida!', 'error');
        soundManager.playError();
        return;
    }

    const player = getCurrentPlayer();

    if (isVowel(letter)) {
        soundManager.playError();
        showMessage('Devi chiamare una CONSONANTE, non una vocale!', 'error');
        showPopup(popup('🚫', 'HAI INSERITO UNA VOCALE!', 'Le vocali si comprano a €1000'), 2500, 'danger');
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        soundManager.playError();
        showPopup(popup('🚫', 'LETTERA GIÀ CHIAMATA!', 'Il turno passa al prossimo giocatore'), 3000, 'danger');
        setTimeout(passTurn, 3000);
        return;
    }

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        const player = getCurrentPlayer();
        let earnings = 0;
        let specialAction = null;
        let raddoppiaData = null;

        if (gameState.pendingWheelValue === 'RADDOPPIA') {
            const currentScore = gameState.partialScores[player.name] || 0;
            if (currentScore === 0) {
                earnings = 500 * occurrences;
                specialAction = 'RADDOPPIA_ZERO';
            } else {
                const doubled = currentScore * 2;
                specialAction = 'RADDOPPIA';
                earnings = doubled - currentScore;
            }
            raddoppiaData = { isZero: currentScore === 0, current: currentScore, final: currentScore === 0 ? earnings : currentScore * 2 };
        } else if (gameState.pendingWheelValue === 'SCUDO') {
            specialAction = 'SCUDO';
            earnings = 0;
        } else if (gameState.wheelPhase === 'final_play') {
            // Final Round Logic
            earnings = gameState.finalRoundValue * occurrences;
        } else {
            earnings = gameState.pendingWheelValue * occurrences;
        }

        revealLetter(letter, true, null); // Don't update score incrementally during reveal
        if (isMobileMode) syncGameState();

        // Delay popup and final cleanup until letters are revealed
        const delay = occurrences * 1500;
        setTimeout(() => {
            // User request: Winnings and cash sound at the end of reveal
            if (specialAction !== 'RADDOPPIA' && specialAction !== 'RADDOPPIA_ZERO' && specialAction !== 'SCUDO') {
                gameState.partialScores[player.name] += earnings;
                renderPlayersList();
                soundManager.playCash();
            }

            // Apply special actions (Raddoppia/Scudo) after reveal
            if (specialAction === 'RADDOPPIA' || specialAction === 'RADDOPPIA_ZERO') {
                gameState.partialScores[player.name] = raddoppiaData.final;
                const { isZero, current, final } = raddoppiaData;
                showPopup(popup('🔥', 'RADDOPPIA!', isZero ? `Bonus: €${final}` : `Da €${current} → €${final}`), 3500, 'warning');
                renderPlayersList();
                soundManager.playCash();
            } else if (specialAction === 'SCUDO') {
                gameState.hasShield[player.name] = true;
                showPopup(popup('🛡️', 'SCUDO OTTENUTO!', `${player.name} è protetto`), 2500, 'subtle-success');
                renderPlayersList();
            }

            showMessage(`${player.name}: +€${earnings}`, 'success');
            soundManager.playCrowdApplause();

            if (checkWin()) {
                setTimeout(endManche, 1500);
            } else {
                const wasFinished = gameState.allConsonantsRevealed;
                gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

                if (!wasFinished && gameState.allConsonantsRevealed) {
                    showPopup(popup('✅', 'CONSONANTI TERMINATE!', 'Ora puoi solo acquistare vocali o risolvere'), 2500);
                }

                if (gameState.currentManche === 5) {
                    gameState.wheelPhase = 'final_play';
                } else {
                    gameState.wheelPhase = 'choose_action';
                }
                gameState.pendingWheelValue = null;
                elements.currentWheelValue.textContent = (gameState.currentManche === 5) ? `€${gameState.finalRoundValue}` : '-';
                updateUI();
                if (isMobileMode) syncGameState();
            }
        }, delay + 500);

        // ----------------------------
    } else {
        soundManager.playError();
        gameState.pendingWheelValue = null; // Clear value
        elements.currentWheelValue.textContent = '-';
        const nextPlayer = gameState.players[(gameState.currentPlayerIndex + 1) % gameState.players.length];
        // Show error popup with larger letter
        showPopup(popup('❌', `"${letter}" NON PRESENTE`, 'Turno perso'), 3000, 'danger');
        setTimeout(passTurn, 3000);
    }
}

function buyVowel() {
    const letter = elements.vowelInput.value.trim().toUpperCase();
    elements.vowelInput.value = '';
    const player = getCurrentPlayer();

    if (!letter || !/^[AEIOUÀÈÌÒÙàèìòù]$/i.test(letter)) {
        showMessage('Inserisci una vocale valida (A, E, I, O, U)!', 'error');
        soundManager.playError();
        return;
    }

    if (!isVowel(letter)) {
        showMessage('Devi inserire una VOCALE!', 'error');
        soundManager.playError();
        return;
    }

    // Free Vowels in Final Round
    if (gameState.wheelPhase !== 'final_play' && gameState.partialScores[player.name] < VOWEL_COST) {
        showMessage(`Non hai abbastanza soldi! Servono €${VOWEL_COST}`, 'error');
        soundManager.playError();
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        showMessage(`La vocale "${letter}" è già stata chiamata!`, 'error');
        soundManager.playError();
        showPopup(popup('🚫', 'VOCALE GIÀ CHIAMATA!', 'Turno perso'), 2000, 'danger');
        setTimeout(passTurn, 2500);
        return;
    }

    // Deduct cost (unless Final Round)
    if (gameState.wheelPhase !== 'final_play') {
        gameState.partialScores[player.name] -= VOWEL_COST;
    }
    gameState.usedLetters.add(normalized);
    renderPlayersList();
    if (isMobileMode) syncGameState();

    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        revealLetter(letter, true, null);
        showMessage(`🎉 "${letter}" trovata ${occurrences} volta/e!`, 'success');

        if (checkWin()) {
            setTimeout(endManche, 1500);
        } else {
            // Final Round?
            if (gameState.currentManche === 5) {
                gameState.wheelPhase = 'final_play';
            } else {
                gameState.wheelPhase = 'choose_action';
            }
            updateUI();
            if (isMobileMode) syncGameState();
        }
    } else {
        soundManager.playError();
        const costText = (gameState.currentManche === 5) ? "" : ` (-€${VOWEL_COST})`;
        showMessage(`❌ "${letter}" non c'è nella frase.${costText}`, 'error');
        showPopup(popup('❌', `"${letter}" NON PRESENTE`, 'Turno perso'), 2000, 'danger');
        setTimeout(passTurn, 2500);
    }
}

// ===== Specialized Express Functions =====
function callExpressConsonant() {
    const letter = elements.expressConsonantInput.value.trim().toUpperCase();
    elements.expressConsonantInput.value = '';
    const player = getCurrentPlayer();

    if (!letter) return;
    if (isVowel(letter)) {
        showMessage('Solo CONSONANTI qui!', 'error');
        return;
    }
    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        triggerExpressBankruptcy("Lettera già chiamata!");
        return;
    }

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);
    if (occurrences > 0) {
        revealLetter(letter, true, null); // No incremental updates during reveal

        setTimeout(() => {
            const gain = occurrences * 500;
            gameState.expressAccumulated += gain;
            soundManager.playCash();
            checkExpressBanner();
            flashExpressBanner(`+€${gain}`);
            renderPlayersList();

            if (checkWin()) {
                endManche();
            } else {
                updateUI();
                elements.expressConsonantInput.focus();
            }
        }, occurrences * 1500 + 500);
    } else {
        triggerExpressBankruptcy("Lettera non presente!");
    }
}

function buyExpressVowel() {
    const letter = elements.expressVowelInput.value.trim().toUpperCase();
    elements.expressVowelInput.value = '';
    const player = getCurrentPlayer();

    if (!letter) return;
    if (!isVowel(letter)) {
        showMessage('Solo VOCALI qui!', 'error');
        return;
    }

    // Cost deducts from actual balance or accumulated? 
    // Usually it deducts from what you have.
    const cost = 500;
    const currentTotal = (gameState.partialScores[player.name] || 0) + gameState.expressAccumulated;
    if (currentTotal < cost) {
        showMessage("Saldo insufficiente!", 'error');
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        triggerExpressBankruptcy("Vocale già chiamata!");
        return;
    }

    // Deduct cost from accumulated first, then balance
    if (gameState.expressAccumulated >= cost) {
        gameState.expressAccumulated -= cost;
    } else {
        const remaining = cost - gameState.expressAccumulated;
        gameState.expressAccumulated = 0;
        gameState.partialScores[player.name] -= remaining;
        renderPlayersList();
    }

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        revealLetter(letter, true, null);
        setTimeout(() => {
            checkExpressBanner();
            flashExpressBanner(`-€${cost}`);
            if (checkWin()) {
                endManche();
            } else {
                updateUI();
                elements.expressVowelInput.focus();
            }
        }, occurrences * 1500 + 500);
    } else {
        triggerExpressBankruptcy("Vocale non presente!");
    }
}

function triggerExpressBankruptcy(reason) {
    soundManager.stopExpress();
    soundManager.playGameOver();
    const player = getCurrentPlayer();
    gameState.partialScores[player.name] = 0;
    gameState.totalScores[player.name] = 0;
    gameState.expressAccumulated = 0;
    gameState.wheelPhase = 'idle';
    renderPlayersList();
    hideExpressBanner();

    // Remove Gold board style
    if (elements.boardInner) elements.boardInner.classList.remove('express-active');

    showPopup(popup('💥', 'CROLLO!', reason), 4000, 'danger');
    setTimeout(passTurn, 4500);
}

function trySolve() {
    const guess = elements.solutionInput.value.trim().toUpperCase();
    elements.solutionInput.value = '';

    if (!guess) {
        showMessage('Scrivi la soluzione!', 'error');
        return;
    }

    if (normalizePhrase(guess) === gameState.normalizedPhrase) {
        if (gameState.wheelPhase === 'express') {
            const player = getCurrentPlayer();
            gameState.partialScores[player.name] += gameState.expressAccumulated;
            gameState.expressAccumulated = 0;
            hideExpressBanner();
            if (elements.boardInner) elements.boardInner.classList.remove('express-active');
        }
        soundManager.playWin(); // Suono immediato qui
        showMessage('🎉🎉 ESATTO! HAI INDOVINATO! 🎉🎉', 'success');
        // Reveal all letters
        document.querySelectorAll('.tile.letter').forEach(tile => {
            tile.classList.add('revealed');
        });
        setTimeout(endManche, 1500);
    } else {
        if (gameState.wheelPhase === 'express') {
            soundManager.stopExpress();
            hideExpressBanner();
            soundManager.playGameOver();
            const player = getCurrentPlayer();
            gameState.partialScores[player.name] = 0;
            gameState.totalScores[player.name] = 0;
            gameState.wheelPhase = 'idle';
            renderPlayersList();

            // Remove Gold board style
            if (elements.boardInner) elements.boardInner.classList.remove('express-active');

            showPopup(popup('💥', 'CROLLO!', 'Soluzione errata — perdi tutto'), 4000, 'danger');
            setTimeout(passTurn, 4500);
        } else {
            soundManager.playError();
            showMessage('❌ Soluzione errata!', 'error');
            showPopup(popup('❌', 'SOLUZIONE SBAGLIATA!', 'Turno perso'), 2500, 'danger');
            setTimeout(passTurn, 2500);
        }
    }
}

// ===== Manche & Game Flow =====
function endManche() {
    soundManager.stopExpress();
    hideExpressBanner();
    hideFinalRoundBanner();

    // Remove Gold board style
    if (elements.boardInner) elements.boardInner.classList.remove('express-active');

    const winner = getCurrentPlayer();

    // User request: quando si da la soluzione e si hanno 0 euro prendi mille euro.
    const currentBank = (Number(gameState.partialScores[winner.name]) || 0) + (Number(gameState.expressAccumulated) || 0);
    if (currentBank === 0) {
        gameState.partialScores[winner.name] = 1000;
    }

    // Support for EXPRESS winnings
    if (gameState.expressAccumulated > 0) {
        gameState.partialScores[winner.name] += gameState.expressAccumulated;
        gameState.expressAccumulated = 0;
    }

    const winnings = Number(gameState.partialScores[winner.name]) || 0;
    gameState.totalScores[winner.name] = (Number(gameState.totalScores[winner.name]) || 0) + winnings;

    // Store winner index to exclude them from starting the next manche
    gameState.lastMancheWinnerIndex = gameState.currentPlayerIndex;

    updateUI();
    if (isMobileMode) syncGameState();

    // CONFETTI RAIN CELEBRATION
    triggerConfettiRain();
    soundManager.playWinner(); // MANCHE WINNER SOUND
    soundManager.playCrowdCheer(); // CROWD REACTION

    showPopup(popup('🏆', `MANCHE ${gameState.currentManche} VINTA!`, `${winner.name}<br><strong style="color:#4ade80;font-size:1.3em">+€${winnings.toLocaleString('it-IT')}</strong>`), 3000, 'subtle-success');

    // Clear board as requested: "cancella la frase che è stata indovinata"
    if (elements.gameBoard) elements.gameBoard.innerHTML = '';

    // Mark phrase as won locally (replaces server-side removal)
    markPhraseAsWon(gameState.originalPhrase || gameState.phrase);

    setTimeout(() => {
        // Show partial ranking
        showPartialRanking();

        setTimeout(() => {
            elements.popupMessage.style.display = 'none';
            elements.modalOverlay.style.display = 'none';

            if (gameState.currentManche >= TOTAL_MANCHES) {
                showFinalResults();
            } else {
                // Reset for next manche
                gameState.currentManche++;
                startNextManche();
            }
        }, 4000); // Wait for ranking
    }, 3000); // Wait for win popup
}

function showPartialRanking() {
    const sortedPlayers = [...gameState.players].sort((a, b) =>
        (Number(gameState.totalScores[b.name]) || 0) - (Number(gameState.totalScores[a.name]) || 0)
    );

    const manchesLeft = TOTAL_MANCHES - gameState.currentManche;
    const medals = ['🥇', '🥈', '🥉'];

    let html = `<div class="popup-ranking-partial">
        <div class="ranking-manche-badge">MANCHE ${gameState.currentManche} / ${TOTAL_MANCHES}</div>
        <div class="ranking-header">CLASSIFICA</div>
        <div class="ranking-list">`;

    sortedPlayers.forEach((p, i) => {
        const score = gameState.totalScores[p.name] || 0;
        const medal = medals[i] || `${i + 1}.`;
        const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(p.name)}&radius=20`;
        html += `
            <div class="ranking-item ${i === 0 ? 'top-rank' : ''}">
                <span class="rank-medal">${medal}</span>
                <img src="${avatarUrl}" class="rank-avatar" alt="">
                <span class="rank-name">${p.name}</span>
                <span class="rank-val">€${score.toLocaleString('it-IT')}</span>
            </div>`;
    });

    html += `</div>`;
    if (manchesLeft > 0) {
        html += `<div class="ranking-footer">Ancora ${manchesLeft} manche${manchesLeft > 1 ? 's' : ''}</div>`;
    }
    html += `</div>`;
    showPopup(html, 0);
}

async function startNextManche() {
    // Reset state
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.pendingWheelValue = null;
    gameState.wheelPhase = 'idle';
    // Nota: allConsonantsRevealed verrà calcolato dopo il caricamento della frase

    // --- FINAL ROUND INIT ---
    if (gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_spin';
        gameState.finalSpinComplete = false;
        gameState.finalRoundValue = 0;
        // The popup in 'startNextManche' will announce it generally, 
        // but SpinWheel logic handles the "Value Spin" phase flow.
    }
    // ------------------------

    // Reset partial scores
    gameState.players.forEach(p => gameState.partialScores[p.name] = 0);

    // Shields (hasShield) are now preserved across rounds as requested.

    // Increase the "1000" segment value each manche (1000, 2000, 3000, 4000, 5000)
    const base1000Value = 1000;
    const currentWheel1000 = base1000Value * gameState.currentManche;
    if (WHEEL_SEGMENTS[5]) {
        WHEEL_SEGMENTS[5].value = currentWheel1000;
        WHEEL_SEGMENTS[5].label = `${currentWheel1000}€`;
    }
    renderWheelToCache();

    // Fixed rotation for starting player: Manche 1 -> Player 0, Manche 2 -> Player 1, etc.
    gameState.currentPlayerIndex = (gameState.currentManche - 1) % gameState.players.length;

    // User request: chi vince la manche non inizia il turno dopo
    if (gameState.lastMancheWinnerIndex !== undefined && gameState.currentPlayerIndex === gameState.lastMancheWinnerIndex) {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    }
    delete gameState.lastMancheWinnerIndex; // Reset for next time

    showPopup(`<div class="popup-loading">Generando frase per Manche ${gameState.currentManche}...</div>`, 0);

    /* 
    // AI Logic Disabilitata su richiesta
    try {
        let attempts = 0;
        let valid = false;
        while (!valid && attempts < 10) {
            attempts++;
            const data = await fetchPuzzleFromAI();
            if (canFitOnBoard(data.phrase)) {
                gameState.phrase = sanitizePhrase(data.phrase);
                gameState.hint = data.hint;
                valid = true;
            }
        }
        if (!valid) throw new Error("AI failed");
    } catch (e) {
        console.warn("AI fallback to DB:", e);
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];
        gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
        gameState.hint = randomPuzzle.hint;
    }
    */

    // Selezione diretta da PUZZLE_DATABASE
    let valid = false;
    let attempts = 0;

    // Load permanently excluded phrases from localStorage
    const saved = localStorage.getItem('won_phrases');
    if (saved) {
        const list = JSON.parse(saved);
        gameState.excludedPhrases = new Set(list.map(p => normalizePhrase(p)));
    }

    while (!valid && attempts < 200) {
        attempts++;
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];
        const normalized = normalizePhrase(randomPuzzle.phrase);

        // Ensure it fits AND hasn't been used yet AND is not excluded permanently
        const isNotUsed = !gameState.usedPhrases.has(normalized);
        const isNotExcluded = !gameState.excludedPhrases.has(normalized);

        if (canFitOnBoard(randomPuzzle.phrase) && isNotUsed && isNotExcluded) {
            gameState.originalPhrase = randomPuzzle.phrase;
            gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
            gameState.hint = randomPuzzle.hint;
            gameState.usedPhrases.add(normalized); // Mark as used
            console.log(`[DB] Frase Scelta: "${gameState.phrase}" - Hint: "${gameState.hint}"`);
            valid = true;
        }
    }
    // Fallback estremo se il DB ha problemi
    if (!valid) {
        const fallback = OFFLINE_PHRASES[0];
        gameState.originalPhrase = fallback.phrase;
        gameState.phrase = sanitizePhrase(fallback.phrase);
        gameState.hint = fallback.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

    elements.popupMessage.style.display = 'none';
    elements.modalOverlay.style.display = 'none';

    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';
    elements.mancheNumber.textContent = gameState.currentManche;
    elements.hintText.textContent = gameState.hint;
    createBoard();
    drawWheel(0);
    renderPlayersList();
    updateUI();
    if (isMobileMode) syncGameState();

    showPopup(`<div class="popup-manche-start">
        <div class="popup-manche-number">MANCHE ${gameState.currentManche} ${gameState.currentManche === 5 ? '- FINALE' : ''}</div>
        <div class="popup-category-label">Categoria:</div>
        <div class="popup-manche-hint-large">${gameState.hint}</div>
        <div class="popup-turn-player">
            ${gameState.currentManche === 5 ?
            '<span class="pulse-action" style="color:#fbbf24">GIRATE PER IL VALORE DEL ROUND</span>' :
            `INIZIA IL ROUND:<br><span class="popup-name">${getCurrentPlayer().name}</span>`
        }
        </div>
    </div>`, 4000, 'transparent-wrapper');
}

function showFinalResults() {
    // Find winner
    let maxScore = -1;
    let winner = null;
    gameState.players.forEach(p => {
        if (gameState.totalScores[p.name] > maxScore) {
            maxScore = gameState.totalScores[p.name];
            winner = p;
        }
    });

    const sortedPlayers = gameState.players
        .sort((a, b) => gameState.totalScores[b.name] - gameState.totalScores[a.name]);

    const fmt = (n) => `€${Number(n).toLocaleString('it-IT')}`;
    const podiumData = [
        { order: 1, cls: 'second', icon: '🥈' },
        { order: 0, cls: 'first',  icon: '🥇' },
        { order: 2, cls: 'third',  icon: '🥉' },
    ];

    let resultsHtml = '<div class="results-podium">';
    podiumData.forEach(({ order, cls, icon }) => {
        const p = sortedPlayers[order];
        if (!p) return;
        const score = gameState.totalScores[p.name] || 0;
        const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(p.name)}&radius=50`;
        resultsHtml += `
        <div class="podium-place ${cls}">
            <div class="place-icon">${icon}</div>
            <img src="${avatarUrl}" class="podium-avatar" alt="">
            <div class="place-name">${p.name}</div>
            <div class="place-score">${fmt(score)}</div>
            <div class="podium-bar"></div>
        </div>`;
    });
    resultsHtml += '</div>';

    if (sortedPlayers.length > 3) {
        resultsHtml += '<div class="results-list-remaining">';
        sortedPlayers.slice(3).forEach((p, i) => {
            resultsHtml += `<div class="result-row-small">${i + 4}. ${p.name} — ${fmt(gameState.totalScores[p.name])}</div>`;
        });
        resultsHtml += '</div>';
    }

    elements.winTitle.innerHTML = `<span class="win-title-name">${winner.name}</span><br><span class="win-title-sub">ha vinto!</span>`;
    elements.winPhrase.innerHTML = resultsHtml;
    elements.winMessage.textContent = `Montepremi: ${fmt(maxScore)}`;
    elements.nextLevelBtn.textContent = 'NUOVA PARTITA';
    elements.nextLevelBtn.onclick = newGame;

    showScreen('win-screen');
    soundManager.playFinalWin();
}

// ===== UI Updates =====
function updateUI() {
    const phase = gameState.wheelPhase;
    const allConsRevealed = gameState.allConsonantsRevealed;

    const spinBtn = document.getElementById('spin-btn');
    const consonantContainer = document.getElementById('consonant-call-container');
    const vowelGroup = document.getElementById('vowel-group');
    const solveGroup = document.getElementById('solve-group');

    // --- MANCHE 5 (FINAL ROUND) SPECIFIC UI ---
    if (gameState.currentManche === 5) {
        // Hide standard vowel group
        if (vowelGroup) vowelGroup.style.display = 'none';

        if (phase === 'final_spin') {
            spinBtn.style.display = 'block';
            spinBtn.textContent = 'GIRA PER IL VALORE';
            spinBtn.disabled = false;
            consonantContainer.style.display = 'none';
            elements.expressContainer.style.display = 'none';
            if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'none';
            if (elements.passBtn) elements.passBtn.style.display = 'none';
            hideFinalRoundBanner();
            return; // EXIT EARLY
        } else if (phase === 'final_play' || phase === 'final_decision') {
            spinBtn.style.display = 'none';
            consonantContainer.style.display = 'none';
            elements.expressContainer.style.display = 'none';
            if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'flex';

            const isDecision = (phase === 'final_decision');

            // Enable/Disable inputs
            if (elements.finalConsonantInput) elements.finalConsonantInput.disabled = isDecision;
            if (elements.finalConsonantBtn) elements.finalConsonantBtn.disabled = isDecision;
            if (elements.finalVowelInput) elements.finalVowelInput.disabled = isDecision;
            if (elements.finalVowelBtn) elements.finalVowelBtn.disabled = isDecision;

            if (!isDecision) {
                // Auto-focus consonant input
                if (elements.finalConsonantInput) {
                    setTimeout(() => elements.finalConsonantInput.focus(), 50);
                }
                elements.messageDisplay.textContent = '';
                elements.messageDisplay.className = 'message-display';
            } else {
                showMessage('RISOLVI O PASSA!', 'info');
            }

            // Always allow "Passa" and "Risolvi"
            if (elements.passBtn) {
                elements.passBtn.style.display = 'inline-block';
                elements.passBtn.disabled = false;
                elements.passBtn.textContent = isDecision ? 'PASSA IL TURNO' : 'PASSA';
            }
            if (solveGroup) solveGroup.style.display = 'block';

            checkFinalRoundBanner();
            renderPlayersList();
            return; // EXIT EARLY
        }
    } else {
        // Global resets for normal rounds
        if (vowelGroup) vowelGroup.style.display = 'flex';
        if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'none';
        hideFinalRoundBanner();
    }
    // ------------------------------------------

    if (phase === 'express') {
        spinBtn.style.display = 'none';
        consonantContainer.style.display = 'none';
        elements.expressContainer.style.display = 'flex';
        elements.expressConsonantInput.focus();
    } else if (phase === 'call_consonant') {
        spinBtn.style.display = 'none';
        consonantContainer.style.display = 'flex';
        elements.expressContainer.style.display = 'none';

        // Enable inputs inside container
        elements.consonantInput.disabled = false;
        elements.consonantBtn.disabled = false;
        elements.consonantInput.focus();

        // Add blinking effect to guide user
        elements.consonantInput.classList.add('input-blink');
    } else {
        // Idle or Choose Action or Spinning
        spinBtn.style.display = 'block';
        consonantContainer.style.display = 'none';
        elements.expressContainer.style.display = 'none';
        if (spinBtn) spinBtn.textContent = 'GIRA IL CERCHIO';

        // Enable Spin if allowed
        spinBtn.disabled = !(phase === 'idle' || phase === 'choose_action') || allConsRevealed;

        // Remove blinking
        elements.consonantInput.classList.remove('input-blink');
    }

    const isIdleOrAction = (phase === 'choose_action' || phase === 'idle');

    // Vowel input (Hide standard during express)
    if (vowelGroup) {
        if (phase === 'express') {
            vowelGroup.style.opacity = '0.3';
            vowelGroup.style.pointerEvents = 'none';
        } else {
            vowelGroup.style.opacity = '1';
            vowelGroup.style.pointerEvents = 'auto';
        }
    }

    const player = getCurrentPlayer();
    const canBuyVowel = (isIdleOrAction && (gameState.partialScores[player?.name] >= VOWEL_COST));
    elements.vowelInput.disabled = !canBuyVowel;
    elements.vowelBtn.disabled = !canBuyVowel;

    // Pass button (available only if consonants finished and it's player choice time)
    if (elements.passBtn) {
        if (gameState.allConsonantsRevealed && isIdleOrAction) {
            elements.passBtn.style.display = 'block';
            elements.passBtn.disabled = false;
        } else {
            elements.passBtn.style.display = 'none';
            elements.passBtn.disabled = true;
        }
    }

    renderPlayersList();
}

// ===== AI Fetch (DATABASE STATICO PRIMARIO) =====
// ===== AI Fetch (Con Few-Shot Prompting e Fallback) =====
async function fetchPuzzleFromAI() {
    const API_KEY = ''; // REMOVED FOR SECURITY. MOVE TO SERVER-SIDE OR USE ENV VAR.
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    // 1. Preparazione Esempi (Few-Shot Prompting mirato alla lunghezza corretta)
    let examplesText = "";
    if (typeof PUZZLE_DATABASE !== 'undefined' && PUZZLE_DATABASE.length > 0) {
        // Filtra solo esempi che hanno lunghezza simile al target (28-38 lettere) per insegnare la lunghezza giusta
        const validExamples = PUZZLE_DATABASE.filter(p => {
            const len = p.phrase.replace(/\s/g, '').length;
            return len >= 28 && len <= 38;
        });

        // Se non ce ne sono abbastanza, usa tutto il DB
        const pool = validExamples.length >= 4 ? validExamples : PUZZLE_DATABASE;

        const shuffled = [...pool].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 4);
        examplesText = selected.map(p => `- ${p.hint}: ${p.phrase}`).join("\n");
    }

    const categories = ["CINEMA", "MUSICA", "STORIA", "GEOGRAFIA", "LETTERATURA", "SCIENZA", "ARTE", "CURIOSITÀ", "CUCINA", "SPORT", "NATURA", "NATALE", "TRADIZIONI", "VITA QUOTIDIANA"];

    let lastError = null;
    for (let attempt = 1; attempt <= 10; attempt++) { // Aumentiamo a 10 tentativi per trovare la lunghezza perfetta
        const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomSeed = Math.random().toString(36).substring(7);

        try {
            console.log(`Groq AI Attempt ${attempt}/10 (Category: ${chosenCategory})...`);

            // PROMPT AGGIORNATO (User Request: Apostrofi SI, 30-40 caratteri totali)
            const systemPrompt = `Sei il capo autore di "Cerchio Magico". Genera un database JSON di enigmi con uno stile evocativo, concreto e pop.

Regole Tassative:

SÌ Apostrofi: Usa correttamente gli apostrofi quando la grammatica lo richiede (es. "L'AMORE", "SULL'ALTARE", "D'AMPEZZO").

Lunghezza Caratteri: Ogni frase deve avere una lunghezza totale compresa tra 30 e 40 caratteri (spazi e apostrofi inclusi).

Stile Nominale e Concreto: Evita strutture Soggetto+Verbo banali. Usa "istantanee" di vita vera, titoli di giornale o didascalie sensoriali.

Temi: Brand iconici, tradizioni italiane, cinema cult, sport, curiosità reali e abitudini quotidiane.

Hint: Massimo 3 parole, molto specifico e pertinente.

Esempi di riferimento (Modello Stilistico):

{"hint": "UNA POLTRONA PER DUE", "phrase": "TRUFFE GAG E TRAVESTIMENTI NEL CULT DI ITALIA UNO"}

{"hint": "LA GIOCONDA", "phrase": "IL MISTERO DEL SORRISO DI MONNA LISA AL LOUVRE"}

{"hint": "FESTIVAL DI SANREMO", "phrase": "FIORI E CANZONI SUL PALCO DEL TEATRO ARISTON"}

FORMATO RISPOSTA JSON: {"hint": "HINT", "phrase": "FRASE"}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: `Categoria: ${chosenCategory}. DAMMI UNA FRASE TRA 30 E 40 CARATTERI TOTALI.` }
                    ],
                    temperature: 0.9,
                    max_tokens: 150,
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error("Formato risposta API non valido");
            }

            const content = data.choices[0].message.content;
            const result = JSON.parse(content);

            if (!result.phrase || !result.hint) throw new Error("JSON incompleto");

            const phrase = result.phrase.toUpperCase().trim();
            const hint = result.hint.toUpperCase().trim();

            // Validate Total Length (including spaces/apostrophes as requested)
            const totalLength = phrase.length;

            // Strict pre-validation (30-40 range)
            if (totalLength < 30 || totalLength > 40) {
                console.warn(`AI: Frase scartata per lunghezza (${totalLength}): ${phrase}`);
                continue;
            }

            console.log("Frase generata dall'AI:", phrase);
            console.log("Hint generato:", hint);
            return { phrase, hint: hint };

        } catch (e) {
            console.error(`Attempt ${attempt} failed:`, e);
            lastError = e;
        }
    }

    // Se l'AI fallisce, usiamo il Database Statico (PUZZLE_DATABASE) come primo fallback
    if (typeof PUZZLE_DATABASE !== 'undefined' && PUZZLE_DATABASE.length > 0) {
        console.warn("AI fallita, uso PUZZLE_DATABASE.");
        const randomIndex = Math.floor(Math.random() * PUZZLE_DATABASE.length);
        const puzzle = PUZZLE_DATABASE[randomIndex];
        return {
            phrase: puzzle.phrase.toUpperCase(),
            hint: puzzle.hint.toUpperCase()
        };
    }

    throw lastError || new Error("Impossibile generare frase e nessun DB statico disponibile.");
}

// ===== WebSocket Functions =====
async function createLobby() {
    try {
        const response = await fetch(`${API_URL}/api/lobby/create`, { method: 'POST' });
        const data = await response.json();
        currentLobbyId = data.lobbyId;

        socket = io(API_URL);
        socket.on('connect', () => {
            socket.emit('host:join', currentLobbyId);
        });

        socket.on('host:joined', () => {
            console.log('Host joined lobby:', currentLobbyId);
        });

        socket.on('lobby:updated', (data) => {
            // Update players from lobby
            if (data.players) {
                const previousCount = gameState.players.length;
                gameState.players = data.players.map(p => ({ name: p.name }));
                gameState.players.forEach(p => {
                    if (!gameState.partialScores[p.name]) {
                        gameState.partialScores[p.name] = 0;
                        gameState.totalScores[p.name] = 0;
                    }
                });

                console.log('Lobby updated - Players:', gameState.players.length, gameState.players);

                console.log('Lobby updated - Players:', gameState.players.length, gameState.players);

                // Show message if new player joined
                if (data.players.length > previousCount && previousCount > 0) {
                    const newPlayer = data.players[data.players.length - 1];
                    showMessage(`${newPlayer.name} si è unito!`, 'success');
                }

                // Update connected players list in setup screen
                const playersListEl = document.getElementById('connected-players-list');
                if (playersListEl) {
                    if (data.players.length === 0) {
                        playersListEl.innerHTML = '<li style="color: #999; font-size: 12px;">Nessun giocatore ancora...</li>';
                    } else {
                        playersListEl.innerHTML = data.players.map(p =>
                            `<li style="color: #667eea; font-size: 14px; padding: 4px 0; font-weight: 600;">✓ ${p.name}</li>`
                        ).join('');
                    }
                }

                // Show start button if players are connected and in mobile mode
                const startBtnMobile = document.getElementById('start-game-btn-mobile');
                const mobileModeCheckbox = document.getElementById('enable-mobile-mode');
                const isMobileEnabled = mobileModeCheckbox && mobileModeCheckbox.checked;

                console.log('Checking start button - Mobile enabled:', isMobileEnabled, 'Players:', data.players.length);

                if (startBtnMobile && isMobileEnabled && data.players.length > 0) {
                    startBtnMobile.style.display = 'block';
                    console.log('Start button shown');
                    // Hide "Avanti" button when players are connected
                    const nextBtn = document.getElementById('next-step-btn');
                    if (nextBtn) {
                        nextBtn.style.display = 'none';
                    }
                } else if (startBtnMobile && (!isMobileEnabled || data.players.length === 0)) {
                    startBtnMobile.style.display = 'none';
                }

                if (elements.gameScreen.classList.contains('active')) {
                    renderPlayersList();
                }
            }
        });

        socket.on('player:action', (action) => {
            handlePlayerAction(action);
        });

        return currentLobbyId;
    } catch (error) {
        console.error('Error creating lobby:', error);
        return null;
    }
}

function syncGameState() {
    if (!socket || !currentLobbyId) return;

    // Convert Sets to Arrays for JSON serialization
    const stateToSync = {
        ...gameState,
        revealedLetters: Array.from(gameState.revealedLetters),
        usedLetters: Array.from(gameState.usedLetters),
        players: gameState.players.map(p => ({ name: p.name }))
    };

    socket.emit('host:sync-state', { lobbyId: currentLobbyId, gameState: stateToSync });
}

function handlePlayerAction(action) {
    const player = gameState.players.find(p => p.name === action.playerName);
    if (!player) return;

    const playerIndex = gameState.players.indexOf(player);
    const isCurrentPlayer = gameState.currentPlayerIndex === playerIndex;

    if (!isCurrentPlayer) {
        showMessage(`Azione da ${action.playerName} ignorata: non è il suo turno`, 'error');
        return;
    }

    switch (action.type) {
        case 'spin-wheel':
            if (gameState.wheelPhase === 'idle' || gameState.wheelPhase === 'choose_action') {
                spinWheel();
            }
            break;
        case 'call-consonant':
            if (gameState.wheelPhase === 'call_consonant') {
                elements.consonantInput.value = action.letter;
                callConsonant();
            } else if (gameState.wheelPhase === 'express') {
                elements.expressConsonantInput.value = action.letter;
                callExpressConsonant();
            }
            break;
        case 'buy-vowel':
            if (gameState.wheelPhase === 'choose_action' || gameState.wheelPhase === 'idle') {
                elements.vowelInput.value = action.letter;
                buyVowel();
            } else if (gameState.wheelPhase === 'express') {
                elements.expressVowelInput.value = action.letter;
                buyExpressVowel();
            }
            break;
        case 'solve':
            elements.solutionInput.value = action.solution;
            trySolve();
            break;
        case 'pass':
            if (gameState.allConsonantsRevealed) {
                passTurn();
            }
            break;
    }
}

// ===== Game Start =====

// startGameLocal is now the main entry point for a new manche
async function startGameLocal() {

    if (!gameState.currentManche) {
        gameState.currentManche = 1;
    } else {
        gameState.currentManche++;
    }

    // Shields (hasShield) are preserved across manches
    // gameState.hasShield = {}; // Don't reset

    // Increase the TOP VALUE segment value each manche (1000, 2000, 3000, 4000, 5000)
    const base1000Value = 1000;
    const currentWheelTopValue = base1000Value * gameState.currentManche;
    const topSegment = WHEEL_SEGMENTS.find(s => s.isTopValue);
    if (topSegment) {
        topSegment.value = currentWheelTopValue;
        topSegment.label = `${currentWheelTopValue}€`;
    }
    renderWheelToCache();

    // Fixed rotation: Manche 1 -> Player 0, Manche 2 -> Player 1, etc.
    gameState.currentPlayerIndex = (gameState.currentManche - 1) % gameState.players.length;

    // Get phrase from DB (AI Disabled)
    showScreen('game-screen');

    // Selezione diretta da PUZZLE_DATABASE
    // Selezione diretta da PUZZLE_DATABASE con pool di frasi usate
    let valid = false;
    let attempts = 0;

    // Ensure usedPhrases set exists
    if (!gameState.usedPhrases) {
        gameState.usedPhrases = new Set();
    }

    // Reset used phrases if all have been used
    if (gameState.usedPhrases.size >= PUZZLE_DATABASE.length) {
        console.log('All phrases used! Resetting pool.');
        gameState.usedPhrases.clear();
    }

    while (!valid && attempts < 1000) {
        attempts++;
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];

        // Check uniqueness and size
        const normalized = normalizePhrase(randomPuzzle.phrase);
        if (!gameState.usedPhrases.has(normalized) && canFitOnBoard(randomPuzzle.phrase)) {
            gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
            gameState.originalPhrase = randomPuzzle.phrase;
            gameState.hint = randomPuzzle.hint;
            gameState.usedPhrases.add(normalized);
            console.log(`[DB] Frase Scelta: "${gameState.phrase}" - Hint: "${gameState.hint}"`);
            valid = true;
        }
    }
    if (!valid) {
        // Fallback: Pick any valid one if loop failed (shouldn't happen with reset)
        const fallback = PUZZLE_DATABASE.find(p => canFitOnBoard(p.phrase)) || OFFLINE_PHRASES[0];
        gameState.phrase = sanitizePhrase(fallback.phrase);
        gameState.originalPhrase = fallback.phrase;
        gameState.hint = fallback.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.wheelPhase = 'idle';

    // --- FINAL ROUND INIT (LOCAL) ---
    if (gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_spin';
        gameState.finalSpinComplete = false;
        gameState.finalRoundValue = 0;
    }
    // -------------------------------

    gameState.pendingWheelValue = null;
    gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

    elements.popupMessage.style.display = 'none';
    elements.modalOverlay.style.display = 'none';

    elements.mancheNumber.textContent = gameState.currentManche;
    elements.hintText.textContent = gameState.hint;
    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';

    createBoard();
    drawWheel(0);
    renderPlayersList();
    updateUI();

    showPopup(`<div class="popup-manche-start">
        <div class="popup-manche-number">MANCHE ${gameState.currentManche}</div>
        <div class="popup-category-label">Categoria:</div>
        <div class="popup-manche-hint-large">${gameState.hint}</div>
        <div class="popup-turn-player">INIZIA IL ROUND:<br><span class="popup-name">${getCurrentPlayer().name}</span></div>
    </div>`, 4000, 'transparent-wrapper');

    // Sync initial state if in mobile mode
    if (isMobileMode) {
        syncGameState();
    }
}

// function startNewManche is essentially the same as startGameLocal but implies a new round.
// We can alias it or define it to handle round reset if needed.
function startNewManche() {
    startGameLocal();
}

function newGame() {
    soundManager.playClick();
    showScreen('setup-screen');
    elements.modeSelection.style.display = 'block';

    // Hide specific setup screens
    if (elements.setupLocalPlayers) elements.setupLocalPlayers.style.display = 'none';
    if (elements.setupLocalNames) elements.setupLocalNames.style.display = 'none';
    if (elements.setupSmartphoneMode) elements.setupSmartphoneMode.style.display = 'none';

    // Reset Game State for new game
    gameState.currentManche = null;
    gameState.players = [];
    gameState.usedPhrases = new Set();
    gameState.totalScores = {};
    hideFinalRoundBanner();
}

// ===== Setup Logic =====
let setupPlayerCount = 2; // Default for local mode

// --- Mode Selection ---
if (elements.modeLocalBtn) {
    elements.modeLocalBtn.addEventListener('click', () => {
        soundManager.playClick();
        isMobileMode = false;
        elements.modeSelection.style.display = 'none';
        elements.setupLocalPlayers.style.display = 'flex';
    });
}

if (elements.nextLocalNamesBtn) {
    elements.nextLocalNamesBtn.addEventListener('click', () => {
        soundManager.playClick();
        elements.setupLocalPlayers.style.display = 'none';
        elements.setupLocalNames.style.display = 'flex';
        renderLocalNameInputs();
    });
}

if (elements.backLocalPlayersBtn) {
    elements.backLocalPlayersBtn.addEventListener('click', () => {
        soundManager.playClick();
        elements.setupLocalNames.style.display = 'none';
        elements.setupLocalPlayers.style.display = 'flex';
    });
}

if (elements.modeSmartphoneBtn) {
    elements.modeSmartphoneBtn.addEventListener('click', () => {
        isMobileMode = true;
        elements.modeSelection.style.display = 'none';
        elements.setupSmartphoneMode.style.display = 'flex';
        initSmartphoneLobby();
    });
}

if (elements.backModeBtns) {
    elements.backModeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            // Reset to mode selection
            if (elements.setupLocalPlayers) elements.setupLocalPlayers.style.display = 'none';
            if (elements.setupLocalNames) elements.setupLocalNames.style.display = 'none';
            elements.setupSmartphoneMode.style.display = 'none';
            elements.modeSelection.style.display = 'block';

            // Clean up lobby if needed
            if (socket) {
                socket.disconnect();
                socket = null;
            }
        });
    });
}

// --- Local Mode Logic ---
// Player Count Input
if (elements.playerCountInput) {
    elements.playerCountInput.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val < 2) val = 2;
        if (val > 10) val = 10;
        setupPlayerCount = val;
        renderLocalNameInputs();
    });
}

function renderLocalNameInputs() {
    if (!elements.localNamesContainer) return;
    elements.localNamesContainer.innerHTML = '';

    for (let i = 1; i <= setupPlayerCount; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `<input type="text" id="player-name-${i}" placeholder="Giocatore ${i}">`;
        elements.localNamesContainer.appendChild(div);
    }
}

if (elements.startLocalGameBtn) {
    elements.startLocalGameBtn.addEventListener('click', () => {
        const players = [];
        for (let i = 1; i <= setupPlayerCount; i++) {
            const nameInput = document.getElementById(`player-name-${i}`);
            let name = nameInput.value.trim() || nameInput.placeholder;
            players.push({ name: name, id: 'local-' + i });
        }

        startGameDirectly(players);
    });
}

// --- Smartphone Mode Logic ---
function initSmartphoneLobby() {
    socket = io(API_URL);

    // Create Lobby
    // Create Lobby
    fetch(`${API_URL}/api/lobby/create`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            currentLobbyId = data.lobbyId;
            if (elements.bigLobbyIdDisplay) elements.bigLobbyIdDisplay.textContent = currentLobbyId;

            // Use window.location.host as primary (works on Render/Public URLs)
            // Use server IP only as fallback for local network play
            const currentHost = window.location.host;
            const isLocal = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');
            
            const host = (isLocal && data.localIp) ? `${data.localIp}:${data.port || 3000}` : currentHost;
            const altHost = (isLocal && data.hostname) ? `${data.hostname}:${data.port || 3000}` : null;
            const protocol = window.location.protocol;
            
            const mobileLink = `${protocol}//${host}/mobile.html`;
            const altMobileLink = altHost ? `${protocol}//${altHost}/mobile.html` : null;

            if (elements.bigMobileLink) {
                let html = `<a href="${mobileLink}" target="_blank" style="color: #00d4ff; text-decoration: none;">${mobileLink}</a>`;
                if (altMobileLink) {
                    html += `<div style="font-size: 0.6em; opacity: 0.6; margin-top: 5px;">Alt: ${altMobileLink}</div>`;
                }
                elements.bigMobileLink.innerHTML = html;
                
                // Inject QR Code (Use hostname if available as it's often more stable on Macs/iPhones)
                if (elements.lobbyQrContainer) {
                    const qrData = altMobileLink || mobileLink;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
                    elements.lobbyQrContainer.innerHTML = `<img src="${qrUrl}" alt="Scan to join" />`;
                }
            }

            // Host joins
            socket.emit('host:join', currentLobbyId);
        });

    socket.on('host:joined', () => {
        console.log('Host joined lobby:', currentLobbyId);
    });

    socket.on('lobby:updated', (data) => {
        console.log('Lobby updated:', data);
        renderBigLobbyPlayers(data.players);

        // Enable start button if at least 2 players
        if (elements.startSmartphoneGameBtn) {
            elements.startSmartphoneGameBtn.disabled = data.players.length < 2;
            if (data.players.length >= 2) {
                elements.startSmartphoneGameBtn.innerHTML = `AVVIA PARTITA (${data.players.length})`;
            } else {
                elements.startSmartphoneGameBtn.innerHTML = `IN ATTESA DI GIOCATORI... (${data.players.length}/2)`;
            }
        }

        // Auto-refresh players if needed for game state
        gameState.players = data.players;
    });

    socket.on('game:started', () => {
        console.log('Game started by server, transitioning host UI...');
        console.log('Players for game:', gameState.players);
        if (gameState.players && gameState.players.length > 0) {
            startGameDirectly(gameState.players);
        } else {
            console.error('CRITICAL: Received game:started but gameState.players is empty!');
            showMessage('Errore: nessun giocatore rilevato nel sistema. Riprova.', 'error');
        }
    });

    socket.on('player:action', handlePlayerAction);

    // Host receives mystery choice from player
    socket.on('lobby:mystery-choice', (choice) => {
        console.log('Received mystery choice from mobile player:', choice);
        // We can just call the resolve function directly, it will close the popup on host too
        resolveMysteryChoice(choice);
        syncGameState(); // Ensure state is synced after mystery choice is resolved
    });
}

function renderBigLobbyPlayers(players) {
    if (!elements.bigPlayersGrid) return;
    elements.bigPlayersGrid.innerHTML = '';

    if (players.length === 0) {
        elements.bigPlayersGrid.innerHTML = '<p style="grid-column: 1/-1; color: #aaa; font-style: italic; font-size: 1.2rem;">In attesa di giocatori...</p>';
        return;
    }

    players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'lobby-player-card';
        const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(player.name)}&radius=50`;
        card.innerHTML = `
            <div class="player-avatar-circle" style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center; font-size: 0;"></div>
            <div class="player-card-name">${player.name}</div>
        `;
        elements.bigPlayersGrid.appendChild(card);
    });
}

if (elements.startSmartphoneGameBtn) {
    elements.startSmartphoneGameBtn.addEventListener('click', () => {
        console.log('Start Smartphone Game Button CLICKED');
        if (!socket || !currentLobbyId) {
            console.error('Socket or Lobby ID missing when start button clicked');
            return;
        }

        if (gameState.players.length < 2) {
            console.warn('Click ignored: not enough players');
            return;
        }

        console.log('Emitting host:start-game for lobby:', currentLobbyId);
        socket.emit('host:start-game', currentLobbyId);
    });
}

// Common Start Game Function
function startGameDirectly(players) {
    console.log('startGameDirectly called with:', players);
    if (!players || players.length === 0) {
        console.error('Cannot start game directly with 0 players');
        return;
    }

    // Shuffle players once at the start to have a random but fixed order for the game
    gameState.players = players.sort(() => Math.random() - 0.5);
    gameState.currentPlayerIndex = 0;
    gameState.totalScores = {};
    gameState.partialScores = {};

    gameState.players.forEach(p => {
        gameState.totalScores[p.name] = 0;
        gameState.partialScores[p.name] = 0;
    });

    console.log('Transitioning screens...');
    if (elements.setupScreen) elements.setupScreen.classList.remove('active');
    if (elements.gameScreen) elements.gameScreen.classList.add('active');

    console.log('Starting manche...');
    startNewManche();
    renderPlayersList();
}

// Socket game start handler for smartphone mode
if (socket) {
    // This part is inside initSmartphoneLobby usually, but we need to handle the transition
}
// Note: 'game:started' is emitted to players, host now listens for it too to transition.
elements.spinBtn?.addEventListener('click', spinWheel);
elements.consonantBtn?.addEventListener('click', callConsonant);
elements.vowelBtn?.addEventListener('click', buyVowel);
elements.solveBtn?.addEventListener('click', trySolve);
elements.passBtn?.addEventListener('click', passTurn);

elements.newGameBtn?.addEventListener('click', newGame);

elements.consonantInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') callConsonant();
});
elements.consonantInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

elements.vowelInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buyVowel();
});
elements.vowelInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

elements.solutionInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') trySolve();
});

// Express UI Listeners
elements.expressConsonantBtn?.addEventListener('click', callExpressConsonant);
elements.expressConsonantInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') callExpressConsonant();
});
elements.expressVowelBtn?.addEventListener('click', buyExpressVowel);
elements.expressVowelInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buyExpressVowel();
});
elements.expressConsonantInput?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
elements.expressVowelInput?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });

// Final Round Listeners
if (elements.finalConsonantBtn) elements.finalConsonantBtn.addEventListener('click', callFinalConsonant);
if (elements.finalConsonantInput) {
    elements.finalConsonantInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') callFinalConsonant();
    });
    elements.finalConsonantInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
}

if (elements.finalVowelBtn) elements.finalVowelBtn.addEventListener('click', callFinalVowel);
if (elements.finalVowelInput) {
    elements.finalVowelInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') callFinalVowel();
    });
    elements.finalVowelInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
}

function markPhraseAsWon(phrase) {
    if (!phrase) return;
    const normalized = normalizePhrase(phrase);
    gameState.excludedPhrases.add(normalized);

    // Save to localStorage
    try {
        const saved = localStorage.getItem('won_phrases');
        let list = saved ? JSON.parse(saved) : [];
        if (!list.includes(phrase)) {
            list.push(phrase);
            localStorage.setItem('won_phrases', JSON.stringify(list));
            console.log(`[LOCAL] Phrase marked as won permanently: "${phrase}"`);
        }
    } catch (e) {
        console.error("Error saving won phrase to localStorage:", e);
    }

    // NEW: Also call server to remove from puzzles.js file
    console.log(`[CLIENT] Requesting server to remove: "${phrase}"`);
    fetch(`${API_URL}/api/puzzle/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phrase })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                console.log(`[SERVER SUCCESS] Phrase removed from puzzles.js: "${phrase}"`);
            } else {
                console.warn(`[SERVER FAIL] Phrase not found in file: "${phrase}"`);
            }
        })
        .catch(err => {
            console.error('[SERVER ERROR] Error removing phrase:', err);
            console.info('%cTIP: Se ricevi 404, RIAVVIA il server (sh start_game.sh) e FORZA il refresh (CMD+SHIFT+R)!', 'background: #222; color: #bada55');
        });
}

// ===== Express Mode Utility =====
function checkExpressBanner() {
    let banner = document.getElementById('express-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'express-banner';
        banner.className = 'express-banner';
        document.body.appendChild(banner);
    }
    const player = getCurrentPlayer();
    const totalExpress = gameState.expressAccumulated;

    banner.innerHTML = `
        <div class="express-banner-icon">⚡</div>
        <div class="express-banner-content">
            <span class="express-banner-title">MEGATURNO</span>
            <div class="express-banner-divider"></div>
            <span class="express-banner-player">${player.name}</span>
            <div class="express-banner-amount">€${totalExpress}</div>
        </div>
    `;
    banner.style.display = 'flex';
}

function flashExpressBanner(text) {
    const banner = document.getElementById('express-banner');
    if (!banner) return;
    const el = document.createElement('div');
    el.className = 'express-banner-flash ' + (text.startsWith('+') ? 'flash-gain' : 'flash-loss');
    el.textContent = text;
    banner.appendChild(el);
    setTimeout(() => el.remove(), 900);
}

function hideExpressBanner() {
    const banner = document.getElementById('express-banner');
    if (banner) banner.style.display = 'none';
}

// ===== Final Round Functions =====
function callFinalConsonant() {
    const letter = elements.finalConsonantInput.value.trim().toUpperCase();
    elements.finalConsonantInput.value = '';
    const player = getCurrentPlayer();

    if (!letter) return;
    if (isVowel(letter)) {
        showMessage('Solo CONSONANTI qui!', 'error');
        return;
    }
    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        showMessage(`Lettera "${letter}" già chiamata!`, 'error');
        return;
    }

    gameState.usedLetters.add(normalized);
    if (isMobileMode) syncGameState();

    const occurrences = countLetterOccurrences(letter);
    if (occurrences > 0) {
        // Correct Guess - Incremental update for satisfy
        const earnings = gameState.finalRoundValue; // Value per occurrence

        revealLetter(letter, true, () => {
            gameState.partialScores[player.name] += earnings;
            renderPlayersList();
            soundManager.playCash();
            if (isMobileMode) syncGameState();
        });

        soundManager.playCorrect();
        showMessage(`🎉 "${letter}" trovata ${occurrences} volta/e! (+€${occurrences * earnings})`, 'success');

        // Delay until all instances are revealed
        const totalDelay = occurrences * 1500;
        setTimeout(() => {
            if (checkWin()) {
                endManche();
            } else {
                // Transition to decision phase: MUST Solve or Pass
                gameState.wheelPhase = 'final_decision';
                updateUI();
                if (isMobileMode) syncGameState();
            }
        }, totalDelay + 500);
    } else {
        // Incorrect Guess -> Invalid turn -> Pass
        soundManager.playError();
        showMessage(`❌ "${letter}" non c'è. Turno perso.`, 'error');
        showPopup(popup('❌', `"${letter}" NON PRESENTE`, 'Turno perso'), 2000, 'danger');
        setTimeout(passTurn, 2500);
    }
}

function callFinalVowel() {
    const letter = elements.finalVowelInput.value.trim().toUpperCase();
    elements.finalVowelInput.value = '';
    const player = getCurrentPlayer();

    if (!letter) return;
    if (!isVowel(letter)) {
        showMessage('Solo VOCALI qui!', 'error');
        return;
    }
    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        showMessage(`Vocale "${letter}" già chiamata!`, 'error');
        return;
    }

    gameState.usedLetters.add(normalized);
    if (isMobileMode) syncGameState();

    const occurrences = countLetterOccurrences(letter);
    if (occurrences > 0) {
        // Correct Guess (Free, no winnings)
        revealLetter(letter, true, null);
        soundManager.playCorrect();
        showMessage(`🎉 "${letter}" trovata ${occurrences} volta/e! (Gratis)`, 'success');

        const totalDelay = occurrences * 1500;
        setTimeout(() => {
            if (checkWin()) {
                endManche();
            } else {
                // Transition to decision phase: MUST Solve or Pass
                gameState.wheelPhase = 'final_decision';
                updateUI();
                if (isMobileMode) syncGameState();
            }
        }, totalDelay + 500);
    } else {
        // Incorrect Guess -> Pass
        soundManager.playError();
        showMessage(`❌ "${letter}" non c'è. Turno perso.`, 'error');
        showPopup(popup('❌', `"${letter}" NON PRESENTE`, 'Turno perso'), 2000, 'danger');
        setTimeout(passTurn, 2500);
    }
}

function checkFinalRoundBanner() {
    let banner = document.getElementById('final-round-banner');
    if (banner) {
        banner.style.display = 'flex';
        const valEl = document.getElementById('final-banner-value');
        if (valEl) valEl.textContent = `€${gameState.finalRoundValue}`;
    }
}

function hideFinalRoundBanner() {
    const banner = document.getElementById('final-round-banner');
    if (banner) banner.style.display = 'none';
}

// Prevent accidental navigation (back gesture, tab close) during an active game
window.addEventListener('beforeunload', (e) => {
    if (gameState.currentManche) {
        e.preventDefault();
        e.returnValue = '';
    }
});
