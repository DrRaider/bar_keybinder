import { useEditorStore } from '@/store/useEditorStore';
import { BUILTIN_LAYOUTS } from '@/layouts';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ALL_LABEL_LAYOUTS,
  labelLayoutDisplayName,
  type KeyboardLabelLayout,
} from '@/data/keyboard-labels';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const CREATE_NEW_TOKEN = '__create-new__';

export interface LayoutSelectorProps {
  /** Called when the user picks the "create new layout" entry. */
  onRequestCreateLayout?: () => void;
}

export function LayoutSelector({ onRequestCreateLayout }: LayoutSelectorProps) {
  const layoutId = useEditorStore((s) => s.layoutId);
  const setLayout = useEditorStore((s) => s.setLayout);
  const labelLayout = useEditorStore((s) => s.labelLayout);
  const setLabelLayout = useEditorStore((s) => s.setLabelLayout);
  const customLayouts = useEditorStore((s) => s.customLayouts);

  const handleLayoutChange = (id: string) => {
    if (id === CREATE_NEW_TOKEN) {
      onRequestCreateLayout?.();
      return;
    }
    setLayout(id);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <label className="sr-only" htmlFor="layout-form-factor">
              Form factor
            </label>
            <Select value={layoutId} onValueChange={handleLayoutChange}>
              <SelectTrigger id="layout-form-factor" className="h-8 w-44 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CREATE_NEW_TOKEN}>
                  Create / load custom layout…
                </SelectItem>
                <SelectSeparator />
                {customLayouts.length > 0 && (
                  <>
                    <SelectGroup>
                      <SelectLabel>Custom</SelectLabel>
                      {customLayouts.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                  </>
                )}
                <SelectGroup>
                  <SelectLabel>Built-in</SelectLabel>
                  {BUILTIN_LAYOUTS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Pick the physical shape of your keyboard. The form factor only
          changes which keys are drawn — bindings travel with you across
          shapes.
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <label className="sr-only" htmlFor="layout-labels">
              Layout labels
            </label>
            <Select
              value={labelLayout}
              onValueChange={(v) => setLabelLayout(v as KeyboardLabelLayout)}
            >
              <SelectTrigger id="layout-labels" className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_LABEL_LAYOUTS.map((l) => (
                  <SelectItem key={l} value={l}>
                    {labelLayoutDisplayName(l)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          Cosmetic only: changes the printed letter on each key (QWERTY,
          AZERTY, Dvorak…). BAR binds by physical position so the actual
          binding doesn’t change.
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
