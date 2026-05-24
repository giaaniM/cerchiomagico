import { currentProfile } from './auth.js';
import { SOCKET_URL } from './native.js';
import { getCurrentLang, t } from './lang.js';
import { ic } from './icons.js';

let socket = null;

export function getChallengeSocket() { return socket; }

export function initChallengeSocket(existingSocket) {
    if (existingSocket) {
        socket = existingSocket;
    } else if (!socket?.connected) {
        socket = window.io(SOCKET_URL);
    }

    socket.on('challenge:invite', ({ challengeId, from, lang }) => showInvite(challengeId, from, lang));
    socket.on('challenge:sent', ({ challengeId }) => {
        const el = document.getElementById('ch-send-status');
        if (el) el.textContent = 'Sfida inviata! In attesa...';
    });
    socket.on('challenge:declined', ({ challengeId }) => {
        showToast('La sfida è stata rifiutata.');
    });
    socket.on('challenge:started', ({ players }) => {
        buildUI(players);
    });
    socket.on('challenge:state', (state) => renderState(state));
    socket.on('challenge:timer', ({ seconds }) => {
        const el = document.getElementById('ch-timer');
        if (el) el.textContent = seconds;
        if (el) el.classList.toggle('ch-timer-urgent', seconds <= 3);
    });
    socket.on('challenge:game-over', (data) => showGameOver(data));

    authSocket();
}

function authSocket() {
    if (!currentProfile || !socket) return;
    socket.emit('challenge:auth', {
        profileId: currentProfile.id,
        username: currentProfile.username
    });
}

export function sendChallenge(opponentId) {
    if (!socket?.connected || !currentProfile) return;
    socket.emit('challenge:send', { toProfileId: opponentId, lang: getCurrentLang() });
}

// ── UI ──

function getOrCreateOverlay() {
    let ov = document.getElementById('ch-overlay');
    if (!ov) {
        ov = document.createElement('div');
        ov.id = 'ch-overlay';
        ov.className = 'ch-overlay';
        document.body.appendChild(ov);
    }
    return ov;
}

function buildUI(players) {
    const ov = getOrCreateOverlay();
    ov.style.display = 'flex';
    const myIdx = players.findIndex(p => p.username === (currentProfile?.username));

    ov.innerHTML = `
        <div class="ch-modal">
            <div class="ch-header">
                <span class="ch-player ch-p0 ${myIdx === 0 ? 'ch-me' : ''}">${escHtml(players[0]?.username ?? '?')}</span>
                <span class="ch-vs">VS</span>
                <span class="ch-player ch-p1 ${myIdx === 1 ? 'ch-me' : ''}">${escHtml(players[1]?.username ?? '?')}</span>
            </div>
            <div class="ch-scores-row">
                <span class="ch-score" id="ch-score-0">€0</span>
                <span class="ch-timer-wrap"><span id="ch-timer" class="ch-timer">10</span></span>
                <span class="ch-score" id="ch-score-1">€0</span>
            </div>
            <div id="ch-hint" class="ch-hint"></div>
            <div id="ch-board" class="ch-board"></div>
            <div id="ch-used" class="ch-used-letters"></div>
            <div id="ch-actions" class="ch-actions"></div>
        </div>
    `;
}

