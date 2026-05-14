import type { Command, ViewMode } from '@/types';

// Re-exported for backwards compatibility — `ViewMode` lives in types.ts now
// as the single source of truth (store + chord-binding records both use it).
export type { ViewMode };

/**
 * BAR has several runtime contexts that overlay the same physical keys with
 * different bindings. The editor surfaces them as separate modes so each
 * context's bindings don't pollute the others.
 */

/** Grid menu — intercepted by BAR's gridmenu widget when a builder is selected. */
export function isGridMenuCommand(cmd: Command | undefined): boolean {
  if (!cmd) return false;
  return cmd.uikeysCommand.startsWith('gridmenu_');
}

/**
 * Chat / edit context — fires only while the chat input field is open
 * (edit_* commands, the `chat*` family, `pastetext`).
 */
export function isChatCommand(cmd: Command | undefined): boolean {
  if (!cmd) return false;
  const u = cmd.uikeysCommand;
  if (u.startsWith('edit_')) return true;
  if (u === 'pastetext') return true;
  if (u === 'quitmessage') return true;
  if (u === 'chat' || u === 'chatall' || u === 'chatally' || u === 'chatspec') return true;
  if (u.startsWith('chatswitch')) return true;
  return false;
}

/**
 * Spectator-only context — fires only while you're spectating, not while
 * actively playing. BAR's `num_keys.txt` overloads the digit keys with both
 * `group select N` (player) and `specteam N` (spectator); the runtime fires
 * whichever fits the player state. We surface them as separate modes so the
 * player view doesn't get polluted by the spectator-only specteam labels.
 */
export function isSpectateCommand(cmd: Command | undefined): boolean {
  if (!cmd) return false;
  return cmd.uikeysCommand.startsWith('specteam ');
}

/** Classify a command into exactly one mode bucket. */
export function commandMode(cmd: Command | undefined): ViewMode {
  if (isGridMenuCommand(cmd)) return 'gridmenu';
  if (isChatCommand(cmd)) return 'chat';
  if (isSpectateCommand(cmd)) return 'spectate';
  return 'main';
}

/** Keep a binding if it matches the current view mode. */
export function bindingMatchesMode(cmd: Command | undefined, mode: ViewMode): boolean {
  if (!cmd) return false;
  return commandMode(cmd) === mode;
}
