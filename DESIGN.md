# Commuter Hero Taipei Design System

This is an extracted contract for the existing canvas-first game UI. v9.7.1 preserves the current visual language; it does not introduce a new DOM component framework or rewrite the renderer.

## 1. Atmosphere & Identity

Rain-night Taipei commute: dark navy atmosphere, cyan electrical accents, warm gold collectibles, and saturated hero/monster colors. The signature is the readable layered canvas scene—rain, fog, parallax city depth, and bright telegraphed combat effects carrying the player from a hurried run into a boss climax.

## 2. Color

| Role | Tokens | Usage |
|---|---|---|
| Night surfaces | `#040711`, `#060A14`, `#0B132B`, `#171E2E` | opening, canvas overlays, panels |
| Primary text | `#FFFFFF`, `#ECEFF1`, `#CFD8DC` | HUD and instructional copy |
| Electric accent | `#00E5FF`, `#00B0FF`, `#80D8FF`, `#0288D1` | controls, Yu, focus/energy |
| Commuter gold | `#FFD54F`, `#FFE082`, `#FFD700`, `#FFB300` | coins, milestones, collectibles |
| Health/success | `#00E676`, `#69F0AE`, `#00C853` | health and positive state |
| Danger/boss | `#FF5252`, `#FF1744`, `#FF4081`, `#FF80AB` | damage, boss phase and warning |
| Hero identity | `#8E24AA`, `#D84315`, `#FFA726` | Shakira and Sandra accents |

Canvas renderer values above are existing tokens extracted from `source/src`; new visual changes must reuse them or add a named token here first.

## 3. Typography

The canvas uses the browser/system sans-serif stack already present in the runtime. HUD hierarchy is: large white health/time readouts, medium white labels, cyan/gold status accents, and compact instructional captions. Keep copy legible at the existing desktop and mobile canvas scales; do not add emoji as UI icons.

## 4. Spacing & Layout

The game is a fixed logical canvas with responsive CSS scaling. World layout is authored in world pixels; HUD and controls are anchored to the logical viewport. Reuse existing canvas coordinates and safe margins. Do not alter route geometry or coin spacing as a styling side effect.

## 5. Components

### Game canvas
- **Structure**: one canvas renderer with world, entities, HUD, overlays, and controls.
- **Variants**: opening, gameplay, transformation, victory, game over, menu.
- **States**: normal, warning, disabled/input-blocked, transition, reduced-motion.
- **Accessibility**: preserve keyboard and touch control paths; retain readable text and contrast.
- **Motion**: renderer-owned scene transitions and gameplay animation; no layout animation.

### HUD and status strip
- **Structure**: health, coins/resonance, timer, boss bar, ability prompts.
- **Variants**: gameplay, boss, transition, final clock-in.
- **States**: active, cooldown, warning, victory, game over.
- **Accessibility**: high-contrast text and redundant visual state cues.
- **Motion**: status changes and telegraphs only; no decorative motion without gameplay meaning.

### Mobile controls
- **Structure**: touch zones for movement, jump, dash, small attack, and Ultimate.
- **Variants**: mobile portrait/landscape and desktop hidden/keyboard path.
- **States**: idle, pressed, cooldown, disabled during cinematic.
- **Accessibility**: multitouch-safe controls with equivalent keyboard actions.
- **Motion**: pressed feedback through existing opacity/scale treatment.

## 6. Motion & Interaction

Gameplay timing is state-driven: Ultimate damage is zero in CUTIN/WINDUP and begins at RELEASE; boss telegraphs precede high damage; background transitions crossfade rather than jump. Respect the existing reduced-motion path where present. New motion must use transform/opacity-style effects or renderer state, never conceal a gameplay transition.

## 7. Depth & Surface

Strategy: mixed canvas layering. Atmospheric depth comes from parallax, fog, rain, stage overlap, and lighting gradients; HUD surfaces use dark tonal fills with restrained bright outlines. Boss phase change must be visible through silhouette, color, effects, and state messaging rather than a label alone.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

Preserve keyboard and touch equivalence, visible state changes, readable contrast, non-spawn-on-player boss damage, and a reduced-motion-safe path. Keep the canvas runtime usable on desktop and mobile viewport sizes.

### Accepted Debt

| Item | Location | Why accepted | Exit |
|---|---|---|---|
| Canvas-first renderer has limited semantic DOM structure | `source/src/main.js`, `source/src/ui/` | This release is a recovery/balance pass; a renderer rewrite would expand scope and risk frozen gameplay | Separate accessibility modernization project |
| Existing renderer contains raw color literals | `source/src/**/*.js` | Values are established canvas tokens and broad normalization would create a noisy WIP diff | Consolidate only in a dedicated visual-system refactor |