function renderState(state) {
    const ov = document.getElementById('ch-overlay');
    if (!ov || ov.style.display === 'none') buildUI(state.players);

    const myUsername = currentProfile?.username;
    const myIdx = state.players.findIndex(p => p.username === myUsername);
    const isMyTurn = myIdx === state.currentPlayerIdx;

    // Board
    const board = document.getElementById('ch-board');
    if (board) {
        board.innerHTML = '';
        let wordEl = null;
        state.cells.forEach((cell) => {
            if (cell.type === 'space') {
                wordEl = null;
                board.appendChild(document.createElement('div')).className = 'ch-space';
                return;
            }
            if (!wordEl) {
                wordEl = document.createElement('div');
                wordEl.className = 'ch-word';
                board.appendChild(wordEl);
            }
            const tile = document.createElement('span');
            tile.className = `ch-tile ${cell.type === 'letter' ? 'ch-revealed' : 'ch-hidden'}`;
            if (cell.type === 'letter') tile.textContent = cell.ch;
            wordEl.appendChild(tile);
        });
    }

    // Hint
    const hintEl = document.getElementById('ch-hint');
    if (hintEl) hintEl.textContent = state.hint || '';

    // Scores
    const s0 = document.getElementById('ch-score-0');
    const s1 = document.getElementById('ch-score-1');
    if (s0) s0.textContent = `€${(state.totalScore?.[0] || 0).toLocaleString('it-IT')}`;
    if (s1) s1.textContent = `€${(state.totalScore?.[1] || 0).toLocaleString('it-IT')}`;

    // Used letters
    const usedEl = document.getElementById('ch-used');
    if (usedEl) usedEl.textContent = (state.usedLetters || []).join(' ');

    // Timer
    const timerEl = document.getElementById('ch-timer');
    if (timerEl) timerEl.textContent = state.timerValue ?? 10;

    // Actions
    const actionsEl = document.getElementById('ch-actions');
    if (!actionsEl) return;
    actionsEl.innerHTML = '';

    if (!isMyTurn) {
        actionsEl.innerHTML = `<div class="ch-waiting">Turno di ${escHtml(state.players[state.currentPlayerIdx]?.username)}...</div>`;
        return;
    }

    const challengeId = getCurrentChallengeId();

    if (state.phase === 'spin') {
        const btn = document.createElement('button');
        btn.className = 'ch-btn ch-btn-spin';
        btn.innerHTML = `${ic('rotate', 18)} Gira la ruota`;
        btn.onclick = () => socket?.emit('challenge:spin', { challengeId });
        actionsEl.appendChild(btn);
    } else if (state.phase === 'consonant') {
        const valEl = document.createElement('div');
        valEl.className = 'ch-spin-val';
        valEl.textContent = `Valore: €${state.spinValue}`;
        actionsEl.appendChild(valEl);
        const row = document.createElement('div');
        row.className = 'ch-letter-row';
        'BCDFGHLMNPQRSTVZ'.split('').forEach(l => {
            const used = (state.usedLetters || []).includes(l);
            const btn = document.createElement('button');
            btn.className = `ch-key ${used ? 'ch-key-used' : ''}`;
            btn.textContent = l;
            btn.disabled = used;
            btn.onclick = () => socket?.emit('challenge:consonant', { challengeId, letter: l });
            row.appendChild(btn);
        });
        actionsEl.appendChild(row);
    } else if (state.phase === 'action') {
        const spinBtn = document.createElement('button');
        spinBtn.className = 'ch-btn ch-btn-spin';
        spinBtn.innerHTML = `${ic('rotate', 18)} Gira ancora`;
        spinBtn.onclick = () => socket?.emit('challenge:action-spin', { challengeId });
        actionsEl.appendChild(spinBtn);

        const mancheScore = state.mancheScore?.[myIdx] || 0;
        if (mancheScore >= 1000) {
            const vowelRow = document.createElement('div');
            vowelRow.className = 'ch-letter-row';
            'AEIOU'.split('').forEach(l => {
                const used = (state.usedLetters || []).includes(l);
                const btn = document.createElement('button');
                btn.className = `ch-key ${used ? 'ch-key-used' : ''}`;
                btn.textContent = l;
                btn.disabled = used;
                btn.onclick = () => socket?.emit('challenge:vowel', { challengeId, letter: l });
                vowelRow.appendChild(btn);
            });
            actionsEl.appendChild(vowelRow);
        }

        const solveRow = document.createElement('div');
        solveRow.className = 'ch-solve-row';
        const solveInput = document.createElement('input');
        solveInput.className = 'ch-solve-input';
        solveInput.placeholder = 'Prova a risolvere...';
        solveInput.maxLength = 60;
        const solveBtn = document.createElement('button');
        solveBtn.className = 'ch-btn ch-btn-solve';
        solveBtn.innerHTML = `${ic('check', 16)} Risolvi`;
        solveBtn.onclick = () => {
            const attempt = solveInput.value.trim();
            if (attempt) socket?.emit('challenge:solve', { challengeId, attempt });
        };
        solveInput.addEventListener('keydown', e => { if (e.key === 'Enter') solveBtn.click(); });
        solveRow.appendChild(solveInput);
        solveRow.appendChild(solveBtn);
        actionsEl.appendChild(solveRow);
    }
}

let _currentChallengeId = null;
function getCurrentChallengeId() { return _currentChallengeId; }

function showInvite(challengeId, from, lang) {
    _currentChallengeId = challengeId;
    const toast = document.createElement('div');
    toast.className = 'ch-invite-toast';
    toast.innerHTML = `
        <div class="ch-invite-msg">${ic('swords', 16)} <strong>${escHtml(from)}</strong> ti sfida!</div>
        <div class="ch-invite-btns">
            <button class="ch-btn ch-btn-accept" id="ch-accept-${challengeId}">${ic('check', 16)} Accetta</button>
            <button class="ch-btn ch-btn-decline" id="ch-decline-${challengeId}">${ic('x', 16)} Rifiuta</button>
        </div>
    `;
    document.body.appendChild(toast);

    document.getElementById(`ch-accept-${challengeId}`)?.addEventListener('click', () => {
        socket?.emit('challenge:accept', { challengeId });
        toast.remove();
    });
    document.getElementById(`ch-decline-${challengeId}`)?.addEventListener('click', () => {
        socket?.emit('challenge:decline', { challengeId });
        toast.remove();
    });

    setTimeout(() => toast.remove(), 30000);
}

function showGameOver({ winnerIdx, winner, totalScore, players }) {
    const myUsername = currentProfile?.username;
    const iWon = players[winnerIdx]?.username === myUsername;

    const modal = document.querySelector('#ch-overlay .ch-modal');
    if (!modal) return;
    modal.innerHTML = `
        <div class="ch-gameover">
            <div class="ch-gameover-icon">${ic(iWon ? 'trophy' : 'frown', 48)}</div>
            <div class="ch-gameover-title">${iWon ? 'Hai vinto!' : 'Hai perso!'}</div>
            <div class="ch-gameover-winner">${escHtml(winner)}</div>
            <div class="ch-gameover-scores">
                <span>${escHtml(players[0]?.username)}: €${(totalScore[0] || 0).toLocaleString('it-IT')}</span>
                <span>${escHtml(players[1]?.username)}: €${(totalScore[1] || 0).toLocaleString('it-IT')}</span>
            </div>
            <button class="ch-btn ch-btn-close" id="ch-close-btn">Chiudi</button>
        </div>
    `;
    document.getElementById('ch-close-btn')?.addEventListener('click', () => {
        const ov = document.getElementById('ch-overlay');
        if (ov) ov.style.display = 'none';
        _currentChallengeId = null;
    });
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'ch-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
