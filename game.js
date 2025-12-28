// ===== Sound Manager =====
const soundManager = {
    audioCtx: null,

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
        const audio = new Audio('foundletter.mp3');
        audio.play().catch(e => console.warn('Audio play error:', e));
    },

    playCash() {
        // Requested sound for money gain
        const audio = new Audio('cash.mp3');
        audio.play().catch(e => console.warn('Audio play error:', e));
    },

    playError() {
        // Play external MP3
        const audio = new Audio('notfoundletter.mp3');
        audio.play().catch(e => console.warn('Audio play error:', e));
    },

    playReveal() {
        this.playTone(800, 'sine', 0.1, 0.05);
    },

    playClick() {
        const audio = new Audio('click.mp3');
        audio.play().catch(e => console.warn('Audio play error:', e));
    },

    // CROWD REACTIONS
    playCrowdApplause() {
        // Applause: white noise burst
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

    playWin() {
        // 1. Play external MP3 (Voice/Jingle)
        const winAudio = new Audio('fraseindovinata.mp3');
        winAudio.play().catch(e => console.warn("Audio play error:", e));

        // 2. Play Synthetic Victory Fanfare (Together)
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

    playWheelTick() {
        // Play rotation.mp3 as requested
        const audio = new Audio('rotation.mp3');
        audio.play().catch(e => console.warn('Audio play error:', e));
    },

    // Aliases for missing methods
    playSpin() {
        this.playWheelTick();
    },

    playBonus() {
        this.playCorrect();
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
    hint: '',
    normalizedPhrase: '',
    revealedLetters: new Set(),
    usedLetters: new Set(),
    players: [],
    currentPlayerIndex: 0,
    currentManche: null,
    partialScores: {},
    totalScores: {},
    hasJolly: {}, // Track which players have Jolly shield
    pendingWheelValue: null,
    nextValueMultiplier: 1, // For Raddoppia (x2)
    wheelPhase: 'idle', // 'idle', 'spinning', 'call_consonant', 'choose_action'
    allConsonantsRevealed: false,
    wheelRotation: 0,
    usedPhrases: new Set() // Track used phrases to avoid duplicates
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
    const FIXED_CAPACITY = 14;

    // Tentativo 1: Area ristretta (per mantenere la forma a scalino 12-10-10-12)
    let contentRows = splitPhraseIntoRows(words, [12, 10, 10, 12]);
    let mode = 'restricted';

    // Tentativo 2: Area estesa (se non ci sta in quella ristretta)
    if (!contentRows) {
        contentRows = splitPhraseIntoRows(words, [12, 14, 14, 12]);
        mode = 'extended';
    }

    if (!contentRows) {
        console.error("Frase troppo lunga per il tabellone!");
        return;
    }

    const verticalOffset = Math.floor((BOARD_ROWS - contentRows.length) / 2);

    for (let row = 0; row < BOARD_ROWS; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'board-row';

        const contentRowIndex = row - verticalOffset;
        const contentRow = (contentRowIndex >= 0 && contentRowIndex < contentRows.length) ? contentRows[contentRowIndex] : null;

        // Offset di partenza dinamico:
        // Righe 0 e 3: sempre 1 (centrate 12 in 14)
        // Righe 1 e 2: partono dalla 2ª casella (index 1) se il contenuto <= 12, altrimenti da 0
        let startCol;
        if (row === 0 || row === 3) {
            startCol = 1;
        } else {
            startCol = (contentRow && contentRow.length <= 12) ? 1 : 0;
        }

        for (let col = 0; col < FIXED_CAPACITY; col++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';

            // Celle fisicamente non esistenti per la forma a scalino
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
    // Prova prima l'area ristretta (forma a scalino 12-10-10-12)
    let contentRows = splitPhraseIntoRows(words, [12, 10, 10, 12]);
    if (contentRows) return true;

    // Prova l'area estesa (12-14-14-12)
    contentRows = splitPhraseIntoRows(words, [12, 14, 14, 12]);
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

function revealLetter(letter, animate = true) {
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

                    setTimeout(() => tile.classList.remove('just-revealed'), 1100);
                }, index * 1500); // 1.5s delay between each letter per user request
            } else {
                tile.classList.add('revealed');
            }
        }
    });
    gameState.revealedLetters.add(normalizedLetter);
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

    // Sort by score descending (richest first)
    playersWithIndex.sort((a, b) => b.score - a.score);

    playersWithIndex.forEach((item) => {
        const li = document.createElement('li');
        // Check if this player is the current active player
        li.className = item.originalIndex === gameState.currentPlayerIndex ? 'active' : '';

        // Add Jolly shield if player has it (with pulsing animation)
        const jollyIcon = gameState.hasJolly[item.player.name] ? '<span class="shield-icon">🛡️</span>' : '';

        li.innerHTML = `
            <span class="player-name">${item.player.name} ${jollyIcon}</span>
            <span class="player-score">€${item.score}</span>
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
        li.innerHTML = `
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
    gameState.wheelPhase = 'idle';
    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';
    updateUI();
    if (isMobileMode) syncGameState();

    const nextPlayer = getCurrentPlayer();
    // Show turn popup (without hint - hint only at manche start)
    showPopup(`<div class="popup-turn">TURNO DI<br><span class="popup-name">${nextPlayer.name}</span></div>`, 2500);
}

// ===== Wheel Segments (Patterned: Purple -> DeepBlue -> DarkBlue -> Blue -> LiteBlue -> Special) =====
// Palette:
// Purple: #7e22ce (Purple 700)
// Deep Blue: #172554 (Blue 950)
// Dark Blue: #1e3a8a (Blue 900)
// Blue: #2563eb (Blue 600)
// Light Blue: #60a5fa (Blue 400)
// Specials: 1000, PASSA, BANCAROTTA, RADDOPPIA
// Note: SCUDO replaces the "Purple" slot in the last group to fit.

const WHEEL_SEGMENTS = [
    // Group 1
    { value: 300, color: '#7e22ce', label: '300€' }, // Purple
    { value: 200, color: '#172554', label: '200€' }, // Deep Blue
    { value: 700, color: '#1e3a8a', label: '700€' }, // Dark Blue
    { value: 500, color: '#2563eb', label: '500€' }, // Blue
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' }, // PASSA (near 1000)
    { value: 1000, color: 'RAINBOW', label: '1000€', glowing: true }, // 1000 Rainbow

    // Group 2
    { value: 'BANCAROTTA', color: '#111827', label: 'BANCAROTTA' }, // Near 1000
    { value: 350, color: '#7e22ce', label: '350€' }, // Purple
    { value: 300, color: '#172554', label: '300€' }, // Deep Blue
    { value: 450, color: '#1e3a8a', label: '450€' }, // Dark Blue
    { value: 700, color: '#2563eb', label: '700€' }, // Blue
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' }, // PASSA 1

    // Group 3
    { value: 'RADDOPPIA', color: 'GOLD', label: 'RADDOPPIA', glowing: true }, // Near PASSA 1
    { value: 400, color: '#7e22ce', label: '400€' }, // Purple
    { value: 800, color: '#1e3a8a', label: '800€' }, // Dark Blue
    { value: 300, color: '#2563eb', label: '300€' }, // Blue
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' }, // PASSA (added near ?500)
    { value: '?500', color: '#14532D', label: '?500' }, // DARK GREEN MYSTERY

    // Group 4
    { value: 'SCUDO', color: '#9333EA', label: 'SCUDO' }, // SCUDO
    { value: 300, color: '#172554', label: '300€' }, // Deep Blue
    { value: 500, color: '#2563eb', label: '500€' }, // Blue
    { value: 200, color: '#60a5fa', label: '200€' }, // Light Blue
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' }, // PASSA 2
    { value: 200, color: '#7e22ce', label: '200€' } // Extra value
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
            if (baseColor === '#FFFFFF') {
                // For White segments (PASSA, ?500, SCUDO), keep center bright
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
        else if (label === 'BANCAROTTA') ctx.fillStyle = '#FFFFFF';
        else if (label === 'SCUDO') ctx.fillStyle = '#FFFFFF';
        else if (label === 'RADDOPPIA') ctx.fillStyle = '#FFFFFF';
        else {
            ctx.fillStyle = '#FFFF00'; // YELLOW text
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4 * scale;
        }

        ctx.textAlign = 'center';
        if (label !== 'PASSA') ctx.lineWidth = 3 * scale;

        const chars = label.replace(/\s/g, '').split('');

        // Text Styling (Refined)
        let fontSize = 21 * scale;
        if (label === 'BANCAROTTA') fontSize = 11 * scale;
        else if (label === 'PASSA') fontSize = 16 * scale;
        else if (label === 'RADDOPPIA') fontSize = 12 * scale;
        else if (label === 'SCUDO') fontSize = 16 * scale;

        ctx.font = `bold ${fontSize}px Outfit, sans-serif`;

        // Text Radius Logic
        // "I testi devono partire in cima come i numeri" 
        // Numbers (21px): 0.86
        let baseRadius = 0.86;

        // Adjust for smaller fonts so the *top* edge aligns at the rim
        if (label === 'SCUDO') baseRadius = 0.87; // 16px
        if (label === 'PASSA') baseRadius = 0.87; // 16px
        if (label === 'RADDOPPIA') baseRadius = 0.88; // 12px
        if (label === 'BANCAROTTA') baseRadius = 0.89; // 11px (Lower font = higher radius)

        let currentRadius = radius * baseRadius;

        // "Letterspacing minimo" -> 0.95
        const charSpacing = 0.95;

        // (Removed Top-Emoji block)

        // Draw Characters
        chars.forEach(char => {
            ctx.save();
            ctx.translate(currentRadius, 0);
            ctx.rotate(Math.PI / 2);

            // "Euro piu piccolino" e Avvicinalo moltissimo allo zero
            if (char === '€') {
                ctx.font = `bold ${fontSize * 0.55}px Outfit, sans-serif`;
            } else {
                ctx.font = `bold ${fontSize}px Outfit, sans-serif`;
            }

            ctx.fillText(char, 0, 0);
            ctx.restore();
            // Extremely tight spacing for the Euro symbol
            const currentSpacing = (char === '€') ? charSpacing * 0.2 : charSpacing;
            currentRadius -= fontSize * currentSpacing;
        });

        // "Scudo: Prima testo poi simbolo, piccolo"
        if (label === 'SCUDO') {
            ctx.save();
            // Position after text (currentRadius is now lower/inner)
            ctx.translate(currentRadius - (5 * scale), 0);
            ctx.rotate(Math.PI / 2);
            ctx.font = `${14 * scale}px serif`; // "Piccolo"
            ctx.fillText('🛡️', 0, 0);
            ctx.restore();
        }
        ctx.restore();
    });
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
}

