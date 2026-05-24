import { login, register, logout, isLoggedIn, getUser, getToken, verifySession } from './auth.js';
import { initChallengeSocket, sendChallenge } from './challenge.js';

// ─── Auth screen ──────────────────────────────────────────────────────────────
const authScreen  = document.getElementById('auth-screen');
const authForm    = document.getElementById('auth-form');
const usernameEl  = document.getElementById('auth-username');
const passwordEl  = document.getElementById('auth-password');
const submitBtn   = document.getElementById('auth-submit');
const errorEl     = document.getElementById('auth-error');
const skipBtn     = document.getElementById('auth-skip');
const tabs        = document.querySelectorAll('.auth-tab');

let currentTab = 'login';

function showAuthError(msg) { errorEl.textContent = msg; errorEl.style.display = 'block'; }
function hideAuthError()    { errorEl.style.display = 'none'; }

const emailField = document.getElementById('auth-email-field');

tabs.forEach(t => t.addEventListener('click', () => {
    currentTab = t.dataset.tab;
    tabs.forEach(x => x.classList.toggle('active', x.dataset.tab === currentTab));
    submitBtn.textContent = currentTab === 'login' ? 'Accedi' : 'Registrati';
    if (emailField) emailField.style.display = currentTab === 'register' ? 'flex' : 'none';
    hideAuthError();
}));

authForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideAuthError();
    const username = usernameEl.value.trim();
    const password = passwordEl.value;
    if (!username || !password) return showAuthError('Compila tutti i campi');
    submitBtn.disabled = true;
    submitBtn.textContent = '...';
    try {
        if (currentTab === 'login') await login(username, password);
        else {
            const email = document.getElementById('auth-email')?.value?.trim() || '';
            await register(username, password, email);
        }
        authScreen.style.display = 'none';
        renderBadge();
        connectChallengeSocket();
    } catch (err) {
        showAuthError(err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = currentTab === 'login' ? 'Accedi' : 'Registrati';
    }
});

skipBtn.addEventListener('click', () => { authScreen.style.display = 'none'; });

// ─── User badge ───────────────────────────────────────────────────────────────
function renderBadge() {
    const user = getUser();
    if (!user) return;
    let badge = document.getElementById('user-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'user-badge';
        badge.className = 'user-badge';
        badge.addEventListener('click', openUserPanel);
        document.body.appendChild(badge);
    }
    badge.innerHTML = `
        <span class="user-badge-avatar" style="background:${user.avatar_color}">${user.username[0].toUpperCase()}</span>
        <span class="user-badge-name">${user.username}</span>
    `;
}

// ─── User panel ───────────────────────────────────────────────────────────────
const panel        = document.getElementById('user-panel');
const panelOverlay = document.getElementById('user-panel-overlay');
const panelAvatar  = document.getElementById('panel-avatar');
const panelUsername= document.getElementById('panel-username');
const upTabs       = document.querySelectorAll('.up-tab');
const upSections   = document.querySelectorAll('.up-section');

window.closUserPanel = function() {
    panel.classList.remove('open');
    panelOverlay.style.display = 'none';
};

function openUserPanel() {
    const user = getUser();
    if (!user) return;
    panelAvatar.textContent  = user.username[0].toUpperCase();
    panelAvatar.style.background = user.avatar_color;
    panelUsername.textContent = user.username;
    panel.classList.add('open');
    panelOverlay.style.display = 'block';
    loadFriends();
    loadRequests();
}

upTabs.forEach(t => t.addEventListener('click', () => {
    const sec = t.dataset.section;
    upTabs.forEach(x => x.classList.toggle('active', x === t));
    upSections.forEach(s => s.classList.toggle('active', s.id === `section-${sec}`));
    if (sec === 'leaderboard') loadLeaderboard();
}));

// ─── Friends ──────────────────────────────────────────────────────────────────
const addFriendInput = document.getElementById('add-friend-input');
const addFriendBtn   = document.getElementById('add-friend-btn');
const addFriendMsg   = document.getElementById('add-friend-msg');
const friendsList    = document.getElementById('friends-list');
const requestsList   = document.getElementById('requests-list');
const reqBadge       = document.getElementById('req-badge');

addFriendBtn.addEventListener('click', sendFriendRequest);
addFriendInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendFriendRequest(); });

async function sendFriendRequest() {
    const username = addFriendInput.value.trim();
    if (!username) return;
    addFriendMsg.style.display = 'none';
    try {
        await authFetch('/api/friends/request', { method: 'POST', body: JSON.stringify({ username }) });
        addFriendInput.value = '';
        showFriendMsg('Richiesta inviata!', 'ok');
    } catch (err) {
        showFriendMsg(err.message, 'err');
    }
}

function showFriendMsg(msg, type) {
    addFriendMsg.textContent = msg;
    addFriendMsg.style.display = 'block';
    addFriendMsg.style.color = type === 'ok' ? '#4ade80' : '#f87171';
    setTimeout(() => { addFriendMsg.style.display = 'none'; }, 3000);
}

