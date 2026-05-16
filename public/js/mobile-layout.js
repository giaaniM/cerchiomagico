let active = false;
let saved = {};
let _keyboardHandler = null;

function isMobile() {
    return window.innerWidth <= 768;
}

function collectElements() {
    const get = id => document.getElementById(id);
    const qs  = sel => document.querySelector(sel);
    return {
        hintDisplay:    get('hint-display'),
        boardContainer: qs('.board-container'),
        playersSidebar: qs('.players-sidebar'),
        wheelSidebar:   qs('.wheel-value-sidebar'),
        centralAction:  get('central-action-area'),
        actionsRow:     qs('.game-actions-row'),
        gameFooter:     qs('.game-footer'),
        mainLayout:     qs('.game-main-layout'),
        topBar:         qs('.game-top-bar'),
        gameScreen:     get('game-screen'),
    };
}

function applyPortrait() {
    if (active) return;
    const els = collectElements();
    if (!els.gameScreen?.classList.contains('active')) return;
    if (!els.hintDisplay || !els.boardContainer || !els.centralAction || !els.actionsRow) return;

    const get = id => document.getElementById(id);
    const skipBtn = get('skip-phrase-btn');

    const pos = el => el ? { parent: el.parentNode, next: el.nextSibling } : null;
    saved = {
        hintDisplay:    pos(els.hintDisplay),
        boardContainer: pos(els.boardContainer),
        playersSidebar: pos(els.playersSidebar),
        wheelSidebar:   pos(els.wheelSidebar),
        centralAction:  pos(els.centralAction),
        actionsRow:     pos(els.actionsRow),
        skipBtn:        pos(skipBtn),
    };

    const col = document.createElement('div');
    col.id = 'mp-column';
    col.appendChild(els.hintDisplay);
    col.appendChild(els.boardContainer);
    col.appendChild(els.centralAction);
    col.appendChild(els.actionsRow);

    const scoresRow = document.createElement('div');
    scoresRow.id = 'mp-scores';
    scoresRow.appendChild(els.playersSidebar);
    scoresRow.appendChild(els.wheelSidebar);
    col.appendChild(scoresRow);

    if (skipBtn) col.appendChild(skipBtn);

    els.topBar.after(col);
    els.mainLayout.style.display = 'none';
    if (els.gameFooter) els.gameFooter.style.display = 'none';

    document.body.style.padding = '0';
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    window.scrollTo(0, 0);

    els.gameScreen.classList.add('mp-active');
    active = true;

    // Reset scroll position after DOM rearrangement (iOS can restore old position)
    requestAnimationFrame(() => {
        col.scrollTop = 0;
        window.scrollTo(0, 0);
    });

    // Scroll input into view when keyboard opens
    _keyboardHandler = (e) => {
        const el = e.target;
        if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 350);
    };
    document.addEventListener('focusin', _keyboardHandler);
}

function restoreLayout() {
    if (!active) return;

    if (_keyboardHandler) {
        document.removeEventListener('focusin', _keyboardHandler);
        _keyboardHandler = null;
    }

    const get = id => document.getElementById(id);
    const qs  = sel => document.querySelector(sel);
    const restoreEl = (el, info) => {
        if (!el || !info?.parent) return;
        if (info.next) info.parent.insertBefore(el, info.next);
        else info.parent.appendChild(el);
    };

    restoreEl(get('hint-display'),        saved.hintDisplay);
    restoreEl(qs('.board-container'),     saved.boardContainer);
    restoreEl(qs('.players-sidebar'),     saved.playersSidebar);
    restoreEl(qs('.wheel-value-sidebar'), saved.wheelSidebar);
    restoreEl(get('central-action-area'), saved.centralAction);
    restoreEl(qs('.game-actions-row'),    saved.actionsRow);
    restoreEl(get('skip-phrase-btn'),     saved.skipBtn);

    get('mp-column')?.remove();
    get('mp-scores')?.remove();

    const mainLayout = qs('.game-main-layout');
    if (mainLayout) mainLayout.style.display = '';
    const gameFooter = qs('.game-footer');
    if (gameFooter) gameFooter.style.display = '';

    document.body.style.padding = '';
    document.body.style.margin = '';
    document.body.style.overflow = '';

    get('game-screen')?.classList.remove('mp-active');
    active = false;
}

export function applyMobileLayout() {
    if (isMobile()) applyPortrait();
    else restoreLayout();
}

export function initMobileLayout() {
    window.addEventListener('resize', () => {
        const gs = document.getElementById('game-screen');
        if (!gs?.classList.contains('active')) return;
        if (isMobile()) applyPortrait();
        else restoreLayout();
    });
}
