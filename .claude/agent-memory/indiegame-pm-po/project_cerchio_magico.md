---
name: Progetto Cerchio Magico
description: Stato attuale del gioco — nome, URL, infrastruttura, SEO, funzionalità chiave
type: project
---

**Nome gioco:** Cerchio Magico (EN: MagicSpin)
**URL live:** https://magicspingame.com
**Piattaforma hosting:** Render — con Uptime Robot attivo = server SEMPRE online, nessun cold start
**Stack:** Node.js + Express + Socket.io + Supabase (PostgreSQL)

**SEO — stato al 2026-05-21:**
- Google Search Console presente, sitemap NON ancora sottomessa (azione urgente)
- Meta tag, OG tags, Twitter card, Schema.org VideoGame JSON-LD, robots.txt: tutti presenti
- Canonical URL: https://magicspingame.com
- Redirect 301: cerchiomagico.onrender.com → magicspingame.com (in server.js)
- SEO organic quasi zero (2 Google, 2 Bing in 28 giorni) — dominio nuovo, indicizzazione in corso

**Funzionalità gioco (stato aggiornato 2026-05-21):**
- Modalità **1 giocatore** (Solitario a tempo — timer visibile, punteggio finale, classifica globale)
- Modalità **2-5 giocatori** locali, turni alternati
- Modalità **smartphone come controller** (sperimentale, Socket.io)
- 5 manche, ruota con spicchi multipli
- Spicchi speciali: **CROLLO** (non "Perditutto"), PASSA, RADDOPPIA, MEGATURNO (express mode), SCUDO, ?500
- Manche finale (final round — manche 5 con meccaniche speciali)
- **Vocali costano €1.000** (non €500)
- Categoria/indizio mostrato ("hint") sopra la board
- **Classifica globale**: top 8 + finestra posizione personale, tab Solo/Torneo, highlight nome proprio
- Frasi dal DB Supabase (270 frasi IT attive + EN), con accenti italiani corretti (DIVENTÒ, PIÙ, ecc.)
- i18n italiano/inglese con toggle lingua

**Database frasi:**
- Frasi caricate da Supabase (tabella `puzzles`): 270 IT attive, frasi EN presenti
- Formato: hint = soggetto breve, phrase = descrizione lunga da indovinare (25-55 caratteri), accenti italiani corretti
- Frasi generate manualmente + con agente AI — NON usare Groq real-time
- Frasi disattivate (active=false) vengono eliminate periodicamente

**Analytics GA4 — snapshot 23 apr–20 mag 2026 (28 giorni) — DATI AGGIORNATI:**
- Utenti attivi: 332, Nuovi utenti: 331 (99,7% nuovi — retention quasi zero)
- Durata media coinvolgimento: 2m 39s (in calo rispetto al dato precedente di ~10 min — possibile cambio di audience o bounce precoce)
- Conteggio eventi: 1.800
- Canali: Direct ~217 sessioni, Facebook referral ~226 sessioni totali (lm/l/m/facebook), Organic Search 7 sessioni Google + 5 Reddit
- Picco traffico 3-10 maggio, poi calo netto
- Bounce rate pagina principale: 90,4% — critico
- Città anomale: Aspen, Council Bluffs, San Jose (USA) — probabili bot/crawler, ~24 utenti sospetti
- Traffico Facebook: 60% del totale — dipendenza alta da un singolo canale non sostenibile
- SEO organic: praticamente zero (2 Google, 2 Bing in 28 giorni)

**Dominio aggiornato (2026-05-19):**
- Produzione: magicspingame.com (custom domain su Render)
- Redirect 301 da cerchiomagico.onrender.com a magicspingame.com (in server.js)
- Stack: Node.js + Express + Socket.io (non Next.js — correzione rispetto a memoria precedente)

**Marketing — canali prioritari identificati (2026-05-15/aggiornato 2026-05-16):**
- P0: Reddit (approccio indiretto: commenti + valore prima del link), Facebook groups famiglie/giochi
- P1: TikTok/Instagram Reels/YouTube Shorts (gameplay clip), Itch.io, community italiane (Discord, forum)
- P2: Directory browser games (Lagged.com, GameDistribution, Newgrounds), newsletter indie
- Reddit: link rimossi quasi ovunque — strategia workaround necessaria (partecipare prima, linkare solo se rilevante o con flair corretto)
- Primo traffico reale arrivato da post Facebook

