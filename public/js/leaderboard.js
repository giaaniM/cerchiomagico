import { t, getCurrentLang } from './lang.js';

const NICKNAME_KEY = 'leaderboard_nickname';

export function getSavedNickname() {
    return localStorage.getItem(NICKNAME_KEY) || '';
}

function saveNickname(n) {
    localStorage.setItem(NICKNAME_KEY, n);
}

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
}

function fmt(n) {
    return `€${Number(n).toLocaleString('it-IT')}`;
}

export async function submitScore({ nickname, mode, score, time_seconds }) {
    const lang = getCurrentLang();
    const clean = String(nickname).trim().slice(0, 30);
    saveNickname(clean);
    try {
        const res = await fetch('/api/leaderboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: clean, mode, score, time_seconds, lang }),
        });
        const data = await res.json();
        return data.rank ?? null;
    } catch {
        return null;
    }
}

export async function fetchLeaderboard(mode, nickname) {
    const lang = getCurrentLang();
    const nick = nickname ? `&nickname=${encodeURIComponent(nickname)}` : '';
    try {
        const res = await fetch(`/api/leaderboard?mode=${mode}&lang=${lang}${nick}`);
        return await res.json();
    } catch {
        return { top: [], userRank: null, userWindow: null };
    }
}

// Creates a standalone overlay (works from any screen, not just game-screen)
function createStandaloneOverlay() {
    const existing = document.getElementById('lb-standalone-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'lb-standalone-overlay';
    overlay.className = 'modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.88);';
    document.body.appendChild(overlay);

    const popup = document.createElement('div');
    popup.className = 'popup-message';
    popup.style.cssText = 'position:relative;top:auto;left:auto;transform:none;width:min(360px,92vw);max-height:88dvh;overflow-y:auto;padding:24px 20px;';
    overlay.appendChild(popup);

    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    return { overlay, popup };
}

export function showLeaderboardPopup(defaultTab = 'solo') {
    const isIt = getCurrentLang() === 'it';
    const myNick = getSavedNickname();
    const { overlay, popup } = createStandaloneOverlay();

    popup.innerHTML = `
        <div class="lb-popup">
            <button class="lb-close-btn" style="position:absolute;top:10px;right:14px;background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.4rem;cursor:pointer;line-height:1;">✕</button>
            <div class="lb-header">
                <div class="lb-trophy">🏆</div>
                <div class="lb-title">${isIt ? 'Classifica Globale' : 'Global Leaderboard'}</div>
                <div class="lb-subtitle">${isIt ? 'Chi arriva in cima?' : 'Who tops the board?'}</div>
            </div>
            <div class="lb-tabs">
                <button class="lb-tab ${defaultTab === 'solo' ? 'active' : ''}" data-mode="solo">⏱ Solo</button>
                <button class="lb-tab ${defaultTab === 'mp' ? 'active' : ''}" data-mode="mp">👥 ${isIt ? 'Torneo' : 'Tournament'}</button>
            </div>
            <div class="lb-body" id="lb-body">
                <div class="lb-loading">⏳</div>
            </div>
        </div>
    `;

    popup.querySelector('.lb-close-btn').addEventListener('click', () => overlay.remove());

    const body = popup.querySelector('#lb-body');
    const tabs = popup.querySelectorAll('.lb-tab');

    async function loadTab(mode) {
        if (body) body.innerHTML = '<div class="lb-loading">⏳</div>';
        const data = await fetchLeaderboard(mode, myNick);
        if (body) body.innerHTML = renderTable(data, mode, myNick);
    }

    tabs.forEach(btn => {
        btn.addEventListener('click', () => {
            tabs.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            loadTab(btn.dataset.mode);
        });
    });

    loadTab(defaultTab);
}

function renderTable(data, mode, myNick) {
    const isIt = getCurrentLang() === 'it';
    const top = data?.top ?? [];
    const userRank = data?.userRank ?? null;
    const userWindow = data?.userWindow ?? null;

    if (!top.length) {
        return `<div class="lb-empty">${isIt ? 'Nessun punteggio ancora. Sii il primo!' : 'No scores yet. Be the first!'}</div>`;
    }

    const isSolo = mode === 'solo';
    const myNickLower = myNick ? myNick.toLowerCase() : '';

    function renderRow(e, rank) {
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
        const metric = isSolo ? formatTime(e.time_seconds ?? 0) : fmt(e.score);
        const isMe = myNickLower && escHtml(e.nickname).toLowerCase() === myNickLower;
        return `<div class="lb-row ${rank <= 3 ? 'lb-top' : ''} ${isMe ? 'lb-me' : ''}" data-rank="${rank}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${escHtml(e.nickname)}${isMe ? ' 👈' : ''}</span>
            <span class="lb-score">${metric}</span>
        </div>`;
    }

    let rows = top.map((e, i) => renderRow(e, i + 1)).join('');

    if (userWindow && userRank > top.length) {
        rows += `<div class="lb-separator">· · ·</div>`;
        userWindow.entries.forEach((e, i) => {
            rows += renderRow(e, userWindow.startRank + i);
        });
    } else if (userRank && !myNickLower) {
        // nothing extra
    }

    let footer = '';
    if (userRank) {
        footer = `<div class="lb-your-rank">${isIt ? `La tua posizione: #${userRank}` : `Your rank: #${userRank}`}</div>`;
    }

    return `<div class="lb-table">${rows}</div>${footer}`;
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function showSubmitAndLeaderboard({ mode, score, time_seconds, suggestedName }) {
    const isIt = getCurrentLang() === 'it';
    const saved = getSavedNickname() || suggestedName || '';
    const isSolo = mode === 'solo';
    const metricLabel = isSolo ? formatTime(time_seconds ?? 0) : fmt(score);

    const { overlay, popup } = createStandaloneOverlay();

    popup.innerHTML = `
        <div class="lb-submit-popup">
            <button class="lb-close-btn" style="position:absolute;top:10px;right:14px;background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.4rem;cursor:pointer;line-height:1;">✕</button>
            <div class="lb-header">
                <div class="lb-trophy">🏆</div>
                <div class="lb-title">${isIt ? 'Classifica Globale' : 'Global Leaderboard'}</div>
            </div>
            <div class="lb-submit-score-badge">
                <span class="lb-submit-score-icon">${isSolo ? '⏱' : '🎯'}</span>
                <span class="lb-submit-score-val">${metricLabel}</span>
                <span class="lb-submit-score-label">${isSolo ? (isIt ? 'il tuo tempo' : 'your time') : (isIt ? 'punteggio' : 'score')}</span>
            </div>
            <div class="lb-submit-form">
                <label class="lb-nick-label">${isIt ? 'Il tuo nome nel ranking:' : 'Your name on the leaderboard:'}</label>
                <input id="lb-nick-input" class="lb-nick-input" type="text" maxlength="30"
                    placeholder="${isIt ? 'es. Mario' : 'e.g. Player1'}"
                    value="${escHtml(saved)}" autocomplete="off">
                <button id="lb-submit-btn" class="lb-submit-btn">
                    ${isIt ? '🏅 Salva il mio punteggio' : '🏅 Save my score'}
                </button>
            </div>
            <button id="lb-skip-btn" class="lb-skip-btn">
                ${isIt ? 'Vedi classifica senza salvare →' : 'View leaderboard without saving →'}
            </button>
        </div>
    `;

    popup.querySelector('.lb-close-btn').addEventListener('click', () => overlay.remove());

    const input = popup.querySelector('#lb-nick-input');
    const submitBtn = popup.querySelector('#lb-submit-btn');
    const skipBtn = popup.querySelector('#lb-skip-btn');

    async function doSubmit() {
        const nick = input?.value.trim();
        if (!nick) { input?.focus(); return; }
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳';
        const rank = await submitScore({ nickname: nick, mode, score, time_seconds });
        const rankMsg = rank ? (isIt ? `Sei #${rank} nel ranking!` : `You're #${rank} worldwide!`) : '';
        if (rankMsg && submitBtn) {
            submitBtn.textContent = rankMsg;
            submitBtn.classList.add('lb-rank-shown');
        }
        setTimeout(() => { overlay.remove(); showLeaderboardPopup(mode); }, 900);
    }

    submitBtn?.addEventListener('click', doSubmit);
    input?.addEventListener('keypress', e => { if (e.key === 'Enter') doSubmit(); });
    skipBtn?.addEventListener('click', () => { overlay.remove(); showLeaderboardPopup(mode); });

    input?.select();
}
