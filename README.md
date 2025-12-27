# Ruota della Fortuna - Modalità Multiplayer Mobile

## Prerequisiti

**IMPORTANTE**: Devi avere Node.js installato sul tuo computer.

### Installazione di Node.js (se non ce l'hai):

**Metodo consigliato (più semplice):**
1. Vai su https://nodejs.org/
2. Clicca sul pulsante verde "Download Node.js (LTS)" - scaricherà automaticamente la versione per macOS
3. Apri il file `.pkg` scaricato (di solito nella cartella Download)
4. Segui l'installazione guidata (clicca "Continua" fino alla fine)
5. **IMPORTANTE**: Riapri il terminale dopo l'installazione

**Verifica l'installazione:**
Apri un nuovo terminale e scrivi:
```bash
node --version
npm --version
```

Se vedi dei numeri di versione (es: v20.10.0), l'installazione è andata a buon fine!

## Installazione

**IMPORTANTE**: Se usi NVM (Node Version Manager), carica NVM prima di ogni comando:
```bash
source ~/.nvm/nvm.sh
```

1. Installa le dipendenze:
```bash
source ~/.nvm/nvm.sh
npm install
```

2. Avvia il server:
```bash
source ~/.nvm/nvm.sh
npm start
```

Il server sarà disponibile su `http://localhost:3000`

**Nota**: Per evitare di digitare `source ~/.nvm/nvm.sh` ogni volta, aggiungi questa riga al file `~/.zshrc`:
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```
Poi riavvia il terminale.

**Nota**: Se vedi errori, assicurati di aver installato Node.js correttamente.

## Come usare la modalità mobile

### Sul PC (Host):
1. Apri `http://localhost:3000` nel browser
2. Nella schermata di setup, spunta "Modalità Mobile (giocatori da smartphone)"
3. Verrà creata automaticamente una lobby con un ID univoco
4. Condividi l'ID lobby (o il link mobile) con i giocatori
5. Aspetta che i giocatori si uniscano
6. Clicca "Inizia Partita" quando tutti sono pronti

### Sugli smartphone (Giocatori):
1. Assicurati che lo smartphone sia sulla stessa rete WiFi del PC
2. Apri `http://[IP-DEL-PC]:3000/mobile.html` nel browser del telefono
   - Sostituisci `[IP-DEL-PC]` con l'indirizzo IP del Mac (es: `192.168.1.24`)
   - **Per trovare l'IP del Mac**: Vai su Preferenze di Sistema → Rete, oppure il server lo mostra all'avvio
   - Oppure usa il link mostrato nella lobby sul PC
2. Inserisci l'ID della lobby
3. Inserisci il tuo nome
4. Aspetta che l'host avvii la partita
5. Durante il gioco:
   - Vedi il tuo montepremi in alto
   - Quando è il tuo turno, puoi:
     - Girare la ruota
     - Chiamare una consonante
     - Comprare una vocale (€1000)
     - Risolvere la frase
     - Passare (se tutte le consonanti sono rivelate)

## Note

- Assicurati che PC e smartphone siano sulla stessa rete WiFi
- Il server deve essere accessibile dalla rete locale
- Se usi un firewall, apri la porta 3000

