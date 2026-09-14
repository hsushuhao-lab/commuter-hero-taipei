# Agent Handoff Prompt — v9.7.7 Sandra Skill & Clean Menu

## v9.7.4 current handoff

- Current release: v9.7.7 Sandra Skill & Clean Menu; base main `8be8949`.
- Boss assets: `source/assets/boss_flower_phase1_v9_7_4.png` and `source/assets/boss_flower_phase2_v9_7_7.png`.
- Boss runtime references independent P1/P2 paths and no longer uses multiply compositing.
- P1/P2 已依原稿裁切、去白底並重建；下一位 Agent 應以目前發布 SHA 與 Pages 狀態為準。

你是下一位接手此專案的 coding agent。請在完成證據 gates 前不要 push、merge 或部署；不要把舊 commit message、舊 README、模擬無敵或人工回血結果當成 PASS。

## 使用者授權與目標

使用者已明確授權修改：
`C:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO`

並在所有 release gates 真正通過後：commit、push GitHub branch、merge `main`、push `origin/main`、部署並驗證 GitHub Pages。

本次交班目標：以最簡單、可重現、有限 token 的方式完成 v9.7.1；先盤點，後執行，最後發布。附加的 Recovery Master Prompt 是規格與驗收清單，不是可直接信任的結果報告。

## Repository state

- Canonical repo: `C:\Users\Asher\Documents\game\08workbattle-v8_0-COMMUTER-HERO`
- Branch: `codex/v9.7.1-predator-boss-release`
- Current committed HEAD: `11a7c8c3e8ae2df2be96cdbec6acb69dc767c6bc`
- HEAD message claims a verified three-hero route, but the clean real-combat rerun below disproves that claim.
- Baseline production: `19c2296c004ed14a0335b149cca1a94113ca9aeb` (`origin/main`, v9.6.0)
- Recovery checkpoint branch/commit: `21b08ae`
- Remote: `https://github.com/hsushuhao-lab/commuter-hero-taipei.git`
- Pages target: `https://hsushuhao-lab.github.io/commuter-hero-taipei/`
- Working tree has intentional uncommitted WIP in `source/src/entities/Player.js`, `scripts/test_all_3_heroes.js`, `index.html`, and `dist/index.html`. Inspect `git diff` before changing anything.

## What has been verified

- `scripts/phase1_no_combat_test.js`: deterministic 10-trial Phase 1 calibration passed for all three heroes at the >=70% target.
- `scripts/phase2_contrast_test.js`: latest run passed P2 per-hit ~2x, attack event rate ~2x, cleanup, no-combat contrast, and tactical-role checks.
- Economy/coin and coffee audits already exist and were previously reported PASS; recheck only if source changes touch placement or healing.
- `cmd.exe /c "py scripts\\build_single_file.py"` passed after the latest source edits; root `index.html` and `dist/index.html` were rebuilt with 76 encoded assets.
- Current root/dist SHA-256 parity: `b8f3574b584060dae15523dcf73b4a8ee72ce7b52ac6bd4a0984b5a0b76e23a4` for both files.
- `source/src/entities/Player.js` no longer supplies timestamp-based projectile IDs; `Projectiles.js` supplies sequential IDs. This fixed same-millisecond multi-hit identity collisions in accelerated simulations.
- `window.activeGame = game` was added to the full-route simulation because it is required by the real browser runtime for Ultimate effects such as Sandra’s pull.

## Latest authoritative runtime evidence

Command:
`cmd.exe /c "node scripts\\test_all_3_heroes.js"`

The test uses deterministic simulated time/randomness, real HP, real falls, real 180-second timer, real enemy damage, and no artificial healing/revive/HP floor/600-second extension.

Latest result after the current WIP fairness/controller changes:

| Hero | State | Final x | HP | Falls | Total time | Boss time |
|---|---|---:|---:|---:|---:|---:|
| Yu | GAMEOVER | 15653 | 0/100 | 0 | 59.8s | 0.0s |
| Shakira | GAMEOVER | 11732 | 0/90 | 1 | 36.0s | 0.0s |
| Sandra | GAMEOVER | 8493 | 0/120 | 3 | 32.0s | 0.0s |

The temporary invulnerability diagnostic (`FULL_ROUTE_INVULN=1`) reached VICTORY, but it is not release evidence:

- Yu: VICTORY, Boss 71.0s, falls 1
- Shakira: VICTORY, Boss 54.6s, falls 8
- Sandra: VICTORY, Boss 44.2s, falls 2

