import { socketState } from './state.js';
import { t } from './lang.js';
import { soundManager } from './sound.js';
import { initSmartphoneLobby } from './socket.js'; // MOBILE
import { showHistoryPopup, hasHistory } from './history.js';

let _startGameDirectly = () => {};
export function setStartGameDirectly(fn) { _startGameDirectly = fn; }

export function initSoloButton() {} // now handled inside initSetup

export function resetSoloSelection() {
    soloSelected = false;
    playerCount = 2;
    document.querySelectorAll('.count-pill').forEach(b => b.classList.remove('active'));
    document.querySelector('.count-pill[data-count="2"]')?.classList.add('active');
    const soloHint = document.getElementById('solo-hint');
    if (soloHint) soloHint.style.display = 'none';
    document.querySelector('.setup-card')?.classList.remove('solo-active');
    const setupLabel = document.querySelector('.setup-section .setup-label');
    if (setupLabel) { setupLabel.setAttribute('data-i18n', 'setup.howmany'); setupLabel.textContent = t('setup.howmany'); }
    renderNameInputs();
}

let playerCount = 2;
let soloSelected = false;

export function initSetup() {
    renderNameInputs();

    // Player count pills (including solo pill)
    document.querySelectorAll('.count-pill').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            document.querySelectorAll('.count-pill').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const isSolo = btn.dataset.count === 'solo';
            soloSelected = isSolo;
            const soloHint = document.getElementById('solo-hint');
            const namesContainer = document.getElementById('local-names-container');

            const setupCard = document.querySelector('.setup-card');
            const setupLabel = document.querySelector('.setup-section .setup-label');
            if (isSolo) {
                if (soloHint) soloHint.style.display = 'block';
                setupCard?.classList.add('solo-active');
                if (setupLabel) setupLabel.setAttribute('data-i18n', 'setup.solo.mode');
                if (setupLabel) setupLabel.textContent = t('setup.solo.mode');
                renderNameInputs(true);
            } else {
                if (soloHint) soloHint.style.display = 'none';
                setupCard?.classList.remove('solo-active');
                if (setupLabel) setupLabel.setAttribute('data-i18n', 'setup.howmany');
                if (setupLabel) setupLabel.textContent = t('setup.howmany');
                playerCount = parseInt(btn.dataset.count);
                renderNameInputs();
            }
        });
    });

    // Start button
    const startBtn = document.getElementById('start-local-game-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            soundManager.playClick();
            if (soloSelected) {
                const input = document.getElementById('player-name-1');
                const name = input ? input.value.trim() : '';
                if (!name) { shakeInput(input); return; }
                _startGameDirectly([{ name, id: 'solo-1' }], true);
                return;
            }
            const players = [];
            let hasEmpty = false;
            for (let i = 1; i <= playerCount; i++) {
                const input = document.getElementById(`player-name-${i}`);
                const name = input ? input.value.trim() : '';
                if (!name) { shakeInput(input); hasEmpty = true; }
                else players.push({ name, id: `local-${i}` });
            }
            if (hasEmpty) return;
            _startGameDirectly(players);
        });
    }

    // History button — only show if there's data
    const histBtn = document.getElementById('history-btn');
    if (histBtn) {
        if (!hasHistory()) {
            histBtn.style.display = 'none';
        } else {
            histBtn.addEventListener('click', () => {
                soundManager.playClick();
                showHistoryPopup();
            });
        }
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

function renderNameInputs(solo = false) {
    const container = document.getElementById('local-names-container');
    if (!container) return;
    container.innerHTML = '';
    const count = solo ? 1 : playerCount;
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'name-input-wrap';
        const placeholder = solo ? (t('setup.solo.nameinput') || 'Il tuo nome') : `${t('setup.player')} ${i}`;
        div.innerHTML = `<input type="text" id="player-name-${i}" class="player-name-input" placeholder="${placeholder}" maxlength="20" autocomplete="off">`;
        container.appendChild(div);
    }
    const first = document.getElementById('player-name-1');
    if (first) setTimeout(() => first.focus(), 50);
}

function shakeInput(input) {
    if (!input) return;
    input.classList.remove('input-error');
    void input.offsetWidth; // reflow to restart animation
    input.classList.add('input-error');
    input.addEventListener('animationend', () => input.classList.remove('input-error'), { once: true });
    input.focus();
}
