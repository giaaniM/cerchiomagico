/**
 * app-screens.js — Screen rendering for the MagicSpin mobile SPA.
 * Each exported init* function wires up a screen's data, events and
 * dynamic HTML. Called once after auth confirms the user is logged in.
 */

import { currentUser, logout, getSavedUser } from './auth.js';
import { fetchLeaderboard } from './leaderboard.js';
import { startSoloGame, soloGame } from './solo-game.js';

// ─────────────────────────────────────────────────────────────
// Shared helpers
// ─────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#a855f7', '#00f2ff', '#ff00d4', '#fbbf24',
  '#10b981', '#3b82f6', '#ec4899', '#f97316',
];

function colorForName(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/**
 * Build an avatar div (circle with initial or emoji).
 * Returns an HTMLElement — does NOT insert it.
 */
export function buildAvatar({ name = '?', size = 40, color, emoji, ring } = {}) {
  const el = document.createElement('div');
  const bg = color || colorForName(name);
  el.className = 'avatar pressable';
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    `font-size:${Math.round(size * 0.42)}px`,
    `background:linear-gradient(135deg,${bg},${bg}99)`,
    ring ? `box-shadow:0 0 0 2.5px var(--bg),0 0 0 4px ${ring}` : '',
  ].join(';');
  el.textContent = emoji || (name ? name[0].toUpperCase() : '?');
  return el;
}

/** Escape HTML special chars */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─────────────────────────────────────────────────────────────
// Auth Gate
// ─────────────────────────────────────────────────────────────

/**
 * Wire up the Auth Gate screen.
 * @param {Function} onAuth - called with user object after successful login/register
 */
export function initAuthScreen(onAuth) {
  const loginForm   = document.getElementById('auth-form-login');
  const regForm     = document.getElementById('auth-form-register');
  const tabs        = document.querySelectorAll('.auth-tab');
  const submitBtn   = document.getElementById('auth-submit');
  const errorEl     = document.getElementById('auth-error');

  let mode = 'login'; // 'login' | 'register'

  function setMode(m) {
    mode = m;
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === m));
    loginForm.classList.toggle('hidden', m !== 'login');
    regForm.classList.toggle('hidden', m !== 'register');
    submitBtn.textContent = m === 'login' ? 'Accedi' : 'Crea account';
    errorEl.textContent = '';
  }

  tabs.forEach(t => t.addEventListener('click', () => setMode(t.dataset.tab)));

  async function doSubmit() {
    errorEl.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = '…';

    try {
      let user;
      if (mode === 'login') {
        const u = document.getElementById('login-username').value.trim();
        const p = document.getElementById('login-password').value;
        if (!u || !p) throw new Error('Inserisci username e password');
        const { login } = await import('./auth.js');
        user = await login(u, p);
      } else {
        const u = document.getElementById('reg-username').value.trim();
        const p = document.getElementById('reg-password').value;
        const e = document.getElementById('reg-email').value.trim();
        if (!u || !p) throw new Error('Inserisci username e password');
        if (p.length < 6) throw new Error('Password troppo corta (min 6)');
        const { register } = await import('./auth.js');
        user = await register(u, p, e);
      }
      onAuth(user);
    } catch (err) {
      errorEl.textContent = err.message || 'Errore, riprova';
      submitBtn.disabled = false;
      setMode(mode); // restore label
    }
  }

  submitBtn.addEventListener('click', doSubmit);

  // Submit on Enter in any input field
  document.querySelectorAll('#screen-auth input').forEach(inp => {
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
  });
}

// ─────────────────────────────────────────────────────────────
// Home screen
// ─────────────────────────────────────────────────────────────

const FAKE_FRIENDS = [
  { name: 'Sofia',   emoji: '🦊', color: '#ff00d4', online: true  },
  { name: 'Marco',   emoji: '🐺', color: '#00f2ff', online: true  },
  { name: 'Anna',    emoji: '🦉', color: '#fbbf24', online: true  },
  { name: 'Dante',   emoji: '🐢', color: '#10b981', online: false },
  { name: 'Eva',     emoji: '🦄', color: '#a855f7', online: false },
];

