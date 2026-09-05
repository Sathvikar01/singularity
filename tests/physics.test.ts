import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  CHALLENGE,
  CHALLENGES,
  CREW_SIZES,
  LINKS,
  RULESET,
  challengeFor,
  createBody,
  elapsedMs,
  finalAlignment,
  formatTime,
  isChallenge,
  isCrewSize,
  neutralInputs,
  practiceInputs,
  rolesFor,
  securelyHeld,
  stageProgressValue,
  step,
  teammateInputs,
} from "../shared/physics.ts";

const MAX_RUN_TICKS = 12_000;

function assertFiniteAndJointBounded(body: ReturnType<typeof createBody>) {
  for (const point of [...body.nodes, ...body.objects]) {
    assert.ok(
      Object.values(point).every(Number.isFinite),
      `non-finite point at stage ${body.stage}: ${JSON.stringify(point)}`,
    );
  }
  for (const [from, to, rest] of LINKS) {
    const a = body.nodes[from], b = body.nodes[to];
    const error = Math.abs(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) - rest);
    assert.ok(error < 0.3, `joint ${from}-${to} exceeded its bound by ${error}`);
  }
}

function runCoordinated(challenge: number, crewSize: number, ticks = MAX_RUN_TICKS) {
  const body = createBody(challenge, crewSize);
  for (let tick = 0; tick < ticks && !body.finished; tick++) {
    step(body, teammateInputs(body));
    assertFiniteAndJointBounded(body);
  }
  return body;
}

function placeAtStageGate(body: ReturnType<typeof createBody>, stageIndex: number) {
  body.stage = stageIndex;
  const stage = challengeFor(body.challenge).stages[stageIndex];
  const dz = stage.gate - 1 - body.nodes[0].z;
  for (const point of body.nodes) {
    point.z += dz;
    point.pz += dz;
  }
}

function runRepresentativeObjective(crewSize: number, stageIndex: number, missingRole = -1) {
  const body = createBody(CHALLENGE.Easy, crewSize);
  placeAtStageGate(body, stageIndex);
  for (let tick = 0; tick < 75 && body.stage === stageIndex; tick++) {
    const inputs = teammateInputs(body);
    if (missingRole >= 0) inputs[missingRole] = neutralInputs(crewSize)[missingRole];
    step(body, inputs);
  }
  return body;
}

function putFirstObjectBetweenHands(body: ReturnType<typeof createBody>) {
  Object.assign(body.objects[0], { x: 0, y: 2, z: 0, px: 0, py: 2, pz: 0 });
}

test("challenge catalog preserves Easy and adds distinct, progressive courses", () => {
  assert.deepEqual(CREW_SIZES, [3, 5]);
  assert.deepEqual(CHALLENGES.map(challenge => challenge.id), [CHALLENGE.Easy, CHALLENGE.Medium, CHALLENGE.Difficult]);
  assert.deepEqual(CHALLENGES.map(challenge => challenge.difficulty), ["Easy", "Medium", "Difficult"]);
  assert.deepEqual(CHALLENGES.map(challenge => challenge.stages.length), [6, 8, 9]);
  assert.deepEqual(CHALLENGES.map(challenge => challenge.fallPenaltyMs), [3_000, 5_000, 8_000]);
  assert.deepEqual(CHALLENGES.map(challenge => challenge.timingPenaltyMs), [0, 0, 7_000]);

  assert.equal(new Set(CHALLENGES.map(challenge => challenge.name)).size, 3);
  assert.equal(new Set(CHALLENGES.map(challenge => challenge.environment)).size, 3);
  assert.equal(new Set(CHALLENGES.map(challenge => challenge.accent)).size, 3);
  assert.ok(CHALLENGES.every(challenge => challenge.summary.length > 20));
  assert.ok(CHALLENGES[0].stages.length < CHALLENGES[1].stages.length);
  assert.ok(CHALLENGES[1].stages.length < CHALLENGES[2].stages.length);
  assert.ok(CHALLENGES[0].stages.at(-1)!.gate < CHALLENGES[1].stages.at(-1)!.gate);
  assert.ok(CHALLENGES[1].stages.at(-1)!.gate < CHALLENGES[2].stages.at(-1)!.gate);

  assert.deepEqual(
    CHALLENGES[CHALLENGE.Easy].stages.map(stage => stage.kind),
    ["relay", "bridge", "delivery", "switches", "storm", "finish"],
  );
  assert.deepEqual(
    CHALLENGES[CHALLENGE.Medium].stages.map(stage => stage.kind),
    ["walk", "duck", "lift", "movingCarry", "narrowCarry", "delivery", "balance", "finish"],
  );
  assert.deepEqual(
    CHALLENGES[CHALLENGE.Difficult].stages.map(stage => stage.kind),
    ["climbLatch", "climb", "unstable", "precisionLift", "unstableCarry", "placeFirst", "secondLift", "placeSecond", "finalTiming"],
  );
  assert.deepEqual(CHALLENGES.map(challenge => createBody(challenge.id, 5).objects.length), [1, 1, 2]);
});

