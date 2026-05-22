import { socketState } from './state.js';
import { t } from './lang.js';
import { soundManager } from './sound.js';
import { initSmartphoneLobby } from './socket.js';
import { showHistoryPopup, hasHistory } from './history.js';

let _startGameDirectly = () => {};
export function setStartGameDirectly(fn) { _startGameDirectly = fn; }

export function initSoloButton() {}

export function resetSoloSelection() {
    soloSelected = false;
    playerCount = 2;
    document.querySelectorAll('.count-pill[data-count]').forEach(b => b.classList.remove('active'));
    document.querySelector('.count-pill[data-count="2"]')?.classList.add('active');
    document.querySelector('.setup-card:not(.setup-custom-card)')?.classList.remove('solo-active');
    updateModeInfoCard('multi');
    const smartphoneBannerReset = document.getElementById('mode-smartphone-btn');
    if (smartphoneBannerReset) smartphoneBannerReset.style.display = 'flex';
    renderNameInputs();
}

let playerCount = 2;
let soloSelected = true;

let customCardPlayerCount = 2;
let customCardSoloSelected = false;

export function initSetup() {
    // Default: solo mode pre-selected
    soloSelected = true;
    const setupCard = document.querySelector('.setup-card:not(.setup-custom-card)');
    document.querySelectorAll('.count-pill[data-count]').forEach(b => b.classList.remove('active'));
    document.querySelector('.count-pill[data-count="solo"]')?.classList.add('active');
    setupCard?.classList.add('solo-active');
    document.getElementById('mode-smartphone-btn')?.style.setProperty('display', 'none');
    renderNameInputs(true);
    updateModeInfoCard('solo');

    // Mode switcher (normal ↔ custom)
    document.querySelectorAll('.sms-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            document.querySelectorAll('.sms-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            switchSetupMode(btn.dataset.mode);
        });
    });

    // Main card: player count pills
    document.querySelectorAll('.count-pill[data-count]').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            document.querySelectorAll('.count-pill[data-count]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const isSolo = btn.dataset.count === 'solo';
            soloSelected = isSolo;
            const setupCard = document.querySelector('.setup-card:not(.setup-custom-card)');
            const smartphoneBanner = document.getElementById('mode-smartphone-btn');

            if (isSolo) {
                setupCard?.classList.add('solo-active');
                if (smartphoneBanner) smartphoneBanner.style.display = 'none';
                updateModeInfoCard('solo');
                renderNameInputs(true);
            } else {
                setupCard?.classList.remove('solo-active');
                playerCount = parseInt(btn.dataset.count);
                if (smartphoneBanner) smartphoneBanner.style.display = 'flex';
                updateModeInfoCard('multi');
                renderNameInputs();
            }
        });
    });

    // Main card: start button
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

    // History button
    const histBtn = document.getElementById('history-btn');
    if (histBtn) {
        if (!hasHistory()) {
            histBtn.style.display = 'none';
        } else {
            histBtn.addEventListener('click', () => { soundManager.playClick(); showHistoryPopup(); });
        }
    }

    // Back button smartphone lobby
    document.querySelectorAll('.back-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            showSmartphoneMode(false);
            if (socketState.socket) { socketState.socket.disconnect(); socketState.socket = null; }
        });
    });

    // Smartphone mode
    const modeSmartphoneBtn = document.getElementById('mode-smartphone-btn');
    if (modeSmartphoneBtn) {
        modeSmartphoneBtn.addEventListener('click', () => {
            soundManager.playClick();
            socketState.isMobileMode = true;
            showSmartphoneMode(true);
            initSmartphoneLobby();
        });
    }

    initCustomCard();
}

const PHRASE_MIN_LETTERS = 4;
const PHRASE_MAX_CHARS = 60;
const HINT_MIN = 2;
const HINT_MAX = 30;

