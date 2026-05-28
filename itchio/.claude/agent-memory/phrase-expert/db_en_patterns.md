---
name: db-en-patterns
description: Osservazioni sul database EN esistente — hint naming, lunghezze, stile delle frasi legacy
metadata:
  type: project
---

Le frasi EN gia' nel DB (inserite prima di questa sessione) non rispettano le regole attuali:
- Hint sono nomi propri espliciti ("The Beatles", "Albert Einstein") — rivelano la risposta
- Lunghezze molto variabili (molte oltre 48 chars, alcune oltre 60)
- Stile descrittivo corretto, ma hint non evocativo

Le nuove frasi EN seguono regole piu' rigide (hint evocativo, 41-48 chars). Le vecchie non sono state toccate.

**Why:** Il progetto ha evoluto le regole nel tempo. Il DB legacy esiste e non va eliminato.
**How to apply:** Non generare nuovi hint stile "nome proprio esplicito". Non duplicare frasi gia' presenti (lista completa leggibile da Supabase).
