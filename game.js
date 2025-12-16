// ===== Sound Manager (Audio Synthesis) =====
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
    }
};

// ===== Game State =====
const gameState = {
    phrase: '',
    normalizedPhrase: '',
    revealedLetters: new Set(),
    usedLetters: new Set(),
    attempts: 0,
    errors: 0,
    currentLevel: 0,
    isSpecialMode: false,
    selectedLetters: []
};

// ===== DOM Elements =====
const elements = {
    // Screens
    setupScreen: document.getElementById('setup-screen'),
    gameScreen: document.getElementById('game-screen'),
    winScreen: document.getElementById('win-screen'),

    // Overlays
    modalOverlay: document.getElementById('modal-overlay'),
    selectionModal: document.getElementById('selection-modal'),
    popupMessage: document.getElementById('popup-message'),

    // Setup
    phraseInput: document.getElementById('phrase-input'),
    // Removed initialLettersInput
    startGameBtn: document.getElementById('start-game-btn'),
    startSpecialBtn: document.getElementById('start-special-btn'),

    // Selection Inputs
    selectionInputs: document.querySelectorAll('.letter-select'),
    confirmSelectionBtn: document.getElementById('confirm-selection-btn'),
    selectionError: document.getElementById('selection-error'),

    // Game
    gameBoard: document.getElementById('game-board'),
    letterInput: document.getElementById('letter-input'),
    guessBtn: document.getElementById('guess-btn'),
    solutionInput: document.getElementById('solution-input'),
    trySolutionBtn: document.getElementById('try-solution-btn'),
    messageDisplay: document.getElementById('message-display'),
    newGameBtn: document.getElementById('new-game-btn'),

    // Win
    winTitle: document.getElementById('win-title'),
    winPhrase: document.getElementById('win-phrase'),
    winMessage: document.getElementById('win-message'),
    finalImageContainer: document.getElementById('final-image-container'),
    finalImage: document.getElementById('final-image'),
    nextLevelBtn: document.getElementById('next-level-btn'),
    playAgainBtn: document.getElementById('play-again-btn'),

    // Hint
    hintDisplay: document.getElementById('hint-display'),
    hintText: document.getElementById('hint-text'),

    // Intro Button
    startGiftHuntBtn: document.getElementById('start-gift-hunt-btn')
};

// ===== Gift Levels =====
// ===== Gift Levels =====
const GIFT_LEVELS = [
    { phrase: "FAMOSO GELATO CONFEZIONATO", hint: "Al supermercato" },
    { phrase: "UN REGALO NON MATERIALE", hint: "Da scartare" },
    { phrase: "PRENDERE UN AEREO INSIEME", hint: "Dopo sei anni" }
];

// ... (SoundManager update)

// ===== Event Listeners =====
if (elements.startGameBtn) elements.startGameBtn.addEventListener('click', () => startGame('free'));

// Wire up Intro Screen flow
if (elements.startSpecialBtn) {
    elements.startSpecialBtn.addEventListener('click', () => {
        soundManager.playClick();
        // Show intro screen properly
        showScreen('intro-screen');
    });
}

if (elements.startGiftHuntBtn) {
    elements.startGiftHuntBtn.addEventListener('click', () => {
        // Start the actual game from the intro screen
        startGame('special');
    });
}

const VIENNA_IMAGE_PATH = "file:///Users/valeriopadovano/.gemini/antigravity/brain/0b4517b4-62a4-4c3a-ac9a-1848ee4b37c9/uploaded_image_1765810461415.jpg";

// ===== Utility Functions =====
function normalizeChar(char) {
    return char.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizePhrase(phrase) {
    return phrase.split('').map(char => {
        if (/[a-zA-ZÀ-ÿ]/.test(char)) return normalizeChar(char);
        return char;
    }).join('');
}

function getUniqueLetters(phrase) {
    const letters = new Set();
    for (const char of phrase) {
        if (/[A-Z]/.test(normalizeChar(char))) letters.add(normalizeChar(char));
    }
    return Array.from(letters);
}

// ===== Screen Management =====
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
}