// ===== Wheel Spinning =====
let wheelAnimationId = null;

function spinWheel() {
    if (gameState.wheelPhase !== 'idle' && gameState.wheelPhase !== 'choose_action') return;
    if (gameState.players[gameState.currentPlayerIndex].score < VOWEL_COST && gameState.wheelPhase === 'choose_action') {
        // ...
    }

    gameState.wheelPhase = 'spinning';
    updateUI();

    // Show Overlay
    const overlay = document.getElementById('wheel-overlay');
    if (overlay) overlay.classList.add('active');

    // Random target segment
    const segmentAngle = 360 / WHEEL_SEGMENTS.length;
    const randomSegmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const resultFragment = WHEEL_SEGMENTS[randomSegmentIndex];

    // Calculate precise target rotation
    // We want the center of the selected segment to end up at 270 degrees (Top)
    // Segment Center relative to 0 rotation = index * angle + angle/2
    const segmentCenter = randomSegmentIndex * segmentAngle + segmentAngle / 2;

    // Required rotation to bring segmentCenter to 270:
    // TargetPos (270) = CurrentPos (segmentCenter) + Rotation
    // Rotation = 270 - segmentCenter
    let targetRotationDelta = 270 - segmentCenter;

    // Normalize delta to be positive [0, 360) for clockwise rotation logic consistency
    targetRotationDelta = (targetRotationDelta % 360 + 360) % 360;

    // We want to add at least 5 full spins
    const minSpins = 5;
    const currentRotation = gameState.wheelRotation;

    // Calculate current position within the 0-360 cycle
    const currentMod = currentRotation % 360;

    // Calculate distance to target from current position
    // We want to go from currentMod to targetRotationDelta in clockwise direction
    let distance = targetRotationDelta - currentMod;

    // If distance is negative (target is behind current), add 360 to go forward
    if (distance < 0) distance += 360;

    // Total target rotation
    const targetRotation = currentRotation + distance + (minSpins * 360);

    const startRotation = currentRotation;
    const totalRotation = targetRotation - startRotation;
    const duration = 5000; // Slower, more suspenseful spin
    const startTime = performance.now();

    // Play tick sounds during spin
    let lastTickSegment = -1;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // REVERTED EASING: Standard Cubic Ease-Out
        const easeOut = 1 - Math.pow(1 - progress, 3);

        const currentRotation = startRotation + totalRotation * easeOut;

        gameState.wheelRotation = currentRotation;
        drawWheel(currentRotation);

        // Play tick sound when passing segments
        // Pointer is at 270 degrees. We check what segment is currently under 270.
        // Segment at 270 = (270 - rotation) normalized
        const pointerAngle = 270;
        const angleUnderPointer = (pointerAngle - currentRotation) % 360;
        const normalizedAngle = (angleUnderPointer + 360) % 360;
        const currentSegment = Math.floor(normalizedAngle / segmentAngle);

        if (currentSegment !== lastTickSegment) {
            soundManager.playWheelTick();
            lastTickSegment = currentSegment;
        }

        if (progress < 1) {
            wheelAnimationId = requestAnimationFrame(animate);
        } else {
            gameState.wheelRotation = targetRotation;
            drawWheel(targetRotation);
            onWheelStop(resultFragment);

            // Hide Overlay after spin
            setTimeout(() => {
                const overlay = document.getElementById('wheel-overlay');
                if (overlay) overlay.classList.remove('active');
            }, 1000);
        }
    }

    wheelAnimationId = requestAnimationFrame(animate);
}

