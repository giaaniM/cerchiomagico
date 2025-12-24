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
        // Coin sound: Two high sine waves in quick succession
        this.playTone(987, 'sine', 0.08, 0.1); // B5
        setTimeout(() => this.playTone(1318, 'sine', 0.2, 0.1), 50); // E6
    },

    playError() {
        // Error sound: Low triangle wave, boosted volume
        this.playTone(80, 'triangle', 0.4, 0.4);
    },

    playReveal() {
        this.playTone(800, 'sine', 0.1, 0.05);
    },

    playClick() {
        this.playTone(400, 'triangle', 0.05, 0.05);
    },

    playWin() {
        // Victory fanfare
        const now = 0;
        this.playTone(523, 'square', 0.1); // C5
        setTimeout(() => this.playTone(659, 'square', 0.1), 150); // E5
        setTimeout(() => this.playTone(783, 'square', 0.1), 300); // G5
        setTimeout(() => this.playTone(1046, 'square', 0.6), 450); // C6
    },

    playSpin() {
        this.playTone(300, 'sawtooth', 0.1, 0.05);
    }
};

// ===== Wheel Segments (24 segments like the real wheel) =====
const WHEEL_SEGMENTS = [
    { value: 1000, color: '#f39c12', label: '€1000' },
    { value: 500, color: '#3498db', label: '€500' },
    { value: 5000, color: '#000000', label: '€5000', glowing: true }, /* Special 5000 */
    { value: 300, color: '#27ae60', label: '€300' },
    { value: 'PASSA', color: '#95a5a6', label: 'PASSA' },
    { value: 750, color: '#9b59b6', label: '€750' },
    { value: 400, color: '#1abc9c', label: '€400' },
    { value: 800, color: '#e67e22', label: '€800' },
    { value: 'BANCAROTTA', color: '#2c3e50', label: 'BANCA' },
    { value: 600, color: '#f1c40f', label: '€600' },
    { value: 1500, color: '#e74c3c', label: '€1500' },
    { value: 300, color: '#3498db', label: '€300' },
    { value: 500, color: '#27ae60', label: '€500' },
    { value: 'PASSA', color: '#95a5a6', label: 'PASSA' },
    { value: 450, color: '#9b59b6', label: '€450' },
    { value: 2000, color: '#f39c12', label: '€2000' },
    { value: 350, color: '#1abc9c', label: '€350' },
    { value: 900, color: '#e67e22', label: '€900' },
    { value: 250, color: '#e74c3c', label: '€250' },
    { value: 550, color: '#f1c40f', label: '€550' },
    { value: 'BANCAROTTA', color: '#2c3e50', label: 'BANCA' },
    { value: 700, color: '#3498db', label: '€700' },
    { value: 400, color: '#27ae60', label: '€400' },
    { value: 1200, color: '#9b59b6', label: '€1200' }
];

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const VOWEL_COST = 1000;
const TOTAL_MANCHES = 2;

