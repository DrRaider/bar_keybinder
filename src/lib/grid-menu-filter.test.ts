import { describe, expect, it } from 'vitest';
import { commandMode, isChatCommand, isGridMenuCommand } from './grid-menu-filter';
import { COMMANDS } from '@/data/commands';

function byUikeys(uikeys: string) {
  return COMMANDS.find((c) => c.uikeysCommand === uikeys);
}

describe('command mode classification', () => {
  it('gridmenu_* are gridmenu', () => {
    expect(commandMode(byUikeys('gridmenu_category 1'))).toBe('gridmenu');
    expect(commandMode(byUikeys('gridmenu_key 3 1'))).toBe('gridmenu');
    expect(commandMode(byUikeys('gridmenu_next_page'))).toBe('gridmenu');
    expect(commandMode(byUikeys('gridmenu_cycle_builder'))).toBe('gridmenu');
    expect(isGridMenuCommand(byUikeys('gridmenu_category 1'))).toBe(true);
    expect(isGridMenuCommand(byUikeys('attack'))).toBe(false);
  });

  it('edit_*, chat, chatswitch*, pastetext, quitmessage are chat', () => {
    expect(commandMode(byUikeys('edit_complete'))).toBe('chat');
    expect(commandMode(byUikeys('edit_escape'))).toBe('chat');
    expect(commandMode(byUikeys('edit_return'))).toBe('chat');
    expect(commandMode(byUikeys('chat'))).toBe('chat');
    expect(commandMode(byUikeys('chatswitchally'))).toBe('chat');
    expect(commandMode(byUikeys('chatswitchspec'))).toBe('chat');
    expect(commandMode(byUikeys('pastetext'))).toBe('chat');
    expect(commandMode(byUikeys('quitmessage'))).toBe('chat');
    expect(isChatCommand(byUikeys('edit_backspace'))).toBe(true);
    expect(isChatCommand(byUikeys('attack'))).toBe(false);
  });

  it('regular game commands are main', () => {
    expect(commandMode(byUikeys('attack'))).toBe('main');
    expect(commandMode(byUikeys('fight'))).toBe('main');
    expect(commandMode(byUikeys('selectcomm focus'))).toBe('main');
    expect(commandMode(byUikeys('toggleoverview'))).toBe('main');
  });
});
