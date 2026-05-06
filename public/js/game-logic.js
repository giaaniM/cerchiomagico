/**
 * game-logic.js — Core game flow: consonant calls, vowel buys, solving, manche lifecycle
 * This is the NEW modular equivalent of the "core" parts of the monolithic game.js
 */
import { gameState, socketState, VOWEL_COST, TOTAL_MANCHES, API_URL } from './state.js';
import { elements } from './elements.js';
import { normalizeChar, normalizePhrase, sanitizePhrase, isVowel, showScreen, showMessage, showPopup, popup, showFloatingScore } from './utils.js';
import { soundManager } from './sound.js';
import { getCurrentPlayer, passTurn, renderPlayersList } from './players.js';
import { updateUI, showPartialRanking, showFinalResults, hideExpressBanner, hideFinalRoundBanner } from './ui.js';
import { createBoard, revealLetter, countLetterOccurrences, checkAllConsonantsRevealed, checkWin, splitPhraseIntoRows } from './board.js';
import { drawWheel, renderWheelToCache, WHEEL_SEGMENTS } from './wheel.js';
import { syncGameState } from './socket.js';

// PUZZLE_DATABASE is a global loaded from puzzles.js
/* global PUZZLE_DATABASE */

const OFFLINE_PHRASES = [
    { phrase: "CHI DORME NON PIGLIA PESCI", hint: "Proverbio" },
    { phrase: "NON DIRE GATTO SE NON CE L HAI NEL SACCO", hint: "Proverbio" },
    { phrase: "LA RUOTA DELLA FORTUNA GIRA PER TUTTI", hint: "Modo di dire" },
    { phrase: "NON TUTTO QUEL CHE LUCCICA E ORO", hint: "Proverbio" },
    { phrase: "CHI TROVA UN AMICO TROVA UN TESORO", hint: "Proverbio" },
    { phrase: "FINCHE LA BARCA VA LASCIALA ANDARE", hint: "Canzone" },
    { phrase: "CANTARE SOTTO LA PIOGGIA BATTENTE", hint: "Film (Titolo lungo)" },
    { phrase: "L IMPORTANTE NON E VINCERE MA PARTECIPARE", hint: "Citazione Sportiva" },
    { phrase: "ROSSO DI SERA BEL TEMPO SI SPERA", hint: "Proverbio" },
    { phrase: "A CAVAL DONATO NON SI GUARDA IN BOCCA", hint: "Proverbio" },
    { phrase: "BALLA COI LUPI NELLA FORESTA", hint: "Film (Esteso)" },
    { phrase: "L APPETITO VIEN MANGIANDO E BEVENDO", hint: "Modo di dire" },
    { phrase: "MOGLIE E BUOI DEI PAESI TUOI", hint: "Proverbio" },
    { phrase: "IL MATTINO HA L ORO IN BOCCA", hint: "Proverbio" },
    { phrase: "TUTTE LE STRADE PORTANO A ROMA", hint: "Proverbio" }
];

// ===== Confetti helpers =====
function triggerConfettiRain() {
    if (typeof confetti === 'undefined') return;

    const duration = 3000;
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

        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        }));

        confetti(Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        }));
    }, 250);
}

// ===== Board fit check =====
export function canFitOnBoard(phrase) {
    const words = phrase.split(' ');
    return !!splitPhraseIntoRows(words, [12, 14, 14, 12]);
}

// ===== Letter Actions =====
export function callConsonant() {
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
            earnings = gameState.finalRoundValue * occurrences;
        } else {
            earnings = gameState.pendingWheelValue * occurrences;
        }

        const unrevealed = [...document.querySelectorAll(`.tile.letter[data-letter="${normalized}"]`)].filter(t => !t.classList.contains('revealed'));
        const lastTile = unrevealed[unrevealed.length - 1];

        revealLetter(letter, true, null);
        if (socketState.isMobileMode) syncGameState();

        const delay = occurrences * 1500;
        if (earnings > 0 && lastTile) {
            setTimeout(() => showFloatingScore(lastTile, `+€${earnings}`), (occurrences - 1) * 1500 + 600);
        }
        setTimeout(() => {
            if (specialAction !== 'RADDOPPIA' && specialAction !== 'RADDOPPIA_ZERO' && specialAction !== 'SCUDO') {
                gameState.partialScores[player.name] += earnings;
                renderPlayersList();
                soundManager.playCash();
            }
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
                if (socketState.isMobileMode) syncGameState();
            }
        }, delay + 500);

    } else {
        soundManager.playError();
        gameState.pendingWheelValue = null;
        elements.currentWheelValue.textContent = '-';
        showPopup(popup('❌', `"${letter}" NON PRESENTE`, 'Turno perso'), 3000, 'danger');
        setTimeout(passTurn, 3000);
    }
}

