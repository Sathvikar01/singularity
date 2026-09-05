export const DT = 1 / 30;
export const RULESET = 3;

export const CHALLENGE = { Easy: 0, Medium: 1, Difficult: 2 } as const;
export type ChallengeId = (typeof CHALLENGE)[keyof typeof CHALLENGE];
export type CrewSize = 3 | 5;
export const CREW_SIZES = [3, 5] as const;

export type StageKind =
  | "relay"
  | "bridge"
  | "delivery"
  | "switches"
  | "storm"
  | "finish"
  | "walk"
  | "duck"
  | "lift"
  | "movingCarry"
  | "narrowCarry"
  | "balance"
  | "climbLatch"
  | "climb"
  | "unstable"
  | "precisionLift"
  | "unstableCarry"
  | "placeFirst"
  | "secondLift"
  | "placeSecond"
  | "finalTiming";

export type Stage = {
  name: string;
  hint: string;
  gate: number;
  spawn: number;
  kind: StageKind;
};

export type Challenge = {
  id: ChallengeId;
  difficulty: "Easy" | "Medium" | "Difficult";
  name: string;
  environment: string;
  summary: string;
  accent: string;
  fallPenaltyMs: number;
  timingPenaltyMs: number;
  stages: readonly Stage[];
};

export const CHALLENGES: readonly Challenge[] = [
  {
    id: CHALLENGE.Easy,
    difficulty: "Easy",
    name: "Suspended Disbelief",
    environment: "Orbital training facility / Sector 07",
    summary: "Learn the body: relays, balance, one careful delivery, and a clean finish.",
    accent: "#91dfc5",
    fallPenaltyMs: 3000,
    timingPenaltyMs: 0,
    stages: [
      { name: "First contact", hint: "Both hands: touch the amber relay and hold grip together", gate: 5, spawn: 0, kind: "relay" },
      { name: "Hold the line", hint: "Torso: brace at the far end of the windy bridge", gate: 16, spawn: 6, kind: "bridge" },
      { name: "Special delivery", hint: "Both hands: carry the crate onto the mint pad, then release", gate: 26, spawn: 17, kind: "delivery" },
      { name: "Two to tango", hint: "Both feet: hold your switches at the same time", gate: 33, spawn: 28, kind: "switches" },
      { name: "Storm watch", hint: "Hands on both relays while Torso braces beyond the sweeper", gate: 47, spawn: 35, kind: "storm" },
      { name: "Home stretch", hint: "Keep your balance and bring the whole body through the finish", gate: 60, spawn: 49, kind: "finish" },
    ],
  },
  {
    id: CHALLENGE.Medium,
    difficulty: "Medium",
    name: "Freight Expectations",
    environment: "Cyclone cargo yard / Monsoon deck",
    summary: "A longer freight run through low gantries, moving sweepers, and a narrow carry lane.",
    accent: "#69d9ff",
    fallPenaltyMs: 5000,
    timingPenaltyMs: 0,
    stages: [
      { name: "Walking papers", hint: "Legs set the pace while Torso keeps the body centered", gate: 8, spawn: 0, kind: "walk" },
      { name: "Duckworks", hint: "Torso: hold bend and coordinate a low walk under the pipe rack", gate: 21, spawn: 9, kind: "duck" },
      { name: "Team lift", hint: "Bring both hands to the power cell and grip together", gate: 32, spawn: 22, kind: "lift" },
      { name: "Pendulum passage", hint: "Carry the cell past the moving sweepers without losing either hand", gate: 49, spawn: 33, kind: "movingCarry" },
      { name: "Thread the needle", hint: "Stay on the narrow zig-zag lane and keep the cell secure", gate: 65, spawn: 50, kind: "narrowCarry" },
      { name: "Soft landing", hint: "Lower the cell onto the blue dock and release both hands", gate: 78, spawn: 66, kind: "delivery" },
      { name: "Gimbal walk", hint: "Both feet push while Torso braces across the shifting deck", gate: 90, spawn: 79, kind: "balance" },
      { name: "Clock out", hint: "Bring every part of the body through the cargo gate", gate: 104, spawn: 92, kind: "finish" },
    ],
  },
  {
    id: CHALLENGE.Difficult,
    difficulty: "Difficult",
    name: "The Coordination Tax",
    environment: "Solar foundry / Rupture tower",
    summary: "Climb, cross unstable plates, seat two cores precisely, then commit on the launch beat.",
    accent: "#ff9b73",
    fallPenaltyMs: 8000,
    timingPenaltyMs: 7000,
    stages: [
      { name: "Wall handshake", hint: "Each hand takes one climbing latch; hold together to unlock the wall", gate: 8, spawn: 0, kind: "climbLatch" },
      { name: "Vertical argument", hint: "Legs climb the staggered blocks while both hands keep contact", gate: 20, spawn: 9, kind: "climb" },
      { name: "Loose orbit", hint: "Cross the unstable plates with both feet active and Torso braced", gate: 34, spawn: 22, kind: "unstable" },
      { name: "Zero margin", hint: "Center both hands precisely on the first reactor core", gate: 45, spawn: 35, kind: "precisionLift" },
      { name: "Shiver carry", hint: "Carry the core across the wandering plates without breaking grip", gate: 62, spawn: 46, kind: "unstableCarry" },
      { name: "Socket one", hint: "Place the first core in the left socket and release cleanly", gate: 72, spawn: 63, kind: "placeFirst" },
      { name: "Second payload", hint: "Coordinate another precise two-hand lift", gate: 82, spawn: 73, kind: "secondLift" },
      { name: "Twin lock", hint: "Carry the second core into the right socket and let go together", gate: 94, spawn: 83, kind: "placeSecond" },
      { name: "Launch window", hint: "Wait for ALIGN, then every pilot holds ACT on the same beat", gate: 108, spawn: 96, kind: "finalTiming" },
    ],
  },
] as const;

