/**
 * main.js — Entry point for the modular Wheel of Fortune app.
 *
 * Imports all modules, wires cross-module dependencies (via setter injection),
 * attaches all event listeners, and initializes the app.
 *
 * NOTE: This module is for future use. The monolithic public/game.js
 * continues to function as-is.
 */

// ===== Core imports =====
import { soundManager } from './sound.js';
import { elements } from './elements.js';
import { gameState, socketState } from './state.js';
import { showScreen, showPopup } from './utils.js';
import { t, applyTranslations, setLang, getCurrentLang } from './lang.js';
import { isNative } from './native.js';
import { bootNative, onNativeReady } from './app-native.js';

window.t = t;
applyTranslations();

// ===== Module imports =====
import { updateUI } from './ui.js';
import { passTurn, setUpdateUI as playersSetUpdateUI, setSyncGameState as playersSetSyncGameState } from './players.js';
import { setUpdateUI as boardSetUpdateUI } from './board.js';
import { spinWheel, drawWheel, renderWheelToCache, clearWheelCache } from './wheel.js';
import { callConsonant, buyVowel, trySolve, endManche, startGameDirectly, newGame, startNextManche, skipPhrase, loadPuzzles, setOnNewGame } from './game-logic.js';
import { callExpressConsonant, buyExpressVowel, setEndManche as expressSetEndManche } from './express.js';
import { callFinalConsonant, callFinalVowel, setEndManche as finalRoundSetEndManche, setSyncGameState as finalRoundSetSyncGameState } from './finalRound.js';
import { syncGameState, setHandlers as socketSetHandlers } from './socket.js';
import { initSetup, setStartGameDirectly, initSoloButton, resetSoloSelection } from './setup.js';
import { initMobileLayout } from './mobile-layout.js';
import { showLeaderboardPopup } from './leaderboard.js';
import { joinMatchmaking, showPrivateRoomChoice } from './online-game.js';

// ===== Wire cross-module dependencies =====

// board.js needs updateUI
boardSetUpdateUI(updateUI);

// players.js needs updateUI and syncGameState
playersSetUpdateUI(updateUI);
playersSetSyncGameState(() => {
    if (socketState.isMobileMode) syncGameState();
});

// express.js needs endManche
expressSetEndManche(endManche);

// finalRound.js needs endManche and syncGameState
finalRoundSetEndManche(endManche);
finalRoundSetSyncGameState(() => {
    if (socketState.isMobileMode) syncGameState();
});

// socket.js needs game action handlers
socketSetHandlers({
    callConsonant,
    buyVowel,
    callExpressConsonant,
    buyExpressVowel,
    trySolve,
    passTurn,
    startGameDirectly,
    resolveMysteryChoice: window.resolveMysteryChoice, // assigned in wheel.js
});

// setup.js needs startGameDirectly
setStartGameDirectly(startGameDirectly);
setOnNewGame(resetSoloSelection);

// ===== Attach Event Listeners =====

// Main game controls
elements.spinBtn?.addEventListener('click', spinWheel);
elements.consonantBtn?.addEventListener('click', callConsonant);
elements.vowelBtn?.addEventListener('click', buyVowel);
elements.solveBtn?.addEventListener('click', trySolve);
elements.passBtn?.addEventListener('click', passTurn);
elements.newGameBtn?.addEventListener('click', newGame);
document.getElementById('home-btn')?.addEventListener('click', newGame);
document.getElementById('skip-phrase-btn')?.addEventListener('click', () => {
    showPopup(`<div class="popup-body">
        <div class="popup-icon">↻</div>
        <div class="popup-title">${t('skip.title')}</div>
        <div class="popup-text">${t('skip.body')}</div>
        <div style="display:flex;gap:12px;justify-content:center;margin-top:16px">
            <button onclick="document.getElementById('modal-overlay').style.display='none';document.getElementById('popup-message').style.display='none'" class="btn-secondary" style="padding:8px 20px">${t('skip.cancel')}</button>
            <button onclick="window._confirmSkipPhrase()" class="btn-solve" style="padding:8px 20px">${t('skip.confirm')}</button>
        </div>
    </div>`, 0);
    window._confirmSkipPhrase = () => {
        document.getElementById('modal-overlay').style.display = 'none';
        document.getElementById('popup-message').style.display = 'none';
        skipPhrase();
    };
});

