import { SOCKET_URL } from './native.js';
import { currentProfile, getFriends } from './auth.js';
import { t, getCurrentLang } from './lang.js';
import { showScreen } from './utils.js';
import { soundManager } from './sound.js';
import { gameState } from './state.js';
import { elements } from './elements.js';
import { createBoard, revealLetter } from './board.js';
import { renderPlayersList } from './players.js';
import { drawWheel, renderWheelToCache } from './wheel.js';

let socket = null;
let roomCode = null;
let myIndex = null;
let roomState = null;
let _onlineMode = false;
let _prevPhrase = null;
let _wheelSpinning = false;
let _spinResultPending = null;

// ── Connect ──
function _registerSocketHandlers(s) {
    s.on('online:state', onState);
    s.on('online:timer', onTimer);
    s.on('online:spin_result', onSpinResult);
    s.on('online:match_found', onMatchFound);
    s.on('online:waiting', onWaiting);
    s.on('online:private_created', onPrivateCreated);
    s.on('online:error', onServerError);
}

function ensureSocket() {
    if (socket?.connected) return socket;
    socket = window.io(SOCKET_URL);
    _registerSocketHandlers(socket);
    return socket;
}

// Called from challenge.js when challenge is accepted — reuses existing socket
export function joinChallengeRoom(code, challengeSocket) {
    roomCode = code;
    if (challengeSocket && (!socket || socket === challengeSocket)) {
        socket = challengeSocket;
        _registerSocketHandlers(socket);
    } else {
        ensureSocket();
    }
    _initOnlineGameScreen();
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
            <button class="mm-share-btn" id="prc-create-btn" style="width:100%;max-width:280px;">Crea stanza</button>
            <div class="prc-divider">oppure inserisci il codice</div>
            <div class="prc-code-row">
                <input id="prc-code-input" class="prc-code-input" type="text" maxlength="6"
                    placeholder="ABC123" autocomplete="off" autocapitalize="characters"
                    style="text-transform:uppercase;">
                <button class="og-btn og-spin-btn" id="prc-join-btn">Entra</button>
            </div>
            <button class="mm-cancel-btn" id="prc-cancel-btn">Indietro</button>
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
    if (!roomState || myIndex !== roomState.currentTurn || roomState.status !== 'playing') return false;
    return roomState.phase === phase;
}

// ── Main game screen for online play ──

function _initOnlineGameScreen() {
    _onlineMode = true;
    _prevPhrase = null;
    _wheelSpinning = false;
    _spinResultPending = null;

    showScreen('game-screen');
    document.getElementById('game-screen')?.classList.add('online-mode');

    // Initialize wheel canvas
    renderWheelToCache();
    drawWheel(gameState.wheelRotation || 0);

    // Hide loader
    const loader = document.getElementById('game-loader');
    if (loader) loader.style.display = 'none';

    // Adapt UI for online mode
    const skipBtn = document.getElementById('skip-phrase-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const soloTimerWrap = document.getElementById('solo-timer-wrap');
    const footer = document.querySelector('.game-footer');
    if (skipBtn) skipBtn.style.display = 'none';
    if (newGameBtn) newGameBtn.style.display = 'none';
    if (footer) footer.style.display = 'none';

    // Repurpose solo timer for online countdown
    if (soloTimerWrap) {
        soloTimerWrap.style.display = 'flex';
        const label = soloTimerWrap.querySelector('.solo-timer-label');
        if (label) label.textContent = '⏱ TURNO';
        const recordRow = document.getElementById('solo-record-row');
        if (recordRow) recordRow.style.display = 'none';
    }

    // Manche indicator → "ONLINE"
    const mancheIndicator = document.querySelector('.manche-indicator');
    if (mancheIndicator) mancheIndicator.innerHTML = '<span style="font-size:0.9rem;letter-spacing:1px;opacity:0.9;">🌐 ONLINE</span>';

    // Show home button as exit (top-right quick action)
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) {
        homeBtn.style.display = 'flex';
        homeBtn.onclick = () => _exitOnlineGame();
    }

    // Inject "Abbandona" button into game footer
    let abandonBtn = document.getElementById('online-abandon-btn');
    if (!abandonBtn) {
        const footer = document.querySelector('.game-footer') || document.getElementById('game-screen');
        abandonBtn = document.createElement('div');
        abandonBtn.id = 'online-abandon-btn';
        abandonBtn.style.cssText = 'display:flex;justify-content:center;padding:8px 0 12px;';
        abandonBtn.innerHTML = '<button style="background:transparent;border:1px solid rgba(255,255,255,0.15);color:rgba(255,255,255,0.45);font-size:0.8rem;padding:6px 18px;border-radius:20px;cursor:pointer;letter-spacing:0.05em;">🏳 Abbandona partita</button>';
        abandonBtn.querySelector('button').onclick = () => _exitOnlineGame();
        footer?.parentNode?.insertBefore(abandonBtn, footer.nextSibling) || document.getElementById('game-screen')?.appendChild(abandonBtn);
    }
    abandonBtn.style.display = 'flex';

    // Override control buttons
    _overrideControls();
}

