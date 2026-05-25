import { gameState } from './state.js';
import { t } from './lang.js';
import { elements } from './elements.js';
import { showPopup, showMessage, popup, npPopup, avatarUrl, flashExpressBanner, normalizeChar, isVowel, showFloatingScore } from './utils.js';
import { soundManager } from './sound.js';
import { getCurrentPlayer, passTurn, renderPlayersList } from './players.js';
import { updateUI, checkExpressBanner, hideExpressBanner } from './ui.js';
import { countLetterOccurrences, revealLetter, checkWin } from './board.js';

// ===== Specialized Express Functions =====
export function callExpressConsonant() {
    const letter = elements.expressConsonantInput.value.trim().toUpperCase();
    elements.expressConsonantInput.value = '';
    const player = getCurrentPlayer();

    if (!letter) return;
    if (isVowel(letter)) {
        showMessage(t('msg.consonantsonly'), 'error');
        return;
    }
    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        triggerExpressBankruptcy(t('msg.alreadycalled.inline'), letter);
        return;
    }

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);
    if (occurrences > 0) {
        const unrevealed = [...document.querySelectorAll(`.tile.letter[data-letter="${normalized}"]`)].filter(t => !t.classList.contains('revealed'));
        const lastTile = unrevealed[unrevealed.length - 1];
        revealLetter(letter, true, null);

        const gain = occurrences * 500;
        if (lastTile) setTimeout(() => showFloatingScore(lastTile, `+€${gain}`, true), (occurrences - 1) * 1500 + 600);

        setTimeout(() => {
            const gain = occurrences * 500;
            gameState.expressAccumulated += gain;
            soundManager.playCash();
            checkExpressBanner();
            flashExpressBanner(`+€${gain}`);
            renderPlayersList();

            if (checkWin()) {
                // endManche is injected to avoid circular dep
                _endManche();
            } else {
                updateUI();
                elements.expressConsonantInput.focus();
            }
        }, occurrences * 1500 + 500);
    } else {
        triggerExpressBankruptcy(t('msg.notpresent.inline'), letter);
    }
}

export function buyExpressVowel() {
    const letter = elements.expressVowelInput.value.trim().toUpperCase();
    elements.expressVowelInput.value = '';
    const player = getCurrentPlayer();

    if (!letter) return;
    if (!isVowel(letter)) {
        showMessage(t('msg.vowelsonly'), 'error');
        return;
    }

    const cost = 500;
    if (gameState.expressAccumulated < cost) {
        showMessage(t('msg.insufficientbalance'), 'error');
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        triggerExpressBankruptcy(t('msg.alreadycalled.inline'), letter);
        return;
    }

    gameState.expressAccumulated -= cost;

    gameState.usedLetters.add(normalized);
    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        revealLetter(letter, true, null);
        setTimeout(() => {
            checkExpressBanner();
            flashExpressBanner(`-€${cost}`);
            if (checkWin()) {
                _endManche();
            } else {
                updateUI();
                elements.expressVowelInput.focus();
            }
        }, occurrences * 1500 + 500);
    } else {
        triggerExpressBankruptcy(t('msg.notpresent.inline'), letter);
    }
}

export function triggerExpressBankruptcy(reason, letter = null) {
    soundManager.stopExpress();
    const player = getCurrentPlayer();
    const hasShield = gameState.hasShield[player.name];

    gameState.expressAccumulated = 0;
    gameState.wheelPhase = 'idle';
    hideExpressBanner();
    if (elements.boardInner) elements.boardInner.classList.remove('express-active');

    if (hasShield) {
        gameState.hasShield[player.name] = false;
        soundManager.playReveal();
        renderPlayersList();
        showPopup(npPopup({ badge: t('wheel.shield.used.title'), badgeColor: 'green', avatar: avatarUrl(player.name), main: player.name, sub: t('wheel.shield.safe') }), 4000, 'subtle-success slim-pad');
        setTimeout(passTurn, 4500);
    } else {
        soundManager.playGameOver();
        gameState.partialScores[player.name] = 0;
        renderPlayersList();
        const mainHtml = letter ? `<span class="np-letter">${letter}</span>` : `<span class="np-main-text">${t('msg.crollo.title')}</span>`;
        showPopup(npPopup({ badge: t('msg.crollo.title'), badgeColor: 'red', main: mainHtml, sub: reason }), 4000, 'danger slim-pad');
        setTimeout(passTurn, 4500);
    }
}

export function endExpress() {
    soundManager.stopExpress();
    hideExpressBanner();
    if (elements.boardInner) elements.boardInner.classList.remove('express-active');
}

// Forward reference — endManche injected to avoid circular deps
let _endManche = () => {};
export function setEndManche(fn) { _endManche = fn; }