// ===== Game Board Functions =====
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
        const rowCapacity = ROWS_CONFIG[row];
        const contentRowIndex = row - verticalOffset;
        const contentRow = contentRows[contentRowIndex] || null;
        const horizontalOffset = contentRow ? Math.floor((rowCapacity - contentRow.length) / 2) : 0;

        for (let col = 0; col < rowCapacity; col++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';
            const contentIndex = col - horizontalOffset;
            const content = contentRow && contentIndex >= 0 && contentIndex < contentRow.length ? contentRow[contentIndex] : null;

            if (content && content.type === 'letter') {
                tileElement.classList.add('letter');
                tileElement.dataset.letter = normalizeChar(content.char);
                tileElement.textContent = content.char.toUpperCase();
            } else {
                tileElement.classList.add('empty');
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

function countLetterOccurrences(phrase, letter) {
    const normalizedLetter = normalizeChar(letter);
    let count = 0;
    for (const char of phrase) {
        if (normalizeChar(char) === normalizedLetter) count++;
    }
    return count;
}

// Standard message (Toast Style)
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

// Popup message (Overlay)
function showPopupMessage(text, duration = 2000) {
    elements.modalOverlay.style.display = 'flex';
    elements.selectionModal.style.display = 'none';
    elements.popupMessage.style.display = 'block';

    elements.popupMessage.textContent = text;

    if (duration > 0) {
        setTimeout(() => {
            elements.popupMessage.style.display = 'none';
            elements.modalOverlay.style.display = 'none';
        }, duration);
    }
}

function checkWin() {
    const totalRevealed = document.querySelectorAll('.tile.letter.revealed').length;
    const totalLetterTiles = document.querySelectorAll('.tile.letter').length;
    if (totalRevealed === totalLetterTiles) {
        soundManager.playWin();
        setTimeout(showWinScreen, 1500);
        return true;
    }
    return false;
}

function showWinScreen() {
    elements.winPhrase.textContent = gameState.phrase.toUpperCase();

    if (gameState.isSpecialMode && gameState.currentLevel === GIFT_LEVELS.length - 1) {
        elements.winTitle.textContent = "Ora puoi scartare il regalo Amore ❤️";
        elements.winMessage.textContent = "";
        elements.finalImageContainer.style.display = 'block';
        elements.finalImage.src = VIENNA_IMAGE_PATH; // Set image
        elements.nextLevelBtn.textContent = "GIOCA ANCORA 🎮";
        elements.nextLevelBtn.onclick = () => {
            soundManager.playClick();
            gameState.currentLevel = 0;
            newGame();
        };
    } else if (gameState.isSpecialMode) {
        elements.winTitle.textContent = "BRAVISSIMO! 🎉";
        elements.winMessage.textContent = "Livello completato!";
        elements.finalImageContainer.style.display = 'none';
        elements.nextLevelBtn.textContent = "Prossimo Livello ➡️";
        elements.nextLevelBtn.onclick = () => {
            soundManager.playClick();
            nextLevel();
        };
    } else {
        elements.winTitle.textContent = "HAI VINTO! 🎉";
        elements.winMessage.textContent = "";
        elements.finalImageContainer.style.display = 'none';
        elements.nextLevelBtn.textContent = "Nuova Partita ➡️";
        elements.nextLevelBtn.onclick = () => {
            soundManager.playClick();
            newGame();
        };
    }

    showScreen('win-screen');
}

// ===== Letters Selection Observer =====

function showLetterSelectionObserver() {
    showScreen('game-screen');
    elements.modalOverlay.style.display = 'flex';
    elements.selectionModal.style.display = 'block';
    elements.popupMessage.style.display = 'none';

    elements.selectionInputs.forEach(input => input.value = '');
    elements.selectionInputs[0].focus();
    elements.selectionError.textContent = '';

    elements.selectionInputs.forEach((input, index) => {
        input.oninput = (e) => {
            soundManager.playClick();
            e.target.value = e.target.value.toUpperCase();
            if (e.target.value && index < elements.selectionInputs.length - 1) {
                elements.selectionInputs[index + 1].focus();
            }
        };
        input.onkeydown = (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                elements.selectionInputs[index - 1].focus();
            }
        };
    });
}

function confirmSelection() {
    soundManager.playClick();
    const selected = [];
    let valid = true;
    const vowels = ['A', 'E', 'I', 'O', 'U'];

    elements.selectionInputs.forEach((input, index) => {
        const val = input.value.toUpperCase();
        if (!val || !/^[A-Z]$/.test(val)) {
            valid = false;
        }
        if (index < 3 && vowels.includes(val)) {
            elements.selectionError.textContent = "Le prime 3 devono essere consonanti!";
            valid = false;
            return;
        }
        if (index === 3 && !vowels.includes(val) && val) {
            elements.selectionError.textContent = "L'ultima deve essere una vocale!";
            valid = false;
        }
        selected.push(val);
    });

    if (!valid && !elements.selectionError.textContent) {
        elements.selectionError.textContent = "Riempi tutti i campi!";
        soundManager.playError();
    }

    if (valid) {
        gameState.selectedLetters = selected;
        elements.selectionModal.style.display = 'none';
        startWithLetters();
    }
}

function startWithLetters() {
    elements.letterInput.disabled = true;
    elements.guessBtn.disabled = true;
    elements.solutionInput.disabled = true;

    showPopupMessage("Sveliamo le lettere...", 0);

    let delay = 1500;

    gameState.selectedLetters.forEach((letter) => {
        setTimeout(() => {
            const count = countLetterOccurrences(gameState.phrase, letter);
            gameState.usedLetters.add(normalizeChar(letter));

            if (count > 0) {
                soundManager.playCorrect();
                revealLetter(letter, true);
                elements.popupMessage.className = 'popup-message success'; // Add green class
                showPopupMessage(`La lettera ${letter} c'è! (${count})`, 0);
            } else {
                soundManager.playError();
                elements.popupMessage.className = 'popup-message error'; // Add red class
                showPopupMessage(`La lettera ${letter} non c'è...`, 0);
            }
        }, delay);
        delay += 2500;
    });

    setTimeout(() => {
        soundManager.playClick();
        elements.popupMessage.className = 'popup-message'; // Reset class
        showPopupMessage("Tocca a te! 🎮", 1500);
        elements.letterInput.disabled = false;
        elements.guessBtn.disabled = false;
        elements.solutionInput.disabled = false;
        elements.letterInput.focus();
    }, delay);
}


// ===== Game Actions =====
function startGame(mode = 'free') {
    soundManager.init(); // Init audio context on user gesture
    soundManager.playClick();

    let phrase = '';
    let hint = '';

    gameState.isSpecialMode = (mode === 'special');

    if (mode === 'special') {
        const levelData = GIFT_LEVELS[gameState.currentLevel];
        phrase = levelData.phrase;
        hint = levelData.hint;
    } else {
        gameState.currentLevel = 0;
        phrase = elements.phraseInput.value.trim();
        hint = "Indovina la frase segreta!";

        if (!phrase) { showMessage('Inserisci una frase!', 'error'); soundManager.playError(); return; }
        const filteredPhrase = phrase.replace(/[^a-zA-ZÀ-ÿ\s]/g, '').replace(/\s+/g, ' ').trim();
        if (filteredPhrase.length < 3) { showMessage('La frase deve contenere almeno 3 lettere!', 'error'); soundManager.playError(); return; }
        phrase = filteredPhrase;
    }

    gameState.phrase = phrase;
    gameState.normalizedPhrase = normalizePhrase(phrase);
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.attempts = 0;
    gameState.errors = 0;

    elements.messageDisplay.textContent = '';
    elements.messageDisplay.className = 'message-display';
    elements.letterInput.value = '';
    elements.solutionInput.value = '';

    elements.hintDisplay.style.display = 'block';
    elements.hintText.textContent = hint;

    createBoard();
    showLetterSelectionObserver();
}

function nextLevel() {
    gameState.currentLevel++;
    startGame('special');
}

function guessLetter() {
    const letter = elements.letterInput.value.trim().toUpperCase();
    elements.letterInput.value = '';

    if (!letter || !/^[A-ZÀ-ÿ]$/.test(letter)) {
        showMessage('Inserisci una lettera valida!', 'error');
        elements.letterInput.focus();
        soundManager.playError();
        return;
    }

    const normalizedLetter = normalizeChar(letter);
    if (gameState.usedLetters.has(normalizedLetter)) {
        showMessage(`Hai già provato la lettera "${letter}"!`, 'info');
        elements.letterInput.focus();
        soundManager.playClick(); // just a click for info
        return;
    }

    gameState.usedLetters.add(normalizedLetter);
    const occurrences = countLetterOccurrences(gameState.phrase, letter);

    if (occurrences > 0) {
        soundManager.playCorrect();
        revealLetter(letter, true);
        showMessage(`🎉 "${letter}" trovata! (${occurrences})`, 'success');
        setTimeout(() => checkWin(), occurrences * 100 + 300);
    } else {
        soundManager.playError();
        showMessage(`❌ "${letter}" non c'è.`, 'error');
    }
    elements.letterInput.focus();
}

function trySolution() {
    const guess = elements.solutionInput.value.trim().toUpperCase();
    if (!guess) return;

    if (normalizePhrase(guess) === gameState.normalizedPhrase) {
        soundManager.playWin();
        showMessage('🎉🎉 ESATTO! HAI INDOVINATO! 🎉🎉', 'success');
        revealAllLetters();
        setTimeout(showWinScreen, 1500);
    } else {
        soundManager.playError();
        gameState.errors++;
        gameState.attempts++;
        showMessage('❌ Risposta errata! Riprova.', 'error');
        elements.solutionInput.value = '';
        elements.solutionInput.focus();
    }
}

function newGame() {
    soundManager.playClick();
    showScreen('setup-screen');
    elements.phraseInput.value = '';
    elements.phraseInput.focus();
    elements.modalOverlay.style.display = 'none';
}

// ===== Event Listeners =====
if (elements.startGameBtn) elements.startGameBtn.addEventListener('click', () => startGame('free'));
if (elements.startSpecialBtn) elements.startSpecialBtn.addEventListener('click', () => startGame('special'));

if (elements.confirmSelectionBtn) elements.confirmSelectionBtn.addEventListener('click', confirmSelection);

if (elements.guessBtn) elements.guessBtn.addEventListener('click', guessLetter);
if (elements.trySolutionBtn) elements.trySolutionBtn.addEventListener('click', trySolution);

if (elements.letterInput) {
    elements.letterInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') guessLetter();
    });
    elements.letterInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
}

if (elements.solutionInput) {
    elements.solutionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') trySolution();
    });
}

if (elements.newGameBtn) elements.newGameBtn.addEventListener('click', newGame);
if (elements.playAgainBtn) elements.playAgainBtn.addEventListener('click', newGame);

if (elements.phraseInput) {
    elements.phraseInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startGame('free');
    });
}
