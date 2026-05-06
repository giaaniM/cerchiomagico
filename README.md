# Cerchio Magico

A fully playable Italian Wheel of Fortune clone, built as a single-page web app with a Node.js backend. Supports 2–4 local players, 5 rounds, special wheel segments, and AI-generated phrases via the Groq API.

**Live demo:** [cerchiomagico.onrender.com](https://cerchiomagico.onrender.com) *(cold-start may take ~30s on free tier)*

---

## Features

- **5-round game** with progressive scoring — partial scores per round, cumulative total
- **Canvas-rendered spinning wheel** with 24 segments, physics-based deceleration, and off-screen cache for performance
- **Special segments:** PERDITUTTO (lose all), PASSA (skip turn), SCUDO (shield blocker), RADDOPPIA (double score), MEGATURNO (express consonant round), mystery ?500 segment
- **Final round (Manche 5):** forced numeric spin, RSTLNE pre-reveal, player picks 3 consonants + 1 vowel, timed
- **AI phrase generation** via Groq API (Llama 3.3 70B) — fresh Italian phrases generated at game start, validated server-side, fallback to local database
- **Experimental mobile mode** (Socket.io) — host on desktop, players join via smartphone on local network
- **Sound effects** — spin, cash, letter reveal, win/loss cues
- **Tutorial overlay** — 5-slide interactive guide

---

## Architecture

### Frontend — ES Modules (`public/js/`)

The client is split into 14 focused modules, no bundler required (native ES modules):

| Module | Responsibility |
|---|---|
| `main.js` | Entry point — wires modules, registers event listeners |
| `state.js` | Single source of truth: `gameState`, `socketState`, shared constants |
| `game-logic.js` | Core game loop: manche lifecycle, letter calls, scoring, phrase selection |
| `wheel.js` | Canvas wheel rendering (cached offscreen), spin animation, segment definitions |
| `board.js` | Puzzle board: `splitPhraseIntoRows()` layout engine (4 rows: 12/14/14/12 chars), tile reveal |
| `ui.js` | DOM updates: wheel value display, banners, final round UI |
| `players.js` | Player list rendering, turn management, score tracking |
| `setup.js` | Home screen: player count pills, name inputs, game start |
| `express.js` | MEGATURNO mode: rapid consonant-call loop with bonus/penalty |
| `finalRound.js` | Manche 5 special logic: pre-reveal, timed play, per-tile scoring callbacks |
| `socket.js` | Socket.io client: lobby creation, state sync for mobile mode |
| `sound.js` | Web Audio API + HTML5 Audio sound manager |
| `elements.js` | Centralized DOM element refs |
| `utils.js` | `showPopup()`, `showFloatingScore()`, `sanitizePhrase()`, misc helpers |

**State machine** — `gameState.wheelPhase` drives turn flow:

```
idle → spinning → call_consonant → choose_action → express / final_play / final_decision
```

**Wheel rendering** — drawn once to an offscreen canvas (`renderWheelToCache()`), then composited each animation frame via `ctx.drawImage()`. Prevents per-frame segment recalculation. Rainbow and gold segments use `createLinearGradient`.

**Board layout** — `splitPhraseIntoRows(words, [12, 14, 14, 12])` greedily packs words into 4 rows within character limits. Phrases that don't fit are discarded at selection time.

**Final spin fix** — `isFinalSpin = gameState.currentManche === 5 && !gameState.finalSpinComplete` evaluated before the spin starts (not after, when `wheelPhase` is already `'spinning'`).

### Backend — `server.js`

Express + Socket.io server:

- **`GET /api/generate-phrases`** — calls Groq API (Llama 3.3 70B), returns 12 validated Italian Wheel of Fortune phrases. Validation: uppercase + spaces only, 27–52 chars, min 4 words, no numbers. Apostrophes are normalized server-side (`'` → space) before validation, so model output doesn't need to be perfect.
- **`POST /api/puzzle/remove`** — permanently excludes a solved phrase from future games (stored in `localStorage` client-side)
- **Socket.io namespace** — in-memory lobby Map for experimental mobile multiplayer: `create-lobby`, `join-lobby`, `start-game`, `game-state-update`, `player-action`

### AI Phrase Generation

At game start, the client calls `/api/generate-phrases`. The server sends a structured prompt to **Llama 3.3 70B via Groq**:

- Prompt instructs: hint = macrotema (can be a proper name, event, English term, historical context), phrase = a sentence that describes or completes the hint
- Server normalizes apostrophes, validates each phrase, returns the valid subset
- Client pre-loads results into `gameState.aiPhrases`; `selectPhrase()` prefers AI phrases, falls back to the local `PUZZLE_DATABASE` (90 hand-curated entries), then `OFFLINE_PHRASES`

### Phrase selection logic

```js
// 1. Try AI phrases (shuffled)
for (const puzzle of shuffle(gameState.aiPhrases)) {
    if (fits && !used && !excluded) → use it
}
// 2. Fallback: local PUZZLE_DATABASE (200 attempts)
// 3. Last resort: OFFLINE_PHRASES[0]
```

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vanilla JS (ES Modules), HTML5 Canvas, CSS custom properties |
| Backend | Node.js, Express 4, Socket.io 4 |
| AI | Groq API — Llama 3.3 70B Versatile |
| Hosting | Render (free tier) |
| Environment | dotenv |

No framework, no bundler, no TypeScript — deliberately minimal.

---

## Local Setup

```bash
# Install dependencies
npm install

# Create .env with your Groq API key
echo "GROQ_API_KEY=your_key_here" > .env

# Start
npm start
# → http://localhost:3000
```

Get a free Groq API key at [console.groq.com](https://console.groq.com). Without it, the game falls back to the local phrase database automatically.

---

## Project Structure

```
├── server.js              # Express server, Socket.io, /api/generate-phrases
├── public/
│   ├── index.html         # Main game page
│   ├── mobile.html        # Smartphone player page (experimental)
│   ├── puzzles.js         # Local phrase database (90 entries)
│   ├── game.js            # Legacy bundle (kept for reference)
│   ├── style.css          # All styles — Midnight Magic dark theme
│   └── js/                # 14 ES modules (see Architecture above)
├── scripts/
│   └── test_prompt.py     # Groq prompt tuning tool — tests phrase generation quality
└── .env                   # GROQ_API_KEY (not committed)
```
