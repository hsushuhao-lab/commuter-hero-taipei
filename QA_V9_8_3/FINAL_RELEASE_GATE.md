# v9.8.3 Gameplay Polish — Release Evidence

## Runtime gate: PASS

- Build identity: `v9.8.3` (`[GAME BUILD] v9.8.3 71d99e06184e8619`).
- `index.html` and `dist/index.html` SHA-256 are identical: `abb4fb977f489e5c43d802d6e417229d2a71cb05475bfb8e01aa9b25f575d5d4`.
- Direct bundled-runtime combat check: Yu Phase II ultimate = 520 Boss damage; Shakira Phase II ultimate = 550 Boss damage.
- Real-route deterministic gate: Yu / Shakira / Sandra all reached `VICTORY`; Boss durations were 44.7s / 34.4s / 38.4s.
- Browser QA used Chrome on the built local page. Captures verify a visible Pause control without a visible TAB control, the three-hero Victory Run layout, and a clean final result state without world runners.

## Included evidence

- `shakira_run_strip.png`, `shakira_run_right.gif`, `shakira_run_left.gif`, and `shakira_run_biomechanics_overlay.png`: six discrete Shakira run keyframes, not a sine-warped shared pose.
- `hud_topright_no_tab.png`, `boss_p2_dense.png`, `victory_run_exactly_3.png`, and `victory_final_clean_result.png`: browser captures at 1280x720.
- `BROWSER_RUNTIME_QA.json`: build/runtime identity returned by `debugRuntime()`.

## Manual visual acceptance

The automated runtime and browser-state gates passed. A final human playthrough remains the appropriate acceptance check for subjective animation feel, accessibility, and battle readability; this release does not claim that PI visual acceptance was automated.