function onWheelStop(result) {
    const player = getCurrentPlayer();

    if (result.value === 'PASSA') {
        soundManager.playError();
        elements.currentWheelValue.textContent = 'PASSA';
        elements.currentWheelValue.className = 'wheel-value passa';
        showPopup(`<div class="popup-passa">PASSA!<br>Turno perso</div>`, 2000);
        setTimeout(passTurn, 2500);
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
        elements.currentWheelValue.textContent = '🛡️';
        elements.currentWheelValue.className = 'wheel-value jolly';
        gameState.pendingWheelValue = 'SCUDO';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        if (isMobileMode) syncGameState();
        showMessage('SCUDO! Chiama una consonante per ottenere la protezione!', 'info');
    } else if (result.value === 'BANCAROTTA') {
        // Check if player has Jolly shield
        if (gameState.hasJolly[player.name]) {
            // Offer choice: use Jolly or accept Bancarotta
            handleBancarottaWithJolly(player);
        } else {
            // Normal Bancarotta - lose ALL scores (partial + total)
            soundManager.playError();
            elements.currentWheelValue.textContent = 'BANCAROTTA';
            elements.currentWheelValue.className = 'wheel-value bancarotta';
            gameState.partialScores[player.name] = 0;
            gameState.totalScores[player.name] = 0; // Lose global score too
            renderPlayersList();
            showPopup(`<div class="popup-bancarotta">💥 BANCAROTTA!<br><br>Hai perso TUTTO il bottino!<br>Montepremi attuale: €0<br>Totali gara: €0</div>`, 4000);
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
        elements.currentWheelValue.textContent = `€${finalValue}`;
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

function handleBancarottaWithJolly(player) {
    const html = `
        <div class="popup-jolly-choice">
            <div class="jolly-choice-title">⚠️ BANCAROTTA!</div>
            <p class="jolly-choice-text">Hai uno scudo Jolly 🛡️<br>Vuoi usarlo per salvarti?</p>
            <div class="mystery-cards-container">
                <!-- Use Jolly -->
                <div class="mystery-card left" onclick="resolveJollyChoice(true)">
                    <div class="card-content">
                        <span class="card-icon">🛡️</span>
                        <span class="card-text">USA<br>JOLLY</span>
                    </div>
                </div>

                <!-- Accept Bancarotta -->
                <div class="mystery-card right" onclick="resolveJollyChoice(false)">
                    <div class="card-content">
                        <span class="card-icon">💥</span>
                        <span class="card-text">ACCETTA<br>BANCAROTTA</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    showPopup(html, 0); // Permanent until choice
}

window.resolveJollyChoice = function (useJolly) {
    const player = getCurrentPlayer();
    elements.modalOverlay.style.display = 'none';
    elements.popupMessage.style.display = 'none';

    if (useJolly) {
        // Use Jolly - keep money, lose shield, KEEP TURN
        soundManager.playReveal();
        gameState.hasJolly[player.name] = false;
        renderPlayersList();
        showPopup(`<div class="popup-jolly-used">🛡️ SCUDO USATO!<br>${player.name} è salvo!</div>`, 2500);
        // Player keeps turn - reset to idle
        setTimeout(() => {
            gameState.wheelPhase = 'idle';
            updateUI();
            showMessage('Sei salvo! Gira di nuovo!', 'success');
        }, 2500);
    } else {
        // Accept Bancarotta - lose ALL money (partial + total), keep shield
        soundManager.playError();
        gameState.partialScores[player.name] = 0;
        gameState.totalScores[player.name] = 0; // Lose global score too
        renderPlayersList();
        showPopup(`<div class="popup-bancarotta">💥 BANCAROTTA!<br><br>Hai perso TUTTO il bottino!<br>Montepremi attuale: €0<br>Totali gara: €0<br><br>(Jolly conservato)</div>`, 4000);
        if (isMobileMode) syncGameState();
        setTimeout(passTurn, 4500);
    }
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
            <div class="mystery-cards-container">
                <!-- Card 1: Risk (500) -->
                <div class="mystery-card left" onclick="resolveMysteryChoice(500)">
                    <div class="card-content">
                        <span class="card-icon">💶</span>
                        <span class="card-text">PRENDI<br>€500</span>
                    </div>
                </div>

                <!-- Card 2: Raffle -->
                <div class="mystery-card right" onclick="resolveMysteryChoice('RAFFLE')">
                    <div class="card-content">
                        <span class="card-icon">🎲</span>
                        <span class="card-text">ESTRAI<br>A SORTE</span>
                    </div>
                </div>
            </div>
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
        // Raffle: Random segment excluding special values (only numeric values)
        const eligible = WHEEL_SEGMENTS.filter(s => typeof s.value === 'number');

        if (eligible.length === 0) {
            console.error('No eligible segments found for raffle!');
            finalValue = 500; // Fallback
        } else {
            const selected = eligible[Math.floor(Math.random() * eligible.length)];
            finalValue = Number(selected.value);
        }

        console.log('Raffle result:', finalValue, 'from', eligible.length, 'eligible segments');
        showPopup(`<div class="popup-mystery-result">ESTRATTO:<br><span class="popup-value">€${finalValue}</span></div>`, 2000);
    } else {
        soundManager.playReveal();
        finalValue = Number(choice);
        showPopup(`<div class="popup-mystery-result">HAI SCELTO:<br><span class="popup-value">€${finalValue}</span></div>`, 2000);
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
        if (isMobileMode) syncGameState(); // Ensure mobile knows it's consonant phase
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

    if (isVowel(letter)) {
        soundManager.playError();
        showMessage('Devi chiamare una CONSONANTE, non una vocale!', 'error');
        showPopup(`<div class="popup-error">HAI CHIAMATO UNA VOCALE!<br>Turno perso</div>`, 2000);
        setTimeout(passTurn, 2500);
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        soundManager.playError();
        const nextPlayer = gameState.players[(gameState.currentPlayerIndex + 1) % gameState.players.length];
        showPopup(`<div class="popup-error-letter">
            <div>❌ LETTERA GIÀ CHIAMATA!</div>
            <div class="popup-letter-wrong-small">${letter}</div>
            <div>Turno perso</div>
            <div class="popup-turn-info">Tocca a: ${nextPlayer.name}</div>
        </div>`, 3000);
        setTimeout(() => {
            showPopup(`<div class="popup-turn">TURNO DI<br><span class="popup-name">${nextPlayer.name}</span></div>`, 2500);
            setTimeout(passTurn, 2800);
        }, 3000);
        return;
    }

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        const player = getCurrentPlayer();
        let earnings = 0;
        let specialAction = null;

        if (gameState.pendingWheelValue === 'RADDOPPIA') {
            const currentScore = gameState.partialScores[player.name] || 0;
            const doubled = currentScore * 2;
            gameState.partialScores[player.name] = doubled;
            specialAction = 'RADDOPPIA';
            earnings = doubled - currentScore; // For display
        } else if (gameState.pendingWheelValue === 'SCUDO') {
            gameState.hasJolly[player.name] = true;
            specialAction = 'SCUDO';
            earnings = 0;
        } else {
            earnings = gameState.pendingWheelValue * occurrences;
            gameState.partialScores[player.name] += earnings;
        }

        revealLetter(letter);
        renderPlayersList();
        if (isMobileMode) syncGameState();

        // Show special popups if needed
        if (specialAction === 'RADDOPPIA') {
            const currentScore = (gameState.partialScores[player.name] || 0) / 2;
            showPopup(`<div class="popup-raddoppia">
                <div class="popup-raddoppia-title">🔥 RADDOPPIA!</div>
                <div class="popup-raddoppia-text">Il tuo montepremi è stato</div>
                <div class="popup-raddoppia-highlight">RADDOPPIATO!</div>
                <div class="popup-raddoppia-amount">Da €${currentScore} a €${currentScore * 2}</div>
            </div>`, 3500);
        } else if (specialAction === 'SCUDO') {
            showPopup(`<div class="popup-jolly">🛡️ SCUDO!<br>${player.name} ha ottenuto uno scudo!</div>`, 2500);
        }

        // Show popup AFTER all letters are revealed (1.5s per letter)
        const delay = occurrences * 1500;
        setTimeout(() => {
            showMessage(`${getCurrentPlayer().name}: +€${earnings}`, 'success');
            soundManager.playCash(); // Delayed cash sound for popup
            soundManager.playCrowdApplause(); // Crowd applause after all revealed

            if (checkWin()) {
                setTimeout(endManche, 1500);
            } else {
                const wasFinished = gameState.allConsonantsRevealed;
                gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

                if (!wasFinished && gameState.allConsonantsRevealed) {
                    showPopup(`<div class="popup-info">CONSONANTI TERMINATE!</div>`, 2500);
                }

                gameState.wheelPhase = 'choose_action';
                gameState.pendingWheelValue = null;
                elements.currentWheelValue.textContent = '-';
                updateUI();
                if (isMobileMode) syncGameState();
            }
        }, delay + 500);
    } else {
        soundManager.playError();
        gameState.pendingWheelValue = null; // Clear value
        elements.currentWheelValue.textContent = '-';
        const nextPlayer = gameState.players[(gameState.currentPlayerIndex + 1) % gameState.players.length];
        // Show error popup with larger letter, then turn popup
        showPopup(`<div class="popup-error-large">
            <div>LETTERA ASSENTE</div>
            <span class="popup-letter-wrong">${letter}</span>
            <div>non c'è nella frase</div>
        </div>`, 3000);
        setTimeout(() => {
            showPopup(`<div class="popup-turn">TURNO DI<br><span class="popup-name">${nextPlayer.name}</span></div>`, 2500);
            setTimeout(passTurn, 2800);
        }, 3000);
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

    if (gameState.partialScores[player.name] < VOWEL_COST) {
        showMessage(`Non hai abbastanza soldi! Servono €${VOWEL_COST}`, 'error');
        soundManager.playError();
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        showMessage(`La vocale "${letter}" è già stata chiamata!`, 'error');
        soundManager.playError();
        showPopup(`<div class="popup-error">VOCALE GIÀ CHIAMATA!<br>Turno perso</div>`, 2000);
        setTimeout(passTurn, 2500);
        return;
    }

    // Deduct cost
    gameState.partialScores[player.name] -= VOWEL_COST;
    gameState.usedLetters.add(normalized);
    renderPlayersList();
    if (isMobileMode) syncGameState();

    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        soundManager.playCorrect();
        revealLetter(letter);
        showMessage(`🎉 "${letter}" trovata ${occurrences} volta/e!`, 'success');

        if (checkWin()) {
            setTimeout(endManche, 1500);
        } else {
            gameState.wheelPhase = 'choose_action';
            updateUI();
            if (isMobileMode) syncGameState();
        }
    } else {
        soundManager.playError();
        showMessage(`❌ "${letter}" non c'è nella frase. (-€${VOWEL_COST})`, 'error');
        showPopup(`<div class="popup-error">VOCALE ASSENTE!<br>Turno perso</div>`, 2000);
        setTimeout(passTurn, 2500);
    }
}

function trySolve() {
    const guess = elements.solutionInput.value.trim().toUpperCase();
    elements.solutionInput.value = '';

    if (!guess) {
        showMessage('Scrivi la soluzione!', 'error');
        return;
    }

    if (normalizePhrase(guess) === gameState.normalizedPhrase) {
        soundManager.playWin(); // Suono immediato qui
        showMessage('🎉🎉 ESATTO! HAI INDOVINATO! 🎉🎉', 'success');
        // Reveal all letters
        document.querySelectorAll('.tile.letter').forEach(tile => {
            tile.classList.add('revealed');
        });
        setTimeout(endManche, 1500);
    } else {
        soundManager.playError();
        showMessage('❌ Soluzione errata!', 'error');
        showPopup(`<div class="popup-error">SOLUZIONE SBAGLIATA!<br>Turno perso</div>`, 2000);
        setTimeout(passTurn, 2500);
    }
}

// ===== Manche & Game Flow =====
function endManche() {
    // Il suono di vittoria viene chiamato qui solo se la manche finisce naturalmente (indovinando l'ultima lettera)
    // Se è stata attivata la risoluzione manuale, il suono è già partito in trySolve()
    const isManualSolve = document.getElementById('win-screen').classList.contains('active');
    // Ma endManche viene chiamata prima della win-screen. Usiamo un'altra logica:
    // Se non è già in esecuzione un suono di vittoria. Ma playWin ricrea l'oggetto Audio.
    // Semplicemente rimuoviamolo da qui e mettiamolo in checkWin() o gestiamolo meglio.

    // DECISIONE: Mettiamolo in trySolve e in revealLetter se checkWin è true.
    // In questo modo è sempre immediato.

    const winner = getCurrentPlayer();
    const winnings = Number(gameState.partialScores[winner.name]) || 0;
    gameState.totalScores[winner.name] = (Number(gameState.totalScores[winner.name]) || 0) + winnings;
    updateUI();
    if (isMobileMode) syncGameState();

    // CONFETTI RAIN CELEBRATION
    triggerConfettiRain();
    soundManager.playCrowdCheer(); // CROWD REACTION

    showPopup(`<div class="popup-win">
        <div class="popup-title">MANCHE ${gameState.currentManche} VINTA!</div>
        <div class="popup-winner">${winner.name}</div>
        <div class="popup-earnings">+€${winnings}</div>
    </div>`, 0);

    // Clear board as requested: "cancella la frase che è stata indovinata"
    if (elements.gameBoard) elements.gameBoard.innerHTML = '';

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
    }, 3000);
}

