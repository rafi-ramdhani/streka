// jsdom has no matchMedia; the app only needs matches + change listeners.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: window.innerWidth < 860 && query.includes('max-width'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    onchange: null,
    dispatchEvent: () => false,
  }),
});

import { vi } from 'vitest';

// next/font/google is a Next compiler feature with no runtime under vitest;
// stub it so any component importing a font is renderable in tests.
vi.mock('next/font/google', () => ({
  Archivo: () => ({ className: 'font-archivo', style: { fontFamily: 'Archivo' } }),
}));
