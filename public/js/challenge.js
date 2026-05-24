import { getToken, getUser } from './auth.js';

const VOWELS = ['A', 'E', 'I', 'O', 'U'];
const CONSONANTS = 'BCDFGHLMNPQRSTVZ'.split('');

let socket = null;
let activeChallengeId = null;
let myPlayerIdx = null;
let gameState = null;

// ─── DOM ──────────────────────────────────────────────────────────────────────
let overlay, timerEl, spinResultEl, boardEl, hintEl, scoreEl, turnEl, actionsEl, solveForm;

function buildUI() {
    if (document.getElementById('challenge-overlay')) return;

    const el = document.createElement('div');
    el.id = 'challenge-overlay';
    el.className = 'challenge-overlay';
    el.innerHTML = `
        <div class="challenge-modal">
            <div class="ch-header">
                <div class="ch-players" id="ch-players"></div>
                <div class="ch-timer" id="ch-timer">10</div>
            </div>
            <div class="ch-hint" id="ch-hint"></div>
            <div class="ch-board" id="ch-board"></div>
            <div class="ch-spin-result" id="ch-spin-result" style="display:none"></div>
            <div class="ch-actions" id="ch-actions"></div>
            <div class="ch-solve-row" id="ch-solve-row" style="display:none">
                <input id="ch-solve-input" type="text" placeholder="Scrivi la soluzione..." autocomplete="off">
                <button id="ch-solve-btn">Risolvi</button>
            </div>
        </div>
    `;
    document.body.appendChild(el);

    overlay      = el;
    timerEl      = document.getElementById('ch-timer');
    spinResultEl = document.getElementById('ch-spin-result');
    boardEl      = document.getElementById('ch-board');
    hintEl       = document.getElementById('ch-hint');
    scoreEl      = document.getElementById('ch-players');
    actionsEl    = document.getElementById('ch-actions');
    solveForm    = document.getElementById('ch-solve-row');

    document.getElementById('ch-solve-btn').addEventListener('click', submitSolve);
    document.getElementById('ch-solve-input').addEventListener('keydown', e => {
        if (e.key === 'Enter') submitSolve();
    });
}

