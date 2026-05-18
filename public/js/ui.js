import { gameState, TOTAL_MANCHES, VOWEL_COST } from './state.js';
import { elements } from './elements.js';
import { showPopup, showMessage } from './utils.js';
import { renderPlayersList, getCurrentPlayer } from './players.js';
import { t, getCurrentLang } from './lang.js';
import { saveMultiplayerGame } from './history.js';

// ===== UI Updates =====
export function updateUI() {
    const phase = gameState.wheelPhase;
    const allConsRevealed = gameState.allConsonantsRevealed;

    const spinBtn = document.getElementById('spin-btn');
    const consonantContainer = document.getElementById('consonant-call-container');
    const vowelGroup = document.getElementById('vowel-group');
    const solveGroup = document.getElementById('solve-group');

    const lettersControls = document.querySelector('.letters-controls');
    const solveSectionCard = document.querySelector('.solve-section-card');

    // --- MANCHE 5 (FINAL ROUND) SPECIFIC UI ---
    if (gameState.currentManche === 5) {
        if (vowelGroup) vowelGroup.style.display = 'none';
        if (lettersControls) lettersControls.style.display = 'none';

        const centralArea = document.getElementById('central-action-area');

        if (phase === 'final_spin') {
            if (centralArea) centralArea.style.display = 'flex';
            spinBtn.style.display = 'block';
            spinBtn.textContent = t('game.spin.final');
            spinBtn.disabled = false;
            consonantContainer.style.display = 'none';
            elements.expressContainer.style.display = 'none';
            if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'none';
            if (elements.passBtn) elements.passBtn.style.display = 'none';
            if (solveSectionCard) {
                solveSectionCard.style.display = 'block';
                solveSectionCard.classList.remove('final-decision-active');
            }
            if (solveGroup) solveGroup.style.display = 'block';
            if (elements.solutionInput) elements.solutionInput.disabled = true;
            const solveBtnSpin = document.getElementById('solve-btn');
            if (solveBtnSpin) solveBtnSpin.disabled = true;
            hideFinalRoundBanner();
            return;
        } else if (phase === 'final_play') {
            if (centralArea) centralArea.style.display = 'flex';
            spinBtn.style.display = 'none';
            consonantContainer.style.display = 'none';
            elements.expressContainer.style.display = 'none';
            if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'flex';
            if (solveSectionCard) {
                solveSectionCard.style.display = 'block';
                solveSectionCard.classList.remove('final-decision-active');
            }
            if (solveGroup) solveGroup.style.display = 'block';
            if (elements.solutionInput) elements.solutionInput.disabled = true;
            const solveBtnPlay = document.getElementById('solve-btn');
            if (solveBtnPlay) solveBtnPlay.disabled = true;
            if (elements.passBtn) elements.passBtn.style.display = 'none';
            if (elements.finalConsonantInput) {
                elements.finalConsonantInput.disabled = false;
                elements.finalConsonantBtn.disabled = false;
                elements.finalVowelInput.disabled = false;
                elements.finalVowelBtn.disabled = false;
                setTimeout(() => elements.finalConsonantInput.focus(), 50);
            }
            checkFinalRoundBanner();
            renderPlayersList();
            return;
        } else if (phase === 'final_decision') {
            spinBtn.style.display = 'none';
            consonantContainer.style.display = 'none';
            elements.expressContainer.style.display = 'none';
            if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'none';
            const centralArea = document.getElementById('central-action-area');
            if (centralArea) centralArea.style.display = 'none';
            if (solveSectionCard) {
                solveSectionCard.style.display = 'block';
                solveSectionCard.classList.add('final-decision-active');
            }
            if (solveGroup) solveGroup.style.display = 'block';
            if (elements.solutionInput) elements.solutionInput.disabled = false;
            const solveBtnDecision = document.getElementById('solve-btn');
            if (solveBtnDecision) solveBtnDecision.disabled = false;
            if (elements.passBtn) {
                elements.passBtn.style.display = 'inline-block';
                elements.passBtn.disabled = false;
                elements.passBtn.textContent = t('game.passturn');
            }
            if (elements.solutionInput) setTimeout(() => elements.solutionInput.focus(), 50);
            checkFinalRoundBanner();
            renderPlayersList();
            return;
        }
    } else {
        // Global resets for normal rounds
        const centralArea = document.getElementById('central-action-area');
        if (centralArea) centralArea.style.display = 'flex';
        if (vowelGroup) vowelGroup.style.display = 'flex';
        if (lettersControls) lettersControls.style.display = 'flex';
        if (solveSectionCard) {
            solveSectionCard.style.display = 'block';
            solveSectionCard.classList.remove('final-decision-active');
        }
        if (elements.finalRoundContainer) elements.finalRoundContainer.style.display = 'none';
        hideFinalRoundBanner();
    }
    // ------------------------------------------

    if (phase === 'express') {
        spinBtn.style.display = 'none';
        consonantContainer.style.display = 'none';
        elements.expressContainer.style.display = 'flex';
        elements.expressConsonantInput.disabled = false;
        elements.expressConsonantBtn.disabled = false;
        elements.expressVowelInput.disabled = false;
        elements.expressVowelBtn.disabled = false;
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
        if (spinBtn) spinBtn.textContent = t('game.spin');

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

export function showPartialRanking() {
    const sortedPlayers = [...gameState.players].sort((a, b) =>
        (Number(gameState.totalScores[b.name]) || 0) - (Number(gameState.totalScores[a.name]) || 0)
    );

    const manchesLeft = TOTAL_MANCHES - gameState.currentManche;
    const medals = ['🥇', '🥈', '🥉'];

    let html = `<div class="popup-ranking-partial">
        <div class="ranking-manche-badge">${t('game.manche')} ${gameState.currentManche} / ${TOTAL_MANCHES}</div>
        <div class="ranking-header">${t('ranking.title')}</div>
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
        html += `<div class="ranking-footer">${t('ranking.remaining')} ${manchesLeft} ${t('ranking.rounds')}</div>`;
    }
    html += `</div>`;
    showPopup(html, 0);
}

export function showFinalResults(newGame) {
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

    saveMultiplayerGame(
        sortedPlayers.map(p => ({ name: p.name, score: gameState.totalScores[p.name] || 0 })),
        winner?.name,
        getCurrentLang()
    );

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

    elements.winTitle.innerHTML = `<span class="win-title-name">${winner.name}</span><br><span class="win-title-sub">${t('win.winner')}</span>`;
    elements.winPhrase.innerHTML = resultsHtml;
    elements.winMessage.textContent = `${t('win.jackpot')}: ${fmt(maxScore)}`;
    elements.nextLevelBtn.textContent = t('win.newgame');
    elements.nextLevelBtn.onclick = newGame;

    // Show win screen
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('win-screen')?.classList.add('active');
    window.scrollTo(0, 0);

    // Import sound here to avoid circular: soundManager is in sound.js
    import('./sound.js').then(({ soundManager }) => soundManager.playFinalWin());
}

export function checkExpressBanner() {
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
            <span class="express-banner-title">${t('tut.s4.b1')}</span>
            <div class="express-banner-divider"></div>
            <span class="express-banner-player">${player.name}</span>
            <div class="express-banner-amount">€${totalExpress}</div>
        </div>
    `;
    banner.style.display = 'flex';
}

export function hideExpressBanner() {
    const banner = document.getElementById('express-banner');
    if (banner) banner.style.display = 'none';
}

export function checkFinalRoundBanner() {
    const valEl = document.getElementById('final-banner-value');
    if (valEl) valEl.textContent = `€${gameState.finalRoundValue}`;
}

export function hideFinalRoundBanner() {
    // No-op: value header is part of final-round-input-container, shown/hidden by updateUI
}