export const COURSE = CHALLENGES[CHALLENGE.Easy].stages;

export type RoleDefinition = {
  name: string;
  help: string;
  action: string;
  icon: string;
};

const THREE_PLAYER_ROLES: readonly RoleDefinition[] = [
  { name: "Arms", help: "WASD moves both arms · hold ACT to grip with both hands", action: "GRIP", icon: "↔" },
  { name: "Torso", help: "WASD shifts balance · hold ACT to brace or bend", action: "BRACE", icon: "▥" },
  { name: "Legs", help: "WASD drives both feet · ACT hops or holds both switches", action: "STEP", icon: "⌁" },
];

const FIVE_PLAYER_ROLES: readonly RoleDefinition[] = [
  { name: "Left Hand", help: "WASD moves the left hand · hold ACT to grip", action: "L GRIP", icon: "L↔" },
  { name: "Right Hand", help: "WASD moves the right hand · hold ACT to grip", action: "R GRIP", icon: "↔R" },
  { name: "Torso", help: "WASD shifts balance · hold ACT to brace or bend", action: "BRACE", icon: "▥" },
  { name: "Left Leg", help: "WASD drives the left foot · ACT hops or holds its switch", action: "L STEP", icon: "L⌁" },
  { name: "Right Leg", help: "WASD drives the right foot · ACT hops or holds its switch", action: "R STEP", icon: "⌁R" },
];

export function isChallenge(value: number): value is ChallengeId {
  return Number.isInteger(value) && value >= CHALLENGE.Easy && value <= CHALLENGE.Difficult;
}

export function isCrewSize(value: number): value is CrewSize {
  return value === 3 || value === 5;
}

export function challengeFor(value: number): Challenge {
  return CHALLENGES[isChallenge(value) ? value : CHALLENGE.Easy];
}

export function rolesFor(value: number): readonly RoleDefinition[] {
  return value === 3 ? THREE_PLAYER_ROLES : FIVE_PLAYER_ROLES;
}

export type Input = { x: number; z: number; action: boolean };
export type Node = { x: number; y: number; z: number; px: number; py: number; pz: number };
export type Body = {
  version: number;
  challenge: ChallengeId;
  crewSize: CrewSize;
  nodes: Node[];
  objects: Node[];
  placed: boolean[];
  handGrip: number[];
  stage: number;
  falls: number;
  mistakes: number;
  penaltyMs: number;
  ticks: number;
  finished: boolean;
  look: number;
  charge: number;
  feet: number[];
  brace: boolean;
  bend: boolean;
  previousActions: boolean[];
  lockout: number;
  syncStarted: boolean;
};

type CanonicalInputs = {
  hands: [Input, Input];
  torso: Input;
  legs: [Input, Input];
};

export const neutralInput = (): Input => ({ x: 0, z: 0, action: false });
export const neutralInputs = (crewSize: number = 5): Input[] => rolesFor(crewSize).map(neutralInput);
const node = (x: number, y: number, z: number): Node => ({ x, y, z, px: x, py: y, pz: z });