let _controlsWired = false;

function _overrideControls() {
    if (_controlsWired) return; // Add listeners once only; _onlineMode flag guards behavior
    _controlsWired = true;

    // Capture-phase listeners fire before game-logic handlers.
    // When _onlineMode is true: handle + stop propagation.
    // When _onlineMode is false: do nothing, let local game handler run.

    document.getElementById('spin-btn')?.addEventListener('click', e => {
        if (!_onlineMode) return;
        e.stopImmediatePropagation();
        if (_wheelSpinning) return;
        const phase = roomState?.phase;
        if (phase !== 'spin' && phase !== 'action') return;
        if (myIndex !== roomState?.currentTurn || roomState?.status !== 'playing') return;
        soundManager.playClick?.();
        _doOnlineSpin();
        socket?.emit('online:spin', { code: roomCode });
    }, true);

    document.getElementById('consonant-btn')?.addEventListener('click', e => {
        if (!_onlineMode) return;
        e.stopImmediatePropagation();
        const letter = document.getElementById('consonant-input')?.value.trim().toUpperCase().slice(0, 1);
        if (!letter || !canAct('letter')) return;
        soundManager.playClick?.();
        callConsonant(letter);
        const ci = document.getElementById('consonant-input');
        if (ci) ci.value = '';
    }, true);

    document.getElementById('vowel-btn')?.addEventListener('click', e => {
        if (!_onlineMode) return;
        e.stopImmediatePropagation();
        const letter = document.getElementById('vowel-input')?.value.trim().toUpperCase().slice(0, 1);
        if (!letter || !canAct('action')) return;
        soundManager.playClick?.();
        buyVowel(letter);
        const vi = document.getElementById('vowel-input');
        if (vi) vi.value = '';
    }, true);

    document.getElementById('solve-btn')?.addEventListener('click', e => {
        if (!_onlineMode) return;
        e.stopImmediatePropagation();
        const attempt = document.getElementById('solution-input')?.value.trim();
        if (!attempt || myIndex !== roomState?.currentTurn) return;
        soundManager.playClick?.();
        solve(attempt);
        const si = document.getElementById('solution-input');
        if (si) si.value = '';
    }, true);
}

// ── Wheel spin animation ──

function _doOnlineSpin() {
    _wheelSpinning = true;
    _spinResultPending = null;

    const overlay = document.getElementById('wheel-overlay');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    renderWheelToCache();

    const duration = 3000;
    const start = performance.now();
    let rot = gameState.wheelRotation || 0;

    function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        // Speed: fast at start, slow at end
        const speed = (1 - ease) * 15 + 0.5;
        rot += speed;
        gameState.wheelRotation = rot;
        drawWheel(rot);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            _finishSpin();
        }
    }
    requestAnimationFrame(animate);
}

