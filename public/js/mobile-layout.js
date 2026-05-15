let mlActive = false;
let saved = {};

function isMobileLandscape() {
    return window.innerWidth <= 1024 && window.innerWidth > window.innerHeight;
}

function apply() {
    if (mlActive) return;
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen?.classList.contains('active')) return;

    const get = id => document.getElementById(id);
    const qs  = sel => document.querySelector(sel);

    const hintDisplay    = get('hint-display');
    const boardContainer = qs('.board-container');
    const playersSidebar = qs('.players-sidebar');
    const wheelSidebar   = qs('.wheel-value-sidebar');
    const centralAction  = get('central-action-area');
    const actionsRow     = qs('.game-actions-row');
    const gameFooter     = qs('.game-footer');
    const mainLayout     = qs('.game-main-layout');

    if (!hintDisplay || !boardContainer || !centralAction || !actionsRow) return;

    // Save positions for restoration
    const savePos = el => ({ parent: el.parentNode, next: el.nextSibling });
    saved = {
        hintDisplay:    savePos(hintDisplay),
        boardContainer: savePos(boardContainer),
        playersSidebar: savePos(playersSidebar),
        wheelSidebar:   savePos(wheelSidebar),
        centralAction:  savePos(centralAction),
        actionsRow:     savePos(actionsRow),
        mainLayout:     savePos(mainLayout),
    };

    // Left panel: category hint + board
    const left = document.createElement('div');
    left.id = 'ml-left';
    left.appendChild(hintDisplay);
    left.appendChild(boardContainer);

    // Right panel: scores + action + controls
    const right = document.createElement('div');
    right.id = 'ml-right';

    const scoresRow = document.createElement('div');
    scoresRow.id = 'ml-scores';
    scoresRow.appendChild(playersSidebar);
    scoresRow.appendChild(wheelSidebar);
    right.appendChild(scoresRow);
    right.appendChild(centralAction);
    right.appendChild(actionsRow);

    const topBar = qs('.game-top-bar');
    topBar.after(left, right);

    mainLayout.style.display = 'none';
    if (gameFooter) gameFooter.style.display = 'none';

    gameScreen.classList.add('ml-active');
    mlActive = true;
}

function restore() {
    if (!mlActive) return;

    const restoreEl = (el, info) => {
        if (!el || !info?.parent) return;
        if (info.next) info.parent.insertBefore(el, info.next);
        else info.parent.appendChild(el);
    };

    restoreEl(document.getElementById('hint-display'),       saved.hintDisplay);
    restoreEl(document.querySelector('.board-container'),    saved.boardContainer);
    restoreEl(document.querySelector('.players-sidebar'),    saved.playersSidebar);
    restoreEl(document.querySelector('.wheel-value-sidebar'),saved.wheelSidebar);
    restoreEl(document.getElementById('central-action-area'),saved.centralAction);
    restoreEl(document.querySelector('.game-actions-row'),   saved.actionsRow);

    document.getElementById('ml-left')?.remove();
    document.getElementById('ml-right')?.remove();
    document.getElementById('ml-scores')?.remove();

    const mainLayout = document.querySelector('.game-main-layout');
    if (mainLayout) mainLayout.style.display = '';
    const gameFooter = document.querySelector('.game-footer');
    if (gameFooter) gameFooter.style.display = '';

    document.getElementById('game-screen')?.classList.remove('ml-active');
    mlActive = false;
}

export function applyMobileLayout() {
    if (isMobileLandscape()) apply();
    else restore();
}

export function initMobileLayout() {
    window.addEventListener('resize', () => {
        const gs = document.getElementById('game-screen');
        if (!gs?.classList.contains('active')) return;
        if (isMobileLandscape()) apply();
        else restore();
    });
}
