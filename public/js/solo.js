import { gameState } from './state.js';
import { t, getCurrentLang } from './lang.js';
import { showPopup, popup } from './utils.js';
import { saveSoloGame } from './history.js';
import { submitScore, fetchLeaderboard, getSavedNickname } from './leaderboard.js';

export const SOLO_ROUNDS = 3;
const HISTORY_KEY = 'magicspin_history_v1';

let timerInterval = null;

export function startSoloTimer() {
    if (timerInterval) return; // already running — don't reset on phrase skip race condition
    gameState.soloElapsedSeconds = 0;
    gameState.soloRoundSplits = [];
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

    // Two-line pill flash below sticky timer bar
    const flash = document.createElement('div');
    flash.className = 'penalty-center-flash';
    flash.innerHTML = `<span class="pcf-label">PENALITÀ</span><span class="pcf-time">+${seconds}s</span>`;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1400);
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

export function initSoloRecord(playerName) {
    let entries = [];
    try { entries = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch {}
    const lang = getCurrentLang();
    const personal = entries.filter(e => e.type === 'solo' && e.playerName === playerName && e.lang === lang);
    const row = document.getElementById('solo-record-row');
    if (!row) return;
    if (personal.length === 0) { row.style.display = 'none'; return; }
    const best = personal.reduce((b, e) => e.time < b.time ? e : b);
    const val = document.getElementById('solo-record-val');
    if (val) val.textContent = `${formatTime(best.time)} · €${Number(best.score).toLocaleString('it-IT')}`;
    row.style.display = 'flex';
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

    const nick = getSavedNickname() || playerName;

    winCard.innerHTML = `
        <div class="solo-results">
            <div class="solo-results-header">
                <div class="solo-results-crown">🏅</div>
                <div class="solo-results-player">${playerName}</div>
                <div class="solo-results-title">${t('solo.endtitle')}</div>
            </div>

            <div class="solo-stats-grid">
                <div class="solo-stat-card solo-stat-primary">
                    <div class="solo-stat-label">${t('solo.time')}</div>
                    <div class="solo-stat-value solo-stat-time">${timeStr}</div>
                </div>
                <div class="solo-stat-card">
                    <div class="solo-stat-label">${t('solo.score')}</div>
                    <div class="solo-stat-value solo-stat-money">${scoreStr}</div>
                </div>
            </div>

            ${splitsHtml ? `<div class="solo-splits">${splitsHtml}</div>` : ''}

            <div class="solo-lb-section">
                <div class="solo-lb-title">🏆 ${isIt ? 'Classifica Globale' : 'Global Leaderboard'}</div>
                <div id="solo-lb-inline" class="solo-lb-inline"><div class="lb-loading">⏳</div></div>
            </div>

            <div class="win-cta-stack">
                <button class="win-cta-primary" id="solo-newgame-btn">${t('solo.newgame')}</button>
                <button class="win-cta-share" id="solo-share-btn">${t('solo.share.btn')}</button>
            </div>

            <a href="https://ko-fi.com/giaaniM" target="_blank" rel="noopener noreferrer" class="win-kofi-btn">
                ☕ ${isIt ? 'Offrimi un caffè' : 'Buy me a coffee'}
            </a>
        </div>
    `;

    document.getElementById('solo-newgame-btn')?.addEventListener('click', newGame);

    // Auto-submit + load leaderboard in background
    (async () => {
        const rank = await submitScore({ nickname: nick, mode: 'solo', score: totalScore, time_seconds: totalTime });
        const data = await fetchLeaderboard('solo', nick);
        const lbEl = document.getElementById('solo-lb-inline');
        if (!lbEl) return;

        const top = data?.top ?? [];
        const userRank = rank ?? data?.userRank ?? null;
        const nickLower = nick.toLowerCase();

        function fmtTime(s) { const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}`; }

        if (!top.length) {
            lbEl.innerHTML = `<div class="lb-empty">${isIt ? 'Primo nella classifica!' : 'First on the board!'}</div>`;
            return;
        }

        let rows = top.map((e, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i+1}`;
            const isMe = String(e.nickname).toLowerCase() === nickLower;
            return `<div class="lb-row ${i < 3 ? 'lb-top' : ''} ${isMe ? 'lb-me' : ''}">
                <span class="lb-rank">${medal}</span>
                <span class="lb-name">${String(e.nickname).replace(/&/g,'&amp;').replace(/</g,'&lt;')}</span>
                <span class="lb-score">${fmtTime(e.time_seconds ?? 0)}</span>
            </div>`;
        }).join('');

        const rankBadge = userRank ? `<div class="solo-lb-rank-badge">${isIt ? `La tua posizione: #${userRank}` : `Your rank: #${userRank}`}</div>` : '';
        lbEl.innerHTML = `<div class="lb-table">${rows}</div>${rankBadge}`;
    })();

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
    window.scrollTo(0, 0);

    import('./sound.js').then(({ soundManager }) => soundManager.playFinalWin());
}
