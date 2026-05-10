/**
 * Parse BAR's `luaui/configs/gridmenu_layouts.lua` directly to discover
 * which unit lives at each (faction, builder, row, col) cell.
 *
 * The Lua file is data-only — `local labGrids = { … }`, `local unitGrids = { … }`
 * — so we can extract the values with a focused, regex-driven parser without
 * needing a full Lua interpreter.
 */

export interface LabGrid {
  /** Builder key, e.g. `armlab`, `corvp`. */
  builder: string;
  /** Flat 12-element list of unitDef names; `''` = empty cell. */
  cells: readonly string[];
}

export interface UnitGrid {
  /** Builder unitDef key, e.g. `armcom`. */
  builder: string;
  /** category[1..4][row 1..3][col 1..4] -> unitDef name (or '') */
  cats: Record<number, Record<number, Record<number, string>>>;
}

export interface ParsedBarGridLayouts {
  labGrids: readonly LabGrid[];
  unitGrids: readonly UnitGrid[];
}

const LAYOUTS_URL =
  'https://raw.githubusercontent.com/beyond-all-reason/Beyond-All-Reason/master/luaui/configs/gridmenu_layouts.lua';

export async function fetchBarGridLayouts(): Promise<ParsedBarGridLayouts> {
  const res = await fetch(LAYOUTS_URL, { mode: 'cors' });
  if (!res.ok) throw new Error(`Failed to fetch gridmenu_layouts.lua: ${res.status}`);
  const text = await res.text();
  return parseBarGridLayouts(text);
}

/** Strip Lua line comments (`-- …`). */
function stripComments(text: string): string {
  return text.replace(/--[^\n]*/g, '');
}

/**
 * Find the contents of `local <name> = { … }` (returns the inside of the
 * outermost braces, or null). Handles balanced braces and string literals.
 */
function extractTopLevelTable(source: string, name: string): string | null {
  const headRe = new RegExp(`local\\s+${name}\\s*=\\s*\\{`);
  const m = headRe.exec(source);
  if (!m) return null;
  const start = m.index + m[0].length; // first char inside the {
  let i = start;
  let depth = 1;
  let inString: '"' | "'" | null = null;
  while (i < source.length && depth > 0) {
    const ch = source[i];
    if (inString) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === inString) inString = null;
      i++;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    i++;
  }
  if (depth !== 0) return null;
  return source.slice(start, i - 1);
}

/** Split a table body into top-level entries — handles balanced braces and strings. */
function splitTopLevelEntries(body: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let start = 0;
  let inString: '"' | "'" | null = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (inString) {
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = ch;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === ',' && depth === 0) {
      out.push(body.slice(start, i));
      start = i + 1;
    }
  }
  if (start < body.length) {
    const last = body.slice(start).trim();
    if (last) out.push(last);
  }
  return out;
}

/**
 * Parse the right-hand side of a Lua entry into either:
 *   - a string (`"foo"`)
 *   - a list of strings (`{ "a", "b", "" }`)
 *   - a nested table (returns a generic JS array of values)
 */
function parseValue(value: string): unknown {
  const v = value.trim();
  if (v.startsWith('"') || v.startsWith("'")) {
    // Bare string. Strip quotes, no escape handling needed for our inputs.
    return v.slice(1, -1);
  }
  if (v.startsWith('{')) {
    const inner = v.slice(1, -1);
    return splitTopLevelEntries(inner).map(parseValue);
  }
  return v;
}

interface KvEntry {
  key: string;
  value: string; // raw RHS
}

