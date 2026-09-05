import "./style.css";
import { createScene } from "./scene";
import {
  createBody,
  step,
  practiceInputs,
  COURSE, ROLE, ROLE_HELP, RULESET, scanError,
  ROLES,
  formatTime,
  elapsedMs,
  type Body,
  type Input,
} from "../shared/physics";
import { connect } from "./network";
import type { DbConnection } from "./module_bindings";
const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const icons = ["◉", "↔", "▥", "⌁", "⌁"];
document.querySelector("#app")!.innerHTML = `
<div id="world"></div><div class="vignette"></div>
<header><div class="brand"><i class="brand-icon"></i>SINGULARITY<span>®</span></div><nav><button id="help">How to play ↗</button><button id="leaders">Leaderboard</button><button id="sound" aria-label="Toggle sound">♫</button></nav><div class="status"><i class="dot"></i><span id="connection">PHYSICS. TOGETHER.</span></div></header>
<section class="intro"><div class="eyebrow">CO-OP PHYSICS / COMPETITIVE CHAOS</div><h1>FIVE MINDS.<br>ONE BODY.<br><em>GOOD LUCK.</em></h1><p>You’re a part of something bigger. Literally.<br>Pilot one body with your friends. Find your balance. Beat the clock.</p><div class="actions"><button class="primary" id="open-lobby">Assemble your team ↗</button><button id="practice">Try solo ↗</button></div><div class="tiny">5–20 players · 5 roles per body · One shared braincell<br>Solo practice available. No download required.</div></section>
<section class="hud"><div class="section-label" id="mode-label">SOLO PRACTICE / UNRANKED</div><div class="timer" id="timer">00:00.00</div><div class="pill" id="race-status">READY TO WOBBLE</div><div id="standings"></div><button class="back" id="room-panel">Crew / rematch</button> <button class="back" id="exit">← Leave course</button></section>
<aside class="course-card"><div class="section-label">THE FIRST EXPEDITION</div><div class="course-title">Suspended disbelief</div><div class="course-meta">Orbital training facility / Sector 07</div>${COURSE.map((s, i) => `<div class="stage ${i === 0 ? "current" : ""}" id="stage-${i}"><span class="stage-num">0${i + 1}</span><div><b>${s.name}</b><small>${s.hint}</small></div></div>`).join("")}<div class="course-footer"><span>6 CHALLENGES</span><strong>∞ WAYS TO FALL</strong></div></aside>
<div class="objective-panel" id="objective-panel"><b id="objective-title"></b><span id="objective-hint"></span><progress id="objective-progress" max="1" value="0" aria-label="Objective progress"></progress><small id="role-feedback"></small></div><div class="instruction" id="instruction"></div><div class="countdown" id="countdown"></div>
<section class="role-dock"><div class="dock-heading"><b>CHOOSE YOUR PIECE OF THE PUZZLE</b><span>One pilot per part. Every part matters.</span></div><div class="roles">${ROLES.map((r, i) => `<button class="role ${i === ROLE.LeftLeg ? "active" : ""}" data-role="${i}"><kbd>ROLE</kbd><div class="role-icon">${icons[i]}</div><b>${r}</b><small id="pilot-${i}">${i === ROLE.LeftLeg ? "YOUR CONTROLS" : "AWAITING A MIND"}</small></button>`).join("")}</div></section>
<div class="touch"><button data-key="a" aria-label="Move left">←</button><button data-key="w" aria-label="Move forward">↑</button><button data-key="s" aria-label="Move backward">↓</button><button data-key="d" aria-label="Move right">→</button><button data-key=" " class="grab">ACT</button></div><div class="toast" id="toast" role="status"></div>
<dialog id="lobby"><button class="close" data-close="lobby" aria-label="Close">×</button><div class="eyebrow">BETTER TOGETHER</div><h2>Assemble the crew.</h2><p>Share a room code with your friends. Pick the same team to share a body, or different teams to compete. Up to 4 teams and 20 players. Every team needs all five roles.</p><label class="field">YOUR CALLSIGN<input id="name" maxlength="20" placeholder="Cosmic noodle" autocomplete="nickname"></label><div class="form-row"><label class="field">ROOM CODE<input id="code" maxlength="12" placeholder="ORBIT" value="ORBIT"></label><label class="field">YOUR TEAM<select id="team"><option value="0">01 / Coral crew</option><option value="1">02 / Mint condition</option><option value="2">03 / Purple haze</option><option value="3">04 / Solar flares</option></select></label></div><label class="field">YOUR BODY PART<select id="part">${ROLES.map((r, i) => `<option value="${i}" ${i === ROLE.LeftLeg ? "selected" : ""}>${r}</option>`).join("")}</select></label><div class="actions"><button class="primary" id="join">Join room ↗</button><button id="start" hidden>Start race ↗</button><button id="invite">Copy invite</button></div><p class="error" id="network-error"></p><div class="members" id="members"></div><p class="tiny">The first player is the host. The host starts all teams together. All five roles must be connected. Assignments lock at countdown; reconnecting pilots resume their original role.</p></dialog>
<dialog id="help-dialog"><button class="close" data-close="help-dialog" aria-label="Close">×</button><div class="eyebrow">A QUICK FIELD GUIDE</div><h2>Five minds. Five jobs.</h2>${ROLES.map((name, i) => `<p><b>${name}:</b> ${ROLE_HELP[i]}.</p>`).join("")}<p>Eyes must aim the beam at each amber beacon until the scan fills. Torso braces on the windy bridge and while Eyes scans beyond the sweeper. Hands must release the crate on the mint pad. Both legs must hold their own switches together.</p><p>Choose your role before starting. It stays locked through the race, including reconnects. Solo practice gives the other four roles AI teammates; your controls affect only your chosen role.</p><p>Falls restore the last cleared objective and add 3 seconds. Races end after 10 minutes. Ranked times come from the server. Touch controls match your role’s keyboard controls.</p><button class="primary" data-close="help-dialog">Ready to coordinate</button></dialog>
<dialog id="leader-dialog"><button class="close" data-close="leader-dialog" aria-label="Close">×</button><div class="eyebrow">THE COORDINATED FEW</div><h2>Fast bodies. Faster friends.</h2><p>Five-role course records · Lower is better · Includes fall penalties</p><div id="leader-list">Connecting to the shared leaderboard…</div></dialog>
<dialog id="finish-dialog"><button class="close" data-close="finish-dialog" aria-label="Close">×</button><div class="eyebrow" id="finish-label">MISSION COMPLETE</div><h2>You held it together.</h2><div class="big-result" id="finish-time"></div><p id="finish-detail"></p><button class="primary" id="again">Go again ↗</button></dialog>`;
let scene: ReturnType<typeof createScene>;
try {
  scene = createScene($("world"));
} catch (e) {
  $("toast").textContent =
    "3D rendering could not start. Enable WebGL in your browser and reload.";
  throw e;
}
let practice = false,
  playing = false,
  role: number = ROLE.LeftLeg,
  myTeam = 0,
  body = createBody(),
  conn: DbConnection | undefined,
  ready = false,
  roomCode = "",
  lastStage = 0,
  lastFalls = 0,
  finishShown = false,
  matchKey = "",
  muted = false,
  audio: AudioContext | undefined;
