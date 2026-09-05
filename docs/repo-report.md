# Singularity repository report

Generated: 2026-09-05

## What this repo is

Singularity is a browser-playable cooperative physics race. Six players can share one articulated body, with one player assigned to each body part: eyes/head, left arm, right arm, torso/back, left leg, and right leg. Up to four teams race simultaneously through the same three-stage floating obstacle course. A team must cross a narrow bridge, carry a cargo cube into a delivery zone, avoid a moving sweeper, and reach the finish. Lowest server-recorded completion time wins.

The repo contains the playable web client, its authoritative SpacetimeDB backend, automated verification, deployment tooling, and an optional Unreal/Blender art handoff. The hosted production client is a static Hugging Face Space; the real-time game state and persistent leaderboard live in SpacetimeDB Cloud.

## Repository map

| Path | Responsibility |
| --- | --- |
| `index.html` | Browser entry point and metadata |
| `src/main.ts` | UI, lobby, input handling, practice loop, subscriptions, race HUD, results |
| `src/scene.ts` | Three.js scene, lighting, procedural course, body rendering, camera, effects |
| `src/network.ts` | SpacetimeDB connection and table subscriptions |
| `src/module_bindings/` | Generated TypeScript client bindings for backend tables and reducers |
| `shared/physics.ts` | Shared fixed-step articulated-body simulation and checkpoint rules |
| `spacetimedb/src/index.ts` | Authoritative reducers, scheduled simulation, teams, rooms, results |
| `tests/physics.test.ts` | Deterministic simulation and gameplay-rule tests |
| `tests/browser.mjs` | Two-browser cloud lobby and UI smoke test |
| `tests/multiplayer.mjs` | Six-client, two-team local SpacetimeDB race and persistence test |
| `tests/live-space.mjs` | Hosted production Space smoke test and full practice completion |
| `scripts/deploy.py` | Uploads the Vite `dist` build to Hugging Face Spaces |
| `art/blender/generate_singularity_assets.py` | Generates optional body, course, cargo, and finish GLB assets |
| `unreal/` | Unreal Engine 5.4 project shell and integration handoff notes |
| `docs/verification.md` | Recorded verification results and tested scope |
| `docs/superpowers/plans/` | Implementation plan and phase checklist |

## Runtime architecture

The web client uses Vite, TypeScript, Three.js, and generated SpacetimeDB bindings. The visual scene is procedural: platforms, bridge slats, cargo, finish gate, rocks, lighting, fog, shadows, labels, and articulated body meshes are created at runtime.

The physics model is a compact Verlet-style, position-based solver. Six nodes represent the controlled body parts, while distance constraints preserve the body shape. Role inputs apply forces; arms can grip the cargo; legs can hop; falls reset the body to the latest checkpoint and add three seconds. Solo mode uses the same solver with assisted inputs.

SpacetimeDB is authoritative for ranked play. Its public tables are:

- `room`: room code, host identity, match state, start timestamp.
- `player`: identity, team, assigned role, bounded input, heartbeat.
- `team`: serialized body state, checkpoint stage, finish time.
- `result`: persistent ranked result rows.

The private `tick` schedule invokes the simulation reducer at approximately 30 Hz. Clients submit bounded inputs only; they do not submit poses, progress, or completion times. The server clock determines final rankings. Idle inputs expire, disconnects release role slots, host ownership migrates, and empty rooms are deleted while result rows remain.

## Main user flows

Solo practice starts immediately from the landing screen. Both legs receive assisted forward movement and balance, while Space can be used to grab cargo. Practice displays an unranked completion result.

Competitive play opens a room dialog. Players enter a callsign, room code, team, and body role. The first player becomes host. Each team can have at most one pilot per role; players can switch to an unoccupied role and reconnect to an existing team during a race. The host starts the countdown. Teams receive separate colored bodies, live checkpoint/status updates, finish times, and a rematch action.

The leaderboard reads persistent SpacetimeDB results. If the backend is unavailable, the UI reports the problem and does not fabricate online players or ranked local results.

## Engine and art handoff

`unreal/Singularity.uproject` is an Unreal Engine 5.4 shell with Enhanced Input, online subsystem defaults, a GameMode, and the six shared-body role names. It is intended for a future high-fidelity client or asset review; it is not the production multiplayer runtime in this repo.

The Blender script uses only Blender's built-in Python API. It creates three GLBs under `art/generated/`: `singularity_body.glb`, `course_modules.glb`, and `cargo_and_finish.glb`. Those assets can be imported into Unreal under `/Game/Singularity/Art` and used by a Blueprint with six Chaos rigid bodies and constraints.

## Build, test, and deploy

```sh
npm ci
npm ci --prefix spacetimedb
npm test
npm run build
npm run dev
```

With Vite running, the browser checks are:

```sh
node tests/browser.mjs
node tests/multiplayer.mjs
node tests/live-space.mjs
```

Backend development uses the SpacetimeDB CLI. The deployment sequence publishes the backend to Maincloud, builds the static client, and runs `python scripts/deploy.py "Deploy verified game build"` to upload `dist` to the Hugging Face Space.

## Verification status

The latest verification recorded nine passing physics tests, a passing production TypeScript/Vite build, successful SpacetimeDB module publication, two-client cloud lobby checks, a six-client two-team race, server-ranked results, persistence after disconnect, room cleanup, rematch reset, and hosted full-course solo practice.

## Current boundaries

The project has one complete course and a compact custom physics model. Unreal is a prepared shell rather than a compiled native client. Teams do not physically collide with one another. There is no voice chat, matchmaking service, player account authentication, skeletal animation, or load test for the maximum 24-player case. Callsigns and room codes are public, user-entered values.

## Recommended next work

The most valuable next step is an Unreal visual pass that imports the generated GLBs, replaces procedural meshes with authored materials and animations, and connects the six role inputs to the existing SpacetimeDB contract. After that, add a second course and server-side load testing before expanding social features.
