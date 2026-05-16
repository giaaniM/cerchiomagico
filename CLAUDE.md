# MagicSpin (Cerchio Magico) — Game Project

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express + Socket.io |
| Frontend | Vanilla HTML/CSS/JS (ES modules) |
| Database | Supabase (PostgreSQL) — `puzzles` table |
| Hosting | Render (branch: `restyle`) |
| Analytics | Google Analytics 4 (G-KWHRW9CS9F) |

## Domain
- Production: `magicspingame.com` (custom domain on Render)
- Old: `cerchiomagico.onrender.com` → 301 redirect to new domain (in server.js)

## Project Structure

```
server.js          — Express server, Socket.io, API routes
public/
  index.html       — Main game page (all screens)
  game.js          — Legacy monolithic file (NOT used in production)
  puzzles.js       — Legacy (NOT used)
  js/
    main.js        — Entry point (ES module), wires all modules
    lang.js        — i18n system: t(), setLang(), applyTranslations()
    state.js       — Shared game state and constants
    game-logic.js  — Core game flow: consonants, vowels, solving, manches
    ui.js          — UI updates, popups, ranking, win screen
    board.js       — Game board tiles
    wheel.js       — Wheel canvas rendering and spin logic
    players.js     — Player list rendering, passTurn()
    setup.js       — Setup screen: player count, name inputs
    socket.js      — Socket.io client for multiplayer (smartphone mode)
    elements.js    — DOM element references
    utils.js       — Shared utilities (showPopup, showMessage, etc.)
    express.js     — Megaturno (express) mode logic
    finalRound.js  — Manche 5 (final round) logic
    sound.js       — Sound effects
    mobile-layout.js — Mobile layout detection
  assets/
    og-image.png   — Open Graph image 1200x630 (Facebook/WhatsApp)
    og-image.svg   — Source SVG for og-image
  mobile.html      — Mobile controller page (smartphone mode)
  privacy.html     — Privacy policy
  sitemap.xml      — SEO sitemap
  robots.txt       — SEO robots
```

## i18n System

- All UI strings use `t('key')` from `lang.js`
- HTML static elements use `data-i18n="key"` or `data-i18n-html="key"` attributes
- `applyTranslations()` updates all elements on language change
- Auto-detects language from `localStorage` → `navigator.language` → default `it`
- Toggle button (🇬🇧/🇮🇹) in quick-actions bar calls `setLang()` + `loadPuzzles()`
- Logo changes: IT = "CERCHIO MAGICO", EN = "MAGICSPIN"

## Database (Supabase)

Table: `puzzles`
- `id` (bigint PK)
- `hint` (text) — category label
- `phrase` (text) — uppercase, accents stripped, apostrophes as space
- `active` (boolean, default true)
- `lang` (text, default 'it') — 'it' or 'en'
- `created_at` (timestamptz)

API: `GET /api/puzzles?lang=it|en` — returns active phrases for given language.

⚠️ RLS is disabled on `puzzles` table — anyone with anon key can read/write.

## Game Rules (brief)
- 5 manches, players take turns
- Spin wheel → get value → call consonant → earn value × occurrences
- Buy vowel costs €1000
- Special segments: CROLLO (bankrupt), PASSA (skip), MEGATURNO (express mode), SCUDO (shield), RADDOPPIA (double), mystery (?500)
- Manche 5: final round, spin once for fixed value per consonant
- Highest total score after 5 manches wins

## Deploy
- Render auto-deploys on push to `restyle` branch
- Environment vars needed: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PORT`
- Start command: `node server.js`
