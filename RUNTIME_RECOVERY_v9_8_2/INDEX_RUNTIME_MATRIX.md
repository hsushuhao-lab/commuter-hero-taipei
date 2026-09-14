# v9.8.2 Runtime Identity Matrix

- Release target: `v9.8.2`
- Canonical source: `source/src/`
- Single-file builder: `scripts/build_single_file.py`
- Required outputs: root `index.html` and `dist/index.html`
- Required invariant: SHA-256(root) == SHA-256(dist)
- Runtime console marker: `[GAME BUILD] v9.8.2 <source-fingerprint>`
- Runtime QA entrypoint: `?qa=1`, then `debugRuntime()`
- No service worker is present; `.nojekyll` is committed.
- Existing untracked WIP remains preserved: `PI_QA_v9_8_1_round3/`, `RECOVERY_QCHIBI_V9_8_0/`.
