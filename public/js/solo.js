import { gameState } from './state.js';
import { t, getCurrentLang } from './lang.js';
import { showPopup, popup } from './utils.js';
import { saveSoloGame } from './history.js';

export const SOLO_ROUNDS = 3;

let timerInterval = null;

export function startSoloTimer() {
    gameState.soloElapsedSeconds = 0;
    gameState.soloRoundSplits = [];
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        gameState.soloElapsedSeconds++;
        updateTimerDisplay();
    }, 1000);
    updateTimerDisplay();
}

export function stopSoloTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
}

export function addTimePenalty(seconds) {
    gameState.soloElapsedSeconds += seconds;
    updateTimerDisplay();

    const wrap = document.getElementById('solo-timer-wrap');
    const el = document.getElementById('solo-timer');

    // Timer bar shake + red
    if (el) {
        wrap?.classList.add('timer-penalty-wrap');
        el.classList.add('timer-penalty');
        setTimeout(() => {
            wrap?.classList.remove('timer-penalty-wrap');
            el.classList.remove('timer-penalty');
        }, 1400);
    }

    // Pill flash just below the sticky timer bar — always visible, never covers board
    const flash = document.createElement('div');
    flash.className = 'penalty-center-flash';
    flash.textContent = `+${seconds}s`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1200);
}

export function recordRoundSplit() {
    if (!gameState.soloRoundSplits) gameState.soloRoundSplits = [];
    gameState.soloRoundSplits.push(gameState.soloElapsedSeconds);
}


export function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const el = document.getElementById('solo-timer');
    if (el) el.textContent = formatTime(gameState.soloElapsedSeconds || 0);
}

export function showSoloResults(newGame) {
    stopSoloTimer();

    const totalTime = gameState.soloElapsedSeconds || 0;
    const playerName = gameState.players[0]?.name || 'Tu';
    const totalScore = Object.values(gameState.totalScores).reduce((a, b) => a + b, 0);
    const splits = gameState.soloRoundSplits || [];
    const roundTimes = splits.map((s, i) => s - (i === 0 ? 0 : splits[i - 1]));
    saveSoloGame(playerName, totalTime, totalScore, roundTimes, getCurrentLang());
    const timeStr = formatTime(totalTime);
    const scoreStr = `€${totalScore.toLocaleString('it-IT')}`;

    const shareText = t('solo.share.text')
        .replace('{score}', scoreStr)
        .replace('{time}', timeStr);

    let splitsHtml = '';
    roundTimes.forEach((roundSec, i) => {
        splitsHtml += `<div class="solo-split"><span class="solo-split-label">${t('solo.round')} ${i + 1}</span><span class="solo-split-time">${formatTime(roundSec)}</span></div>`;
    });

    const isIt = getCurrentLang() === 'it';

    const winScreen = document.getElementById('win-screen');
    const winCard = winScreen?.querySelector('.win-card');
    if (!winCard) return;

    winCard.innerHTML = `
        <div class="solo-results">
            <div class="solo-results-header">
                <div class="solo-results-emoji">🎡</div>
                <div class="solo-results-title">${t('solo.endtitle')}</div>
                <div class="solo-results-player">${playerName}</div>
            </div>

            <div class="solo-time-hero">
                <div class="solo-time-hero-label">${t('solo.time')}</div>
                <div class="solo-time-hero-value">${timeStr}</div>
            </div>

            <div class="solo-prize-row">
                <div class="solo-prize-label">${t('solo.score')}</div>
                <div class="solo-prize-value">${scoreStr}</div>
            </div>

            ${splitsHtml ? `<div class="solo-splits">${splitsHtml}</div>` : ''}

            <div class="solo-actions">
                <button class="solo-share-btn" id="solo-share-btn">${t('solo.share.btn')}</button>
                <button class="btn-primary solo-newgame-btn" id="solo-newgame-btn">${t('solo.newgame')}</button>
            </div>

            <div class="kofi-endgame-block">
                <p class="kofi-endgame-msg">${isIt ? 'Se il gioco ti è piaciuto, offrimi un caffè ☕' : 'If you enjoyed the game, buy me a coffee ☕'}</p>
                <a href="https://ko-fi.com/giaaniM" target="_blank" rel="noopener noreferrer" class="kofi-endgame">
                    ☕ ${isIt ? 'Offrimi un caffè' : 'Buy me a coffee'}
                </a>
            </div>
        </div>
    `;

    document.getElementById('solo-newgame-btn')?.addEventListener('click', newGame);

    const shareBtn = document.getElementById('solo-share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            if (navigator.share) {
                try { await navigator.share({ text: shareText }); } catch {}
            } else {
                try {
                    await navigator.clipboard.writeText(shareText);
                } catch {}
                shareBtn.textContent = t('solo.share.copied');
                setTimeout(() => { shareBtn.textContent = t('solo.share.btn'); }, 2500);
            }
        });
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    winScreen?.classList.add('active');

    import('./sound.js').then(({ soundManager }) => soundManager.playFinalWin());
}