function toggleLanguage() {
    const newLang = getCurrentLang() === 'it' ? 'en' : 'it';
    setLang(newLang);
    clearWheelCache();
    renderWheelToCache();
    drawWheel(gameState.wheelRotation);
    loadPuzzles();
    // Sync setup proxy button label
    const proxy = document.getElementById('setup-lang-proxy');
    if (proxy) proxy.textContent = newLang === 'it' ? '🇮🇹' : '🇬🇧';
}

document.getElementById('lang-toggle-btn')?.addEventListener('click', toggleLanguage);

// Init setup lang proxy label
;(() => {
    const proxy = document.getElementById('setup-lang-proxy');
    if (proxy) proxy.textContent = getCurrentLang() === 'it' ? '🇮🇹' : '🇬🇧';
})();

// Consonant input
elements.consonantInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') callConsonant();
});
elements.consonantInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Vowel input
elements.vowelInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buyVowel();
});
elements.vowelInput?.addEventListener('input', (e) => {
    e.target.value = e.target.value.toUpperCase();
});

// Solution input
elements.solutionInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') trySolve();
});

// Express UI Listeners
elements.expressConsonantBtn?.addEventListener('click', callExpressConsonant);
elements.expressConsonantInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') callExpressConsonant();
});
elements.expressVowelBtn?.addEventListener('click', buyExpressVowel);
elements.expressVowelInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') buyExpressVowel();
});
elements.expressConsonantInput?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
elements.expressVowelInput?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });

// Final Round Listeners
if (elements.finalConsonantBtn) elements.finalConsonantBtn.addEventListener('click', callFinalConsonant);
if (elements.finalConsonantInput) {
    elements.finalConsonantInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') callFinalConsonant();
    });
    elements.finalConsonantInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
}
if (elements.finalVowelBtn) elements.finalVowelBtn.addEventListener('click', callFinalVowel);
if (elements.finalVowelInput) {
    elements.finalVowelInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') callFinalVowel();
    });
    elements.finalVowelInput.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });
}

// Leaderboard home button
document.getElementById('leaderboard-btn')?.addEventListener('click', () => showLeaderboardPopup('solo'));

// Online multiplayer buttons
document.getElementById('online-casuale-btn')?.addEventListener('click', () => {
    soundManager.playClick();
    joinMatchmaking();
});
document.getElementById('online-amico-btn')?.addEventListener('click', () => {
    soundManager.playClick();
    showPrivateRoomChoice();
});

