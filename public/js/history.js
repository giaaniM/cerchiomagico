import { t, getCurrentLang } from './lang.js';
import { formatTime } from './solo.js';

const STORAGE_KEY = 'magicspin_history_v1';
const MAX_ENTRIES = 100;

function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data.slice(0, MAX_ENTRIES)));
}
export function hasHistory() { return load().length > 0; }

export function saveMultiplayerGame(players, winner, lang) {
    const entries = load();
    entries.unshift({
        type: 'multiplayer',
        date: Date.now(),
        lang,
        players: players.map(p => ({ name: p.name, score: p.score })),
        winner,
    });
    save(entries);
}

export function saveSoloGame(playerName, time, score, splits, lang) {
    const entries = load();
    entries.unshift({
        type: 'solo',
        date: Date.now(),
        lang,
        playerName,
        time,
        score,
        splits,
    });
    save(entries);
}

function formatDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function showHistoryPopup() {
    const entries = load();
    const multi = entries.filter(e => e.type === 'multiplayer');
    const solo = entries.filter(e => e.type === 'solo');
    const soloByPlayer = {};
    solo.forEach(e => {
        const k = e.playerName || '?';
        if (!soloByPlayer[k]) soloByPlayer[k] = [];
        soloByPlayer[k].push(e);
    });
    // best time per player
    const soloLeaderboard = Object.entries(soloByPlayer).map(([name, games]) => {
        const best = games.reduce((a, b) => a.time < b.time ? a : b);
        return { name, bestTime: best.time, bestScore: best.score, games: games.length };
    }).sort((a, b) => a.bestTime - b.bestTime);

    const isIt = getCurrentLang() === 'it';

    const multiHtml = multi.length === 0
        ? `<p class="hist-empty">${isIt ? 'Nessuna partita salvata' : 'No games saved yet'}</p>`
        : multi.map(e => {
            const winner = e.players?.find(p => p.name === e.winner);
            const scoreStr = winner ? `€${Number(winner.score).toLocaleString('it-IT')}` : '';
            const others = e.players?.filter(p => p.name !== e.winner)
                .map(p => `${p.name} €${Number(p.score).toLocaleString('it-IT')}`).join(' · ') || '';
            return `<div class="hist-entry">
                <div class="hist-entry-left">
                    <span class="hist-winner">🏆 ${e.winner}</span>
                    ${scoreStr ? `<span class="hist-winner-score">${scoreStr}</span>` : ''}
                    ${others ? `<span class="hist-others">${others}</span>` : ''}
                </div>
                <span class="hist-date">${formatDate(e.date)}</span>
            </div>`;
        }).join('');

    const soloLbHtml = soloLeaderboard.length === 0
        ? `<p class="hist-empty">${isIt ? 'Nessuna partita solitario salvata' : 'No solo games saved yet'}</p>`
        : `<div class="hist-solo-lb">
            ${soloLeaderboard.map((row, i) => `
                <div class="hist-solo-row ${i === 0 ? 'hist-solo-best' : ''}">
                    <span class="hist-solo-rank">${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}</span>
                    <span class="hist-solo-name">${row.name}</span>
                    <span class="hist-solo-time">${formatTime(row.bestTime)}</span>
                    <span class="hist-solo-games">${row.games} ${isIt ? 'partite' : 'games'}</span>
                </div>`).join('')}
        </div>
        ${solo.length > 0 ? `<div class="hist-solo-recents">
            <div class="hist-sub-title">${isIt ? 'Ultime partite solitario' : 'Recent solo games'}</div>
            ${solo.slice(0, 10).map(e => `
                <div class="hist-entry">
                    <div class="hist-entry-left">
                        <span class="hist-winner">${e.playerName}</span>
                        <span class="hist-others">⏱ ${formatTime(e.time)} · €${Number(e.score).toLocaleString('it-IT')}</span>
                    </div>
                    <span class="hist-date">${formatDate(e.date)}</span>
                </div>`).join('')}
        </div>` : ''}`;

    const html = `<div class="hist-popup">
        <div class="hist-title">${isIt ? '📋 Storico Partite' : '📋 Game History'}</div>
        <div class="hist-tabs">
            <button class="hist-tab active" id="hist-tab-multi">${isIt ? 'Multiplayer' : 'Multiplayer'}</button>
            <button class="hist-tab" id="hist-tab-solo">${isIt ? 'Solitario' : 'Solo'}</button>
        </div>
        <div class="hist-panel" id="hist-panel-multi">${multiHtml}</div>
        <div class="hist-panel" id="hist-panel-solo" style="display:none">${soloLbHtml}</div>
        <button class="btn btn--secondary hist-close-btn" onclick="document.getElementById('modal-overlay').style.display='none';document.getElementById('popup-message').style.display='none'">
            ${isIt ? 'Chiudi' : 'Close'}
        </button>
    </div>`;

    // wire after render
    import('./utils.js').then(({ showPopup }) => {
        showPopup(html, 0);
        document.getElementById('hist-tab-multi')?.addEventListener('click', () => {
            document.getElementById('hist-panel-multi').style.display = '';
            document.getElementById('hist-panel-solo').style.display = 'none';
            document.getElementById('hist-tab-multi').classList.add('active');
            document.getElementById('hist-tab-solo').classList.remove('active');
        });
        document.getElementById('hist-tab-solo')?.addEventListener('click', () => {
            document.getElementById('hist-panel-multi').style.display = 'none';
            document.getElementById('hist-panel-solo').style.display = '';
            document.getElementById('hist-tab-multi').classList.remove('active');
            document.getElementById('hist-tab-solo').classList.add('active');
        });
    });
}
