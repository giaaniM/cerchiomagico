/**
 * solo-game.js — Standalone solo game logic for the MagicSpin mobile app.
 *
 * Completely self-contained: no dependency on elements.js, index.html,
 * web modules (wheel.js, game-logic.js) or any global web game state.
 *
 * Exported API:
 *   startSoloGame(user, lang)  — boot a new solo session
 *   soloGame                   — object with onSpin / onVowel / onSolve /
 *                                onChiama for button wiring
 */

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U']);
const VOWEL_COST = 1000;
const TOTAL_MANCHES = 5;
const PLAYED_KEY = 'ms_played_phrases_v1';

// Offline fallback phrases used when the API is unreachable
const OFFLINE_IT = [
  { phrase: 'CHI DORME NON PIGLIA PESCI', hint: 'Proverbio' },
  { phrase: 'LA RUOTA DELLA FORTUNA GIRA PER TUTTI', hint: 'Modo di dire' },
  { phrase: 'NON TUTTO QUEL CHE LUCCICA E ORO', hint: 'Proverbio' },
  { phrase: 'CHI TROVA UN AMICO TROVA UN TESORO', hint: 'Proverbio' },
  { phrase: 'FINCHE LA BARCA VA LASCIALA ANDARE', hint: 'Canzone' },
  { phrase: 'CANTARE SOTTO LA PIOGGIA BATTENTE', hint: 'Film' },
  { phrase: 'L IMPORTANTE NON E VINCERE MA PARTECIPARE', hint: 'Citazione' },
  { phrase: 'ROSSO DI SERA BEL TEMPO SI SPERA', hint: 'Proverbio' },
  { phrase: 'TUTTE LE STRADE PORTANO A ROMA', hint: 'Proverbio' },
  { phrase: 'IL MATTINO HA L ORO IN BOCCA', hint: 'Proverbio' },
  { phrase: 'A CAVAL DONATO NON SI GUARDA IN BOCCA', hint: 'Proverbio' },
  { phrase: 'MOGLIE E BUOI DEI PAESI TUOI', hint: 'Proverbio' },
  { phrase: 'BALLA COI LUPI NELLA FORESTA', hint: 'Film' },
  { phrase: 'L APPETITO VIEN MANGIANDO E BEVENDO', hint: 'Modo di dire' },
];
const OFFLINE_EN = [
  { phrase: 'THE EARLY BIRD CATCHES THE WORM', hint: 'Proverb' },
  { phrase: 'ALL THAT GLITTERS IS NOT GOLD', hint: 'Proverb' },
  { phrase: 'ACTIONS SPEAK LOUDER THAN WORDS', hint: 'Proverb' },
  { phrase: 'EVERY CLOUD HAS A SILVER LINING', hint: 'Proverb' },
  { phrase: 'BETTER LATE THAN NEVER', hint: 'Proverb' },
  { phrase: 'A PICTURE IS WORTH A THOUSAND WORDS', hint: 'Saying' },
  { phrase: 'WHERE THERE IS A WILL THERE IS A WAY', hint: 'Proverb' },
  { phrase: 'GONE WITH THE WIND', hint: 'Movie' },
  { phrase: 'TO BE OR NOT TO BE THAT IS THE QUESTION', hint: 'Shakespeare' },
  { phrase: 'MAY THE FORCE BE WITH YOU', hint: 'Movie' },
  { phrase: 'THERE IS NO PLACE LIKE HOME', hint: 'Movie' },
];

// Wheel segments for solo mode — identical to SOLO_WHEEL_SEGMENTS in wheel.js
// (PASSA→time penalties replaced back to PASSA for solo-game self-contained logic;
//  MEGATURNO slot replaced with a numeric 600€ segment as in the web solo mode)
const SOLO_SEGMENTS = [
  { value: 300,        label: '300€',     color: '#b45309' },
  { value: 200,        label: '200€',     color: '#065f46' },
  { value: 700,        label: '700€',     color: '#0f766e' },
  { value: 500,        label: '500€',     color: '#0891b2' },
  { value: 'PASSA',    label: 'PASSA',    color: '#FFFFFF' },
  { value: 1000,       label: '1000€',    color: 'RAINBOW', glowing: true },
  { value: 'CROLLO',   label: 'CROLLO',   color: '#111827' },
  { value: 350,        label: '350€',     color: '#9a3412' },
  { value: 300,        label: '300€',     color: '#065f46' },
  { value: 450,        label: '450€',     color: '#0f766e' },
  { value: 700,        label: '700€',     color: '#0891b2' },
  { value: 'PASSA',    label: 'PASSA',    color: '#FFFFFF' },
  { value: 'RADDOPPIA',label: 'RADDOPPIA',color: 'GOLD',    glowing: true },
  { value: 'PASSA',    label: 'PASSA',    color: '#FFFFFF' },
  { value: 800,        label: '800€',     color: '#0f766e' },
  { value: 300,        label: '300€',     color: '#0891b2' },
  { value: 600,        label: '600€',     color: '#7c3aed' },
  { value: '?500',     label: '?500',     color: '#166534' },
  { value: 'SCUDO',    label: 'SCUDO',    color: '#9333EA' },
  { value: 300,        label: '300€',     color: '#065f46' },
  { value: 500,        label: '500€',     color: '#0891b2' },
  { value: 200,        label: '200€',     color: '#34d399' },
  { value: 'PASSA',    label: 'PASSA',    color: '#FFFFFF' },
  { value: 200,        label: '200€',     color: '#b45309' },
];

