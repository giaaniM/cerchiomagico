import { SOCKET_URL } from './native.js';
import { currentProfile } from './auth.js';
import { t, getCurrentLang } from './lang.js';
import { showScreen } from './utils.js';
import { soundManager } from './sound.js';

let socket = null;
let roomCode = null;
let myIndex = null;
let roomState = null;
let timerInterval = null;

// ── Connect ──
function ensureSocket() {
    if (socket?.connected) return socket;
    socket = window.io(SOCKET_URL);
    socket.on('online:state', onState);
    socket.on('online:timer', onTimer);
    socket.on('online:spin_result', onSpinResult);
    socket.on('online:match_found', onMatchFound);
    socket.on('online:waiting', onWaiting);
    socket.on('online:private_created', onPrivateCreated);
    socket.on('online:error', onServerError);
    return socket;
}

// ── Public API ──
export function joinMatchmaking() {
    const s = ensureSocket();
    const profile = currentProfile;
    s.emit('online:join_matchmaking', {
        userId: profile?.id ?? 'guest_' + Date.now(),
        displayName: profile?.display_name || profile?.username || 'Ospite',
        lang: getCurrentLang(),
    });
    showMatchmakingScreen('searching');
}

export function cancelMatchmaking() {
    socket?.emit('online:cancel_matchmaking', { userId: currentProfile?.id });
    showScreen('setup-screen');
}

export function showPrivateRoomChoice() {
    let el = document.getElementById('online-private-choice-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'online-private-choice-screen';
        el.className = 'screen online-screen';
        document.querySelector('.game-container').appendChild(el);
    }
    el.innerHTML = `
        <div class="mm-container">
            <div class="mm-title">VS Amico</div>
            <button class="mm-share-btn" id="prc-create-btn" style="width:100%;max-width:280px;">✨ Crea stanza</button>
            <div class="prc-divider">oppure inserisci il codice</div>
            <div class="prc-code-row">
                <input id="prc-code-input" class="prc-code-input" type="text" maxlength="6"
                    placeholder="ABC123" autocomplete="off" autocapitalize="characters"
                    style="text-transform:uppercase;">
                <button class="og-btn og-spin-btn" id="prc-join-btn">Entra</button>
            </div>
            <button class="mm-cancel-btn" id="prc-cancel-btn">← Indietro</button>
        </div>
    `;
    document.getElementById('prc-create-btn')?.addEventListener('click', () => {
        showScreen('setup-screen');
        createPrivateRoom();
    });
    document.getElementById('prc-join-btn')?.addEventListener('click', () => {
        const code = document.getElementById('prc-code-input')?.value?.trim().toUpperCase();
        if (!code || code.length < 4) return;
        joinPrivateRoom(code);
    });
    document.getElementById('prc-code-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('prc-join-btn')?.click();
    });
    document.getElementById('prc-code-input')?.addEventListener('input', e => {
        e.target.value = e.target.value.toUpperCase();
    });
    document.getElementById('prc-cancel-btn')?.addEventListener('click', () => showScreen('setup-screen'));
    showScreen('online-private-choice-screen');
}

export function createPrivateRoom() {
    const s = ensureSocket();
    s.emit('online:create_private', {
        userId: currentProfile?.id ?? 'guest_' + Date.now(),
        displayName: currentProfile?.display_name || currentProfile?.username || 'Ospite',
        lang: getCurrentLang(),
    });
}

export function joinPrivateRoom(code) {
    const s = ensureSocket();
    s.emit('online:join_private', {
        code: code.trim().toUpperCase(),
        userId: currentProfile?.id ?? 'guest_' + Date.now(),
        displayName: currentProfile?.display_name || currentProfile?.username || 'Ospite',
    });
}

export function spinWheel() {
    if (!canAct('spin')) return;
    socket?.emit('online:spin', { code: roomCode });
}

export function callConsonant(letter) {
    if (!canAct('letter')) return;
    socket?.emit('online:call_consonant', { code: roomCode, letter });
}

