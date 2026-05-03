---
name: User Profile — giaaniM
description: Project owner profile, role and known preferences for the Cerchio Magico project
type: user
---

The user is giaaniM (email: giaani@hotmail.it), the developer and owner of "Cerchio Magico", an Italian browser-based Wheel of Fortune clone.

The project lives at `/Users/valeriopadovano/applicazioni/wheel-of-fortune/` on macOS Darwin 25.1.0.

Known intentional design decisions (confirmed by in-code comments attributed to "user request"):
- Winner of a manche does not start the next one.
- Solving with €0 balance grants an automatic €1000 bonus.
- Shields (SCUDO) persist across manches.
- The top-value wheel segment scales up each manche (€1000 → €5000).
- Letter reveal animation has 1.5s delay between each tile.
- Express vowel costs €500 (not €1000 standard).

The app uses a static puzzle database (puzzles.js) with the AI (Groq) generation disabled. The UI framework is vanilla JS + CSS with socket.io for multiplayer.
