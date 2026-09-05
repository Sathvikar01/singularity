import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.routeWebSocket(url => url.port === "5173", socket => socket.close());
  await page.goto(process.env.TEST_URL || "http://127.0.0.1:5173");
  const report = await page.evaluate(async () => {
    const { DbConnection } = await import("/src/module_bindings/index.ts");
    const { teammateInputs, RULESET, ROLES } = await import("/shared/physics.ts");
    const clients = [], tokens = [];
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const check = (ok, message) => { if (!ok) throw Error(message); };
    const reject = async (fn, message) => { let failed = false; try { await fn(); } catch { failed = true; } check(failed, message); };
    const open = token => new Promise((resolve, reject) => {
      DbConnection.builder().withUri("http://127.0.0.1:3100").withDatabaseName("singularity-five-role-test")
        .withToken(token).onConnect((c, _, t) => {
          tokens.push(t);
          c.subscriptionBuilder().onApplied(() => resolve(c)).subscribeToAllTables();
        }).onConnectError((_, e) => reject(e)).build();
    });
    const code = "QA" + Date.now().toString().slice(-8);
    const args = i => ({ code, name: "Pilot " + i, teamNumber: Math.floor(i / 5), role: i % 5, ruleset: RULESET });
    let timer;
    try {
      for (let i = 0; i < 20; i++) clients.push(await open());
      await reject(() => clients[0].reducers.join({ ...args(0), role: 5 }), "sixth role accepted");
      await reject(() => clients[0].reducers.join({ ...args(0), ruleset: 1 }), "old protocol accepted");
      await clients[0].reducers.join(args(0));
      await reject(() => clients[0].reducers.start({}), "incomplete crew started");
      await reject(() => clients[1].reducers.join(args(0)), "duplicate role accepted");
      for (let i = 1; i < 20; i++) await clients[i].reducers.join(args(i));
      await reject(() => clients[1].reducers.start({}), "non-host started");
      await clients[0].reducers.start({});
      await reject(() => clients[0].reducers.join({ ...args(0), role: 1 }), "countdown role switch accepted");
      await reject(() => clients[0].reducers.join({ ...args(0), code: code + "X" }), "room hop accepted");
      await clients[4].reducers.leave({});
      await reject(() => clients[4].reducers.join({ ...args(4), role: 0 }), "leave/rejoin switched role");
      await clients[4].reducers.join(args(4));
      const observer = await open(); clients.push(observer);
      await reject(() => observer.reducers.join({ ...args(0), teamNumber: 0 }), "late join accepted");
      await wait(3300);
      await reject(() => clients[0].reducers.join({ ...args(0), role: 1 }), "racing role switch accepted");
      await reject(() => clients[0].reducers.input({ x: NaN, z: 0, action: false }), "NaN input accepted");
      // Host disconnect migrates authority but retains its role lease.
      const hostToken = tokens[0];
      clients[0].disconnect();
      await wait(250);
      check(!clients[1].db.room.id.find(code).host.isEqual(clients[0].identity), "host did not migrate");
      check([...clients[1].db.player.iter()].find(p => p.room === code && p.team === 0 && p.role === 0)?.online === false, "lease lost");
      clients[0] = await open(hostToken);
      await reject(() => clients[0].reducers.join({ ...args(0), role: 1 }), "disconnect changed assignment");
      await clients[0].reducers.join(args(0));
      // Inputs decay after 500ms; action stops influencing authoritative body.
      await clients[2].reducers.input({ x: 99, z: -99, action: true });
      await wait(100);
      const bounded = clients[2].db.player.id.find(clients[2].identity);
      check(bounded.x === 1 && bounded.z === -1, "input not bounded");
      await wait(650);
      check(JSON.parse(clients[1].db.team.id.find(code + ":0").body).brace === false, "stale action persisted");
      const started = Date.now();
      let pending = false;
      timer = setInterval(async () => {
        if (pending) return;
        pending = true;
        try {
          const packets = [];
          for (let i = 0; i < 20; i++) {
            const tm = clients[i].db.team.id.find(code + ":" + Math.floor(i / 5));
            if (!tm || tm.finishMs) continue;
            const b = JSON.parse(tm.body);
            const u = teammateInputs(b)[i % 5];
            if (i >= 15 && Date.now() - started < 1500) Object.assign(u, { x: 0, z: 0, action: false });
            packets.push(clients[i].reducers.input(u));
          }
          await Promise.all(packets);
        } finally { pending = false; }
      }, 50);
      const deadline = Date.now() + 90000;
      while (Date.now() < deadline) {
        await wait(200);
        if ([...observer.db.result.iter()].filter(r => r.room === code).length === 4) break;
      }
      clearInterval(timer);
      const results = [...observer.db.result.iter()].filter(r => r.room === code).sort((a,b) => a.timeMs-b.timeMs);
      check(results.length === 4, "not all four crews finished: " + JSON.stringify([...observer.db.team.iter()].filter(t=>t.room===code).map(t=>JSON.parse(t.body))));
      check(results.every(r => r.ruleset === RULESET && r.names.split(", ").length === 5), "wrong ranked roster/ruleset");
      check(results.at(-1).team === 3, "delayed crew did not finish last");
      check(observer.db.room.id.find(code).state === "finished", "race did not finish");
      const host = clients.find(c => c.identity.isEqual(observer.db.room.id.find(code).host));
      await host.reducers.start({});
      await wait(100);
      check(observer.db.room.id.find(code).state === "countdown", "rematch missing");
      check([...observer.db.team.iter()].filter(t=>t.room===code).every(t=>t.finishMs===0 && JSON.parse(t.body).stage===0), "rematch not reset");
      check([...observer.db.player.iter()].filter(p=>p.room===code).every(p=>p.x===0&&p.z===0&&!p.action), "stale rematch inputs");
      for (let i=0;i<20;i++) await clients[i].reducers.leave({});
      await wait(200);
      check(!observer.db.room.id.find(code), "empty room not removed");
      check([...observer.db.player.iter()].every(p=>p.room!==code), "leases not cleaned");
      check([...observer.db.result.iter()].filter(r=>r.room===code).length===4, "results erased");
      return results.map(r => ({ team: r.team, timeMs: r.timeMs }));
    } finally { clearInterval(timer); clients.forEach(c => c.disconnect()); }
  });
  assert.equal(report.length, 4);
  console.log("PASS: 20 clients, 4 full races, protocol/role/host guards, countdown/race locks, leave/disconnect reconnects, stale inputs, rematch and persistent rankings", report);
} finally { await browser.close(); }
