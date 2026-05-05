import { gameState } from './state.js';
import { elements } from './elements.js';
import { showPopup, showMessage, popup } from './utils.js';
import { soundManager } from './sound.js';
import { getCurrentPlayer, passTurn, renderPlayersList } from './players.js';
import { updateUI, checkFinalRoundBanner, checkExpressBanner } from './ui.js';

// Wheel Animation Cache Variables
let wheelCacheCanvas = null;
let wheelCacheCtx = null;
let wheelAnimationId = null;

// ===== Wheel Segments =====
export const WHEEL_SEGMENTS = [
    // Group 1
    { value: 300, color: '#b45309', label: '300€' }, // Amber
    { value: 200, color: '#065f46', label: '200€' }, // Deep Emerald
    { value: 700, color: '#0f766e', label: '700€' }, // Teal
    { value: 500, color: '#0891b2', label: '500€' }, // Cyan
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },
    { value: 1000, color: 'RAINBOW', label: '1000€', glowing: true }, // 1000 Rainbow

    // Group 2
    { value: 'PERDITUTTO', color: '#111827', label: 'PERDITUTTO' },
    { value: 350, color: '#9a3412', label: '350€' }, // Burnt Orange
    { value: 300, color: '#065f46', label: '300€' }, // Deep Emerald
    { value: 450, color: '#0f766e', label: '450€' }, // Teal
    { value: 700, color: '#0891b2', label: '700€' }, // Cyan
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },

    // Group 3
    { value: 'RADDOPPIA', color: 'GOLD', label: 'RADDOPPIA', glowing: true },
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },
    { value: 800, color: '#0f766e', label: '800€' }, // Teal
    { value: 300, color: '#0891b2', label: '300€' }, // Cyan
    { value: 'MEGATURNO', color: 'EXPRESS', label: 'MEGATURNO', glowing: true },
    { value: '?500', color: '#166534', label: '?500' }, // Forest Green

    // Group 4
    { value: 'SCUDO', color: '#0369a1', label: 'SCUDO' }, // Ocean Blue
    { value: 300, color: '#065f46', label: '300€' }, // Deep Emerald
    { value: 500, color: '#0891b2', label: '500€' }, // Cyan
    { value: 200, color: '#34d399', label: '200€' }, // Mint
    { value: 'PASSA', color: '#FFFFFF', label: 'PASSA' },
    { value: 200, color: '#b45309', label: '200€' } // Amber
];