async function startNextManche() {
    // Reset state
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.pendingWheelValue = null;
    gameState.wheelPhase = 'idle';
    // Nota: allConsonantsRevealed verrà calcolato dopo il caricamento della frase

    // Reset partial scores
    gameState.players.forEach(p => gameState.partialScores[p.name] = 0);

    // Random starting player
    gameState.currentPlayerIndex = Math.floor(Math.random() * gameState.players.length);

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
    while (!valid && attempts < 100) {
        attempts++;
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];
        const normalized = normalizePhrase(randomPuzzle.phrase);

        // Ensure it fits AND hasn't been used yet
        if (canFitOnBoard(randomPuzzle.phrase) && !gameState.usedPhrases.has(normalized)) {
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
        <div class="popup-manche-number">MANCHE ${gameState.currentManche}</div>
        <div class="popup-category-label">Categoria:</div>
        <div class="popup-manche-hint-large">${gameState.hint}</div>
        <div class="popup-turn-player">INIZIA<br><span class="popup-name">${getCurrentPlayer().name}</span></div>
    </div>`, 4000);
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

    let resultsHtml = '<div class="results-podium">';

    // Primo posto
    if (sortedPlayers[0]) {
        resultsHtml += `
        <div class="podium-place first">
            <div class="place-rank">1</div>
            <div class="place-name">${sortedPlayers[0].name}</div>
            <div class="place-score">€${gameState.totalScores[sortedPlayers[0].name]}</div>
        </div>`;
    }

    // Secondo posto
    if (sortedPlayers[1]) {
        resultsHtml += `
        <div class="podium-place second">
            <div class="place-rank">2</div>
            <div class="place-name">${sortedPlayers[1].name}</div>
            <div class="place-score">€${gameState.totalScores[sortedPlayers[1].name]}</div>
        </div>`;
    }

    // Terzo posto
    if (sortedPlayers[2]) {
        resultsHtml += `
        <div class="podium-place third">
            <div class="place-rank">3</div>
            <div class="place-name">${sortedPlayers[2].name}</div>
            <div class="place-score">€${gameState.totalScores[sortedPlayers[2].name]}</div>
        </div>`;
    }

    resultsHtml += '</div>';

    // Lista per gli altri giocatori (se più di 3)
    if (sortedPlayers.length > 3) {
        resultsHtml += '<div class="results-list-remaining">';
        sortedPlayers.slice(3).forEach((p, i) => {
            resultsHtml += `<div class="result-row-small">${i + 4}. ${p.name}: €${gameState.totalScores[p.name]}</div>`;
        });
        resultsHtml += '</div>';
    }

    elements.winTitle.textContent = `🏆 ${winner.name} VINCE! 🏆`;
    elements.winPhrase.innerHTML = resultsHtml;
    elements.winMessage.textContent = `Montepremi finale: €${maxScore}`;
    elements.nextLevelBtn.textContent = 'NUOVA PARTITA';
    elements.nextLevelBtn.onclick = newGame;

    showScreen('win-screen');
    soundManager.playWin();
}

// ===== UI Updates =====
function updateUI() {
    const phase = gameState.wheelPhase;
    const allConsRevealed = gameState.allConsonantsRevealed;

    const spinBtn = document.getElementById('spin-btn');
    const consonantContainer = document.getElementById('consonant-call-container');

    // Central Main Action: Toggle between Spin and Call Consonant
    if (phase === 'call_consonant') {
        spinBtn.style.display = 'none';
        consonantContainer.style.display = 'flex';

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

        // Enable Spin if allowed
        spinBtn.disabled = !(phase === 'idle' || phase === 'choose_action') || allConsRevealed;

        // Remove blinking
        elements.consonantInput.classList.remove('input-blink');
    }

    const isIdleOrAction = (phase === 'choose_action' || phase === 'idle');

    // Vowel input (available if player has money and it's their turn to choose)
    const player = getCurrentPlayer();
    const canBuyVowel = isIdleOrAction && (gameState.partialScores[player?.name] >= VOWEL_COST);
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
    const API_KEY = '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';
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
            const systemPrompt = `Sei il capo autore della "Ruota della Fortuna". Genera un database JSON di enigmi con uno stile evocativo, concreto e pop.

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
            }
            break;
        case 'buy-vowel':
            if (gameState.wheelPhase === 'choose_action' || gameState.wheelPhase === 'idle') {
                elements.vowelInput.value = action.letter;
                buyVowel();
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
        // First game: random player
        gameState.currentPlayerIndex = Math.floor(Math.random() * gameState.players.length);
    } else {
        // Next manches: Rotate starter (Round 1 -> Player 0, Round 2 -> Player 1, etc.)
        // Logic: (Manche Number - 1) % Player Count
        // Wait, user said "winner does not start".
        // Usually, the one who STARTS the round is determined by rotation.
        // Let's implement strict rotation based on manche number.
        // Manche 1: Player 0 (or random)
        // Manche 2: Player 1 (or next from previous start)
        // We need to track who started the previous manche or just use rotation.

        // Let's use simple rotation based on round number
        gameState.currentManche++;
        gameState.currentPlayerIndex = (gameState.currentManche - 1) % gameState.players.length;
    }

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
        if (!gameState.usedPhrases.has(randomPuzzle.phrase) && canFitOnBoard(randomPuzzle.phrase)) {
            gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
            gameState.hint = randomPuzzle.hint;
            gameState.usedPhrases.add(randomPuzzle.phrase);
            console.log(`[DB] Frase Scelta: "${gameState.phrase}" - Hint: "${gameState.hint}"`);
            valid = true;
        }
    }
    if (!valid) {
        // Fallback: Pick any valid one if loop failed (shouldn't happen with reset)
        const fallback = PUZZLE_DATABASE.find(p => canFitOnBoard(p.phrase)) || OFFLINE_PHRASES[0];
        gameState.phrase = sanitizePhrase(fallback.phrase);
        gameState.hint = fallback.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.wheelPhase = 'idle';
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
        <div class="popup-turn-player">INIZIA<br><span class="popup-name">${getCurrentPlayer().name}</span></div>
    </div>`, 4000);

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

            // Use detected IP from server if available, otherwise fallback to localhost
            const host = data.localIp ? `${data.localIp}:${data.port || 3000}` : window.location.host;
            // Use http specifically as mobile safari might block mixed content if we were https (we aren't generally but good to be explicit)
            // But actually better to match protocol
            const protocol = window.location.protocol;
            const mobileLink = `${protocol}//${host}/mobile.html`;

            if (elements.bigMobileLink) {
                elements.bigMobileLink.innerHTML = `<a href="${mobileLink}" target="_blank" style="color: #00d4ff; text-decoration: none;">${mobileLink}</a>`;
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
                elements.startSmartphoneGameBtn.innerHTML = `AVVIA PARTITA (${data.players.length}) 🚀`;
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
        card.className = 'big-player-card new'; // Always new animation for re-renders for now
        card.innerHTML = `
            <div class="big-player-avatar">👤</div>
            <div class="big-player-name">${player.name}</div>
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

    gameState.players = players;
    gameState.currentPlayerIndex = 0;
    gameState.totalScores = {};
    gameState.partialScores = {};

    players.forEach(p => {
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
