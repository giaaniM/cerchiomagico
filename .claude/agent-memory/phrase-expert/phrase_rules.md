---
name: phrase-rules
description: Regole di formattazione e stile per le frasi del gioco MagicSpin, incluse eccezioni e casi limite
metadata:
  type: reference
---

# Regole frasi MagicSpin

---

## REGOLA ASSOLUTA — ZERO OVERLAP HINT/FRASE (CONTROLLA PRIMA DI TUTTO)

**Nessuna parola dell'hint, di qualsiasi lunghezza, può comparire nella frase.**

Questa regola vale SEMPRE, senza eccezioni, incluso Pattern B (personaggi famosi, titoli, nomi propri).

### Esempi

| Situazione | SBAGLIATO | GIUSTO |
|---|---|---|
| hint = CRISTOFORO COLOMBO | CRISTOFORO COLOMBO SCOPRÌ L AMERICA | SALPÒ DA PALOS CON TRE CARAVELLE VERSO OCCIDENTE |
| hint = TIRAMISÙ | IL TIRAMISÙ È FATTO CON SAVOIARDI | DOLCE CON SAVOIARDI BAGNATI NEL CAFFÈ AMARO |
| hint = LEONARDO DA VINCI | LEONARDO DA VINCI DIPINSE LA GIOCONDA | DIPINSE LA GIOCONDA E INVENTÒ LA MACCHINA VOLANTE |
| hint = PIZZA | LA PIZZA È NATA A NAPOLI | DISCO DI PASTA CON POMODORO E MOZZARELLA |

### Procedura di verifica obbligatoria

Prima di presentare qualsiasi frase:
1. Isola ogni parola dell'hint.
2. Controlla che nessuna di quelle parole compaia nella frase.
3. Se anche una sola parola dell'hint è presente nella frase, la frase va riscritta.

---

## Regole base obbligatorie

