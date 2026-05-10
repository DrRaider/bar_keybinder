import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { useEditorStore } from './store/useEditorStore';

beforeEach(() => {
  localStorage.clear();
  // Skip onboarding wizard so the main UI renders deterministically.
  useEditorStore.setState({ onboardingDismissed: true });
});

describe('App smoke', () => {
  it('renders the header, keyboard, palette, and mouse', () => {
    render(<App />);
    expect(screen.getByText(/Keymap editor/i)).toBeInTheDocument();
    expect(screen.getByText(/Command palette/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Mouse$/ })).toBeInTheDocument();
    // The Q key on the DZ60 layout has a label "Q"
    expect(screen.getAllByRole('button', { name: /^Q,/ }).length).toBeGreaterThan(0);
  });

  it('default-loads BAR defaults so Q is bound on first run', () => {
    render(<App />);
    // Q's aria-label includes "bound to" + the command name.
    const q = screen.getAllByRole('button', { name: /^Q, bound to/ })[0];
    expect(q).toBeDefined();
    expect(q?.getAttribute('aria-label') ?? '').toMatch(/bound to/);
  });

  it('clicks Q, then picks attack from the palette → binding visible', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Click Q, then click "Attack" pill in the palette.
    const q = screen.getAllByRole('button', { name: /^Q,/ })[0];
    if (!q) throw new Error('Q key missing');
    await user.click(q);

    // Find the Attack command pill by full name.
    const attack = screen.getByRole('button', { name: 'Attack' });
    await user.click(attack);

    // After binding, the selected-key info panel should show "Attack" as full name.
    expect(screen.getAllByText('Attack').length).toBeGreaterThan(0);
  });
});
