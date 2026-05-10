import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Stub network so the App-level boot effect (useEnsureEssentialsLoaded)
// doesn't fire real GitHub fetches in tests. Returns an empty uikeys body
// so the essentials set ends up empty — fine for component smoke tests.
// Individual tests can override with vi.spyOn(globalThis, 'fetch').
globalThis.fetch = vi.fn(async () =>
  new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } }),
) as unknown as typeof fetch;

if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  }
  // jsdom doesn't implement scrollIntoView; Radix Select calls it.
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  // jsdom doesn't implement PointerEvent; Radix uses it.
  if (typeof window.PointerEvent === 'undefined') {
    class PointerEvent extends MouseEvent {
      pointerId: number;
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
        this.pointerId = params.pointerId ?? 0;
      }
    }
    window.PointerEvent = PointerEvent as unknown as typeof window.PointerEvent;
  }
  // ResizeObserver is needed by some Radix components.
  if (typeof window.ResizeObserver === 'undefined') {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    window.ResizeObserver = RO as unknown as typeof window.ResizeObserver;
  }
}

afterEach(() => {
  cleanup();
});
