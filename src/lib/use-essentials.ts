import * as React from 'react';
import { useActiveLayout, useEditorStore } from '@/store/useEditorStore';
import {
  REMOTE_PRESETS,
  fetchPreset,
  suggestedPresetForLayout,
} from '@/data/presets';
import { extractUikeysTokens } from '@/data/essentials';

const REFRESH_AFTER_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const ESSENTIALS_DEFAULT_PRESET = 'grid';

/**
 * Memoised Set view of `essentialTokens` so hot consumers (every Key tile)
 * don't re-allocate the Set on every render.
 */
export function useEssentialTokens(): ReadonlySet<string> {
  const tokens = useEditorStore((s) => s.essentialTokens);
  return React.useMemo(() => new Set(tokens), [tokens]);
}

/** True iff the given uikeysCommand is bound by BAR's reference preset. */
export function useIsEssentialUikeysToken(
  uikeysCommand: string | undefined,
): boolean {
  const set = useEssentialTokens();
  if (!uikeysCommand) return false;
  return set.has(uikeysCommand);
}

export interface FetchEssentialsApi {
  /** Fetch the essentials set for the given preset id (or the default). */
  refresh: (presetId?: string) => Promise<boolean>;
  busy: boolean;
  error: string | null;
  /** Same shape as the store fields — surfaced for UI feedback. */
  sourceId: string | null;
  fetchedAt: number | null;
  /** Suggested preset id for the current layout (60% boards → grid-60pct). */
  suggestedSourceId: string;
}

/**
 * Fetch BAR's reference preset bundle from GitHub and store the set of
 * `uikeysCommand` tokens it binds. Used to drive the "stock BAR" star
 * marker without checked-in fixtures.
 */
export function useFetchEssentials(): FetchEssentialsApi {
  const sourceId = useEditorStore((s) => s.essentialsSourceId);
  const fetchedAt = useEditorStore((s) => s.essentialsFetchedAt);
  const setEssentialTokens = useEditorStore((s) => s.setEssentialTokens);

  const layout = useActiveLayout();
  const suggestedSourceId =
    suggestedPresetForLayout(layout.id)?.id ?? ESSENTIALS_DEFAULT_PRESET;

  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Guards setState after unmount — `fetchPreset` is async and the user may
  // switch layouts (re-firing the boot effect's cleanup) before it resolves.
  const mountedRef = React.useRef(true);
  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = React.useCallback(
    async (presetId?: string) => {
      const targetId = presetId ?? suggestedSourceId;
      const preset = REMOTE_PRESETS.find((p) => p.id === targetId);
      if (!preset) {
        if (mountedRef.current) setError(`Unknown preset: ${targetId}`);
        return false;
      }
      if (mountedRef.current) {
        setBusy(true);
        setError(null);
      }
      try {
        const text = await fetchPreset(preset);
        const tokens = extractUikeysTokens(text);
        // Zustand setState is unmount-safe; the React setStates below are not.
        setEssentialTokens(Array.from(tokens), preset.id);
        return true;
      } catch (e) {
        if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [setEssentialTokens, suggestedSourceId],
  );

  return { refresh, busy, error, sourceId, fetchedAt, suggestedSourceId };
}

/**
 * Boot effect: lazily ensures the essentials set is populated. Called from
 * the App root on first render. Runs the fetch when:
 *  - we've never fetched (`fetchedAt == null`), or
 *  - the cached set is older than `REFRESH_AFTER_MS`, or
 *  - the cached source preset id differs from the layout's suggested id
 *    (e.g. user switched from full-size to 60% — refresh against the right
 *    reference).
 */
export function useEnsureEssentialsLoaded(): void {
  const tokens = useEditorStore((s) => s.essentialTokens);
  const sourceId = useEditorStore((s) => s.essentialsSourceId);
  const fetchedAt = useEditorStore((s) => s.essentialsFetchedAt);
  const layoutId = useEditorStore((s) => s.layoutId);
  const { refresh } = useFetchEssentials();

  React.useEffect(() => {
    const suggested =
      suggestedPresetForLayout(layoutId)?.id ?? ESSENTIALS_DEFAULT_PRESET;
    const stale =
      fetchedAt == null || Date.now() - fetchedAt > REFRESH_AFTER_MS;
    const wrongSource = sourceId != null && sourceId !== suggested;
    const empty = tokens.length === 0;
    if (empty || stale || wrongSource) {
      void refresh(suggested);
    }
    // We deliberately depend on layoutId (so 60% switches re-fetch) but not
    // on `tokens`/`fetchedAt`/`sourceId` to avoid re-fetching after a
    // successful refresh updates them in the same tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutId]);
}