const OBJECT_SPAWNS: Record<ChallengeId, readonly [number, number, number][]> = {
  [CHALLENGE.Easy]: [[0, 0.45, 19]],
  [CHALLENGE.Medium]: [[0, 0.45, 25]],
  [CHALLENGE.Difficult]: [[0, 0.65, 39], [0, 0.65, 76]],
};

const OBJECT_DOCKS: Record<ChallengeId, readonly [number, number, number][]> = {
  [CHALLENGE.Easy]: [[0, 0.45, 25.7]],
  [CHALLENGE.Medium]: [[0, 0.45, 76.2]],
  [CHALLENGE.Difficult]: [[-1.55, 0.65, 70.5], [1.55, 0.65, 92.2]],
};

export function createBody(challenge: number = CHALLENGE.Easy, crewSize: number = 5, z?: number): Body {
  const challengeId = isChallenge(challenge) ? challenge : CHALLENGE.Easy;
  const size = isCrewSize(crewSize) ? crewSize : 5;
  const start = z ?? challengeFor(challengeId).stages[0].spawn;
  return {
    version: RULESET,
    challenge: challengeId,
    crewSize: size,
    nodes: [node(0, 2, start), node(0, 3, start), node(-1, 2, start), node(1, 2, start), node(-0.45, 0.35, start), node(0.45, 0.35, start)],
    objects: OBJECT_SPAWNS[challengeId].map(([x, y, objectZ]) => node(x, y, objectZ)),
    placed: OBJECT_SPAWNS[challengeId].map(() => false),
    handGrip: [-1, -1],
    stage: 0,
    falls: 0,
    mistakes: 0,
    penaltyMs: 0,
    ticks: 0,
    finished: false,
    look: 0,
    charge: 0,
    feet: [0, 0],
    brace: false,
    bend: false,
    previousActions: neutralInputs(size).map(() => false),
    lockout: 0,
    syncStarted: false,
  };
}

export const LINKS = [
  [0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1.7], [0, 5, 1.7],
  [4, 5, 0.9], [1, 2, 1.4], [1, 3, 1.4],
] as const;

export const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));
export const angleDelta = (target: number, current: number) => Math.atan2(Math.sin(target - current), Math.cos(target - current));

export function platformCenter(challenge: number, z: number, ticks: number) {
  if (challenge === CHALLENGE.Medium && z > 80 && z < 91) return Math.sin(ticks * DT * 0.9) * 1.15;
  if (challenge === CHALLENGE.Difficult && z > 21 && z < 35) return Math.sin(ticks * DT * 0.75 + Math.floor((z - 21) / 4) * 1.7) * 1.35;
  if (challenge === CHALLENGE.Difficult && z > 46 && z < 63) return Math.sin(ticks * DT * 1.05 + Math.floor((z - 46) / 4) * 1.4) * 1.1;
  return 0;
}

export function hazardX(challenge: number, index: number, ticks: number) {
  const speeds = challenge === CHALLENGE.Medium ? [1.45, 1.9] : challenge === CHALLENGE.Difficult ? [1.7, 2.15] : [1.8];
  const amplitudes = challenge === CHALLENGE.Difficult ? [3.8, 3.2] : [3.6, 3.15];
  return Math.sin(ticks * DT * speeds[index % speeds.length] + index * 1.3) * amplitudes[index % amplitudes.length];
}

export function finalAlignment(ticks: number) {
  return Math.cos(ticks * DT * 1.35);
}

export function groundAt(challenge: number, x: number, z: number, ticks = 0) {
  if (!isChallenge(challenge)) return -30;
  if (challenge === CHALLENGE.Easy) {
    if (z > 7 && z < 15) return Math.abs(x) < 1.3 ? 0 : -30;
    return Math.abs(x) < 4.6 && z > -5 && z < 65 ? 0 : -30;
  }
  if (challenge === CHALLENGE.Medium) {
    if (z > 34 && z < 49) return Math.abs(x) < 2.15 ? 0 : -30;
    if (z >= 50 && z < 66) {
      const center = Math.sin(z * 0.72) * 0.72;
      return Math.abs(x - center) < 1.18 ? 0 : -30;
    }
    if (z > 80 && z < 91) return Math.abs(x - platformCenter(challenge, z, ticks)) < 1.7 ? 0 : -30;
    return Math.abs(x) < 4.8 && z > -5 && z < 109 ? 0 : -30;
  }
  if (z > 9 && z <= 21) {
    const step = Math.min(4, Math.max(0, Math.floor((z - 9) / 3)));
    return Math.abs(x) < 2.2 ? step * 0.48 : -30;
  }
  if ((z > 21 && z < 35) || (z > 46 && z < 63)) return Math.abs(x - platformCenter(challenge, z, ticks)) < 1.55 ? (z < 35 ? 1.92 : 0.35) : -30;
  if (z > 35 && z <= 46) return Math.abs(x) < 2.45 ? 0.35 : -30;
  return Math.abs(x) < 4.8 && z > -5 && z < 113 ? 0 : -30;
}

