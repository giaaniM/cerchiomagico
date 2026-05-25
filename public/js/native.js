// Detect Capacitor native environment (or forced via ?native=1 for local testing)
const _forceNative = new URLSearchParams(window.location.search).get('native') === '1';
export const isNative = _forceNative || !!(window.Capacitor?.isNativePlatform?.());

// All API fetch calls must use this prefix so native app hits the production server
export const API_BASE = (isNative && !_forceNative) ? 'https://magicspingame.com' : '';

// Socket.io server URL for native vs web
export const SOCKET_URL = (isNative && !_forceNative) ? 'https://magicspingame.com' : window.location.origin;
