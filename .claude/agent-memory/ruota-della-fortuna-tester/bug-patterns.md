---
name: Bug Patterns — Ruota della Fortuna
description: Recurring bugs and critical logic flaws found during the 2026-05-03 simulation
type: project
---

## Critical / High severity bugs found (session: 2026-05-03)

### BUG-001 — BANCAROTTA erases totalScores (CRITICO)
`game.js:1279-1280` and `1369-1370` — Both the normal BANCAROTTA path and the "accept penalty" path inside resolveShieldChoice reset `totalScores[player.name] = 0`. The official Ruota della Fortuna rule is that BANCAROTTA only erases the *current manche* partial score, NOT the cumulative total.
**Why:** The comment reads "Lose ALL scores" treating partial + total as one pool.

### BUG-002 — Express bankruptcy also wipes totalScores (CRITICO)
`game.js:1777, 1821` — triggerExpressBankruptcy() and the wrong-solve-in-express branch both set `totalScores[player.name] = 0`. Same incorrect rule as BUG-001.

### BUG-003 — hideMessage() called but never defined (ALTO)
`game.js:2177` — `hideMessage()` is called inside the `final_decision` branch of updateUI() but there is no such function anywhere in the file. Calling it throws a ReferenceError at runtime, crashing the UI update in Manche 5.

### BUG-004 — Duplicate wheelRotation property in gameState (BASSO)
`game.js:224-225` — `wheelRotation: 0` appears twice in the gameState object literal. The second assignment silently wins. No runtime breakage but is a code-quality warning.

### BUG-005 — isTopValue flag never set on any WHEEL_SEGMENT (ALTO)
`game.js:2551` — `startGameLocal()` looks for `WHEEL_SEGMENTS.find(s => s.isTopValue)` to scale the top prize each manche, but no segment in the WHEEL_SEGMENTS array has the `isTopValue: true` property. `topSegment` is always `undefined`, so the top-value scaling via `startGameLocal()` is silently skipped. `startNextManche()` (used from manche 2 onward) uses index 5 directly and works, but manche 1 never scales.

### BUG-006 — Calling a vowel in the consonant field causes turn loss without adding to usedLetters (MEDIO)
`game.js:1484-1489` — When a vowel is typed into the consonant input, the code shows a popup and calls `passTurn()` but does NOT call `gameState.usedLetters.add(normalized)`. This means the same vowel can be entered again in a future turn through the consonant field, causing the same penalty loop indefinitely.

### BUG-007 — SCUDO: after using the shield, player can spin again but wheel phase not set correctly for PASSA case (MEDIO)
`game.js:1361-1363` — When the player uses the SCUDO to avoid PASSA, `wheelPhase` is set to `'idle'` correctly. However if the player declines the shield for PASSA (`resolveShieldChoice(false)`), the shield is "preserved" but the penalty still fires, so the shield is consumed implicitly by the display logic without clearing it. Actually on closer read the code only clears the shield when `useShield === true`, so declining preserves the shield correctly. This specific path is OK.

### BUG-008 — expressAccumulated not in gameState initializer; reset only on MEGATURNO spin, not on manche start (MEDIO)
`game.js:205-230` and `1936-1953` — `expressAccumulated` is not part of the initial `gameState` object declaration. It is first assigned as `gameState.expressAccumulated = 0` inside `onWheelStop` at line 1217. `startNextManche()` does NOT explicitly reset it. If a player's express session is interrupted mid-manche and the manche ends by another means, `expressAccumulated` may carry a stale value into the next manche.

### BUG-009 — Vocale assente in turno normale: partial score already deducted before turn is passed (MEDIO)
`game.js:1639-1640, 1664-1669` — The vowel cost (€1000) is deducted from partialScores BEFORE checking if the letter is present. If the vowel is absent the turn is passed, but the €1000 deduction remains. The player is penalised twice: lost turn AND lost money. This may be intentional game design but contradicts standard Ruota della Fortuna rules where cost is refunded on miss (verify with owner).

### BUG-010 — Final Round: callFinalConsonant earnings message miscalculates display (BASSO)
`game.js:3079` — The showMessage call says `+€${occurrences * earnings}` but `earnings` already equals `finalRoundValue` (per-letter value), so the formula is `occurrences * finalRoundValue`, which is correct. However the incremental `onRevealIndividual` callback at line 3072 adds `earnings` (= `finalRoundValue`) PER REVEAL CALL, so with 3 occurrences the partialScore grows by `finalRoundValue * 3` total — matching the message. No actual bug but confusing naming.

**Why:** earnings = value per occurrence, not total. Naming is misleading.