// Prevent accidental navigation during an active game
window.addEventListener('beforeunload', (e) => {
    if (gameState.currentManche) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ── Bottom tab bar + tab panel switching (native only) ──
if (isNative) {
    let _lbMode = 'solo';

    function switchTab(tabName) {
        // Update tab bar active state
        document.querySelectorAll('.btb-tab').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tabName);
        });
        // Switch tab panels
        document.querySelectorAll('.tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `tab-${tabName}`);
        });
        // Leaderboard: load content on first switch or refresh
        if (tabName === 'leaderboard') {
            _loadLbTab(_lbMode);
        }
        // Profile: sync data from hidden proxy elements
        if (tabName === 'profile') {
            const name   = document.getElementById('spb-name')?.textContent;
            const avatar = document.getElementById('spb-avatar')?.textContent;
            const rec    = document.getElementById('spb-record')?.textContent;
            if (name)   document.getElementById('prof-username').textContent = name;
            if (avatar) document.getElementById('prof-avatar').textContent   = avatar;
            if (rec)    document.getElementById('prof-record').textContent   = rec;
        }
    }

    document.querySelectorAll('.btb-tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // ── Leaderboard tab inline ──
    async function _loadLbTab(mode) {
        const body = document.getElementById('tab-lb-body');
        if (!body) return;
        body.innerHTML = '<div class="lb-loading">⏳</div>';
        const { fetchLeaderboard } = await import('./leaderboard.js');
        const data = await fetchLeaderboard(mode, '');
        body.innerHTML = _renderLbRows(data, mode);
    }

    function _renderLbRows(data, mode) {
        const top = data?.top ?? [];
        if (!top.length) return '<div class="lb-empty" style="text-align:center;padding:32px;color:rgba(255,255,255,0.3)">Nessun punteggio ancora</div>';
        const isSolo = mode === 'solo';
        function fmt(n) { return `€${Number(n).toLocaleString('it-IT')}`; }
        function fmtT(s) { const m = Math.floor(s/60); return `${m}:${String(s%60).padStart(2,'0')}`; }
        function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
        const rows = top.map((e, i) => {
            const rank = i + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
            const metric = isSolo ? fmtT(e.time_seconds ?? 0) : fmt(e.score);
            return `<div class="lb-row ${rank <= 3 ? 'lb-top' : ''}" style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.05);">
                <span class="lb-rank" style="width:28px;text-align:center;font-size:${rank<=3?'1.1':'0.85'}rem;">${medal}</span>
                <span class="lb-name" style="flex:1;font-size:0.88rem;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(e.nickname)}</span>
                <span style="font-size:0.78rem;color:rgba(251,191,36,0.7);font-weight:600;">${metric}</span>
            </div>`;
        }).join('');
        return `<div class="lb-table" style="padding:0 2px;">${rows}</div>`;
    }

    document.querySelectorAll('.tab-lb-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            _lbMode = btn.dataset.mode;
            document.querySelectorAll('.tab-lb-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            _loadLbTab(_lbMode);
        });
    });

    // ── Profile tab actions ──
    document.getElementById('prof-friends-btn')?.addEventListener('click', () => {
        const fp = document.getElementById('friends-panel');
        if (!fp) return;
        const open = fp.style.display !== 'none';
        fp.style.display = open ? 'none' : 'block';
        if (!open) document.getElementById('spb-friends-btn')?.click();
    });

    document.getElementById('fp-close-btn')?.addEventListener('click', () => {
        const fp = document.getElementById('friends-panel');
        if (fp) fp.style.display = 'none';
    });

    document.getElementById('prof-history-btn')?.addEventListener('click', () => {
        document.getElementById('history-btn')?.click();
    });

    document.getElementById('prof-rules-btn')?.addEventListener('click', () => {
        document.getElementById('how-to-play-btn')?.click();
    });

    document.getElementById('prof-lang-btn')?.addEventListener('click', () => {
        document.getElementById('lang-toggle-btn')?.click();
    });

    document.getElementById('prof-audio-btn')?.addEventListener('click', () => {
        document.getElementById('audio-toggle-btn')?.click();
    });

    document.getElementById('prof-signout-btn')?.addEventListener('click', () => {
        document.getElementById('spb-signout-btn')?.click();
        switchTab('play');
    });
}

// Expose soundManager globally so the inline tutorial/audio script can use it
window.soundManager = soundManager;

// Native app integrations (Capacitor)
if (isNative) {
    document.documentElement.classList.add('is-native');

    // Inject Lucide icons into mode cards (replaces emoji)
    import('./icons.js').then(({ ic }) => {
        const soloIcon  = document.getElementById('mode-icon-solo');
        const multiIcon = document.getElementById('mode-icon-multi');
        if (soloIcon)  soloIcon.innerHTML  = ic('rotate', 28);
        if (multiIcon) multiIcon.innerHTML = ic('users', 28);
    });

    // Android back button — no confirmation, always go home directly
    document.addEventListener('backbutton', () => {
        const active = document.querySelector('.screen.active');
        if (!active) return;
        const id = active.id;
        if (id === 'game-screen' || id === 'win-screen') {
            gameState.currentManche = 0; // bypass confirmation popup
            newGame();
        }
        // setup-screen / login-screen: let Android minimize app
    });
}


// TEST HELPER — skip to manche 5 from console: _skipToManche5()
window._skipToManche5 = () => {
    gameState.currentManche = 4;
    endManche();
};

// Boot: native shows login first, web boots directly
function bootApp() {
    initSetup();
    initSoloButton();
    initMobileLayout();
    loadPuzzles();
    renderWheelToCache();
    drawWheel(0);
}

onNativeReady(bootApp);

bootNative().then(() => {
    if (!isNative) bootApp();
});
