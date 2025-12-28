#!/bin/bash

# Vai alla cartella dove si trova questo script
cd "$(dirname "$0")"

echo "🚀 Avvio della Ruota della Fortuna..."

# Caricamento NVM (Node Version Manager)
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    source "$NVM_DIR/nvm.sh"
    echo "✅ NVM caricato correttamente"
else
    echo "⚠️ NVM non trovato, provo a usare il comando node di sistema..."
fi

# Verifica se node è disponibile
if ! command -v node &> /dev/null; then
    echo "❌ ERRORE: Node.js non è installato o non è nel PATH."
    echo "Per favore, segui le istruzioni nel README.md per installarlo."
    # Tieni il terminale aperto in caso di errore
    read -p "Premi INVIO per chiudere..."
    exit 1
fi

# Apri il browser
(sleep 2 && open http://localhost:3000) &

# Avvia il server
node server.js