function sanitizeInputs(body: Body, raw: Input[]) {
  return neutralInputs(body.crewSize).map((_, i) => ({
    x: Number.isFinite(raw[i]?.x) ? clamp(raw[i].x) : 0,
    z: Number.isFinite(raw[i]?.z) ? clamp(raw[i].z) : 0,
    action: raw[i]?.action === true,
  }));
}

function expandCrewInputs(body: Body, raw: Input[]): CanonicalInputs {
  const inputs = sanitizeInputs(body, raw);
  if (body.crewSize === 3) return { hands: [{ ...inputs[0] }, { ...inputs[0] }], torso: { ...inputs[1] }, legs: [{ ...inputs[2] }, { ...inputs[2] }] };
  return { hands: [{ ...inputs[0] }, { ...inputs[1] }], torso: { ...inputs[2] }, legs: [{ ...inputs[3] }, { ...inputs[4] }] };
}

function integrate(n: Node, fx = 0, fy = 0, fz = 0) {
  const vx = (n.x - n.px) * 0.9, vy = (n.y - n.py) * 0.98, vz = (n.z - n.pz) * 0.9;
  n.px = n.x; n.py = n.y; n.pz = n.z;
  n.x += vx + fx * DT * DT; n.y += vy + (fy - 15) * DT * DT; n.z += vz + fz * DT * DT;
}

function pin(n: Node, x: number, y: number, z: number, smoothing = 1) {
  const nx = n.x + (x - n.x) * smoothing, ny = n.y + (y - n.y) * smoothing, nz = n.z + (z - n.z) * smoothing;
  n.px += nx - n.x; n.py += ny - n.y; n.pz += nz - n.z;
  n.x = nx; n.y = ny; n.z = nz;
}

function activeObjectIndex(body: Body) {
  const kind = challengeFor(body.challenge).stages[body.stage]?.kind;
  if (body.challenge !== CHALLENGE.Difficult) return 0;
  return kind === "secondLift" || kind === "placeSecond" || body.stage > 7 ? 1 : 0;
}

export function securelyHeld(body: Body, objectIndex = activeObjectIndex(body)) {
  return body.handGrip[0] === objectIndex && body.handGrip[1] === objectIndex;
}

function resetObjectAtCheckpoint(body: Body, objectIndex: number) {
  if (body.placed[objectIndex]) return;
  const stage = challengeFor(body.challenge).stages[body.stage];
  const carrying = ["movingCarry", "narrowCarry", "unstableCarry"].includes(stage?.kind ?? "");
  const spawn = OBJECT_SPAWNS[body.challenge][objectIndex];
  const x = carrying ? 0 : spawn[0];
  const y = carrying ? groundAt(body.challenge, x, stage.spawn + 1.8, body.ticks) + 0.6 : spawn[1];
  const z = carrying ? stage.spawn + 1.8 : spawn[2];
  body.objects[objectIndex] = node(x, y, z);
}

function recover(body: Body) {
  const stage = challengeFor(body.challenge).stages[body.stage];
  body.nodes = createBody(body.challenge, body.crewSize, stage?.spawn ?? 0).nodes;
  body.falls++;
  body.penaltyMs += challengeFor(body.challenge).fallPenaltyMs;
  body.handGrip = [-1, -1]; body.charge = 0; body.feet = [0, 0]; body.brace = false; body.bend = false; body.lockout = 12;
  body.syncStarted = false;
  body.objects.forEach((_, index) => resetObjectAtCheckpoint(body, index));
}

function advance(body: Body) {
  body.stage++;
  body.charge = 0;
  body.feet = [0, 0];
  body.syncStarted = false;
  body.finished = body.stage === challengeFor(body.challenge).stages.length;
}

function applyGate(body: Body, gate: number) {
  const torso = body.nodes[0];
  if (torso.z <= gate) return;
  const dz = torso.z - gate;
  for (const point of body.nodes) { point.z -= dz; point.pz = point.z; }
}

function relayReady(body: Body, z: number, actions: [boolean, boolean]) {
  return [0, 1].every(side => {
    const hand = body.nodes[side + 2];
    const x = side === 0 ? -0.9 : 0.9;
    return actions[side] && Math.hypot(hand.x - x, hand.z - z) < 1.45;
  });
}