async function loadFriends() {
    friendsList.innerHTML = '<div class="friends-loading">Caricamento...</div>';
    try {
        const { friends } = await authFetch('/api/friends');
        const accepted = friends.filter(f => f.status === 'accepted');
        if (!accepted.length) {
            friendsList.innerHTML = '<div class="friends-empty">Nessun amico ancora. Cerca un username!</div>';
            return;
        }
        friendsList.innerHTML = accepted.map(f => `
            <div class="friend-row">
                <div class="friend-avatar" style="background:#6c63ff">${f.users.username[0].toUpperCase()}</div>
                <div class="friend-info">
                    <div class="friend-name">${f.users.username}</div>
                </div>
                <button class="challenge-btn" data-uid="${f.friend_id}" data-name="${f.users.username}">Sfida</button>
            </div>
        `).join('');
        friendsList.querySelectorAll('.challenge-btn').forEach(btn => {
            btn.addEventListener('click', () => startChallenge(btn.dataset.uid, btn.dataset.name));
        });
    } catch {
        friendsList.innerHTML = '<div class="friends-empty">Errore caricamento amici</div>';
    }
}

async function loadRequests() {
    try {
        const { requests } = await authFetch('/api/friends/requests');
        reqBadge.style.display = requests.length ? 'inline-block' : 'none';
        reqBadge.textContent = requests.length;
        if (!requests.length) {
            requestsList.innerHTML = '<div class="friends-empty">Nessuna richiesta in arrivo</div>';
            return;
        }
        requestsList.innerHTML = requests.map(r => `
            <div class="friend-row">
                <div class="friend-avatar" style="background:#6c63ff">${r.users.username[0].toUpperCase()}</div>
                <div class="friend-info">
                    <div class="friend-name">${r.users.username}</div>
                    <div class="friend-sub">vuole essere tuo amico</div>
                </div>
                <button class="accept-btn" data-uid="${r.user_id}">Accetta</button>
            </div>
        `).join('');
        requestsList.querySelectorAll('.accept-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                try {
                    await authFetch('/api/friends/accept', { method: 'POST', body: JSON.stringify({ friendId: btn.dataset.uid }) });
                    loadRequests();
                    loadFriends();
                } catch {}
            });
        });
    } catch {
        requestsList.innerHTML = '<div class="friends-empty">Errore caricamento richieste</div>';
    }
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const leaderboardList = document.getElementById('leaderboard-list');

async function loadLeaderboard() {
    leaderboardList.innerHTML = '<div class="friends-loading">Caricamento...</div>';
    try {
        const { leaderboard } = await fetch('/api/leaderboard/online').then(r => r.json());
        if (!leaderboard.length) {
            leaderboardList.innerHTML = '<div class="friends-empty">Nessuna partita ancora</div>';
            return;
        }
        leaderboardList.innerHTML = leaderboard.map((row, i) => `
            <div class="lb-row">
                <div class="lb-rank">${i + 1}</div>
                <div class="lb-avatar" style="background:#6c63ff">${row.users.username[0].toUpperCase()}</div>
                <div class="lb-info">
                    <div class="lb-name">${row.users.username}</div>
                    <div class="lb-sub">${row.wins}V · ${row.losses}S</div>
                </div>
                <div class="lb-score">${row.total_score.toLocaleString()}</div>
            </div>
        `).join('');
    } catch {
        leaderboardList.innerHTML = '<div class="friends-empty">Errore caricamento classifica</div>';
    }
}

// ─── Challenge ────────────────────────────────────────────────────────────────
function startChallenge(opponentId, opponentName) {
    closUserPanel();
    connectChallengeSocket();
    sendChallenge(opponentId);
    showToastLocal(`Sfida inviata a ${opponentName}!`);
}

function showToastLocal(msg) {
    const t = document.createElement('div');
    t.className = 'ch-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ─── Logout ───────────────────────────────────────────────────────────────────
document.getElementById('logout-btn').addEventListener('click', () => {
    if (confirm('Vuoi uscire dall\'account?')) logout();
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
const _API_BASE = window.Capacitor?.isNativePlatform?.() ? 'https://magicspingame.com' : '';

async function authFetch(url, opts = {}) {
    const res = await fetch(`${_API_BASE}${url}`, {
        ...opts,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getToken()}`,
            ...(opts.headers || {})
        }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore');
    return data;
}

// ─── Challenge socket ─────────────────────────────────────────────────────────
let challengeSocket = null;

function connectChallengeSocket() {
    if (challengeSocket) return;
    challengeSocket = io();
    initChallengeSocket(challengeSocket);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function isNativeApp() {
    // Capacitor sets window.Capacitor when running in native app
    return !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'android' || window.Capacitor?.platform === 'ios');
}

async function init() {
    if (isLoggedIn()) {
        const user = await verifySession();
        if (user) {
            renderBadge();
            connectChallengeSocket();
            return;
        }
    }
    // Auth overlay solo su app nativa (Android/iOS)
    if (isNativeApp()) {
        setTimeout(() => { authScreen.style.display = 'flex'; }, 400);
    }
}

init();
