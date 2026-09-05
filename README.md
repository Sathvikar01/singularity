---
title: Singularity
emoji: 🪐
colorFrom: green
colorTo: blue
sdk: static
app_file: index.html
pinned: false
short_description: Five minds. One body. A Three.js co-op physics race.
---

# Singularity

A Three.js browser game with five locked roles: **Eyes, Hands, Torso, Left Leg, Right Leg**. Four teams of five pilots can race together. Six physical body nodes keep both arms, with one Hands pilot controlling them.

## Play

Choose a role before joining a room or starting solo practice. Ranked teams need all five connected pilots. The host starts a three-second countdown; assignments lock immediately and remain locked until the match ends. Number keys and role cards cannot switch assignments during gameplay.

- **Eyes:** A/D or left/right arrows aim the beam. Hold Space while aligned with the amber beacon to scan.
- **Hands:** WASD moves both arms. Hold Space near cargo to carry it; release it onto the mint delivery pad.
- **Torso:** WASD shifts balance. Hold Space to brace on the windy bridge and absorb sweeper impacts.
- **Each leg:** WASD drives that foot. Space gives a grounded hop; hold Space on your own foot switch to activate it.
- **Solo practice:** select any role first. Four AI teammates control only the other roles. Your assigned contribution is still required. Help and room dialogs pause practice.
- **Recovery:** falls reset the current challenge to its checkpoint and add three seconds. Cleared objectives and delivered cargo persist.
- **Reconnect:** the same session identity can resume only its original team and role. A departed pilot's slot remains reserved during the race. If everyone leaves, the room is removed.
- **Rematch:** roles can be chosen again after a match ends. All five pilots must reconnect before restarting.

The six ordered objectives are First contact (aimed scan), Hold the line (braced bridge), Special delivery (place and release cargo), Two to tango (both foot switches together), Storm watch (scan while braced beyond a moving sweeper), and Home stretch (the whole body crosses the finish). Uncompleted objectives block forward progress. A race ends after ten minutes.

Desktop keyboard and mobile touch controls are supported. Teams have distinct colors and separate cargo, without inter-team collision. Practice is unranked. There is no voice chat or account system.

## Architecture

- `shared/physics.ts`: deterministic 30 Hz simulation, five-role mapping, challenge definitions, checkpoints, practice teammates.
- `spacetimedb/src/index.ts`: authoritative identity-based role assignments, bounded inputs, match lifecycle and ranked results.
- `src/main.ts`: lobby, role-specific controls, objective progress, reconnects, practice and results.
- `src/scene.ts`: procedural Three.js body, course, scan beams, gates, foot switches, sweeper, lighting and camera.
- `src/module_bindings/`: generated client protocol.

Clients submit only x/z/action. The server derives the role from its player row, rejects stale protocols, expires inputs after 500 ms, and records finish times using server timestamps. All four public tables are room, player, team and result; the tick scheduler is private. Result rows include ruleset version 2 so incompatible course times are not mixed.

## Develop and verify

Requires Node 24, Chrome and SpacetimeDB CLI/SDK 2.10.

```sh
npm ci
npm ci --prefix spacetimedb
npm test
npm run build
```

Use an isolated local backend for all automated multiplayer checks:

```sh
spacetime start --listen-addr 127.0.0.1:3100 --data-dir .spacetime/five-role-qa
spacetime publish singularity-five-role-test --module-path spacetimedb --server http://127.0.0.1:3100
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```

Set these environment variables before starting Vite:

```text
VITE_SPACETIMEDB_URI=http://127.0.0.1:3100
VITE_SPACETIMEDB_DATABASE=singularity-five-role-test
```

Then run `npm run dev`, `node tests/browser.mjs` and `node tests/multiplayer.mjs`. The latter exercises twenty identities across four teams. Screenshots go to ignored `test-results/`. `tests/live-space.mjs` is a read-only production smoke/practice check; TEST_URL can point it at a local production preview.

## Release

The five-role protocol and tables are incompatible with the old game. Publish to a **new versioned database**, preserving old production data and results. Do not force a destructive schema reset on production.

```sh
spacetime publish singularity-relay-five-role-v2 --module-path spacetimedb --server maincloud
npm run build
python scripts/deploy.py "Deploy Three.js five-role game"
```

The default client target is `singularity-relay-five-role-v2` on Maincloud. Override the public settings using `.env.example` when needed. Deploy the backend before its matching frontend. The deployment script uploads the browser game at the Space root and removes obsolete hosted build directories. Publication is a separate release action; local verification does not publish the game.

