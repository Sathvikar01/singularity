# Repository architecture

The runtime is exclusively Three.js, TypeScript and SpacetimeDB. See ../README.md for play, local testing and release commands.

Five role slots map to six physical nodes: Eyes to head, Hands to both arms, Torso to the torso, and each leg to its own foot. ROLE, NODE_ROLES and COURSE in shared/physics.ts are the shared contract.

Six ordered challenges require scanning, bracing, cargo release, concurrent foot switches, a scan/brace combination beyond the sweeper, and a complete-body finish. The simulation owns all conditions. Three.js renders the same gate positions and hazard phase.

Ranked rooms require five connected pilots per active team. The server freezes room/team/role at countdown. Leave and disconnect mark an active pilot offline while retaining the assignment. Rejoin is allowed only for that identity and assignment; online host ownership migrates. Empty rooms delete their teams and leases, but ranked results persist.

Client input has no role or pose field. It is bounded, rate limited and expires after 500 ms. Countdown and finished matches ignore input. Rematches reset bodies and input state. Protocol version 2 prevents old numeric assignments from being reinterpreted. Results include the ruleset version.

Practice uses exactly one human input slot and four independently generated teammates. A neutral human role cannot be silently replaced by AI.

Tests cover role necessity, input isolation, ordered challenge completion, finite deterministic physics, recovery, a twenty-client race, server restrictions, reconnects, rematches, desktop/mobile controls and full practice completion.

Production deployment requires a new versioned database because the schema and body JSON changed. Existing production records should remain in the old database.
