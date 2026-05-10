import { ChevronRight } from 'lucide-react';
import type { Command, CommandCategory } from '@/types';
import { useEditorStore } from '@/store/useEditorStore';
import { CommandPill } from './CommandPill';
import { cn } from '@/lib/cn';

export interface CategorySectionProps {
  category: CommandCategory;
  commands: readonly Command[];
  activeCommandId: string | undefined;
  onPickCommand: (id: string) => void;
  selectionDisabled: boolean;
  usageByCommand: ReadonlyMap<string, number>;
  placementsByCommand: ReadonlyMap<string, readonly string[]>;
}

export function CategorySection({
  category,
  commands,
  activeCommandId,
  onPickCommand,
  selectionDisabled,
  usageByCommand,
  placementsByCommand,
}: CategorySectionProps) {
  const collapsed = useEditorStore((s) => s.collapsedCategories.includes(category));
  const toggleCategory = useEditorStore((s) => s.toggleCategory);

  if (commands.length === 0) return null;

  return (
    <section className="space-y-2">
      <button
        type="button"
        onClick={() => toggleCategory(category)}
        aria-expanded={!collapsed}
        className="flex w-full items-center gap-1 rounded px-1 py-1 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
      >
        <ChevronRight
          className={cn('h-3 w-3 transition-transform', !collapsed && 'rotate-90')}
        />
        {category}
        <span className="ml-1 text-[10px] font-normal opacity-60">({commands.length})</span>
      </button>
      {!collapsed && (
        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {commands.map((c) => (
            <CommandPill
              key={c.id}
              command={c}
              active={c.id === activeCommandId}
              disabled={selectionDisabled}
              usageCount={usageByCommand.get(c.id) ?? 0}
              placements={placementsByCommand.get(c.id) ?? []}
              onClick={() => onPickCommand(c.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
