import * as React from 'react';
import { useActiveLayout, useEditorStore, useAllCommandsById } from '@/store/useEditorStore';
import { ALL_LAYERS, type KeyboardKey, type LayerKey } from '@/types';
import { toLayerKey } from '@/lib/layers';
import { bindingMatchesMode } from '@/lib/grid-menu-filter';
import { Key, PITCH } from './Key';
import { keyIdForMode, modeForKeyId, stripModePrefix } from '@/lib/binding-keys';

function nearestKey(
  keys: readonly KeyboardKey[],
  from: KeyboardKey,
  dir: 'up' | 'down' | 'left' | 'right',
): KeyboardKey | undefined {
  const fx = from.x + from.w / 2;
  const fy = from.y + from.h / 2;
  let best: KeyboardKey | undefined;
  let bestScore = Infinity;
  for (const k of keys) {
    if (k.id === from.id || k.bindName == null || k.isModifier) continue;
    const cx = k.x + k.w / 2;
    const cy = k.y + k.h / 2;
    const dx = cx - fx;
    const dy = cy - fy;
    const aligned =
      dir === 'up' ? dy < -0.1 :
      dir === 'down' ? dy > 0.1 :
      dir === 'left' ? dx < -0.1 :
      dx > 0.1;
    if (!aligned) continue;
    const primary = dir === 'up' || dir === 'down' ? Math.abs(dy) : Math.abs(dx);
    const cross = dir === 'up' || dir === 'down' ? Math.abs(dx) : Math.abs(dy);
    const score = primary + cross * 4;
    if (score < bestScore) {
      bestScore = score;
      best = k;
    }
  }
  return best;
}

export function Keyboard() {
  const labelLayout = useEditorStore((s) => s.labelLayout);
  const bindings = useEditorStore((s) => s.bindings);
  const coBindings = useEditorStore((s) => s.coBindings);
  const activeMods = useEditorStore((s) => s.activeMods);
  const selected = useEditorStore((s) => s.selected);
  const select = useEditorStore((s) => s.select);
  const mode = useEditorStore((s) => s.viewMode);
  const commandsById = useAllCommandsById();

  const layout = useActiveLayout();
  const activeLayer: LayerKey = toLayerKey(activeMods);
  const activeMap = bindings[activeLayer] ?? {};
  const activeCoMap = coBindings[activeLayer] ?? {};

  // Pre-compute, per key, which layers have a binding (filtered by mode so
  // gridmenu commands don't pollute main-mode dots, and vice versa).
  const layerBindMap = React.useMemo(() => {
    const out = new Map<string, Set<LayerKey>>();
    for (const layer of ALL_LAYERS) {
      const m = bindings[layer];
      if (!m) continue;
      for (const [keyId, cmdId] of Object.entries(m)) {
        if (modeForKeyId(keyId) !== mode) continue;
        const baseKeyId = stripModePrefix(keyId);
        const cmd = commandsById.get(cmdId);
        if (!bindingMatchesMode(cmd, mode)) continue;
        let s = out.get(baseKeyId);
        if (!s) {
          s = new Set();
          out.set(baseKeyId, s);
        }
        s.add(layer);
      }
    }
    return out;
  }, [bindings, commandsById, mode]);

  const width = layout.widthU * PITCH;
  const height = layout.heightU * PITCH;

  // Arrow-key navigation between adjacent keys (only when a key is selected).
  React.useEffect(() => {
    if (selected?.kind !== 'key') return;
    const from = layout.keys.find((k) => k.id === selected.keyId);
    if (!from) return;
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      let dir: 'up' | 'down' | 'left' | 'right' | null = null;
      if (e.key === 'ArrowUp') dir = 'up';
      else if (e.key === 'ArrowDown') dir = 'down';
      else if (e.key === 'ArrowLeft') dir = 'left';
      else if (e.key === 'ArrowRight') dir = 'right';
      if (!dir) return;
      const next = nearestKey(layout.keys, from, dir);
      if (next) {
        e.preventDefault();
        select({ kind: 'key', keyId: next.id });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selected, layout.keys, select]);

  // Scale the keyboard to exactly fill its parent's available width — both
  // upscale (wide screens get bigger keys + more readable labels) and
  // downscale (narrow screens shrink instead of overflowing). Capped at 2×
  // so individual key labels don't become absurdly large on ultrawides.
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);
  const NATIVE_W = width + 16; // padding accounted for
  const NATIVE_H = height + 16;
  React.useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const recompute = () => {
      const avail = el.clientWidth;
      if (avail <= 0) return;
      const next = Math.min(2, avail / NATIVE_W);
      setScale(next);
    };
    recompute();
    const obs = new ResizeObserver(recompute);
    obs.observe(el);
    return () => obs.disconnect();
  }, [NATIVE_W]);

  return (
    <div ref={wrapperRef} className="w-full">
      <div
        className="relative mx-auto"
        style={{ width: NATIVE_W * scale, height: NATIVE_H * scale }}
      >
        <div
          className="absolute left-0 top-0 rounded-lg border border-border bg-muted/30 p-2"
          style={{
            width: NATIVE_W,
            height: NATIVE_H,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
        <div className="relative" style={{ width, height }}>
          {layout.keys.map((k) => {
            const modeKeyId = keyIdForMode(mode, k.id);
            const bound = activeMap[modeKeyId];
            const rawCommand = bound ? commandsById.get(bound) : undefined;
            // Hide bindings whose command type doesn't belong to this mode.
            const command = bindingMatchesMode(rawCommand, mode) ? rawCommand : undefined;
            const coIds = activeCoMap[modeKeyId];
            const coCommands = coIds && command
              ? coIds
                  .map((id) => commandsById.get(id))
                  .filter((c): c is NonNullable<typeof c> => !!c && bindingMatchesMode(c, mode))
              : undefined;
            const isSelected = selected?.kind === 'key' && selected.keyId === k.id;
            return (
              <Key
                key={k.id}
                k={k}
                selected={isSelected}
                activeCommand={command}
                {...(coCommands && coCommands.length > 0 ? { coCommands } : {})}
                activeLayer={activeLayer}
                viewMode={mode}
                boundLayers={layerBindMap.get(k.id) ?? EMPTY_LAYER_SET}
                labelLayout={labelLayout}
                onClick={() => {
                  if (k.isModifier || k.bindName == null) return;
                  if (isSelected) {
                    select(null);
                  } else {
                    select({ kind: 'key', keyId: k.id });
                  }
                }}
              />
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

const EMPTY_LAYER_SET: ReadonlySet<LayerKey> = new Set();