export function buyVowel(letter) {
    if (!canAct('action')) return;
    socket?.emit('online:buy_vowel', { code: roomCode, letter });
}

export function solve(attempt) {
    if (!roomState || myIndex !== roomState.currentTurn) return;
    socket?.emit('online:solve', { code: roomCode, attempt });
}

export function pass() {
    socket?.emit('online:pass', { code: roomCode });
}

function canAct(phase) {
    return roomState && myIndex === roomState.currentTurn && roomState.phase === phase && roomState.status === 'playing';
}

// ── Event handlers ──
function onMatchFound({ code, vsBot }) {
    roomCode = code;
    showOnlineGameScreen();
    if (vsBot) showMessage('Nessun avversario trovato. Giochi contro il Bot 🤖');
}

function onState(state) {
    roomState = state;
    myIndex = state.myIndex;
    renderOnlineGame(state);
}

function onTimer(secs) {
    const el = document.getElementById('online-timer');
    if (el) {
        el.textContent = secs;
        el.className = 'online-timer' + (secs <= 3 ? ' urgent' : '');
    }
}

function onSpinResult({ segment }) {
    soundManager.playSpin?.();
}

function onWaiting({ position }) {
    const msg = document.getElementById('mm-status');
    if (msg) msg.textContent = `In coda... ${position} giocator${position === 1 ? 'e' : 'i'} in attesa`;
}

function onPrivateCreated({ code }) {
    showPrivateRoomScreen(code);
}

function onServerError({ msg }) {
    showMessage(msg, 'error');
}

// ── UI: Matchmaking screen ──
function showMatchmakingScreen(mode) {
    let el = document.getElementById('online-matchmaking-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'online-matchmaking-screen';
        el.className = 'screen online-screen';
        document.querySelector('.game-container').appendChild(el);
    }
    el.innerHTML = `
        <div class="mm-container">
            <div class="mm-spinner">🔄</div>
            <div class="mm-title">${mode === 'searching' ? t('online.searching') : t('online.waiting') || 'Attendo...'}</div>
            <div class="mm-status" id="mm-status">${t('online.timeout')}</div>
            <button class="mm-cancel-btn" id="mm-cancel-btn">${t('cancel') || 'Annulla'}</button>
        </div>
    `;
    document.getElementById('mm-cancel-btn')?.addEventListener('click', cancelMatchmaking);
    showScreen('online-matchmaking-screen');
}

function showPrivateRoomScreen(code) {
    let el = document.getElementById('online-private-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'online-private-screen';
        el.className = 'screen online-screen';
        document.querySelector('.game-container').appendChild(el);
    }
    el.innerHTML = `
        <div class="mm-container">
            <div class="mm-title">Sfida un amico</div>
            <div class="private-code-display">${code}</div>
            <p class="private-code-sub">Condividi questo codice con il tuo amico</p>
            <button class="mm-share-btn" id="mm-share-btn">📤 Condividi</button>
            <div class="mm-status" id="mm-status">In attesa che l'amico si connetta...</div>
            <button class="mm-cancel-btn" id="mm-cancel-btn">Annulla</button>
        </div>
    `;
    document.getElementById('mm-share-btn')?.addEventListener('click', () => {
        navigator.share?.({ title: 'MagicSpin', text: `Sfidami su MagicSpin! Codice: ${code}` })
            ?? navigator.clipboard?.writeText(code);
    });
    document.getElementById('mm-cancel-btn')?.addEventListener('click', () => showScreen('setup-screen'));
    showScreen('online-private-screen');
}

// ── UI: Online game screen ──
function showOnlineGameScreen() {
    let el = document.getElementById('online-game-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'online-game-screen';
        el.className = 'screen online-screen';
        document.querySelector('.game-container').appendChild(el);
        el.innerHTML = buildOnlineGameHTML();
        wireOnlineGameControls();
    }
    showScreen('online-game-screen');
}

