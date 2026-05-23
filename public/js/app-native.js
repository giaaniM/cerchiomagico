import { isNative } from './native.js';
import { initAuth, signInWithGoogle, signOut, currentUser, currentProfile, createProfile, checkUsernameAvailable } from './auth.js';
import { showScreen } from './utils.js';
import { formatTime } from './solo.js';
import { App as CapApp } from './capacitor-app-bridge.js';

let _onReady = () => {};
export function onNativeReady(fn) { _onReady = fn; }

export async function bootNative() {
    if (!isNative) return;

    // Handle deep link OAuth callback
    CapApp.addListener('appUrlOpen', ({ url }) => {
        if (url?.includes('magicspin://auth/callback')) {
            handleAuthCallback(url);
        }
    });

    showScreen('login-screen');

    // Wire buttons FIRST — before any async, so they always work even if auth fails
    document.getElementById('google-signin-btn')?.addEventListener('click', async () => {
        await signInWithGoogle();
    });
    document.getElementById('guest-signin-btn')?.addEventListener('click', () => {
        showScreen('setup-screen');
        _onReady();
    });

    let user = null, profile = null;
    try {
        ({ user, profile } = await initAuth());
    } catch (e) {
        console.warn('initAuth failed, staying on login screen', e);
        return;
    }

    if (user && profile) {
        showProfileBar(profile);
        showScreen('setup-screen');
        _onReady();
    } else if (user && !profile) {
        showScreen('profile-setup-screen');
        initProfileSetup(user);
    }
    // else: stay on login screen (buttons already wired above)
}

async function handleAuthCallback(url) {
    // Supabase picks up the session from the URL automatically
    // Force a re-check after a short delay
    setTimeout(async () => {
        const { user, profile } = await initAuth();
        if (user && profile) {
            showProfileBar(profile);
            showScreen('setup-screen');
            _onReady();
        } else if (user && !profile) {
            showScreen('profile-setup-screen');
            initProfileSetup(user);
        }
    }, 500);
}

function showProfileBar(profile) {
    const bar = document.getElementById('setup-profile-bar');
    if (!bar || !profile) return;

    const nameEl = document.getElementById('spb-name');
    const avatarEl = document.getElementById('spb-avatar');
    const recordEl = document.getElementById('spb-record');

    if (nameEl) nameEl.textContent = profile.display_name || profile.username || 'Ospite';

    if (avatarEl) {
        if (profile.avatar_url) {
            avatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="avatar" class="spb-avatar-img">`;
        } else {
            const initials = (profile.display_name || profile.username || '?')[0].toUpperCase();
            avatarEl.textContent = initials;
        }
    }

    if (recordEl) {
        if (profile.solo_best_time) {
            recordEl.textContent = `⏱ ${formatTime(profile.solo_best_time)}`;
        } else {
            recordEl.textContent = '';
        }
    }

    bar.style.display = 'flex';

    document.getElementById('spb-signout-btn')?.addEventListener('click', async () => {
        await signOut();
        bar.style.display = 'none';
        showScreen('login-screen');
    }, { once: true });
}

function initProfileSetup(user) {
    const input = document.getElementById('ps-username-input');
    const confirmBtn = document.getElementById('ps-confirm-btn');
    const status = document.getElementById('ps-input-status');
    const avatar = document.getElementById('ps-avatar');

    // Show Google avatar if available
    const avatarUrl = user.user_metadata?.avatar_url;
    if (avatarUrl && avatar) {
        avatar.innerHTML = `<img src="${avatarUrl}" alt="avatar">`;
    }

    let checkTimer = null;
    let isAvailable = false;

    input?.addEventListener('input', () => {
        const val = input.value.trim();
        const valid = /^[a-zA-Z0-9_]{3,20}$/.test(val);
        confirmBtn.disabled = true;
        isAvailable = false;

        if (!valid) {
            input.className = 'ps-input' + (val.length > 0 ? ' invalid' : '');
            status.textContent = '';
            return;
        }

        status.textContent = '⏳';
        clearTimeout(checkTimer);
        checkTimer = setTimeout(async () => {
            const available = await checkUsernameAvailable(val);
            isAvailable = available;
            if (available) {
                input.className = 'ps-input valid';
                status.textContent = '✅';
                confirmBtn.disabled = false;
            } else {
                input.className = 'ps-input invalid';
                status.textContent = '❌';
                confirmBtn.disabled = true;
            }
        }, 500);
    });

    confirmBtn?.addEventListener('click', async () => {
        if (!isAvailable) return;
        confirmBtn.disabled = true;
        confirmBtn.textContent = '⏳';
        try {
            const profile = await createProfile({
                userId: user.id,
                username: input.value.trim(),
                displayName: user.user_metadata?.full_name || input.value.trim(),
                avatarUrl: user.user_metadata?.avatar_url || null,
            });
            showProfileBar(profile || { display_name: input.value.trim() });
            showScreen('setup-screen');
            _onReady();
        } catch (e) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Conferma';
            status.textContent = '⚠️';
        }
    });
}
