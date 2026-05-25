import { isNative } from './native.js';
import { login, register, verifySession, logout, getSavedUser, getFriends, sendFriendRequest, getPendingRequests, acceptFriendRequest, currentProfile } from './auth.js';
import { showScreen } from './utils.js';
import { formatTime } from './solo.js';
import { initChallengeSocket, sendChallenge } from './challenge.js';
import { ic } from './icons.js';

let _onReady = () => {};
export function onNativeReady(fn) { _onReady = fn; }

export async function bootNative() {
    if (!isNative) return;

    showScreen('login-screen');
    _wireLoginScreen();

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

    // Wire spb-signout-btn (used by profile tab sign-out via proxy click)
    const signoutBtn = document.getElementById('spb-signout-btn');
    signoutBtn?.addEventListener('click', () => {
        logout();
        showScreen('login-screen');
    }, { once: true });

    // Wire friends panel open (triggered by prof-friends-btn via proxy)
    const friendsBtn = document.getElementById('spb-friends-btn');
    friendsBtn?.addEventListener('click', openFriendsPanel, { once: true });
}

function openFriendsPanel() {
    const panel = document.getElementById('friends-panel');
    if (!panel) return;
    panel.style.display = 'flex';
    refreshFriendsPanel();

    document.getElementById('fp-close-btn')?.addEventListener('click', () => {
        panel.style.display = 'none';
        // re-wire friends button for next open
        document.getElementById('spb-friends-btn')?.addEventListener('click', openFriendsPanel, { once: true });
    }, { once: true });

    document.getElementById('fp-add-btn')?.addEventListener('click', async () => {
        const input  = document.getElementById('fp-username-input');
        const status = document.getElementById('fp-add-status');
        const username = input?.value?.trim();
        if (!username) return;
        try {
            await sendFriendRequest(username);
            if (status) status.textContent = '✅ Richiesta inviata!';
            if (input) input.value = '';
        } catch (e) {
            if (status) status.textContent = `❌ ${e.message}`;
        }
        setTimeout(() => { if (status) status.textContent = ''; }, 3000);
    });
}

async function refreshFriendsPanel() {
    const friendsList  = document.getElementById('fp-friends-list');
    const requestsList = document.getElementById('fp-requests-list');
    if (!friendsList || !requestsList) return;

    friendsList.innerHTML  = '<div class="fp-loading">⏳</div>';
    requestsList.innerHTML = '<div class="fp-loading">⏳</div>';

    const [friends, requests] = await Promise.all([getFriends(), getPendingRequests()]);

    requestsList.innerHTML = requests.length === 0
        ? '<div class="fp-empty">Nessuna richiesta</div>'
        : requests.map(u => `
            <div class="fp-row">
                <span class="fp-name">${escHtml(u.username)}</span>
                <button class="fp-accept-btn" data-id="${u.id}">${ic("check",16)} Accetta</button>
            </div>`).join('');

    requestsList.querySelectorAll('.fp-accept-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            await acceptFriendRequest(btn.dataset.id);
            refreshFriendsPanel();
        });
    });

    friendsList.innerHTML = friends.length === 0
        ? '<div class="fp-empty">Nessun amico ancora</div>'
        : friends.map(u => `
            <div class="fp-row">
                <span class="fp-name">${escHtml(u.username)}</span>
                <button class="fp-challenge-btn" data-id="${u.id}">${ic("swords",16)} Sfida</button>
            </div>`).join('');

    friendsList.querySelectorAll('.fp-challenge-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sendChallenge(btn.dataset.id);
            document.getElementById('friends-panel').style.display = 'none';
        });
    });
}

function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
