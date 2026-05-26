import { isNative } from './native.js';
import { login, register, verifySession, logout, getSavedUser, getFriends, sendFriendRequest, getPendingRequests, acceptFriendRequest, searchUsers, currentProfile } from './auth.js';
import { showScreen } from './utils.js';
import { formatTime } from './solo.js';
import { initChallengeSocket, sendChallenge, showChallengeLobby } from './challenge.js';
import { ic } from './icons.js';

let _onReady = () => {};
export function onNativeReady(fn) { _onReady = fn; }

export async function bootNative() {
    if (!isNative) return;

    showScreen('login-screen');
    _wireLoginScreen();
    _warmServer();

    // Try restoring saved session
    const saved = getSavedUser();
    if (saved) {
        const user = await verifySession();
        if (user) {
            _onLoginSuccess(user);
            return;
        }
    }
}

function _warmServer() {
    import('./native.js').then(({ API_BASE }) => {
        fetch(`${API_BASE}/api/puzzles?lang=it&_warm=1`, { method: 'GET' }).catch(() => {});
    });
}

function _wireLoginScreen() {
    const tabLogin = document.getElementById('auth-tab-login');
    const tabReg   = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('auth-form-login');
    const formReg   = document.getElementById('auth-form-register');

    tabLogin?.addEventListener('click', () => {
        tabLogin.classList.add('active'); tabReg?.classList.remove('active');
        formLogin?.classList.remove('hidden'); formReg?.classList.add('hidden');
    });
    tabReg?.addEventListener('click', () => {
        tabReg.classList.add('active'); tabLogin?.classList.remove('active');
        formReg?.classList.remove('hidden'); formLogin?.classList.add('hidden');
    });

    // Login form
    document.getElementById('auth-login-btn')?.addEventListener('click', async () => {
        const username = document.getElementById('auth-login-user')?.value.trim();
        const password = document.getElementById('auth-login-pass')?.value;
        const status   = document.getElementById('auth-login-status');
        if (!username || !password) { if (status) status.textContent = 'Compila tutti i campi'; return; }
        if (status) status.textContent = '⏳';
        try {
            const user = await login(username, password);
            _onLoginSuccess(user);
        } catch (e) {
            if (status) status.textContent = `❌ ${e.message}`;
        }
    });

    document.getElementById('auth-login-pass')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('auth-login-btn')?.click();
    });

    // Register form
    document.getElementById('auth-register-btn')?.addEventListener('click', async () => {
        const username = document.getElementById('auth-reg-user')?.value.trim();
        const password = document.getElementById('auth-reg-pass')?.value;
        const email    = document.getElementById('auth-reg-email')?.value.trim();
        const status   = document.getElementById('auth-register-status');
        if (!username || !password) { if (status) status.textContent = 'Compila username e password'; return; }
        if (status) status.textContent = '⏳';
        try {
            const user = await register(username, password, email);
            _onLoginSuccess(user);
        } catch (e) {
            if (status) status.textContent = `❌ ${e.message}`;
        }
    });

    document.getElementById('auth-reg-pass')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') document.getElementById('auth-register-btn')?.click();
    });

    // Guest
    document.getElementById('guest-signin-btn')?.addEventListener('click', () => {
        showScreen('setup-screen');
        _onReady();
    });
}

function _onLoginSuccess(user) {
    showProfileBar(user);
    initChallengeSocket(null);
    showScreen('setup-screen');
    _onReady();
}