const bodies = new Map<number, Body>([[0, body]]),
  keys = new Set<string>();
let toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  $("toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").textContent = ""), 5000);
}
function beep(freq = 440) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const o = audio.createOscillator(),
      g = audio.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, audio.currentTime);
    o.frequency.exponentialRampToValueAtTime(
      freq * 1.5,
      audio.currentTime + 0.12,
    );
    g.gain.setValueAtTime(0.045, audio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
    o.connect(g).connect(audio.destination);
    o.start();
    o.stop(audio.currentTime + 0.3);
  } catch {}
}
function modal(id: string) {
  $(id) instanceof HTMLDialogElement &&
    ($(id) as HTMLDialogElement).showModal();
  keys.clear();
}
document
  .querySelectorAll<HTMLElement>("[data-close]")
  .forEach(
    (e) =>
      (e.onclick = () => ($(e.dataset.close!) as HTMLDialogElement).close()),
  );
function enter() {
  playing = true;
  finishShown = false;
  lastStage = 0;
  lastFalls = 0;
  document.body.classList.add("playing");
  scene.setFollow(true);
  ($("lobby") as HTMLDialogElement).close();
}
function assignmentLocked() {
  const state = ready && roomCode ? conn?.db.room.id.find(roomCode)?.state : undefined;
  return (practice && playing) || state === "countdown" || state === "racing" || (playing && !ready && !practice);
}
function selectRole(value: number) {
  if (assignmentLocked() || !Number.isInteger(value) || value < 0 || value >= ROLES.length) return;
  role = value;
  drawRoles();
}
function drawRoles() {
  const locked = assignmentLocked();
  ($("join") as HTMLButtonElement).disabled = locked;
  document.querySelectorAll<HTMLButtonElement>("[data-role]").forEach(e => {
    e.classList.toggle("active", Number(e.dataset.role) === role);
    e.disabled = locked;
    e.setAttribute("aria-pressed", String(Number(e.dataset.role) === role));
    e.title = locked ? "Assigned for this race" : "Choose before joining or practicing";
  });
  ($("part") as HTMLSelectElement).value = String(role);
  for (const id of ["part", "team", "code", "name"]) ($(id) as HTMLInputElement).disabled = locked;
  $("instruction").textContent = ROLES[role] + " · " + ROLE_HELP[role];
  document.querySelector<HTMLButtonElement>(".touch .grab")!.textContent = ["SCAN", "GRAB", "BRACE", "HOP", "HOP"][role];
  document.querySelector(".dock-heading b")!.textContent = locked ? "CREW ASSIGNMENTS · LOCKED" : "CHOOSE YOUR ROLE BEFORE THE RACE";
  for (let i = 0; i < ROLES.length; i++) if (practice)
    $("pilot-" + i).textContent = i === role ? "YOU · LOCKED" : "AI TEAMMATE";
}
document.querySelectorAll<HTMLElement>("[data-role]").forEach(e => e.onclick = () => selectRole(Number(e.dataset.role)));
function startPractice() {
  if (conn && roomCode) void conn.reducers.leave({}).catch(() => {});
  roomCode = "";
  practice = true;
  body = createBody();
  bodies.clear();
  bodies.set(0, body);
  myTeam = 0;
  keys.clear();
  enter();
  drawRoles();
  $("mode-label").textContent = "SOLO PRACTICE / UNRANKED";
  $("race-status").textContent = "4 AI TEAMMATES · YOUR ROLE IS LOCKED";
  $("standings").textContent = "";
  toast(ROLE_HELP[role]);
  beep();
}
$("practice").onclick = startPractice;
$("sound").onclick = () => {
  muted = !muted;
  $("sound").textContent = muted ? "♪̸" : "♫";
  toast(muted ? "Sound off" : "Sound on");
};
$("help").onclick = () => modal("help-dialog");
$("exit").onclick = () => {
  if (conn && roomCode) void conn.reducers.leave({}).catch(() => {});
  playing = false;
  practice = false;
  roomCode = "";
  keys.clear();
  document.body.classList.remove("playing");
  scene.setFollow(false);
  body = createBody();
  bodies.clear();
  bodies.set(0, body);
  $("countdown").textContent = "";
  drawRoles();
};
$("again").onclick = () => {
  ($("finish-dialog") as HTMLDialogElement).close();
  if (practice) startPractice();
  else modal("lobby");
};
function connectionError(message: string) {
  ready = false;
  $("connection").textContent = "MULTIPLAYER OFFLINE";
  $("network-error").textContent =
    "Multiplayer unavailable: " + message + ". Solo practice is available.";
  $("leader-list").textContent =
    "Unable to load verified results. The multiplayer server is unavailable.";
  ($("join") as HTMLButtonElement).disabled = false;
  if (playing && !practice)
    toast("Disconnected. Race input is paused. Open the lobby to reconnect.");
}
function ensureConnection() {
  if (ready) return;
  if (conn) conn.disconnect();
  $("connection").textContent = "CONNECTING";
  $("network-error").textContent = "Connecting to SpacetimeDB…";
  conn = connect(
    (c) => {
      conn = c;
      ready = true;
      $("connection").textContent = "SPACETIMEDB CONNECTED";
      $("network-error").textContent = "";
      const me = c.identity && c.db.player.id.find(c.identity);
      if (me && !practice) {
        roomCode = me.room;
        role = me.role;
        ($("code") as HTMLInputElement).value = me.room;
        ($("name") as HTMLInputElement).value = me.name;
        ($("team") as HTMLSelectElement).value = String(me.team);
        if (!me.online) void c.reducers.join({ code: me.room, name: me.name, teamNumber: me.team, role: me.role, ruleset: RULESET }).catch(e => toast(String(e)));
      }
      refresh();
    },
    refresh,
    connectionError,
  );
}
$("room-panel").onclick = () => {
  if (practice) $("exit").click();
  modal("lobby");
  if (!ready) ensureConnection();
};
$("open-lobby").onclick = () => {
  modal("lobby");
  ensureConnection();
};
$("leaders").onclick = () => {
  modal("leader-dialog");
  ensureConnection();
  refresh();
};
$("invite").onclick = async () => {
  const u = new URL(location.href);
  u.searchParams.set(
    "room",
    ($("code") as HTMLInputElement).value.toUpperCase(),
  );
  try {
    await navigator.clipboard.writeText(u.href);
    toast("Invite link copied. Send it to your crew.");
  } catch {
    toast("Room code: " + ($("code") as HTMLInputElement).value);
  }
};
$("join").onclick = async () => {
  if (!ready) {
    ensureConnection();
    toast("Connecting… press Join room once connected.");
    return;
  }
  const name = ($("name") as HTMLInputElement).value.trim();
  if (!name) {
    $("network-error").textContent = "Choose a callsign first.";
    return;
  }
  try {
    const code = ($("code") as HTMLInputElement).value.trim().toUpperCase();
    await conn!.reducers.join({
      code,
      name,
      teamNumber: Number(($("team") as HTMLSelectElement).value),
      role: Number(($("part") as HTMLSelectElement).value),
      ruleset: RULESET,
    });
    roomCode = code;
    role = Number(($("part") as HTMLSelectElement).value);
    practice = false;
    refresh();
    beep();
  } catch (e) {
    $("network-error").textContent = String(e);
  }
};
$("start").onclick = async () => {
  try {
    await conn!.reducers.start({});
  } catch (e) {
    $("network-error").textContent = String(e);
  }
};
function refresh() {
  if (!ready || !conn) return;
  const players = [...conn.db.player.iter()];
  const me = players.find((p) => p.id.isEqual(conn!.identity!));
  if (me && me.online && roomCode && !practice) {
    roomCode = me.room;
    myTeam = me.team;
    if (assignmentLocked()) role = me.role;
    drawRoles();
    const room = conn.db.room.id.find(roomCode);
    const members = players.filter((p) => p.room === roomCode);
    $("members").replaceChildren(
      ...members.map((p) => {
        const el = document.createElement("div");
        el.textContent = `T${p.team + 1} · ${ROLES[p.role]} — ${p.name}${p.online ? "" : " · DISCONNECTED / RESERVED"}`;
        return el;
      }),
    );
    $("start").hidden = !room?.host.isEqual(conn.identity!);
    $("start").textContent =
      room?.state === "finished" ? "Race again ↗" : "Start race ↗";
    for (let i = 0; i < ROLES.length; i++)
      $("pilot-" + i).textContent =
        members.find((p) => p.team === myTeam && p.role === i)?.name ||
        "NEEDED BEFORE START";
    const locked = assignmentLocked();
    ($("join") as HTMLButtonElement).disabled = locked;
    const activeTeams = [...new Set(members.filter(p => p.online).map(p => p.team))];
    const crewReady = activeTeams.length > 0 && activeTeams.every(team => ROLES.every((_, role) => members.some(p => p.team === team && p.role === role && p.online)));
    ($("start") as HTMLButtonElement).disabled = locked || !crewReady;
    $("start").title = crewReady ? "All five roles connected" : "Every active team needs five connected pilots";
    if (room && room.state !== "lobby" && !practice) {
      const nextMatch = room.id + ":" + room.startAt;
      if (!playing || matchKey !== nextMatch) {
        matchKey = nextMatch;
        enter();
        ($("finish-dialog") as HTMLDialogElement).close();
      }
      $("mode-label").textContent = `TEAM ${myTeam + 1} / ROOM ${roomCode}`;
      $("race-status").textContent = room.state.toUpperCase();
      bodies.clear();
      for (const tm of conn.db.team.iter())
        if (tm.room === roomCode && members.some((p) => p.team === tm.number))
          bodies.set(tm.number, JSON.parse(tm.body));
      body = bodies.get(myTeam) || body;
      const teams = [...conn.db.team.iter()]
        .filter(
          (t) =>
            t.room === roomCode && members.some((p) => p.team === t.number),
        )
        .sort((a, b) => (a.finishMs || Infinity) - (b.finishMs || Infinity));
      $("standings").replaceChildren(
        ...teams.map((t) => {
          const el = document.createElement("div");
          el.textContent = `TEAM ${t.number + 1} · ${t.finishMs ? formatTime(t.finishMs) : `${JSON.parse(t.body).stage}/${COURSE.length} objectives`}`;
          return el;
        }),
      );
      if (room.state === "finished" && !body.finished && !finishShown) {
        finishShown = true;
        toast(
          "Race ended. No finish recorded for your team. Open the lobby for a rematch.",
        );
      }
    }
  }
  const results = [...conn.db.result.iter()]
    .filter(r => r.ruleset === RULESET)
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, 15);
  $("leader-list").replaceChildren(
    ...results.map((r, i) => {
      const row = document.createElement("div");
      row.className = "leader-row";
      const rank = document.createElement("span");
      rank.textContent = String(i + 1).padStart(2, "0");
      const names = document.createElement("span");
      names.textContent = r.names;
      const time = document.createElement("strong");
      time.textContent = formatTime(r.timeMs);
      row.append(rank, names, time);
      return row;
    }),
  );
  if (!results.length)
    $("leader-list").textContent =
      "No finishes yet. Your crew could set the first record.";
}
function input(): Input {
  if (document.querySelector("dialog[open]")) return { x: 0, z: 0, action: false };
  return {
    x:
      (keys.has("d") || keys.has("arrowright") ? 1 : 0) -
      (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
    z:
      (keys.has("w") || keys.has("arrowup") ? 1 : 0) -
      (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
    action: keys.has(" "),
  };
}
window.addEventListener("keydown", (e) => {
  if (document.querySelector("dialog[open]")) return;
  const k = e.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k))
    e.preventDefault();
  keys.add(k);

});
window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => keys.clear());
document.querySelectorAll<HTMLElement>("[data-key]").forEach((e) => {
  e.onpointerdown = (ev) => {
    e.setPointerCapture(ev.pointerId);
    keys.add(e.dataset.key!);
  };
  e.onpointerup = e.onpointercancel = () => keys.delete(e.dataset.key!);
});
setInterval(() => {
  if (playing && !practice && ready && roomCode && conn?.db.room.id.find(roomCode)?.state === "racing")
    void conn!.reducers.input(input()).catch((e) => toast(String(e)));
}, 50);
let previous = performance.now(),
  accum = 0;
