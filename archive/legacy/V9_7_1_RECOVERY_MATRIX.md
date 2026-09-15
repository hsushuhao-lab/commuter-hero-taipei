# v9.7.1 Recovery Matrix

Evidence date: 2026-09-13. Scope is the local dirty WIP at `C:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO`.

Allowed statuses used here: `DONE`, `PARTIAL`, `NOT_STARTED`, `IMPLEMENTED_NOT_TESTED`, `FAIL`, `UNKNOWN`.

| Requirement | Status | Evidence | File | Test | Remaining Work |
|---|---|---|---|---|---|
| Canonical local repo identified | DONE | Correct Git remote and canonical path confirmed | `C:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO` | `git remote -v`, `git rev-parse` | None for identification |
| Antigravity WIP preserved in Git checkpoint | PARTIAL | Recovery commit `21b08ae` preserves 49 files including all 6 untracked scripts; local push is blocked by missing GitHub auth | Git log/status | `git show --stat 21b08ae` | Push recovery branch when auth is available |
| Three-state separation: online baseline / local WIP / target spec | DONE | Online baseline is `origin/main=19c2296`; local WIP is dirty branch; target spec is the handoff prompt | Git and audit | Not applicable | Commit target spec after PI approval |
| Hero Form 2 removed from active gameplay | DONE | Active source, HUD, StyleBible, README, and bundled runtime code contain no active Form 2/45-coin awakening marker; legacy docs are marked historical | `source/src/ui/HUD.js`; `source/src/ui/StyleBible.js`; `README.md` | `hero_form2_removal_test.js` PASS | None for this gate |
| Yu identity: slowest, rapid low-damage umbrella fire | IMPLEMENTED_NOT_TESTED | Speed 320, CD 0.16, damage 16, range 480, umbrella bullet implementation | `source/src/data/Characters.js:27-55`; `source/src/entities/Player.js:256-298` | Old hero test fails on obsolete `wind_blade` expectation | Add v9.7.1 identity test |
| Shakira identity: second-fastest, highest small-attack damage, ranged splash | IMPLEMENTED_NOT_TESTED | Speed 345, damage 38, two 600px eggs, 90px splash | `source/src/data/Characters.js:79-108`; `source/src/entities/Player.js:314-348` | Headless route simulation reaches GAMEOVER | Add direct identity and survivability tests |
| Sandra identity: fastest, low damage, knockback hit-and-run | IMPLEMENTED_NOT_TESTED | Speed 370, damage 34, 160px pan wave, knockback 380 | `source/src/data/Characters.js:132-161`; `source/src/entities/Player.js:350-395` | Exploratory full run reaches VICTORY once; old two-stage test fails | Add current one-stage identity test and balance test |
| Phase 1 run-and-escape behavior | PARTIAL | Aggro leash and return-to-origin behavior exist | `source/src/entities/Monster.js:128-139` | No dedicated v9.7.1 no-combat gate | Test that player can mainly run to 30 coins without stable clearing |
| Phase 2 predator pursuit | PARTIAL | Catch-up speed, predicted target direction, movement-driven re-entry, rear/front/air/flank roles, and reinforcements exist | `source/src/entities/Monster.js:35-207`; `source/src/world/Level.js:419-477` | `phase2_predator_behavior_test.js` PASS; `phase2_state_transition_test.js` PASS | Validate sustained contrast and skilled combat completion |
| Phase 2 monster damage and attack density | PARTIAL | P2 damage/cooldown variants and attack patterns are implemented | `source/src/data/Monsters.js:14-232`; `source/src/entities/Monster.js:292-584` | `monster_attack_phase_test.js` 8/8 PASS | Measure per-hit damage, effective attack-event rate, and population against target ranges |
| Coins unchanged in placement/count | DONE | Current declaration-order manifest has 87 coins and exactly matches v9.6 positions | `source/src/world/Level.js:200-383`; `COIN_PLACEMENT_AUDIT.csv` | `economy_manifest_audit.js` PASS | None for this gate |
| Coffee density reduced and each coffee heals +25 | DONE | Current manifest has 13 coffees versus v9.6's 25; all are on jump platforms and healing is capped +25 with no buff | `source/src/world/Level.js:219-383`; `source/src/entities/Player.js:154-198`; `COFFEE_PLACEMENT_AUDIT.csv` | `economy_manifest_audit.js` PASS | None for this gate |
| Continuous background/parallax transitions | IMPLEMENTED_NOT_TESTED | 800px stage overlap, transition fog, and lobby crossfade are coded | `source/src/world/Level.js:478-590` | No browser visual test | Capture and inspect seam contact sheets at every transition |
| Ultimate damage gated after cinematic wind-up | DONE | CUTIN → WINDUP → RELEASE state machine; `unleashUltimate()` occurs at release | `source/src/entities/Player.js:398-412,536-620` | `playtest_simulation.js` timer/cinematic assertions PASS | Add explicit pre-release damage=0 test for all three heroes |
| Boss true two-phase HP and transform | DONE | P1 3600, transform 2.8s, P2 5200, overkill clamps at P1 boundary | `source/src/data/Monsters.js:237-299`; `source/src/entities/Boss.js:116-204,328-363` | `boss_intro_outro_test.js` 5/5 PASS; old test is stale | Replace old 2400/3200 test with v9.7.1 expectations |
| Boss Phase 2 complexity | PARTIAL | Radial petals, lunge, roots, pollen, scythe, thorns, miasma, chomper, summon, rage methods exist | `source/src/entities/Boss.js:470-575,792-1080` | Broad headless simulation passes; no per-attack safety test | Verify all attacks are observable, telegraphed, and playable |
| Boss duration target 25–45s | FAIL | Observed boss fights: Yu 10.9–12.8s; Sandra 17.0s | `scripts/test_all_3_heroes.js` output | Exploratory simulation | Rebalance damage/HP/attack cadence and create duration gate |
| Boss runtime art clean and release-ready | UNKNOWN | Active files are 512×512 RGBA with alpha; unused redesign files are RGB; no visual sign-off | `source/src/entities/Boss.js:106-110`; `assets/boss_flower_phase1.png`; `assets/boss_flower_phase2.png` | Visual viewer blocked by missing `bwrap` | Run browser/image visual QC; verify no crop, annotation, beige sheet, or species mismatch |
| Full three-hero completion | FAIL | Yu and Sandra reached VICTORY in observed v9.7.1 run; Shakira reached GAMEOVER | `scripts/test_all_3_heroes.js`, `scripts/test_pacing.js` output | Exploratory run | Reproduce Shakira failure, add a hard all-hero gate |
| Existing regression suite green | FAIL | 8 PASS, 5 FAIL; additional exploratory scripts have partial results | `scripts/*.js` | Baseline run with Windows Node v24.18.0 | Classify/update stale tests, then require all current tests green |
| Offline single-file bundle | DONE | Root and dist bundles are identical and include current source/assets as data | `index.html`, `dist/index.html`, `scripts/build_single_file.py` | Static marker/hash check | Rebuild only after source approval; then verify bundle with browser smoke test |
| Visual QA and PI package | NOT_STARTED | No current v9.7.1 visual contact sheets or PI review package | Repo inventory | Not applicable | Browser visual QA, screenshots, package, PI review |
| Production/GitHub Pages release | NOT_STARTED | No recovery checkpoint or v9.7.1 release commit; `origin/main` remains v9.6 baseline | Git refs | Not applicable | Only after all gates and PI approval |

## Matrix decision

`IN_PROGRESS_WITH_GITHUB_PUSH_BLOCKER; RELEASE_GATES_REMAIN_OPEN`

The local WIP is valuable and should be preserved for review, but it is not authorized for merge, deployment, or production release.
