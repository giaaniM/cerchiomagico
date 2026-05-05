import { gameState } from './state.js';
import { elements } from './elements.js';
import { showPopup, showMessage, popup, normalizeChar, isVowel, showFloatingScore } from './utils.js';
import { soundManager } from './sound.js';
import { getCurrentPlayer, passTurn, renderPlayersList } from './players.js';
import { updateUI } from './ui.js';
import { countLetterOccurrences, revealLetter, checkWin } from './board.js';

// Forward reference — endManche injected to avoid circular deps
let _endManche = () => {};
export function setEndManche(fn) { _endManche = fn; }

// Forward reference — syncGameState injected
let _syncGameState = () => {};
export function setSyncGameState(fn) { _syncGameState = fn; }

// ===== Final Round Functions =====
export function callFinalConsonant() {
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
    _syncGameState();

    const occurrences = countLetterOccurrences(letter);
    if (occurrences > 0) {
        const earnings = gameState.finalRoundValue;
        const totalEarnings = earnings * occurrences;

        const unrevealed = [...document.querySelectorAll(`.tile.letter[data-letter="${normalized}"]`)].filter(t => !t.classList.contains('revealed'));
        const lastTile = unrevealed[unrevealed.length - 1];

        revealLetter(letter, true, () => {
            gameState.partialScores[player.name] += earnings;
            renderPlayersList();
            soundManager.playCash();
            _syncGameState();
        });

        if (lastTile) setTimeout(() => showFloatingScore(lastTile, `+€${totalEarnings}`, true), (occurrences - 1) * 1500 + 600);

        const totalDelay = occurrences * 1500;
        setTimeout(() => {
            if (checkWin()) {
                _endManche();
            } else {
                gameState.wheelPhase = 'final_decision';
                updateUI();
                _syncGameState();
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

export function callFinalVowel() {
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
    _syncGameState();

    const occurrences = countLetterOccurrences(letter);
    if (occurrences > 0) {
        // Correct Guess (Free, no winnings)
        revealLetter(letter, true, null);
        soundManager.playCorrect();

        const totalDelay = occurrences * 1500;
        setTimeout(() => {
            if (checkWin()) {
                _endManche();
            } else {
                // Transition to decision phase: MUST Solve or Pass
                gameState.wheelPhase = 'final_decision';
                updateUI();
                _syncGameState();
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
