import { gameState } from './state.js';
import { elements } from './elements.js';
import { showPopup, popup, npPopup, avatarUrl } from './utils.js';
import { t } from './lang.js';

// Forward reference — updateUI and syncGameState injected to avoid circular deps
let _updateUI = () => {};
let _syncGameState = () => {};
export function setUpdateUI(fn) { _updateUI = fn; }
export function setSyncGameState(fn) { _syncGameState = fn; }

// ===== Players =====
export function renderPlayersList() {
    elements.playersList.innerHTML = '';

    // Create a list of players with their current index to preserve tracking
    const playersWithIndex = gameState.players.map((player, index) => ({
        player,
        originalIndex: index,
        score: gameState.partialScores[player.name] || 0
    }));

    playersWithIndex.forEach((item) => {
        const li = document.createElement('li');
        // Check if this player is the current active player
        li.className = item.originalIndex === gameState.currentPlayerIndex ? 'active' : '';

        // Add Jolly shield if player has it (with pulsing animation)
        const shieldIcon = gameState.hasShield[item.player.name] ? '<span class="shield-icon">🛡️</span>' : '';

        const itemAvatarUrl = avatarUrl(item.player.name);

        li.innerHTML = `
            <div class="player-avatar-wrap">
                <img src="${itemAvatarUrl}" class="player-avatar" alt="Avatar">
                ${gameState.hasShield[item.player.name] ? '<span class="player-shield-badge">🛡️</span>' : ''}
            </div>
            <div class="player-info-wrap">
                <span class="player-name">${item.player.name}</span>
                <span class="player-score">€${item.score}</span>
            </div>
        `;
        elements.playersList.appendChild(li);
    });

    renderTotalWinnings();
}

export function renderTotalWinnings() {
    if (!elements.totalWinningsDisplay) return;
    elements.totalWinningsDisplay.innerHTML = '';

    // Create a list of players with their cumulative total scores
    const playersWithTotals = gameState.players.map((player) => ({
        name: player.name,
        total: gameState.totalScores[player.name] || 0
    }));

    // Sort by total score descending
    playersWithTotals.sort((a, b) => b.total - a.total);

    playersWithTotals.forEach((item) => {
        const li = document.createElement('li');
        const itemAvatarUrl = avatarUrl(item.name);

        li.innerHTML = `
            <img src="${itemAvatarUrl}" class="total-avatar" alt="Avatar">
            <span class="win-name">${item.name}</span>
            <span class="win-amount">€${item.total}</span>
        `;
        elements.totalWinningsDisplay.appendChild(li);
    });
}

export function getCurrentPlayer() {
    return gameState.players[gameState.currentPlayerIndex];
}

export function passTurn() {
    gameState.currentPlayerIndex = (gameState.currentPlayerIndex + 1) % gameState.players.length;
    gameState.pendingWheelValue = null;

    // Logic for Final Round (Manche 5)
    if (gameState.currentManche === 5) {
        gameState.wheelPhase = 'final_play';
    } else {
        gameState.wheelPhase = 'idle';
    }

    elements.currentWheelValue.textContent = '-';
    elements.currentWheelValue.className = 'wheel-value';
    if (gameState.currentManche === 5) {
        elements.currentWheelValue.textContent = `€${gameState.finalRoundValue}`;
        elements.currentWheelValue.className = 'wheel-value final-round-active';
    }

    _updateUI();
    _syncGameState();

    const nextPlayer = getCurrentPlayer();
    showPopup(npPopup({
        badge: t('msg.turno'),
        avatar: avatarUrl(nextPlayer.name),
        main: nextPlayer.name,
    }), 2500, 'slim-pad');
}