function allPilotActions(body: Body, inputs: Input[]) {
  return inputs.length === body.crewSize && inputs.every(input => input.action);
}

function updateObjects(body: Body, controls: CanonicalInputs) {
  const hands = [body.nodes[2], body.nodes[3]];
  for (let side = 0; side < 2; side++) {
    if (!controls.hands[side].action) body.handGrip[side] = -1;
    const held = body.handGrip[side];
    if (held >= 0 && body.placed[held]) body.handGrip[side] = -1;
    if (body.handGrip[side] < 0 && controls.hands[side].action) {
      const candidate = body.objects
        .map((object, index) => ({ index, distance: body.placed[index] ? Infinity : Math.hypot(hands[side].x - object.x, hands[side].y - object.y, hands[side].z - object.z) }))
        .sort((a, b) => a.distance - b.distance || a.index - b.index)[0];
      if (candidate && candidate.distance < 1.65) body.handGrip[side] = candidate.index;
    }
  }
  if (controls.hands.every(input => input.action)) {
    const midpoint = {
      x: (hands[0].x + hands[1].x) / 2,
      y: (hands[0].y + hands[1].y) / 2,
      z: (hands[0].z + hands[1].z) / 2,
    };
    const shared = body.objects
      .map((object, index) => ({ index, distance: body.placed[index] ? Infinity : Math.hypot(midpoint.x - object.x, midpoint.y - object.y, midpoint.z - object.z) }))
      .sort((a, b) => a.distance - b.distance || a.index - b.index)[0];
    if (shared && shared.distance < 1.9) body.handGrip = [shared.index, shared.index];
  }
  for (let index = 0; index < body.objects.length; index++) {
    const object = body.objects[index];
    if (body.placed[index]) {
      const dock = OBJECT_DOCKS[body.challenge][index];
      pin(object, dock[0], dock[1], dock[2]);
      continue;
    }
    const gripping = [0, 1].filter(side => body.handGrip[side] === index);
    if (gripping.length === 2) {
      const left = hands[0], right = hands[1];
      pin(object, (left.x + right.x) / 2, Math.min(left.y, right.y) - 0.36, (left.z + right.z) / 2 + 0.5, 0.82);
    } else if (gripping.length === 1) {
      integrate(object);
      const hand = hands[gripping[0]];
      pin(object, hand.x, hand.y - 0.48, hand.z + 0.42, 0.22);
    } else integrate(object);
    const floor = groundAt(body.challenge, object.x, object.z, body.ticks) + 0.45;
    if (object.y < floor && floor > -20) { object.y = floor; object.py = floor; }
  }
}

function applyHazards(body: Body) {
  const torso = body.nodes[0];
  const hits: [number, number][] = body.challenge === CHALLENGE.Easy
    ? [[42.5, hazardX(body.challenge, 0, body.ticks)]]
    : body.challenge === CHALLENGE.Medium
      ? [[41, hazardX(body.challenge, 0, body.ticks)], [58, hazardX(body.challenge, 1, body.ticks)]]
      : [[29, hazardX(body.challenge, 0, body.ticks)], [54, hazardX(body.challenge, 1, body.ticks)]];
  for (const [z, x] of hits) {
    if (Math.abs(torso.z - z) > 1.65 || Math.abs(torso.x - x) > 0.78) continue;
    const direction = Math.sign(torso.x - x) || Math.sign(Math.cos(body.ticks * DT)) || 1;
    const force = body.brace ? 0.02 : 0.14;
    for (const point of body.nodes) { point.x += direction * force; point.py -= body.brace ? 0.002 : 0.016; }
    if (!body.brace && body.handGrip.some(grip => grip >= 0)) body.handGrip = [-1, -1];
  }
}

