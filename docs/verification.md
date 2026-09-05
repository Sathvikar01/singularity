# Five-role Three.js verification

Verification commands and local backend setup are in ../README.md.

Verified locally on 2026-09-05: 23 unit tests passed; TypeScript/Vite and SpacetimeDB builds passed; twenty clients completed four concurrent ranked races; the desktop/mobile browser suite passed; the production-built frontend completed practice and subscribed to the leaderboard without page errors. Production deployment was not performed.

- Unit suite: deterministic full-course runs, all five role-omission cases, five practice input-isolation cases, Eyes aim isolation, dual-arm control, cargo release, simultaneous foot switches, gate ordering, checkpoint recovery, joint bounds, finite/bounded input, finished clocks and snapshot version checks.
- Multiplayer suite: twenty independent clients and four full ranked finishes; incomplete crews, sixth roles, legacy protocols, role conflicts, host-only start, countdown/racing assignment locks, leave/rejoin, disconnect/resume, host migration, input expiry, rematch reset, persistence and cleanup.
- Browser suite: desktop and mobile role UI, role locks, human-required practice completion, crew readiness, countdown, reload recovery and touch controls.
- Production smoke suite: leaderboard subscription and complete unranked practice against a built frontend.

All mutating multiplayer tests target the isolated local singularity-five-role-test database. No cloud publication is performed by these tests. Screenshots are ignored under test-results/. Automated clients are not a substitute for human playtesting or a prolonged load test.
