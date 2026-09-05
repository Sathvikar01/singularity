export const DT = 1 / 30;
export const RULESET = 2;
export const ROLES = ["Eyes", "Hands", "Torso", "Left Leg", "Right Leg"] as const;
export const ROLE = { Eyes: 0, Hands: 1, Torso: 2, LeftLeg: 3, RightLeg: 4 } as const;
export const ROLE_HELP = [
  "A/D aim the beam · hold Space to scan the beacon",
  "WASD position both hands · hold Space to carry · release on the pad",
  "WASD shift balance · hold Space to brace against wind and impacts",
  "WASD drive your left foot · Space hop / hold on your foot switch",
  "WASD drive your right foot · Space hop / hold on your foot switch",
];
export const COURSE = [
  { name: "First contact", hint: "Eyes: aim at the amber beacon and hold scan", gate: 5, spawn: 0 },
  { name: "Hold the line", hint: "Torso: brace at the far end of the windy bridge", gate: 16, spawn: 6 },
  { name: "Special delivery", hint: "Hands: carry the crate onto the mint pad, then release", gate: 26, spawn: 17 },
  { name: "Two to tango", hint: "Both legs: hold Space on your own foot switch together", gate: 33, spawn: 28 },
  { name: "Storm watch", hint: "Eyes: scan the second beacon while Torso braces beyond the sweeper", gate: 47, spawn: 35 },
  { name: "Home stretch", hint: "Keep your balance and bring the whole body through the finish", gate: 60, spawn: 49 },
] as const;
export type Input = { x: number; z: number; action: boolean };
export type Node = { x: number; y: number; z: number; px: number; py: number; pz: number };
export type Body = {
  version: number; nodes: Node[]; stage: number; falls: number; ticks: number;
  finished: boolean; grip: number; cube: Node; delivered: boolean; look: number;
  charge: number; feet: number[]; brace: boolean; previousActions: boolean[];
};
export const neutralInputs = (): Input[] => ROLES.map(() => ({ x: 0, z: 0, action: false }));
const node = (x: number, y: number, z: number): Node => ({ x, y, z, px: x, py: y, pz: z });
export function createBody(z = 0): Body {
  return { version: RULESET, nodes: [node(0, 2, z), node(0, 3, z), node(-1, 2, z), node(1, 2, z), node(-.45, .35, z), node(.45, .35, z)],
    stage: 0, falls: 0, ticks: 0, finished: false, grip: -1, cube: node(0, .45, 19),
    delivered: false, look: 0, charge: 0, feet: [0, 0], brace: false, previousActions: ROLES.map(() => false) };
}
// Physical node order stays independent of the five player assignments.
export const NODE_ROLES = [ROLE.Torso, ROLE.Eyes, ROLE.Hands, ROLE.Hands, ROLE.LeftLeg, ROLE.RightLeg];
export const LINKS = [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1.7], [0, 5, 1.7], [4, 5, .9], [1, 2, 1.4], [1, 3, 1.4]];
export function ground(x: number, z: number) {
  if (z > 7 && z < 15) return Math.abs(x) < 1.3 ? 0 : -30;
  return Math.abs(x) < 4.6 && z > -5 && z < 65 ? 0 : -30;
}
export const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));
export const angleDelta = (target: number, current: number) => Math.atan2(Math.sin(target - current), Math.cos(target - current));
export function beacon(b: Body) { return b.stage < 4 ? { x: 3, z: 7 } : { x: -3, z: 49 }; }
export function scanError(b: Body) {
  const target = beacon(b), head = b.nodes[1];
  return angleDelta(Math.atan2(target.x - head.x, target.z - head.z), b.look);
}
export function sweepX(ticks: number) { return Math.sin(ticks * DT * 1.8) * 3.6; }
function integrate(n: Node, fx = 0, fy = 0, fz = 0) {
  const vx = (n.x - n.px) * .9, vy = (n.y - n.py) * .98, vz = (n.z - n.pz) * .9;
  n.px = n.x; n.py = n.y; n.pz = n.z;
  n.x += vx + fx * DT * DT; n.y += vy + (fy - 15) * DT * DT; n.z += vz + fz * DT * DT;
}
function recover(b: Body) {
  b.nodes = createBody(COURSE[b.stage]?.spawn ?? 0).nodes;
  if (!b.delivered) b.cube = createBody().cube;
  b.falls++; b.grip = -1; b.charge = 0; b.feet = [0, 0]; b.brace = false;
}
function advance(b: Body) { b.stage++; b.charge = 0; b.feet = [0, 0]; b.finished = b.stage === COURSE.length; }
export function step(b: Body, raw: Input[]) {
  if (b.version !== RULESET) throw new Error("Incompatible race snapshot; start a new match.");
  if (b.finished) return;
  const inputs = neutralInputs().map((_, i) => ({ x: Number.isFinite(raw[i]?.x) ? clamp(raw[i].x) : 0,
    z: Number.isFinite(raw[i]?.z) ? clamp(raw[i].z) : 0, action: raw[i]?.action === true }));
  if (b.nodes[0].y < -5 || (!b.delivered && b.cube.y < -8)) { recover(b); return; }
  b.ticks++;
  const n = b.nodes, torso = n[0], oldStage = b.stage;
  b.brace = inputs[ROLE.Torso].action;
  for (let i = 0; i < n.length; i++) {
    const r = NODE_ROLES[i], u = inputs[r], leg = i >= 4;
    const target = i === 0 ? 2 : i === 1 ? 3 : i < 4 ? 2 : .35;
    const support = ground(torso.x, torso.z) > -1;
    let fy = support ? (target - n[i].y) * 70 - (n[i].y - n[i].py) * 130 : 0;
    const onSwitch = b.stage === 3 && torso.z > 30;
    if (leg && !onSwitch && u.action && !b.previousActions[r] && n[i].y < .65 && ground(n[i].x, n[i].z) > -1) fy += 300;
    const armRest = i === 2 || i === 3 ? (torso.x + (i === 2 ? -1 : 1) - n[i].x) * 6 : 0;
    const fx = (r === ROLE.Eyes ? 0 : u.x * (leg ? 24 : i === 0 ? 22 : 10)) + armRest;
    const fz = r === ROLE.Eyes ? 0 : u.z * (leg ? 30 : i === 0 ? 8 : 6);
    integrate(n[i], fx, fy, fz);
  }
  b.look = angleDelta(b.look + inputs[ROLE.Eyes].x * .045, 0);
  if (torso.z > 7 && torso.z < 15) {
    const wind = Math.sin(b.ticks * DT * 2) * (b.brace ? .001 : .018);
    n[0].x += wind; n[1].x += wind;
  }
  if (torso.z > 39 && torso.z < 46 && Math.abs(torso.x - sweepX(b.ticks)) < .7) {
    for (const p of n) { p.x += (b.brace ? .015 : .12) * Math.cos(b.ticks * DT * 1.8); p.py -= b.brace ? .002 : .014; }
  }
  for (let pass = 0; pass < 7; pass++) {
    for (const [a, c, len] of LINKS) {
      const p = n[a], q = n[c], dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
      const d = Math.hypot(dx, dy, dz) || 1, k = ((d - len) / d) * .5;
      p.x += dx * k; p.y += dy * k; p.z += dz * k;
      q.x -= dx * k; q.y -= dy * k; q.z -= dz * k;
    }
    for (const p of n) { const floor = ground(p.x, p.z) + .25; if (p.y < floor) { p.y = floor; p.py = p.y; } }
  }
  const gate = COURSE[b.stage].gate;
  if (b.stage < 5 && torso.z > gate) { const dz = torso.z - gate; for (const p of n) { p.z -= dz; p.pz = p.z; } }
  if (!b.delivered) {
    integrate(b.cube);
    const floor = ground(b.cube.x, b.cube.z) + .45;
    if (b.cube.y < floor) { b.cube.y = floor; b.cube.py = floor; }
    if (!inputs[ROLE.Hands].action) b.grip = -1;
    if (b.grip < 0 && inputs[ROLE.Hands].action) {
      const candidates = [2, 3].map(i => ({ i, d: Math.hypot(n[i].x - b.cube.x, n[i].y - b.cube.y, n[i].z - b.cube.z) })).sort((a, c) => a.d - c.d || a.i - c.i);
      if (candidates[0].d < 2.6) b.grip = candidates[0].i;
    }
    if (b.grip >= 0) { const h = n[b.grip]; Object.assign(b.cube, node(h.x, h.y - .45, h.z + .7)); }
  }
  const nearGate = torso.z > gate - 1.8 && Math.abs(torso.x) < 2 && torso.y > .8;
  let charging = false;
  if (b.stage === 0 || b.stage === 4) {
    charging = nearGate && inputs[ROLE.Eyes].action && Math.abs(scanError(b)) < .18 && (b.stage === 0 || b.brace);
  } else if (b.stage === 1) {
    charging = nearGate && b.brace && Math.abs(torso.x) < .8 && Math.abs(n[1].x - torso.x) < .4;
  } else if (b.stage === 2) {
    charging = b.grip === -1 && !inputs[ROLE.Hands].action && b.cube.y < .65 && b.cube.z > 24 && b.cube.z < 27 && Math.abs(b.cube.x) < 2;
  } else if (b.stage === 3) {
    for (let foot = 0; foot < 2; foot++) {
      const p = n[foot + 4], expectedX = foot === 0 ? -.45 : .45;
      const pressed = nearGate && inputs[foot + ROLE.LeftLeg].action && Math.abs(p.x - expectedX) < .65 && Math.abs(p.z - 33) < 1.9 && p.y < .65;
      b.feet[foot] = pressed ? Math.min(1, b.feet[foot] + DT) : 0;
    }
    charging = b.feet.every(v => v >= 1);
  } else if (b.stage === 5 && nearGate && n.every(p => p.z >= gate)) { advance(b); }
  if (b.stage === oldStage && b.stage < 5) {
    b.charge = charging ? Math.min(1, b.charge + DT / (b.stage === 3 ? .2 : 1.2)) : Math.max(0, b.charge - DT * 2);
    if (b.charge >= 1) { if (b.stage === 2) { b.delivered = true; b.grip = -1; } advance(b); }
  }
  b.previousActions = inputs.map(u => u.action);
  if (!b.finished && (torso.y < -5 || (!b.delivered && b.cube.y < -8))) recover(b);
}
// Practice bots never reuse the human's input for another role.
export function teammateInputs(b: Body): Input[] {
  const u = neutralInputs(), torso = b.nodes[0];
  const steer = clamp(-torso.x * 1.5);
  let forward = 1;
  if (b.stage === 2 && (b.cube.z > 24.7 || (b.grip < 0 && torso.z > b.cube.z + .5))) forward = b.cube.z > 24.7 ? 0 : -.7;
  u[ROLE.LeftLeg] = { x: steer, z: forward, action: b.stage === 3 && torso.z > 30 };
  u[ROLE.RightLeg] = { ...u[ROLE.LeftLeg] };
  u[ROLE.Torso] = { x: clamp(-torso.x), z: 0, action: true };
  u[ROLE.Eyes] = { x: clamp(scanError(b) / .045), z: 0, action: true };
  u[ROLE.Hands] = { x: 0, z: 0, action: b.stage === 2 && b.cube.z < 24.7 };
  return u;
}
export function practiceInputs(b: Body, role: number, input: Input): Input[] {
  const result = teammateInputs(b); result[role] = { ...input }; return result;
}
export const elapsedMs = (b: Body) => Math.round(b.ticks * 1000 / 30) + b.falls * 3000;
export const formatTime = (ms: number) => `${Math.floor(ms / 60000).toString().padStart(2, "0")}:${((ms % 60000) / 1000).toFixed(2).padStart(5, "0")}`;
