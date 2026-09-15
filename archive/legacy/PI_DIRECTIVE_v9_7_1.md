# PI Directive — v9.7.1 Predator Boss Release

## Authority and scope

This directive authorizes Codex to recover the interrupted local WIP in the canonical repository, preserve it in Git, implement and test the v9.7.1 release gates, build the single-file runtime, and publish only after the gates pass. The canonical project remains `C:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO`; no duplicate development directory is allowed.

Production remains `origin/main` at the known v9.6.0 baseline until every mandatory gate passes. Recovery and Codex branches are development publications, not production approval. Never force-push, normalize line endings, run `git add --renormalize`, or overwrite the original art source.

## Product contract

- Phase 1 is RUN/PARKOUR/COLLECT: finite aggro and avoidable combat.
- At 30 coins, Phase 2 is PREDATOR/HUNT: persistent pursuit, catch-up, valid re-entry, front/rear/air pressure, and terrain-aware flank/surround roles.
- Heroes have one normal attack, one small attack, and one Ultimate. No active hero Form 2 or 45-coin awakening UI/runtime state may remain.
- Yu is slowest with rapid, low-damage umbrella fire; Shakira is second-fastest with the highest small-attack damage and ranged splash; Sandra is fastest with low-damage knockback hit-and-run.
- Coffee is fixed +25 HP capped at max HP, with no speed, shield, invulnerability, or attack buff; preserve the reduced coffee count and keep coffee off the main flat route.
- Coin count and placements must equal the v9.6 baseline unless a generated group is proven semantically identical.
- Boss Phase 1 → transformation → Phase 2 → rage → death must be continuous, telegraphed, fair, and 25–45 seconds for representative skilled play.

## Evidence policy

Tests must distinguish stale v9.5 assertions from real release failures. Do not weaken current behavior to satisfy obsolete tests, bypass the end-to-end route, or call a code-only pass a visual/scientific release. Browser visual QA is required for boss art and all five background transitions. Every release claim must cite a fresh artifact or command result.

## Required release outputs

`HERO_STATS_v9_7_1.csv`, `MONSTER_PHASE_COMPARISON_v9_7_1.csv`, `COIN_PLACEMENT_AUDIT.csv`, `COFFEE_PLACEMENT_AUDIT.csv`, `PHASE_CONTRAST_RESULTS.csv`, `BOSS_ATTACK_AUDIT.csv`, `BOSS_PLAYTEST_RESULTS.csv`, `REGRESSION_TEST_MATRIX.csv`, `PI_REVIEW_v9_7_1.md`, `RELEASE_NOTES_v9_7_1.md`, and the `PI_REVIEW/` visual evidence folders.

