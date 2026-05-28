/**
 * app-main.js — SPA entry point for app.html
 *
 * Boot sequence:
 *  1. Show nothing (screens hidden) until session check completes
 *  2. verifySession() — if null → AuthGate, else → Home
 *  3. Tab bar navigates between Home / Play / Leaderboard / Profile
 *
 * Pattern: showScreen(name) toggles .hidden on screen divs and
 * .active on tab buttons. Each screen is lazily inited on first show.
 */

import { verifySession, currentUser, getSavedUser } from './auth.js';
import {
  initAuthScreen,
  initHomeScreen,
  initPlayScreen,
  initLeaderboardScreen,
  initProfileScreen,
  initGameScreen,
} from './app-screens.js';

// ─── Screen registry ───────────────────────────────────────────
// 'game', 'searching', 'versus' are not tab destinations — entered programmatically
const SCREENS = ['auth', 'home', 'play', 'leaderboard', 'profile', 'game', 'searching', 'versus'];
const TAB_TO_SCREEN = {
  home:        'home',
  play:        'play',
  leaderboard: 'leaderboard',
  profile:     'profile',
};

// Track which screens have already been initialized
const inited = new Set();

// ─── DOM refs ─────────────────────────────────────────────────
const tabbar  = document.getElementById('tabbar');
const tabBtns = tabbar.querySelectorAll('.tab-btn');

// ─────────────────────────────────────────────────────────────
// showScreen — show exactly one screen, hide the rest.
// Also updates tab bar active state.
// ─────────────────────────────────────────────────────────────
function showScreen(name) {
  SCREENS.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.toggle('hidden', s !== name);
  });

  // Tab bar: hide on auth, game, searching, versus screens
  const NO_TABBAR = new Set(['auth', 'game', 'searching', 'versus']);
  tabbar.style.display = NO_TABBAR.has(name) ? 'none' : '';

  // Update tab active state
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', TAB_TO_SCREEN[btn.dataset.tab] === name);
  });
}

// Expose router so screens can trigger navigation
window._appRouter = showScreen;

// ─────────────────────────────────────────────────────────────
// Boot — check session first, then decide which screen to open
// ─────────────────────────────────────────────────────────────
async function boot() {
  // Start with all screens hidden (CSS default)
  SCREENS.forEach(s => {
    const el = document.getElementById(`screen-${s}`);
    if (el) el.classList.add('hidden');
  });

  // Init auth screen before the session check so the form is ready
  if (!inited.has('auth')) {
    inited.add('auth');
    initAuthScreen(user => {
      // Auth success → go to Home
      enterApp(user);
    });
  }

  // Optimistic: if we have a cached user show home immediately,
  // then confirm with a background session check.
  const cached = getSavedUser();
  if (cached) {
    enterApp(cached); // instant render
    verifySession().then(user => {
      if (!user) {
        // Token expired → kick back to auth
        showScreen('auth');
        return;
      }
      // Refresh home/profile with fresh user data if still on those screens
      const currentScreen = getCurrentScreen();
      if (currentScreen === 'home')    refreshHome(user);
      if (currentScreen === 'profile') refreshProfile(user);
    });
  } else {
    // No cached user → always verify
    const user = await verifySession();
    if (user) {
      enterApp(user);
    } else {
      showScreen('auth');
    }
  }
}

function getCurrentScreen() {
  for (const s of SCREENS) {
    const el = document.getElementById(`screen-${s}`);
    if (el && !el.classList.contains('hidden')) return s;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// enterApp — called once we have a confirmed user
// ─────────────────────────────────────────────────────────────
function enterApp(user) {
  // Init each screen once
  ensureScreenInited('home',        () => initHomeScreen(user));
  ensureScreenInited('play',        () => initPlayScreen());
  ensureScreenInited('leaderboard', () => initLeaderboardScreen(user));
  ensureScreenInited('profile',     () => initProfileScreen(user));
  ensureScreenInited('game',        () => initGameScreen(user));

  // Open home tab
  showScreen('home');
}

// ─────────────────────────────────────────────────────────────
// enterGame — navigate into the game screen (called from play modes)
// opts: { mode: 'solo'|'1v1'|'friends', opponentName, opponentColor }
// ─────────────────────────────────────────────────────────────
window._enterGame = function(opts = {}) {
  showScreen('game');
  // Re-configure the game screen for the chosen mode
  if (window._gameScreenConfigure) window._gameScreenConfigure(opts);
};

// Lazy init helper
function ensureScreenInited(name, fn) {
  if (!inited.has(name)) {
    inited.add(name);
    fn();
  }
}

// Re-render helpers (called when session confirms user after optimistic render)
function refreshHome(user) {
  // Re-init home to update avatar/name with fresh data
  inited.delete('home');
  ensureScreenInited('home', () => initHomeScreen(user));
}
function refreshProfile(user) {
  inited.delete('profile');
  ensureScreenInited('profile', () => initProfileScreen(user));
}

// ─────────────────────────────────────────────────────────────
// Tab bar navigation
// ─────────────────────────────────────────────────────────────
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const name = TAB_TO_SCREEN[btn.dataset.tab];
    if (!name) return;

    const user = currentUser || getSavedUser();

    // Lazy init on first visit
    ensureScreenInited(name, () => {
      if (name === 'home')        initHomeScreen(user);
      if (name === 'play')        initPlayScreen();
      if (name === 'leaderboard') initLeaderboardScreen(user);
      if (name === 'profile')     initProfileScreen(user);
    });

    showScreen(name);
  });
});

// ─────────────────────────────────────────────────────────────
// Handle Android back button / browser back while in sub-screens
// ─────────────────────────────────────────────────────────────
window.addEventListener('popstate', () => {
  // For now just go home; extend when sub-nav stacks are added
  const user = currentUser || getSavedUser();
  if (user) showScreen('home');
});

// ─── Go! ──────────────────────────────────────────────────────
boot();
