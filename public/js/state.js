// ===== Shared Constants =====
export const VOWELS = ['A', 'E', 'I', 'O', 'U'];
export const VOWEL_COST = 1000;
export const TOTAL_MANCHES = 5;
export const API_URL = window.location.origin;

// ===== Socket State =====
export const socketState = {
    socket: null,
    currentLobbyId: null,
    isMobileMode: false,
};

// ===== Game State =====
export const gameState = {
    phrase: '',
    originalPhrase: '',
    pendingPenalty: null,
    pointerAngle: 0,
    hint: '',
    normalizedPhrase: '',
    revealedLetters: new Set(),
    usedLetters: new Set(),
    players: [],
    currentPlayerIndex: 0,
    currentManche: null,
    partialScores: {},
    totalScores: {},
    hasShield: {},
    pendingWheelValue: null,
    nextValueMultiplier: 1,
    wheelPhase: 'idle',
    allConsonantsRevealed: false,
    wheelRotation: 0,
    usedPhrases: new Set(),
    excludedPhrases: new Set(),
    finalSpinComplete: false,
    finalRoundValue: 0,
    expressAccumulated: 0,
    gameId: 0,
};