function buildOnlineGameHTML() {
    return `
    <div class="og-container">
        <!-- Header: scores + timer -->
        <div class="og-header">
            <div class="og-player-card" id="og-player-0">
                <span class="og-player-name" id="og-name-0">—</span>
                <span class="og-player-score" id="og-score-0">€0</span>
            </div>
            <div class="og-timer-wrap">
                <div class="online-timer" id="online-timer">${10}</div>
                <div class="og-hint" id="og-hint"></div>
            </div>
            <div class="og-player-card og-player-right" id="og-player-1">
                <span class="og-player-name" id="og-name-1">—</span>
                <span class="og-player-score" id="og-score-1">€0</span>
            </div>
        </div>

        <!-- Board -->
        <div class="og-board" id="og-board"></div>

        <!-- Turn banner -->
        <div class="og-turn-banner" id="og-turn-banner"></div>

        <!-- Actions -->
        <div class="og-actions" id="og-actions">
            <button class="og-btn og-spin-btn" id="og-spin-btn">🎡 Gira</button>
            <button class="og-btn og-solve-btn" id="og-solve-btn">💡 Risolvi</button>
        </div>

        <!-- Letter keyboard -->
        <div class="og-keyboard" id="og-keyboard">
            <div class="og-consonants" id="og-consonants"></div>
            <div class="og-vowels" id="og-vowels"></div>
        </div>

        <!-- Solve input (hidden by default) -->
        <div class="og-solve-area" id="og-solve-area" style="display:none;">
            <input id="og-solve-input" class="og-solve-input" type="text" placeholder="Scrivi la frase..." autocomplete="off" autocorrect="off" autocapitalize="characters">
            <button class="og-btn" id="og-solve-confirm">✓ Conferma</button>
            <button class="og-btn og-btn-secondary" id="og-solve-cancel">✕</button>
        </div>
    </div>
    `;
}

const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const VOWELS = ['A','E','I','O','U'];

function wireOnlineGameControls() {
    document.getElementById('og-spin-btn')?.addEventListener('click', () => { soundManager.playClick(); spinWheel(); });

    document.getElementById('og-solve-btn')?.addEventListener('click', () => {
        soundManager.playClick();
        document.getElementById('og-solve-area').style.display = 'flex';
        document.getElementById('og-solve-input')?.focus();
    });

    document.getElementById('og-solve-confirm')?.addEventListener('click', () => {
        const val = document.getElementById('og-solve-input')?.value || '';
        solve(val);
        document.getElementById('og-solve-area').style.display = 'none';
    });

    document.getElementById('og-solve-cancel')?.addEventListener('click', () => {
        document.getElementById('og-solve-area').style.display = 'none';
    });

    document.getElementById('og-solve-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('og-solve-confirm')?.click();
    });

    // Build consonant buttons
    const consDiv = document.getElementById('og-consonants');
    if (consDiv) {
        CONSONANTS.forEach(l => {
            const btn = document.createElement('button');
            btn.className = 'og-key og-consonant-key';
            btn.textContent = l;
            btn.dataset.letter = l;
            btn.addEventListener('click', () => { soundManager.playClick(); callConsonant(l); });
            consDiv.appendChild(btn);
        });
    }

    // Build vowel buttons
    const vowDiv = document.getElementById('og-vowels');
    if (vowDiv) {
        VOWELS.forEach(l => {
            const btn = document.createElement('button');
            btn.className = 'og-key og-vowel-key';
            btn.textContent = l;
            btn.dataset.letter = l;
            btn.addEventListener('click', () => { soundManager.playClick(); buyVowel(l); });
            vowDiv.appendChild(btn);
        });
    }
}