Interpretation: route geometry can reach the Boss, but real combat survivability and Boss pacing remain unresolved. The current `Player.js` WIP includes a 1.0s iframe and a P2-only 0.5 damage multiplier; even with those, the real-combat gate fails. Do not add more blind balance knobs. Confirm a fair, observable fix with a failing test first.

Latest targeted reruns: `phase1_no_combat_test.js` Yu 10/10, Shakira 9/10, Sandra 10/10 PASS; `phase2_contrast_test.js` per-hit ~2x, attack event rate ~2x, cleanup, no-combat contrast, and role pressure PASS.

## Current WIP details

- `Player.js`: timestamp projectile ID lines were removed earlier; current uncommitted WIP changes player iframe from 0.5s to 1.0s and applies a P2-only received-damage multiplier of 0.5 while preserving configured monster P2 attack damage/rate.
- `scripts/test_all_3_heroes.js`: removed artificial heals, revives, HP floors, timer extension, and HUD resets; added deterministic clock/randomness, damage tracing, activeGame setup, earlier skill use, projectile awareness, dash/jump behavior. Temporary diagnostic branch `FULL_ROUTE_INVULN=1` remains in the test and should be removed or clearly isolated before release.
- Root/dist bundles reflect the current `Player.js`; rebuild after any source change with the official builder.
- `.debug-journal.md` is local and git-excluded. It records the debugging evidence and should be removed at final cleanup or left uncommitted.

## Blocking gates

1. Real three-hero full-route combat must reach VICTORY and x=17650 for each hero without artificial healing, revive, HP floor, invulnerability, teleport, or timer extension.
2. Boss duration must be 25–45 seconds for representative skilled play; current legitimate duration is not measured because the real bot dies before/inside Boss, and the invulnerability diagnostic gives 71.0/54.6/44.2s.
3. Boss P1/P2 attack occurrence, visible telegraphs, and fair avoidance remain unverified.
4. Real browser visual QA is still required at 375/768/1280 widths, including opening, scene seams, P2 feedback, Boss art/telegraphs, touch controls, retry/home flows, and ending.
5. Existing required result/package artifacts are missing or stale: `HERO_STATS_v9_7_1.csv`, `MONSTER_PHASE_COMPARISON_v9_7_1.csv`, `PHASE_CONTRAST_RESULTS.csv`, `BOSS_ATTACK_AUDIT.csv`, `BOSS_PLAYTEST_RESULTS.csv`, `REGRESSION_TEST_MATRIX.csv`, `PI_REVIEW_v9_7_1.md`, `RELEASE_NOTES_v9_7_1.md`, visual QA folders, ZIPs, and final SHA-256.
6. `AGENT_HANDOFF.md`, `V9_7_1_RECOVERY_MATRIX.md`, `README.md`, and `RELEASE_NOTES.md` contain stale versions/claims and must be updated only from current evidence.
7. Full regression has not passed; stale tests must be classified or updated without weakening current v9.7.1 behavior.
8. No branch push, main merge, origin/main update, or Pages deployment has been completed for the current release.

## Required next actions

1. Inspect `git diff` and retain useful WIP; remove only temporary diagnostic output/toggles after recording evidence.
2. Add hard assertions to `scripts/test_all_3_heroes.js` for all heroes: `VICTORY`, clock punched, x=17650 path, no watchdog, no artificial state mutation, and Boss duration 25–45s. Run it red before a product fix.
3. Use runtime evidence to make one minimal gameplay fix. Preserve the hard rules: P2 source attack damage ~2x, effective attack event rate ~2x, 1.7–2x population, movement-driven roles, no teleport, and unchanged coffee/coin semantics.
4. Rebuild root/dist with `cmd.exe /c "py scripts\\build_single_file.py"` and rerun targeted tests.
5. Run the full current regression set and real browser Playwright QA. Do not call mock canvas tests browser QA.
6. Generate the missing evidence CSVs/docs/visual package only after technical and gameplay gates pass; update this handoff with exact commands, outputs, commit SHA, deployed SHA, and Pages URL.
7. Use git-master discipline for commit/push/merge. Before publication verify status, staged diff, build hashes, and remote destination. If automatic review rejects push, report the exact rejection; do not bypass it.

## Release rule

Until every blocking gate has current evidence, final status must remain:
`BLOCKED_RELEASE_WITH_EVIDENCE`

Only after branch, `main`, and Pages all match the verified build may status become:
`V9_7_1_PRODUCTION_DEPLOYED_AND_VERIFIED`