export function initHomeScreen(user) {
  // Top bar
  const nameEl   = document.getElementById('home-username');
  const avatarEl = document.getElementById('home-avatar');
  if (nameEl) nameEl.textContent = user?.username || 'Giocatore';
  if (avatarEl) {
    const color = colorForName(user?.username || '?');
    avatarEl.style.background = `linear-gradient(135deg,${color},${color}99)`;
    avatarEl.style.boxShadow  = `0 0 0 2.5px var(--bg),0 0 0 4px var(--gold)`;
    avatarEl.textContent = (user?.username || '?')[0].toUpperCase();
    avatarEl.style.fontSize = '15px';
  }

  // Hero CTA → go to Play tab
  document.getElementById('hero-play-btn')?.addEventListener('click', () => {
    window._appRouter?.('play');
  });

  // Home "Solitario" mode card → start solo game
  const homeCards = document.querySelectorAll('#screen-home .mode-card');
  homeCards.forEach(card => {
    const title = card.querySelector('.mode-card-title')?.textContent?.trim();
    if (title === 'Solitario') {
      card.addEventListener('click', () => startSoloGame(user, 'it'));
    }
  });

  // Friends
  const listEl = document.getElementById('friends-list');
  if (listEl) {
    listEl.innerHTML = '';
    FAKE_FRIENDS.forEach(f => {
      const item = document.createElement('div');
      item.className = 'friend-item pressable';

      const wrap = document.createElement('div');
      wrap.className = 'friend-avatar-wrap';
      const av = buildAvatar({ name: f.name, emoji: f.emoji, color: f.color, size: 50,
        ring: f.online ? '#10b981' : null });
      wrap.appendChild(av);
      if (f.online) {
        const dot = document.createElement('div');
        dot.className = 'friend-online-dot';
        wrap.appendChild(dot);
      }

      const label = document.createElement('div');
      label.className = 'friend-name';
      label.textContent = f.name;

      item.appendChild(wrap);
      item.appendChild(label);
      listEl.appendChild(item);
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Toast helper — shared across all screens
// ─────────────────────────────────────────────────────────────

let toastTimer = null;

export function showToast(msg, durationMs = 2600) {
  const el = document.getElementById('app-toast');
  if (!el) return;
  if (toastTimer) clearTimeout(toastTimer);
  el.textContent = msg;
  el.classList.remove('hidden');
  toastTimer = setTimeout(() => {
    el.classList.add('hidden');
    toastTimer = null;
  }, durationMs);
}

// ─────────────────────────────────────────────────────────────
// Play / Match Mode Select screen
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// Matchmaking state (shared between searching + versus screens)
// ─────────────────────────────────────────────────────────────
let _searchingTimer = null;
let _searchingElapsed = 0;

function startSearchingTimer() {
  _searchingElapsed = 0;
  clearInterval(_searchingTimer);
  const el = document.getElementById('searching-timer');
  _searchingTimer = setInterval(() => {
    _searchingElapsed++;
    const m = Math.floor(_searchingElapsed / 60);
    const s = _searchingElapsed % 60;
    if (el) el.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function stopSearchingTimer() {
  clearInterval(_searchingTimer);
  _searchingTimer = null;
}

/** Populate the searching screen avatar with the user's initial */
function setupSearchingScreen(user) {
  const avEl = document.getElementById('searching-avatar');
  if (avEl && user?.username) {
    avEl.textContent = user.username[0].toUpperCase();
  }
}

/** Populate the versus screen with user vs mock opponent, then run countdown */
function setupVersusScreen(user) {
  const meAv  = document.getElementById('versus-avatar-me');
  const meNm  = document.getElementById('versus-name-me');
  const oppAv = document.getElementById('versus-avatar-opp');
  const oppNm = document.getElementById('versus-name-opp');

  if (meAv  && user?.username) meAv.textContent  = user.username[0].toUpperCase();
  if (meNm  && user?.username) meNm.textContent  = user.username;
  // opp is set by _simulateMatchFound before calling this function
  if (!oppAv?.textContent || oppAv.textContent === '?') {
    if (oppAv) oppAv.textContent = 'A';
  }
  if (!oppNm?.textContent || oppNm.textContent === 'Avversario') {
    if (oppNm) oppNm.textContent = 'Avversario';
  }

  // Reset start button
  const startBtn = document.getElementById('versus-start-btn');
  if (startBtn) startBtn.classList.add('hidden');

  // Wire start button once (guard with a flag to avoid multi-listener)
  if (!startBtn?._wired) {
    startBtn?._wired !== undefined; // no-op to avoid eslint
    startBtn?.addEventListener('click', () => {
      window._enterGame({ mode: 'pvp' });
    });
    if (startBtn) startBtn._wired = true;
  }

  // Countdown: 3 → 2 → 1 → "Via!" + show start button
  let count = 3;

  function updateCountdown() {
    const freshEl = document.getElementById('versus-countdown');
    const labelEl = document.querySelector('.versus-countdown-label');
    if (!freshEl) return;

    if (count < 0) {
      freshEl.style.display = 'none';
      if (labelEl) labelEl.textContent = 'Via!';
      if (startBtn) startBtn.classList.remove('hidden');
      return;
    }

    freshEl.style.display = '';
    freshEl.textContent = String(count);
    // Restart CSS animation via reflow
    freshEl.style.animation = 'none';
    void freshEl.offsetHeight;
    freshEl.style.animation = 'countdown-pop 1s ease-in-out forwards';

    count--;
    window._versusCountdownTimer = setTimeout(updateCountdown, 1000);
  }

  // Cancel any running countdown before starting a fresh one
  clearTimeout(window._versusCountdownTimer);
  updateCountdown();
}

export function initPlayScreen() {
  // We need the user to set up the matchmaking screens
  const user = currentUser || (typeof getSavedUser === 'function' ? getSavedUser() : null);

  // Back button — go to Home tab
  document.getElementById('play-back-btn')?.addEventListener('click', () => {
    window._appRouter?.('home');
  });

  // Solo → start in-app solo game (uses solo-game.js logic)
  document.getElementById('play-go-solo')?.addEventListener('click', () => {
    startSoloGame(user, 'it');
  });

  // Random matchmaking → searching screen
  function goSearching(e) {
    if (e) e.stopPropagation();
    setupSearchingScreen(user);
    window._appRouter?.('searching');
    startSearchingTimer();
  }
  document.getElementById('play-find-btn')?.addEventListener('click', goSearching);
  document.getElementById('play-go-random')?.addEventListener('click', goSearching);

  // Cancel in searching → back to play
  document.getElementById('searching-cancel-btn')?.addEventListener('click', () => {
    stopSearchingTimer();
    window._appRouter?.('play');
  });

  // Back button in searching → back to play
  document.getElementById('searching-back-btn')?.addEventListener('click', () => {
    stopSearchingTimer();
    window._appRouter?.('play');
  });

  // Friends invite — coming soon
  document.getElementById('play-go-friends')?.addEventListener('click', () => {
    showToast('Sfida amici in arrivo — presto disponibile!');
  });

  // Lobby code — coming soon
  document.getElementById('play-go-lobby')?.addEventListener('click', () => {
    showToast('Inserisci codice — presto disponibile!');
  });

  // Demo: simulate a match found after 5s when on searching screen
  // In production, this fires on a socket event from the server.
  // For now we trigger it from a dev helper so the screen is usable.
  window._simulateMatchFound = function(opponentName = 'Avversario') {
    stopSearchingTimer();
    const oppAv = document.getElementById('versus-avatar-opp');
    const oppNm = document.getElementById('versus-name-opp');
    if (oppAv) oppAv.textContent = opponentName[0].toUpperCase();
    if (oppNm) oppNm.textContent = opponentName;
    setupVersusScreen(user);
    window._appRouter?.('versus');
  };
}

// ─────────────────────────────────────────────────────────────
// Leaderboard screen
// ─────────────────────────────────────────────────────────────

// Podium order: [2nd, 1st, 3rd] for left-center-right visual
const PODIUM_FAKE = [
  { rank: 2, name: 'Sofia',    emoji: '🦊', score: 24850, color: '#ff00d4', h: 80  },
  { rank: 1, name: 'Chiara_92',emoji: '👑', score: 31420, color: '#fbbf24', h: 110 },
  { rank: 3, name: 'Marco',    emoji: '🐺', score: 22100, color: '#00f2ff', h: 64  },
];

const FAKE_LIST = [
  { rank: 4,  name: 'Andrea',   emoji: '🦁', score: 19850, delta: '▲2', deltaUp: true  },
  { rank: 5,  name: 'Riccardo', emoji: '🐯', score: 18200, delta: '▼1', deltaUp: false },
  { rank: 6,  name: 'Giulia',   emoji: '🐱', score: 17500, delta: '—',  deltaUp: null  },
  { rank: 7,  name: 'Eva',      emoji: '🦄', score: 16940, delta: '▲4', deltaUp: true  },
];

function buildPodium(entries) {
  const podiumEl = document.getElementById('lb-podium');
  if (!podiumEl) return;
  podiumEl.innerHTML = '';

  entries.forEach(p => {
    const col = document.createElement('div');
    col.className = 'podium-item';

    if (p.rank === 1) {
      const crown = document.createElement('div');
      crown.className = 'podium-crown';
      crown.textContent = '👑';
      col.appendChild(crown);
    }

    // Avatar with glow
    const avWrap = document.createElement('div');
    avWrap.className = 'podium-avatar-wrap';
    avWrap.style.filter = `drop-shadow(0 0 16px ${p.color}80)`;
    const av = buildAvatar({
      name: p.name, emoji: p.emoji, color: p.color,
      size: p.rank === 1 ? 58 : 48, ring: p.color,
    });
    avWrap.appendChild(av);
    col.appendChild(avWrap);

    const nameEl = document.createElement('div');
    nameEl.className = `podium-name${p.rank === 1 ? ' first' : ''}`;
    nameEl.textContent = p.name;
    col.appendChild(nameEl);

    const scoreEl = document.createElement('div');
    scoreEl.className = 'podium-score';
    scoreEl.style.color = p.color;
    // score may be a pre-formatted string (time) or a number
    scoreEl.textContent = typeof p.score === 'number'
      ? p.score.toLocaleString('it-IT') : String(p.score ?? '—');
    col.appendChild(scoreEl);

    const step = document.createElement('div');
    step.className = 'podium-step';
    step.style.cssText = [
      `height:${p.h}px`,
      `background:linear-gradient(180deg,${p.color}40 0%,${p.color}15 100%)`,
      `border:1px solid ${p.color}50`,
      `box-shadow:inset 0 -8px 16px ${p.color}20`,
    ].join(';');

    const rankTxt = document.createElement('span');
    rankTxt.className = `podium-rank${p.rank === 1 ? ' first' : ''}`;
    rankTxt.style.color = p.color;
    rankTxt.textContent = String(p.rank);
    step.appendChild(rankTxt);
    col.appendChild(step);

    podiumEl.appendChild(col);
  });
}

/**
 * Build the list section of the leaderboard.
 * @param {Array}  items   - list entries from rank 4+
 * @param {number|null} myRank  - authenticated user's rank (null = not on board)
 * @param {string|null} myName  - authenticated user's username
 * @param {number|null} myScore - authenticated user's best score
 */
function buildList(items, myRank = null, myName = null, myScore = null) {
  const listEl = document.getElementById('lb-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  items.forEach(p => {
    const row = document.createElement('div');
    row.className = 'lb-row';

    const rankEl = document.createElement('div');
    rankEl.className = 'lb-row-rank';
    rankEl.textContent = String(p.rank);
    row.appendChild(rankEl);

    const av = buildAvatar({ name: p.name, color: '#5a6582', size: 32 });
    row.appendChild(av);

    const nameEl = document.createElement('div');
    nameEl.className = 'lb-row-name';
    nameEl.textContent = p.name;
    row.appendChild(nameEl);

    const deltaEl = document.createElement('div');
    deltaEl.className = 'lb-row-delta';
    deltaEl.style.color = p.deltaUp === true
      ? 'var(--green)' : p.deltaUp === false
      ? 'var(--magenta)' : 'var(--ink-faint)';
    deltaEl.textContent = p.delta || '—';
    row.appendChild(deltaEl);

    const scoreEl = document.createElement('div');
    scoreEl.className = 'lb-row-score';
    scoreEl.textContent = typeof p.score === 'number'
      ? p.score.toLocaleString('it-IT') : String(p.score || '—');
    row.appendChild(scoreEl);

    listEl.appendChild(row);
  });

  // My position sticky row — only render if user is present in the leaderboard
  if (!myName) return;

  const myRow = document.createElement('div');
  myRow.className = 'lb-my-row';

  const myRankEl = document.createElement('div');
  myRankEl.className = 'lb-row-rank';
  myRankEl.textContent = myRank != null ? String(myRank) : '—';
  myRow.appendChild(myRankEl);

  const myAv = buildAvatar({ name: myName, color: '#00f2ff', size: 32, ring: '#00f2ff' });
  myRow.appendChild(myAv);

  const myNameEl = document.createElement('div');
  myNameEl.className = 'lb-row-name';
  myNameEl.innerHTML = `${esc(myName)} <span class="lb-me-label">(tu)</span>`;
  myRow.appendChild(myNameEl);

  const myDeltaEl = document.createElement('div');
  myDeltaEl.className = 'lb-row-delta';
  myDeltaEl.style.color = 'var(--ink-faint)';
  myDeltaEl.textContent = '—';
  myRow.appendChild(myDeltaEl);

  const myScoreEl = document.createElement('div');
  myScoreEl.className = 'lb-row-score';
  myScoreEl.textContent = myScore != null
    ? Number(myScore).toLocaleString('it-IT') : '—';
  myRow.appendChild(myScoreEl);

  listEl.appendChild(myRow);
}

export async function initLeaderboardScreen(user) {
  // Show fake podium immediately for perceived performance
  buildPodium(PODIUM_FAKE);
  // "my row" hidden until we know rank — no score shown for now
  buildList(FAKE_LIST, null, user?.username, null);

  // Wire segments — period controls which mode we query
  const segs = document.querySelectorAll('.lb-seg');
  const periodToMode = { week: 'mp', month: 'solo', all: 'solo' };
  segs.forEach(btn => {
    btn.addEventListener('click', () => {
      segs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Map UI period to API mode — "mp" for recent (week), "solo" for totals
      const mode = periodToMode[btn.dataset.period] || 'solo';
      loadRealLeaderboard(mode, user?.username);
    });
  });

  // Wire filter pills (world/friends/italy) — friends + italy are future work
  const filters = document.querySelectorAll('.lb-filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      if (btn.dataset.scope !== 'world') {
        showToast('Filtro amici in arrivo — presto disponibile!');
        return;
      }
      const activePeriod = document.querySelector('.lb-seg.active')?.dataset.period || 'week';
      const mode = periodToMode[activePeriod] || 'mp';
      loadRealLeaderboard(mode, user?.username);
    });
  });

  // Load real data for default period (week → mp mode)
  loadRealLeaderboard('mp', user?.username);
}

/**
 * Fetch leaderboard from the real API and re-render podium + list.
 * The backend /api/leaderboard accepts mode=solo|mp and optionally nickname.
 * For solo: orders by time_seconds asc (speed run)
 * For mp:   orders by score desc (most points)
 */
async function loadRealLeaderboard(mode, myNick) {
  const listEl = document.getElementById('lb-list');
  if (listEl) {
    listEl.innerHTML = '<div class="lb-loading">Caricamento…</div>';
  }

  try {
    const data = await fetchLeaderboard(mode, myNick || '');
    const top = data?.top ?? [];

    if (top.length === 0) {
      buildPodium(PODIUM_FAKE);
      buildList(FAKE_LIST, null, myNick, null);
      return;
    }

    // Transform API entries for rendering
    // Solo mode metric is time_seconds (lower = better), mp is score (higher = better)
    const isSolo = mode === 'solo';
    const podiumColors = [AVATAR_COLORS[0], AVATAR_COLORS[3], AVATAR_COLORS[1]]; // purple, gold, cyan

    const podiumData = top.slice(0, 3).map((entry, i) => ({
      rank:  i + 1,
      name:  entry.nickname,
      score: isSolo
        ? formatTime(entry.time_seconds ?? 0)
        : Number(entry.score).toLocaleString('it-IT'),
      // score is displayed as string here — re-assign as number for buildPodium compatibility
      scoreRaw: entry.score,
      color: podiumColors[i],
      h: [110, 80, 64][i],
    }));

    // Podium visual order: 2nd left, 1st center, 3rd right
    const podiumOrder = podiumData.length >= 3
      ? [podiumData[1], podiumData[0], podiumData[2]]
      : podiumData;

    buildPodium(podiumOrder);

    // List rows (rank 4+, up to 10)
    const listData = top.slice(3, 10).map((entry, i) => ({
      rank:  i + 4,
      name:  entry.nickname,
      score: isSolo ? null : entry.score, // show numeric score; time shown differently
      delta: '—',
      deltaUp: null,
    }));

    // Find my score from the top array (exact match on nickname)
    const myNickLower = myNick ? myNick.toLowerCase() : '';
    const myEntry = myNickLower
      ? top.find(e => e.nickname?.toLowerCase() === myNickLower)
      : null;
    const myScore = myEntry?.score ?? null;

    // userRank from API is the computed position (may be > TOP_N)
    buildList(listData, data?.userRank ?? null, myNick, myScore);
  } catch {
    buildPodium(PODIUM_FAKE);
    buildList(FAKE_LIST, null, myNick, null);
  }
}

/** Format seconds → "M:SS" string */
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────
// Profile screen
// ─────────────────────────────────────────────────────────────

const FAKE_ACHIEVEMENTS = [
  { emoji: '🎯', title: 'Cecchino',  subtitle: 'Risolvi in <30s', unlocked: true,  color: '#fbbf24' },
  { emoji: '🔥', title: 'Streak 10', subtitle: '10 vittorie',     unlocked: true,  color: '#ff00d4' },
  { emoji: '💎', title: 'Big Spin',  subtitle: 'Vinci €5000',     unlocked: false, color: '#00f2ff' },
  { emoji: '👑', title: 'Top 100',   subtitle: 'Classifica',       unlocked: false, color: '#a855f7' },
  { emoji: '🏆', title: 'Campione',  subtitle: 'Vinci torneo',     unlocked: false, color: '#fbbf24' },
  { emoji: '⚡', title: 'Quick',     subtitle: '< 3 min',          unlocked: true,  color: '#00f2ff' },
  { emoji: '🌟', title: 'Stellare',  subtitle: 'Score perfetto',   unlocked: false, color: '#a855f7' },
  { emoji: '🎪', title: 'Festivo',   subtitle: 'Gioca nel weekend',unlocked: false, color: '#ec4899' },
];

const FAKE_HISTORY = [
  { opp: 'Chiara_92', emoji: '🦊', result: 'W', score: '€4.200', delta: '+25',  color: '#ff00d4' },
  { opp: 'Marco',     emoji: '🐺', result: 'L', score: '€1.800', delta: '-12',  color: '#00f2ff' },
  { opp: 'Sofia',     emoji: '🦊', result: 'W', score: '€3.950', delta: '+22',  color: '#ff00d4' },
];

// Simulated profile stats — swap in real API data when /api/auth/me returns stats
function buildFakeProfileData(user) {
  return {
    username:  user?.username || 'Giocatore',
    handle:    `@${(user?.username || 'user').toLowerCase().replace(/\s+/g, '_')}`,
    since:     'Gen 2025',
    rank:      'Argento II',
    rankPts:   '1.420 pt',
    nextRank:  'Oro III',
    curPts:    1420,
    maxPts:    2300,
    wins:      47,
    winRate:   '64%',
    streak:    7,
    earned:    '€42K',
  };
}

/**
 * Compute a simple rank tier name from a leaderboard position.
 * Tiers: Bronze (>200), Silver (51–200), Gold (11–50), Platinum (4–10), Diamond (2–3), Champion (1)
 */
function rankTierFromPosition(pos) {
  if (!pos || pos < 1) return { label: 'Non classificato', pts: null };
  if (pos === 1)        return { label: 'Campione',         pts: 5000 };
  if (pos <= 3)         return { label: 'Diamante',         pts: 4000 };
  if (pos <= 10)        return { label: 'Platino',          pts: 3000 };
  if (pos <= 50)        return { label: 'Oro',              pts: 2000 };
  if (pos <= 200)       return { label: 'Argento',          pts: 1000 };
  return                       { label: 'Bronzo',           pts: 500  };
}

export function initProfileScreen(user) {
  const fake = buildFakeProfileData(user);

  // ── Static / immediate render ──

  // Avatar
  const avEl = document.getElementById('profile-avatar');
  if (avEl) {
    const color = colorForName(fake.username);
    avEl.style.background = `linear-gradient(135deg,${color},${color}99)`;
    avEl.style.boxShadow  = `0 0 0 2.5px var(--bg),0 0 0 4px var(--gold)`;
    avEl.textContent = fake.username[0].toUpperCase();
    avEl.style.fontSize = '37px';
  }

  // Name & handle
  const nameEl = document.getElementById('profile-name');
  if (nameEl) nameEl.textContent = fake.username;
  const handleEl = document.getElementById('profile-handle');
  if (handleEl) handleEl.textContent = `${fake.handle} · da ${fake.since}`;

  // Rank badge — placeholder while API loads
  const rankLbl = document.getElementById('profile-rank-label');
  if (rankLbl) rankLbl.textContent = fake.rank;
  const rankPts = document.getElementById('profile-rank-pts');
  if (rankPts) rankPts.textContent = `· ${fake.rankPts}`;

  // Stats (fake defaults)
  document.getElementById('stat-wins').textContent   = String(fake.wins);
  document.getElementById('stat-wr').textContent     = fake.winRate;
  document.getElementById('stat-streak').textContent = String(fake.streak);
  document.getElementById('stat-earned').textContent = fake.earned;

  // Progress bar (mock)
  const fill = document.getElementById('progress-fill');
  const pct  = Math.round((fake.curPts / fake.maxPts) * 100);
  if (fill) fill.style.width = `${pct}%`;
  document.getElementById('progress-next-rank').textContent = fake.nextRank;
  document.getElementById('progress-cur').textContent = `${fake.curPts.toLocaleString('it-IT')} pt`;
  document.getElementById('progress-max').textContent = `${fake.maxPts.toLocaleString('it-IT')} pt`;

  // Achievements grid (hardcoded objectives)
  const grid = document.getElementById('achievements-grid');
  if (grid) {
    grid.innerHTML = '';
    FAKE_ACHIEVEMENTS.forEach(a => {
      const cell = document.createElement('div');
      cell.className = `achievement-item${a.unlocked ? '' : ' locked'}`;
      cell.style.cssText = [
        a.unlocked
          ? `background:linear-gradient(135deg,${a.color}25,${a.color}08);border:1px solid ${a.color}50`
          : 'background:rgba(255,255,255,0.025);border:1px solid var(--border)',
        a.unlocked ? `filter:drop-shadow(0 0 8px ${a.color}30)` : '',
      ].join(';');
      cell.innerHTML = `
        <div class="achievement-emoji">${a.emoji}</div>
        <div class="achievement-title">${esc(a.title)}</div>
      `;
      grid.appendChild(cell);
    });
  }

  // Match history (mock — no history API endpoint yet)
  const histEl = document.getElementById('history-list');
  if (histEl) {
    histEl.innerHTML = '';
    FAKE_HISTORY.forEach(h => {
      const row = document.createElement('div');
      row.className = 'history-item';

      const res = document.createElement('div');
      res.className = `history-result ${h.result === 'W' ? 'win' : 'loss'}`;
      res.textContent = h.result;
      row.appendChild(res);

      const av = buildAvatar({ name: h.opp, color: h.color, size: 28 });
      row.appendChild(av);

      const opp = document.createElement('div');
      opp.className = 'history-opp';
      opp.textContent = `vs ${h.opp}`;
      row.appendChild(opp);

      const sc = document.createElement('div');
      sc.className = 'history-score';
      sc.textContent = h.score;
      row.appendChild(sc);

      const dl = document.createElement('div');
      dl.className = `history-delta ${h.result === 'W' ? 'win' : 'loss'}`;
      dl.textContent = h.delta;
      row.appendChild(dl);

      histEl.appendChild(row);
    });
  }

  // Logout
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    window.location.reload();
  });

  // ── Async: load real stats from leaderboard API ──
  if (user?.username) {
    loadProfileStats(user.username);
  }
}