test("challenge and crew validators reject invalid snapshot selectors", () => {
  for (const challenge of CHALLENGES) assert.equal(isChallenge(challenge.id), true);
  for (const invalid of [-1, 3, 1.5, NaN, Infinity]) assert.equal(isChallenge(invalid), false);
  assert.equal(isCrewSize(3), true);
  assert.equal(isCrewSize(5), true);
  for (const invalid of [-1, 0, 4, 6, NaN]) assert.equal(isCrewSize(invalid), false);
  assert.equal(challengeFor(999), CHALLENGES[CHALLENGE.Easy]);
  assert.equal(createBody(999, 4).challenge, CHALLENGE.Easy);
  assert.equal(createBody(999, 4).crewSize, 5);
});

test("three- and five-player role definitions have the requested order and controls", () => {
  assert.deepEqual(rolesFor(3).map(role => role.name), ["Arms", "Torso", "Legs"]);
  assert.deepEqual(rolesFor(5).map(role => role.name), ["Left Hand", "Right Hand", "Torso", "Left Leg", "Right Leg"]);
  assert.deepEqual(rolesFor(3).map(role => role.action), ["GRIP", "BRACE", "STEP"]);
  assert.deepEqual(rolesFor(5).map(role => role.action), ["L GRIP", "R GRIP", "BRACE", "L STEP", "R STEP"]);
  for (const crewSize of CREW_SIZES) {
    const roles = rolesFor(crewSize);
    assert.equal(roles.length, crewSize);
    assert.ok(roles.every(role => role.help.length > 10 && role.icon.length > 0));
    assert.equal(neutralInputs(crewSize).length, crewSize);
    assert.equal(createBody(CHALLENGE.Easy, crewSize).previousActions.length, crewSize);
    assert.equal(createBody(CHALLENGE.Easy, crewSize).nodes.length, 6);
  }
});

for (const crewSize of CREW_SIZES) {
  for (let role = 0; role < rolesFor(crewSize).length; role++) {
    const roleName = rolesFor(crewSize)[role].name;
    test(`${crewSize}p practice controls only the selected ${roleName} role`, () => {
      const body = createBody(CHALLENGE.Medium, crewSize);
      const bots = teammateInputs(body);
      const human = { x: -0.8, z: -0.4, action: false };
      const inputs = practiceInputs(body, role, human);
      inputs.forEach((input, index) => assert.deepEqual(input, index === role ? human : bots[index]));
      assert.notEqual(inputs[role], human);
      assert.deepEqual(practiceInputs(body, -1, human), bots);
      assert.deepEqual(practiceInputs(body, crewSize, human), bots);
    });
  }
}

test("3p Arms grips with both hands while 5p hands grip and release independently", () => {
  const three = createBody(CHALLENGE.Easy, 3);
  putFirstObjectBetweenHands(three);
  const armsGrip = neutralInputs(3);
  armsGrip[0].action = true;
  step(three, armsGrip);
  assert.deepEqual(three.handGrip, [0, 0]);
  assert.equal(securelyHeld(three), true);
  step(three, neutralInputs(3));
  assert.deepEqual(three.handGrip, [-1, -1]);

  const five = createBody(CHALLENGE.Easy, 5);
  putFirstObjectBetweenHands(five);
  const leftOnly = neutralInputs(5);
  leftOnly[0].action = true;
  step(five, leftOnly);
  assert.deepEqual(five.handGrip, [0, -1]);
  assert.equal(securelyHeld(five), false);

  const both = neutralInputs(5);
  both[0].action = true;
  both[1].action = true;
  step(five, both);
  assert.deepEqual(five.handGrip, [0, 0]);
  assert.equal(securelyHeld(five), true);

  const rightOnly = neutralInputs(5);
  rightOnly[1].action = true;
  step(five, rightOnly);
  assert.deepEqual(five.handGrip, [-1, 0]);
  assert.equal(securelyHeld(five), false);
});

