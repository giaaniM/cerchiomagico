/**
 * main.js — Entry point for the modular Wheel of Fortune app.
 *
 * Imports all modules, wires cross-module dependencies (via setter injection),
 * attaches all event listeners, and initializes the app.
 *
 * NOTE: This module is for future use. The monolithic public/game.js
 * continues to function as-is.
 */

// ===== Core imports =====
import { soundManager } from './sound.js';
import { elements } from './elements.js';
import { gameState, socketState } from './state.js';
import { showScreen, showPopup } from './utils.js';
import { t, applyTranslations, setLang, getCurrentLang } from './lang.js';

window.t = t;
applyTranslations();

// ===== Module imports =====
import { updateUI } from './ui.js';
import { passTurn, setUpdateUI as playersSetUpdateUI, setSyncGameState as playersSetSyncGameState } from './players.js';
import { setUpdateUI as boardSetUpdateUI } from './board.js';
import { spinWheel, drawWheel, renderWheelToCache, clearWheelCache } from './wheel.js';
import { callConsonant, buyVowel, trySolve, endManche, startGameDirectly, newGame, startNextManche, skipPhrase, loadPuzzles, setOnNewGame } from './game-logic.js';
import { callExpressConsonant, buyExpressVowel, setEndManche as expressSetEndManche } from './express.js';
import { callFinalConsonant, callFinalVowel, setEndManche as finalRoundSetEndManche, setSyncGameState as finalRoundSetSyncGameState } from './finalRound.js';
import { syncGameState, setHandlers as socketSetHandlers } from './socket.js';
import { initSetup, setStartGameDirectly, initSoloButton, resetSoloSelection } from './setup.js';
import { initMobileLayout } from './mobile-layout.js';

// ===== Wire cross-module dependencies =====

// board.js needs updateUI
boardSetUpdateUI(updateUI);

// players.js needs updateUI and syncGameState
playersSetUpdateUI(updateUI);
playersSetSyncGameState(() => {
    if (socketState.isMobileMode) syncGameState();
});

// express.js needs endManche
expressSetEndManche(endManche);

// finalRound.js needs endManche and syncGameState
finalRoundSetEndManche(endManche);
finalRoundSetSyncGameState(() => {
    if (socketState.isMobileMode) syncGameState();
});

// socket.js needs game action handlers
socketSetHandlers({
    callConsonant,
    buyVowel,
    callExpressConsonant,
    buyExpressVowel,
    trySolve,
    passTurn,
    startGameDirectly,
    resolveMysteryChoice: window.resolveMysteryChoice, // assigned in wheel.js
});

// setup.js needs startGameDirectly
setStartGameDirectly(startGameDirectly);
setOnNewGame(resetSoloSelection);

// ===== Attach Event Listeners =====

// Main game controls
elements.spinBtn?.addEventListener('click', spinWheel);
elements.consonantBtn?.addEventListener('click', callConsonant);
elements.vowelBtn?.addEventListener('click', buyVowel);
elements.solveBtn?.addEventListener('click', trySolve);
elements.passBtn?.addEventListener('click', passTurn);
elements.newGameBtn?.addEventListener('click', newGame);
document.getElementById('home-btn')?.addEventListener('click', newGame);
document.getElementById('skip-phrase-btn')?.addEventListener('click', () => {
    showPopup(`<div class="popup-body">
        <div class="popup-icon">↻</div>
        <div class="popup-title">${t('skip.title')}</div>
        <div class="popup-text">${t('skip.body')}</div>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
            <button onclick="document.getElementById('modal-overlay').style.display='none';document.getElementById('popup-message').style.display='none'" class="btn-secondary" style="padding:8px 20px">${t('skip.cancel')}</button>
            <button onclick="window._confirmSkipPhrase()" class="btn-solve" style="padding:8px 20px">${t('skip.confirm')}</button>
        </div>
    </div>`, 0);
    window._confirmSkipPhrase = () => {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById('popup-message').style.display = 'none';
        skipPhrase();
    };
});

document.getElementById('lang-toggle-btn')?.addEventListener('click', () => {
    const newLang = getCurrentLang() === 'it' ? 'en' : 'it';
    setLang(newLang);
    clearWheelCache();
    renderWheelToCache();
    drawWheel(gameState.wheelRotation);
    loadPuzzles();
});

// Consonant input
elements.consonantInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') callConsonant();
});
elements.consonantInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Vowel input
elements.vowelInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buyVowel();
});
elements.vowelInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Solution input
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

// Prevent accidental navigation during an active game
window.addEventListener('beforeunload', (e) => {
    if (gameState.currentManche) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Expose soundManager globally so the inline tutorial/audio script can use it
window.soundManager = soundManager;

// TEST HELPER — skip to manche 5 from console: _skipToManche5()
window._skipToManche5 = () => {
    gameState.currentManche = 4;
    endManche();
};

// ===== Load puzzles from Supabase =====
loadPuzzles();

// ===== Initialize Setup Screen =====
initSetup();
initSoloButton();
initMobileLayout();

// ===== Initial Render =====
// The setup screen is shown by default via CSS (first .screen is active or setup-screen is active)
// Draw an initial wheel so the canvas isn't blank
renderWheelToCache();
drawWheel(0);