// ─────────────────────────────────────────────────────────────
// Module-level state (replaced on each new session)
// ─────────────────────────────────────────────────────────────

/** @type {SoloState|null} */
let _state = null;
let _user = null;
let _wheelAnimId = null;
let _wheelRotation = 0;
let _wheelCanvas = null;
let _wheelCtx = null;
let _hasShield = false;

/**
 * @typedef {Object} SoloState
 * @property {string}   phrase
 * @property {string}   hint
 * @property {Set<string>} revealed
 * @property {number}   score       - manche score
 * @property {number}   totalScore
 * @property {number}   manche      - 1-5
 * @property {number|string|null} spinValue - current landed segment value
 * @property {Set<string>} usedLetters
 * @property {string}   lang
 * @property {boolean}  waitingForLetter  - after a spin with numeric value
 * @property {number}   multiplier        - 1 normally; 2 after RADDOPPIA
 * @property {Array}    puzzleDb          - full fetched list for this session
 */

function freshState(phrase, hint, lang, puzzleDb) {
  return {
    phrase,
    hint,
    revealed: new Set(),
    score: 0,
    totalScore: 0,
    manche: 1,
    spinValue: null,
    usedLetters: new Set(),
    lang,
    waitingForLetter: false,
    multiplier: 1,
    puzzleDb,
  };
}

// ─────────────────────────────────────────────────────────────
// LocalStorage helpers for played-phrase tracking
// ─────────────────────────────────────────────────────────────

function getPlayedIds(lang) {
  try {
    const data = JSON.parse(localStorage.getItem(PLAYED_KEY) || '{}');
    return new Set(data[lang] || []);
  } catch { return new Set(); }
}

function markPlayed(lang, id) {
  if (id == null) return;
  try {
    const data = JSON.parse(localStorage.getItem(PLAYED_KEY) || '{}');
    if (!data[lang]) data[lang] = [];
    if (!data[lang].includes(id)) data[lang].push(id);
    localStorage.setItem(PLAYED_KEY, JSON.stringify(data));
  } catch {}
}

function resetPlayed(lang) {
  try {
    const data = JSON.parse(localStorage.getItem(PLAYED_KEY) || '{}');
    data[lang] = [];
    localStorage.setItem(PLAYED_KEY, JSON.stringify(data));
  } catch {}
}

// ─────────────────────────────────────────────────────────────
// Puzzle fetching
// ─────────────────────────────────────────────────────────────

