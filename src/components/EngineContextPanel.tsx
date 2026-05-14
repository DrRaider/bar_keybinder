/**
 * BAR-engine context for the currently-selected key or mouse button.
 *
 * Three independent sections, each only rendered when it has something to say:
 *
 *   1. Engine default bindings on this key — engine `defaultBindings[]` lines
 *      that fire alongside any user binding (BAR's `Bind()` is additive, not
 *      replacement; the player needs an explicit `unbind` to remove them).
 *
 *   2. Modes this key activates — bindings on this key whose action enters a
 *      BAR engine mode (Draw, FPS-view, …). Used to surface the "press Q
 *      first, then middle-click drops a ping" workflow that's invisible
 *      otherwise.
 *
 *   3. Modes that change THIS button's behavior — only for mouse buttons:
 *      what L / Mid / R / wheel does inside engine modes started elsewhere.
 *
 * Source data comes from the scraped engine constants + the hand-curated
 * engine-modes table (`src/data/engine-modes.ts`).
 */

import type { EngineMode } from '@/data/engine-modes';
import {
  bindNameToMouseRole,
  engineDefaultsOnBindName,
  modesActivatedByKey,
  modesAffectingMouseRole,
  type ModeActivation,
} from '@/lib/engine-context';
import {
  useEditorStore,
  useAllCommandsById,
} from '@/store/useEditorStore';
import { layerDisplayName } from '@/lib/layers';
import type { ChordBinding, Command } from '@/types';

/** Human-readable "Press X times" hint for chains where every link is the same key. */
function chordRepeatHint(keyChain: string): string | null {
  const links = keyChain.split(',').map((s) => s.trim());
  if (links.length < 2) return null;
  if (!links.every((l) => l === links[0])) return null;
  return `Press ${links.length} times`;
}

export interface EngineContextPanelProps {
  /** Bindable name of the selected target (`sc_q`, `mouse2`, `f13`, …). */
  bindName: string;
  /** Editor's internal id of the selected target — `keyId` for keyboard, mouse-id for mouse buttons. */
  targetId: string;
  /** True when the target is a mouse button — drives the "affects-this-role" section. */
  isMouse: boolean;
}

export function EngineContextPanel({ bindName, targetId, isMouse }: EngineContextPanelProps) {
  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const chordBindings = useEditorStore((s) => s.chordBindings);
  const commandsById = useAllCommandsById();

  const defaults = engineDefaultsOnBindName(bindName);
  const activations = modesActivatedByKey(targetId, bindings, coBindings, commandsById);
  const role = isMouse ? bindNameToMouseRole(bindName) : null;
  const allRoleModes = role ? modesAffectingMouseRole(role) : [];
  const alwaysModes = allRoleModes.filter((m) => m.always === true);
  const conditionalModes = allRoleModes.filter((m) => m.always !== true);
  const chords = chordBindings.filter((c) => c.baseKeyId === targetId);

  if (
    defaults.length === 0 &&
    activations.length === 0 &&
    alwaysModes.length === 0 &&
    conditionalModes.length === 0 &&
    chords.length === 0
  ) {
    return null;
  }

  return (
    <div className="rounded-md border border-info/40 bg-info/5 p-2 text-xs">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-info">
        BAR engine context
      </div>
      <div className="space-y-2.5">
        {alwaysModes.length > 0 && role != null && (
          <AlwaysOnSection modes={alwaysModes} role={role} />
        )}
        {chords.length > 0 && <ChordsSection chords={chords} commandsById={commandsById} />}
        {defaults.length > 0 && <DefaultsSection defaults={defaults} />}
        {activations.length > 0 && <ActivationsSection activations={activations} />}
        {conditionalModes.length > 0 && role != null && (
          <AffectingModesSection modes={conditionalModes} role={role} />
        )}
      </div>
    </div>
  );
}

