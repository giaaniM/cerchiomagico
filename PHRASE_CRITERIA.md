# MagicSpin — Phrase Quality Criteria & Creation Guidelines

> Based on analysis of the live Supabase dataset: **222 active Italian phrases** and **90 active English phrases** (as of May 2026).

---

## Table of Contents

1. [Italian Phrase Analysis](#1-italian-phrase-analysis)
2. [English Phrase Analysis](#2-english-phrase-analysis)
3. [Italian vs. English: Comparison & Gaps](#3-italian-vs-english-comparison--gaps)
4. [Quality Criteria for a Good Phrase](#4-quality-criteria-for-a-good-phrase)
5. [Creation Guidelines — Italian](#5-creation-guidelines--italian)
6. [Creation Guidelines — English](#6-creation-guidelines--english)
7. [What to Avoid](#7-what-to-avoid)
8. [Quick Reference Checklist](#8-quick-reference-checklist)

---

## 1. Italian Phrase Analysis

### 1.1 Volume & Activity

| Status | Count |
|---|---|
| Total rows | 246 |
| Active | 222 |
| Inactive (deactivated) | 24 |

The inactive set includes duplicates (e.g. two CINQUE TERRE, two DOLOMITI, two PORTOFINO, two LA VALLE DEI TEMPLI entries) and some that were likely superseded by better versions. Deactivating is preferred over deleting — good practice.

### 1.2 Category System (Italian)

Italian uses **specific, per-phrase hints** rather than broad genre labels. Each hint is the name of the topic the phrase describes. This is the defining structural difference from the English set.

Examples of hint types found:
- Named person: `DANTE ALIGHIERI`, `MARIE CURIE`, `GALILEO GALILEI`, `NAPOLEONE`
- Named food/dish: `CARBONARA`, `TIRAMISÙ`, `CANNOLI SICILIANI`, `RAGÙ ALLA BOLOGNESE`
- Named place: `VENEZIA`, `CINQUE TERRE`, `CAPRI`, `COLOSSEO`
- Named event/institution: `FESTIVAL DI SANREMO`, `PALIO DI SIENA`, `CARNEVALE DI VENEZIA`
- Named film/character: `FANTOZZI`, `FORREST GUMP`, `INDIANA JONES`, `PINOCCHIO`
- Italian proverb/saying: `CHI DORME NON PIGLIA PESCI`, `NON TUTTE LE CIAMBELLE`, `OGNI LASCIATA È PERSA`
- Everyday life scenario: `CODA AL SUPERMERCATO`, `RIUNIONE DI LAVORO`, `LUNEDÌ MATTINA`, `DIETA`
- Science/nature: `BUCHI NERI`, `FISICA QUANTISTICA`, `DNA`, `DARWIN`
- Animals: `DELFINI`, `ELEFANTI`, `COCCODRILLI`, `PIPISTRELLI`, `SQUALI`

This "hint = the answer" structure is **intentional and excellent** for Wheel of Fortune: the hint gives the player a clear frame, making the phrase immediately recognizable once guessed, while still being non-trivial to uncover letter by letter.

### 1.3 Phrase Length Distribution

Sampling across the active Italian set:

**Short phrases (20–35 characters, ~4–6 words):**
- `ANFITEATRO CHE RACCONTA LA STORIA ROMANA` (41 chars, 6 words) — COLOSSEO
- `PAUSA VELOCE APPOGGIATI AL BANCONE DEL BAR` (43 chars, 7 words) — ESPRESSO
- `IL RUMORE DELLE ONDE SULLO SCOGLIO` (35 chars, 6 words) — IL MARE (inactive)

**Medium phrases (36–55 characters, ~6–9 words) — the sweet spot:**
- `PASTE TRADIZIONALE CON PECORINO E GUANCIALE` (44 chars, 6 words) — CARBONARA
- `QUATTRO RAGAZZI DI LIVERPOOL CAMBIARONO LA MUSICA` (50 chars, 7 words) — I BEATLES
- `INGHIOTTONO TUTTO PERSINO LA LUCE CHE VI ENTRA` (47 chars, 7 words) — BUCHI NERI
- `ARMSTRONG POGGIÒ IL PIEDE SUL SUOLO LUNARE` (43 chars, 6 words) — LA LUNA

**Long phrases (56–75 characters, ~9–13 words):**
- `PUBBLICITÀ IN RIMA CHE MANDAVANO I BAMBINI A LETTO` (51 chars, 9 words) — CAROSELLO
- `Fleming LA SCOPRÌ PER CASO SU UNA MUFFA` (41 chars, 8 words) — PENICILLINA
- `INGHIOTTONO TUTTO PERSINO LA LUCE CHE VI ENTRA` — BUCHI NERI

**Very long (75+ characters, 12+ words):**
- `BISOGNA ALZARSI PRESTO PER COGLIERE LE OCCASIONI` (49 chars, 8 words) — CHI DORME NON PIGLIA PESCI
- `VISIBILE DALLO SPAZIO OSPITA MIGLIAIA DI SPECIE` (48 chars, 7 words) — LA BARRIERA CORALLINA

**Observed range:** ~30–65 characters (excluding spaces), 5–11 words. The median lands around **7–8 words / 45–55 characters with spaces**.

### 1.4 Thematic Clusters (Italian)

Grouping by theme (hints map 1-to-1 to phrases, so themes must be inferred):

| Theme | Approx. count (active) | Examples |
|---|---|---|
| Italian food & drink | ~22 | CARBONARA, TIRAMISÙ, BRUSCHETTA, ARANCINI, PIZZA NAPOLETANA, RAGÙ ALLA BOLOGNESE, BABA AL RUM, CANNOLI SICILIANI, SFOGLIATELLA, POLENTA, GNOCCHI, LASAGNA, PARMIGIANO REGGIANO, PROSCIUTTO DI PARMA, ACETO BALSAMICO, RISOTTO ALLO ZAFFERANO, ESPRESSO, COLAZIONE ITALIANA, PROSCIUTTO E MELONE, SALTIMBOCCA, GELATO ARTIGIANALE, CAFFE SOSPESO |
| Italian geography / landmarks | ~18 | VENEZIA, CINQUE TERRE, CAPRI, DOLOMITI, NAPOLI, SICILIA, COSTIERA AMALFITANA, PORTOFINO, COLOSSEO, PALIO DI SIENA, PIAZZA NAVONA, LA SCALA DI MILANO, SAN SIRO, SPACCANAPOLI, VESUVIO, LA VALLE DEI TEMPLI, VIA APPIA, CARNEVALE DI VENEZIA |
| Historical figures (Italian focus) | ~16 | DANTE ALIGHIERI, GALILEO GALILEI, MICHELANGELO, LEONARDO DA VINCI, GARIBALDI (inactive), CRISTOFORO COLOMBO, GIULIO CESARE, PAVAROTTI, SOFIA LOREN, ALBERTO SORDI, TOTÒ, ROBERTO BENIGNI, FEDERICO FELLINI, SERGIO LEONE, MARCO POLO, PIERO DELLA FRANCESCA |
| Science & nature (general) | ~14 | BUCHI NERI, DNA, FISICA QUANTISTICA, DARWIN, EINSTEIN, HUBBLE, IL BIG BANG, ISAAC NEWTON, NICOLA TESLA, MARIE CURIE, AMAZZONIA, ISLANDA, LA BARRIERA CORALLINA, DOLOMITI (geology) |
| Animals | ~9 | DELFINI, ELEFANTI, COCCODRILLI, PIPISTRELLI, SQUALI, FENICOTTERO, POLPI, PIOVRE, GATTO |
| Sports | ~14 | FORMULA UNO, GIRO D ITALIA, CALCIO DI RIGORE, PARTITA DI CALCIO, VALENTINO ROSSI, MARCO PANTANI, MICHAEL JORDAN, MESSI, MIKE TYSON, ATLETICA, TENNIS, RUGBY, PALLACANESTRO, OLIMPIADI |
| Italian everyday life / humor | ~12 | CODA AL SUPERMERCATO, RIUNIONE DI LAVORO, LUNEDÌ MATTINA, DIETA, BOLLETTA, CELLULARE SCARICO, TRAFFICO, IKEA, BUROCRAZIA, SVEGLIA, TELECOMANDO, GITA FUORIPORTA |
| Mythology & legend | ~8 | ACHILLE, ERCOLE, ULISSE, MINOTAURO, ATLANTIDE, GIULIO CESARE, SPARTACO, LE AMAZZONI |
| Film, TV, pop culture | ~10 | FANTOZZI, TOTO E PEPPINO, CAROSELLO, STRISCIA LA NOTIZIA, GRANDE FRATELLO, MAMMA HO PERSO L AEREO, CHI HA INCASTRATO ROGER RABBIT, DOMENICA IN, INDIANA JONES, JAMES BOND |
| Italian proverbs / sayings | ~6 | CHI DORME NON PIGLIA PESCI, NON TUTTE LE CIAMBELLE, OGNI LASCIATA È PERSA, MOGLIE E BUOI DEI PAESI TUOI, RIDE BENE CHI RIDE ULTIMO, IL DADO È TRATTO |
| World history & events | ~7 | BERLINO, HIROSHIMA, CLEOPATRA, MARIE ANTOINETTE, GENGIS KHAN, LA BASTIGLIA, I VICHINGHI |

### 1.5 What Makes Italian Phrases Work

**The hint IS the topic, not the genre.** A player reading `CARBONARA` as hint knows the phrase describes carbonara — the challenge is figuring out which specific description. This creates the ideal Wheel of Fortune tension.

**The phrase describes the hint from the outside.** It's never a tautology. `PASTA TRADIZIONALE CON PECORINO E GUANCIALE` tells you something true and specific about carbonara without saying "carbonara". Once a few letters appear, the phrase clicks instantly.

**Strong verbs and concrete nouns dominate.** Phrases rarely use vague or abstract language. Compare:
- GOOD: `INGHIOTTONO TUTTO PERSINO LA LUCE CHE VI ENTRA` (concrete, specific, evocative)
- WEAK: `UN CONCETTO MOLTO INTERESSANTE E IMPORTANTE` (abstract, no grip)

**Cultural self-awareness.** Italian phrases celebrate Italian identity (food, cities, customs, icons) while also including universal culture. Roughly 40% of phrases are Italian-specific, 60% are more universal.

**Humor and everyday frustration.** Several phrases capture shared Italian experiences with light irony:
- `COMINCIA SEMPRE IL LUNEDÌ E FINISCE A CENA` — DIETA
- `POTEVA ESSERE UNA EMAIL DI TRE RIGHE` — RIUNIONE DI LAVORO
- `L ALTRA FILA AVANZA SEMPRE PIÙ IN FRETTA` — CODA AL SUPERMERCATO
- `PROPRIO QUANDO HAI BISOGNO ARRIVA IL DIECI` — CELLULARE SCARICO

These are among the best phrases in the set because every Italian instantly recognizes the experience.

**Memorable facts, not encyclopedia.** Science and history phrases work best when they include a surprising or counterintuitive detail:
- `COMPOSE LA NONA SINFONIA GIÀ COMPLETAMENTE SORDO` — BEETHOVEN (the deafness angle is memorable)
- `CONSERVATO PER MILLENNI NON VA MAI A MALE` — MIELE (now inactive, but a great fact)
- `NACQUE COME RETE MILITARE NEGLI STATI UNITI` — INTERNET

---

## 2. English Phrase Analysis

### 2.1 Volume

| Status | Count |
|---|---|
| Total rows | 90 |
| Active | 90 |
| Inactive | 0 |

### 2.2 Category System (English)

English uses **6 broad genre labels** (plus 1 singleton):

| Category | Count | % of set |
|---|---|---|
| Movie | 20 | 22% |
| Proverb | 19 | 21% |
| Phrase | 15 | 17% |
| Song | 15 | 17% |
| Famous Quote | 10 | 11% |
| Place | 10 | 11% |
| Saying | 1 | 1% |

This is a **fundamentally different structural approach** from Italian. The hint gives the genre, not the topic. A player sees `Movie` and knows the answer is a movie title. This is closer to the American TV show format.

### 2.3 Phrase Length Distribution (English)

**Very short (under 15 characters):**
- `IMAGINE` (7 chars, 1 word) — Song
- `YESTERDAY` (9 chars, 1 word) — Song
- `TITANIC` (7 chars, 1 word) — Movie
- `INCEPTION` (9 chars, 1 word) — Movie
- `GOODFELLAS` (10 chars, 1 word) — Movie
- `THRILLER` (8 chars, 1 word) — Song
- `BORN TO RUN` (11 chars, 3 words) — Song
- `BREAK A LEG` (11 chars, 3 words) — Phrase

**Medium (15–35 characters):**
- `THE DARK KNIGHT` (15 chars)
- `THE LION KING` (13 chars)
- `NO PAIN NO GAIN` (15 chars)
- `LIVE AND LET LIVE` (17 chars)
- `MACHU PICCHU` (12 chars)
- `BETTER LATE THAN NEVER` (22 chars)

**Long (35+ characters):**
- `THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG` (44 chars, 9 words)
- `THE GRASS IS ALWAYS GREENER ON THE OTHER SIDE` (46 chars, 9 words)
- `TO BE OR NOT TO BE THAT IS THE QUESTION` (39 chars, 10 words)
- `WITH GREAT POWER COMES GREAT RESPONSIBILITY` (43 chars, 6 words)
- `DONT COUNT YOUR CHICKENS BEFORE THEY HATCH` (43 chars, 7 words)

The distribution is **far more skewed toward very short phrases** than the Italian set. Single-word entries like `IMAGINE`, `YESTERDAY`, `TITANIC`, `INCEPTION`, `GOODFELLAS`, `THRILLER` are problematic for Wheel of Fortune gameplay (see Section 3).

---

## 3. Italian vs. English: Comparison & Gaps

### 3.1 Structural Difference (by design or by accident?)

| Dimension | Italian | English |
|---|---|---|
| Hint type | Topic/subject (e.g. "CARBONARA") | Genre (e.g. "Movie") |
| Phrase content | Descriptive sentence about the topic | The title/text itself |
| Avg. phrase length | ~45–55 chars with spaces | ~20–35 chars with spaces |
| Min phrase length | ~25 chars | 7 chars (IMAGINE) |
| Single-word phrases | 0 | 5 (IMAGINE, YESTERDAY, TITANIC, INCEPTION, GOODFELLAS, THRILLER) |

The Italian design is **strictly better** for Wheel of Fortune. When the hint is a genre, the player can solve the puzzle on category alone (e.g. everyone knows "TITANIC" is a film). A one-word film title is essentially a trivia question, not a word puzzle. The Italian approach of writing a descriptive sentence about the topic creates genuine letter-guessing gameplay.

### 3.2 Flagged Issues in the English Set

**CRITICAL — Too short / single word (unsolvable as WoF puzzles):**
- `IMAGINE` (7 chars) — Song: a single word. As soon as vowels are bought it's over.
- `YESTERDAY` (9 chars) — Song
- `TITANIC` (7 chars) — Movie
- `INCEPTION` (9 chars) — Movie
- `GOODFELLAS` (10 chars) — Movie
- `THRILLER` (8 chars) — Song
- `BORN TO RUN` (11 chars) — Song: only 3 words, trivially short
- `BREAK A LEG` (11 chars) — Phrase: too short, solved in 2 guesses
- `MACHU PICCHU` (12 chars) — Place: 2 words, no gameplay
- `PURPLE RAIN` (11 chars) — Song

**SIGNIFICANT — Borderline short (12–18 chars, 2–3 words):**
- `THE DARK KNIGHT` (15 chars)
- `PULP FICTION` (12 chars)
- `FORREST GUMP` (12 chars)
- `THE MATRIX` (10 chars)
- `THE LION KING` (13 chars)
- `HOME ALONE` (10 chars)
- `NIAGARA FALLS` (13 chars)
- `MOUNT EVEREST` (13 chars)
- `WHY SO SERIOUS` (14 chars)
- `JUST KEEP SWIMMING` (18 chars)
- `LIVE AND LET LIVE` (17 chars)
- `NO PAIN NO GAIN` (15 chars)

**MINOR — Category overlap causing confusion:**
- `Phrase` and `Saying` are nearly identical categories. `A PICTURE IS WORTH A THOUSAND WORDS` is in `Saying` (only 1 entry) while everything else is in `Phrase`. This creates an orphan category. Merge `Saying` into `Proverb` or `Phrase`.

**MINOR — Apostrophe inconsistency:**
- `DONT COUNT YOUR CHICKENS BEFORE THEY HATCH` — apostrophe dropped (correct per DB rules)
- `DONT STOP BELIEVIN` — same. Consistent.
- `SCHINDLERS LIST` — apostrophe dropped. Consistent.
- `THE APPLE DOESNT FALL FAR FROM THE TREE` — consistent.
- This is correct behavior (phrase rules strip apostrophes), but worth noting for new contributors.

**MINOR — Missing cultural categories:**
English has no equivalents of the Italian everyday-life humor category, no science/nature phrases, no animal fact phrases. The set is very pop-culture-heavy (movies, songs, proverbs). This limits variety within a single game session.

**MINOR — Famous Quote vs. Proverb overlap:**
Some `Famous Quote` entries are more proverb-like (e.g. `WITH GREAT POWER COMES GREAT RESPONSIBILITY`), and some `Proverb` entries are well-known enough to be "famous quotes." The boundary is unclear.

### 3.3 What the English Set Does Well

- Proverbs and idioms category is solid: 19 well-known entries, good length, genuinely challenging
- `THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG` and `THE GRASS IS ALWAYS GREENER ON THE OTHER SIDE` are excellent: long, common, but not trivial to guess
- `TO BE OR NOT TO BE THAT IS THE QUESTION` is ideal — recognizable but long enough for gameplay
- `DONT COUNT YOUR CHICKENS BEFORE THEY HATCH` — great length and universally known

---

## 4. Quality Criteria for a Good Phrase

These criteria apply to both languages but are derived primarily from the Italian set which is richer and better calibrated.

### 4.1 Length

| Rating | Character count (with spaces) | Word count | Verdict |
|---|---|---|---|
| Too short | < 20 chars | < 4 words | Reject |
| Borderline | 20–30 chars | 4–5 words | Accept only if very strong |
| Good | 30–55 chars | 5–9 words | Target range |
| Long | 55–70 chars | 9–12 words | Acceptable, may feel slow |
| Too long | > 70 chars | > 12 words | Reject — board becomes unwieldy |

**Minimum hard rule: no phrase under 4 words or 20 characters.**

### 4.2 Recognizability

The phrase, once revealed, must create an "aha" moment. Players should finish a game saying "oh of course!" not "who?". Test: would a typical Italian adult (for IT phrases) or an average English speaker (for EN phrases) know the hint without looking it up?

High recognizability: CARBONARA, DANTE ALIGHIERI, VENEZIA, THE DARK KNIGHT, BOHEMIAN RHAPSODY
Low recognizability: PIERO DELLA FRANCESCA (niche art historian), SPACCANAPOLI (regional), `BORN TO RUN` (rock fans only)

### 4.3 Phrase Quality

The phrase itself (the text players spell out) must:
- Be a complete or near-complete thought, not a fragment
- Contain specific, concrete details (names, numbers, verbs of action)
- NOT be a tautology with the hint (the phrase can't restate the hint)
- Sound natural in spoken Italian/English, not like a Wikipedia summary

Good: `COMPOSE LA NONA SINFONIA GIÀ COMPLETAMENTE SORDO` — BEETHOVEN
Bad: `UN FAMOSO COMPOSITORE TEDESCO DEL SETTECENTO` — BEETHOVEN (generic, tautological)

### 4.4 Letter Distribution

A good Wheel of Fortune phrase should have:
- Common consonants (R, S, T, L, N in Italian; R, S, T, L, N in English)
- Not too many rare letters (Q, X, Z, W, K, Y) which make spinning unproductive
- A mix of long and short words so early guesses feel rewarding
- Avoid all-uppercase abbreviations or proper nouns that are only consonants

### 4.5 Cultural Fit

**Italian phrases:** Italy-centric material is encouraged and appropriate. Food, football, opera, cinema, geography, customs. Universal culture (science, world history, mythology) complements it.

**English phrases:** The current set skews heavily American pop culture. Expand toward British, Irish, and internationally recognized English-language material. Avoid obscure Americanisms that non-native speakers would not know.

---

## 5. Creation Guidelines — Italian

### 5.1 Hint Format

- Write the hint in **UPPERCASE**, all accents stripped, apostrophes removed
- The hint IS the subject of the phrase — it should be a recognizable noun, name, dish, place, or proverb incipit
- Keep the hint short: 1–4 words maximum
- For proverbs, the hint should be the opening words: `CHI DORME NON PIGLIA PESCI`, `NON TUTTE LE CIAMBELLE`

### 5.2 Phrase Format

- Write the phrase in **UPPERCASE**
- Strip all accents: à → A, è → E, é → E, ì → I, ò → O, ù → U
- Replace apostrophes with a space: `DELL'ITALIA` → `DELL ITALIA`
- No punctuation
- Phrase must describe, define, or vividly evoke the hint without naming it
- Use action verbs where possible

### 5.3 Recommended Phrase Structures

**Memorable fact (for people, science, history):**
> `[SUBJECT] [DID SOMETHING SPECIFIC AND SURPRISING]`
- `SCRISSE LA DIVINA COMMEDIA IN ESILIO` — DANTE ALIGHIERI
- `MORSE L ORECCHIO A EVANDER HOLYFIELD SUL RING` — MIKE TYSON

**Sensory description (for food, places):**
> `[WHAT IT LOOKS/TASTES/SMELLS LIKE] [WHERE/HOW]`
- `CIALDA FRITTA RIPIENA DI CREMA DI RICOTTA` — CANNOLI SICILIANI
- `CUOCE IN NOVANTA SECONDI NEL FORNO A LEGNA` — PIZZA NAPOLETANA

**Shared experience / humor:**
> `[UNIVERSAL SITUATION ITALIANS RECOGNIZE]`
- `COMINCIA SEMPRE IL LUNEDÌ E FINISCE A CENA` — DIETA
- `POTEVA ESSERE UNA EMAIL DI TRE RIGHE` — RIUNIONE DI LAVORO

**Paraphrase of the proverb's meaning:**
> `[WHAT THE PROVERB MEANS IN PLAIN WORDS]`
- `BISOGNA ALZARSI PRESTO PER COGLIERE LE OCCASIONI` — CHI DORME NON PIGLIA PESCI
- `LA VITTORIA FINALE VALE PIÙ DI QUELLA INIZIALE` — RIDE BENE CHI RIDE ULTIMO

### 5.4 Category Balance to Maintain

Ensure new additions don't over-weight any single theme. Currently well-covered:
- Italian food (22 entries — add sparingly)
- Italian landmarks (18 entries — add sparingly)
- Italian historical figures (16 entries — add sparingly)

Currently under-represented (good areas to add):
- Italian music beyond Sanremo/Pavarotti (jazz, rock italiano, etc.)
- Modern Italian sport beyond football/cycling
- Italian literature (only Dante and minor references)
- Technology and the digital world
- Italian TV beyond Carosello/Striscia

### 5.5 Duplicate Prevention

Before adding a new phrase, check:
- Is there already a phrase with the same hint? (There are active duplicate hints for CARBONARA, TIRAMISÙ — acceptable if phrases differ; avoid triplicate)
- Does the phrase content overlap significantly with an existing one?

---

## 6. Creation Guidelines — English

### 6.1 Hint Format

English uses **broad genre labels**, not topic names. Valid hint values:
- `Movie` — film titles only
- `Song` — song titles only
- `Proverb` — traditional proverbs
- `Phrase` — idioms and common English expressions
- `Place` — named geographic locations, described with "the" as needed
- `Famous Quote` — attributed quotes from fiction, film, or literature

**Do not create new category labels.** Merge `Saying` into `Phrase` or `Proverb` when adding the next batch.

### 6.2 Minimum Length Enforcement

**Never add a phrase shorter than 4 words or 20 characters.** This is the most critical rule for the English set.

For `Movie` and `Song` categories specifically:
- Single-word titles are not suitable: prefer multi-word titles or switch to descriptive approach (see 6.3)
- Two-word titles are borderline: only accept if both words are long (e.g. `SCHINDLERS LIST` at 14 chars is still short — acceptable only because it's deeply recognizable; do not add more like it)
- Three-word titles: acceptable if total length is 20+ chars

### 6.3 Recommended Fix for Short Movie/Song Titles

Either:
a) **Replace with longer titles** — `IMAGINE` → `DONT STOP BELIEVIN` is already there and better; replace `IMAGINE` with `GOOD VIBRATIONS` or `STAIRWAY TO HEAVEN` (already present) style entries
b) **Switch to Italian-style descriptive phrases** for Songs/Movies with `Famous Quote` hint:
   - Instead of `IMAGINE` as a Song, use `JUST IMAGINE ALL THE PEOPLE LIVING LIFE IN PEACE` as a Famous Quote

### 6.4 Phrase Quality by Category

**Movie:** Multi-word titles with 3+ words, 20+ characters. Good examples already in set:
- `INDIANA JONES AND THE LOST ARK` (30 chars)
- `THE SHAWSHANK REDEMPTION` (24 chars)
- `BACK TO THE FUTURE` (18 chars — borderline but acceptable)

Avoid: `THE MATRIX` (10), `FORREST GUMP` (12), `PULP FICTION` (12)

**Song:** Same rules as Movie. Good examples:
- `STAIRWAY TO HEAVEN` (18 chars — borderline but famous enough)
- `BOHEMIAN RHAPSODY` (17 chars — borderline, famous enough)
- `SMELLS LIKE TEEN SPIRIT` (23 chars — good)

Avoid: `IMAGINE` (7), `YESTERDAY` (9), `THRILLER` (8), `PURPLE RAIN` (11)

**Proverb:** Already the strongest English category. Keep adding:
- Long, universally known proverbs
- Aim for 6–10 words, 30–50 characters
- Make sure the proverb is known to non-native speakers (avoid hyper-regional idioms)

Good candidates not yet in the set:
- `A STITCH IN TIME SAVES NINE`
- `YOU CAN LEAD A HORSE TO WATER BUT YOU CANNOT MAKE IT DRINK`
- `GREAT MINDS THINK ALIKE`
- `THE ROAD TO HELL IS PAVED WITH GOOD INTENTIONS`

**Phrase (idioms):** Currently solid. Continue with well-known idioms 4+ words long.

**Place:** Currently 10 entries, all single named locations as titles. Consider expanding with descriptive phrases:
- Instead of `MACHU PICCHU` (12 chars — too short), write `ANCIENT INCA CITADEL HIGH IN THE ANDES MOUNTAINS` (48 chars)
- Alternatively keep as-is only for the most globally iconic names

**Famous Quote:** Good category. Keep quotes to recognizable films, plays, and books. Avoid:
- Quotes only known by specialists
- Quotes under 4 words (`WHY SO SERIOUS` is 14 chars — borderline)

### 6.5 Missing English Categories to Consider

The English set would benefit from adding these categories (with 5–10 phrases each):
- `TV Show` — well-known TV series titles or episode descriptions
- `Book` — novel or literary work titles (multi-word, famous)
- `Science Fact` — short descriptive sentences about science topics (mirrors the Italian science phrases)
- `Sports` — iconic sports moments or records

---

## 7. What to Avoid

### Both Languages

- Phrases under 4 words or 20 characters
- Tautological phrases that restate the hint (`CARBONARA È UNA PASTA ITALIANA` — hint says CARBONARA, phrase says carbonara)
- Phrases requiring knowledge of a single niche/regional subculture
- Phrases with numbers written as digits (`100 METRI`) — use words (`CENTO METRI`)
- Phrases that are offensive, politically divisive, or about death/violence in a flippant way
- Phrases where the answer is unsolvable without the specific cultural knowledge (e.g. `VELINE E TAPIRI OGNI SERA SU CANALE CINQUE` is fine for Italian audiences but would need deactivating in English mode — currently Italian-only)
- Near-duplicate phrases for the same hint unless the two phrases are meaningfully different

### Italian Specifically

- Over-reliance on food: the set already has 22 food phrases. New food entries need to earn their place
- Phrases referencing highly regional content that Northern/Southern Italians might not share
- Quotes from the original work as the phrase (this works for AMLETO with `ESSERE O NON ESSERE QUESTO È IL DILEMMA` because it's the most famous line; avoid using secondary quotes)

### English Specifically

- One-word and two-word phrases for ANY category
- Americanisms not understood outside the US
- Song/movie titles that were hits only in a specific decade without lasting global recognition
- Adding new hints that overlap with existing ones (Saying + Phrase overlap already exists)

---

## 8. Quick Reference Checklist

Before adding any phrase, verify all boxes:

**Format:**
- [ ] Hint is UPPERCASE, no accents, no apostrophes
- [ ] Phrase is UPPERCASE, no accents, no apostrophes (apostrophes become spaces)
- [ ] No punctuation in the phrase
- [ ] `lang` field is correct (`it` or `en`)
- [ ] `active` is set to `true`

**Length:**
- [ ] Phrase is at least 4 words
- [ ] Phrase is at least 20 characters (with spaces)
- [ ] Phrase is no more than ~70 characters (with spaces)

**Quality:**
- [ ] Phrase does NOT directly name the hint
- [ ] Phrase describes, evokes, or defines the hint with concrete details
- [ ] A player who knows the topic would have an "aha" moment on reveal
- [ ] The phrase sounds natural, not like an encyclopedia entry

**Duplication:**
- [ ] No existing active phrase has the same hint (or if it does, this phrase is meaningfully different)
- [ ] The phrase content does not closely paraphrase an existing phrase

**Italian extra:**
- [ ] Hint is a recognizable Italian/cultural reference, not a vague category label

**English extra:**
- [ ] Hint is one of: Movie, Song, Proverb, Phrase, Place, Famous Quote
- [ ] If Movie or Song: title is at least 3 words or 20 chars
