/**
 * Essential-command set, sourced from BAR's actual master-branch keymap.
 *
 * A command is "essential" iff its `uikeysCommand` token is bound in the
 * BAR preset the user picked as their reference (see `essentialsSourceId`
 * on the store). The set is fetched lazily from GitHub on first run and
 * cached in localStorage, so the gold-star marker tracks BAR's live keymap
 * — no checked-in fixtures, no manual upkeep.
 *
 * Default reference preset is `grid` (full BAR grid mode bundle: shared
 * chat/UI + gridmenu + num row + grid_keys); 60% boards transparently
 * substitute `grid-60pct`.
 */

/**
 * Extract the unique set of `uikeysCommand` bodies from a uikeys.txt-shaped
 * text. Format of a bind line (after stripping `// comments` and trim):
 *
 *   bind <keytoken> <command body…>
 *
 * The body is everything after the keytoken whitespace, kept verbatim so
 * multi-word commands (`group select 1`, `select Visible+_…+`,
 * `chain force forcestart | say !cv forcestart`) are preserved as-is.
 */
export function extractUikeysTokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\/\/.*$/, '').trim();
    if (!line) continue;
    const lower = line.toLowerCase();
    if (!lower.startsWith('bind ') && !lower.startsWith('bind\t')) continue;
    const rest = line.slice(5).replace(/^\s+/, '');
    const m = rest.match(/^\S+\s+(.+)$/);
    if (!m) continue;
    const cmd = (m[1] ?? '').trim();
    if (cmd) out.add(cmd);
  }
  return out;
}