/**
 * Fetch the leaderboard and populate real stats for the current user.
 * Uses mp mode (score-based) as the primary ranking metric.
 */
async function loadProfileStats(username) {
  try {
    const [mpData, soloData] = await Promise.all([
      fetchLeaderboard('mp', username),
      fetchLeaderboard('solo', username),
    ]);

    const myNickLower = username.toLowerCase();

    // Find user entry in top array
    const mpEntry   = mpData?.top?.find(e => e.nickname?.toLowerCase() === myNickLower);
    const soloEntry = soloData?.top?.find(e => e.nickname?.toLowerCase() === myNickLower);
    const mpRank    = mpData?.userRank ?? null;
    const soloRank  = soloData?.userRank ?? null;

    // Best score (mp mode)
    const bestScore = mpEntry?.score ?? null;

    // Use mp rank for tier calculation; fallback to solo
    const displayRank = mpRank ?? soloRank;
    const tier = rankTierFromPosition(displayRank);

    // Update rank badge
    const rankLbl = document.getElementById('profile-rank-label');
    if (rankLbl && tier.label) rankLbl.textContent = tier.label;
    const rankPts = document.getElementById('profile-rank-pts');
    if (rankPts && displayRank) rankPts.textContent = `· #${displayRank}`;

    // Update "Vinti" stat with best real score if available
    if (bestScore != null) {
      const earnedEl = document.getElementById('stat-earned');
      if (earnedEl) {
        const formatted = bestScore >= 1000
          ? `€${Math.round(bestScore / 1000 * 10) / 10}K`
          : `€${bestScore}`;
        earnedEl.textContent = formatted;
      }
    }

    // Update rank progress bar if we have a real rank
    if (displayRank && tier.pts) {
      const nextTier  = rankTierFromPosition(Math.max(1, displayRank - 50));
      const curPts    = tier.pts;
      const maxPts    = nextTier.pts || curPts + 1000;
      const fillEl    = document.getElementById('progress-fill');
      const pct       = Math.min(100, Math.round((curPts / maxPts) * 100));
      if (fillEl) fillEl.style.width = `${pct}%`;
      const nextEl = document.getElementById('progress-next-rank');
      if (nextEl) nextEl.textContent = nextTier.label;
      const curEl  = document.getElementById('progress-cur');
      if (curEl)  curEl.textContent  = `Rank #${displayRank}`;
      const maxEl  = document.getElementById('progress-max');
      if (maxEl)  maxEl.textContent  = `Rank #${Math.max(1, displayRank - 50)}`;
    }
  } catch {
    // Silently fall back — fake data already shown
  }
}

