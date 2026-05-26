/**
 * game-logic.js — Core game flow: consonant calls, vowel buys, solving, manche lifecycle
 * This is the NEW modular equivalent of the "core" parts of the monolithic game.js
 */
import { gameState, socketState, VOWEL_COST, TOTAL_MANCHES, API_URL } from './state.js';
import { startSoloTimer, stopSoloTimer, recordRoundSplit, showSoloResults, SOLO_ROUNDS, addTimePenalty, initSoloRecord } from './solo.js';

let _onNewGame = () => {};
export function setOnNewGame(fn) { _onNewGame = fn; }
import { t, getCurrentLang } from './lang.js';
import { elements } from './elements.js';
import { normalizeChar, normalizePhrase, sanitizePhrase, isVowel, showScreen, showMessage, showPopup, popup, npPopup, avatarUrl, preloadAvatars, showFloatingScore } from './utils.js';
import { applyMobileLayout } from './mobile-layout.js';
import { soundManager } from './sound.js';
import { getCurrentPlayer, passTurn, renderPlayersList } from './players.js';
import { updateUI, showPartialRanking, showFinalResults, hideExpressBanner, hideFinalRoundBanner } from './ui.js';
import { createBoard, revealLetter, countLetterOccurrences, checkAllConsonantsRevealed, checkWin, splitPhraseIntoRows } from './board.js';
import { drawWheel, renderWheelToCache, WHEEL_SEGMENTS } from './wheel.js';
import { syncGameState } from './socket.js';

const OFFLINE_PHRASES_IT = [
    { phrase: "CHI DORME NON PIGLIA PESCI", hint: "Proverbio" },
    { phrase: "NON DIRE GATTO SE NON CE L HAI NEL SACCO", hint: "Proverbio" },
    { phrase: "LA RUOTA DELLA FORTUNA GIRA PER TUTTI", hint: "Modo di dire" },
    { phrase: "NON TUTTO QUEL CHE LUCCICA E ORO", hint: "Proverbio" },
    { phrase: "CHI TROVA UN AMICO TROVA UN TESORO", hint: "Proverbio" },
    { phrase: "FINCHE LA BARCA VA LASCIALA ANDARE", hint: "Canzone" },
    { phrase: "CANTARE SOTTO LA PIOGGIA BATTENTE", hint: "Film" },
    { phrase: "L IMPORTANTE NON E VINCERE MA PARTECIPARE", hint: "Citazione" },
    { phrase: "ROSSO DI SERA BEL TEMPO SI SPERA", hint: "Proverbio" },
    { phrase: "A CAVAL DONATO NON SI GUARDA IN BOCCA", hint: "Proverbio" },
    { phrase: "BALLA COI LUPI NELLA FORESTA", hint: "Film" },
    { phrase: "L APPETITO VIEN MANGIANDO E BEVENDO", hint: "Modo di dire" },
    { phrase: "MOGLIE E BUOI DEI PAESI TUOI", hint: "Proverbio" },
    { phrase: "IL MATTINO HA L ORO IN BOCCA", hint: "Proverbio" },
    { phrase: "TUTTE LE STRADE PORTANO A ROMA", hint: "Proverbio" }
];

const OFFLINE_PHRASES_EN = [
    { phrase: "THE EARLY BIRD CATCHES THE WORM", hint: "Proverb" },
    { phrase: "ALL THAT GLITTERS IS NOT GOLD", hint: "Proverb" },
    { phrase: "ACTIONS SPEAK LOUDER THAN WORDS", hint: "Proverb" },
    { phrase: "EVERY CLOUD HAS A SILVER LINING", hint: "Proverb" },
    { phrase: "BETTER LATE THAN NEVER", hint: "Proverb" },
    { phrase: "THE PEN IS MIGHTIER THAN THE SWORD", hint: "Proverb" },
    { phrase: "DONT COUNT YOUR CHICKENS BEFORE THEY HATCH", hint: "Proverb" },
    { phrase: "A PICTURE IS WORTH A THOUSAND WORDS", hint: "Saying" },
    { phrase: "WHERE THERE IS A WILL THERE IS A WAY", hint: "Proverb" },
    { phrase: "YOU CANT JUDGE A BOOK BY ITS COVER", hint: "Proverb" },
    { phrase: "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG", hint: "Phrase" },
    { phrase: "GONE WITH THE WIND", hint: "Movie" },
    { phrase: "TO BE OR NOT TO BE THAT IS THE QUESTION", hint: "Shakespeare" },
    { phrase: "MAY THE FORCE BE WITH YOU", hint: "Movie" },
    { phrase: "THERE IS NO PLACE LIKE HOME", hint: "Movie" }
];