test("3p Legs drives both feet while 5p leg slots drive their own foot", () => {
  const three = createBody(CHALLENGE.Easy, 3), threeNeutral = createBody(CHALLENGE.Easy, 3);
  const pairedLegs = neutralInputs(3);
  pairedLegs[2].z = 1;
  step(three, pairedLegs);
  step(threeNeutral, neutralInputs(3));
  assert.ok(three.nodes[4].z - threeNeutral.nodes[4].z > 0.02);
  assert.ok(three.nodes[5].z - threeNeutral.nodes[5].z > 0.02);

  for (const [role, controlledFoot, otherFoot] of [[3, 4, 5], [4, 5, 4]] as const) {
    const five = createBody(CHALLENGE.Easy, 5), fiveNeutral = createBody(CHALLENGE.Easy, 5);
    const oneLeg = neutralInputs(5);
    oneLeg[role].z = 1;
    step(five, oneLeg);
    step(fiveNeutral, neutralInputs(5));
    assert.ok(five.nodes[controlledFoot].z - fiveNeutral.nodes[controlledFoot].z > 0.02);
    assert.ok(Math.abs(five.nodes[otherFoot].z - fiveNeutral.nodes[otherFoot].z) < 0.001);
  }
});

test("Torso maps to slot 2 in 3p and slot 3 in 5p display order", () => {
  for (const [crewSize, torsoSlot] of [[3, 1], [5, 2]] as const) {
    const body = createBody(CHALLENGE.Easy, crewSize);
    const inputs = neutralInputs(crewSize);
    inputs[torsoSlot].action = true;
    step(body, inputs);
    assert.equal(body.brace, true);

    const handBody = createBody(CHALLENGE.Easy, crewSize);
    const handInputs = neutralInputs(crewSize);
    handInputs[0].action = true;
    step(handBody, handInputs);
    assert.equal(handBody.brace, false);
  }
});

const NECESSARY_ROLE_CASES = [
  { crewSize: 3, role: 0, stage: 0, objective: "relay" },
  { crewSize: 3, role: 1, stage: 1, objective: "bridge" },
  { crewSize: 3, role: 2, stage: 3, objective: "switches" },
  { crewSize: 5, role: 0, stage: 0, objective: "left relay" },
  { crewSize: 5, role: 1, stage: 0, objective: "right relay" },
  { crewSize: 5, role: 2, stage: 1, objective: "bridge" },
  { crewSize: 5, role: 3, stage: 3, objective: "left switch" },
  { crewSize: 5, role: 4, stage: 3, objective: "right switch" },
] as const;

for (const { crewSize, role, stage, objective } of NECESSARY_ROLE_CASES) {
  test(`${crewSize}p ${rolesFor(crewSize)[role].name} is necessary at the ${objective} objective`, () => {
    const coordinated = runRepresentativeObjective(crewSize, stage);
    const missing = runRepresentativeObjective(crewSize, stage, role);
    assert.ok(coordinated.stage > stage, "the coordinated control group must clear the objective");
    assert.equal(missing.stage, stage);
    assert.equal(stageProgressValue(missing), 0);
  });
}

for (const challenge of CHALLENGES) {
  for (const crewSize of CREW_SIZES) {
    test(`${challenge.difficulty} completes deterministically with a coordinated ${crewSize}p crew`, () => {
      const first = runCoordinated(challenge.id, crewSize);
      const second = runCoordinated(challenge.id, crewSize);
      assert.equal(first.finished, true, `stalled at ${challenge.stages[first.stage]?.name ?? "unknown"}`);
      assert.equal(first.stage, challenge.stages.length);
      assert.equal(first.falls, 0);
      assert.equal(first.mistakes, 0);
      assert.deepEqual(first, second);
      assert.equal(elapsedMs(first), Math.round(first.ticks * 1000 / 30));
      assert.match(formatTime(elapsedMs(first)), /^\d{2,}:\d{2}\.\d{3}$/);
    });
  }
}