**SEO/Google — stato al 2026-05-15:**
- Sitemap NON ancora sottomessa in Search Console (da fare subito)
- Sitelinks Google: nessuno ancora — arrivano con traffico organico > 50-200 click/giorno
- Schema Organization con logo NON ancora aggiunto (necessario per logo nei risultati)
- OG image: presente negli OG tag ma dimensioni/esistenza non verificate (deve essere 1200x630px minimo)

**Struttura partita solitario (corretta 2026-05-21):**
- `SOLO_ROUNDS = 3` in solo.js — 3 manche, 1 frase per manche = 3 frasi totali (manche ≡ frase nel solitario)
- Frasi descrittive lunghe (25-55 car), 1 per manche
- Proposta in discussione: ridurre a 1 manche (1 sola frase) = partita oneshot rapidissima, fine partita con classifica + condividi + pub + NUOVA PARTITA

**Punteggio cumulativo tra sessioni:**
- Scartato per ora: richiede login/account, troppo complesso
- Alternativa leggera: streak giornaliero in localStorage (no account necessario)

**Retention — stato analisi (2026-05-21):**
- Record personale solo in localStorage (fragile, no cross-device)
- Classifica globale top 8 presente — manca leva emotiva nel messaggio di fine partita
- Azioni raccomandate: messaggio fine partita con delta classifica + "Riprova" prominente, streak giornaliero localStorage, Daily Challenge
- NO account utente fino a 500+ utenti attivi mensili

**SEO — diagnosi blocco (2026-05-21):**
- Causa principale: zero backlink da siti terzi verso magicspingame.com
- Dominio nuovo in possibile "sandbox" Google (< 6-12 mesi)
- Keyword "ruota della fortuna online" troppo competitiva per dominio nuovo
- Azioni P0: sitemap in Search Console, itch.io per backlink, keyword coda lunga
- Azioni P1: testo HTML indicizzabile nella pagina (i giochi web spesso mancano di testo crawlabile)
- Obiettivo realistico: da 2 a 20 click/giorno in 2-3 mesi

**Strategia piattaforme — decisione maggio 2026:**
- Direzione confermata: porting su app mobile tramite **Capacitor** (WebView wrapper — non riscrittura)
- PWA scartata: notifiche push su iOS inaffidabili, boomer non sanno installare PWA da Safari
- React Native / Flutter scartati: riscrittura troppo costosa
- Codice condiviso al 60-70%: backend/Supabase/logica gioco condivisi, notifiche e store pipeline separati
- Notifiche push via **OneSignal** (gratuito fino a 10k subscriber) — killer feature per boomer
- Tempi realistici store: 10-14 settimane dalla decisione al live su entrambi gli store
- Apple Developer Program: 99$/anno — prerequisito iOS, da attivare prima di Capacitor
- Socket.io multiplayer "smartphone come controller" a rischio in ambiente app — possibile "web only" per v1
- Due pubblici (boomer/giovani) = un solo prodotto, due messaggi: boomer → app, giovani → web da proiettare su TV
- AirPlay/Chromecast come messaggio marketing non ancora sfruttato
- Email list "avvisami al lancio app" da costruire subito nella win screen
- Daily Challenge: feature prioritaria sia per web retention che per notifiche push app

**Roadmap fasi:**
- Fase 0 (now): sitemap GSC, testo HTML indicizzabile, Itch.io, email list waitlist app, Daily Challenge
- Fase 1 (sett 3-6): Capacitor setup, notifiche push, test dispositivi reali
- Fase 2 (sett 7-10): Store submission (Play Store prima, App Store dopo)
- Fase 3 (sett 11+): Cross-promotion web ↔ app, campagna Facebook post-launch

**Why:** Contesto necessario per consigliare SEO, monetizzazione e roadmap in modo specifico per questo gioco.
**How to apply:** Ogni consiglio su SEO/monetizzazione/distribuzione va calibrato su questo specifico URL, stack e funzionalità. Per il porting app, riferirsi sempre a Capacitor come tecnologia scelta.