function _finishSpin() {
    _wheelSpinning = false;
    const overlay = document.getElementById('wheel-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';

    if (_spinResultPending != null) {
        _showSpinResult(_spinResultPending);
        _spinResultPending = null;
    }
}

function _showSpinResult(value) {
    soundManager.playSpin?.();
    const msgEl = document.getElementById('message-display');
    if (!msgEl) return;
    const text = typeof value === 'number'
        ? `💰 €${value.toLocaleString('it-IT')}`
        : `⚡ ${value}`;
    msgEl.textContent = text;
    msgEl.style.color = typeof value === 'number' ? '#4ade80' : '#f87171';
    setTimeout(() => { if (msgEl) msgEl.textContent = ''; }, 3000);
}

// Short spin animation for the observer (other player)
function _doOnlineSpinObserver() {
    _wheelSpinning = true;

    const overlay = document.getElementById('wheel-overlay');
    if (overlay) overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    renderWheelToCache();

    const duration = 1800;
    const start = performance.now();
    let rot = gameState.wheelRotation || 0;

    function animate(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        const speed = (1 - ease) * 15 + 0.5;
        rot += speed;
        gameState.wheelRotation = rot;
        drawWheel(rot);

        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            _finishSpin();
        }
    }
    requestAnimationFrame(animate);
}

function _exitOnlineGame() {
    _onlineMode = false;
    socket?.emit('online:pass', { code: roomCode });
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.style.display = 'none';
    const abandonBtn = document.getElementById('online-abandon-btn');
    if (abandonBtn) abandonBtn.style.display = 'none';
    const skipBtn = document.getElementById('skip-phrase-btn');
    const footer = document.querySelector('.game-footer');
    if (skipBtn) skipBtn.style.display = '';
    if (footer) footer.style.display = '';
    document.getElementById('og-gameover-overlay')?.remove();
    document.getElementById('game-screen')?.classList.remove('online-mode');
    showScreen('setup-screen');
}

// ── Event handlers ──

function onMatchFound({ code, vsBot }) {
    roomCode = code;
    _initOnlineGameScreen();
    if (vsBot) {
        const msgEl = document.getElementById('message-display');
        if (msgEl) msgEl.textContent = 'Nessun avversario trovato. Giochi contro il Bot 🤖';
    }
}

function onState(state) {
    roomState = state;
    myIndex = state.myIndex;
    _renderToMainScreen(state);
}

function onTimer(secs) {
    const timerEl = document.getElementById('solo-timer');
    if (timerEl) {
        const s = typeof secs === 'number' ? secs : 10;
        timerEl.textContent = s < 10 ? `0:0${s}` : `0:${s}`;
        timerEl.style.color = s <= 3 ? '#ef4444' : '';
    }
}

function onSpinResult({ segment }) {
    _spinResultPending = segment?.value ?? null;
    if (!_wheelSpinning) {
        // We're the observer — show wheel spinning too
        _doOnlineSpinObserver();
    }
    // If _wheelSpinning: we're the active player, animation already running, _finishSpin will pick up _spinResultPending
}

function onWaiting({ position }) {
    const msg = document.getElementById('mm-status');
    if (msg) msg.textContent = `In coda... ${position} giocator${position === 1 ? 'e' : 'i'} in attesa`;
}

function onPrivateCreated({ code }) {
    showPrivateRoomScreen(code);
}

function onServerError({ msg }) {
    const msgEl = document.getElementById('message-display');
    if (msgEl) { msgEl.textContent = `⚠️ ${msg}`; msgEl.style.color = '#f87171'; }
}

// ── Render to main game screen ──

function _renderToMainScreen(state) {
    if (!_onlineMode) return;

    const players = state.players || [];

    // gameState.players expected as [{name}]
    gameState.players = players.map(p => ({ name: p.displayName }));
    gameState.currentPlayerIndex = state.currentTurn ?? 0;

    // Scores keyed by displayName
    gameState.partialScores = {};
    gameState.totalScores = {};
    players.forEach((p, i) => {
        gameState.partialScores[p.displayName] = state.scores?.[i] ?? 0;
        gameState.totalScores[p.displayName] = state.total?.[i] ?? 0;
    });

    // Hint
    if (elements.hintText) elements.hintText.textContent = state.hint || '';

    // Board — init once per phrase
    if (state.normalized && state.normalized !== _prevPhrase) {
        _prevPhrase = state.normalized;
        gameState.phrase = state.normalized;
        gameState.revealedLetters = new Set();
        const words = state.normalized.split(' ');
        console.warn('[ONLINE] createBoard phrase:', JSON.stringify(state.normalized));
        console.warn('[ONLINE] words:', words, 'lengths:', words.map(w => w.length));
        createBoard();
    }

    // Reveal letters that haven't been shown yet
    (state.revealed || []).forEach(letter => {
        if (!gameState.revealedLetters.has(letter)) {
            revealLetter(letter, false);
        }
    });

    // Players list + total winnings
    renderPlayersList();

    // Controls
    const isMyTurn = state.currentTurn === myIndex && state.status === 'playing';
    _updateControls(state, isMyTurn);

    // Timer
    if (state.timerLeft != null) onTimer(state.timerLeft);

    // Game over
    if (state.status === 'finished') _showGameOver(state);
}