for (const challenge of CHALLENGES) {
  test(`${challenge.difficulty} falls restore every checkpoint with its exact penalty`, () => {
    for (let stageIndex = 0; stageIndex < challenge.stages.length; stageIndex++) {
      const body = createBody(challenge.id, 5);
      body.stage = stageIndex;
      body.charge = 0.8;
      body.feet = [0.5, 0.7];
      body.handGrip = [0, 0];
      body.brace = true;
      body.bend = true;
      body.nodes[0].y = -20;
      step(body, neutralInputs(5));

      assert.equal(body.stage, stageIndex);
      assert.equal(body.nodes[0].z, challenge.stages[stageIndex].spawn);
      assert.equal(body.falls, 1);
      assert.equal(body.penaltyMs, challenge.fallPenaltyMs);
      assert.equal(elapsedMs(body), challenge.fallPenaltyMs);
      assert.equal(body.charge, 0);
      assert.deepEqual(body.feet, [0, 0]);
      assert.deepEqual(body.handGrip, [-1, -1]);
      assert.equal(body.brace, false);
      assert.equal(body.bend, false);

      step(body, neutralInputs(5));
      assert.equal(body.falls, 1, "one fall must not trigger repeated recoveries");
      assert.equal(body.penaltyMs, challenge.fallPenaltyMs);
    }
  });
}

test("placed objects cannot repeatedly reset a recovered team", () => {
  for (const challenge of CHALLENGES) {
    const body = createBody(challenge.id, 5);
    body.placed[0] = true;
    body.objects[0].y = -20;
    step(body, neutralInputs(5));
    assert.equal(body.falls, 0);
  }
});

for (const crewSize of CREW_SIZES) {
  test(`Difficult ${crewSize}p final timing penalizes only a mistimed synchronized attempt`, () => {
    const finalStage = CHALLENGES[CHALLENGE.Difficult].stages.length - 1;
    const challenge = CHALLENGES[CHALLENGE.Difficult];
    const mistimed = createBody(CHALLENGE.Difficult, crewSize);
    placeAtStageGate(mistimed, finalStage);
    while (Math.abs(finalAlignment(mistimed.ticks + 1)) > 0.2) mistimed.ticks++;
    const allAct = neutralInputs(crewSize).map(input => ({ ...input, action: true }));
    step(mistimed, allAct);
    assert.equal(mistimed.stage, finalStage);
    assert.equal(mistimed.mistakes, 1);
    assert.equal(mistimed.penaltyMs, challenge.timingPenaltyMs);
    assert.equal(elapsedMs(mistimed), Math.round(mistimed.ticks * 1000 / 30) + challenge.timingPenaltyMs);
    assert.ok(mistimed.lockout > 0);

    step(mistimed, allAct);
    assert.equal(mistimed.mistakes, 1, "holding ACT must not multiply one timing mistake");
    assert.equal(mistimed.penaltyMs, challenge.timingPenaltyMs);

    const incomplete = createBody(CHALLENGE.Difficult, crewSize);
    placeAtStageGate(incomplete, finalStage);
    while (Math.abs(finalAlignment(incomplete.ticks + 1)) > 0.2) incomplete.ticks++;
    const oneMissing = neutralInputs(crewSize).map(input => ({ ...input, action: true }));
    oneMissing[0].action = false;
    step(incomplete, oneMissing);
    assert.equal(incomplete.mistakes, 0);
    assert.equal(incomplete.penaltyMs, 0);
    assert.equal(incomplete.charge, 0);

    const aligned = createBody(CHALLENGE.Difficult, crewSize);
    placeAtStageGate(aligned, finalStage);
    assert.ok(Math.abs(finalAlignment(aligned.ticks + 1)) > 0.94);
    step(aligned, neutralInputs(crewSize).map(input => ({ ...input, action: true })));
    assert.equal(aligned.mistakes, 0);
    assert.equal(aligned.penaltyMs, 0);
    assert.ok(aligned.charge > 0);
  });
}

