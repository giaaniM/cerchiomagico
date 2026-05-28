---
name: phrase-rules-en
description: Regole operative validate per frasi inglesi MagicSpin — lunghezza, hint, overlap, stile
metadata:
  type: reference
---

## Regole frase EN validate

- **Lunghezza**: 41-48 caratteri inclusi spazi. Verificare con SQL `length(phrase)` su Supabase.
- **Hint**: evocativo, NON la risposta, max 25 chars, UPPERCASE. Es: "ROCK OPERA PEAK" non "Bohemian Rhapsody"
- **Overlap hint-phrase**: NESSUNA parola del hint (anche forme derivate) puo' apparire nella phrase
- **No apostrofi**: IT S non IT'S. No punteggiatura. Numeri scritti in lettere (TWENTY non 20).
- **Stile**: frasi narrative, presente o passato, evocative. NON titoli nudi.

## Trappole frequenti (verificate in questa sessione)

- Parole "short" come RARE/WILD/TIDE/GULF facilmente finiscono nella phrase se si lascia scorrere il draft
- Hint con aggettivi generici (RARE BLOOM, WILD REFUGE) vanno ricontrollati attentamente
- "UPSTREAM" nell'hint finisce quasi sempre nella phrase — cambiare la frase o il hint
- VINYL in hint VINYL RITUAL: quasi impossibile non metterlo nella phrase — usare DISC/RECORD
- ATOM in hint ATOM SPLIT: usare NUCLEUS / CORE nella phrase
- Frasi con TWENTY, MILLION, HUNDRED tendono a superare i 48 chars: usare forme piu' brevi

## Workflow di validazione consigliato

1. Draft 100+ frasi
2. Verifica lunghezza via SQL `length(phrase) BETWEEN 41 AND 48`
3. Verifica overlap hint→phrase con LIKE check SQL
4. Massimo 3 passaggi di correzione prima di raggiungere 100/100

**Why:** Il workflow iterativo SQL e' il piu' affidabile per grandi batch.
**How to apply:** Usare sempre Supabase execute_sql per validazione, mai contare a mano.
