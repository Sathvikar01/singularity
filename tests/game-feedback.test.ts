import assert from "node:assert/strict";
import test from "node:test";
import { GameFeedbackTracker, type GameFeedbackEvent } from "../src/game-feedback.ts";
import { CHALLENGE, createBody } from "../shared/physics.ts";

test("feedback counters emit once and attempt changes reset quietly", () => {
  const events: GameFeedbackEvent[] = [];
  const tracker = new GameFeedbackTracker(event => events.push(event));
  const body = createBody(CHALLENGE.Easy, 5);
  tracker.update("attempt-a", body);
  assert.deepEqual(events, []);

  body.ticks++;
  body.hazardContacts[0] = true;
  tracker.update("attempt-a", body);
  tracker.update("attempt-a", body);
  assert.deepEqual(events.map(event => event.kind), ["impact"]);

  body.ticks++;
  body.stage++;
  tracker.update("attempt-a", body);
  body.ticks++;
  body.mistakes++;
  tracker.update("attempt-a", body);
  assert.deepEqual(events.map(event => event.kind), ["impact", "stage", "mistake"]);

  body.falls++;
  tracker.update("attempt-a", body);
  assert.equal(events.at(-1)?.kind, "fall");
  const count = events.length;
  tracker.update("attempt-b", body);
  assert.equal(events.length, count);
});

test("physical transitions distinguish steps, lifts, landings, and grips", () => {
  const events: GameFeedbackEvent[] = [];
  const tracker = new GameFeedbackTracker(event => events.push(event));
  const body = createBody(CHALLENGE.Easy, 3);
  tracker.update("run", body);

  body.ticks = 7;
  body.nodes[0].z += 0.1;
  body.nodes[0].pz = body.nodes[0].z - 0.1;
  tracker.update("run", body);
  assert.equal(events.at(-1)?.kind, "step");

  body.ticks++;
  body.nodes[4].y = body.nodes[5].y = 0.7;
  tracker.update("run", body);
  assert.equal(events.at(-1)?.kind, "lift");

  body.ticks++;
  body.nodes[4].y = body.nodes[5].y = 0.25;
  body.nodes[0].py = body.nodes[0].y + 0.1;
  tracker.update("run", body);
  assert.equal(events.at(-1)?.kind, "land");
  assert.ok(events.at(-1)!.strength > 0.35);

  body.ticks++;
  body.handGrip[0] = 0;
  tracker.update("run", body);
  assert.equal(events.at(-1)?.kind, "grip");
});

test("completion emits the payoff event instead of an extra stage pulse", () => {
  const events: GameFeedbackEvent[] = [];
  const tracker = new GameFeedbackTracker(event => events.push(event));
  const body = createBody(CHALLENGE.Easy, 5);
  tracker.update("run", body);
  body.ticks++;
  body.stage = 6;
  body.finished = true;
  tracker.update("run", body);
  assert.deepEqual(events.map(event => event.kind), ["finish"]);
});
