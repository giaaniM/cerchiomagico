import { t, getCurrentLang } from './lang.js';
import { showPopup } from './utils.js';

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

export async function fetchLeaderboard(mode) {
    const lang = getCurrentLang();
    try {
        const res = await fetch(`/api/leaderboard?mode=${mode}&lang=${lang}`);
        return await res.json();
    } catch {
        return [];
    }
}

export function showLeaderboardPopup(defaultTab = 'solo') {
    const isIt = getCurrentLang() === 'it';
    const html = `
        <div class="lb-popup">
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
    showPopup(html, 0);

    setTimeout(() => {
        const body = document.getElementById('lb-body');
        const tabs = document.querySelectorAll('.lb-tab');
        let currentMode = defaultTab;

        async function loadTab(mode) {
            currentMode = mode;
            if (body) body.innerHTML = '<div class="lb-loading">⏳</div>';
            const entries = await fetchLeaderboard(mode);
            if (body) body.innerHTML = renderTable(entries, mode);
        }

        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                tabs.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                loadTab(btn.dataset.mode);
            });
        });

        loadTab(defaultTab);
    }, 50);
}

function renderTable(entries, mode) {
    if (!entries || entries.length === 0) {
        const isIt = getCurrentLang() === 'it';
        return `<div class="lb-empty">${isIt ? 'Nessun punteggio ancora. Sii il primo!' : 'No scores yet. Be the first!'}</div>`;
    }
    const isSolo = mode === 'solo';
    let rows = '';
    entries.forEach((e, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
        const metric = isSolo ? formatTime(e.time_seconds ?? 0) : fmt(e.score);
        rows += `<div class="lb-row ${i < 3 ? 'lb-top' : ''}" data-rank="${i + 1}">
            <span class="lb-rank">${medal}</span>
            <span class="lb-name">${escHtml(e.nickname)}</span>
            <span class="lb-score">${metric}</span>
        </div>`;
    });
    return `<div class="lb-table">${rows}</div>`;
}

function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

export function showSubmitAndLeaderboard({ mode, score, time_seconds, suggestedName }) {
    const isIt = getCurrentLang() === 'it';
    const saved = getSavedNickname() || suggestedName || '';
    const isSolo = mode === 'solo';
    const metricLabel = isSolo ? formatTime(time_seconds ?? 0) : fmt(score);

    const html = `
        <div class="lb-submit-popup">
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
    showPopup(html, 0);

    setTimeout(() => {
        const input = document.getElementById('lb-nick-input');
        const submitBtn = document.getElementById('lb-submit-btn');
        const skipBtn = document.getElementById('lb-skip-btn');

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
            setTimeout(() => showLeaderboardPopup(mode), 900);
        }

        submitBtn?.addEventListener('click', doSubmit);
        input?.addEventListener('keypress', e => { if (e.key === 'Enter') doSubmit(); });
        skipBtn?.addEventListener('click', () => showLeaderboardPopup(mode));

        input?.select();
    }, 50);
}