- Tutto MAIUSCOLO
- Apostrofi sostituiti con SPAZIO (L'UOMO → L UOMO)
- Nessuna punteggiatura (virgole, punti, esclamativi, ecc.)
- Nessun carattere speciale (@, #, &, ecc.)
- Gli accenti italiani sono permessi e corretti (È, À, Ù, Ì, Ò, É)
- Numeri scritti come cifre (80, 1492)
- Lunghezza ideale: 41-48 caratteri spazi inclusi

---

## Pattern A — Accenti su vocali standard

Gli accenti ortografici italiani vanno sempre preservati dove grammaticalmente corretti:
- Parole come CITTÀ, CAFFÈ, PERCHÉ, PERÒ, COSÌ, GIÀ, LÌ, SÌ, ECC.

---

## Pattern B — Accenti sui verbi al passato remoto (REGOLA CRITICA)

Gli accenti sui verbi al passato remoto alla terza persona singolare che terminano con vocale tonica **SONO OBBLIGATORI** per evitare ambiguità di lettura.

### Quando l'accento va messo

Il passato remoto con uscita in vocale tonica richiede accento grafico:

| Forma corretta | Forma da evitare | Ambiguità da evitare |
|---|---|---|
| PUNTÒ | PUNTO | "punto" = sostantivo o participio |
| TROVÒ | TROVO | "trovo" = presente indicativo |
| LASCIÒ | LASCIO | "lascio" = presente indicativo |
| ARRIVÒ | ARRIVO | "arrivo" = sostantivo o presente |
| PARTÌ | PARTI | "parti" = sostantivo plurale |
| TORNÒ | TORNO | "torno" = presente indicativo |
| CAPÌ | CAPI | "capi" = sostantivo plurale |
| GUARDÒ | GUARDO | "guardo" = presente indicativo |
| PARLÒ | PARLO | "parlo" = presente indicativo |
| PORTÒ | PORTO | "porto" = sostantivo o presente |
| ANDÒ | — | nessuna ambiguità, accento comunque obbligatorio |
| CADDE | — | non ambiguo, accento non necessario |

### Quando l'accento NON è necessario (passato remoto non ambiguo)

Alcune forme di passato remoto non creano ambiguità e non richiedono accento:

- DIPINSE (non esiste "dipinse" come altra forma)
- SCRISSE
- COMPOSE
- VINSE
- CORSE
- RISE
- VISSE
- NACQUE
- MORÌ (accento obbligatorio: "mori" = imperativo)

### Regola pratica

Se il passato remoto termina con una **vocale tonica** (cioè la sillaba finale è accentata nella pronuncia), l'accento grafico va sempre scritto. Se il passato remoto termina in consonante o in vocale non tonica, l'accento non serve.

---

## VARIETÀ LETTERE — Distribuzione lettere rare nel mix

Circa il **20-30% delle frasi** deve contenere almeno una parola con lettere poco frequenti (Q, Z, B, X, Y, W) oppure almeno una parola lunga (8+ caratteri). Questo rende il gioco più interessante perché alcune ruotate portano lettere sorpresa.

**Non forzare** lettere rare in ogni frase. La regola si applica al mix complessivo del batch, non a ogni singola frase.

### Parole con lettere rare che funzionano bene

- **Q:** ACQUA, SQUADRA, QUALCUNO, QUANDO, QUARANTA, QUINDICIMILA
- **Z:** ZAFFERANO, PIAZZA, RAZZA, AZZURRO, MOZZARELLA, VENEZIA, ORIZZONTE, BRONZO
- **B:** BASILICO, BRODO, BREZZA, BRAMITO, BRIVIDO, BORGO, BALCONE

Su 100 frasi: almeno 20, al massimo 30 devono contenere una parola con lettera rara o una parola di 8+ caratteri. Le restanti 70-80 frasi possono usare solo le lettere comuni (R, S, T, N, L, M, C, D, P, A, E, I, O).

---

## Mix di temi — Proporzioni obbligatorie

I personaggi famosi/storici (hint tipo PERSONAGGIO FAMOSO, PERSONAGGIO STORICO, ATLETA, ecc.) NON devono essere frequenti. Limite massimo: **10-15% del totale** (su 100 frasi, max 10-15 su personaggi).

Il restante 85-90% deve coprire temi variegati come:
- Luoghi (città, regioni, monumenti, paesi)
- Fenomeni naturali (meteo, stagioni, eventi geologici)
- Animali
- Cibo e bevande
- Situazioni di vita quotidiana
- Sport ed eventi sportivi
- Tradizioni e festività
- Oggetti e invenzioni
- Scienza e natura
- Proverbi e detti popolari
- Film, canzoni, libri, serie TV
- Espressioni comuni e modi di dire

Quando si genera un batch di frasi, verificare che la proporzione di personaggi non superi il 15%.

---

---

## STILE INDIZIO — Regola fondamentale (aggiornamento apr 2026)

La frase deve essere un **indizio specifico** che punta a UN SOLO soggetto. Non una scena generica.

**Test:** togli l'hint. La frase punta ancora a un solo soggetto? Sì → ok. No → riscrivila.

**Frasi approvate dall'utente:**
- SCOIATTOLO → PICCOLO RODITORE CHE FA SCORTA DI GHIANDE (41) ✅
- LUCIANO PAVAROTTI → LA VOCE PIU POTENTE DELL OPERA LIRICA ITALIANA (46) ✅
- 1969 NEGLI USA → TRE GIORNI DI PACE E MUSICA IN UN PRATO FANGOSO (47) ✅
- KOALA → SI AGGRAPPA AL RAMO E DORME VENTI ORE AL GIORNO (47) ✅
- MERCATO RIONALE → BANCARELLE RUMOROSE E PREZZI DA CONTRATTARE (43) ✅

**Rifiutate (troppo generiche):**
- PROFESSORE SERIO E BANCO CHE TREMA DI PAURA ❌
- PIGIAMA SOTTO E CAMICIA STIRATA IN ALTO ❌
- SLIDESHOW NOIOSO E CAFFE FREDDO SUL TAVOLO ❌

**Parole lunghe preferite (8-13 lettere, note, non desuete):** AUTOMOBILISTI, INTERMINABILI, STRAVAGANTI, AFFOLLATISSIME, INCOMPRENSIBILE, STRACOLMO, LENTISSIME.
**Parole rifiutate:** CONTIGUI (desueto), FEED (troppo di nicchia in italiano).

**MAI inserire in DB senza conferma esplicita dell'utente.**

---

## Esempi validi

```
CHI DORME NON PIGLIA PESCI
IL SIGNORE DEGLI ANELLI
L UOMO CHE SUSSURRAVA AI CAVALLI
PUNTÒ IL DITO VERSO IL CIELO
TROVÒ L ANELLO NEL POZZO
```

## Esempi non validi

```
L'UOMO CHE CAMMINAVA...    ← apostrofo + ellissi
CHE BEL PAESE!             ← punto esclamativo
PUNTO IL DITO              ← ambiguo: punto o puntò?
PIZZA, PASTA E AMORE       ← virgola
```