let puzzleDatabase = [...OFFLINE_PHRASES_IT];
let phraseIndex = 0;

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

const PLAYED_KEY = 'ms_played_phrases_v1';

function getPlayedIds(lang) {
    try {
        const data = JSON.parse(localStorage.getItem(PLAYED_KEY) || '{}');
        return new Set(data[lang] || []);
    } catch { return new Set(); }
}

function markPlayed(lang, id) {
    if (id == null) return;
    try {
        const data = JSON.parse(localStorage.getItem(PLAYED_KEY) || '{}');
        if (!data[lang]) data[lang] = [];
        if (!data[lang].includes(id)) data[lang].push(id);
        localStorage.setItem(PLAYED_KEY, JSON.stringify(data));
    } catch {}
}

function pickNextPhrase() {
    const lang = getCurrentLang();
    const played = getPlayedIds(lang);

    // Phrases with ids (from Supabase) — filter out already played
    const hasIds = puzzleDatabase.some(p => p.id != null);
    if (hasIds) {
        let available = puzzleDatabase.filter(p => !played.has(p.id));
        if (available.length === 0) {
            // All played — reset and use full db
            try {
                const data = JSON.parse(localStorage.getItem(PLAYED_KEY) || '{}');
                data[lang] = [];
                localStorage.setItem(PLAYED_KEY, JSON.stringify(data));
            } catch {}
            available = puzzleDatabase;
        }
        const puzzle = available[Math.floor(Math.random() * available.length)];
        markPlayed(lang, puzzle.id);
        return puzzle;
    }

    // Offline fallback — use old index rotation
    if (phraseIndex >= puzzleDatabase.length) {
        shuffleArray(puzzleDatabase);
        phraseIndex = 0;
    }
    return puzzleDatabase[phraseIndex++];
}

let _loadGen = 0;
let _puzzlesReady = false;
let _puzzlesResolve = null;
export const puzzlesReady = new Promise(res => { _puzzlesResolve = res; });

