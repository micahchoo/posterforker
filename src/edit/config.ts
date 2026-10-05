/// <reference types="vite/client" />
// The sign-in relay (relay/, ADR-0005), set when the engine is built: the release workflow
// reads the repository variable POSTERFORKER_RELAY. Empty: /edit offers only
// "Save without signing in".
export const RELAY_URL: string = import.meta.env.VITE_POSTERFORKER_RELAY ?? '';
