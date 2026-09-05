---
title: Singularity
emoji: 🪐
colorFrom: green
colorTo: blue
sdk: static
app_file: index.html
pinned: false
short_description: Three or five minds. One body. Three escalating co-op physics races.
---

# Singularity

A Three.js browser game where either three or five pilots control one shared physical body. Crews race one of three increasingly chaotic obstacle courses, and exact ranked times are compared only with the same challenge and crew size.

## Repositories and deployments

- [GitHub](https://github.com/Sathvikar01/singularity) is the source repository (`master`).
- [Hugging Face](https://huggingface.co/spaces/sankalphs/singularity) contains generated static deployment artifacts (`main`). Its history is intentionally separate; deploy it with `scripts/deploy.py` rather than merging its branch into the source branch.
- The [`sankalpsss28` SpacetimeDB account](https://spacetimedb.com/@sankalpsss28) hosts the production SpacetimeDB modules. Ruleset 3 targets `singularity-coordination-v3`; the incompatible older databases remain intact.

## Play

Choose a challenge and crew size before joining a room or starting solo practice. The first pilot fixes that room's setup. The host starts a three-second countdown when every active team has every required role; assignments then lock until the match ends.

- **Three-player crew:** Arms controls both hands, Torso controls posture and balance, and Legs controls both feet.
- **Five-player crew:** Left Hand and Right Hand manipulate objects independently, Torso controls posture and balance, and each leg has its own pilot.
- **Movement:** WASD or arrow keys move the assigned body part. Space/ACT grips, braces, bends, hops, presses, or synchronizes according to the current objective.
- **Easy — Suspended Disbelief:** the original orbital training course, updated for two-hand relays and coordinated cargo carrying.
- **Medium — Freight Expectations:** a longer cargo-yard run with low gantries, moving sweepers, a narrow zig-zag carry lane, and a shifting deck.
- **Difficult — The Coordination Tax:** climbing latches, raised unstable platforms, two precise reactor-core placements, and a synchronized launch window. A false launch adds seven seconds.
- **Recovery:** falls restore the current checkpoint and add 3, 5, or 8 seconds according to difficulty. Placed objectives persist.
- **Practice:** AI fills every role except the selected human role. Practice pauses under dialogs and never creates ranked results.
- **Reconnect and rematch:** a connected identity resumes its locked team and role during a race. Roles can be chosen again after a match ends.

Desktop keyboard and mobile touch controls are supported. Up to four colored teams can race in one room without inter-team collision. Three-player and five-player records have separate leaderboard tabs, further filtered by challenge. Times display and persist to the millisecond. There is no voice chat or account system.

## Architecture

- `shared/physics.ts`: deterministic 30 Hz simulation, challenge definitions, 3/5-player limb mapping, dual-hand objects, dynamic platforms, penalties, checkpoints and practice teammates.
- `spacetimedb/src/index.ts`: authoritative identity-based role assignments, bounded inputs, match lifecycle and ranked results.
- `src/main.ts`: lobby, role-specific controls, objective progress, reconnects, practice and results.
- `src/scene.ts`: three procedural Three.js environments, character bodies, objects, gates, moving hazards, unstable platforms, lighting and camera.
- `src/module_bindings/`: generated client protocol.

Clients submit only x/z/action. The server derives the role from its player row, rejects stale protocols or mismatched room configurations, expires inputs after 500 ms, and records exact finish times using server timestamps plus simulation penalties. Room, team and result rows carry challenge and crew size; ruleset 3 records never mix with incompatible results.

## Develop and verify

Requires Node 24, Chrome and SpacetimeDB CLI/SDK 2.10.

```sh
npm ci
npm ci --prefix spacetimedb
npm test
npm run build
spacetime build --module-path spacetimedb
spacetime generate
```

Use an isolated local backend for all automated multiplayer checks:

```sh
spacetime start --listen-addr 127.0.0.1:3101 --data-dir .spacetime/coordination-v3-qa
```

Then, in a second terminal, build, generate bindings, publish the local database and start Vite:

```sh
spacetime dev
```

The tracked `.env.development` and `spacetime.dev.json` keep both Vite and the CLI on `http://127.0.0.1:3101/singularity-coordination-test-v3`. For one-shot setup, use `spacetime publish --env dev`, `spacetime generate --env dev`, then `npm run dev` instead. Run `node tests/browser.mjs` and `node tests/multiplayer.mjs`; the multiplayer suite covers both crew sizes and categorized results. Screenshots go to ignored `test-results/`. `tests/live-space.mjs` is a read-only production smoke/practice check; `TEST_URL` can point it at a local production preview.

## Release

Ruleset 3 changes roles, bodies, rooms, and result categories. Publish it to the new versioned database, preserving old production data and results. Do not force a destructive reset on an older production database.

```sh
spacetime publish singularity-coordination-v3
npm run build
python scripts/deploy.py "Deploy three-course coordination game"
```

`spacetime.json` declares the production module, database and generated TypeScript bindings. `spacetime.dev.json` safely overrides the server and database for isolated local development. The default client target is `singularity-coordination-v3` on Maincloud; override the public settings using `.env.example` when needed. Deploy the backend before its matching frontend. The deployment script uploads the browser game at the Space root and removes obsolete hosted build directories. Publication is a separate release action; local verification does not publish the game.

Install the Python deployment dependency with `python -m pip install -r requirements-deploy.txt` before the first Space release.