function showProfileBar(user) {
    const username = user.username || 'Ospite';
    const avatarChar = username[0].toUpperCase();

    // Populate hidden proxy elements (used by main.js tab switching)
    const spbName   = document.getElementById('spb-name');
    const spbAvatar = document.getElementById('spb-avatar');
    const spbRecord = document.getElementById('spb-record');
    if (spbName)   spbName.textContent   = username;
    if (spbAvatar) spbAvatar.textContent = avatarChar;
    if (spbRecord) spbRecord.textContent = '';

    // Also populate profile tab directly
    const profUsername = document.getElementById('prof-username');
    const profAvatar   = document.getElementById('prof-avatar');
    if (profUsername) profUsername.textContent = username;
    if (profAvatar)   profAvatar.textContent   = avatarChar;

    // Greeting in home tab — ora è inline nella logo compact
    const greetingName = document.getElementById('app-greeting-name');
    const greeting = document.getElementById('app-greeting');
    if (greetingName) greetingName.textContent = username;
    if (greeting) greeting.style.display = 'block';

    // Wire spb-signout-btn (used by profile tab sign-out via proxy click)
    const signoutBtn = document.getElementById('spb-signout-btn');
    signoutBtn?.addEventListener('click', () => {
        logout();
        showScreen('login-screen');
    }, { once: true });

    // Wire spb-friends-btn proxy → openFriendsPanel (sheet con overlay)
    // main.js gestisce prof-friends-btn → spb-friends-btn.click() → qui
    const friendsBtn = document.getElementById('spb-friends-btn');
    friendsBtn?.addEventListener('click', openFriendsPanel, { once: true });

    // Sorveglia l'overlay quando main.js chiude il panel senza passare per openFriendsPanel
    // (es. secondo clic su prof-friends-btn = toggle close)
    document.getElementById('prof-friends-btn')?.addEventListener('click', () => {
        const fp      = document.getElementById('friends-panel');
        const overlay = document.getElementById('friends-panel-overlay');
        if (!fp || !overlay) return;
        // main.js ha già aggiornato display — sincronizzo l'overlay
        if (fp.style.display === 'none') {
            overlay.style.display = 'none';
        }
    });

    // Badge lingua/audio: aggiornati dopo ogni clic sui bottoni già wirat da main.js
    document.getElementById('prof-lang-btn')?.addEventListener('click', () => {
        // main.js fa già lang-toggle-btn.click(); qui aggiorniamo solo il badge
        setTimeout(_updateLangBadge, 50); // piccolo delay per aspettare il cambio lingua
    });
    document.getElementById('prof-audio-btn')?.addEventListener('click', () => {
        // main.js fa già audio-toggle-btn.click(); qui aggiorniamo solo il badge
        setTimeout(_updateAudioBadge, 50);
    });

    // Initial badge state
    _updateLangBadge();
    _updateAudioBadge();
    updateRequestBadge();
}

/** Aggiorna il badge bandiera lingua nel profilo */
function _updateLangBadge() {
    const badge = document.getElementById('prof-lang-badge');
    if (!badge) return;
    const lang = localStorage.getItem('cerchio_lang') || 'it';
    badge.textContent = lang === 'en' ? '🇬🇧' : '🇮🇹';
}

/** Aggiorna il badge ON/OFF audio nel profilo */
function _updateAudioBadge() {
    const badge = document.getElementById('prof-audio-badge');
    if (!badge) return;
    const isMuted = window.soundManager?.isMuted ?? false;
    badge.textContent = isMuted ? 'OFF' : 'ON';
}

/**
 * Aggiorna il badge rosso su:
 * - #prof-friends-badge (icona Amici nella lista profilo)
 * - #btb-profile (tab nella bottom bar)
 * Legge il DOM: conta richieste in fp-requests-list e inviti in profile-invites-section.
 */
export function updateRequestBadge() {
    const requestsList   = document.getElementById('fp-requests-list');
    const invitesSection = document.getElementById('profile-invites-section');

    // Conta elementi significativi (esclude loader e "nessuna richiesta")
    const hasRequests = requestsList
        ? requestsList.querySelectorAll('.fp-row, .fp-result-row').length > 0
        : false;
    const hasInvites = invitesSection
        ? invitesSection.style.display !== 'none' && invitesSection.innerHTML.trim() !== ''
        : false;

    const hasBadge = hasRequests || hasInvites;

    // Badge sulla row Amici nel profilo
    const friendsBadge = document.getElementById('prof-friends-badge');
    if (friendsBadge) friendsBadge.style.display = hasBadge ? 'block' : 'none';

    // Badge sul tab profile nella bottom tab bar
    const btbProfile = document.getElementById('btb-profile');
    if (btbProfile) {
        // Rimuovi badge esistente per evitare duplicati
        btbProfile.querySelector('.btb-badge')?.remove();
        if (hasBadge) {
            const dot = document.createElement('span');
            dot.className = 'btb-badge';
            dot.setAttribute('aria-label', 'Notifiche in arrivo');
            btbProfile.appendChild(dot);
        }
    }
}

