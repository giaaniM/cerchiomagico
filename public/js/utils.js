import { elements } from './elements.js';
import { VOWELS } from './state.js';

// ===== Utility Functions =====
export function normalizeChar(char) {
    return char.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function normalizePhrase(phrase) {
    return phrase.toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/['']/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function sanitizePhrase(p) {
    if (!p) return "";
    const map = { 'A': 'À', 'E': 'È', 'I': 'Ì', 'O': 'Ò', 'U': 'Ù' };
    return p.toUpperCase()
        // Convert substitutes like E' or A' to real accented characters
        .replace(/\b([AEIOU])[''](\b|\s|$)/g, (match, char, boundary) => (map[char] || char) + boundary)
        .replace(/([AEIOU])['']\b/g, (match, char) => map[char] || match)
        // Convert all remaining apostrophes to spaces as requested
        .replace(/['']/g, ' ')
        // Clean characters - keep only letters and spaces
        .replace(/[^A-ZÀ-ÿ\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getUniqueLetters(phrase) {
    const letters = new Set();
    for (const char of phrase) {
        if (/[A-Z]/.test(normalizeChar(char))) letters.add(normalizeChar(char));
    }
    return Array.from(letters);
}

export function isVowel(letter) {
    return VOWELS.includes(normalizeChar(letter));
}

export function isConsonant(letter) {
    return /[A-Z]/.test(normalizeChar(letter)) && !isVowel(letter);
}

const GAME_SCREENS = ['game-screen', 'win-screen'];

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId)?.classList.add('active');

    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn) langBtn.style.display = GAME_SCREENS.includes(screenId) ? 'none' : '';
}

export function showMessage(text, type = 'info') {
    elements.messageDisplay.textContent = text;
    elements.messageDisplay.className = `message-display ${type}`;
    setTimeout(() => {
        if (elements.messageDisplay.textContent === text) {
            elements.messageDisplay.textContent = '';
            elements.messageDisplay.className = 'message-display';
        }
    }, 3000);
}

export function popup(icon, title, body = '') {
    return `<div class="popup-body">
        ${icon ? `<div class="popup-icon">${icon}</div>` : ''}
        <div class="popup-title">${title}</div>
        ${body ? `<div class="popup-text">${body}</div>` : ''}
    </div>`;
}

export function showPopup(html, duration = 2000, className = '') {
    elements.modalOverlay.style.display = 'flex';
    elements.popupMessage.style.display = 'block';
    elements.popupMessage.className = 'popup-message' + (className ? ' ' + className : '');
    elements.popupMessage.innerHTML = html;
    if (duration > 0) {
        setTimeout(() => {
            elements.popupMessage.style.display = 'none';
            elements.modalOverlay.style.display = 'none';
        }, duration);
    }
}

export function showFloatingScore(tileEl, text, express = false) {
    if (!tileEl) return;
    const rect = tileEl.getBoundingClientRect();
    const el = document.createElement('div');
    el.className = 'floating-score' + (express ? ' floating-score-express' : '');
    el.textContent = text;
    el.style.left = `${rect.left + rect.width / 2}px`;
    el.style.top = `${rect.top}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

export function flashExpressBanner(text) {
    const banner = document.getElementById('express-banner');
    if (!banner) return;
    const el = document.createElement('div');
    el.className = 'express-banner-flash ' + (text.startsWith('+') ? 'flash-gain' : 'flash-loss');
    el.textContent = text;
    banner.appendChild(el);
    setTimeout(() => el.remove(), 900);
}