export function buyVowel() {
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
    if (socketState.isMobileMode) syncGameState();

    const occurrences = countLetterOccurrences(letter);

    if (occurrences > 0) {
        revealLetter(letter, true, null);
        showMessage(`🎉 "${letter}" trovata ${occurrences} volta/e!`, 'success');

        if (checkWin()) {
            setTimeout(endManche, 1500);
        } else {
            if (gameState.currentManche === 5) {
                gameState.wheelPhase = 'final_play';
            } else {
                gameState.wheelPhase = 'choose_action';
            }
            updateUI();
            if (socketState.isMobileMode) syncGameState();
        }
    } else {
        soundManager.playError();
        const costText = (gameState.currentManche === 5) ? "" : ` (-€${VOWEL_COST})`;
        showMessage(`❌ "${letter}" non c'è nella frase.${costText}`, 'error');
        showPopup(popup('❌', `"${letter}" NON PRESENTE`, 'Turno perso'), 2000, 'danger');
        setTimeout(passTurn, 2500);
    }
}

export function trySolve() {
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
        soundManager.playWin();
        showMessage('🎉🎉 ESATTO! HAI INDOVINATO! 🎉🎉', 'success');
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

            if (elements.boardInner) elements.boardInner.classList.remove('express-active');

            showPopup(popup('💥', 'PERDITUTTO!', 'Soluzione errata — perdi tutto'), 4000, 'danger');
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
export function endManche() {
    soundManager.stopExpress();
    hideExpressBanner();
    hideFinalRoundBanner();

    if (elements.boardInner) elements.boardInner.classList.remove('express-active');

    const winner = getCurrentPlayer();

    const currentBank = (Number(gameState.partialScores[winner.name]) || 0) + (Number(gameState.expressAccumulated) || 0);
    if (currentBank === 0) {
        gameState.partialScores[winner.name] = 1000;
    }

    if (gameState.expressAccumulated > 0) {
        gameState.partialScores[winner.name] += gameState.expressAccumulated;
        gameState.expressAccumulated = 0;
    }

    const winnings = Number(gameState.partialScores[winner.name]) || 0;
    gameState.totalScores[winner.name] = (Number(gameState.totalScores[winner.name]) || 0) + winnings;

    gameState.lastMancheWinnerIndex = gameState.currentPlayerIndex;

    updateUI();
    if (socketState.isMobileMode) syncGameState();

    triggerConfettiRain();
    soundManager.playWinner();
    soundManager.playCrowdCheer();

    showPopup(popup('🏆', `MANCHE ${gameState.currentManche} VINTA!`, `${winner.name}<br><strong style="color:#4ade80;font-size:1.3em">+€${winnings.toLocaleString('it-IT')}</strong>`), 3000, 'subtle-success');

    // Clear board
    if (elements.gameBoard) elements.gameBoard.innerHTML = '';

    markPhraseAsWon(gameState.originalPhrase || gameState.phrase);

    setTimeout(() => {
        showPartialRanking();

        setTimeout(() => {
            elements.popupMessage.style.display = 'none';
            elements.modalOverlay.style.display = 'none';

            if (gameState.currentManche >= TOTAL_MANCHES) {
                showFinalResults(newGame);
            } else {
                gameState.currentManche++;
                startNextManche();
            }
        }, 4000);
    }, 3000);
}

export function startNextManche() {
    // Reset state
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.pendingWheelValue = null;
    gameState.wheelPhase = 'idle';

    // --- FINAL ROUND INIT ---
    if (gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_spin';
        gameState.finalSpinComplete = false;
        gameState.finalRoundValue = 0;
    }

    // Reset partial scores
    gameState.players.forEach(p => gameState.partialScores[p.name] = 0);

    // Increase the "1000" segment value each manche
    const base1000Value = 1000;
    const currentWheel1000 = base1000Value * gameState.currentManche;
    if (WHEEL_SEGMENTS[5]) {
        WHEEL_SEGMENTS[5].value = currentWheel1000;
        WHEEL_SEGMENTS[5].label = `${currentWheel1000}€`;
    }
    renderWheelToCache();

    gameState.currentPlayerIndex = (gameState.currentManche - 1) % gameState.players.length;

    if (gameState.lastMancheWinnerIndex !== undefined && gameState.currentPlayerIndex === gameState.lastMancheWinnerIndex) {
        gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    }
    delete gameState.lastMancheWinnerIndex;

    // AI PHRASE GENERATION — disabilitato, riattiva decommentando il blocco sotto
    // showPopup(`<div class="popup-loading">Generando frase per Manche ${gameState.currentManche}...</div>`, 0);

    // Select phrase from local PUZZLE_DATABASE
    let valid = false;
    let attempts = 0;

    // Load permanently excluded phrases from localStorage
    const saved = localStorage.getItem('won_phrases');
    if (saved) {
        const list = JSON.parse(saved);
        gameState.excludedPhrases = new Set(list.map(p => normalizePhrase(p)));
    }

    // AI phrase selection — disabilitato
    // const aiPool = (gameState.aiPhrases || []).slice();
    // for (let i = aiPool.length - 1; i > 0; i--) {
    //     const j = Math.floor(Math.random() * (i + 1));
    //     [aiPool[i], aiPool[j]] = [aiPool[j], aiPool[i]];
    // }
    // for (const puzzle of aiPool) {
    //     if (valid) break;
    //     const normalized = normalizePhrase(puzzle.phrase);
    //     const isNotUsed = !gameState.usedPhrases.has(normalized);
    //     const isNotExcluded = !gameState.excludedPhrases.has(normalized);
    //     const words = puzzle.phrase.split(' ');
    //     const fits = !!splitPhraseIntoRows(words, [12, 14, 14, 12]);
    //     if (fits && isNotUsed && isNotExcluded) {
    //         gameState.originalPhrase = puzzle.phrase;
    //         gameState.phrase = sanitizePhrase(puzzle.phrase);
    //         gameState.hint = puzzle.hint;
    //         gameState.usedPhrases.add(normalized);
    //         valid = true;
    //     }
    // }

    while (!valid && attempts < 200) {
        attempts++;
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];
        const normalized = normalizePhrase(randomPuzzle.phrase);
        const isNotUsed = !gameState.usedPhrases.has(normalized);
        const isNotExcluded = !gameState.excludedPhrases.has(normalized);

        const words = randomPuzzle.phrase.split(' ');
        const fits = !!splitPhraseIntoRows(words, [12, 14, 14, 12]);

        if (fits && isNotUsed && isNotExcluded) {
            gameState.originalPhrase = randomPuzzle.phrase;
            gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
            gameState.hint = randomPuzzle.hint;
            gameState.usedPhrases.add(normalized);
            valid = true;
        }
    }

    if (!valid) {
        const fallback = OFFLINE_PHRASES[0];
        gameState.originalPhrase = fallback.phrase;
        gameState.phrase = sanitizePhrase(fallback.phrase);
        gameState.hint = fallback.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.allConsonantsRevealed = checkAllConsonantsRevealed();
    console.log(`🎡 Manche ${gameState.currentManche} — [${gameState.hint}] ${gameState.originalPhrase}`);

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
    if (socketState.isMobileMode) syncGameState();

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

export async function startGameDirectly(players) {
    console.log('startGameDirectly called with:', players);
    if (!players || players.length === 0) {
        console.error('Cannot start game directly with 0 players');
        return;
    }

    gameState.players = players.sort(() => Math.random() - 0.5);
    gameState.currentPlayerIndex = 0;
    gameState.totalScores = {};
    gameState.partialScores = {};
    gameState.aiPhrases = [];

    gameState.players.forEach(p => {
        gameState.totalScores[p.name] = 0;
        gameState.partialScores[p.name] = 0;
    });

    if (elements.setupScreen) elements.setupScreen.classList.remove('active');
    if (elements.gameScreen) elements.gameScreen.classList.add('active');

    // AI PHRASE GENERATION — disabilitato, riattiva decommentando le righe sotto
    // showPopup('<div class="popup-loading">✨ Preparando la partita...</div>', 0);
    // await fetchAIPhrases();
    // elements.popupMessage.style.display = 'none';
    // elements.modalOverlay.style.display = 'none';

    startNewManche();
    renderPlayersList();
}

async function fetchAIPhrases() {
    try {
        const res = await fetch('/api/generate-phrases');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        gameState.aiPhrases = data.phrases || [];
        console.log(`AI: ${gameState.aiPhrases.length} frasi generate`);
    } catch (e) {
        console.warn('AI phrase fetch fallita, uso database locale:', e.message);
        gameState.aiPhrases = [];
    }
}

export function startNewManche() {
    startGameLocal();
}

export function startGameLocal() {
    if (!gameState.currentManche) {
        gameState.currentManche = 1;
    } else {
        gameState.currentManche++;
    }

    const base1000Value = 1000;
    const currentWheelTopValue = base1000Value * gameState.currentManche;
    const topSegment = WHEEL_SEGMENTS.find(s => s.isTopValue);
    if (topSegment) {
        topSegment.value = currentWheelTopValue;
        topSegment.label = `${currentWheelTopValue}€`;
    }
    renderWheelToCache();

    gameState.currentPlayerIndex = (gameState.currentManche - 1) % gameState.players.length;

    showScreen('game-screen');

    let valid = false;
    let attempts = 0;

    if (!gameState.usedPhrases) {
        gameState.usedPhrases = new Set();
    }

    // Carica frasi già vinte da localStorage (esclusione permanente per browser)
    const savedWon = localStorage.getItem('won_phrases');
    if (savedWon) {
        const list = JSON.parse(savedWon);
        gameState.excludedPhrases = new Set(list.map(p => normalizePhrase(p)));
    }

    if (gameState.usedPhrases.size >= PUZZLE_DATABASE.length) {
        console.log('All phrases used! Resetting pool.');
        gameState.usedPhrases.clear();
    }

    while (!valid && attempts < 1000) {
        attempts++;
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];
        const normalized = normalizePhrase(randomPuzzle.phrase);
        const fits = !!splitPhraseIntoRows(randomPuzzle.phrase.split(' '), [12, 14, 14, 12]);
        if (!gameState.usedPhrases.has(normalized) && fits) {
            gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
            gameState.originalPhrase = randomPuzzle.phrase;
            gameState.hint = randomPuzzle.hint;
            gameState.usedPhrases.add(normalized);
            valid = true;
        }
    }
    if (!valid) {
        const fallback = PUZZLE_DATABASE.find(p => {
            const words = p.phrase.split(' ');
            return !!splitPhraseIntoRows(words, [12, 14, 14, 12]);
        }) || OFFLINE_PHRASES[0];
        gameState.phrase = sanitizePhrase(fallback.phrase);
        gameState.originalPhrase = fallback.phrase;
        gameState.hint = fallback.hint;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    console.log(`🎡 Manche ${gameState.currentManche} — [${gameState.hint}] ${gameState.originalPhrase}`);
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.wheelPhase = 'idle';

    // --- FINAL ROUND INIT (LOCAL) ---
    if (gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_spin';
        gameState.finalSpinComplete = false;
        gameState.finalRoundValue = 0;
        document.body.classList.add('manche-finale');
    } else {
        document.body.classList.remove('manche-finale');
    }

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

    if (socketState.isMobileMode) {
        syncGameState();
    }
}

export function skipPhrase() {
    // Segna la frase attuale come usata in questa sessione (non la esclude per sempre)
    if (gameState.phrase) {
        gameState.usedPhrases.add(normalizePhrase(gameState.phrase));
    }

    // Reset stato manche (non tocca totalScores)
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.pendingWheelValue = null;
    gameState.nextValueMultiplier = 1;
    gameState.wheelPhase = 'idle';
    gameState.allConsonantsRevealed = false;
    gameState.expressAccumulated = 0;
    gameState.hasShield = gameState.hasShield || {};

    // Reset punteggi parziali manche corrente
    gameState.players.forEach(p => { gameState.partialScores[p.name] = 0; });

    // Seleziona nuova frase
    let valid = false;
    let attempts = 0;
    while (!valid && attempts < 200) {
        attempts++;
        const randomPuzzle = PUZZLE_DATABASE[Math.floor(Math.random() * PUZZLE_DATABASE.length)];
        const normalized = normalizePhrase(randomPuzzle.phrase);
        const isNotUsed = !gameState.usedPhrases.has(normalized);
        const isNotExcluded = !gameState.excludedPhrases.has(normalized);
        const fits = !!splitPhraseIntoRows(randomPuzzle.phrase.split(' '), [12, 14, 14, 12]);
        if (fits && isNotUsed && isNotExcluded) {
            gameState.originalPhrase = randomPuzzle.phrase;
            gameState.phrase = sanitizePhrase(randomPuzzle.phrase);
            gameState.hint = randomPuzzle.hint;
            gameState.usedPhrases.add(normalized);
            valid = true;
        }
    }

    if (!valid) {
        gameState.usedPhrases.clear();
        skipPhrase();
        return;
    }

    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.allConsonantsRevealed = checkAllConsonantsRevealed();
    console.log(`↻ Skip → Manche ${gameState.currentManche} — [${gameState.hint}] ${gameState.originalPhrase}`);

    elements.popupMessage.style.display = 'none';
    elements.modalOverlay.style.display = 'none';
    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';
    elements.hintText.textContent = gameState.hint;
    createBoard();
    drawWheel(0);
    renderPlayersList();
    updateUI();
}

export function newGame() {
    soundManager.playClick();
    if (gameState.currentManche) {
        showPopup(`<div class="popup-body">
            <div class="popup-icon">⚠️</div>
            <div class="popup-title">ABBANDONARE LA PARTITA?</div>
            <div class="popup-text">I progressi andranno persi.</div>
            <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
                <button onclick="document.getElementById('modal-overlay').style.display='none';document.getElementById('popup-message').style.display='none'" class="btn-secondary" style="padding:8px 20px">Annulla</button>
                <button onclick="window._confirmNewGame()" class="btn-solve" style="padding:8px 20px">Abbandona</button>
            </div>
        </div>`, 0, 'warning');
        window._confirmNewGame = _doNewGame;
        return;
    }
    _doNewGame();
}

function _doNewGame() {
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('popup-message').style.display = 'none';
    showScreen('setup-screen');
    elements.modeSelection.style.display = 'block';

    if (elements.setupLocalPlayers) elements.setupLocalPlayers.style.display = 'none';
    if (elements.setupLocalNames) elements.setupLocalNames.style.display = 'none';
    if (elements.setupSmartphoneMode) elements.setupSmartphoneMode.style.display = 'none';

    gameState.currentManche = null;
    gameState.players = [];
    gameState.usedPhrases = new Set();
    gameState.totalScores = {};
    hideFinalRoundBanner();
    document.body.classList.remove('manche-finale');
}

export function markPhraseAsWon(phrase) {
    if (!phrase) return;
    const normalized = normalizePhrase(phrase);
    gameState.excludedPhrases.add(normalized);

    try {
        const saved = localStorage.getItem('won_phrases');
        let list = saved ? JSON.parse(saved) : [];
        if (!list.includes(phrase)) {
            list.push(phrase);
            localStorage.setItem('won_phrases', JSON.stringify(list));
        }
    } catch (e) {
        console.error("Error saving won phrase to localStorage:", e);
    }

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
        });
}
