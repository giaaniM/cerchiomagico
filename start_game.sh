#!/bin/bash

# Script per far partire il server e aprire il gioco nel browser
# Carica NVM se presente per evitare errori "node: command not found"

echo "🚀 Avvio di Cerchio Magico..."

# Caricamento NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    echo "✅ NVM caricato correttamente"
else
    echo "⚠️ NVM non trovato, provo a usare il comando node di sistema..."
fi

# Vai alla cartella del progetto
cd "$(dirname "$0")"

# Verifica se node è disponibile
if ! command -v node &> /dev/null; then
    echo "❌ ERRORE: Node.js non è installato o non è nel PATH."
    echo "Per favore, segui le istruzioni nel README.md per installarlo."
    exit 1
fi

# Avvia l'apertura del browser in background
(sleep 2 && open http://localhost:3000) &

# Avvia il server
node server.js
