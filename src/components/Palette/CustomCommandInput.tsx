import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import type { Command } from '@/types';
import type { Selected } from '@/store/useEditorStore';
import { Info, Wand2 } from 'lucide-react';
import { SelectBuilderDialog } from '@/components/SelectBuilder/SelectBuilderDialog';
import { CustomCommandHelpDialog } from '@/components/CustomCommandHelpDialog';

function customIdFor(uikeysCommand: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < uikeysCommand.length; i++) {
    h ^= uikeysCommand.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `custom-${(h >>> 0).toString(16)}`;
}

function shortLabelFor(uikeysCommand: string, name?: string): string {
  if (name && name.trim()) return name.trim().slice(0, 6);
  const word = uikeysCommand.trim().split(/\s+/)[0] ?? '';
  return word.slice(0, 6) || 'cmd';
}

export interface CustomCommandInputProps {
  selected: Selected;
}

export function CustomCommandInput({ selected }: CustomCommandInputProps) {
  const [text, setText] = React.useState('');
  const [name, setName] = React.useState('');
  const addCustomCommand = useEditorStore((s) => s.addCustomCommand);
  const bind = useEditorStore((s) => s.bind);
  const commandsById = useAllCommandsById();

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = customIdFor(trimmed);
    let cmd = commandsById.get(id);
    if (!cmd) {
      cmd = {
        id,
        category: 'Custom',
        fullName: name.trim() || trimmed,
        shortLabel: shortLabelFor(trimmed, name),
        uikeysCommand: trimmed,
        isEssential: false,
      } satisfies Command;
      addCustomCommand(cmd);
    }
    if (selected) bind(selected, cmd.id);
    setText('');
    setName('');
  };

  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold">Custom command</div>
        <CustomCommandHelpDialog>
          <button
            type="button"
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="How custom keymappings work"
          >
            <Info className="h-3 w-3" />
            How does this work?
          </button>
        </CustomCommandHelpDialog>
      </div>
      <Input
        placeholder="optional name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="h-8 text-xs"
      />
      <Input
        placeholder="raw uikeys, e.g. select Visible+_Idle+_ClearSelection_SelectAll+"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit();
        }}
        className="h-8 text-xs"
      />
      <div className="flex items-center justify-between gap-2">
        <SelectBuilderDialog onCreate={() => undefined}>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
            <Wand2 className="mr-1 h-3 w-3" />
            Build command…
          </Button>
        </SelectBuilderDialog>
        <Button
          size="sm"
          onClick={submit}
          disabled={!text.trim() || !selected}
          aria-label="Assign custom command"
          className="h-7 text-xs"
        >
          {selected ? 'Assign' : 'Pick a key first'}
        </Button>
      </div>
    </div>
  );
}
