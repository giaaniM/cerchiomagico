// Auth module — login, register, session management

const AUTH_KEY = 'ms_auth';

export function getSession() {
    try { return JSON.parse(localStorage.getItem(AUTH_KEY)); } catch { return null; }
}

export function getToken() {
    return getSession()?.token || null;
}

export function getUser() {
    return getSession()?.user || null;
}

export function saveSession(token, user) {
    localStorage.setItem(AUTH_KEY, JSON.stringify({ token, user }));
}

export function clearSession() {
    localStorage.removeItem(AUTH_KEY);
}

export function isLoggedIn() {
    return !!getToken();
}

async function apiAuth(endpoint, body) {
    const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Errore');
    return data;
}

export async function register(username, password) {
    const data = await apiAuth('/api/auth/register', { username, password });
    saveSession(data.token, data.user);
    return data.user;
}

export async function login(username, password) {
    const data = await apiAuth('/api/auth/login', { username, password });
    saveSession(data.token, data.user);
    return data.user;
}

export function logout() {
    clearSession();
    location.reload();
}

export async function verifySession() {
    const token = getToken();
    if (!token) return null;
    try {
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) { clearSession(); return null; }
        const { user } = await res.json();
        return user;
    } catch { return null; }
}