for (const crewSize of CREW_SIZES) {
  test(`Difficult ${crewSize}p final timing requires a fresh synchronized ACT edge after pre-holding`, () => {
    const finalStage = CHALLENGES[CHALLENGE.Difficult].stages.length - 1;
    const body = createBody(CHALLENGE.Difficult, crewSize);
    body.stage = finalStage;
    const allAct = neutralInputs(crewSize).map(input => ({ ...input, action: true }));

    step(body, allAct);
    placeAtStageGate(body, finalStage);
    for (let tick = 0; tick < 200; tick++) step(body, allAct);

    assert.equal(body.stage, finalStage, "pre-held ACT must not arm or complete the finale");
    assert.equal(body.finished, false);
    assert.equal(body.charge, 0);
    assert.equal(body.syncStarted, false);

    step(body, neutralInputs(crewSize));
    while (
      !(Math.abs(finalAlignment(body.ticks)) <= 0.94 &&
        Math.abs(finalAlignment(body.ticks + 1)) > 0.94)
    ) {
      step(body, neutralInputs(crewSize));
    }

    for (let tick = 0; tick < 20 && !body.finished; tick++) step(body, allAct);

    assert.equal(body.finished, true, "a fresh simultaneous ACT edge during alignment must complete the finale");
    assert.equal(body.stage, CHALLENGES[CHALLENGE.Difficult].stages.length);
    assert.equal(body.mistakes, 0);
    assert.equal(body.penaltyMs, 0);
  });
}

test("elapsed time and display preserve exact milliseconds and accumulated penalties", () => {
  const body = createBody(CHALLENGE.Medium, 5);
  body.ticks = 37;
  body.penaltyMs = 5_000;
  assert.equal(elapsedMs(body), 6_233);
  assert.equal(formatTime(0), "00:00.000");
  assert.equal(formatTime(1), "00:00.001");
  assert.equal(formatTime(999), "00:00.999");
  assert.equal(formatTime(61_234), "01:01.234");
  assert.equal(formatTime(3_661_007), "61:01.007");
  assert.equal(formatTime(elapsedMs(body)), "00:06.233");
});

test("finished bodies stop advancing and incompatible snapshots fail explicitly", () => {
  const finished = createBody(CHALLENGE.Easy, 3);
  finished.stage = CHALLENGES[CHALLENGE.Easy].stages.length;
  finished.finished = true;
  const saved = structuredClone(finished);
  const savedMs = elapsedMs(finished);
  step(finished, teammateInputs(createBody(CHALLENGE.Easy, 3)));
  assert.deepEqual(finished, saved);
  assert.equal(elapsedMs(finished), savedMs);

  for (const version of [RULESET - 1, RULESET + 1, NaN]) {
    const incompatible = createBody(CHALLENGE.Easy, 5);
    incompatible.version = version;
    assert.throws(() => step(incompatible, neutralInputs(5)), /Incompatible race snapshot/);
  }
});

test("stage gates reject forged forward snapshots for every challenge and crew mode", () => {
  for (const challenge of CHALLENGES) {
    for (const crewSize of CREW_SIZES) {
      const gate = challenge.stages[0].gate;
      const body = createBody(challenge.id, crewSize, gate + 20);
      step(body, neutralInputs(crewSize));
      assert.equal(body.stage, 0);
      assert.ok(body.nodes[0].z <= gate);
    }
  }
});

test("missing, non-finite, and out-of-range inputs are neutralized or clamped", () => {
  for (const crewSize of CREW_SIZES) {
    const missing = createBody(CHALLENGE.Easy, crewSize), neutral = createBody(CHALLENGE.Easy, crewSize);
    step(missing, []);
    step(neutral, neutralInputs(crewSize));
    assert.deepEqual(missing, neutral);

    const invalid = createBody(CHALLENGE.Easy, crewSize), clean = createBody(CHALLENGE.Easy, crewSize);
    const bad = neutralInputs(crewSize);
    bad[0].x = NaN;
    bad.at(-1)!.z = Infinity;
    step(invalid, bad);
    step(clean, neutralInputs(crewSize));
    assert.deepEqual(invalid, clean);

    const clamped = createBody(CHALLENGE.Easy, crewSize), bounded = createBody(CHALLENGE.Easy, crewSize);
    const huge = neutralInputs(crewSize), one = neutralInputs(crewSize);
    huge.at(-1)!.z = 100;
    one.at(-1)!.z = 1;
    step(clamped, huge);
    step(bounded, one);
    assert.deepEqual(clamped, bounded);
  }
});
