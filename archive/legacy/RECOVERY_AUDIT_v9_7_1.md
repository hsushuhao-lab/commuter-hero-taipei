# Recovery Audit — v9.7.1

Date: 2026-09-13 (Asia/Taipei)
Scope: read-only recovery audit of `C:\Users\Asher\Documents\game`.

## Decision

`C:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO` is the canonical local repository and contains a substantial Antigravity v9.7.1 working tree. The work is recoverable, but it is not release-ready and must not be treated as a completed v9.7.1 build.

No game files were modified during this audit. `git fetch origin` was run as requested; no pull, reset, restore, clean, checkout-overwrite, commit, push, or rebuild was run.

## Git state

| Field | Evidence / result |
|---|---|
| Local project | `/mnt/c/Users/Asher/Documents/game/08workbattle-v8_0-COMMUTER-HERO` |
| Remote | `https://github.com/hsushuhao-lab/commuter-hero-taipei.git` |
| Current branch | `v9.7.1-predator-boss-continuity` |
| Local HEAD | `19c2296c004ed14a0335b149cca1a94113ca9aeb` |
| `origin/main` after fetch | `19c2296c004ed14a0335b149cca1a94113ca9aeb` |
| Ahead / behind commits | 0 / 0; branch has no v9.7.1 commit of its own |
| Working tree | Dirty: 43 tracked modifications, 6 untracked files |
| Ignored files | `FULL-SOURCE.zip`, `WEB-SHARE.zip` are ignored by `*.zip` |
| Diff scope | 43 files; approximately 33,043 insertions and 32,492 deletions versus `origin/main` |
| Diff hygiene | `git diff --check` reports 66,086 whitespace findings; likely includes the large Windows line-ending/rewrite diff and should be reviewed before checkpoint |

The local branch name is therefore a recovery label, not proof of a preserved Git checkpoint. The only immutable known-good Git state remains v9.6.0 at `19c2296`.

## Local filesystem inventory

Top-level directories found:

- `08workbattle-v8_0-COMMUTER-HERO` — canonical Git repo, active WIP.
- `08workbattle-v7_0-DESIGN-FUSION-SOURCE` — alternative non-Git project copy with a different source layout and older-style assets.
- `美術設計` — external art source directory; 27 files, including `美術設計_new_00.png` through `美術設計_new_12.png`.
- `.tmp_inspect` — inspection/extraction artifacts; not part of the canonical runtime repo.

The `美術設計_new_08.png` through `美術設計_new_12.png` files were modified on 2026-09-13 around 10:37. They remain outside the repo and were not moved, copied, or overwritten. Runtime assets must not be inferred from their names alone.

The alternative v7 directory contains its own `index.html`, `src/main.js`, `dist/index.html`, `package.json`, continuous-background assets, and player/monster assets. It is not the same project topology and has no `.git` directory under `game`; it should remain an evidence source only until a human explicitly selects it.

## Runtime source and bundle

The canonical repo has 16 modular JavaScript source files under `source/src`, plus a module entrypoint at `source/index.html`. The current `index.html` and `dist/index.html` are identical and contain embedded asset data and the current v9.7.1 source markers. The bundle contains no `form2Active` marker, and it includes the current `雨傘機關槍` and `PREDATOR HUNT` implementation markers.

The build script writes both root and `dist` bundles and uses a hard-coded Windows path (`c:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO`), so build verification must be performed from the intended Windows environment. No build was rerun during this audit because it would overwrite existing bundle files.

## Antigravity progress assessment

### Evidence-backed completed or substantially implemented

- Three hero data definitions now encode the v9.7.1 identity direction: Yu is slowest/highest fire rate/low per-shot damage, Shakira is second-fastest/highest skill damage, and Sandra is fastest/low damage with knockback. See `source/src/data/Characters.js:27-161`.
- Player skill implementations match those identities: Yu rapid umbrella bullets and close projectile deflection, Shakira two ranged eggs with splash, Sandra short-range pan wave with knockback. See `source/src/entities/Player.js:250-395`.
- The active Player runtime no longer contains `form2Active` or an `awakenForm2()` path. However, stale Form 2 language remains in runtime Style Bible/HUD text, so this is not a clean requirement completion.
- Coffee collection applies a capped +25 HP heal and does not apply speed or invulnerability. See `source/src/entities/Player.js:154-198`.
- The Level source has six ground gaps in scenes 1–4 and flat arena/lobby floors. Existing `cliff_route_test.js` passes.
- Monster Phase 2 attack variants, higher damage, shorter cooldowns, and telegraph logic exist. `monster_attack_phase_test.js` and `monster_stability_test.js` pass.
- Boss Phase 1/Phase 2 data, transform invulnerability, Phase 2 attack rotation, lunge, roots, tracking pollen, summon, scythe, thorns, miasma, and low-HP rage code exist. See `source/src/data/Monsters.js:237-299` and `source/src/entities/Boss.js:470-575, 792-1080`.
- Boss runtime selects `boss_flower_phase1.png` and `boss_flower_phase2.png`; both are 512×512 RGBA PNGs with non-empty alpha bounds. This proves an alpha-capable active asset, not visual cleanliness.
- Ultimate damage is delayed until the `RELEASE` state after `CUTIN` and `WINDUP`. See `source/src/entities/Player.js:398-412, 536-620`.
- Background rendering has world-space stage layers, crossfade overlap, transition fog, and an arena-to-lobby crossfade. See `source/src/world/Level.js:478-590`.
- Offline bundle generation exists and root/dist are byte-identical in the current WIP.