function stageProgress(body: Body, crewInputs: Input[], controls: CanonicalInputs) {
  const course = challengeFor(body.challenge);
  const stage = course.stages[body.stage];
  if (!stage) return;
  const torso = body.nodes[0];
  const nearGate = torso.z > stage.gate - 2 && Math.abs(torso.x - platformCenter(body.challenge, torso.z, body.ticks)) < 2.2 && torso.y > -1;
  const handActions: [boolean, boolean] = [controls.hands[0].action, controls.hands[1].action];
  const legActions: [boolean, boolean] = [controls.legs[0].action, controls.legs[1].action];
  let charging = false, chargeSeconds = 0.8;
  switch (stage.kind) {
    case "relay": charging = relayReady(body, stage.gate, handActions); break;
    case "bridge": charging = nearGate && body.brace && Math.abs(torso.x) < 0.85; break;
    case "delivery": {
      const objectIndex = activeObjectIndex(body), dock = OBJECT_DOCKS[body.challenge][objectIndex], object = body.objects[objectIndex];
      const released = body.handGrip.every(grip => grip !== objectIndex);
      charging = released && Math.hypot(object.x - dock[0], object.z - dock[2]) < (body.challenge === CHALLENGE.Easy ? 1.8 : 1.15) && object.y < dock[1] + 0.5;
      if (charging && body.charge + DT / chargeSeconds >= 1) body.placed[objectIndex] = true;
      break;
    }
    case "switches":
      for (let foot = 0; foot < 2; foot++) {
        const point = body.nodes[foot + 4], expectedX = foot === 0 ? -0.45 : 0.45;
        const pressed = nearGate && legActions[foot] && Math.abs(point.x - expectedX) < 0.75 && Math.abs(point.z - stage.gate) < 2.1;
        body.feet[foot] = pressed ? Math.min(1, body.feet[foot] + DT) : 0;
      }
      charging = body.feet.every(value => value >= 0.75); chargeSeconds = 0.2; break;
    case "storm": charging = nearGate && body.brace && relayReady(body, stage.gate, handActions); break;
    case "walk": charging = nearGate && body.nodes.every(point => point.z > stage.gate - 2.7); chargeSeconds = 0.25; break;
    case "duck": charging = nearGate && body.bend && body.nodes[1].y < groundAt(body.challenge, torso.x, torso.z, body.ticks) + 2.72; break;
    case "lift": charging = nearGate && securelyHeld(body, 0); break;
    case "movingCarry":
    case "narrowCarry": charging = nearGate && securelyHeld(body, 0); chargeSeconds = 0.45; break;
    case "balance": charging = nearGate && body.brace && legActions.every(Boolean); break;
    case "climbLatch": charging = relayReady(body, stage.gate, handActions); break;
    case "climb": charging = nearGate && handActions.every(Boolean) && legActions.every(Boolean) && torso.y > 3.1; break;
    case "unstable": charging = nearGate && body.brace && legActions.every(Boolean); break;
    case "precisionLift": charging = nearGate && securelyHeld(body, 0) && Math.abs(body.objects[0].x) < 0.88; chargeSeconds = 1; break;
    case "unstableCarry": charging = nearGate && securelyHeld(body, 0) && body.brace; break;
    case "placeFirst":
    case "placeSecond": {
      const objectIndex = stage.kind === "placeFirst" ? 0 : 1, dock = OBJECT_DOCKS[body.challenge][objectIndex], object = body.objects[objectIndex];
      charging = body.handGrip.every(grip => grip !== objectIndex) && Math.hypot(object.x - dock[0], object.z - dock[2]) < 0.82 && Math.abs(object.y - dock[1]) < 0.65;
      chargeSeconds = 1.1;
      if (charging && body.charge + DT / chargeSeconds >= 1) body.placed[objectIndex] = true;
      break;
    }
    case "secondLift": charging = nearGate && securelyHeld(body, 1) && Math.abs(body.objects[1].x) < 0.88; break;
    case "finalTiming": {
      const everybody = allPilotActions(body, crewInputs), aligned = Math.abs(finalAlignment(body.ticks)) > 0.94;
      const previouslyTogether = body.previousActions.length === body.crewSize && body.previousActions.every(Boolean);
      if (!everybody || !aligned) body.syncStarted = false;
      if (nearGate && everybody && !previouslyTogether && !aligned && body.lockout <= 0) {
        body.mistakes++; body.penaltyMs += course.timingPenaltyMs; body.lockout = 30; body.charge = 0;
      }
      if (nearGate && everybody && !previouslyTogether && aligned && body.lockout <= 0) body.syncStarted = true;
      charging = nearGate && everybody && aligned && body.syncStarted && body.lockout <= 0; chargeSeconds = 0.3; break;
    }
    case "finish":
      if (nearGate && body.nodes.every(point => point.z >= stage.gate - 0.75)) advance(body);
      return;
  }
  if (charging) body.charge = Math.min(1, body.charge + DT / chargeSeconds);
  else body.charge = Math.max(0, body.charge - DT * (stage.kind === "finalTiming" ? 3.5 : 1.8));
  if (body.charge >= 1) advance(body);
}