// ─────────────────────────────────────────────────────────────
// Game Screen (1v1 / Solo static placeholder)
// Full game logic will be wired in a subsequent pass.
// ─────────────────────────────────────────────────────────────

// Mock phrase for the static board render
const MOCK_PHRASE_WORDS  = ['NEL', 'BLU', 'DIPINTO', 'DI', 'BLU'];
const MOCK_REVEALED      = new Set(['L', 'I']);
const MOCK_USED          = ['L', 'I', 'N', 'T', 'R'];

/**
 * Render one row of puzzle tiles from a single word.
 * @param {string} word — uppercase word
 * @param {Set<string>} revealed — set of revealed letters
 * @returns {HTMLElement}
 */
function buildPhraseRow(word, revealed) {
  const row = document.createElement('div');
  row.className = 'game-tile-row';

  for (const ch of word) {
    if (ch === ' ') {
      const sp = document.createElement('div');
      sp.className = 'game-tile-space';
      row.appendChild(sp);
      continue;
    }
    const tile = document.createElement('div');
    const show = revealed.has(ch.toUpperCase());
    tile.className = `game-tile${show ? ' game-tile--revealed' : ''}`;
    tile.textContent = show ? ch.toUpperCase() : '';
    row.appendChild(tile);
  }
  return row;
}

