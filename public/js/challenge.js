import { currentProfile } from './auth.js';
import { SOCKET_URL } from './native.js';
import { getCurrentLang, t } from './lang.js';
import { ic } from './icons.js';

let socket = null;

// Pending invites kept in memory so they survive banner dismissal
const _pendingInvites = [];

export function getChallengeSocket() { return socket; }

export function initChallengeSocket(existingSocket) {
    if (existingSocket) {
        socket = existingSocket;
    } else if (!socket?.connected) {
        socket = window.io(SOCKET_URL);
    }

    // Re-auth after reconnect (server restart clears userSockets)
    socket.on('connect', () => authSocket());

    socket.on('challenge:invite', ({ challengeId, from, lang }) => {
        _currentChallengeId = challengeId;
        // Store invite if not already present
        if (!_pendingInvites.find(i => i.challengeId === challengeId)) {
            const invite = { challengeId, from, lang, ts: Date.now() };
            _pendingInvites.push(invite);
            // Auto-expire after 30s
            setTimeout(() => _removeInvite(challengeId), 30000);
        }
        showBadge();
        showInvite(challengeId, from, lang);
        _renderProfileInvites();
    });
    socket.on('challenge:sent', () => {
        _lobbySetState('waiting');
    });
    socket.on('challenge:declined', () => {
        _lobbySetState('declined');
    });
    socket.on('challenge:room_ready', ({ code }) => {
        _closeLobby();
        clearBadge();
        _pendingInvites.length = 0;
        _renderProfileInvites();
        import('./online-game.js').then(m => m.joinChallengeRoom(code, socket));
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

function _removeInvite(challengeId) {
    const idx = _pendingInvites.findIndex(i => i.challengeId === challengeId);
    if (idx !== -1) _pendingInvites.splice(idx, 1);
    _renderProfileInvites();
    if (_pendingInvites.length === 0) clearBadge();
}

export function renderProfileInvites() {
    _renderProfileInvites();
}

function _renderProfileInvites() {
    const section = document.getElementById('profile-invites-section');
    if (!section) return;
    if (_pendingInvites.length === 0) {
        section.style.display = 'none';
        section.innerHTML = '';
        return;
    }
    section.style.display = 'block';
    section.innerHTML = `
        <div class="pi-title">⚔️ Sfide in arrivo</div>
        ${_pendingInvites.map(inv => `
            <div class="pi-row" data-cid="${inv.challengeId}">
                <div class="pi-avatar">${escHtml(inv.from[0]?.toUpperCase() ?? '?')}</div>
                <div class="pi-info">
                    <div class="pi-from">${escHtml(inv.from)}</div>
                    <div class="pi-sub">ti ha sfidato!</div>
                </div>
                <div class="pi-btns">
                    <button class="pi-accept" data-cid="${inv.challengeId}">✓</button>
                    <button class="pi-decline" data-cid="${inv.challengeId}">✕</button>
                </div>
            </div>
        `).join('')}
    `;
    section.querySelectorAll('.pi-accept').forEach(btn => {
        btn.addEventListener('click', () => {
            const cid = btn.dataset.cid;
            socket?.emit('challenge:accept', { challengeId: cid });
            _removeInvite(cid);
            document.getElementById('ch-invite-banner')?.remove();
        });
    });
    section.querySelectorAll('.pi-decline').forEach(btn => {
        btn.addEventListener('click', () => {
            const cid = btn.dataset.cid;
            socket?.emit('challenge:decline', { challengeId: cid });
            _removeInvite(cid);
            document.getElementById('ch-invite-banner')?.remove();
        });
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
let _lobbyOpponent = '';
function getCurrentChallengeId() { return _currentChallengeId; }

// ── Lobby (challenger waiting) ──

export function showChallengeLobby(opponentUsername) {
    _lobbyOpponent = opponentUsername;
    let lobby = document.getElementById('ch-lobby');
    if (!lobby) {
        lobby = document.createElement('div');
        lobby.id = 'ch-lobby';
        document.body.appendChild(lobby);
    }
    lobby.innerHTML = `
        <div class="ch-lobby-box">
            <div class="ch-lobby-avatar">${escHtml(opponentUsername[0]?.toUpperCase() ?? '?')}</div>
            <div class="ch-lobby-name">${escHtml(opponentUsername)}</div>
            <div class="ch-lobby-dots" id="ch-lobby-msg">
                <span class="ch-lobby-text">Sfida inviata</span>
                <span class="ch-dot-anim"><span>.</span><span>.</span><span>.</span></span>
            </div>
            <button class="ch-lobby-cancel" id="ch-lobby-cancel">${ic('x', 16)} Annulla</button>
        </div>`;
    lobby.style.display = 'flex';
    document.getElementById('ch-lobby-cancel')?.addEventListener('click', () => {
        if (_currentChallengeId && socket?.connected) {
            socket.emit('challenge:cancel', { challengeId: _currentChallengeId });
        }
        _closeLobby();
    });
}

function _lobbySetState(state) {
    const msg = document.getElementById('ch-lobby-msg');
    const cancelBtn = document.getElementById('ch-lobby-cancel');
    if (!msg) return;
    if (state === 'waiting') {
        msg.innerHTML = `<span class="ch-lobby-text">In attesa che accetti</span><span class="ch-dot-anim"><span>.</span><span>.</span><span>.</span></span>`;
    } else if (state === 'declined') {
        msg.innerHTML = `<span class="ch-lobby-text ch-lobby-declined">${ic('x-circle', 18)} Ha rifiutato la sfida</span>`;
        if (cancelBtn) { cancelBtn.textContent = 'Chiudi'; cancelBtn.style.marginTop = '8px'; }
    }
}

function _closeLobby() {
    const lobby = document.getElementById('ch-lobby');
    if (lobby) lobby.style.display = 'none';
    _currentChallengeId = null;
}

// ── Badge notifica sul tab Profilo ──

function showBadge() {
    const tab = document.getElementById('btb-profile');
    if (!tab) return;
    if (!tab.querySelector('.btb-badge')) {
        const dot = document.createElement('span');
        dot.className = 'btb-badge';
        tab.appendChild(dot);
    }
}

function clearBadge() {
    document.querySelector('#btb-profile .btb-badge')?.remove();
}

function showInvite(challengeId, from, lang) {
    // Remove any existing invite banner
    document.getElementById('ch-invite-banner')?.remove();

    const banner = document.createElement('div');
    banner.id = 'ch-invite-banner';
    banner.className = 'ch-invite-banner';
    banner.innerHTML = `
        <div class="ch-invite-avatar">${escHtml(from[0]?.toUpperCase() ?? '?')}</div>
        <div class="ch-invite-info">
            <div class="ch-invite-from">${escHtml(from)}</div>
            <div class="ch-invite-sub">ti ha sfidato!</div>
        </div>
        <div class="ch-invite-actions">
            <button class="ch-invite-btn ch-invite-accept" id="ch-accept-${challengeId}">${ic('check', 18)}</button>
            <button class="ch-invite-btn ch-invite-decline" id="ch-decline-${challengeId}">${ic('x', 18)}</button>
        </div>`;
    document.body.appendChild(banner);

    // Animate in
    requestAnimationFrame(() => banner.classList.add('ch-invite-visible'));

    const removeBanner = () => {
        banner.classList.remove('ch-invite-visible');
        setTimeout(() => banner.remove(), 300);
        clearBadge();
    };

    document.getElementById(`ch-accept-${challengeId}`)?.addEventListener('click', () => {
        socket?.emit('challenge:accept', { challengeId });
        _removeInvite(challengeId);
        removeBanner();
    });
    document.getElementById(`ch-decline-${challengeId}`)?.addEventListener('click', () => {
        socket?.emit('challenge:decline', { challengeId });
        _removeInvite(challengeId);
        removeBanner();
    });

    const autoRemove = setTimeout(removeBanner, 30000);
    banner.addEventListener('remove', () => clearTimeout(autoRemove), { once: true });
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