/** Parse top-level entries into key/value pairs. Supports `name = …` and `["x"] = …`. */
function parseKvEntries(body: string): KvEntry[] {
  const out: KvEntry[] = [];
  for (const entry of splitTopLevelEntries(body)) {
    const trimmed = entry.trim();
    const m = /^(\[?["']?[A-Za-z0-9_]+["']?\]?)\s*=\s*([\s\S]+)$/.exec(trimmed);
    if (!m) continue;
    const rawKey = m[1] ?? '';
    const rawValue = m[2] ?? '';
    const key = rawKey.replace(/^\[|\]$/g, '').replace(/^["']|["']$/g, '');
    out.push({ key, value: rawValue });
  }
  return out;
}

export function parseBarGridLayouts(text: string): ParsedBarGridLayouts {
  const cleaned = stripComments(text);

  const labGrids: LabGrid[] = [];
  const labBody = extractTopLevelTable(cleaned, 'labGrids');
  if (labBody) {
    for (const { key, value } of parseKvEntries(labBody)) {
      const parsed = parseValue(value);
      if (Array.isArray(parsed)) {
        labGrids.push({ builder: key, cells: parsed.map((v) => (typeof v === 'string' ? v : '')) });
      }
    }
  }

  const unitGrids: UnitGrid[] = [];
  const unitBody = extractTopLevelTable(cleaned, 'unitGrids');
  if (unitBody) {
    for (const { key, value } of parseKvEntries(unitBody)) {
      const parsed = parseValue(value);
      if (!Array.isArray(parsed)) continue;
      // unitGrids[builder] is either:
      //   - explicit-keyed `[1] = { [1] = { … } }` (older / partial), or
      //   - Lua array `{ { rows… }, { rows… }, … }` (BAR's current shape).
      // Split the body and assign sequential numeric keys to bare `{…}` entries.
      const catEntries = splitNestedEntries(
        value.slice(value.indexOf('{') + 1, value.lastIndexOf('}')),
      );
      const cats: Record<number, Record<number, Record<number, string>>> = {};
      for (const ce of catEntries) {
        const catBody = ce.body.slice(ce.body.indexOf('{') + 1, ce.body.lastIndexOf('}'));
        const rowEntries = splitNestedEntries(catBody);
        const rows: Record<number, Record<number, string>> = {};
        for (const re of rowEntries) {
          const rowBody = re.body.slice(re.body.indexOf('{') + 1, re.body.lastIndexOf('}'));
          const cellEntries = splitTopLevelEntries(rowBody);
          const cols: Record<number, string> = {};
          let colIdx = 0;
          for (const cell of cellEntries) {
            // Cell entries can be `[N] = "name"` (rare) or just `"name"` /
            // `""` / nothing. We map them to sequential 1-based columns.
            colIdx++;
            const trimmed = cell.trim();
            if (trimmed.startsWith('[')) {
              const km = /^\[(\d+)\]\s*=\s*([\s\S]+)$/.exec(trimmed);
              if (km) {
                const explicitCol = Number(km[1]);
                const rhs = (km[2] ?? '').trim();
                if (rhs.startsWith('"') || rhs.startsWith("'")) {
                  cols[explicitCol] = rhs.slice(1, -1);
                }
                continue;
              }
            }
            if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
              const v = trimmed.slice(1, -1);
              if (v) cols[colIdx] = v;
            }
          }
          rows[re.index] = cols;
        }
        cats[ce.index] = rows;
      }
      unitGrids.push({ builder: key, cats });
    }
  }

  return { labGrids, unitGrids };
}

interface NestedEntry {
  /** 1-based numeric index (explicit `[N] =` or auto-incremented). */
  index: number;
  body: string;
}

/**
 * Split a Lua table body into entries, supporting both `[N] = {…}` and
 * implicit-array `{…}, {…}` forms. Auto-assigns sequential indices to any
 * bare-table entry.
 */
function splitNestedEntries(body: string): NestedEntry[] {
  const out: NestedEntry[] = [];
  let auto = 0;
  for (const raw of splitTopLevelEntries(body)) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const explicit = /^\[(\d+)\]\s*=\s*([\s\S]+)$/.exec(trimmed);
    if (explicit) {
      out.push({ index: Number(explicit[1]), body: (explicit[2] ?? '').trim() });
    } else {
      auto++;
      out.push({ index: auto, body: trimmed });
    }
  }
  return out;
}
