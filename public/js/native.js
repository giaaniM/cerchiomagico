// Detect Capacitor native environment
export const isNative = !!(window.Capacitor?.isNativePlatform?.());

// All API fetch calls must use this prefix so native app hits the production server
export const API_BASE = isNative ? 'https://magicspingame.com' : '';

// Socket.io server URL for native vs web
export const SOCKET_URL = isNative ? 'https://magicspingame.com' : window.location.origin;