/**
 * Render the puzzle board from an array of words.
 * Wraps into multiple display rows respecting a max-tile-per-row limit.
 */
function renderBoard(boardEl, words, revealed) {
  boardEl.innerHTML = '';
  // Group words into visual rows (max ~9 tiles per row to fit screen)
  const MAX_ROW_TILES = 9;
  let currentRow    = null;
  let currentCount  = 0;

  words.forEach((word, wi) => {
    const wordLen = word.replace(/ /g, '').length;

    // Start a new row if this word would exceed the tile budget
    if (!currentRow || currentCount + wordLen > MAX_ROW_TILES) {
      currentRow   = document.createElement('div');
      currentRow.className = 'game-board-row';
      boardEl.appendChild(currentRow);
      currentCount = 0;
    }

    const phraseRow = buildPhraseRow(word, revealed);
    currentRow.appendChild(phraseRow);
    currentCount += wordLen;

    // Add a word-gap spacer (except after last word)
    if (wi < words.length - 1) {
      const gap = document.createElement('div');
      gap.className = 'game-tile-word-gap';
      currentRow.appendChild(gap);
    }
  });
}

/**
 * Render the "used letters" chip strip.
 */
function renderUsedLetters(containerEl, letters) {
  containerEl.innerHTML = '';
  letters.forEach(l => {
    const chip = document.createElement('div');
    chip.className = 'game-used-chip';
    chip.textContent = l;
    containerEl.appendChild(chip);
  });
}