export function step(body: Body, raw: Input[]) {
  if (body.version !== RULESET) throw new Error("Incompatible race snapshot; start a new match.");
  if (body.finished) return;
  const stage = challengeFor(body.challenge).stages[body.stage];
  const crewInputs = sanitizeInputs(body, raw), controls = expandCrewInputs(body, crewInputs);
  if (body.nodes[0].y < -5 || body.objects.some((object, index) => !body.placed[index] && object.y < -8)) { recover(body); return; }
  body.ticks++; body.lockout = Math.max(0, body.lockout - 1); body.brace = controls.torso.action; body.bend = stage.kind === "duck" && controls.torso.action;
  const torso = body.nodes[0];
  const canonical = [controls.torso, neutralInput(), controls.hands[0], controls.hands[1], controls.legs[0], controls.legs[1]];
  for (let index = 0; index < body.nodes.length; index++) {
    const point = body.nodes[index], input = canonical[index], isHand = index === 2 || index === 3, isLeg = index >= 4;
    const surface = groundAt(body.challenge, point.x, point.z, body.ticks);
    const baseHeight = body.bend ? index === 0 ? 1.35 : index === 1 ? 2.15 : isHand ? 1.45 : 0.35 : index === 0 ? 2 : index === 1 ? 3 : isHand ? 2 : 0.35;
    const target = surface > -10 ? surface + baseHeight : point.y, support = surface > -10;
    let fy = support ? (target - point.y) * 70 - (point.y - point.py) * 130 : 0;
    const previousIndex = body.crewSize === 3 ? isLeg ? 2 : index === 0 ? 1 : 0 : index === 0 ? 2 : isHand ? index - 2 : index - 1;
    if (isLeg && stage.kind !== "switches" && input.action && !body.previousActions[previousIndex] && point.y < surface + 0.68 && support) fy += 300;
    const armRest = isHand ? (torso.x + (index === 2 ? -1 : 1) - point.x) * 6 : 0;
    const fx = (index === 1 ? 0 : input.x * (isLeg ? 24 : index === 0 ? 22 : 13)) + armRest;
    const fz = index === 1 ? 0 : input.z * (isLeg ? 30 : index === 0 ? 8 : 9);
    integrate(point, fx, fy, fz);
  }
  const travelX = clamp(controls.torso.x * 0.45 + controls.legs[0].x * 0.2 + controls.legs[1].x * 0.2);
  body.look = angleDelta(Math.atan2(travelX, 1), body.look) * 0.08 + body.look;
  if (body.challenge === CHALLENGE.Easy && torso.z > 7 && torso.z < 15) {
    const wind = Math.sin(body.ticks * DT * 2) * (body.brace ? 0.001 : 0.018);
    body.nodes[0].x += wind; body.nodes[1].x += wind;
  }
  applyHazards(body);
  for (let pass = 0; pass < 7; pass++) {
    for (const [a, c, length] of LINKS) {
      const p = body.nodes[a], q = body.nodes[c], dx = q.x - p.x, dy = q.y - p.y, dz = q.z - p.z;
      const distance = Math.hypot(dx, dy, dz) || 1, correction = ((distance - length) / distance) * 0.5;
      p.x += dx * correction; p.y += dy * correction; p.z += dz * correction;
      q.x -= dx * correction; q.y -= dy * correction; q.z -= dz * correction;
    }
    for (const point of body.nodes) {
      const floor = groundAt(body.challenge, point.x, point.z, body.ticks) + 0.25;
      if (floor > -20 && point.y < floor) { point.y = floor; point.py = floor; }
    }
  }
  updateObjects(body, controls);
  const oldStage = body.stage;
  stageProgress(body, crewInputs, controls);
  if (body.stage === oldStage) applyGate(body, stage.gate);
  body.previousActions = crewInputs.map(input => input.action);
  if (!body.finished && (body.nodes[0].y < -5 || body.objects.some((object, index) => !body.placed[index] && object.y < -8))) recover(body);
}

function targetForStage(body: Body) {
  const stage = challengeFor(body.challenge).stages[body.stage], objectIndex = activeObjectIndex(body), object = body.objects[objectIndex], dock = OBJECT_DOCKS[body.challenge][objectIndex];
  const placing = ["delivery", "placeFirst", "placeSecond"].includes(stage.kind);
  const objectAtDock = Math.hypot(object.x - dock[0], object.z - dock[2]) < 1.1;
  const needsObject = ["lift", "precisionLift", "secondLift"].includes(stage.kind) || (placing && !objectAtDock && !securelyHeld(body, objectIndex));
  const targetZ = needsObject ? object.z : placing && securelyHeld(body, objectIndex) ? dock[2] : stage.gate;
  const targetX = placing && securelyHeld(body, objectIndex) ? dock[0] : platformCenter(body.challenge, body.nodes[0].z + 2.5, body.ticks);
  return { stage, objectIndex, object, dock, targetX, targetZ };
}