function frame(t: number) {
  const dt = Math.min((t - previous) / 1000, 0.1);
  previous = t;
  accum += dt;
  if (playing && practice && !document.querySelector("dialog[open]")) {
    while (accum >= 1 / 30) {
      step(body, practiceInputs(body, role, input()));
      accum -= 1 / 30;
    }
  } else accum = 0;
  if (playing) {
    let ms = elapsedMs(body);
    if (!practice && conn && roomCode) {
      const r = conn.db.room.id.find(roomCode);
      if (r) {
        const start = Number(r.startAt / 1000n);
        const remaining = Math.ceil((start - Date.now()) / 1000);
        $("countdown").textContent =
          r.state === "countdown" && remaining > 0 ? String(remaining) : "";
        ms =
          r.state === "countdown"
            ? 0
            : Math.max(0, Date.now() - start) + body.falls * 3000;
        const team = conn.db.team.id.find(roomCode + ":" + myTeam);
        if (team?.finishMs) ms = team.finishMs;
      }
    }
    $("timer").textContent = formatTime(ms);
    $("objective-title").textContent = body.finished ? "MISSION COMPLETE" : `${body.stage + 1} / ${COURSE.length} · ${COURSE[body.stage].name}`;
    $("objective-hint").textContent = COURSE[body.stage]?.hint ?? "Your crew made it home.";
    ($("objective-progress") as HTMLProgressElement).value = body.finished ? 1 : body.stage === 3 ? Math.min(...body.feet) : body.charge;
    $("objective-panel").dataset.stage = String(body.stage);
    $("role-feedback").textContent = role === ROLE.Eyes ? `Aim ${Math.abs(scanError(body)) < .18 ? "LOCKED · hold SCAN" : scanError(body) > 0 ? "RIGHT →" : "← LEFT"}` :
      role === ROLE.Hands ? body.delivered ? "CARGO DELIVERED" : body.grip >= 0 ? "CARRYING · release on mint pad" : "HANDS FREE" :
      role === ROLE.Torso ? body.brace ? "BRACED · absorbing impacts" : "Hold BRACE to stabilize" :
      body.stage === 3 ? `Foot switch ${Math.round(body.feet[role - ROLE.LeftLeg] * 100)}% · hold Space` : "Drive your foot · forward follows the course";
    for (let i = 0; i < COURSE.length; i++) {
      $("stage-" + i).classList.toggle("current", body.stage === i);
      $("stage-" + i).classList.toggle("complete", body.stage > i);
    }
    if (body.stage > lastStage) {
      lastStage = body.stage;
      beep(650);
      toast(COURSE[body.stage]?.hint ?? "All six objectives cleared!");
    }
    if (body.falls > lastFalls) {
      lastFalls = body.falls;
      beep(180);
      toast("Back to your checkpoint. +3 second fall penalty.");
    }
    if (body.finished && !finishShown) {
      finishShown = true;
      $("finish-time").textContent = formatTime(ms);
      $("finish-label").textContent = practice
        ? "PRACTICE COMPLETE / UNRANKED"
        : "VERIFIED TEAM FINISH";
      $("finish-detail").textContent =
        `${body.falls} falls · ${body.falls * 3}s in penalties. ${practice ? "Bring your friends and turn coordination into competition." : "Your result is saved to the persistent leaderboard."}`;
      modal("finish-dialog");
    }
  }
  scene.update(bodies, myTeam, t / 1000);
  requestAnimationFrame(frame);
}
drawRoles();
ensureConnection();
requestAnimationFrame(frame);
const invited = new URL(location.href).searchParams.get("room");
if (invited) {
  ($("code") as HTMLInputElement).value = invited;
  modal("lobby");
  ensureConnection();
}