/**
 * Configure the game screen for a given session.
 * Called by window._enterGame({ mode, opponentName, opponentColor }).
 */
function configureGameScreen(user, opts = {}) {
  const mode         = opts.mode || 'solo';
  const isSolo       = mode === 'solo';
  const player1Name  = user?.username || 'Tu';
  const oppName      = opts.opponentName || 'Avversario';
  const oppColor     = opts.opponentColor || '#ff00d4';

  // Player 1 avatar + name + score
  const av1 = document.getElementById('game-av1');
  const n1  = document.getElementById('game-name1');
  if (av1) {
    const c = colorForName(player1Name);
    av1.style.background = `linear-gradient(135deg,${c},${c}99)`;
    av1.style.boxShadow  = `0 0 0 2px var(--bg),0 0 0 3.5px ${c}`;
    av1.textContent = player1Name[0].toUpperCase();
  }
  if (n1) n1.textContent = player1Name;

  // Player 2 (hide in solo mode)
  const scoreBar  = document.querySelector('.game-score-bar');
  const turnPill  = document.getElementById('game-turn-pill');
  const av2       = document.getElementById('game-av2');
  const n2        = document.getElementById('game-name2');

  if (isSolo) {
    if (scoreBar) scoreBar.classList.add('game-score-bar--solo');
    if (turnPill) turnPill.style.display = 'none';
    const p2 = document.getElementById('game-player2');
    if (p2) p2.style.display = 'none';
  } else {
    if (scoreBar) scoreBar.classList.remove('game-score-bar--solo');
    if (turnPill) turnPill.style.display = '';
    const p2 = document.getElementById('game-player2');
    if (p2) p2.style.display = '';
    if (av2) {
      av2.style.background = `linear-gradient(135deg,${oppColor},${oppColor}99)`;
      av2.textContent = oppName[0].toUpperCase();
    }
    if (n2) n2.textContent = oppName;
  }

  // Manche counter
  const mancheNumEl = document.getElementById('game-manche-num');
  if (mancheNumEl) mancheNumEl.textContent = String(opts.manche || 1);

  // Category
  const catEl = document.getElementById('game-category-name');
  if (catEl) catEl.textContent = opts.category || 'CANZONI ITALIANE';

  // Board (mock data until real game logic wired)
  const boardEl = document.getElementById('game-board');
  if (boardEl) renderBoard(boardEl, MOCK_PHRASE_WORDS, MOCK_REVEALED);

  // Used letters
  const usedEl = document.getElementById('game-used-letters');
  if (usedEl) renderUsedLetters(usedEl, MOCK_USED);

  // Spin value
  const spinValEl = document.getElementById('game-spin-value');
  if (spinValEl) spinValEl.textContent = opts.lastSpin ? `+€${opts.lastSpin} per lettera` : '—';

  // "CHIAMA" visibility: only shown after a spin has landed
  const chiamaBtn = document.getElementById('game-chiama-btn');
  if (chiamaBtn) chiamaBtn.style.display = opts.lastSpin ? '' : 'none';
}