async function fetchPuzzles(lang) {
  const base = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : '';
  try {
    const res = await fetch(`${base}/api/puzzles?lang=${lang}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error('empty');
  } catch {
    return lang === 'en' ? OFFLINE_EN : OFFLINE_IT;
  }
}

function pickPhrase(db, lang) {
  const played = getPlayedIds(lang);
  const hasIds = db.some(p => p.id != null);
  let pool = hasIds ? db.filter(p => !played.has(p.id)) : db;
  if (pool.length === 0) {
    resetPlayed(lang);
    pool = db;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─────────────────────────────────────────────────────────────
// Phrase helpers
// ─────────────────────────────────────────────────────────────

function normalizeChar(c) {
  return c.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
}

function countOccurrences(phrase, letter) {
  let n = 0;
  for (const ch of phrase) {
    if (normalizeChar(ch) === letter) n++;
  }
  return n;
}

function isVowel(letter) {
  return VOWELS.has(letter.toUpperCase());
}

function isConsonant(letter) {
  const ch = letter.toUpperCase();
  return /^[A-Z]$/.test(ch) && !isVowel(ch);
}

// ─────────────────────────────────────────────────────────────
// DOM helpers
// ─────────────────────────────────────────────────────────────

function el(id) { return document.getElementById(id); }

function showToast(msg, ms = 2800) {
  const t = el('app-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.add('hidden'), ms);
}

function setSpinValue(text) {
  const v = el('game-spin-value');
  if (v) v.textContent = text;
}

function setScore(score) {
  const s = el('game-score1');
  if (s) s.textContent = `€${score.toLocaleString('it-IT')}`;
  // Also update spin-value label if waiting
  const v = el('game-spin-value');
  if (_state && _state.spinValue && typeof _state.spinValue === 'number') {
    // already set by the spin handler — leave it
  }
}

function setManche(n) {
  const m = el('game-manche-num');
  if (m) m.textContent = String(n);
}

function setCategory(hint) {
  const c = el('game-category-name');
  if (c) c.textContent = hint ? hint.toUpperCase() : '—';
}

function showChiamaBtn(visible) {
  const b = el('game-chiama-btn');
  if (b) b.style.display = visible ? '' : 'none';
}

function setSpinBtnEnabled(enabled) {
  const b = el('game-spin-btn');
  if (!b) return;
  b.disabled = !enabled;
  b.style.opacity = enabled ? '' : '0.4';
}

function setSecondaryEnabled(enabled) {
  const vowelBtn = el('game-vowel-btn');
  const solveBtn = el('game-solve-btn');
  if (vowelBtn) {
    vowelBtn.disabled = !enabled;
    vowelBtn.style.opacity = enabled ? '' : '0.4';
  }
  if (solveBtn) {
    solveBtn.disabled = !enabled;
    solveBtn.style.opacity = enabled ? '' : '0.4';
  }
}

// ─────────────────────────────────────────────────────────────
// Board rendering — web-identical tile structure
// Mirrors board.js: .tile .tile.letter .tile.revealed .tile.empty
// ─────────────────────────────────────────────────────────────

/**
 * Split phrase words into rows that fit within the given column limits.
 * Ported from board.js splitPhraseIntoRows().
 */
function splitPhraseIntoRows(words, rowLimits) {
  const rows = [];
  let currentRow = [];
  let currentLen = 0;

  for (const word of words) {
    const spaceNeeded = currentRow.length > 0 ? 1 : 0;
    const wordLen = word.length;

    if (currentLen + spaceNeeded + wordLen <= rowLimits[rows.length]) {
      if (spaceNeeded) {
        currentRow.push({ type: 'space' });
        currentLen += 1;
      }
      for (const char of word) {
        currentRow.push({ type: 'letter', char });
        currentLen += 1;
      }
    } else {
      rows.push(currentRow);
      currentRow = [];
      currentLen = 0;
      if (rows.length >= rowLimits.length) return null;
      if (wordLen <= rowLimits[rows.length]) {
        for (const char of word) {
          currentRow.push({ type: 'letter', char });
          currentLen += 1;
        }
      } else {
        return null;
      }
    }
  }
  if (currentRow.length > 0) rows.push(currentRow);
  return rows.length <= rowLimits.length ? rows : null;
}

function renderBoard() {
  const boardEl = el('game-board');
  if (!boardEl || !_state) return;
  boardEl.innerHTML = '';

  const words = _state.phrase.split(' ');

  // Mobile uses a 3-row layout with smaller columns (fewer tiles per row)
  // to fit on a phone screen: 10-12-10 columns
  const BOARD_ROWS = 3;
  const ROW_CAPACITIES = [10, 12, 10];
  const FIXED_CAPACITY = 12; // widest row

  let contentRows = splitPhraseIntoRows(words, ROW_CAPACITIES);

  // Fallback: 4-row layout 9-11-11-9
  if (!contentRows) {
    const ALT_ROWS = 4;
    const ALT_CAPS = [9, 11, 11, 9];
    contentRows = splitPhraseIntoRows(words, ALT_CAPS);
    if (!contentRows) {
      // Last resort: simple wrapping at fixed width
      contentRows = [];
      let currentRow = [];
      for (const word of words) {
        if (currentRow.length > 0) currentRow.push({ type: 'space' });
        for (const char of word) currentRow.push({ type: 'letter', char });
        if (currentRow.length >= 11) {
          contentRows.push(currentRow);
          currentRow = [];
        }
      }
      if (currentRow.length > 0) contentRows.push(currentRow);
    }
  }

  if (!contentRows || contentRows.length === 0) return;

  const totalRows = contentRows.length;
  const verticalOffset = 0; // no padding rows needed on mobile

  for (let row = 0; row < totalRows; row++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'board-row';
    const contentRow = contentRows[row];

    contentRow.forEach(cell => {
      const tileEl = document.createElement('div');
      if (cell.type === 'space') {
        tileEl.className = 'tile tile--space';
      } else {
        const norm = normalizeChar(cell.char);
        const isRevealed = _state.revealed.has(norm);
        tileEl.className = `tile tile--letter${isRevealed ? ' tile--revealed' : ''}`;
        tileEl.dataset.letter = norm;
        tileEl.textContent = isRevealed ? norm : '';
      }
      rowEl.appendChild(tileEl);
    });

    boardEl.appendChild(rowEl);
  }
}

function renderUsedLetters() {
  const container = el('game-used-letters');
  if (!container || !_state) return;
  container.innerHTML = '';
  [..._state.usedLetters].sort().forEach(l => {
    const chip = document.createElement('div');
    chip.className = 'game-used-chip';
    chip.textContent = l;
    container.appendChild(chip);
  });
}

// ─────────────────────────────────────────────────────────────
// Wheel — full-fidelity canvas renderer (mirrors web wheel.js)
// ─────────────────────────────────────────────────────────────

const SEG_COUNT = SOLO_SEGMENTS.length;
const SEG_ANGLE_RAD = (2 * Math.PI) / SEG_COUNT;

// Off-screen cache canvas for the static wheel artwork
let _wheelCacheCanvas = null;

function ensureWheelCanvas() {
  // The wheel canvas is a dedicated <canvas id="game-wheel-canvas"> in app.html.
  // We size it to fill the container responsively.
  let canvas = el('game-wheel-canvas');
  if (!canvas) return null;

  // Set physical pixel size based on container width.
  // offsetWidth is 0 when the canvas element has display:none (inside a hidden screen),
  // so fall back to the CSS-computed width via getBoundingClientRect, then 300px as last resort.
  let size = canvas.offsetWidth;
  if (!size) {
    const rect = canvas.getBoundingClientRect();
    size = rect.width || 300;
  }
  const dpr = window.devicePixelRatio || 1;
  canvas.width = size * dpr;
  canvas.height = size * dpr;

  _wheelCanvas = canvas;
  _wheelCtx = canvas.getContext('2d');
  // Invalidate cache so it is rebuilt at the new size
  _wheelCacheCanvas = null;
  return canvas;
}

/**
 * Render the full-fidelity wheel onto an off-screen canvas.
 * Mirrors renderWheelToCache() in wheel.js exactly.
 */
function renderWheelCache() {
  if (!_wheelCanvas) return;
  if (!_wheelCacheCanvas) {
    _wheelCacheCanvas = document.createElement('canvas');
  }
  _wheelCacheCanvas.width = _wheelCanvas.width;
  _wheelCacheCanvas.height = _wheelCanvas.height;

  const ctx = _wheelCacheCanvas.getContext('2d');
  const W = _wheelCacheCanvas.width;
  const H = _wheelCacheCanvas.height;
  const centerX = W / 2;
  const centerY = H / 2;
  const radius = Math.min(centerX, centerY) - 10;
  const scale = W / 300;

  ctx.clearRect(0, 0, W, H);

  SOLO_SEGMENTS.forEach((segment, i) => {
    const startAngle = i * SEG_ANGLE_RAD;
    const endAngle = startAngle + SEG_ANGLE_RAD;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.clip();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';

    let fillStyle;

    if (segment.color === 'RAINBOW') {
      const rainGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      rainGrad.addColorStop(0, '#000000');
      rainGrad.addColorStop(0.3, '#330033');
      rainGrad.addColorStop(0.5, '#ff0000');
      rainGrad.addColorStop(0.65, '#ffcc00');
      rainGrad.addColorStop(0.8, '#00ff00');
      rainGrad.addColorStop(0.9, '#00ccff');
      rainGrad.addColorStop(1, '#ff00ff');
      fillStyle = rainGrad;
    } else if (segment.color === 'GOLD' || segment.glowing) {
      const goldGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      goldGrad.addColorStop(0, '#fef3c7');
      goldGrad.addColorStop(0.4, '#f59e0b');
      goldGrad.addColorStop(0.8, '#422006');
      goldGrad.addColorStop(1, '#000000');
      fillStyle = goldGrad;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 15 * scale;
    } else if (segment.color === '#9333EA') {
      // SCUDO — violet radial
      const scudoGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      scudoGrad.addColorStop(0, '#c084fc');
      scudoGrad.addColorStop(0.5, '#9333ea');
      scudoGrad.addColorStop(1, '#3b0764');
      fillStyle = scudoGrad;
      ctx.shadowColor = '#a855f7';
      ctx.shadowBlur = 10 * scale;
    } else {
      const baseColor = segment.color;
      const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
      if (baseColor === '#FFFFFF' || baseColor === '#f8fafc') {
        vignetteGrad.addColorStop(0, '#FFFFFF');
        vignetteGrad.addColorStop(0.6, '#f8fafc');
        vignetteGrad.addColorStop(1, '#cbd5e1');
      } else {
        vignetteGrad.addColorStop(0, '#000000');
        vignetteGrad.addColorStop(0.3, '#0f172a');
        vignetteGrad.addColorStop(1, baseColor);
      }
      fillStyle = vignetteGrad;
    }

    ctx.fillStyle = fillStyle;
    ctx.fill();

    // Glitter for RAINBOW segments
    if (segment.color === 'RAINBOW') {
      ctx.save();
      for (let j = 0; j < 200 * scale; j++) {
        const r = Math.random() * radius;
        const a = startAngle + Math.random() * SEG_ANGLE_RAD;
        const gx = centerX + r * Math.cos(a);
        const gy = centerY + r * Math.sin(a);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.1 + Math.random() * 0.6;
        ctx.beginPath();
        ctx.arc(gx, gy, Math.random() * 1.2 * scale, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    ctx.restore(); // end clip

    // Stroke dividers (outside clip so they don't get cut)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
    ctx.restore();

    // ── Text rendering (curved / radial, identical to web) ──
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(startAngle + SEG_ANGLE_RAD / 2);

    const label = segment.label;

    // Text colour logic (matches wheel.js exactly)
    if (label === 'PASSA') {
      ctx.fillStyle = '#000000';
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'transparent';
    } else if (label === 'CROLLO') {
      ctx.fillStyle = '#FFFFFF';
    } else if (label === 'MEGATURNO') {
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3 * scale;
    } else if (label === 'SCUDO') {
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3 * scale;
    } else if (label === '?500') {
      ctx.fillStyle = '#FFFF00';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4 * scale;
    } else if (label === 'RADDOPPIA') {
      ctx.fillStyle = '#FFFFFF';
    } else {
      ctx.fillStyle = '#FFFF00';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 3 * scale;
    }

    ctx.textAlign = 'center';
    if (label !== 'PASSA') ctx.lineWidth = 3 * scale;

    const chars = label.replace(/\s/g, '').split('');

    // Font size keyed on label
    let fontSize = 21 * scale;
    if (label === 'CROLLO') fontSize = 10.5 * scale;
    else if (label === 'PASSA') fontSize = 16 * scale;
    else if (label === 'RADDOPPIA') fontSize = 9 * scale;
    else if (label === 'MEGATURNO') fontSize = 10 * scale;
    else if (label === 'SCUDO') fontSize = 13 * scale;
    else if (label === '?500') fontSize = 18 * scale;

    ctx.font = `bold ${fontSize}px Lexend, sans-serif`;

    // Radial text placement
    let baseRadius = 0.86;
    if (label === 'MEGATURNO') baseRadius = 0.88;
    if (label === 'PASSA') baseRadius = 0.87;
    if (label === 'RADDOPPIA') baseRadius = 0.89;
    if (label === 'CROLLO') baseRadius = 0.89;
    if (label === 'SCUDO') baseRadius = 0.87;
    if (label === '?500') baseRadius = 0.86;

    let currentRadius = radius * baseRadius;
    const charSpacing = (label === 'CROLLO' || label === 'RADDOPPIA' || label === 'MEGATURNO') ? 0.78 : 0.85;

    chars.forEach(char => {
      ctx.save();
      ctx.translate(currentRadius, 0);
      ctx.rotate(Math.PI / 2);
      if (char === '€') {
        ctx.font = `bold ${fontSize * 0.55}px Lexend, sans-serif`;
      } else {
        ctx.font = `bold ${fontSize}px Lexend, sans-serif`;
      }
      ctx.fillText(char, 0, 0);
      ctx.restore();
      currentRadius -= fontSize * (char === '€' ? charSpacing * 0.2 : charSpacing);
    });

    // Icons after text
    if (label === 'SCUDO') {
      ctx.save();
      ctx.translate(currentRadius - 6 * scale, 0);
      ctx.rotate(Math.PI / 2);
      ctx.font = `${16 * scale}px Lexend, sans-serif`;
      ctx.fillText('🛡️', 0, 0);
      ctx.restore();
    } else if (label === 'MEGATURNO') {
      ctx.save();
      ctx.translate(currentRadius - 6 * scale, 0);
      ctx.rotate(Math.PI / 2);
      ctx.font = `${14 * scale}px Lexend, sans-serif`;
      ctx.fillText('⚡', 0, 0);
      ctx.restore();
    }

    ctx.restore();
  });
}

/**
 * Draw the wheel at the given rotation (in radians) onto the main canvas.
 * Uses the off-screen cache for performance.
 */
function drawMobileWheel(rotation) {
  if (!_wheelCtx || !_wheelCanvas) return;
  const ctx = _wheelCtx;
  const W = _wheelCanvas.width;
  const H = _wheelCanvas.height;
  const centerX = W / 2;
  const centerY = H / 2;
  const scale = W / 300;

  // Lazy-build cache
  if (!_wheelCacheCanvas) renderWheelCache();

  ctx.clearRect(0, 0, W, H);

  // Gold outer ring
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.min(centerX, centerY) - 2, 0, 2 * Math.PI);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 4 * scale;
  ctx.shadowColor = '#fbbf24';
  ctx.shadowBlur = 8 * scale;
  ctx.stroke();
  ctx.restore();

  // Rotated wheel artwork
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rotation);
  ctx.drawImage(_wheelCacheCanvas, -centerX, -centerY);
  ctx.restore();

  // Center hub (always on top, no rotation)
  ctx.beginPath();
  ctx.arc(centerX, centerY, 30 * scale, 0, 2 * Math.PI);
  ctx.fillStyle = '#1e293b';
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3 * scale;
  ctx.stroke();

  // Fixed magenta pointer at top (12 o'clock = pointer reads the result)
  const R = Math.min(centerX, centerY) - 10;
  ctx.save();
  ctx.fillStyle = '#ff00d4';
  ctx.shadowColor = '#ff00d4';
  ctx.shadowBlur = 10 * scale;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY - R - 6 * scale);
  ctx.lineTo(centerX - 7 * scale, centerY - R + 12 * scale);
  ctx.lineTo(centerX + 7 * scale, centerY - R + 12 * scale);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function pickRandomSegment() {
  return Math.floor(Math.random() * SEG_COUNT);
}

/**
 * Spin animation. Calls onDone(segment) when complete.
 */
function animateSpin(onDone) {
  if (!ensureWheelCanvas()) {
    const idx = pickRandomSegment();
    onDone(SOLO_SEGMENTS[idx]);
    return;
  }

  // Build/rebuild cache (size may have changed)
  renderWheelCache();
  drawMobileWheel(_wheelRotation);

  const targetIdx = pickRandomSegment();
  const segDeg = 360 / SEG_COUNT;

  // Pointer is at the top (12 o'clock).
  // In the web wheel, pointer reads angle 270° (top).
  // Segment index 0 starts at angle 0 (3 o'clock).
  // So segment center in degrees = targetIdx * segDeg + segDeg / 2.
  // To align segment center under pointer: we need (270 - segCenter) mod 360 added to current rotation.
  const segCenter = targetIdx * segDeg + segDeg / 2;
  const edgeSide = Math.random() > 0.5 ? 1 : -1;
  const edgeOffset = edgeSide * (0.4 + Math.random() * 0.08) * segDeg;
  const currentDeg = (_wheelRotation * 180 / Math.PI) % 360;
  let targetDeg = 270 - (segCenter + edgeOffset);
  targetDeg = ((targetDeg - currentDeg) % 360 + 360) % 360;
  if (targetDeg < 20) targetDeg += 360;

  const minSpins = 3 + Math.floor(Math.random() * 2);
  const totalDeg = targetDeg + minSpins * 360;
  const totalRad = totalDeg * Math.PI / 180;
  const startRot = _wheelRotation;
  const endRot = startRot + totalRad;
  const duration = 5000;
  const startTime = performance.now();

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 5); // quintic ease-out
    const rot = startRot + totalRad * ease;
    _wheelRotation = rot;
    drawMobileWheel(rot);

    if (progress < 1) {
      _wheelAnimId = requestAnimationFrame(animate);
    } else {
      _wheelRotation = endRot;
      // Determine actual landed segment from final rotation
      // Pointer is at 270°. The angle under the pointer = (270 - finalDeg_mod360 + 360) % 360
      const finalDeg = (_wheelRotation * 180 / Math.PI);
      const pointerAngle = ((270 - finalDeg) % 360 + 360) % 360;
      const actualIdx = Math.floor(pointerAngle / segDeg) % SEG_COUNT;
      const actualSeg = SOLO_SEGMENTS[actualIdx];
      setTimeout(() => onDone(actualSeg), 500);
    }
  }

  _wheelAnimId = requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────────────────────
// Game-over overlay
// ─────────────────────────────────────────────────────────────

function showGameOver(user) {
  // Remove any existing overlay
  const existing = el('solo-gameover');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'solo-gameover';
  overlay.style.cssText = [
    'position:fixed',
    'inset:0',
    'background:rgba(7,11,25,0.92)',
    'display:flex',
    'flex-direction:column',
    'align-items:center',
    'justify-content:center',
    'z-index:9999',
    'padding:24px',
    'text-align:center',
  ].join(';');

  const title = document.createElement('div');
  title.style.cssText = 'font-size:2rem;font-weight:900;color:#fbbf24;margin-bottom:8px;';
  title.textContent = 'PARTITA FINITA!';

  const score = document.createElement('div');
  score.style.cssText = 'font-size:1.3rem;color:#e2e8f0;margin-bottom:24px;';
  score.textContent = `Punteggio totale: €${(_state?.totalScore || 0).toLocaleString('it-IT')}`;

  const btn = document.createElement('button');
  btn.textContent = 'Gioca ancora';
  btn.style.cssText = [
    'background:linear-gradient(135deg,#a855f7,#7c3aed)',
    'color:#fff',
    'border:none',
    'border-radius:14px',
    'padding:14px 36px',
    'font-size:1rem',
    'font-weight:700',
    'cursor:pointer',
  ].join(';');
  btn.addEventListener('click', () => {
    overlay.remove();
    const lang = _state?.lang || 'it';
    startSoloGame(user, lang);
  });

  overlay.appendChild(title);
  overlay.appendChild(score);
  overlay.appendChild(btn);
  document.body.appendChild(overlay);
}

// ─────────────────────────────────────────────────────────────
// Manche lifecycle
// ─────────────────────────────────────────────────────────────

function advanceToNextManche() {
  if (!_state) return;
  _state.totalScore += _state.score;
  _state.manche += 1;

  if (_state.manche > TOTAL_MANCHES) {
    showToast(`Hai completato tutte le manches! Totale: €${_state.totalScore.toLocaleString('it-IT')}`, 4000);
    setTimeout(() => showGameOver(_user), 1200);
    return;
  }

  // Pick next phrase
  const pick = pickPhrase(_state.puzzleDb, _state.lang);
  _state.phrase = pick.phrase;
  _state.hint = pick.hint || '';
  _state.revealed = new Set();
  _state.score = 0;
  _state.spinValue = null;
  _state.usedLetters = new Set();
  _state.waitingForLetter = false;
  _state.multiplier = 1;
  _hasShield = false;

  if (pick.id != null) markPlayed(_state.lang, pick.id);

  // Reset UI
  setManche(_state.manche);
  setCategory(_state.hint);
  setScore(0);
  setSpinValue('—');
  showChiamaBtn(false);
  setSpinBtnEnabled(true);
  setSecondaryEnabled(true);
  renderBoard();
  renderUsedLetters();
  showToast(`Manche ${_state.manche}! Nuova frase. Buona fortuna!`);
}

// ─────────────────────────────────────────────────────────────
// Turn loss (wrong letter or PASSA)
// ─────────────────────────────────────────────────────────────

function loseConsonantTurn(reason) {
  if (!_state) return;
  _state.spinValue = null;
  _state.waitingForLetter = false;
  showChiamaBtn(false);
  setSpinBtnEnabled(true);
  setSecondaryEnabled(true);
  showToast(reason, 2600);
}

// ─────────────────────────────────────────────────────────────
// Wheel stop handler
// ─────────────────────────────────────────────────────────────

function handleWheelResult(seg) {
  if (!_state) return;
  const val = seg.value;

  if (val === 'CROLLO') {
    if (_hasShield) {
      _hasShield = false;
      showToast('CROLLO! Il tuo SCUDO ti ha protetto. Scudo esaurito.');
      _state.spinValue = null;
      _state.waitingForLetter = false;
      showChiamaBtn(false);
      setSpinBtnEnabled(true);
      setSecondaryEnabled(true);
    } else {
      _state.score = 0;
      _state.spinValue = null;
      _state.waitingForLetter = false;
      setScore(0);
      showChiamaBtn(false);
      setSpinBtnEnabled(true);
      setSecondaryEnabled(true);
      showToast('CROLLO! Perdi tutti i punti della manche.', 3000);
    }
    return;
  }

  if (val === 'PASSA') {
    _state.spinValue = null;
    _state.waitingForLetter = false;
    showChiamaBtn(false);
    setSpinBtnEnabled(true);
    setSecondaryEnabled(true);
    showToast('PASSA! Turno perso — gira di nuovo.');
    return;
  }

  if (val === 'SCUDO') {
    _hasShield = true;
    _state.spinValue = null;
    _state.waitingForLetter = false;
    showChiamaBtn(false);
    setSpinBtnEnabled(true);
    setSecondaryEnabled(true);
    showToast('SCUDO! Sei protetto dal prossimo CROLLO o PASSA. Gira di nuovo.');
    return;
  }

  if (val === 'RADDOPPIA') {
    _state.multiplier = 2;
    _state.spinValue = null;
    _state.waitingForLetter = false;
    showChiamaBtn(false);
    setSpinBtnEnabled(true);
    setSecondaryEnabled(true);
    showToast('RADDOPPIA! Il prossimo spin vale il doppio. Gira di nuovo.');
    return;
  }

  if (val === '?500') {
    // Mystery segment: fixed €500 in solo mode
    const mystery = 500;
    _state.spinValue = mystery;
    _state.waitingForLetter = true;
    setSpinValue(`+€${mystery} per lettera`);
    showChiamaBtn(true);
    setSpinBtnEnabled(false);
    setSecondaryEnabled(true);
    showToast('MISTERIOSO! Valore fisso €500 per consonante. Chiama una lettera!');
    return;
  }

  if (typeof val === 'number') {
    const finalVal = val * _state.multiplier;
    _state.multiplier = 1; // reset after use
    _state.spinValue = finalVal;
    _state.waitingForLetter = true;
    setSpinValue(`+€${finalVal} per lettera`);
    showChiamaBtn(true);
    setSpinBtnEnabled(false);
    setSecondaryEnabled(true);
    showToast(`€${finalVal} per consonante! Chiama una lettera.`);
    return;
  }

  // Unknown segment — treat as PASSA
  loseConsonantTurn('Segmento sconosciuto — turno perso.');
}

// ─────────────────────────────────────────────────────────────
// Public action handlers
// ─────────────────────────────────────────────────────────────

const soloGame = {
  /** Called when GIRA IL CERCHIO is tapped */
  onSpin() {
    if (!_state) return;
    if (_state.waitingForLetter) {
      showToast('Chiama prima una consonante!');
      return;
    }
    // Disable spin btn while animating
    setSpinBtnEnabled(false);
    setSecondaryEnabled(false);
    showChiamaBtn(false);
    setSpinValue('...');

    animateSpin(seg => {
      handleWheelResult(seg);
    });
  },

  /** Called when CHIAMA is tapped (after a spin with numeric value) */
  onChiama() {
    if (!_state || !_state.waitingForLetter) {
      showToast('Prima gira la ruota!');
      return;
    }

    const raw = prompt('Chiama una consonante:');
    if (raw === null) return; // user cancelled
    const letter = raw.trim().toUpperCase().charAt(0);

    if (!letter || !isConsonant(letter)) {
      showToast('Inserisci una consonante valida (non vocale).');
      return;
    }
    if (_state.usedLetters.has(letter)) {
      showToast(`"${letter}" e' gia' stata chiamata!`);
      return;
    }

    _state.usedLetters.add(letter);
    renderUsedLetters();

    const count = countOccurrences(_state.phrase, letter);
    if (count === 0) {
      loseConsonantTurn(`"${letter}" non e' nella frase. Turno perso!`);
      return;
    }

    // Reveal the letter
    _state.revealed.add(letter);
    const earned = (_state.spinValue || 0) * count;
    _state.score += earned;
    _state.spinValue = null;
    _state.waitingForLetter = false;

    renderBoard();
    setScore(_state.score);
    showChiamaBtn(false);
    setSpinBtnEnabled(true);
    setSecondaryEnabled(true);
    showToast(`"${letter}" trovata ${count}x! +€${earned.toLocaleString('it-IT')} — Totale manche: €${_state.score.toLocaleString('it-IT')}`);
  },

  /** Called when Vocale €1k is tapped */
  onVowel() {
    if (!_state) return;
    if (_state.waitingForLetter) {
      showToast('Chiama prima la consonante della ruota!');
      return;
    }
    if (_state.score < VOWEL_COST) {
      showToast(`Non hai abbastanza punti per la vocale (serve €${VOWEL_COST}).`);
      return;
    }

    const raw = prompt('Chiama una vocale (A, E, I, O, U):');
    if (raw === null) return;
    const letter = raw.trim().toUpperCase().charAt(0);

    if (!letter || !isVowel(letter)) {
      showToast('Inserisci una vocale valida.');
      return;
    }
    if (_state.usedLetters.has(letter)) {
      showToast(`"${letter}" e' gia' stata chiamata!`);
      return;
    }

    _state.usedLetters.add(letter);
    _state.score -= VOWEL_COST;
    if (_state.score < 0) _state.score = 0;
    renderUsedLetters();
    setScore(_state.score);

    const count = countOccurrences(_state.phrase, letter);
    if (count > 0) {
      _state.revealed.add(letter);
      renderBoard();
      showToast(`"${letter}" trovata ${count}x nella frase!`);
    } else {
      showToast(`"${letter}" non e' nella frase. Hai speso €${VOWEL_COST} inutilmente.`);
    }
  },

  /** Called when Risolvi is tapped */
  onSolve() {
    if (!_state) return;
    const raw = prompt('Scrivi la soluzione della frase:');
    if (raw === null) return;
    const attempt = raw.trim().toUpperCase();
    const normalized = _state.phrase.toUpperCase().trim();

    if (attempt === normalized) {
      // Correct — reveal all letters and advance
      for (const ch of _state.phrase) {
        const norm = normalizeChar(ch);
        if (/^[A-Z]$/.test(norm)) _state.revealed.add(norm);
      }
      renderBoard();
      showToast(`CORRETTO! Manche completata! +€${_state.score.toLocaleString('it-IT')}`, 3000);
      setTimeout(() => advanceToNextManche(), 1500);
    } else {
      // Wrong — lose the manche score in solo
      const lost = _state.score;
      _state.score = 0;
      setScore(0);
      _state.spinValue = null;
      _state.waitingForLetter = false;
      showChiamaBtn(false);
      setSpinBtnEnabled(true);
      setSecondaryEnabled(true);
      if (lost > 0) {
        showToast(`Sbagliato! Hai perso €${lost.toLocaleString('it-IT')} della manche. Riprova!`, 3000);
      } else {
        showToast('Sbagliato! Riprova.', 2600);
      }
    }
  },
};

