import { describe, expect, it, beforeEach } from 'vitest';
import { useEditorStore } from './useEditorStore';

beforeEach(() => {
  localStorage.clear();
  // Reset to initial defaults by clearing persistence and rehydrating.
  useEditorStore.persist.clearStorage();
  useEditorStore.setState((s) => ({ ...s, undoStack: [], selected: null }));
});

describe('useEditorStore', () => {
  it('binds, unbinds, and supports undo on the active layer', () => {
    const store = useEditorStore;
    store.getState().select({ kind: 'key', keyId: 'q' });
    store.getState().bind({ kind: 'key', keyId: 'q' }, 'attack');
    expect(store.getState().bindings['']?.q).toBe('attack');

    store.getState().undo();
    // Undo restores prior state — defaults had q -> 'sel-view'.
    expect(store.getState().bindings['']?.q).toBe('sel-view');
  });

  it('toggleMod flips the active layer', () => {
    const store = useEditorStore;
    expect(store.getState().activeMods).toEqual({ Shift: false, Ctrl: false, Alt: false, Meta: false });
    store.getState().toggleMod('Ctrl');
    expect(store.getState().activeMods.Ctrl).toBe(true);
    store.getState().toggleMod('Ctrl');
    expect(store.getState().activeMods.Ctrl).toBe(false);
  });

  it('setActiveLayer sets all three mods at once', () => {
    const store = useEditorStore;
    store.getState().setActiveLayer('Shift+Ctrl');
    expect(store.getState().activeMods).toEqual({ Shift: true, Ctrl: true, Alt: false, Meta: false });
    store.getState().setActiveLayer('');
    expect(store.getState().activeMods).toEqual({ Shift: false, Ctrl: false, Alt: false, Meta: false });
  });

  it('addMouseButton adds and removeMouseButton respects removable=false', () => {
    const store = useEditorStore;
    const initialLen = store.getState().mouseButtons.length;
    store.getState().addMouseButton();
    expect(store.getState().mouseButtons.length).toBe(initialLen + 1);
    // m1 is non-removable
    store.getState().removeMouseButton('m1');
    expect(store.getState().mouseButtons.find((m) => m.id === 'm1')).toBeDefined();
  });

  it('addMouseButton picks F-key bindNames (avoids dropped mouseN events on Wayland)', () => {
    const store = useEditorStore;
    store.getState().resetAll();
    // Start from a clean mouse list with only the non-removable defaults.
    const removable = store.getState().mouseButtons.filter((m) => m.removable).map((m) => m.id);
    for (const id of removable) store.getState().removeMouseButton(id);
    // First add → first unused F-key candidate (f13, since defaults were removed).
    store.getState().addMouseButton();
    let last = store.getState().mouseButtons.at(-1);
    expect(last?.bindName).toBe('f13');
    store.getState().addMouseButton();
    last = store.getState().mouseButtons.at(-1);
    expect(last?.bindName).toBe('f14');
    // Skips already-used candidates instead of double-binding.
    store.getState().addMouseButton();
    last = store.getState().mouseButtons.at(-1);
    expect(last?.bindName).toBe('f15');
  });

  it('resetAll clears all bindings, loadDefaults restores them', () => {
    const store = useEditorStore;
    store.getState().resetAll();
    expect(store.getState().bindings['']).toEqual({});
    store.getState().loadDefaults();
    expect(store.getState().bindings['']?.q).toBe('sel-view');
  });

  it('setLayout clears the current selection (key may not exist on new layout)', () => {
    const store = useEditorStore;
    store.getState().select({ kind: 'key', keyId: 'f5' });
    expect(store.getState().selected).toEqual({ kind: 'key', keyId: 'f5' });
    store.getState().setLayout('ansi-60');
    expect(store.getState().selected).toBeNull();
  });

  it('lastAppliedPresetId persists through partialize round-trip', () => {
    const store = useEditorStore;
    expect(store.getState().lastAppliedPresetId).toBeNull();
    store.getState().setLastAppliedPresetId('grid-60pct');
    expect(store.getState().lastAppliedPresetId).toBe('grid-60pct');
    // Round-trip through localStorage manually — partialize must include the field.
    const raw = localStorage.getItem('bar-keymap-editor-v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? '{}') as { state?: Record<string, unknown> };
    expect(parsed.state?.lastAppliedPresetId).toBe('grid-60pct');
  });

  it('viewMode persists through partialize round-trip', () => {
    const store = useEditorStore;
    expect(store.getState().viewMode).toBe('main');
    store.getState().setViewMode('chat');
    expect(store.getState().viewMode).toBe('chat');
    const parsed = JSON.parse(localStorage.getItem('bar-keymap-editor-v1') ?? '{}') as {
      state?: Record<string, unknown>;
    };
    expect(parsed.state?.viewMode).toBe('chat');
  });

  it('addCustomCommand is idempotent on the same id', () => {
    const store = useEditorStore;
    const cmd = {
      id: 'custom-foo',
      category: 'Custom' as const,
      fullName: 'Foo',
      shortLabel: 'foo',
      uikeysCommand: 'foo',
      isEssential: false,
    };
    store.getState().addCustomCommand(cmd);
    store.getState().addCustomCommand(cmd);
    expect(store.getState().customCommands.filter((c) => c.id === 'custom-foo')).toHaveLength(1);
  });
});