// ===== Game State =====
const gameState = {
    phrase: '',
    hint: '',
    normalizedPhrase: '',
    revealedLetters: new Set(),
    usedLetters: new Set(),
    players: [],
    currentPlayerIndex: 0,
    currentManche: 1,
    partialScores: {},
    totalScores: {},
    pendingWheelValue: null,
    wheelPhase: 'idle', // 'idle', 'spinning', 'call_consonant', 'choose_action'
    allConsonantsRevealed: false,
    wheelRotation: 0
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
    messageDisplay: document.getElementById('message-display'),
    newGameBtn: document.getElementById('new-game-btn'),

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
    return phrase.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function sanitizePhrase(p) {
    if (!p) return "";
    const map = { 'A': 'À', 'E': 'È', 'I': 'Ì', 'O': 'Ò', 'U': 'Ù' };
    return p.toUpperCase()
        // Convert substitutes like E' or A' to real accented characters
        .replace(/\b([AEIOU])['’](\b|\s|$)/g, (match, char, boundary) => (map[char] || char) + boundary)
        .replace(/([AEIOU])['’]\b/g, (match, char) => map[char] || match)
        // Clean characters but keep apostrophes that might be needed
        .replace(/[^A-ZÀ-ÿ\s'’]/g, ' ')
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

function showPopup(html, duration = 2000) {
    elements.modalOverlay.style.display = 'flex';
    elements.popupMessage.style.display = 'block';
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
    const ROWS_CONFIG = [12, 14, 14, 12];
    const MAX_ROW_LENGTH = 12;
    let currentRow = [];
    const contentRows = [];

    words.forEach((word) => {
        const spaceNeeded = currentRow.length > 0 ? 1 : 0;
        if (currentRow.length + spaceNeeded + word.length <= MAX_ROW_LENGTH) {
            if (currentRow.length > 0) currentRow.push({ type: 'space', char: ' ' });
            for (const char of word) currentRow.push({ type: 'letter', char: char });
        } else {
            if (currentRow.length > 0) contentRows.push(currentRow);
            currentRow = [];
            for (const char of word) currentRow.push({ type: 'letter', char: char });
        }
    });
    if (currentRow.length > 0) contentRows.push(currentRow);

    const verticalOffset = Math.floor((BOARD_ROWS - contentRows.length) / 2);

    for (let row = 0; row < BOARD_ROWS; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'board-row';
        const FIXED_CAPACITY = 14;
        const rowCapacity = ROWS_CONFIG[row]; // 12 or 14

        const contentRowIndex = row - verticalOffset;
        const contentRow = contentRows[contentRowIndex] || null;

        // Calculate offset within the row's capacity
        const innerOffset = contentRow ? Math.floor((rowCapacity - contentRow.length) / 2) : 0;
        // Total offset from the start of the 14-tile grid
        const gridOffset = (FIXED_CAPACITY - rowCapacity) / 2 + innerOffset;

        for (let col = 0; col < FIXED_CAPACITY; col++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';

            // Handle row indentations (12 tiles centered in 14)
            const isRowEdge = (row === 0 || row === 3) && (col === 0 || col === 13);
            if (isRowEdge) {
                tileElement.classList.add('invisible');
            } else {
                const contentIndex = col - gridOffset;
                const content = contentRow && contentIndex >= 0 && contentIndex < contentRow.length ? contentRow[contentIndex] : null;

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
                    setTimeout(() => tile.classList.remove('just-revealed'), 1100);
                }, index * 100);
            } else {
                tile.classList.add('revealed');
            }
        }
    });
    gameState.revealedLetters.add(normalizedLetter);
    return count;
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
        li.innerHTML = `
            <span class="player-name">${item.player.name}</span>
            <span class="player-score">€${item.score}</span>
        `;
        elements.playersList.appendChild(li);
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

    const nextPlayer = getCurrentPlayer();
    showPopup(`<div class="popup-turn">TURNO DI<br><span class="popup-name">${nextPlayer.name}</span></div>`, 2000);
}

// ===== Wheel Drawing =====
function drawWheel(rotation = 0) {
    const canvas = elements.wheelCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const scale = canvas.width / 300; // Base scale on original 300px width

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;
    const rotationRad = (rotation * Math.PI) / 180;

    // Draw each segment
    WHEEL_SEGMENTS.forEach((segment, i) => {
        const startAngle = i * segmentAngle + rotationRad;
        const endAngle = startAngle + segmentAngle;

        // Draw segment
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        // Glow effect for special segments
        if (segment.glowing) {
            ctx.shadowColor = '#fbbf24'; // Gold glow
            ctx.shadowBlur = 30 * scale;
            ctx.fillStyle = '#000'; // Dark background for contrast
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = segment.color;
        }

        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow for stroke
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2 * scale;
        ctx.stroke();

        // Draw text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);
        ctx.textAlign = 'right';
        ctx.fillStyle = (segment.value === 'BANCAROTTA' || segment.glowing) ? '#fff' : '#000';
        ctx.font = `bold ${14 * scale}px Outfit, sans-serif`; // Scled font
        ctx.fillText(segment.label, radius - (15 * scale), 5 * scale);
        ctx.restore();
    });

    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#2c3e50';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4 * scale;
    ctx.stroke();
}

// ===== Wheel Spinning =====
let wheelAnimationId = null;

function spinWheel() {
    if (gameState.wheelPhase !== 'idle' && gameState.wheelPhase !== 'choose_action') return;

    soundManager.init();
    gameState.wheelPhase = 'spinning';
    elements.spinBtn.disabled = true;

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

        // Easing function for realistic deceleration (cubic ease out)
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
            soundManager.playClick();
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
    } else if (result.value === 'BANCAROTTA') {
        soundManager.playError();
        elements.currentWheelValue.textContent = 'BANCAROTTA';
        elements.currentWheelValue.className = 'wheel-value bancarotta';
        gameState.partialScores[player.name] = 0;
        renderPlayersList();
        showPopup(`<div class="popup-bancarotta">BANCAROTTA!<br>Perdi tutto!</div>`, 2500);
        setTimeout(passTurn, 3000);
    } else {
        soundManager.playClick();
        gameState.pendingWheelValue = result.value;
        elements.currentWheelValue.textContent = `€${result.value}`;
        elements.currentWheelValue.className = 'wheel-value';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        showMessage(`Chiama una consonante (vale €${result.value})`, 'info');
    }
}

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
        showMessage(`La lettera "${letter}" è già stata chiamata!`, 'error');
        showPopup(`<div class="popup-error">LETTERA GIÀ CHIAMATA!<br>Turno perso</div>`, 2000);
        setTimeout(passTurn, 2500);
        return;
    }

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        const earnings = gameState.pendingWheelValue * occurrences;
        gameState.partialScores[getCurrentPlayer().name] += earnings;
        soundManager.playCorrect();
        revealLetter(letter);
        renderPlayersList();
        showMessage(`🎉 "${letter}" trovata ${occurrences} volta/e! (+€${earnings})`, 'success');

        if (checkWin()) {
            setTimeout(endManche, 1500);
        } else {
            gameState.allConsonantsRevealed = checkAllConsonantsRevealed();
            gameState.wheelPhase = 'choose_action';
            gameState.pendingWheelValue = null;
            elements.currentWheelValue.textContent = '-';
            updateUI();
        }
    } else {
        soundManager.playError();
        showMessage(`❌ "${letter}" non c'è nella frase.`, 'error');
        gameState.pendingWheelValue = null; // Clear value
        elements.currentWheelValue.textContent = '-';
        showPopup(`<div class="popup-error">LETTERA ASSENTE!<br><span class="popup-name">${gameState.players[(gameState.currentPlayerIndex + 1) % gameState.players.length].name}</span> tocca a te</div>`, 2000);
        setTimeout(passTurn, 2500);
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
        soundManager.playWin();
        showMessage('🎉🎉 ESATTO! HAI INDOVINATO! 🎉🎉', 'success');
        // Reveal all letters
        document.querySelectorAll('.tile.letter').forEach(tile => {
            tile.textContent = tile.dataset.letter;
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
    const winner = getCurrentPlayer();
    const winnings = gameState.partialScores[winner.name];
    gameState.totalScores[winner.name] += winnings;

    showPopup(`<div class="popup-win">
        <div class="popup-title">MANCHE ${gameState.currentManche} VINTA!</div>
        <div class="popup-winner">${winner.name}</div>
        <div class="popup-earnings">+€${winnings}</div>
    </div>`, 0);

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
    gameState.allConsonantsRevealed = false;

    // Reset partial scores
    gameState.players.forEach(p => gameState.partialScores[p.name] = 0);

    // Random starting player
    gameState.currentPlayerIndex = Math.floor(Math.random() * gameState.players.length);

    showPopup(`<div class="popup-loading">Generando frase per Manche ${gameState.currentManche}...</div>`, 0);

    // AI Logic with Offline Fallback
    try {
        const data = await fetchPuzzleFromAI();
        gameState.phrase = sanitizePhrase(data.phrase);
        gameState.hint = data.hint;
    } catch (e) {
        console.error("AI Generation failed, using offline DB", e);
        // Fallback
        const randomIndex = Math.floor(Math.random() * OFFLINE_PHRASES.length);
        const selected = OFFLINE_PHRASES[randomIndex];
        gameState.phrase = sanitizePhrase(selected.phrase);
        gameState.hint = selected.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);

    elements.popupMessage.style.display = 'none';
    elements.modalOverlay.style.display = 'none';

    elements.mancheNumber.textContent = gameState.currentManche;
    elements.hintText.textContent = gameState.hint;
    createBoard();
    drawWheel(0);
    renderPlayersList();
    updateUI();

    showPopup(`<div class="popup-turn">MANCHE ${gameState.currentManche}<br>INIZIA<br><span class="popup-name">${getCurrentPlayer().name}</span></div>`, 2500);
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

    let resultsHtml = '<div class="results-list">';
    gameState.players
        .sort((a, b) => gameState.totalScores[b.name] - gameState.totalScores[a.name])
        .forEach((p, i) => {
            resultsHtml += `<div class="result-row ${i === 0 ? 'winner' : ''}">${i + 1}. ${p.name}: €${gameState.totalScores[p.name]}</div>`;
        });
    resultsHtml += '</div>';

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

    // Spin button
    // Enable spin if idle OR if player has control (choose_action)
    elements.spinBtn.disabled = !(phase === 'idle' || phase === 'choose_action') || allConsRevealed;

    // Consonant input
    const canCallConsonant = phase === 'call_consonant' && !allConsRevealed;
    elements.consonantInput.disabled = !canCallConsonant;
    elements.consonantBtn.disabled = !canCallConsonant;

    // Vowel input (available if player has money and it's their turn to choose)
    const player = getCurrentPlayer();
    const canBuyVowel = (phase === 'choose_action' || phase === 'idle') && (gameState.partialScores[player?.name] >= VOWEL_COST);
    elements.vowelInput.disabled = !canBuyVowel;
    elements.vowelBtn.disabled = !canBuyVowel;

    // Solve is always available
    renderPlayersList();
}

// ===== AI Fetch =====
// ===== AI Fetch =====
async function fetchPuzzleFromAI() {
    const API_KEY = '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';
    const url = 'https://api.groq.com/openai/v1/chat/completions';

    // Using high temperature and a unique seed-like string to force variety
    const prompt = `Genera una FRASE LUNGA per il gioco "La Ruota della Fortuna" in italiano. 
    REQUISITI DI FERRO:
    1. LUNGHEZZA: La frase deve avere tra le 20 e le 30 LETTERE (escludendo gli spazi).
    2. NO CLICHÉ CORTI: Non usare "La vita è bella", "Una casa grande" o frasi fatte brevi. Devi essere creativo.
    3. ESEMPI DI LUNGHEZZA CORRETTA (NON COPIARLI): 
       - "IL MATTINO HA L'ORO IN BOCCA" (21 lettere)
       - "SOTTO LA PANCA LA CAPRA CREPA" (23 lettere)
       - "NON CI RESTA CHE PIANGERE" (21 lettere)
    4. PULIZIA: NO punteggiatura, NO apostrofi (es: usa È invece di E'). Solo lettere e spazi.
    
    Seme casuale per la generazione: ${Date.now()}
    Restituisci SOLO un JSON valido: {"phrase": "FRASE LUNGA", "hint": "Categoria"}
    Restituisci solo il JSON.`;

    let lastError = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
        try {
            console.log(`Groq Attempt ${attempt}/5 (Temp: 1.2)...`);
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: "Sei un autore televisivo creativo. Generi frasi lunghe (20-30 lettere), originali, senza punteggiatura o apostrofi." },
                        { role: "user", content: prompt }
                    ],
                    temperature: 1.2, // Higher randomness to break cliches
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Groq API Error ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            const result = JSON.parse(data.choices[0].message.content);
            const phrase = result.phrase.toUpperCase();

            // Validate length (excluding spaces)
            const letterCount = phrase.replace(/\s/g, '').length;
            const hasPunctuation = /[^A-ZÀ-ÿ\s]/.test(phrase);

            if (letterCount < 20 || letterCount > 30 || hasPunctuation) {
                console.warn(`Scartata: "${phrase}" (${letterCount} lettere). Troppo ${letterCount < 20 ? 'corta' : 'lunga'} o invalida.`);
                continue;
            }

            console.log("Frase valida ricevuta:", phrase, `(${letterCount} lettere)`);
            return { phrase, hint: result.hint };

        } catch (e) {
            console.error(`Attempt ${attempt} failed:`, e.message);
            lastError = e;
        }
    }
    throw lastError || new Error("Impossibile generare una frase valida dopo 5 tentativi");
}

// ===== Game Start =====
async function startGame() {
    soundManager.init();
    soundManager.playClick();

    // Collect players
    const nameInputs = document.querySelectorAll('.player-name-input');
    gameState.players = [];
    nameInputs.forEach((input, index) => {
        const name = input.value.trim() || `Giocatore ${index + 1}`;
        gameState.players.push({ name });
        gameState.partialScores[name] = 0;
        gameState.totalScores[name] = 0;
    });

    // Random starting player
    gameState.currentPlayerIndex = Math.floor(Math.random() * gameState.players.length);
    gameState.currentManche = 1;

    // Get phrase from AI
    showScreen('game-screen');
    showPopup(`<div class="popup-loading">L'AI sta generando la frase...</div>`, 0);

    // AI Logic with Offline Fallback
    try {
        const data = await fetchPuzzleFromAI();
        gameState.phrase = sanitizePhrase(data.phrase);
        gameState.hint = data.hint;
    } catch (e) {
        console.warn("AI Generation failed (using offline fallback):", e.message);
        // SILENT FALLBACK: No popup, immediate start with offline phrase
        const randomIndex = Math.floor(Math.random() * OFFLINE_PHRASES.length);
        const selected = OFFLINE_PHRASES[randomIndex];
        gameState.phrase = sanitizePhrase(selected.phrase);
        gameState.hint = selected.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.wheelPhase = 'idle';
    gameState.pendingWheelValue = null;

    elements.popupMessage.style.display = 'none';
    elements.modalOverlay.style.display = 'none';

    elements.mancheNumber.textContent = '1';
    elements.hintText.textContent = gameState.hint;
    elements.currentWheelValue.textContent = '-';

    createBoard();
    drawWheel(0);
    renderPlayersList();
    updateUI();

    showPopup(`<div class="popup-turn">MANCHE 1<br>INIZIA<br><span class="popup-name">${getCurrentPlayer().name}</span></div>`, 3000);
}

function newGame() {
    soundManager.playClick();
    showScreen('setup-screen');
    elements.setupStep1.style.display = 'block';
    elements.setupStep2.style.display = 'none';
}

// ===== Event Listeners =====
elements.nextStepBtn?.addEventListener('click', () => {
    soundManager.playClick();
    const count = parseInt(elements.playerCountInput.value) || 2;
    const playerCount = Math.max(1, Math.min(10, count));

    elements.playerNamesContainer.innerHTML = '';
    for (let i = 0; i < playerCount; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'player-name-input';
        input.placeholder = `Giocatore ${i + 1}`;
        elements.playerNamesContainer.appendChild(input);
    }

    elements.setupStep1.style.display = 'none';
    elements.setupStep2.style.display = 'block';
});

elements.backStepBtn?.addEventListener('click', () => {
    soundManager.playClick();
    elements.setupStep2.style.display = 'none';
    elements.setupStep1.style.display = 'block';
});

elements.startGameBtn?.addEventListener('click', startGame);
elements.spinBtn?.addEventListener('click', spinWheel);
elements.consonantBtn?.addEventListener('click', callConsonant);
elements.vowelBtn?.addEventListener('click', buyVowel);
elements.solveBtn?.addEventListener('click', trySolve);
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