// ─────────────────────────────────────────────────────────────
// Public boot function
// ─────────────────────────────────────────────────────────────

/**
 * Start a solo game session.
 * @param {object} user   - authenticated user object (username, etc.)
 * @param {string} [lang] - 'it' | 'en'  (default 'it')
 */
export async function startSoloGame(user, lang = 'it') {
  _user = user;
  _hasShield = false;
  _wheelRotation = 0;
  _wheelCanvas = null;
  _wheelCtx = null;
  _wheelCacheCanvas = null;
  if (_wheelAnimId) { cancelAnimationFrame(_wheelAnimId); _wheelAnimId = null; }

  // Show the game screen via the existing router
  if (window._enterGame) {
    window._enterGame({ mode: 'solo' });
  }

  // Fetch puzzles
  const puzzleDb = await fetchPuzzles(lang);

  // Pick first phrase
  const pick = pickPhrase(puzzleDb, lang);
  if (pick.id != null) markPlayed(lang, pick.id);

  _state = freshState(pick.phrase, pick.hint || '', lang, puzzleDb);

  // Populate DOM
  setManche(1);
  setCategory(_state.hint);
  setScore(0);
  setSpinValue('—');
  showChiamaBtn(false);
  setSpinBtnEnabled(true);
  setSecondaryEnabled(true);
  renderBoard();
  renderUsedLetters();

  // Initialize wheel canvas — defer one frame so the DOM has laid out
  requestAnimationFrame(() => {
    ensureWheelCanvas();
    if (_wheelCanvas) drawMobileWheel(0);
  });

  showToast('Solitario iniziato! Gira la ruota per cominciare.');
}

export { soloGame };
