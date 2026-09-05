# Multi-course coordination verification

Verification commands and isolated local-backend setup are in `../README.md`.

Verified locally on 2026-09-05. No cloud database or production deployment was changed.

- `npm test`: 38/38 deterministic physics tests passed.
- `npm run build`: strict TypeScript and the Vite production build passed.
- `spacetime build --module-path spacetimedb`: the authoritative server module passed.
- `node tests/browser.mjs`: the desktop/mobile UI suite passed with no page errors or horizontal overflow.
- `npm run test:perf`: warm 1440×900 practice averaged 143.3 Easy, 148.2 Medium and 137.0 Difficult WebGL draw calls per frame after debris instancing (previously about 191, 201 and 190).
- `node tests/multiplayer.mjs`: guarded local multiplayer passed. An authoritative Difficult/3-player crew finished in 39.677s and an Easy/5-player crew finished in 19.186s.

The unit suite covers all three challenges in both crew modes, every requested role mapping, practice isolation, paired versus independent limb input, two-hand gripping, role necessity, ordered objectives, dynamic and narrow surfaces, course-specific checkpoint penalties, Difficult launch-window mistakes, exact millisecond formatting, deterministic replay, finite constrained physics, gates and incompatible snapshots.

The browser suite covers all challenge choices, the requested three- and five-player role names, mode-specific practice, millisecond clocks, difficulty state, segregated leaderboard controls, touch controls and mobile responsiveness.

The multiplayer suite covers both crew sizes, configured challenge/crew joins, dynamic readiness, role and configuration conflicts, host-only start, countdown/racing locks, reconnect leases, stale bounded input, rematch reset, authoritative finishes and challenge/crew fields on persistent results.

All mutating multiplayer tests refuse non-local hosts and target only `singularity-coordination-test-v4` (or a strictly prefixed isolated variant). Screenshots live under `.impeccable/review/` and `test-results/`. Automated clients do not replace extended human playtesting or load testing.
