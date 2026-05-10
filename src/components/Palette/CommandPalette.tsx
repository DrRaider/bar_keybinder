import * as React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import { COMMANDS } from '@/data/commands';
import { ALL_CATEGORIES, ALL_LAYERS, type Command, type CommandCategory } from '@/types';
import { toLayerKey } from '@/lib/layers';
import { bindingMatchesMode } from '@/lib/grid-menu-filter';
import { CategorySection } from './CategorySection';
import { CustomCommandInput } from './CustomCommandInput';
import { modeForKeyId, stripModePrefix, keyIdForMode } from '@/lib/binding-keys';

function fuzzyMatch(needle: string, hay: string): boolean {
  return hay.toLowerCase().includes(needle.toLowerCase());
}

function filterByQuery(c: Command, q: string): boolean {
  if (!q.trim()) return true;
  return (
    fuzzyMatch(q, c.fullName) ||
    fuzzyMatch(q, c.shortLabel) ||
    fuzzyMatch(q, c.uikeysCommand) ||
    fuzzyMatch(q, c.category)
  );
}

export const SEARCH_INPUT_ID = 'palette-search';

export function CommandPalette() {
  const [query, setQuery] = React.useState('');
  const customCommands = useEditorStore((s) => s.customCommands);
  const selected = useEditorStore((s) => s.selected);
  const bindings = useEditorStore((s) => s.bindings);
  const activeMods = useEditorStore((s) => s.activeMods);
  const mode = useEditorStore((s) => s.viewMode);
  const bind = useEditorStore((s) => s.bind);
  const commandsById = useAllCommandsById();

  // Index: which command-ids are bound somewhere, and where.
  const usageByCommand = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const layer of ALL_LAYERS) {
      const layerMap = bindings[layer];
      if (!layerMap) continue;
      for (const [keyId, cmdId] of Object.entries(layerMap)) {
        if (modeForKeyId(keyId) !== mode) continue;
        m.set(cmdId, (m.get(cmdId) ?? 0) + 1);
      }
    }
    return m;
  }, [bindings, mode]);

  /** Where each command is bound — list of "Ctrl+Q" style human strings. */
  const placementsByCommand = React.useMemo(() => {
    const m = new Map<string, string[]>();
    for (const layer of ALL_LAYERS) {
      const layerMap = bindings[layer];
      if (!layerMap) continue;
      for (const [keyId, cmdId] of Object.entries(layerMap)) {
        if (modeForKeyId(keyId) !== mode) continue;
        const arr = m.get(cmdId) ?? [];
        const prefix = layer === '' ? '' : `${layer.replace(/Meta/g, 'Space').replace(/\+/g, '+')}+`;
        arr.push(`${prefix}${stripModePrefix(keyId)}`);
        m.set(cmdId, arr);
      }
    }
    return m;
  }, [bindings, mode]);

  const allCommands: readonly Command[] = React.useMemo(
    () => [...COMMANDS, ...customCommands],
    [customCommands],
  );

  const targetKey = selected
    ? selected.kind === 'key'
      ? selected.keyId
      : selected.mouseId
    : '';
  const layer = toLayerKey(activeMods);
  const activeCommandId = targetKey
    ? bindings[layer]?.[keyIdForMode(mode, targetKey)]
    : undefined;

  const onPick = (id: string) => {
    if (selected) bind(selected, id);
  };

  const byCategory = React.useMemo(() => {
    const m = new Map<CommandCategory, Command[]>();
    for (const c of allCommands) {
      if (!bindingMatchesMode(c, mode)) continue;
      if (!filterByQuery(c, query)) continue;
      const arr = m.get(c.category) ?? [];
      arr.push(c);
      m.set(c.category, arr);
    }
    return m;
  }, [allCommands, query, mode]);

  const totalMatches = Array.from(byCategory.values()).reduce((n, a) => n + a.length, 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={SEARCH_INPUT_ID}
          placeholder="Search commands… (press / to focus)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-8 pr-8"
          aria-label="Search commands"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {!selected && (
        <div className="rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
          Pick a key or mouse button first to assign a command.
        </div>
      )}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {ALL_CATEGORIES.map((cat) => {
          const list = byCategory.get(cat) ?? [];
          return (
            <CategorySection
              key={cat}
              category={cat}
              commands={list}
              activeCommandId={activeCommandId}
              onPickCommand={onPick}
              selectionDisabled={!selected}
              usageByCommand={usageByCommand}
              placementsByCommand={placementsByCommand}
            />
          );
        })}
        {totalMatches === 0 && query && (
          <div className="text-xs text-muted-foreground">No commands match “{query}”.</div>
        )}
        {/* fallback rendering when category map missed an entry (shouldn't happen but keeps types honest) */}
        {commandsById.size === 0 && null}
      </div>
      <CustomCommandInput selected={selected} />
    </div>
  );
}