export async function loadPuzzles() {
    const gen = ++_loadGen;
    const lang = getCurrentLang();
    const offlineFallback = lang === 'en' ? OFFLINE_PHRASES_EN : OFFLINE_PHRASES_IT;
    try {
        const res = await fetch(`/api/puzzles?lang=${lang}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (gen !== _loadGen) return;
        if (Array.isArray(data) && data.length > 0) {
            puzzleDatabase = data.filter(p => canFitOnBoard(p.phrase));
            shuffleArray(puzzleDatabase);
            phraseIndex = 0;
            console.log(`[PUZZLES] Loaded ${data.length} phrases (lang=${lang}) from Supabase`);
        } else {
            puzzleDatabase = offlineFallback;
            console.warn('[PUZZLES] Empty response, using offline fallback');
        }
    } catch (err) {
        if (gen !== _loadGen) return;
        puzzleDatabase = offlineFallback;
        console.warn('[PUZZLES] Failed to load from server, using offline fallback:', err);
    } finally {
        if (!_puzzlesReady) { _puzzlesReady = true; _puzzlesResolve?.(); }
    }
}

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
    elements.consonantInput.blur();

    if (!letter || !/^[A-ZÀ-ÿ]$/.test(letter)) {
        showMessage(t('msg.invalidletter'), 'error');
        soundManager.playError();
        return;
    }

    const player = getCurrentPlayer();

    if (isVowel(letter)) {
        soundManager.playError();
        showMessage(t('msg.calledvowel'), 'error');
        showPopup(npPopup({ badge: t('msg.insertedvowel.title'), badgeColor: 'red', avatar: avatarUrl(player.name), main: player.name, sub: t('msg.insertedvowel.body') }), 2500, 'danger slim-pad');
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        soundManager.playError();
        if (gameState.soloMode) {
            const sec = 15;
            addTimePenalty(sec);
            gameState.pendingWheelValue = null;
            elements.currentWheelValue.textContent = '-';
            gameState.wheelPhase = 'idle';
            updateUI();
        } else {
            showPopup(npPopup({ badge: t('msg.alreadycalled.title'), badgeColor: 'red', avatar: avatarUrl(player.name), main: player.name, sub: t('msg.alreadycalled.body') }), 3000, 'danger slim-pad');
            setTimeout(passTurn, 3000);
        }
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
                showPopup(npPopup({ badge: 'RADDOPPIA! 🔥', badgeColor: 'gold', avatar: avatarUrl(player.name), main: player.name, sub: isZero ? `Bonus: €${final}` : `Da €${current} → €${final}` }), 3500, 'subtle-success slim-pad');
                renderPlayersList();
                soundManager.playCash();
            } else if (specialAction === 'SCUDO') {
                if (gameState.hasShield[player.name]) {
                    // Already has shield → €1000 bonus
                    gameState.partialScores[player.name] = (gameState.partialScores[player.name] || 0) + 1000;
                    showPopup(npPopup({ badge: t('msg.shield.title'), badgeColor: 'blue', avatar: avatarUrl(player.name), main: player.name, sub: 'Hai già lo scudo! Bonus €1.000 💰' }), 2500, 'subtle-success slim-pad');
                } else {
                    gameState.hasShield[player.name] = true;
                    showPopup(npPopup({ badge: t('msg.shield.title'), badgeColor: 'green', avatar: avatarUrl(player.name), main: player.name, sub: t('msg.shield.body') }), 2500, 'subtle-success slim-pad');
                }
                renderPlayersList();
            }

            soundManager.playCrowdApplause();

            if (checkWin()) {
                setTimeout(endManche, 1500);
            } else {
                const wasFinished = gameState.allConsonantsRevealed;
                gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

                if (!wasFinished && gameState.allConsonantsRevealed) {
                    showPopup(npPopup({ badge: t('msg.consonantsfinished.title'), badgeColor: 'green', main: t('msg.consonantsfinished.body') }), 2500, 'subtle-success slim-pad');
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
        if (gameState.wheelPhase === 'express') {
            soundManager.stopExpress();
            hideExpressBanner();
            if (elements.boardInner) elements.boardInner.classList.remove('express-active');
            gameState.expressAccumulated = 0;
            gameState.wheelPhase = 'idle';
            if (gameState.hasShield[player.name]) {
                gameState.hasShield[player.name] = false;
                soundManager.playReveal();
                renderPlayersList();
                showPopup(npPopup({ badge: t('wheel.shield.used.title'), badgeColor: 'green', avatar: avatarUrl(player.name), main: player.name, sub: t('wheel.shield.safe') }), 4000, 'subtle-success slim-pad');
            } else {
                soundManager.playGameOver();
                gameState.partialScores[player.name] = 0;
                renderPlayersList();
                showPopup(npPopup({ badge: t('msg.crollo.title'), badgeColor: 'red', main: `<span class="np-letter">${letter}</span>`, sub: t('msg.crollo.body') }), 4000, 'danger slim-pad');
            }
            setTimeout(passTurn, 4500);
        } else if (gameState.soloMode) {
            const sec = 20;
            addTimePenalty(sec);
            gameState.wheelPhase = 'idle';
            updateUI();
        } else {
            showPopup(npPopup({
                badge: t('popup.lettera_errata'),
                badgeColor: 'red',
                main: `<span class="np-letter">${letter}</span>`,
                sub: t('msg.turnoflost'),
            }), 3000, 'danger slim-pad');
            setTimeout(passTurn, 3000);
        }
    }
}

export function buyVowel() {
    const letter = elements.vowelInput.value.trim().toUpperCase();
    elements.vowelInput.value = '';
    elements.vowelInput.blur();
    const player = getCurrentPlayer();

    if (!letter || !/^[AEIOUÀÈÌÒÙàèìòù]$/i.test(letter)) {
        showMessage(t('msg.invalidvowel'), 'error');
        soundManager.playError();
        return;
    }

    if (!isVowel(letter)) {
        showMessage(t('msg.insertvowel'), 'error');
        soundManager.playError();
        return;
    }

    // Free Vowels in Final Round
    if (gameState.wheelPhase !== 'final_play' && gameState.partialScores[player.name] < VOWEL_COST) {
        showMessage(`${t('msg.notenoughmoney')}${VOWEL_COST}`, 'error');
        soundManager.playError();
        return;
    }

    const normalized = normalizeChar(letter);
    if (gameState.usedLetters.has(normalized)) {
        showMessage(`"${letter}" ${t('msg.alreadycalled.body')}`, 'error');
        soundManager.playError();
        showPopup(npPopup({ badge: t('msg.vowelalreadycalled.title'), badgeColor: 'red', avatar: avatarUrl(player.name), main: player.name, sub: t('msg.turnoflost') }), 2000, 'danger slim-pad');
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
        showMessage(`🎉 "${letter}" ×${occurrences}`, 'success');

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
        showMessage(`❌ "${letter}" ${t('msg.notfound')}${costText}`, 'error');
        showPopup(npPopup({ badge: `"${letter}" ${t('msg.notfound')}`, badgeColor: 'red', avatar: avatarUrl(player.name), main: player.name, sub: t('msg.turnoflost') }), 2000, 'danger slim-pad');
        setTimeout(passTurn, 2500);
    }
}

export function trySolve() {
    const guess = elements.solutionInput.value.trim().toUpperCase();
    elements.solutionInput.value = '';

    if (!guess) {
        showMessage(t('msg.writesolution'), 'error');
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
        showMessage(t('msg.correct'), 'success');
        document.querySelectorAll('.tile.letter').forEach(tile => {
            tile.classList.add('revealed');
        });
        setTimeout(endManche, 1500);
    } else {
        if (gameState.wheelPhase === 'express') {
            soundManager.stopExpress();
            hideExpressBanner();
            if (elements.boardInner) elements.boardInner.classList.remove('express-active');
            const player = getCurrentPlayer();
            gameState.expressAccumulated = 0;
            gameState.wheelPhase = 'idle';
            if (gameState.hasShield[player.name]) {
                gameState.hasShield[player.name] = false;
                soundManager.playReveal();
                renderPlayersList();
                showPopup(npPopup({ badge: t('wheel.shield.used.title'), badgeColor: 'green', avatar: avatarUrl(player.name), main: player.name, sub: t('wheel.shield.safe') }), 4000, 'subtle-success slim-pad');
            } else {
                soundManager.playGameOver();
                gameState.partialScores[player.name] = 0;
                renderPlayersList();
                showPopup(npPopup({ badge: t('msg.crollo.title'), badgeColor: 'red', main: `<span class="np-main-text">${t('msg.wrongsolution.title')}</span>`, sub: t('msg.crollo.body') }), 4000, 'danger slim-pad');
            }
            setTimeout(passTurn, 4500);
        } else if (gameState.soloMode) {
            const sec = 30;
            soundManager.playError();
            addTimePenalty(sec);
            gameState.wheelPhase = 'idle';
            updateUI();
        } else {
            soundManager.playError();
            showMessage(t('msg.wrongsolution'), 'error');
            const _solvePlayer = getCurrentPlayer();
            showPopup(npPopup({ badge: t('msg.wrongsolution.title'), badgeColor: 'red', avatar: avatarUrl(_solvePlayer.name), main: _solvePlayer.name, sub: t('msg.turnoflost') }), 2500, 'danger slim-pad');
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

    if (gameState.soloMode) recordRoundSplit();

    gameState.lastMancheWinnerIndex = gameState.currentPlayerIndex;

    updateUI();
    if (socketState.isMobileMode) syncGameState();

    triggerConfettiRain();
    soundManager.playWinner();
    soundManager.playCrowdCheer();

    const totalManche = gameState.soloMode ? SOLO_ROUNDS : TOTAL_MANCHES;
    const mancheLabel = gameState.soloMode
        ? t('solo.round.popup').replace('{n}', gameState.currentManche)
        : t('msg.manchewon').replace('{n}', gameState.currentManche);

    showPopup(npPopup({
        badge: mancheLabel,
        badgeColor: 'green',
        avatar: avatarUrl(winner.name),
        main: winner.name,
        sub: `<span class="np-money">+€${winnings.toLocaleString('it-IT')}</span>`,
    }), 3000, 'subtle-success slim-pad');

    // Clear board
    if (elements.gameBoard) elements.gameBoard.innerHTML = '';


    const endGameId = gameState.gameId;
    setTimeout(() => {
        if (gameState.gameId !== endGameId) return;

        if (gameState.customMode) {
            if (gameState.soloMode) stopSoloTimer();
            showPartialRanking();
            setTimeout(() => {
                if (gameState.gameId !== endGameId) return;
                elements.popupMessage.style.display = 'none';
                elements.modalOverlay.style.display = 'none';
                showFinalResults(newGame);
            }, 4000);
        } else if (gameState.soloMode) {
            elements.popupMessage.style.display = 'none';
            elements.modalOverlay.style.display = 'none';
            if (gameState.currentManche >= SOLO_ROUNDS) {
                showSoloResults(newGame);
            } else {
                gameState.currentManche++;
                startNextManche();
            }
        } else {
            showPartialRanking();
            setTimeout(() => {
                if (gameState.gameId !== endGameId) return;
                elements.popupMessage.style.display = 'none';
                elements.modalOverlay.style.display = 'none';
                if (gameState.currentManche >= TOTAL_MANCHES) {
                    showFinalResults(newGame);
                } else {
                    gameState.currentManche++;
                    startNextManche();
                }
            }, 4000);
        }
    }, 3000);
}

function mancheStartHtml(mancheLabel, hint, starterPlayer) {
    const starterHtml = starterPlayer ? `
        <div class="np-starter">
            <span class="np-starter-label">${t('popup.starts')}</span>
            <img class="np-starter-avatar" src="${avatarUrl(starterPlayer.name)}" alt="" loading="lazy">
            <span class="np-starter-name">${starterPlayer.name}</span>
        </div>` : '';
    return `<div class="np np-manche">
        <div class="np-badge np-badge--gold">${mancheLabel}</div>
        <div class="np-hint-cat">${t('popup.indizio')}</div>
        <div class="np-hint-txt">${hint}</div>
        ${starterHtml}
    </div>`;
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

    // Custom mode: use user-provided phrase
    if (gameState.customMode && gameState.customPhrase) {
        gameState.originalPhrase = gameState.customPhrase;
        gameState.phrase = sanitizePhrase(gameState.customPhrase);
        gameState.hint = gameState.customHint || 'Personalizzato';
        gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
        gameState.allConsonantsRevealed = checkAllConsonantsRevealed();
        elements.popupMessage.style.display = 'none';
        elements.modalOverlay.style.display = 'none';
        elements.currentWheelValue.textContent = '-';
        elements.currentWheelValue.className = 'wheel-value';
        elements.mancheNumber.textContent = '✏️';
        elements.hintText.textContent = gameState.hint;
        createBoard();
        drawWheel(0);
        renderPlayersList();
        updateUI();
        if (socketState.isMobileMode) syncGameState();
        showPopup(mancheStartHtml('FRASE PERSONALIZZATA', gameState.hint, getCurrentPlayer()), 4000, 'slim-pad');
        return;
    }

    const puzzle = pickNextPhrase();
    gameState.originalPhrase = puzzle.phrase;
    gameState.phrase = sanitizePhrase(puzzle.phrase);
    gameState.hint = puzzle.hint;
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
    if (socketState.isMobileMode) syncGameState();

    const mancheLabel5 = gameState.currentManche === 5
        ? `MANCHE ${gameState.currentManche} — FINALE`
        : `MANCHE ${gameState.currentManche}`;
    const starterOrNull = gameState.currentManche === 5 ? null : getCurrentPlayer();
    showPopup(mancheStartHtml(mancheLabel5, gameState.hint, starterOrNull), 4000, 'slim-pad');
}

export function startGameDirectly(players, soloMode = false, customOpts = null) {
    console.log('startGameDirectly called with:', players, 'solo:', soloMode);
    if (!players || players.length === 0) {
        console.error('Cannot start game directly with 0 players');
        return;
    }

    gameState.soloMode = soloMode;
    gameState.soloElapsedSeconds = 0;
    gameState.soloRoundSplits = [];
    gameState.customMode = !!customOpts;
    gameState.customPhrase = customOpts?.phrase || '';
    gameState.customHint = customOpts?.hint || '';

    gameState.gameId++;
    gameState.currentManche = null;
    gameState.players = soloMode ? players : players.sort(() => Math.random() - 0.5);
    preloadAvatars(gameState.players.map(p => p.name));
    gameState.currentPlayerIndex = 0;
    gameState.totalScores = {};
    gameState.partialScores = {};
    gameState.hasShield = {};
    gameState.aiPhrases = [];

    gameState.players.forEach(p => {
        gameState.totalScores[p.name] = 0;
        gameState.partialScores[p.name] = 0;
    });

    if (elements.setupScreen) elements.setupScreen.classList.remove('active');
    if (elements.gameScreen) elements.gameScreen.classList.add('active');
    const loader = document.getElementById('game-loader');
    if (loader) loader.classList.add('visible');

    if (soloMode && gameState.players[0]) initSoloRecord(gameState.players[0].name);

    startNewManche();
    renderPlayersList();

    // hide loader after board has painted
    requestAnimationFrame(() => requestAnimationFrame(() => {
        if (loader) {
            loader.classList.add('hiding');
            setTimeout(() => loader.classList.remove('visible', 'hiding'), 350);
        }
    }));
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
    if (WHEEL_SEGMENTS[5]) {
        WHEEL_SEGMENTS[5].value = currentWheelTopValue;
        WHEEL_SEGMENTS[5].label = `${currentWheelTopValue}€`;
    }
    renderWheelToCache();

    gameState.currentPlayerIndex = (gameState.currentManche - 1) % gameState.players.length;

    showScreen('game-screen');
    applyMobileLayout();
    document.getElementById('home-btn').style.display = 'flex';

    // Custom mode: use user-provided phrase
    if (gameState.customMode && gameState.customPhrase) {
        gameState.originalPhrase = gameState.customPhrase;
        gameState.phrase = sanitizePhrase(gameState.customPhrase);
        gameState.hint = gameState.customHint || 'Personalizzato';
        gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
        gameState.revealedLetters = new Set();
        gameState.usedLetters = new Set();
        gameState.wheelPhase = 'idle';
        gameState.pendingWheelValue = null;
        gameState.allConsonantsRevealed = checkAllConsonantsRevealed();
        elements.popupMessage.style.display = 'none';
        elements.modalOverlay.style.display = 'none';
        elements.mancheNumber.textContent = '✏️';
        const mancheTotalEl = document.getElementById('manche-total');
        if (mancheTotalEl) mancheTotalEl.textContent = '1';
        elements.hintText.textContent = gameState.hint;
        elements.currentWheelValue.textContent = '-';
        elements.currentWheelValue.className = 'wheel-value';
        const soloTimerWrap = document.getElementById('solo-timer-wrap');
        if (soloTimerWrap) soloTimerWrap.style.display = gameState.soloMode ? 'flex' : 'none';
        const gs = document.getElementById('game-screen');
        if (gs) gs.classList.toggle('has-timer', !!gameState.soloMode);
        if (gameState.soloMode && gameState.currentManche === 1) setTimeout(startSoloTimer, 2500);
        createBoard();
        drawWheel(0);
        renderPlayersList();
        updateUI();
        if (socketState.isMobileMode) syncGameState();
        showPopup(mancheStartHtml('FRASE PERSONALIZZATA', gameState.hint, gameState.soloMode ? null : getCurrentPlayer()), 2500, 'slim-pad');
        return;
    }

    const puzzle = pickNextPhrase();
    gameState.originalPhrase = puzzle.phrase;
    gameState.phrase = sanitizePhrase(puzzle.phrase);
    gameState.hint = puzzle.hint;
    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.revealedLetters = new Set();
    gameState.usedLetters = new Set();
    gameState.wheelPhase = 'idle';

    // --- FINAL ROUND INIT (LOCAL) — skip in solo mode ---
    if (!gameState.soloMode && gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_spin';
        gameState.finalSpinComplete = false;
        gameState.finalRoundValue = 0;
        document.body.classList.add('manche-finale');
    } else {
        document.body.classList.remove('manche-finale');
    }

    // Start timer on first manche of solo, after category popup closes
    if (gameState.soloMode && gameState.currentManche === 1) {
        setTimeout(startSoloTimer, 2500);
    }

    gameState.pendingWheelValue = null;
    gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

    elements.popupMessage.style.display = 'none';
    elements.modalOverlay.style.display = 'none';

    const totalRounds = gameState.soloMode ? SOLO_ROUNDS : 5;
    elements.mancheNumber.textContent = gameState.currentManche;
    const mancheTotalEl = document.getElementById('manche-total');
    if (mancheTotalEl) mancheTotalEl.textContent = totalRounds;
    elements.hintText.textContent = gameState.hint;
    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';

    // Show/hide solo timer bar
    const soloTimerWrap = document.getElementById('solo-timer-wrap');
    if (soloTimerWrap) soloTimerWrap.style.display = gameState.soloMode ? 'flex' : 'none';
    const gs = document.getElementById('game-screen');
    if (gs) gs.classList.toggle('has-timer', !!gameState.soloMode);

    createBoard();
    drawWheel(0);
    renderPlayersList();
    updateUI();

    const roundLabel = gameState.soloMode
        ? `${t('solo.round')} ${gameState.currentManche} ${t('solo.of')} ${SOLO_ROUNDS}`
        : `MANCHE ${gameState.currentManche}`;

    showPopup(mancheStartHtml(roundLabel, gameState.hint, gameState.soloMode ? null : getCurrentPlayer()), 2500, 'slim-pad');

    if (socketState.isMobileMode) {
        syncGameState();
    }
}

export function skipPhrase() {
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

    const puzzle = pickNextPhrase();
    gameState.originalPhrase = puzzle.phrase;
    gameState.phrase = sanitizePhrase(puzzle.phrase);
    gameState.hint = puzzle.hint;
    gameState.normalizedPhrase = normalizePhrase(gameState.phrase);
    gameState.allConsonantsRevealed = checkAllConsonantsRevealed();

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
                <button onclick="document.getElementById('modal-overlay').style.display='none';document.getElementById('popup-message').style.display='none'" class="btn btn--secondary" style="padding:8px 20px">Annulla</button>
                <button onclick="window._confirmNewGame()" class="btn btn--primary" style="padding:8px 20px">Abbandona</button>
            </div>
        </div>`, 0, 'warning');
        window._confirmNewGame = _doNewGame;
        return;
    }
    _doNewGame();
}

function _doNewGame() {
    stopSoloTimer();
    _onNewGame();
    document.getElementById('modal-overlay').style.display = 'none';
    document.getElementById('popup-message').style.display = 'none';
    document.getElementById('home-btn').style.display = 'none';
    const soloTimerWrap = document.getElementById('solo-timer-wrap');
    if (soloTimerWrap) soloTimerWrap.style.display = 'none';
    const gs2 = document.getElementById('game-screen');
    if (gs2) gs2.classList.remove('has-timer');
    showScreen('setup-screen');
    elements.modeSelection.style.display = 'block';

    if (elements.setupLocalPlayers) elements.setupLocalPlayers.style.display = 'none';
    if (elements.setupLocalNames) elements.setupLocalNames.style.display = 'none';
    if (elements.setupSmartphoneMode) elements.setupSmartphoneMode.style.display = 'none';

    gameState.currentManche = null;
    gameState.customMode = false;
    gameState.customPhrase = '';
    gameState.customHint = '';
    gameState.players = [];
    gameState.totalScores = {};
    gameState.soloMode = false;
    hideFinalRoundBanner();
    document.body.classList.remove('manche-finale');
}

