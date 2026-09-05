import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto("http://localhost:5173");
  const results = await page.evaluate(async () => {
    const { DbConnection } = await import("/src/module_bindings/index.ts");
    const clients = [];
    const open = () =>
      new Promise((resolve, reject) => {
        DbConnection.builder()
          .withUri("http://127.0.0.1:3100")
          .withDatabaseName("singularity-test")
          .onConnect((c) => {
            c.subscriptionBuilder()
              .onApplied(() => resolve(c))
              .subscribeToAllTables();
          })
          .onConnectError((_, e) => reject(e))
          .build();
      });
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const code = "QA" + Date.now().toString().slice(-8);
    let interval;
    try {
      for (let i = 0; i < 6; i++) {
        const c = await open();
        clients.push(c);
        await c.reducers.join({
          code,
          name: "QA " + i,
          teamNumber: Math.floor(i / 3),
          role: [4, 5, 1][i % 3],
        });
      }
      let rejected = false;
      try {
        await clients[1].reducers.start({});
      } catch {
        rejected = true;
      }
      if (!rejected) throw Error("Non-host could start");
      await clients[0].reducers.start({});
      await wait(3200);
      const started = Date.now();
      interval = setInterval(
        () =>
          clients.forEach((c, i) => {
            const delayed = i >= 3 && Date.now() - started < 1200;
            void c.reducers
              .input({
                x: 0,
                z: i % 3 !== 2 && !delayed ? 1 : 0,
                action: i % 3 === 2,
              })
              .catch(() => {});
          }),
        50,
      );
      const deadline = Date.now() + 35000;
      while (Date.now() < deadline) {
        await wait(250);
        if (
          [...clients[0].db.result.iter()].filter((r) => r.room === code)
            .length === 2
        )
          break;
      }
      clearInterval(interval);
      const finished = [...clients[0].db.result.iter()]
        .filter((r) => r.room === code)
        .sort((a, b) => a.timeMs - b.timeMs)
        .map((r) => ({ team: r.team, time: r.timeMs }));
      const state = clients[0].db.room.id.find(code)?.state;
      await clients[0].reducers.start({});
      await wait(100);
      const rematch =
        clients[0].db.room.id.find(code)?.state === "countdown" &&
        [...clients[0].db.team.iter()]
          .filter((t) => t.room === code)
          .every((t) => t.finishMs === 0 && JSON.parse(t.body).stage === 0);
      for (const c of clients) {
        await c.reducers.leave({});
        c.disconnect();
      }
      await wait(300);
      const observer = await open();
      const persisted = [...observer.db.result.iter()].filter(
        (r) => r.room === code,
      ).length;
      const cleaned = !observer.db.room.id.find(code);
      observer.disconnect();
      return { finished, state, persisted, cleaned, rematch };
    } finally {
      clearInterval(interval);
      clients.forEach((c) => c.disconnect());
    }
  });
  assert.equal(results.finished.length, 2);
  assert.equal(results.finished[0].team, 0);
  assert.ok(results.finished[1].time > results.finished[0].time);
  assert.equal(results.state, "finished");
  assert.equal(results.persisted, 2);
  assert.equal(results.cleaned, true);
  assert.equal(results.rematch, true);
  console.log(
    "PASS: six independent clients, two simultaneous teams, server-validated full course, ordered wall-clock rankings, room cleanup, persistent results after reconnect.",
    results,
  );
} finally {
  await browser.close();
}