function AlwaysOnSection({
  modes,
  role,
}: {
  modes: readonly EngineMode[];
  role: ReturnType<typeof bindNameToMouseRole> & string;
}) {
  return (
    <section>
      <div className="font-semibold">Always-on engine behavior</div>
      <p className="text-[11px] text-muted-foreground">
        Fires regardless of any binding. Your bind <em>stacks</em> on top —
        both this gesture and your action run.
      </p>
      <ul className="mt-1 space-y-0.5">
        {modes.map((mode) => (
          <li key={mode.id} className="rounded bg-background/40 p-1.5 text-[11px]">
            {mode.mouseBehavior[role]}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ChordsSection({
  chords,
  commandsById,
}: {
  chords: readonly ChordBinding[];
  commandsById: ReadonlyMap<string, Command>;
}) {
  return (
    <section>
      <div className="font-semibold">Chord chains starting here ({chords.length})</div>
      <p className="text-[11px] text-muted-foreground">
        Multi-press sequences imported from your <code>uikeys.txt</code>.
        Round-tripped on export — edit by changing the source file directly.
      </p>
      <ul className="mt-1 space-y-0.5">
        {chords.map((c) => {
          const cmd = commandsById.get(c.cmdId);
          const repeatHint = chordRepeatHint(c.keyChain);
          return (
            <li
              key={c.id}
              className="flex flex-wrap items-baseline gap-1.5 rounded bg-background/40 px-1.5 py-1"
            >
              <code className="rounded bg-muted/60 px-1 py-0.5 text-[10px]">{c.keyChain}</code>
              <span className="text-muted-foreground">→</span>
              {cmd ? (
                <span className="font-medium">{cmd.fullName}</span>
              ) : (
                <span className="italic text-muted-foreground">missing command</span>
              )}
              {cmd && (
                <code className="text-[10px] text-muted-foreground">{cmd.uikeysCommand}</code>
              )}
              {repeatHint && (
                <span className="rounded bg-muted/40 px-1 py-0.5 text-[10px] uppercase tracking-wide">
                  {repeatHint}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function DefaultsSection({
  defaults,
}: {
  defaults: ReturnType<typeof engineDefaultsOnBindName>;
}) {
  return (
    <section>
      <div className="font-semibold">Engine default ({defaults.length})</div>
      <p className="text-[11px] text-muted-foreground">
        BAR loads these <em>before</em> any uikeys.txt. They stack with your
        bind unless you add an explicit <code>unbind</code> line.
      </p>
      <ul className="mt-1 space-y-0.5">
        {defaults.map((d, i) => (
          <li key={`${d.key}|${d.action}|${i}`} className="flex flex-wrap items-baseline gap-1.5">
            <code className="rounded bg-background/60 px-1 py-0.5 text-[10px]">{d.key}</code>
            <span className="text-muted-foreground">→</span>
            <code className="rounded bg-background/60 px-1 py-0.5 text-[10px]">{d.action}</code>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActivationsSection({ activations }: { activations: readonly ModeActivation[] }) {
  // Group by mode so we don't render the same mode body N times.
  const byMode = new Map<string, { mode: EngineMode; entries: ModeActivation[] }>();
  for (const a of activations) {
    const slot = byMode.get(a.mode.id) ?? { mode: a.mode, entries: [] };
    slot.entries.push(a);
    byMode.set(a.mode.id, slot);
  }
  return (
    <section>
      <div className="font-semibold">Activates an engine mode ({byMode.size})</div>
      <p className="text-[11px] text-muted-foreground">
        Pressing this key in the listed layer enters the mode below — your
        mouse buttons take on the in-mode meaning until the mode exits.
      </p>
      <ul className="mt-1 space-y-1.5">
        {[...byMode.values()].map(({ mode, entries }) => (
          <li key={mode.id} className="rounded bg-background/40 p-1.5">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-semibold">{mode.name}</span>
              <span className="text-[10px] text-muted-foreground">
                via{' '}
                {entries.map((e, i) => (
                  <span key={`${e.layer}|${e.viaAction}`}>
                    <code className="rounded bg-muted/60 px-1 text-[10px]">{e.viaAction}</code>
                    {' on '}
                    <span className="font-medium">{layerDisplayName(e.layer)}</span>
                    {i < entries.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{mode.description}</p>
            <ul className="mt-1 space-y-0.5">
              {Object.entries(mode.mouseBehavior).map(([role, text]) => (
                <li key={role} className="flex gap-1.5">
                  <span className="shrink-0 rounded bg-muted/40 px-1 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {role}
                  </span>
                  <span className="text-[11px]">{text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AffectingModesSection({
  modes,
  role,
}: {
  modes: readonly EngineMode[];
  role: ReturnType<typeof bindNameToMouseRole> & string;
}) {
  return (
    <section>
      <div className="font-semibold">Special behavior in {modes.length} mode{modes.length === 1 ? '' : 's'}</div>
      <p className="text-[11px] text-muted-foreground">
        While BAR is in the listed mode, this button does something different
        from its usual gesture — driven by the engine, not by any{' '}
        <code>bind</code>.
      </p>
      <ul className="mt-1 space-y-1">
        {modes.map((mode) => (
          <li key={mode.id} className="rounded bg-background/40 p-1.5">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="font-semibold">{mode.name}</span>
              {mode.enteredBy.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  entered via{' '}
                  {mode.enteredBy.map((a, i) => (
                    <span key={a}>
                      <code className="rounded bg-muted/60 px-1 text-[10px]">{a}</code>
                      {i < mode.enteredBy.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[11px]">{mode.mouseBehavior[role]}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
