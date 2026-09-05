# Verified competitive core

Verified on 2026-09-05 with Node 24, Chrome, SpacetimeDB CLI 2.9 and SDK 2.10.

| Check | Result |
| --- | --- |
| Pure simulation tests | 9 passed |
| Client TypeScript / production build | Passed |
| SpacetimeDB module build / Maincloud publish | Passed |
| Two browser clients against cloud | Shared lobby, exclusive roles, host start, countdown, role switching, exit passed |
| Six clients / two simultaneous teams | Both completed all three stages |
| Ranked server times | Team 1: 13.286s; Team 2: 14.680s |
| Persistence and cleanup | Results remained after disconnect; empty room removed |
| Rematch | Countdown and body/progress/times reset; prior results retained |
| Hosted production Space | Assets, WebGL, full practice completion and live leaderboard passed |

Run commands are in the README. Test screenshots are local under `test-results/` and ignored by git. Automated ranked completion runs use a separate local database, preserving the public leaderboard for players.

## Scope

One complete three-stage course, six controlled body parts, four teams, assisted unranked solo mode, touch controls, audio cues, persistent SpacetimeDB results. The physics model is an intentionally compact position-based articulated body. Teams do not physically collide with each other. Twenty-four concurrent humans, prolonged network outages and large-room-count load have not been stress-tested. No native Unreal binary, voice chat or matchmaking is included.