function _updateControls(state, isMyTurn) {
    const spinBtn    = document.getElementById('spin-btn');
    const consCont   = document.getElementById('consonant-call-container');
    const vowelGroup = document.getElementById('vowel-group');
    const solveGroup = document.getElementById('solve-group');
    const exprCont   = document.getElementById('express-input-container');
    const finalCont  = document.getElementById('final-round-input-container');
    const centralArea = document.getElementById('central-action-area');
    const msgEl      = document.getElementById('message-display');

    // Always hide express / final round modes
    if (exprCont)  exprCont.style.display  = 'none';
    if (finalCont) finalCont.style.display = 'none';
    if (centralArea) centralArea.style.display = 'flex';

    if (!isMyTurn) {
        const opponentName = state.players?.[state.currentTurn]?.displayName || '…';
        if (spinBtn) {
            spinBtn.style.display  = 'block';
            spinBtn.disabled       = true;
            spinBtn.textContent    = `⏳ ${opponentName}`;
        }
        if (consCont)   consCont.style.display   = 'none';
        if (vowelGroup) vowelGroup.style.display  = 'none';
        if (solveGroup) solveGroup.style.display  = 'none';
        if (msgEl) { msgEl.textContent = `Turno di ${opponentName}...`; msgEl.style.color = ''; }
        return;
    }

    if (msgEl && state.phase === 'spin') { msgEl.textContent = '🎯 Tocca a te!'; msgEl.style.color = '#4ade80'; }

    // My turn
    if (state.phase === 'spin') {
        if (spinBtn) {
            spinBtn.style.display = 'block';
            spinBtn.disabled      = false;
            spinBtn.textContent   = t('game.spin') || 'GIRA IL CERCHIO';
        }
        if (consCont)   consCont.style.display   = 'none';
        if (vowelGroup) vowelGroup.style.display  = 'none';
        if (solveGroup) solveGroup.style.display  = 'none';

    } else if (state.phase === 'letter') {
        if (spinBtn) spinBtn.style.display = 'none';
        if (consCont) {
            consCont.style.display = 'flex';
            const valEl = document.getElementById('current-wheel-value');
            if (valEl) valEl.textContent = `€${(state.pendingValue || 0).toLocaleString('it-IT')}`;
        }
        if (vowelGroup) vowelGroup.style.display  = 'none';
        if (solveGroup) solveGroup.style.display  = 'block';
        // Focus consonant input
        const ci = document.getElementById('consonant-input');
        if (ci) { ci.value = ''; ci.disabled = false; setTimeout(() => ci.focus(), 50); }
        const cb = document.getElementById('consonant-btn');
        if (cb) cb.disabled = false;

    } else if (state.phase === 'action') {
        // Spin again + optional vowel + solve
        if (spinBtn) {
            spinBtn.style.display = 'block';
            spinBtn.disabled      = false;
            spinBtn.textContent   = '🎡 Gira ancora';
        }
        if (consCont) consCont.style.display = 'none';

        const canVowel = (state.total?.[myIndex] ?? 0) >= 1000;
        if (vowelGroup) {
            vowelGroup.style.display = canVowel ? 'flex' : 'none';
            const vi = document.getElementById('vowel-input');
            const vb = document.getElementById('vowel-btn');
            if (vi) { vi.value = ''; vi.disabled = false; }
            if (vb) vb.disabled = false;
        }
        if (solveGroup) solveGroup.style.display = 'block';
        const si = document.getElementById('solution-input');
        const sb = document.getElementById('solve-btn');
        if (si) si.disabled = false;
        if (sb) sb.disabled = false;
    }
}

