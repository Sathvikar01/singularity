---
title: Singularity
emoji: 🪐
colorFrom: green
colorTo: blue
sdk: static
app_file: index.html
pinned: false
short_description: Six minds. One body. A multiplayer physics race.
---

# Singularity

A browser-playable cooperative physics race. Up to **four teams of six players** pilot shared bodies across a floating obstacle course. Each player controls the head, left arm, right arm, torso, left leg, or right leg. Coordinate forces, carry cargo, avoid a sweeper, and finish faster than the other teams.

**Play:** https://huggingface.co/spaces/sankalphs/singularity  
**Source:** https://github.com/Sathvikar01/singularity

## Play

Create a callsign and room code, then share the invite link. Pick the same team to share a body or another team to compete. The first player hosts and starts the countdown. Empty roles remain neutral; pilots can switch to unoccupied parts using **1–6** or the role cards during a race. For a small crew, assign legs first and switch a pilot to an arm for cargo.

- **WASD / arrows:** force on your assigned body part. W moves forward along the course, independent of camera angle.
- **Space:** arms grab nearby cargo while held; legs hop when grounded.
- **Three ordered objectives:** cross the narrow bridge, carry the gold cube into the mint delivery zone, cross the finish after the sweeper.
- **Falls:** checkpoint recovery and a three-second penalty. Ten-minute match limit.
- **Solo practice:** assisted legs and balance; Space grabs with either arm. Practice is unranked.

Desktop keyboard is recommended; narrow screens include touch controls. Teams race as separate colored bodies on the same course without inter-team collision. Reconnecting players can fill vacant roles on an existing team mid-race; switching teams mid-race is blocked. Use **Crew / rematch** to open the room controls.

## Architecture

Three.js renders procedural 3D assets, lighting, shadows, fog, and constrained articulated bodies. A pure fixed-step position-based physics solver is shared between practice and the **authoritative SpacetimeDB TypeScript module**. The server alone advances ranked simulations, validates roles and checkpoints, sets clocks, ends matches, and writes leaderboard rows. Clients submit bounded inputs; they cannot submit body poses, progress, or completion times. Idle inputs expire after 500 ms. Disconnects release role slots and migrate host ownership. Empty rooms are removed; result rows persist independently.

Generated SpacetimeDB bindings subscribe to public tables `room`, `player`, `team`, `result`. The `tick` scheduler is private. Final times always use server timestamps, including penalties; running UI clocks are estimates using the visitor's clock.

This initial competitive course uses a custom constrained-body solver and procedural Three.js assets. Unreal/Blender are not runtime requirements. It does not include skeletal animation, voice chat, matchmaking, or player-account authentication. Public callsigns are self-selected.

## Unreal and Blender handoff

An optional Unreal Engine 5.4 shell is in [`unreal/Singularity.uproject`](unreal/Singularity.uproject). The Blender script [`art/blender/generate_singularity_assets.py`](art/blender/generate_singularity_assets.py) creates GLB body, course, cargo, and finish assets without external downloads. These assets are visual handoff material; SpacetimeDB remains the authoritative multiplayer simulation.

## Develop and verify

Requires Node 22.6+ (24 recommended), npm, and SpacetimeDB CLI 2.9+.

```sh
npm ci
npm ci --prefix spacetimedb
npm test
npm run dev
npm run build
```

The default client connects to `singularity-relay-sankalphs` on Maincloud. For another backend, copy `.env.example` to `.env.local` and set both values before starting Vite/building. These are public settings, not secrets.

```sh
spacetime start --listen-addr 127.0.0.1:3100 --data-dir .spacetime
spacetime publish singularity-test --module-path spacetimedb --server http://127.0.0.1:3100
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb
```

With Vite running and Chrome installed, `node tests/browser.mjs` verifies cloud lobbies with two browser clients. `node tests/multiplayer.mjs` verifies complete simultaneous races against the local test database. Full completion tests run locally to avoid polluting the public leaderboard.

## Deploy

```sh
spacetime login
spacetime publish singularity-relay-sankalphs --module-path spacetimedb --server maincloud
npm run build
python scripts/deploy.py "Deploy verified game build"
```

The script uses existing Hugging Face credentials and uploads the static production build. SpacetimeDB Cloud provides persistence. No paid graphics server is required. An offline backend is visibly reported; no fake online players or local ranked results are substituted.

