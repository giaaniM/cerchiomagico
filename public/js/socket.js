import { gameState, socketState, API_URL } from './state.js';
import { elements } from './elements.js';
import { showMessage } from './utils.js';
import { renderPlayersList } from './players.js';
import { spinWheel } from './wheel.js';

// Forward references injected to avoid circular deps
let _callConsonant = () => {};
let _buyVowel = () => {};
let _callExpressConsonant = () => {};
let _buyExpressVowel = () => {};
let _trySolve = () => {};
let _passTurn = () => {};
let _startGameDirectly = () => {};
let _resolveMysteryChoice = () => {};
let _syncGameState = () => {};

export function setHandlers({ callConsonant, buyVowel, callExpressConsonant, buyExpressVowel, trySolve, passTurn, startGameDirectly, resolveMysteryChoice }) {
    _callConsonant = callConsonant;
    _buyVowel = buyVowel;
    _callExpressConsonant = callExpressConsonant;
    _buyExpressVowel = buyExpressVowel;
    _trySolve = trySolve;
    _passTurn = passTurn;
    _startGameDirectly = startGameDirectly;
    _resolveMysteryChoice = resolveMysteryChoice;
}

export function setSyncGameState(fn) {
    _syncGameState = fn;
}

export function syncGameState() {
    const { socket, currentLobbyId } = socketState;
    if (!socket || !currentLobbyId) return;

    // Convert Sets to Arrays for JSON serialization
    const stateToSync = {
        ...gameState,
        revealedLetters: Array.from(gameState.revealedLetters),
        usedLetters: Array.from(gameState.usedLetters),
        players: gameState.players.map(p => ({ name: p.name }))
    };

    socket.emit('host:sync-state', { lobbyId: currentLobbyId, gameState: stateToSync });
}

export function handlePlayerAction(action) {
    const player = gameState.players.find(p => p.name === action.playerName);
    if (!player) return;

    const playerIndex = gameState.players.indexOf(player);
    const isCurrentPlayer = gameState.currentPlayerIndex === playerIndex;

    if (!isCurrentPlayer) {
        showMessage(`Azione da ${action.playerName} ignorata: non è il suo turno`, 'error');
        return;
    }

    switch (action.type) {
        case 'spin-wheel':
            if (gameState.wheelPhase === 'idle' || gameState.wheelPhase === 'choose_action') {
                spinWheel();
            }
            break;
        case 'call-consonant':
            if (gameState.wheelPhase === 'call_consonant') {
                elements.consonantInput.value = action.letter;
                _callConsonant();
            } else if (gameState.wheelPhase === 'express') {
                elements.expressConsonantInput.value = action.letter;
                _callExpressConsonant();
            }
            break;
        case 'buy-vowel':
            if (gameState.wheelPhase === 'choose_action' || gameState.wheelPhase === 'idle') {
                elements.vowelInput.value = action.letter;
                _buyVowel();
            } else if (gameState.wheelPhase === 'express') {
                elements.expressVowelInput.value = action.letter;
                _buyExpressVowel();
            }
            break;
        case 'solve':
            elements.solutionInput.value = action.solution;
            _trySolve();
            break;
        case 'pass':
            if (gameState.allConsonantsRevealed) {
                _passTurn();
            }
            break;
    }
}

export function initSmartphoneLobby() {
    const socket = io(API_URL);
    socketState.socket = socket;

    // Create Lobby
    fetch(`${API_URL}/api/lobby/create`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
            socketState.currentLobbyId = data.lobbyId;
            if (elements.bigLobbyIdDisplay) elements.bigLobbyIdDisplay.textContent = data.lobbyId;

            const currentHost = window.location.host;
            const isLocal = currentHost.includes('localhost') || currentHost.includes('127.0.0.1');

            const host = (isLocal && data.localIp) ? `${data.localIp}:${data.port || 3000}` : currentHost;
            const altHost = (isLocal && data.hostname) ? `${data.hostname}:${data.port || 3000}` : null;
            const protocol = window.location.protocol;

            const mobileLink = `${protocol}//${host}/mobile.html`;
            const altMobileLink = altHost ? `${protocol}//${altHost}/mobile.html` : null;

            if (elements.bigMobileLink) {
                let html = `<a href="${mobileLink}" target="_blank" style="color: #00d4ff; text-decoration: none;">${mobileLink}</a>`;
                if (altMobileLink) {
                    html += `<div style="font-size: 0.6em; opacity: 0.6; margin-top: 5px;">Alt: ${altMobileLink}</div>`;
                }
                elements.bigMobileLink.innerHTML = html;

                if (elements.lobbyQrContainer) {
                    const qrData = altMobileLink || mobileLink;
                    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
                    elements.lobbyQrContainer.innerHTML = `<img src="${qrUrl}" alt="Scan to join" />`;
                }
            }

            // Host joins
            socket.emit('host:join', data.lobbyId);
        });

    socket.on('host:joined', () => {
        console.log('Host joined lobby:', socketState.currentLobbyId);
    });

    socket.on('lobby:updated', (data) => {
        console.log('Lobby updated:', data);
        renderBigLobbyPlayers(data.players);

        // Enable start button if at least 2 players
        if (elements.startSmartphoneGameBtn) {
            elements.startSmartphoneGameBtn.disabled = data.players.length < 2;
            if (data.players.length >= 2) {
                elements.startSmartphoneGameBtn.innerHTML = `AVVIA PARTITA (${data.players.length})`;
            } else {
                elements.startSmartphoneGameBtn.innerHTML = `IN ATTESA DI GIOCATORI... (${data.players.length}/2)`;
            }
        }

        // Auto-refresh players if needed for game state
        gameState.players = data.players;
    });

    socket.on('game:started', () => {
        console.log('Game started by server, transitioning host UI...');
        if (gameState.players && gameState.players.length > 0) {
            _startGameDirectly(gameState.players);
        } else {
            console.error('CRITICAL: Received game:started but gameState.players is empty!');
            showMessage('Errore: nessun giocatore rilevato nel sistema. Riprova.', 'error');
        }
    });

    socket.on('player:action', handlePlayerAction);

    // Host receives mystery choice from player
    socket.on('lobby:mystery-choice', (choice) => {
        console.log('Received mystery choice from mobile player:', choice);
        _resolveMysteryChoice(choice);
        syncGameState();
    });
}

function renderBigLobbyPlayers(players) {
    if (!elements.bigPlayersGrid) return;
    elements.bigPlayersGrid.innerHTML = '';

    if (players.length === 0) {
        elements.bigPlayersGrid.innerHTML = '<p style="grid-column: 1/-1; color: #aaa; font-style: italic; font-size: 1.2rem;">In attesa di giocatori...</p>';
        return;
    }

    players.forEach(player => {
        const card = document.createElement('div');
        card.className = 'lobby-player-card';
        const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(player.name)}&radius=50`;
        card.innerHTML = `
            <div class="player-avatar-circle" style="background-image: url('${avatarUrl}'); background-size: cover; background-position: center; font-size: 0;"></div>
            <div class="player-card-name">${player.name}</div>
        `;
        elements.bigPlayersGrid.appendChild(card);
    });
}