function initCustomCard() {
    renderCustomNameInputs();

    // Live counter + validation state for hint
    const hintInput = document.getElementById('custom-hint-input');
    const hintCounter = document.getElementById('hint-counter');
    if (hintInput && hintCounter) {
        hintInput.addEventListener('input', () => {
            const len = hintInput.value.length;
            hintCounter.textContent = `${len}/${HINT_MAX}`;
            hintCounter.classList.toggle('cpp-counter-ok', len >= HINT_MIN);
            hintCounter.classList.toggle('cpp-counter-err', len > 0 && len < HINT_MIN);
        });
    }

    // Auto-uppercase + live counter + only letters/spaces/accents for phrase
    const customPhraseInput = document.getElementById('custom-phrase-input');
    const phraseCounter = document.getElementById('phrase-counter');
    if (customPhraseInput) {
        customPhraseInput.addEventListener('input', () => {
            // Strip invalid chars (keep letters, accented, spaces, apostrophes)
            let val = customPhraseInput.value.toUpperCase().replace(/[^A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖÙÚÛÜÝÞSSÀ-ÖØ-öø-ÿ ']/g, '');
            const s = customPhraseInput.selectionStart;
            customPhraseInput.value = val;
            customPhraseInput.setSelectionRange(s, s);
            if (phraseCounter) {
                const letters = val.replace(/\s/g, '').length;
                phraseCounter.textContent = `${val.length}/${PHRASE_MAX_CHARS}`;
                phraseCounter.classList.toggle('cpp-counter-ok', letters >= PHRASE_MIN_LETTERS);
                phraseCounter.classList.toggle('cpp-counter-err', val.length > 0 && letters < PHRASE_MIN_LETTERS);
            }
        });
    }

    // Custom card: player count pills
    document.querySelectorAll('.count-pill[data-custom-count]').forEach(btn => {
        btn.addEventListener('click', () => {
            soundManager.playClick();
            document.querySelectorAll('.count-pill[data-custom-count]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const isSolo = btn.dataset.customCount === 'solo';
            customCardSoloSelected = isSolo;
            const customCard = document.querySelector('.setup-custom-card');

            if (isSolo) {
                customCard?.classList.add('solo-active');
                renderCustomNameInputs(true);
            } else {
                customCard?.classList.remove('solo-active');
                customCardPlayerCount = parseInt(btn.dataset.customCount);
                renderCustomNameInputs();
            }
        });
    });

    // Custom card: start button
    const startCustomBtn = document.getElementById('start-custom-game-btn');
    if (startCustomBtn) {
        startCustomBtn.addEventListener('click', () => {
            soundManager.playClick();

            const hintInput = document.getElementById('custom-hint-input');
            const hint = hintInput ? hintInput.value.trim() : '';
            if (hint.length > 0 && hint.length < HINT_MIN) { shakeInput(hintInput); return; }

            const phraseInput = document.getElementById('custom-phrase-input');
            const phrase = phraseInput ? phraseInput.value.trim().toUpperCase() : '';
            const letters = phrase.replace(/\s/g, '').length;
            if (!phrase || letters < PHRASE_MIN_LETTERS) { shakeInput(phraseInput); return; }

            if (customCardSoloSelected) {
                const input = document.getElementById('custom-player-name-1');
                const name = input ? input.value.trim() : '';
                if (!name) { shakeInput(input); return; }
                _startGameDirectly([{ name, id: 'solo-1' }], true, { phrase, hint });
                return;
            }

            const players = [];
            let hasEmpty = false;
            for (let i = 1; i <= customCardPlayerCount; i++) {
                const input = document.getElementById(`custom-player-name-${i}`);
                const name = input ? input.value.trim() : '';
                if (!name) { shakeInput(input); hasEmpty = true; }
                else players.push({ name, id: `local-${i}` });
            }
            if (hasEmpty) return;
            _startGameDirectly(players, false, { phrase, hint });
        });
    }
}

const MIC_ICONS = {
    list:    `<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><rect x="1" y="3" width="16" height="2.5" rx="1.25"/><rect x="1" y="8" width="12" height="2.5" rx="1.25"/><rect x="1" y="13" width="8" height="2.5" rx="1.25"/></svg>`,
    bolt:    `<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M10.5 1.5L3.5 10h6.5l-2 6.5 7-9H9l1.5-6z"/></svg>`,
    diamond: `<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M9 1.5L1.5 9 9 16.5 16.5 9z"/></svg>`,
    clock:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="10" r="6.5"/><path d="M9 6.5V10l2.5 1.5"/><path d="M6.5 2h5"/></svg>`,
    medal:   `<svg width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><circle cx="9" cy="12.5" r="4.5"/><path d="M6 7.5L3.5 2.5h4L9 5.5l1.5-3h4L12 7.5a5.5 5.5 0 00-6 0z"/></svg>`,
};

function updateModeInfoCard(mode) {
    const card = document.getElementById('mode-info-card');
    if (!card) return;

    const configs = {
        solo: [
            { icon: MIC_ICONS.clock,   label: 'Cronometro', cls: 'mic-solo' },
            { icon: MIC_ICONS.list,    label: '3 Frasi',    cls: 'mic-solo' },
            { icon: MIC_ICONS.medal,   label: 'Record',     cls: 'mic-solo' },
        ],
        multi: [
            { icon: MIC_ICONS.list,    label: '5 Frasi',        cls: '' },
            { icon: MIC_ICONS.bolt,    label: 'Megaturno',      cls: 'mic-highlight' },
            { icon: MIC_ICONS.diamond, label: 'Finale Speciale', cls: 'mic-highlight' },
        ],
    };

    const features = configs[mode] || configs.multi;
    card.innerHTML = features.map(f =>
        `<div class="mic-feature ${f.cls}">
            <span class="mic-icon">${f.icon}</span>
            <span class="mic-label">${f.label}</span>
        </div>`
    ).join('');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = '';
}

let _currentSetupMode = 'normal';

function switchSetupMode(mode) {
    _currentSetupMode = mode;
    const mainCard = document.querySelector('.setup-card:not(.setup-custom-card)');
    const customCard = document.querySelector('.setup-custom-card');
    const banner = document.getElementById('mode-smartphone-btn');
    if (mode === 'custom') {
        if (mainCard) mainCard.style.display = 'none';
        if (banner) banner.style.display = 'none';
        if (customCard) customCard.style.display = 'flex';
    } else {
        if (mainCard) mainCard.style.display = 'flex';
        if (customCard) customCard.style.display = 'none';
        // restore banner unless solo is selected
        if (banner && !soloSelected) banner.style.display = 'flex';
    }
}

function showSmartphoneMode(show) {
    const smartphone = document.getElementById('setup-smartphone-mode');
    const switcher = document.getElementById('setup-mode-switcher');
    const mainCard = document.querySelector('.setup-card:not(.setup-custom-card)');
    const customCard = document.querySelector('.setup-custom-card');
    const banner = document.getElementById('mode-smartphone-btn');
    if (smartphone) smartphone.style.display = show ? 'flex' : 'none';
    if (switcher) switcher.style.display = show ? 'none' : 'flex';
    if (banner) banner.style.display = show ? 'none' : (_currentSetupMode === 'normal' && !soloSelected ? 'flex' : 'none');
    if (mainCard) mainCard.style.display = show ? 'none' : (_currentSetupMode === 'normal' ? 'flex' : 'none');
    if (customCard) customCard.style.display = show ? 'none' : (_currentSetupMode === 'custom' ? 'flex' : 'none');
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

function renderCustomNameInputs(solo = false) {
    const container = document.getElementById('custom-names-container');
    if (!container) return;
    container.innerHTML = '';
    const count = solo ? 1 : customCardPlayerCount;
    for (let i = 1; i <= count; i++) {
        const div = document.createElement('div');
        div.className = 'name-input-wrap';
        const placeholder = solo ? (t('setup.solo.nameinput') || 'Il tuo nome') : `${t('setup.player')} ${i}`;
        div.innerHTML = `<input type="text" id="custom-player-name-${i}" class="player-name-input" placeholder="${placeholder}" maxlength="20" autocomplete="off">`;
        container.appendChild(div);
    }
}

function shakeInput(input) {
    if (!input) return;
    input.classList.remove('input-error');
    void input.offsetWidth;
    input.classList.add('input-error');
    input.addEventListener('animationend', () => input.classList.remove('input-error'), { once: true });
    input.focus();
}
