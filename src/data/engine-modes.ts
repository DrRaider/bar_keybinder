/**
 * BAR engine-driven "modes" — states where the engine and/or stock Lua widgets
 * change what mouse/keyboard input does *for the duration of the mode*. None
 * of these mode interactions are expressible as a `uikeys.txt` bind: they live
 * in the Recoil engine source or in stock Lua widgets and fire regardless of
 * the player's config.
 *
 * The editor surfaces these on the relevant key/button so a player who, say,
 * binds `meta+Q → drawinmap` understands that pressing it then arms an engine
 * gesture (middle-click drops a ping) that no `bind … mouseN ping` line would
 * have produced.
 *
 * Sources cited per entry. Keep this list short and high-signal — only modes
 * whose mouse-button semantics differ from the default game mode belong here.
 */

import type { MouseRole } from '@/lib/engine-context';

export interface EngineMode {
  id: string;
  name: string;
  /** One-sentence player-facing summary. */
  description: string;
  /**
   * Action token(s) that put BAR into this mode. Empty when the mode is
   * entered implicitly (e.g. by selecting a builder + a build command).
   */
  enteredBy: readonly string[];
  /** How the engine reinterprets mouse buttons while this mode is active. */
  mouseBehavior: Partial<Record<MouseRole, string>>;
  /**
   * When true, the behavior runs unconditionally — the "default game mode"
   * gestures that fire regardless of any binding, every time the player
   * isn't inside one of the conditional modes below. Rendered in its own
   * "Always on" section, not lumped with the conditional modes.
   */
  always?: boolean;
  /** Optional source citation for verification. */
  source?: string;
}

export const ENGINE_MODES: readonly EngineMode[] = [
  {
    id: 'default',
    name: 'Default game mode',
    description:
      'Always active outside other modes — these gestures fire every time, regardless of your bindings. To suppress them you would have to recompile the engine.',
    enteredBy: [],
    always: true,
    mouseBehavior: {
      L: 'Click to select a unit. Drag to draw a select-box. Shift+click adds to selection, Ctrl+click removes.',
      Mid: 'Hold and drag to pan the camera.',
      R: 'Click to issue the default order (move / attack / repair / guard) on whatever is under the cursor.',
      wheelUp: 'Zoom the camera in.',
      wheelDown: 'Zoom the camera out.',
    },
    source: 'RecoilEngine/rts/Game/UI/MouseHandler.cpp — direct SDL_BUTTON_* reads',
  },
  {
    id: 'draw',
    name: 'Draw on map',
    description:
      'Free-draw / annotate mode for sketching lines and dropping pings on the minimap or main view.',
    enteredBy: ['drawinmap', 'drawlabel'],
    mouseBehavior: {
      L: 'Hold + drag to draw a freehand line your team can see.',
      Mid: 'Click to drop a ping/marker (engine-driven, fires whether or not this button is bound).',
      R: 'Click to erase the nearest marker.',
    },
    source: 'RecoilEngine/rts/Game/UI/MouseHandler.cpp — inMapDrawer path',
  },
  {
    id: 'build-place',
    name: 'Place building',
    description:
      'Active while a builder is selected AND a build command has been chosen — the cursor shows the building footprint.',
    enteredBy: [],
    mouseBehavior: {
      L: 'Click to place. Hold and drag to lay out a line/area of buildings.',
      Mid: 'No special behavior — middle-drag still pans the camera.',
      R: 'Click to cancel placement and return to the default cursor.',
    },
    source: 'RecoilEngine/rts/Game/UI/GuiHandler.cpp — MousePress',
  },
  {
    id: 'fps',
    name: 'First-person unit control',
    description:
      'Camera and control hand off to a single selected unit. WASD moves, mouse aims, buttons fire weapons.',
    enteredBy: ['controlunit'],
    mouseBehavior: {
      L: 'Fire primary weapon.',
      R: 'Fire secondary weapon (depends on the unit).',
      Mid: 'No special behavior in this mode.',
    },
    source: 'RecoilEngine/rts/Game/FPSUnitController.cpp',
  },
];
