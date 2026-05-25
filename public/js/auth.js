import { API_BASE } from './native.js';

const TOKEN_KEY = 'magicspin_token';
const USER_KEY  = 'magicspin_user';

export let currentUser = null;   // { id, username }
export let currentProfile = null; // alias for compat — same object

function authFetch(url, options = {}, timeoutMs = 60000) {
    const token = localStorage.getItem(TOKEN_KEY);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(`${API_BASE}${url}`, {
        ...options,
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    }).finally(() => clearTimeout(timer));
}

export async function register(username, password, email = '') {
    let res;
    try {
        res = await authFetch('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, password, email }),
        });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('Server lento, riprova');
        throw new Error('Nessuna connessione al server');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore registrazione');
    _saveSession(data.token, data.user);
    return data.user;
}

export async function login(username, password) {
    let res;
    try {
        res = await authFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        });
    } catch (e) {
        if (e.name === 'AbortError') throw new Error('Server lento, riprova');
        throw new Error('Nessuna connessione al server');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Credenziali errate');
    _saveSession(data.token, data.user);
    return data.user;
}

export async function verifySession() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    try {
        const res = await authFetch('/api/auth/me', {}, 10000);
        if (!res.ok) { _clearSession(); return null; }
        const body = await res.json();
        // restyle server returns { user: {...} }, mobile server returns user directly
        const user = body?.user ?? body;
        _setUser(user);
        return user;
    } catch {
        return null;
    }
}

export function logout() {
    _clearSession();
}

export function getSavedUser() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)) || null; } catch { return null; }
}

function _saveSession(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    _setUser(user);
}

function _setUser(user) {
    currentUser = user;
    currentProfile = user; // compat alias used by challenge.js
}

function _clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    currentUser = null;
    currentProfile = null;
}

// Friends (via REST, not Supabase client)
export async function getFriends() {
    try {
        const res = await authFetch('/api/friends');
        return res.ok ? await res.json() : [];
    } catch { return []; }
}

export async function sendFriendRequest(friendUsername) {
    const res = await authFetch('/api/friends/request', {
        method: 'POST',
        body: JSON.stringify({ friendUsername }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore');
}

export async function acceptFriendRequest(requesterId) {
    await authFetch('/api/friends/accept', {
        method: 'POST',
        body: JSON.stringify({ requesterId }),
    });
}

export async function searchUsers(query) {
    try {
        const res = await authFetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        return res.ok ? await res.json() : [];
    } catch { return []; }
}

export async function getPendingRequests() {
    try {
        const res = await authFetch('/api/friends/requests');
        return res.ok ? await res.json() : [];
    } catch { return []; }
}