function renderOnlineGame(state) {
    // Player names + scores
    state.players.forEach((p, i) => {
        const nameEl = document.getElementById(`og-name-${i}`);
        const scoreEl = document.getElementById(`og-score-${i}`);
        if (nameEl) nameEl.textContent = p.displayName;
        if (scoreEl) scoreEl.textContent = `€${Number(p.score).toLocaleString('it-IT')}`;

        const card = document.getElementById(`og-player-${i}`);
        if (card) {
            card.classList.toggle('og-active-player', i === state.currentTurn);
            card.classList.toggle('og-my-player', i === myIndex);
        }
    });

    // Hint
    const hintEl = document.getElementById('og-hint');
    if (hintEl) hintEl.textContent = state.hint || '';

    // Board
    renderBoard(state);

    // Turn banner
    const banner = document.getElementById('og-turn-banner');
    if (banner) {
        const isMyTurn = state.currentTurn === myIndex;
        banner.textContent = isMyTurn
            ? `🎯 ${t('online.myturn')}`
            : `⏳ ${t('online.theirturn').replace('{name}', state.players[state.currentTurn]?.displayName || '…')}`;
        banner.className = 'og-turn-banner' + (isMyTurn ? ' og-my-turn' : '');
    }

    // Controls visibility
    const isMyTurn = state.currentTurn === myIndex && state.status === 'playing';
    const spinBtn = document.getElementById('og-spin-btn');
    const solveBtn = document.getElementById('og-solve-btn');
    const keyboard = document.getElementById('og-keyboard');

    if (spinBtn) spinBtn.style.display = (isMyTurn && state.phase === 'spin') ? '' : 'none';
    if (solveBtn) solveBtn.style.display = isMyTurn ? '' : 'none';

    // Keyboard: show consonants on 'letter', vowels on 'action'
    const consDiv = document.getElementById('og-consonants');
    const vowDiv = document.getElementById('og-vowels');
    if (consDiv) consDiv.style.display = (isMyTurn && state.phase === 'letter') ? '' : 'none';
    if (vowDiv) vowDiv.style.display = (isMyTurn && state.phase === 'action') ? '' : 'none';

    // Mark used letters
    document.querySelectorAll('.og-key').forEach(btn => {
        btn.disabled = state.used.includes(btn.dataset.letter);
        btn.classList.toggle('og-key-used', state.used.includes(btn.dataset.letter));
    });

    // Game over
    if (state.status === 'finished') {
        showGameOver(state);
    }
}

function renderBoard(state) {
    const board = document.getElementById('og-board');
    if (!board) return;
    const normalized = state.normalized;
    const revealed = new Set(state.revealed);
    const words = normalized.split(' ');
    board.innerHTML = words.map(word => {
        const letters = word.split('').map(l => {
            const show = revealed.has(l);
            return `<span class="og-tile ${show ? 'og-tile-revealed' : ''}">${show ? l : ''}</span>`;
        }).join('');
        return `<div class="og-word">${letters}</div>`;
    }).join('');
}

function showGameOver(state) {
    const winnerIdx = state.total[0] >= state.total[1] ? 0 : 1;
    const iWon = winnerIdx === myIndex;
    const overlay = document.createElement('div');
    overlay.className = 'og-gameover-overlay';
    overlay.innerHTML = `
        <div class="og-gameover-card">
            <div class="og-gameover-icon">${iWon ? '🏆' : '😔'}</div>
            <div class="og-gameover-title">${iWon ? t('online.won') : t('online.lost')}</div>
            <div class="og-gameover-scores">
                ${state.players.map((p, i) => `
                    <div class="og-gameover-row ${i === winnerIdx ? 'og-gameover-winner' : ''}">
                        <span>${p.displayName}</span>
                        <span>€${Number(state.total[i]).toLocaleString('it-IT')}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary og-rematch-btn" id="og-rematch-btn">🔄 ${t('online.rematch')}</button>
            <button class="og-btn-secondary og-home-btn" id="og-home-btn">🏠 ${t('online.home')}</button>
        </div>
    `;
    document.getElementById('online-game-screen')?.appendChild(overlay);
    document.getElementById('og-rematch-btn')?.addEventListener('click', () => {
        overlay.remove();
        joinMatchmaking();
    });
    document.getElementById('og-home-btn')?.addEventListener('click', () => {
        overlay.remove();
        showScreen('setup-screen');
    });
}

function showMessage(text, type = 'info') {
    const el = document.getElementById('og-turn-banner');
    if (el) { el.textContent = text; el.className = `og-turn-banner og-msg-${type}`; }
}
