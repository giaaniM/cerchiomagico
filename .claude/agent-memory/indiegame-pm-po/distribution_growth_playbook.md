---
name: distribution-growth-playbook
description: Checklist operative per le 4 fasi di crescita MagicSpin — distribuzione, retention, AdSense, Google Ads
metadata:
  type: project
---

Piano operativo elaborato mag 2026 basato su 4 task di crescita per fasi.

## Fase 1 — <50 utenti/giorno: Distribuzione gratuita

**Facebook:** Gruppi target italiani: "Giochi da tavolo Italia", "Quiz e Indovinelli Italiani", "Indovinelli e Giochi di Parole", "Giochi in famiglia", "Cruciverba e Parole Crociate", "Maestre e Maestri d'Italia". Strategia: post "indovina la parola" (screenshot board parziale), link in commento di risposta (non nel post). Frequenza: 2-3/settimana.

**Itch.io:** Pubblicare con redirect a magicspingame.com. Titolo: "MagicSpin — Ruota delle Parole". Tags: word-game, italian, puzzle, multiplayer, browser-game, family. Descrizione 200+ parole per SEO. Pricing: Free.

**Piattaforme distribuzione (priorità):**
- T1 da fare subito: GameDistribution.com (royalty mensili, richiede versione standalone), Lagged.com (developers@lagged.com), GameFlare.com
- T2 quando hai tempo: Newgrounds, Silvergames (games@silvergames.com), Miniplay.com
- T3 evita: Kongregate (morente), Poki.com (soglia milioni di play)

**Ostacolo tecnico GameDistribution:** il gioco fa chiamate a Supabase — serve versione standalone con frasi embedded o CORS configurato.

## Fase 2 — 50-100 utenti/giorno: Retention + Email list

**Daily Challenge (spec prodotto minima):**
- Una frase al giorno uguale per tutti, selezione manuale da Supabase
- Entry point distinto in home: pulsante "SFIDA DEL GIORNO" con data
- Una sola partita/giorno (flag localStorage `daily_challenge_YYYY-MM-DD`)
- Classifica giornaliera che si azzera a mezzanotte
- Bottone condivisione risultato con testo pre-compilato per WhatsApp/Facebook
- v1 NO notifiche push, NO email automatiche, NO streak counter

**Mailchimp free tier:**
- Fino a 500 contatti / 1.000 email/mese
- Account separato (es. magicspin@gmail.com)
- Form: solo email, double opt-in per GDPR
- Usare link diretto form invece di embed per semplicità
- Email: max 1/settimana — solo "sfida settimanale" e annunci nuove feature

**Copy popup (Versione A — post-vittoria):**
"Brava! Vuoi la sfida di lunedì? / Ogni lunedì una nuova frase per tutta la settimana. / [email] [PARTECIPO GRATIS] / Zero spam."
Popup con X visibile — mai intrappolare l'utente.

## Fase 3 — 200+ utenti/giorno: AdSense

**Network: Google AdSense** (inizia qui). Alternative: Playwire (>50k PV/mese), Media.net (backup).

**Placement (priorità ordine):**
1. Rewarded ad dopo CROLLO ("guarda video per salvare punteggio") — CPM 5-15€
2. Interstitial tra manche 2→3, max 1/sessione — CPM ~4€
3. Banner 300x600 laterale desktop only — CPM ~1,50€
4. Banner 320x50 footer mobile — CPM ~1€

**Revenue realistica IT:**
- 200 utenti/gg → 9-18€/mese
- 500 utenti/gg → 22-45€/mese
- 1.000 utenti/gg → 45-90€/mese

**Alternativa freemium a 500+ utenti/gg:** "Senza pubblicità" a 1,99€/mese. 2% conversione = parità con ads.

## Fase 4 — Retention D7 >20%: Google Ads

**Keyword primarie IT:** "ruota della fortuna online gratis" (CPC 0,60-1,50€), "ruota della fortuna gioco" (0,50-1,20€), "gioco ruota delle parole" (0,20-0,60€), "gioco di parole gratis browser" (0,15-0,40€).

**Negative keywords:** "ruota della fortuna tv", "streaming", "Gerry Scotti", "download", "torrent", "app android".

**Budget test:** 25€ totali (3,50€/giorno × 7 giorni). Solo Search, no Display/PMax. CPC manuale 0,60€ max. Geo: solo Italia. Bidding smart solo dopo 50+ conversioni.

**Soglie "scala":** CTR >5%, CPC <0,80€, bounce <60%, sessione >5min, completamento partita >30%. Stop se CPC >1,20€ con bounce >75%.

**Why:** Piano costruito sui dati analytics reali mag 2026 (209 utenti/28gg, retention 0%). Ogni fase ha prerequisiti misurabili prima di passare alla successiva.
**How to apply:** Usare come riferimento operativo nelle conversazioni sulle fasi di crescita. Aggiornare quando una fase viene completata o i dati cambiano.