function openFriendsPanel() {
    const panel   = document.getElementById('friends-panel');
    const overlay = document.getElementById('friends-panel-overlay');
    if (!panel) return;

    // Mostra overlay + sheet
    if (overlay) {
        overlay.style.display = 'block';
        // Tap sull'overlay chiude lo sheet
        overlay.addEventListener('click', _closeFriendsPanel, { once: true });
    }
    panel.style.display = 'flex';
    refreshFriendsPanel();

    function _closeFriendsPanel() {
        const _panel   = document.getElementById('friends-panel');
        const _overlay = document.getElementById('friends-panel-overlay');
        if (_panel)   _panel.style.display   = 'none';
        if (_overlay) _overlay.style.display = 'none';
        // re-wire proxy
        document.getElementById('spb-friends-btn')?.addEventListener('click', openFriendsPanel, { once: true });
    }

    // Rimuovi listener precedenti da fp-close-btn (evita duplicati su riaperture)
    const closeBtn = document.getElementById('fp-close-btn');
    if (closeBtn) {
        const newCloseBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode?.replaceChild(newCloseBtn, closeBtn);
        newCloseBtn.addEventListener('click', _closeFriendsPanel, { once: true });
    }

    // Live user search
    const fpInput  = document.getElementById('fp-username-input');
    const fpStatus = document.getElementById('fp-add-status');
    const fpResults = document.getElementById('fp-search-results');

    let _searchTimer = null;
    fpInput?.addEventListener('input', () => {
        clearTimeout(_searchTimer);
        const q = fpInput.value.trim();
        if (!fpResults) return;
        if (q.length < 2) { fpResults.innerHTML = ''; return; }
        _searchTimer = setTimeout(async () => {
            fpResults.innerHTML = '<div class="fp-loading">⏳</div>';
            const users = await searchUsers(q);
            if (!users.length) {
                fpResults.innerHTML = '<div class="fp-empty">Nessun utente trovato</div>';
                return;
            }
            fpResults.innerHTML = users.map(u => `
                <div class="fp-result-row" data-id="${u.id}" data-username="${escHtml(u.username)}">
                    <span class="fp-name">${escHtml(u.username)}</span>
                    <button class="fp-add-btn">${ic('user-plus', 15)} Aggiungi</button>
                </div>`).join('');
            fpResults.querySelectorAll('.fp-result-row').forEach(row => {
                row.querySelector('.fp-add-btn')?.addEventListener('click', async () => {
                    const uname = row.dataset.username;
                    try {
                        await sendFriendRequest(uname);
                        row.innerHTML = `<span class="fp-name">${escHtml(uname)}</span><span style="color:rgba(255,255,255,0.4);font-size:.8rem">✅ Richiesta inviata</span>`;
                    } catch (e) {
                        if (fpStatus) { fpStatus.textContent = `❌ ${e.message}`; setTimeout(() => fpStatus.textContent = '', 3000); }
                    }
                });
            });
        }, 350);
    });
}

async function refreshFriendsPanel() {
    const friendsList  = document.getElementById('fp-friends-list');
    const requestsList = document.getElementById('fp-requests-list');
    if (!friendsList || !requestsList) return;

    friendsList.innerHTML  = '<div class="fp-loading">⏳</div>';
    requestsList.innerHTML = '<div class="fp-loading">⏳</div>';

    const [friends, requests] = await Promise.all([getFriends(), getPendingRequests()]);
    const friendsArr  = Array.isArray(friends)  ? friends  : [];
    const requestsArr = Array.isArray(requests) ? requests : [];

    requestsList.innerHTML = requestsArr.length === 0
        ? '<div class="fp-empty">Nessuna richiesta</div>'
        : requestsArr.map(u => `
            <div class="fp-row">
                <span class="fp-name">${escHtml(u.username)}</span>
                <button class="fp-accept-btn" data-id="${u.id}">${ic("check",16)} Accetta</button>
            </div>`).join('');

    requestsList.querySelectorAll('.fp-accept-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await acceptFriendRequest(btn.dataset.id);
            await refreshFriendsPanel();
        });
    });

    // Aggiorna badge dopo il caricamento
    updateRequestBadge();

    friendsList.innerHTML = friendsArr.length === 0
        ? '<div class="fp-empty">Nessun amico ancora</div>'
        : friendsArr.map(u => `
            <div class="fp-row">
                <span class="fp-name">${escHtml(u.username)}</span>
                <button class="fp-challenge-btn" data-id="${u.id}">${ic("swords",16)} Sfida</button>
            </div>`).join('');

    friendsList.querySelectorAll('.fp-challenge-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const username = btn.closest('.fp-row')?.querySelector('.fp-name')?.textContent || '?';
            document.getElementById('friends-panel').style.display = 'none';
            showChallengeLobby(username);
            sendChallenge(btn.dataset.id);
        });
    });
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