// ===== Wheel Drawing =====
export function renderWheelToCache() {
    const canvas = elements.wheelCanvas;
    if (!canvas) return;

    // Create or resize off-screen canvas to match wheel canvas
    if (!wheelCacheCanvas) {
        wheelCacheCanvas = document.createElement('canvas');
    }
    wheelCacheCanvas.width = canvas.width;
    wheelCacheCanvas.height = canvas.height;
    wheelCacheCtx = wheelCacheCanvas.getContext('2d');

    const ctx = wheelCacheCtx;
    const centerX = wheelCacheCanvas.width / 2;
    const centerY = wheelCacheCanvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    const scale = wheelCacheCanvas.width / 300;

    ctx.clearRect(0, 0, wheelCacheCanvas.width, wheelCacheCanvas.height);

    const segmentAngle = (2 * Math.PI) / WHEEL_SEGMENTS.length;

    WHEEL_SEGMENTS.forEach((segment, i) => {
        const startAngle = i * segmentAngle;
        const endAngle = startAngle + segmentAngle;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.clip(); // Ensure everything stays within the segment slice

        // Reset Effects for each segment to prevent "bleeding"
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Radial Gradient Logic (Universal Vignette Effect)
        let fillStyle;

        if (segment.color === 'RAINBOW') {
            // RAINBOW GRADIENT (Dark Center -> Rainbow Rim)
            const rainGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            rainGrad.addColorStop(0, '#000000'); // Black center
            rainGrad.addColorStop(0.3, '#330033'); // Deep purple
            rainGrad.addColorStop(0.5, '#ff0000'); // Red
            rainGrad.addColorStop(0.65, '#ffcc00'); // Yellow
            rainGrad.addColorStop(0.8, '#00ff00'); // Green
            rainGrad.addColorStop(0.9, '#00ccff'); // Blue
            rainGrad.addColorStop(1, '#ff00ff'); // Rim
            fillStyle = rainGrad;

        } else if (segment.color === 'EXPRESS') {
            const expGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            expGrad.addColorStop(0, '#c084fc'); // Bright center (Fuchsia/Purple)
            expGrad.addColorStop(0.5, '#9333ea'); // Purple
            expGrad.addColorStop(1, '#3b0764'); // Very dark rim for contrast
            fillStyle = expGrad;
            ctx.shadowColor = '#d946ef'; // Fuchsia glow
            ctx.shadowBlur = 15 * scale;
        } else if (segment.color === '#9333EA') {
            // SCUDO - violet radial gradient
            const scudoGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            scudoGrad.addColorStop(0, '#c084fc');
            scudoGrad.addColorStop(0.5, '#9333ea');
            scudoGrad.addColorStop(1, '#3b0764');
            fillStyle = scudoGrad;
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 10 * scale;
        } else if (segment.color === 'GOLD' || segment.glowing) {
            // INVERTED GOLD GRADIENT (Radial, Bright Center -> Dark Rim)
            const goldGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            goldGrad.addColorStop(0, '#fef3c7'); // Bright Gold center
            goldGrad.addColorStop(0.4, '#f59e0b'); // Amber
            goldGrad.addColorStop(0.8, '#422006'); // Dark brown
            goldGrad.addColorStop(1, '#000000'); // Black rim
            fillStyle = goldGrad;

            // Add internal glow (contained by clip)
            ctx.shadowColor = '#fbbf24';
            ctx.shadowBlur = 15 * scale;
        } else {
            // Standard Segments - Deep Vignette
            const baseColor = segment.color;
            const vignetteGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
            if (baseColor === '#FFFFFF' || baseColor === '#f8fafc') {
                // For White segments (PASSA, ?500, CRISTALLO), keep center bright
                vignetteGrad.addColorStop(0, '#FFFFFF'); // Bright center
                vignetteGrad.addColorStop(0.6, '#f8fafc'); // Mostly white
                vignetteGrad.addColorStop(1, '#cbd5e1'); // Light gray rim
            } else {
                vignetteGrad.addColorStop(0, '#000000'); // Black center
                vignetteGrad.addColorStop(0.3, '#0f172a'); // Dark area
                vignetteGrad.addColorStop(1, baseColor);
            }
            fillStyle = vignetteGrad;
        }

        ctx.fillStyle = fillStyle;
        ctx.fill();

        // ADD GLITTER (BRILLANTINATO) FOR SPECIAL SEGMENTS
        if (segment.color === 'EXPRESS' || segment.color === 'RAINBOW') {
            ctx.save();
            const sparkleCount = segment.color === 'RAINBOW' ? 200 : 150;
            for (let j = 0; j < sparkleCount * scale; j++) {
                const r = Math.random() * radius;
                const a = startAngle + Math.random() * segmentAngle;
                const gx = centerX + r * Math.cos(a);
                const gy = centerY + r * Math.sin(a);

                if (segment.color === 'EXPRESS') {
                    // Random white/silver/violet sparkles
                    ctx.fillStyle = Math.random() > 0.5 ? '#ffffff' : '#e9d5ff';
                } else {
                    // Rainbow sparkles: mostly white to pop over colors
                    ctx.fillStyle = '#ffffff';
                }

                ctx.globalAlpha = 0.1 + Math.random() * 0.6;

                ctx.beginPath();
                // Tiny sparkles
                const size = Math.random() * 1.2 * scale;
                ctx.arc(gx, gy, size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        ctx.restore(); // Stop clipping

        // Draw Stroke (Outside the clip to avoid cutting border in half)
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
        ctx.restore();

        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + segmentAngle / 2);

        // Text Color Logic
        const label = segment.label;
        if (label === 'PASSA') {
            ctx.fillStyle = '#000000';
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.strokeStyle = 'transparent'; // No stroke either
        }
        else if (label === 'PERDITUTTO') ctx.fillStyle = '#FFFFFF';
        else if (label === 'MEGATURNO') {
            ctx.fillStyle = '#fbbf24'; // Vivid yellow as requested
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3 * scale;
        }
        else if (label === 'SCUDO') {
            ctx.fillStyle = '#FFFFFF'; // White text on purple background
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3 * scale;
        }
        else if (label === '?500') {
            ctx.fillStyle = '#FFFF00'; // Yellow text on dark green
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 4 * scale;
        }
        else if (label === 'RADDOPPIA') ctx.fillStyle = '#FFFFFF';
        else {
            ctx.fillStyle = '#FFFF00'; // All other numeric values YELLOW
            ctx.shadowColor = '#000';
            ctx.shadowBlur = 3 * scale;
        }

        ctx.textAlign = 'center';
        if (label !== 'PASSA') ctx.lineWidth = 3 * scale;

        const chars = label.replace(/\s/g, '').split('');

        // Text Styling (Refined)
        let fontSize = 21 * scale;
        if (label === 'PERDITUTTO') fontSize = 10.5 * scale;
        else if (label === 'PASSA') fontSize = 16 * scale;
        else if (label === 'RADDOPPIA') fontSize = 9 * scale;
        else if (label === 'MEGATURNO') fontSize = 10 * scale;
        else if (label === 'SCUDO') fontSize = 13 * scale;
        else if (label === '?500') fontSize = 18 * scale;
        else if (label === 'EXPRESS') fontSize = 14 * scale;

        ctx.font = `bold ${fontSize}px Lexend, sans-serif`;

        // Text Radius Logic
        let baseRadius = 0.86;

        if (label === 'MEGATURNO') baseRadius = 0.88;
        if (label === 'PASSA') baseRadius = 0.87;
        if (label === 'RADDOPPIA') baseRadius = 0.89;
        if (label === 'EXPRESS') baseRadius = 0.88;
        if (label === 'PERDITUTTO') baseRadius = 0.89;
        if (label === 'SCUDO') baseRadius = 0.87;
        if (label === '?500') baseRadius = 0.86;

        let currentRadius = radius * baseRadius;

        // Extremely tight spacing for long words
        const charSpacing = (label === 'PERDITUTTO' || label === 'RADDOPPIA') ? 0.78 : 0.85;

        // Draw Characters
        chars.forEach(char => {
            ctx.save();
            ctx.translate(currentRadius, 0);
            ctx.rotate(Math.PI / 2);

            if (char === '€') {
                ctx.font = `bold ${fontSize * 0.55}px Lexend, sans-serif`;
            } else {
                ctx.font = `bold ${fontSize}px Lexend, sans-serif`;
            }

            ctx.fillText(char, 0, 0);
            ctx.restore();
            // Extremely tight spacing
            const currentSpacing = (char === '€') ? charSpacing * 0.2 : charSpacing;
            currentRadius -= fontSize * currentSpacing;
        });

        // DRAW ICONS (🛡️, 🚀, 🎲) AFTER TEXT
        if (label === 'SCUDO') {
            ctx.save();
            ctx.translate(currentRadius - (6 * scale), 0);
            ctx.rotate(Math.PI / 2);
            ctx.font = `${16 * scale}px Lexend, sans-serif`;
            ctx.fillText('🛡️', 0, 0);
            ctx.restore();
        } else if (label === 'MEGATURNO') {
            ctx.save();
            ctx.translate(currentRadius - (6 * scale), 0);
            ctx.rotate(Math.PI / 2);
            ctx.font = `${14 * scale}px Lexend, sans-serif`;
            ctx.fillText('🚀', 0, 0);
            ctx.restore();
        }

        ctx.restore();
    });
    // Pegs removed per user request
}

export function drawWheel(rotation = 0) {
    const canvas = elements.wheelCanvas;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Lazy initialize cache
    if (!wheelCacheCanvas) {
        renderWheelToCache();
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw pre-rendered wheel with rotation
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(wheelCacheCanvas, -centerX, -centerY);
    ctx.restore();

    // Draw center circle (always on top, no rotation needed)
    const scale = canvas.width / 300;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30 * scale, 0, 2 * Math.PI);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3 * scale;
    ctx.stroke();
    // Pointer is handled by HTML element .wheel-pointer
}

// ===== Wheel Spinning =====
export function spinWheel() {
    // Special handling for Final Spin Phase
    if (gameState.wheelPhase === 'final_spin') {
        // Proceed to spin logic below...
    } else if (gameState.wheelPhase !== 'idle' && gameState.wheelPhase !== 'choose_action') {
        return;
    }

    gameState.wheelPhase = 'spinning';
    updateUI();

    const overlay = document.getElementById('wheel-overlay');
    if (overlay) overlay.classList.add('active');

    const segmentAngle = 360 / WHEEL_SEGMENTS.length;

    let randomSegmentIndex;
    if (gameState.wheelPhase === 'final_spin') {
        const numericIndices = WHEEL_SEGMENTS
            .map((s, i) => ({ s, i }))
            .filter(({ s }) => typeof s.value === 'number' && s.value > 0)
            .map(({ i }) => i);
        randomSegmentIndex = numericIndices[Math.floor(Math.random() * numericIndices.length)];
    } else {
        randomSegmentIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    }
    const resultFragment = WHEEL_SEGMENTS[randomSegmentIndex];

    // Stop near the EDGE of the segment (in bilico)
    const edgeSide = Math.random() > 0.5 ? 1 : -1;
    const edgeOffset = edgeSide * (0.4 + Math.random() * 0.08); // 40-48% from center

    const segmentCenter = randomSegmentIndex * segmentAngle + segmentAngle / 2;
    let targetRotationDelta = 270 - segmentCenter + (edgeOffset * segmentAngle);
    targetRotationDelta = (targetRotationDelta % 360 + 360) % 360;

    const minSpins = 3 + Math.floor(Math.random() * 2);
    const startRotation = gameState.wheelRotation;
    const targetRotation = startRotation + targetRotationDelta + (minSpins * 360);
    const totalRotation = targetRotation - startRotation;

    const duration = 8000;
    const startTime = performance.now();
    let lastTickSegment = -1;
    let lastRotation = startRotation;

    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Single smooth ease-out curve
        const ease = 1 - Math.pow(1 - progress, 5); // Quintic ease out

        const currentRotation = startRotation + totalRotation * ease;
        const rotationDelta = currentRotation - lastRotation;
        lastRotation = currentRotation;

        gameState.wheelRotation = currentRotation;
        drawWheel(currentRotation);

        const currentSegment = Math.floor(((270 - currentRotation) % 360 + 360) % 360 / segmentAngle);

        if (currentSegment !== lastTickSegment && rotationDelta > 0.02) {
            soundManager.playWheelTick();
            lastTickSegment = currentSegment;
        }

        if (progress < 1) {
            wheelAnimationId = requestAnimationFrame(animate);
        } else {
            // Calculate the ACTUAL segment from final position
            const finalAngle = ((270 - currentRotation) % 360 + 360) % 360;
            const actualSegmentIndex = Math.floor(finalAngle / segmentAngle);
            const actualResult = WHEEL_SEGMENTS[actualSegmentIndex];

            setTimeout(() => onWheelStop(actualResult), 1500);

            setTimeout(() => {
                const overlay = document.getElementById('wheel-overlay');
                if (overlay) overlay.classList.remove('active');
            }, 2500);
        }
    }

    wheelAnimationId = requestAnimationFrame(animate);
}


export function onWheelStop(result) {
    // --- FINAL ROUND INITIAL SPIN (TOP PRIORITY) ---
    if (gameState.currentManche === 5 && !gameState.finalSpinComplete) {
        const baseValue = typeof result.value === 'number' ? result.value : 0;

        if (baseValue > 0) {
            // Success: Numerical value hit
            gameState.finalRoundValue = baseValue + 1000;
            gameState.finalSpinComplete = true;
            gameState.wheelPhase = 'final_play';

            elements.currentWheelValue.textContent = `€${gameState.finalRoundValue}`;
            elements.currentWheelValue.className = 'wheel-value final-round-active';

            checkFinalRoundBanner();

            showPopup(popup('⭐', 'VALORE FISSATO!', `€${baseValue} + €1000 bonus<br>Ogni lettera vale <strong style="color:#fbbf24">€${gameState.finalRoundValue}</strong><br><br>Gioca: ${getCurrentPlayer().name}`), 6000, 'warning');

            setTimeout(() => {
                updateUI();
                // syncGameState called from socket module if needed
            }, 3000);
        } else {
            // Failure: Special segment hit (PASSA, PERDITUTTO, etc.)
            soundManager.playError();
            gameState.wheelPhase = 'final_spin'; // Allow re-spin
            elements.currentWheelValue.textContent = 'GIRA ANCORA';
            updateUI();

            const label = result.label || result.value;
            showPopup(popup('⚠️', 'VALORE NON VALIDO', `Uscito: ${label} — Gira di nuovo`), 3500, 'danger');
        }
        return; // Important: Consume the event
    }

    if (result.value === 'MEGATURNO' || result.value === 'EXPRESS') {
        soundManager.init();
        soundManager.playExpress();
        elements.currentWheelValue.textContent = 'MEGATURNO';
        elements.currentWheelValue.className = 'wheel-value express-active';
        gameState.wheelPhase = 'express';
        gameState.expressAccumulated = 0;

        if (elements.boardInner) elements.boardInner.classList.add('express-active');

        updateUI();
        checkExpressBanner();
        showPopup(popup('🚀', 'MEGATURNO!', 'Consonante: +€500 per occorrenza<br>Vocale: −€500<br><br>⚠️ Sbagliare = Perditutto!'), 5000, 'special');
        return;
    }

    const player = getCurrentPlayer();

    if (result.value === 'PASSA') {
        if (gameState.hasShield[player.name]) {
            handlePenaltyWithShield(player, 'PASSA');
        } else {
            soundManager.playError();
            elements.currentWheelValue.textContent = 'PASSA';
            elements.currentWheelValue.className = 'wheel-value passa';
            showPopup(popup('⏭️', 'PASSA!', 'Turno perso'), 2000, 'warning');
            setTimeout(passTurn, 2500);
        }
    } else if (result.value === 'RADDOPPIA') {
        elements.currentWheelValue.textContent = 'RADDOPPIA';
        elements.currentWheelValue.className = 'wheel-value raddoppia';
        gameState.pendingWheelValue = 'RADDOPPIA';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        showMessage('RADDOPPIA! Chiama una consonante per raddoppiare il tuo punteggio!', 'info');
    } else if (result.value === 'SCUDO') {
        elements.currentWheelValue.textContent = 'SCUDO';
        elements.currentWheelValue.className = 'wheel-value megaturno';
        gameState.pendingWheelValue = 'SCUDO';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        showMessage('SCUDO! Chiama una consonante per ottenere la protezione!', 'info');
    } else if (result.value === 'PERDITUTTO') {
        if (gameState.hasShield[player.name]) {
            handlePenaltyWithShield(player, 'PERDITUTTO');
        } else {
            soundManager.playGameOver();
            elements.currentWheelValue.textContent = 'PERDITUTTO';
            elements.currentWheelValue.className = 'wheel-value perditutto';
            gameState.partialScores[player.name] = 0;
            gameState.totalScores[player.name] = 0;
            renderPlayersList();
            showPopup(popup('💥', 'PERDITUTTO!', 'Hai perso tutto il bottino'), 4000, 'danger');
            setTimeout(passTurn, 4500);
        }
    } else if (result.value === '?500') {
        soundManager.playClick();
        handleMysterySegment();
    } else {
        // Normal value - apply multiplier if active
        soundManager.playClick();
        const baseValue = result.value;
        const finalValue = baseValue * gameState.nextValueMultiplier;

        gameState.pendingWheelValue = finalValue;
        const displayValue = isNaN(finalValue) ? '?' : `€${finalValue}`;
        elements.currentWheelValue.textContent = displayValue;
        elements.currentWheelValue.className = 'wheel-value';

        // Reset multiplier after use
        if (gameState.nextValueMultiplier > 1) {
            showMessage(`🔥 Valore RADDOPPIATO! Chiama una consonante (vale €${finalValue})`, 'success');
            gameState.nextValueMultiplier = 1;
        } else {
            showMessage(`Chiama una consonante (vale €${finalValue})`, 'info');
        }

        gameState.wheelPhase = 'call_consonant';
        updateUI();
    }
}

function handlePenaltyWithShield(player, penaltyType) {
    gameState.pendingPenalty = penaltyType;
    const title = penaltyType === 'PERDITUTTO' ? '💥 PERDITUTTO!' : '⏭️ PASSA';
    const penaltyText = penaltyType === 'PERDITUTTO'
        ? 'Hai lo SCUDO DI PROTEZIONE! 🛡️<br>Vuoi usarlo per salvarti dalla Perditutto?'
        : 'Hai lo SCUDO DI PROTEZIONE! 🛡️<br>Vuoi usarlo per non perdere il turno?';

    const html = `
        <div class="popup-megaturno-choice">
            <div class="jolly-choice-title">${title}</div>
            <p class="jolly-choice-text">${penaltyText}</p>
            <div class="mystery-cards-container">
                <!-- Use Shield -->
                <div class="mystery-card left" onclick="resolveShieldChoice(true)">
                    <div class="card-content">
                        <span class="card-icon">🛡️</span>
                        <span class="card-text">USA<br>SCUDO</span>
                    </div>
                </div>

                <!-- Accept Penalty -->
                <div class="mystery-card right" onclick="resolveShieldChoice(false)">
                    <div class="card-content">
                        <span class="card-icon">${penaltyType === 'PERDITUTTO' ? '💥' : '⏭️'}</span>
                        <span class="card-text">ACCETTA<br>${penaltyType}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    showPopup(html, 0);
}

window.resolveShieldChoice = function (useShield) {
    const player = getCurrentPlayer();
    const penaltyType = gameState.pendingPenalty;
    elements.modalOverlay.style.display = 'none';
    elements.popupMessage.style.display = 'none';

    if (useShield) {
        soundManager.playReveal();
        gameState.hasShield[player.name] = false;
        renderPlayersList();
        showPopup(popup('🛡️', 'SCUDO UTILIZZATO!', `${player.name} è salvo!`), 2500, 'subtle-success');

        setTimeout(() => {
            gameState.wheelPhase = 'idle';
            updateUI();
            showMessage('Sei salvo! Gira di nuovo!', 'success');
        }, 2500);
    } else {
        if (penaltyType === 'PERDITUTTO') {
            soundManager.playGameOver();
            gameState.partialScores[player.name] = 0;
            gameState.totalScores[player.name] = 0;
            renderPlayersList();
            showPopup(popup('💥', 'PERDITUTTO!', 'Hai perso tutto il bottino<br><small>(Scudo conservato)</small>'), 4000, 'danger');
            setTimeout(passTurn, 4500);
        } else {
            soundManager.playError();
            showPopup(popup('⏭️', 'PASSA', `${player.name} passa la mano<br><small>(Scudo conservato)</small>`), 2500, 'warning');
            setTimeout(passTurn, 3000);
        }
    }
    delete gameState.pendingPenalty;
};

function handleMysterySegment() {
    const html = `
        <div class="popup-mystery-minimal">
            <div class="mystery-title">SCELTA MISTERIOSA</div>
            <div class="mystery-cards-container">
                <!-- Card 1: Risk (500) -->
                <div class="mystery-card left" onclick="resolveMysteryChoice(500)">
                    <div class="card-content">
                        <span class="card-icon">💶</span>
                        <span class="card-text">SICURO<br>€500</span>
                    </div>
                </div>

                <!-- Card 2: Raffle -->
                <div class="mystery-card right" onclick="resolveMysteryChoice('RAFFLE')">
                    <div class="card-content">
                        <span class="card-icon">🎲</span>
                        <span class="card-text">RISCHIA<br>ESTRAI</span>
                    </div>
                </div>
            </div>
            <p class="mystery-note">Scegli tra i 500€ sicuri o tenta la sorte!</p>
        </div>
    `;
    showPopup(html, 0); // Permanent until clicked
}

window.resolveMysteryChoice = function (choice) {
    elements.modalOverlay.style.display = 'none';
    elements.popupMessage.style.display = 'none';

    let finalValue;
    if (choice === 'RAFFLE') {
        soundManager.playSpin();
        const rafflePool = [200, 300, 400, 700, 800, 1000];
        const selectedIdx = Math.floor(Math.random() * rafflePool.length);
        finalValue = rafflePool[selectedIdx];

        showPopup(popup('🎲', 'ESTRATTO!', `€${finalValue}`), 2000, 'warning');
    } else {
        soundManager.playReveal();
        finalValue = Number(choice);
        showPopup(popup('💶', 'HAI SCELTO', `€${finalValue}`), 2000, 'warning');
    }

    gameState.pendingWheelValue = finalValue;

    // Update UI and phase after popup
    setTimeout(() => {
        elements.currentWheelValue.textContent = `€${gameState.pendingWheelValue}`;
        elements.currentWheelValue.className = 'wheel-value';
        gameState.wheelPhase = 'call_consonant';
        updateUI();
        showMessage(`Chiama una consonante (vale €${gameState.pendingWheelValue})`, 'info');
    }, 2000);
};
