---
name: Rule Interpretations — Ruota della Fortuna
description: Ambiguous rules encountered during testing and the interpretation decisions made
type: project
---

## Interpretation Decisions (session: 2026-05-03)

### 1. Vocale assente: perde il costo o no?
The Italian TV show refunds the vowel cost if the vowel is absent. This implementation does NOT refund it.
Decision: Flagged as potential bug (BUG-009). Confirm with owner whether this is intentional.

### 2. BANCAROTTA: solo punteggio manche o anche totale?
Official Ruota della Fortuna: BANCAROTTA erases only the *manche* (partial) score.
This implementation erases BOTH partial AND total. Flagged as BUG-001 (CRITICO).

### 3. SCUDO: rimane tra manches?
The code comments at lines 1955 and 2545-2546 explicitly say shields are preserved across rounds ("as requested"). This is a conscious design choice, not a bug.

### 4. MEGATURNO (Express): vocale costa €500
In the HTML tutorial slide (index.html line 411) it says "MEGATURNO: consonanti €500 fissi, vocali -€500". The code at game.js:1729 confirms cost = 500. This is consistent.

### 5. Soluzione con €0: riceve €1000 bonus
game.js:1851-1853 — If the winner has €0 when solving, they receive €1000 automatically. This is a house rule ("user request" comment). Not a standard rule, documented as intentional.

### 6. Chi vince la manche non inizia la prossima
game.js:1970-1972 — The manche winner is skipped when determining who starts next. This is an explicit user request, documented as intentional.

### 7. RADDOPPIA segmento: comportamento se score = 0
game.js:1511-1514 — If partialScore = 0, RADDOPPIA gives €500 per occurrence instead of doubling zero. This is a reasonable fallback rule implemented in code.

### 8. PASSA con SCUDO: giocatore può scegliere se usare lo scudo
game.js:1241-1249 — SCUDO can be used to avoid PASSA (turn loss), not just BANCAROTTA. This is an implementation-specific extension of the shield mechanic.