export function initGameScreen(user) {
  // Expose configurator for future calls from _enterGame
  window._gameScreenConfigure = (opts) => configureGameScreen(user, opts);

  // Render with default mock state on first init
  configureGameScreen(user, {
    mode:     'solo',
    category: '—',
    manche:   1,
  });

  // ── Button handlers wired to soloGame ──

  // Home / exit — go back to home
  document.getElementById('game-home-btn')?.addEventListener('click', () => {
    window._appRouter?.('home');
  });

  // Spin button → soloGame.onSpin
  document.getElementById('game-spin-btn')?.addEventListener('click', () => {
    soloGame.onSpin();
  });

  // Chiama (call consonant) → soloGame.onChiama
  document.getElementById('game-chiama-btn')?.addEventListener('click', () => {
    soloGame.onChiama();
  });

  // Buy vowel → soloGame.onVowel
  document.getElementById('game-vowel-btn')?.addEventListener('click', () => {
    soloGame.onVowel();
  });

  // Solve → soloGame.onSolve
  document.getElementById('game-solve-btn')?.addEventListener('click', () => {
    soloGame.onSolve();
  });

  // Sound toggle — placeholder (no audio system in mobile yet)
  document.getElementById('game-sound-btn')?.addEventListener('click', () => {
    showToast('Audio — impostazioni presto disponibili');
  });

  // Help
  document.getElementById('game-help-btn')?.addEventListener('click', () => {
    showToast('Gira la ruota, chiama consonanti, risolvi la frase!');
  });
}