### Partial or high-risk

- Phase 2 predator behavior has catch-up movement, predicted movement for selected types, rear/front-air reinforcements, and re-entry code. There is no explicit assignment to `isPursuer`, and no clear left/right surround formation; the implementation is closer to reinforcement plus catch-up than a validated persistent pursuit/interceptor/flank system. See `source/src/entities/Monster.js:128-199` and `source/src/world/Level.js:426-467`.
- `Level.triggerPhase2Predator()` directly sets `attackPhase = 2` before calling each nearby monster's normal evolution path. That creates a transient state where `attackPhase` is 2 while `isPhase2` and attack numeric fields are still Phase 1 until that monster updates.
- Boss fight length is below the stated 25–45 second skilled-player target in the available WIP simulations: Yu 10.9–12.8s, Sandra 17.0s. The Boss is stronger and more complex than baseline, but pacing is not validated against the target.
- The active runtime uses `boss_flower_phase1/phase2.png`; the separate `boss_p1_redesign.png` and `boss_p2_redesign.png` are RGB PNGs and are not referenced by `Boss.js`. They are not evidence of clean runtime Boss art.
- `source/src/ui/StyleBible.js:208` still says `45` coins unlock hero Form 2, and `source/src/ui/HUD.js:287-297` still exposes the `45`-coin Form 2 milestone. This is a user-visible specification contradiction even though the active character data removed Form 2.
- Existing repo documents still identify README/release material as v9.6.0 or earlier. They cannot be used as v9.7.1 release evidence.

## Test baseline

All 15 discovered JS test/playtest scripts were attempted using the installed Windows Node v24.18.0 via Windows cmd. The first attempt using bash `node` was invalid because Linux PATH has no `node`; it is not counted as a test result.

| Script | Result | Interpretation |
|---|---|---|
| `boss_intro_outro_test.js` | PASS, 5/5 | Matches current 3600/5200 Boss expectation |
| `boss_true_two_phase_test.js` | FAIL | Stale v9.5 assertions expect 2400/3200, while current WIP is 3600/5200 |
| `cliff_route_test.js` | PASS | Six gaps, flat arena/lobby, recovery checks pass |
| `end_to_end_route_test.js` | FAIL | Yu reaches GAMEOVER at x≈15601; does not reach lobby/clock |
| `group_clockin_test.js` | FAIL | Direct test setup remains PLAYING instead of entering VICTORY_RUN |
| `hero_attack_identity_test.js` | FAIL | Stale v9.5 expectations require Yu `wind_blade` melee/parry and Sandra two-stage values |
| `menu_return_flow_test.js` | PASS, 7/7 | Navigation flow passes |
| `mobile_controls_test.js` | PASS, 6/6 | Touch/multitouch controls pass |
| `monster_attack_phase_test.js` | PASS, 8/8 | Phase 2 attack variants and badge pass |
| `monster_stability_test.js` | PASS | 600-second equivalent simulation passes |
| `music_state_test.js` | FAIL | Legacy test observes commute theme at arena and then uses old 2400/3200 Boss values |
| `opening_flow_test.js` | PASS, 6/6 | Opening flow passes |
| `playtest_simulation.js` | PASS, 16/16 | Broad headless assertions pass, but it is not a visual or all-hero release gate |
| `test_all_3_heroes.js` | INCOMPLETE / exploratory output | Yu and Sandra reached VICTORY; Shakira reached GAMEOVER in the observed run |
| `test_pacing.js` | INCOMPLETE / exploratory output | Shakira reached GAMEOVER; Sandra reached VICTORY |

The 8 passing tests are useful technical evidence. They do not override the 5 failing tests, the exploratory Shakira failure, the Yu full-route failure, or missing visual QA.

## Highest-risk unfinished work

1. Preserve the entire dirty WIP in a reviewed recovery checkpoint after PI accepts this audit; first enumerate whether the six untracked scripts are wanted, debug-only, or garbage.
2. Update or replace stale v9.5 tests with v9.7.1-specific tests; do not weaken current code to satisfy obsolete 2400/3200 or melee Yu expectations.
3. Diagnose Shakira survivability and the Yu full-route failure with a reproducible failing test before balance changes.
4. Validate actual Phase 2 predator persistence and flank/surround behavior, including the transient `attackPhase`/`isPhase2` state.
5. Validate Boss pacing against 25–45 seconds and test each Phase 2 attack with safe, observable telegraphs.
6. Resolve the stale Form 2 HUD/Style Bible contradiction.
7. Perform real browser visual QA of scene seams and Boss assets. The local image viewer could not load the external game path because the sandbox lacks `bwrap`; alpha metadata was checked instead, but that is not a visual sign-off.

## Recommended continuation order

1. PI review of this audit and explicit decision on whether to preserve all WIP, including untracked scripts and ignored ZIPs.
2. Create and push the recovery checkpoint branch only after that decision.
3. Freeze a v9.7.1 directive/matrix in the repo.
4. Add v9.7.1 tests for no Form 2, Phase 1 avoidability, Phase 2 pursuit, hero-specific attacks, Boss duration, Ultimate damage timing, and Shakira/Yu full routes.
5. Fix the first failing test with minimal changes, re-run targeted tests, then run the complete regression set.
6. Run browser visual QA and produce a PI review package only after technical and gameplay gates pass.

## Audit gate status

`RECOVERY_AUDIT_COMPLETE_WITH_RELEASE_BLOCKERS`

This audit does not authorize a checkpoint, merge, deployment, or release.