// ─── Connect / Auth ───────────────────────────────────────────────────────────
export function initChallengeSocket(io_socket) {
    socket = io_socket;
    const token = getToken();
    if (!token) return;

    socket.emit('challenge:auth', { token });

    socket.on('challenge:auth-ok', () => {
        console.log('[Challenge] socket auth ok');
    });

    socket.on('challenge:invite', ({ challengeId, from }) => {
        showInvite(challengeId, from);
    });

    socket.on('challenge:sent', ({ challengeId }) => {
        activeChallengeId = challengeId;
        showWaiting();
    });

    socket.on('challenge:declined', () => {
        hideWaiting();
        showToast('Sfida rifiutata');
    });

    socket.on('challenge:started', ({ players }) => {
        hideWaiting();
        buildUI();
        overlay.style.display = 'flex';
        const me = getUser();
        myPlayerIdx = players.findIndex(p => p.username === me?.username);
    });

    socket.on('challenge:state', (state) => {
        gameState = state;
        renderState(state);
    });

    socket.on('challenge:spin-result', ({ value, label, shielded }) => {
        spinResultEl.style.display = 'block';
        spinResultEl.textContent = shielded ? `CROLLO — SCUDO attivo!` : label;
        spinResultEl.className = `ch-spin-result spin-${typeof value === 'number' ? 'money' : value.toLowerCase()}`;
    });

    socket.on('challenge:solve-wrong', ({ by }) => {
        showToast(`${by} ha sbagliato la soluzione!`);
    });

    socket.on('challenge:timer', ({ seconds }) => {
        if (timerEl) {
            timerEl.textContent = seconds;
            timerEl.style.color = seconds <= 3 ? '#ef4444' : '';
        }
    });

    socket.on('challenge:game-over', ({ winnerIdx, winner, totalScore, players }) => {
        const me = getUser();
        const iWon = players[winnerIdx]?.username === me?.username;
        setTimeout(() => showGameOver(winner, totalScore, players, iWon), 500);
    });
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderState(state) {
    if (!overlay || overlay.style.display === 'none') return;

    // Players / scores
    scoreEl.innerHTML = state.players.map((p, i) => `
        <div class="ch-player ${i === state.currentPlayerIdx ? 'active' : ''}">
            <span class="ch-player-name">${p.username}${p.shield ? ' 🛡' : ''}</span>
            <span class="ch-player-score">${state.mancheScore[i].toLocaleString()}€</span>
        </div>
    `).join('<div class="ch-vs">VS</div>');

    // Board
    hintEl.textContent = state.hint || '';
    boardEl.innerHTML = '';
    const words = [];
    let word = [];
    state.cells.forEach((cell, i) => {
        if (cell.type === 'space') {
            if (word.length) { words.push(word); word = []; }
            words.push(null); // space marker
        } else {
            word.push({ ...cell, idx: i });
        }
    });
    if (word.length) words.push(word);

    words.forEach(w => {
        if (w === null) {
            const sp = document.createElement('div');
            sp.className = 'ch-word-space';
            boardEl.appendChild(sp);
        } else {
            const wordEl = document.createElement('div');
            wordEl.className = 'ch-word';
            w.forEach(cell => {
                const tile = document.createElement('div');
                tile.className = `ch-tile ${cell.type === 'letter' ? 'revealed' : 'hidden'}`;
                tile.textContent = cell.type === 'letter' ? cell.ch : '';
                wordEl.appendChild(tile);
            });
            boardEl.appendChild(wordEl);
        }
    });

    // Timer
    timerEl.textContent = state.timerValue;

    // Actions
    const isMyTurn = state.currentPlayerIdx === myPlayerIdx;
    renderActions(state, isMyTurn);
}

function renderActions(state, isMyTurn) {
    actionsEl.innerHTML = '';
    solveForm.style.display = 'none';
    spinResultEl.style.display = state.phase === 'spin' ? 'none' : spinResultEl.style.display;

    if (!isMyTurn) {
        actionsEl.innerHTML = `<div class="ch-wait">Turno di ${state.players[state.currentPlayerIdx].username}...</div>`;
        return;
    }

    if (state.phase === 'spin') {
        actionsEl.innerHTML = `<button class="ch-btn ch-btn-spin" onclick="window._chSpin()">🎡 Gira la ruota</button>`;
    } else if (state.phase === 'consonant') {
        actionsEl.innerHTML = `
            <div class="ch-label">Chiama una consonante:</div>
            <div class="ch-letter-grid">
                ${CONSONANTS.map(l => {
                    const used = state.usedLetters.includes(l);
                    return `<button class="ch-letter ${used ? 'used' : ''}" ${used ? 'disabled' : ''} onclick="window._chConsonant('${l}')">${l}</button>`;
                }).join('')}
            </div>
        `;
    } else if (state.phase === 'action') {
        const canVowel = state.mancheScore[myPlayerIdx] >= 1000;
        actionsEl.innerHTML = `
            <div class="ch-action-btns">
                <button class="ch-btn ch-btn-spin" onclick="window._chSpinAgain()">🎡 Rispin</button>
                ${canVowel ? `<button class="ch-btn ch-btn-vowel" onclick="window._chShowVowels()">🔤 Vocale (1000€)</button>` : ''}
                <button class="ch-btn ch-btn-solve" onclick="window._chShowSolve()">💡 Risolvi</button>
            </div>
        `;
    }
}

// ─── Actions ──────────────────────────────────────────────────────────────────
window._chSpin = () => socket.emit('challenge:spin', { challengeId: activeChallengeId });
window._chSpinAgain = () => socket.emit('challenge:action-spin', { challengeId: activeChallengeId });
window._chConsonant = (l) => socket.emit('challenge:consonant', { challengeId: activeChallengeId, letter: l });

window._chShowVowels = () => {
    actionsEl.innerHTML = `
        <div class="ch-label">Scegli una vocale:</div>
        <div class="ch-letter-grid vowels">
            ${VOWELS.map(l => {
                const used = gameState?.usedLetters?.includes(l);
                return `<button class="ch-letter ${used ? 'used' : ''}" ${used ? 'disabled' : ''} onclick="window._chVowel('${l}')">${l}</button>`;
            }).join('')}
        </div>
    `;
};

window._chVowel = (l) => socket.emit('challenge:vowel', { challengeId: activeChallengeId, letter: l });

window._chShowSolve = () => {
    solveForm.style.display = 'flex';
    document.getElementById('ch-solve-input').focus();
};

function submitSolve() {
    const val = document.getElementById('ch-solve-input').value;
    if (!val.trim()) return;
    socket.emit('challenge:solve', { challengeId: activeChallengeId, solution: val });
    document.getElementById('ch-solve-input').value = '';
    solveForm.style.display = 'none';
}

// ─── Invite ───────────────────────────────────────────────────────────────────
function showInvite(challengeId, from) {
    const existing = document.getElementById('ch-invite-toast');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'ch-invite-toast';
    el.className = 'ch-invite-toast';
    el.innerHTML = `
        <div class="ch-invite-text"><strong>${from}</strong> ti sfida!</div>
        <div class="ch-invite-btns">
            <button class="ch-invite-accept">Accetta</button>
            <button class="ch-invite-decline">Rifiuta</button>
        </div>
    `;
    el.querySelector('.ch-invite-accept').addEventListener('click', () => {
        activeChallengeId = challengeId;
        socket.emit('challenge:accept', { challengeId });
        el.remove();
    });
    el.querySelector('.ch-invite-decline').addEventListener('click', () => {
        socket.emit('challenge:decline', { challengeId });
        el.remove();
    });
    document.body.appendChild(el);

    setTimeout(() => { if (el.parentNode) el.remove(); }, 30000);
}

function showWaiting() {
    const el = document.createElement('div');
    el.id = 'ch-waiting-toast';
    el.className = 'ch-invite-toast';
    el.innerHTML = `<div class="ch-invite-text">Sfida inviata! In attesa...</div>`;
    document.body.appendChild(el);
}

function hideWaiting() {
    document.getElementById('ch-waiting-toast')?.remove();
}

// ─── Game over ────────────────────────────────────────────────────────────────
function showGameOver(winner, totalScore, players, iWon) {
    if (!overlay) return;
    overlay.innerHTML = `
        <div class="challenge-modal ch-gameover">
            <div class="ch-gameover-emoji">${iWon ? '🏆' : '😅'}</div>
            <div class="ch-gameover-title">${iWon ? 'Hai vinto!' : `${winner} ha vinto!`}</div>
            <div class="ch-gameover-scores">
                ${players.map((p, i) => `
                    <div class="ch-gameover-row ${i === players.findIndex(x => x.username === winner) ? 'winner' : ''}">
                        <span>${p.username}</span>
                        <span>${totalScore[i].toLocaleString()}€</span>
                    </div>
                `).join('')}
            </div>
            <button class="ch-btn ch-btn-spin" onclick="document.getElementById('challenge-overlay').style.display='none'">Chiudi</button>
        </div>
    `;
    setTimeout(() => { overlay.style.display = 'none'; }, 15000);
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'ch-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ─── Public API ───────────────────────────────────────────────────────────────
export function sendChallenge(opponentId) {
    if (!socket) { showToast('Connetti il socket prima'); return; }
    socket.emit('challenge:send', { opponentId });
}
