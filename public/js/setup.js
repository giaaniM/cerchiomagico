import { socketState, gameState } from './state.js';
import { elements } from './elements.js';
import { soundManager } from './sound.js';
import { showScreen } from './utils.js';
import { initSmartphoneLobby } from './socket.js';

let _startGameDirectly = () => {};
export function setStartGameDirectly(fn) { _startGameDirectly = fn; }

let setupPlayerCount = 2;

export function initSetup() {
    // --- Mode Selection ---
    if (elements.modeLocalBtn) {
        elements.modeLocalBtn.addEventListener('click', () => {
            soundManager.playClick();
            socketState.isMobileMode = false;
            elements.modeSelection.style.display = 'none';
            elements.setupLocalPlayers.style.display = 'flex';
        });
    }

    if (elements.nextLocalNamesBtn) {
        elements.nextLocalNamesBtn.addEventListener('click', () => {
            soundManager.playClick();
            elements.setupLocalPlayers.style.display = 'none';
            elements.setupLocalNames.style.display = 'flex';
            renderLocalNameInputs();
        });
    }

    if (elements.backLocalPlayersBtn) {
        elements.backLocalPlayersBtn.addEventListener('click', () => {
            soundManager.playClick();
            elements.setupLocalNames.style.display = 'none';
            elements.setupLocalPlayers.style.display = 'flex';
        });
    }

    if (elements.modeSmartphoneBtn) {
        elements.modeSmartphoneBtn.addEventListener('click', () => {
            socketState.isMobileMode = true;
            elements.modeSelection.style.display = 'none';
            elements.setupSmartphoneMode.style.display = 'flex';
            initSmartphoneLobby();
        });
    }

    if (elements.backModeBtns) {
        elements.backModeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                soundManager.playClick();
                if (elements.setupLocalPlayers) elements.setupLocalPlayers.style.display = 'none';
                if (elements.setupLocalNames) elements.setupLocalNames.style.display = 'none';
                elements.setupSmartphoneMode.style.display = 'none';
                elements.modeSelection.style.display = 'block';

                if (socketState.socket) {
                    socketState.socket.disconnect();
                    socketState.socket = null;
                }
            });
        });
    }

    // --- Local Mode Logic ---
    if (elements.playerCountInput) {
        elements.playerCountInput.addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (val < 2) val = 2;
            if (val > 10) val = 10;
            setupPlayerCount = val;
            renderLocalNameInputs();
        });
    }

    if (elements.startLocalGameBtn) {
        elements.startLocalGameBtn.addEventListener('click', () => {
            const players = [];
            for (let i = 1; i <= setupPlayerCount; i++) {
                const nameInput = document.getElementById(`player-name-${i}`);
                let name = nameInput.value.trim() || nameInput.placeholder;
                players.push({ name: name, id: 'local-' + i });
            }
            _startGameDirectly(players);
        });
    }

    // --- Smartphone Mode ---
    if (elements.startSmartphoneGameBtn) {
        elements.startSmartphoneGameBtn.addEventListener('click', () => {
            const { socket, currentLobbyId } = socketState;
            if (!socket || !currentLobbyId) {
                console.error('Socket or Lobby ID missing when start button clicked');
                return;
            }

            if (gameState.players.length < 2) {
                console.warn('Click ignored: not enough players');
                return;
            }

            socket.emit('host:start-game', currentLobbyId);
        });
    }
}

function renderLocalNameInputs() {
    if (!elements.localNamesContainer) return;
    elements.localNamesContainer.innerHTML = '';

    for (let i = 1; i <= setupPlayerCount; i++) {
        const div = document.createElement('div');
        div.className = 'form-group';
        div.innerHTML = `<input type="text" id="player-name-${i}" placeholder="Giocatore ${i}">`;
        elements.localNamesContainer.appendChild(div);
    }
}
