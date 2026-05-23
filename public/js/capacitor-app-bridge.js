// Capacitor plugins are injected globally by the native runtime.
// On web, return a no-op stub.
const stub = { addListener: () => ({ remove: () => {} }) };

export const App = window.Capacitor?.Plugins?.App ?? stub;
export const SplashScreen = window.Capacitor?.Plugins?.SplashScreen ?? stub;
export const StatusBar = window.Capacitor?.Plugins?.StatusBar ?? stub;
