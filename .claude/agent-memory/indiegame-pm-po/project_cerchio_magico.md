---
name: Progetto Cerchio Magico
description: Stato attuale del gioco — nome, URL, infrastruttura, SEO, funzionalità chiave
type: project
---

**Nome gioco:** Cerchio Magico
**URL live:** https://cerchiomagico.onrender.com
**Piattaforma hosting:** Render (free tier, presumibilmente)
**Stack:** Node.js/Express backend (server.js), frontend HTML/CSS/JS puro nella cartella /public

**SEO — stato al 2026-05-07:**
- Google Search Console aggiunto ieri (2026-05-06), file di verifica presente (google066ef04112dcac44.html)
- Meta tag title, description, keywords presenti in index.html
- sitemap.xml presente e corretta (URL: https://cerchiomagico.onrender.com/sitemap.xml)
- robots.txt presente e corretto, punta alla sitemap
- Schema.org VideoGame implementato in JSON-LD
- OG tags e Twitter card presenti
- Canonical URL impostato
- Valerio non sa ancora come usare Search Console — non ha sottomesso la sitemap, non sa leggere le metriche

**Funzionalità gioco:**
- 2-5 giocatori locali, turni alternati
- Modalità smartphone come controller (sperimentale)
- 5 manche, ruota con 26 spicchi
- Spicchi speciali: PERDITUTTO, PASSA, RADDOPPIA, MEGATURNO (EXPRESS mode), SCUDO, ?500
- Manche finale (final round)
- Vocali a €500
- Categoria mostrata ("hint")

**Groq API:**
- Già integrata nel server ma non attiva (frasi ancora statiche da puzzles.js)
- Strategia consigliata: generazione batch notturna (non real-time) quando si raggiungono 200-300 DAU sostenuti
- Soglia economica reale: ~$1/mese a 1.000 DAU con generazione real-time — problema non è costo ma latenza e rate limit
- Mai generare real-time per ogni partita; usare caching aggressivo

**Marketing — canali prioritari identificati (2026-05-15):**
- P0: Reddit (r/italy, r/webgames, r/indiegaming), Facebook groups famiglie/giochi
- P1: Itch.io (pubblicare anche lì), Product Hunt, TikTok/Reels gameplay
- P2: Directory browser games (Lagged.com, GameDistribution)

**SEO/Google — stato al 2026-05-15:**
- Sitemap NON ancora sottomessa in Search Console (da fare subito)
- Sitelinks Google: nessuno ancora — arrivano con traffico organico > 50-200 click/giorno
- Schema Organization con logo NON ancora aggiunto (necessario per logo nei risultati)
- OG image: presente negli OG tag ma dimensioni/esistenza non verificate (deve essere 1200x630px minimo)

**Why:** Contesto necessario per consigliare SEO, monetizzazione e roadmap in modo specifico per questo gioco.
**How to apply:** Ogni consiglio su SEO/monetizzazione/distribuzione va calibrato su questo specifico URL, stack e funzionalità.
