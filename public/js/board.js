import { gameState } from './state.js';
import { elements } from './elements.js';
import { normalizeChar, getUniqueLetters, isConsonant } from './utils.js';
import { soundManager } from './sound.js';

// Forward reference — updateUI is injected at runtime to avoid circular deps
let _updateUI = () => {};
export function setUpdateUI(fn) { _updateUI = fn; }

// ===== Board Creation =====
export function splitPhraseIntoRows(words, rowLimits) {
    const rows = [];
    let currentRow = [];
    let currentLen = 0;

    for (const word of words) {
        const spaceNeeded = currentRow.length > 0 ? 1 : 0;
        const wordLen = word.length;

        // Controlla se il limite della riga corrente è superato
        if (currentLen + spaceNeeded + wordLen <= rowLimits[rows.length]) {
            if (spaceNeeded) {
                currentRow.push({ type: 'space', char: ' ' });
                currentLen += 1;
            }
            for (const char of word) {
                currentRow.push({ type: 'letter', char: char });
                currentLen += 1;
            }
        } else {
            // Vai alla riga successiva
            rows.push(currentRow);
            currentRow = [];
            currentLen = 0;

            if (rows.length >= rowLimits.length) return null; // Non ci sta

            // Inserisci la parola nella nuova riga
            if (wordLen <= rowLimits[rows.length]) {
                for (const char of word) {
                    currentRow.push({ type: 'letter', char: char });
                    currentLen += 1;
                }
            } else {
                return null; // Parola singola più lunga del limite riga
            }
        }
    }
    if (currentRow.length > 0) rows.push(currentRow);
    return rows.length <= rowLimits.length ? rows : null;
}

export function createBoard() {
    elements.gameBoard.innerHTML = '';
    const words = gameState.phrase.split(' ');
    const BOARD_ROWS = 4;
    const ROW_CAPACITIES = [12, 14, 14, 12];
    const FIXED_CAPACITY = 14;

    // Tentativo: Area completa (12-14-14-12)
    let contentRows = splitPhraseIntoRows(words, ROW_CAPACITIES);

    if (!contentRows) {
        console.error("Frase troppo lunga per il tabellone!");
        return;
    }

    // Centramento verticale se le righe usate sono meno di 4
    const verticalOffset = Math.floor((BOARD_ROWS - contentRows.length) / 2);

    for (let row = 0; row < BOARD_ROWS; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'board-row';

        const contentRowIndex = row - verticalOffset;
        const contentRow = (contentRowIndex >= 0 && contentRowIndex < contentRows.length) ? contentRows[contentRowIndex] : null;

        const rowLimit = ROW_CAPACITIES[row];

        let startCol;
        if (row === 0 || row === 3) {
            startCol = 1;
        } else {
            // Righe centrali (14 caselle)
            if (contentRow && contentRow.length > 12) {
                startCol = 0;
            } else {
                startCol = 1;
            }
        }

        for (let col = 0; col < FIXED_CAPACITY; col++) {
            const tileElement = document.createElement('div');
            tileElement.className = 'tile';

            const isRowEdge = (row === 0 || row === 3) && (col === 0 || col === 13);

            if (isRowEdge) {
                tileElement.classList.add('invisible');
            } else {
                const charIndex = col - startCol;
                const content = (contentRow && charIndex >= 0 && charIndex < contentRow.length) ? contentRow[charIndex] : null;

                if (content && content.type === 'letter') {
                    tileElement.classList.add('letter');
                    tileElement.dataset.letter = normalizeChar(content.char);
                    tileElement.textContent = content.char.toUpperCase();
                } else {
                    tileElement.classList.add('empty');
                }
            }
            rowElement.appendChild(tileElement);
        }
        elements.gameBoard.appendChild(rowElement);
    }
}

export function revealLetter(letter, animate = true, onRevealIndividual = null) {
    const normalizedLetter = normalizeChar(letter);
    const tiles = document.querySelectorAll(`.tile.letter[data-letter="${normalizedLetter}"]`);
    let count = 0;
    tiles.forEach((tile, index) => {
        if (!tile.classList.contains('revealed')) {
            count++;
            if (animate) {
                setTimeout(() => {
                    tile.classList.add('revealed', 'just-revealed');

                    // INCREMENTAL JACKPOT SOUND (no particles)
                    soundManager.playCorrect();

                    // Incremental score update
                    if (onRevealIndividual) onRevealIndividual();

                    setTimeout(() => tile.classList.remove('just-revealed'), 1100);
                }, index * 1500); // 1.5s delay between each letter per user request
            } else {
                tile.classList.add('revealed');
                if (onRevealIndividual) onRevealIndividual();
            }
        }
    });
    gameState.revealedLetters.add(normalizedLetter);

    // Lock all interactive controls during tile reveal animation, restore via updateUI when done
    if (animate && count > 0) {
        const lockEls = [
            elements.spinBtn,
            elements.consonantInput, elements.consonantBtn,
            elements.vowelInput, elements.vowelBtn,
            elements.expressConsonantInput, elements.expressConsonantBtn,
            elements.expressVowelInput, elements.expressVowelBtn,
            elements.finalConsonantInput, elements.finalConsonantBtn,
            elements.finalVowelInput, elements.finalVowelBtn,
        ];
        lockEls.forEach(el => { if (el) el.disabled = true; });
        setTimeout(() => _updateUI(), (count - 1) * 1500 + 1200);
    }

    return count;
}

export function revealAllLetters() {
    const uniqueLetters = getUniqueLetters(gameState.phrase);
    uniqueLetters.forEach(letter => {
        if (!gameState.revealedLetters.has(letter)) revealLetter(letter, true);
    });
}

export function countLetterOccurrences(letter) {
    const normalizedLetter = normalizeChar(letter);
    let count = 0;
    for (const char of gameState.phrase) {
        if (normalizeChar(char) === normalizedLetter) count++;
    }
    return count;
}

export function checkAllConsonantsRevealed() {
    for (const char of gameState.phrase) {
        if (/[A-ZÀ-ÿ]/i.test(char) && isConsonant(char)) {
            if (!gameState.revealedLetters.has(normalizeChar(char))) {
                return false;
            }
        }
    }
    return true;
}

export function checkWin() {
    const revealed = document.querySelectorAll('.tile.letter.revealed').length;
    const total = document.querySelectorAll('.tile.letter').length;
    return revealed === total;
}
