import { socketState } from './state.js';
import { soundManager } from './sound.js';
import { initSmartphoneLobby } from './socket.js'; // MOBILE

let _startGameDirectly = () => {};
export function setStartGameDirectly(fn) { _startGameDirectly = fn; }

let playerCount = 2;

export function initSetup() {
    renderNameInputs();

    // Player count pills
    document.querySelectorAll('.count-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            document.querySelectorAll('.count-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            playerCount = parseInt(btn.dataset.count);
            renderNameInputs();
        });
    });

    // Start button
    const startBtn = document.getElementById('start-local-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            soundManager.playClick();
            const players = [];
            for (let i = 1; i <= playerCount; i++) {
                const input = document.getElementById(`player-name-${i}`);
                const name = input ? (input.value.trim() || input.placeholder) : `Giocatore ${i}`;
                players.push({ name, id: `local-${i}` });
            }
            _startGameDirectly(players);
        });
    }

    // Back button for smartphone lobby
    document.querySelectorAll('.back-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            showSmartphoneMode(false);
            if (socketState.socket) {
                socketState.socket.disconnect();
                socketState.socket = null;
            }
        });
    });

    // MOBILE: smartphone mode entry point
    const modeSmartphoneBtn = document.getElementById('mode-smartphone-btn');
    if (modeSmartphoneBtn) {
        modeSmartphoneBtn.addEventListener('click', () => {
            soundManager.playClick();
            socketState.isMobileMode = true;
            showSmartphoneMode(true);
            initSmartphoneLobby();
        });
    }
}

function showSmartphoneMode(show) {
    const smartphone = document.getElementById('setup-smartphone-mode');
    const card = document.querySelector('.setup-card');
    const banner = document.getElementById('mode-smartphone-btn');
    if (smartphone) smartphone.style.display = show ? 'flex' : 'none';
    if (card) card.style.display = show ? 'none' : 'flex';
    if (banner) banner.style.display = show ? 'none' : 'flex';
}

function renderNameInputs() {
    const container = document.getElementById('local-names-container');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 1; i <= playerCount; i++) {
        const div = document.createElement('div');
        div.className = 'name-input-wrap';
        div.innerHTML = `<input type="text" id="player-name-${i}" class="player-name-input" placeholder="Giocatore ${i}" maxlength="20" autocomplete="off">`;
        container.appendChild(div);
    }
    const first = document.getElementById('player-name-1');
    if (first) setTimeout(() => first.focus(), 50);
}