function _showGameOver(state) {
    const winnerIdx = (state.total?.[0] ?? 0) >= (state.total?.[1] ?? 0) ? 0 : 1;
    const iWon = winnerIdx === myIndex;

    // Remove existing overlay if any
    document.getElementById('og-gameover-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'og-gameover-overlay';
    overlay.className = 'og-gameover-overlay';
    overlay.innerHTML = `
        <div class="og-gameover-card">
            <div class="og-gameover-icon">${iWon ? '🏆' : '😔'}</div>
            <div class="og-gameover-title">${iWon ? (t('online.won') || 'Hai vinto!') : (t('online.lost') || 'Hai perso!')}</div>
            <div class="og-gameover-scores">
                ${(state.players || []).map((p, i) => `
                    <div class="og-gameover-row ${i === winnerIdx ? 'og-gameover-winner' : ''}">
                        <span>${p.displayName}</span>
                        <span>€${Number(state.total?.[i] ?? 0).toLocaleString('it-IT')}</span>
                    </div>
                `).join('')}
            </div>
            <button class="btn-primary og-home-btn" id="og-home-btn">🏠 ${t('online.home') || 'Torna alla Home'}</button>
        </div>
    `;
    document.getElementById('game-screen')?.appendChild(overlay);

    document.getElementById('og-home-btn')?.addEventListener('click', () => {
        overlay.remove();
        _exitOnlineGame();
    });
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
            <div class="mm-spinner mm-spinner-anim"></div>
            <div class="mm-title">${mode === 'searching' ? (t('online.searching') || 'Ricerca avversario...') : (t('online.waiting') || 'Attendo...')}</div>
            <div class="mm-status" id="mm-status">${t('online.timeout') || ''}</div>
            <button class="mm-cancel-btn" id="mm-cancel-btn">${t('cancel') || 'Annulla'}</button>
        </div>
    `;
    document.getElementById('mm-cancel-btn')?.addEventListener('click', cancelMatchmaking);
    showScreen('online-matchmaking-screen');
}

// ── Friend Picker Screen (native VS Amico flow) ──

export async function showFriendPickerScreen() {
    let el = document.getElementById('online-friend-picker-screen');
    if (!el) {
        el = document.createElement('div');
        el.id = 'online-friend-picker-screen';
        el.className = 'screen online-screen';
        document.querySelector('.game-container').appendChild(el);
    }

    el.innerHTML = `
        <div class="mm-container">
            <div class="mm-title">Sfida un Amico</div>
            <div id="fpicker-list" class="fpicker-list">
                <div class="fpicker-loading">Caricamento amici...</div>
            </div>
            <button class="mm-cancel-btn" id="fpicker-cancel-btn">Indietro</button>
        </div>
    `;

    document.getElementById('fpicker-cancel-btn')?.addEventListener('click', () => showScreen('setup-screen'));
    showScreen('online-friend-picker-screen');

    // Load friends
    const friends = await getFriends();
    const listEl = document.getElementById('fpicker-list');
    if (!listEl) return;

    if (!friends || friends.length === 0) {
        listEl.innerHTML = '<div class="fpicker-empty">Nessun amico ancora.<br>Aggiungine nel tuo Profilo.</div>';
        return;
    }

    listEl.innerHTML = friends.map(f => {
        const initial = (f.username || '?')[0].toUpperCase();
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(f.username)}&size=36&radius=50`;
        return `
            <div class="fpicker-row" data-id="${escHtml(f.id)}" data-username="${escHtml(f.username)}">
                <img class="fpicker-avatar" src="${avatarUrl}" alt="${escHtml(initial)}" width="36" height="36"
                    onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
                <span class="fpicker-avatar-fallback" style="display:none">${escHtml(initial)}</span>
                <span class="fpicker-name">${escHtml(f.username)}</span>
                <button class="fpicker-challenge-btn" data-id="${escHtml(f.id)}" data-username="${escHtml(f.username)}">Sfida</button>
            </div>
        `;
    }).join('');

    listEl.querySelectorAll('.fpicker-challenge-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const friendId = btn.dataset.id;
            const friendUsername = btn.dataset.username;
            showScreen('setup-screen');
            // Import challenge module lazily to avoid circular deps
            const { sendChallenge, showChallengeLobby } = await import('./challenge.js');
            showChallengeLobby(friendUsername);
            sendChallenge(friendId);
        });
    });
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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
            <button class="mm-share-btn" id="mm-share-btn">Condividi codice</button>
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