export function teammateInputs(body: Body): Input[] {
  const { stage, objectIndex, object, dock, targetX, targetZ } = targetForStage(body), torso = body.nodes[0];
  const nearGate = torso.z > stage.gate - 2.3, secure = securelyHeld(body, objectIndex);
  const objectAtDock = Math.hypot(object.x - dock[0], object.z - dock[2]) < 1.1;
  const liftStage = ["lift", "precisionLift", "secondLift"].includes(stage.kind);
  const placing = ["delivery", "placeFirst", "placeSecond"].includes(stage.kind);
  const acquiring = !secure && (liftStage || (placing && !objectAtDock));
  const carrying = secure && (placing || liftStage || ["movingCarry", "narrowCarry", "unstableCarry"].includes(stage.kind));
  const readyToRelease = placing && secure && Math.hypot(object.x - dock[0], object.z - dock[2]) < 0.7;
  const desiredZ = acquiring ? object.z - 0.25 : carrying && placing ? dock[2] - 0.65 : targetZ;
  const desiredX = acquiring ? object.x : carrying && placing ? dock[0] : targetX;
  const steer = clamp((desiredX - torso.x) * 1.25);
  let forward = clamp((desiredZ - torso.z) * 0.8, -0.65, 1);
  if (nearGate && !["finish", "walk"].includes(stage.kind)) forward = Math.min(forward, 0.28);
  const torsoAction = ["bridge", "duck", "storm", "balance", "unstable", "unstableCarry"].includes(stage.kind);
  const handInputs = [0, 1].map(side => {
    const hand = body.nodes[side + 2];
    let x = clamp((desiredX + (side === 0 ? -0.3 : 0.3) - hand.x) * 1.2), z = clamp((desiredZ - hand.z) * 1.1), action = false;
    if (["relay", "storm", "climbLatch"].includes(stage.kind)) {
      const relayX = side === 0 ? -0.9 : 0.9;
      x = clamp((relayX - hand.x) * 1.4); z = clamp((stage.gate - hand.z) * 1.2); action = true;
    } else if (stage.kind === "climb") {
      x = clamp(((side === 0 ? -0.7 : 0.7) - hand.x) * 1.1); z = forward; action = true;
    } else if ((acquiring || carrying || ["movingCarry", "narrowCarry", "unstableCarry"].includes(stage.kind)) && !readyToRelease) action = true;
    else if (placing && !secure) {
      action = false; x = clamp((dock[0] + (side === 0 ? -0.3 : 0.3) - hand.x) * 1.1); z = clamp((dock[2] - hand.z) * 1.1);
    }
    return { x, z, action };
  }) as [Input, Input];
  const finalReady = stage.kind === "finalTiming" && nearGate && Math.abs(finalAlignment(body.ticks)) > 0.965;
  if (stage.kind === "finalTiming") handInputs.forEach(input => { input.action = finalReady; });
  const legAction = ["switches", "balance", "climb", "unstable"].includes(stage.kind) || finalReady;
  const legs: [Input, Input] = [{ x: steer, z: forward, action: legAction }, { x: steer, z: forward, action: legAction }];
  const torsoInput: Input = { x: steer, z: forward * 0.2, action: torsoAction || finalReady };
  if (body.crewSize === 3) return [{ x: (handInputs[0].x + handInputs[1].x) / 2, z: (handInputs[0].z + handInputs[1].z) / 2, action: handInputs[0].action && handInputs[1].action }, torsoInput, { x: steer, z: forward, action: legAction }];
  return [handInputs[0], handInputs[1], torsoInput, legs[0], legs[1]];
}

export function practiceInputs(body: Body, role: number, input: Input): Input[] {
  const result = teammateInputs(body);
  if (role >= 0 && role < result.length) result[role] = { ...input };
  return result;
}

export function stageProgressValue(body: Body) {
  const stage = challengeFor(body.challenge).stages[body.stage];
  return stage?.kind === "switches" ? Math.min(...body.feet) : body.charge;
}

export function elapsedMs(body: Body) {
  return Math.round(body.ticks * 1000 / 30) + body.penaltyMs;
}

export function formatTime(ms: number) {
  const minutes = Math.floor(ms / 60000).toString().padStart(2, "0");
  const seconds = ((ms % 60000) / 1000).toFixed(3).padStart(6, "0");
  return `${minutes}:${seconds}`;
}
