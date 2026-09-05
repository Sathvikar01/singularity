import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createBody, step, neutralInputs, teammateInputs, practiceInputs, ROLE, ROLES, COURSE, LINKS, RULESET, scanError, elapsedMs } from "../shared/physics.ts";

function run(missing = -1, ticks = 3000) {
  const b = createBody();
  for (let i = 0; i < ticks && !b.finished; i++) {
    const u = teammateInputs(b);
    if (missing >= 0) u[missing] = neutralInputs()[missing];
    step(b, u);
  }
  return b;
}
test("five control slots preserve six physical nodes", () => {
  assert.deepEqual(ROLES, ["Eyes", "Hands", "Torso", "Left Leg", "Right Leg"]);
  assert.equal(neutralInputs().length, 5);
  assert.equal(createBody().nodes.length, 6);
});
test("coordinated crew completes six objectives deterministically", () => {
  const a = run(), b = run();
  assert.equal(a.stage, COURSE.length);
  assert.equal(a.finished, true);
  assert.equal(a.delivered, true);
  assert.deepEqual(a, b);
  assert.ok(a.falls < 3);
});
for (let role = 0; role < ROLES.length; role++) {
  test(ROLES[role] + " is necessary to complete the course", () => {
    const b = run(role);
    assert.equal(b.finished, false);
    assert.ok(b.stage <= [0, 2, 1, 3, 3][role]);
  });
  test("practice controls only the selected " + ROLES[role] + " slot", () => {
    const b = createBody(), bots = teammateInputs(b), human = { x: -.8, z: -.4, action: false };
    const inputs = practiceInputs(b, role, human);
    inputs.forEach((u, i) => assert.deepEqual(u, i === role ? human : bots[i]));
    assert.notEqual(inputs[role], human);
  });
}
test("Eyes input changes aim without propulsion", () => {
  const a = createBody(), b = createBody(), u = neutralInputs();
  u[ROLE.Eyes] = { x: 1, z: 1, action: true };
  for (let i = 0; i < 30; i++) { step(a, u); step(b, neutralInputs()); }
  assert.deepEqual(a.nodes, b.nodes);
  assert.notEqual(a.look, b.look);
});
test("Hands steers both arms with the same exclusive input", () => {
  const a = createBody(), b = createBody(), u = neutralInputs();
  u[ROLE.Hands].x = 1;
  step(a, u); step(b, neutralInputs());
  assert.ok(a.nodes[2].x > b.nodes[2].x);
  assert.ok(a.nodes[3].x > b.nodes[3].x);
});
test("holding scan without aiming cannot clear first contact", () => {
  const b = createBody();
  for (let i = 0; i < 1000; i++) { const u = teammateInputs(b); u[ROLE.Eyes].x = 0; step(b, u); }
  assert.equal(b.stage, 0);
  assert.ok(Math.abs(scanError(b)) > .18);
});
test("holding cargo over the pad does not count as delivery", () => {
  const b = createBody();
  for (let i = 0; i < 1500; i++) {
    const u = teammateInputs(b); u[ROLE.Hands].action = true; step(b, u);
  }
  assert.equal(b.stage, 2);
  assert.equal(b.delivered, false);
  assert.ok(b.grip === 2 || b.grip === 3);
});
test("each leg must hold its own switch concurrently", () => {
  const b = createBody(33); b.stage = 3;
  for (let i = 0; i < 300; i++) {
    const u = neutralInputs(); u[i < 150 ? ROLE.LeftLeg : ROLE.RightLeg].action = true; step(b, u);
  }
  assert.equal(b.stage, 3);
});
test("falls restore each checkpoint and clear transient challenge state once", () => {
  for (let stage = 0; stage < COURSE.length; stage++) {
    const b = createBody(); b.stage = stage; b.delivered = stage > 2;
    b.charge = .8; b.feet = [1, 1]; b.grip = 2;
    b.nodes.forEach(n => { n.y = -20; });
    step(b, neutralInputs());
    assert.equal(b.stage, stage); assert.equal(b.nodes[0].z, COURSE[stage].spawn);
    assert.equal(b.falls, 1); assert.equal(b.charge, 0); assert.equal(b.grip, -1);
    assert.deepEqual(b.feet, [0, 0]);
  }
});
test("delivered cargo cannot repeatedly reset a team", () => {
  const b = createBody(35); b.stage = 4; b.delivered = true; b.cube.y = -20;
  for (let i = 0; i < 90; i++) step(b, neutralInputs());
  assert.equal(b.falls, 0);
});
test("gates cannot be skipped even with a forged forward position", () => {
  const b = createBody(62); step(b, neutralInputs());
  assert.equal(b.stage, 0); assert.ok(b.nodes[0].z <= COURSE[0].gate);
});
test("full-run joint lengths remain bounded and positions finite", () => {
  const b = createBody();
  for (let i = 0; i < 1500 && !b.finished; i++) {
    step(b, teammateInputs(b));
    for (const [a, c, rest] of LINKS) {
      const p = b.nodes[a], q = b.nodes[c];
      assert.ok(Math.abs(Math.hypot(p.x-q.x,p.y-q.y,p.z-q.z)-rest) < .3);
    }
    assert.ok(b.nodes.every(n => Object.values(n).every(Number.isFinite)));
  }
});
test("bad input is neutralized and bounded", () => {
  const a = createBody(), b = createBody(), u = neutralInputs();
  u[0].x = NaN; u[1].z = Infinity; step(a, u); step(b, neutralInputs()); assert.deepEqual(a,b);
  const c = createBody(), d = createBody();
  const v = neutralInputs(), w = neutralInputs(); v[3].z = 100; w[3].z = 1;
  step(c,v); step(d,w); assert.deepEqual(c,d);
});
test("finished bodies and clocks stop advancing; old snapshots fail explicitly", () => {
  const b = run(), saved = structuredClone(b), ms = elapsedMs(b);
  step(b, teammateInputs(b)); assert.deepEqual(b, saved); assert.equal(elapsedMs(b), ms);
  const old = createBody(); old.version = RULESET - 1;
  assert.throws(() => step(old, neutralInputs()), /Incompatible/);
});
