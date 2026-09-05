import "./style.css";
import { createScene } from "./scene";
import {
  CHALLENGE,
  CHALLENGES,
  CREW_SIZES,
  RULESET,
  challengeFor,
  createBody,
  decodeSnapshot,
  elapsedMs,
  formatTime,
  isChallenge,
  isCrewSize,
  isFinalAligned,
  practiceInputs,
  rolesFor,
  securelyHeld,
  stageProgressValue,
  step,
  type Body,
  type ChallengeId,
  type CrewSize,
  type Input,
} from "../shared/physics";
import { connect } from "./network";
import type { DbConnection } from "./module_bindings";

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const challengeButtons = (context: string) => CHALLENGES.map(challenge => `
  <button class="challenge-choice" data-${context}-challenge="${challenge.id}" aria-pressed="${challenge.id === 0}">
    <span class="difficulty">${challenge.difficulty}</span>
    <b>${challenge.name}</b>
    <small>${challenge.summary}</small>
    <i>${challenge.stages.length} objectives · +${challenge.fallPenaltyMs / 1000}s falls</i>
  </button>`).join("");
const crewButtons = (context: string) => CREW_SIZES.map(size => `
  <button data-${context}-crew="${size}" aria-pressed="${size === 5}">
    <b>${size} pilots</b><small>${size === 3 ? "Arms · Torso · Legs" : "Two hands · Torso · Two legs"}</small>
  </button>`).join("");
const arrowIcon = (direction: "left" | "up" | "down" | "right") => `
  <svg class="control-icon control-icon-${direction}" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M19 12H5m6-6-6 6 6 6" />
  </svg>`;
const closeIcon = `
  <svg class="close-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>`;

document.querySelector("#app")!.innerHTML = `
<!--
THESIS: One body becomes a three-step ladder of cooperative chaos; difficulty is visible before a crew commits.
OWN-WORLD: Preserve Singularity's dark orbital stage, mint/coral signal color, condensed labels, and physical 3D centerpiece.
STORY: Choose Easy, Medium, or Difficult; choose three or five pilots; claim one indispensable body part; beat an exact shared time.
FIRST VIEWPORT: The live body remains central, with a compact mission rail below the primary invitation and crew mode beside it.
FORM: Established game shell extended as an operating surface; local extension, no replacement seed.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->
<div id="world"></div><div class="vignette"></div>
<header>
  <div class="brand"><i class="brand-icon"></i>SINGULARITY<span>®</span></div>
  <nav><button id="help">How to play</button><button id="leaders">Leaderboard</button><button id="sound" aria-label="Toggle sound">Sound on</button></nav>
  <div class="status"><i class="dot"></i><span id="connection">PHYSICS. TOGETHER.</span></div>
</header>
<main class="intro">
  <h1><span id="hero-count">THREE OR FIVE</span> MINDS.<br>ONE BODY.<br><em>GOOD LUCK.</em></h1>
  <p>Pilot separate parts of one shared body. Talk constantly. Hold on when the course stops cooperating.</p>
  <div class="crew-switch" id="home-crew" aria-label="Crew size">${crewButtons("home")}</div>
  <div class="actions"><button class="primary" id="open-lobby">Assemble your crew</button><button id="practice">Practice this setup</button></div>
  <p class="tiny" id="home-summary">5 pilots · Easy · Exact server-timed records<br>Solo practice available. No download required.</p>
</main>
<section class="mission-rail" aria-label="Choose a challenge">
  <div class="rail-heading"><b>Choose the chaos</b><span>Each course adds a new coordination layer.</span></div>
  <div class="challenge-choices">${challengeButtons("home")}</div>
</section>
<section class="hud">
  <div class="section-label" id="mode-label">SOLO PRACTICE / UNRANKED</div>
  <div class="timer" id="timer">00:00.000</div>
  <div class="pill" id="race-status">READY TO WOBBLE</div>
  <div id="standings"></div>
  <button class="back" id="room-panel">Crew / rematch</button>
  <button class="back" id="exit">Leave course</button>
</section>
<aside class="course-card">
  <div class="difficulty-lockup"><span id="course-difficulty">Easy</span><i id="course-penalty">+3s per fall</i></div>
  <div class="course-title" id="course-title"></div>
  <div class="course-meta" id="course-meta"></div>
  <div id="course-stages"></div>
  <div class="course-footer"><span id="course-count"></span><strong>∞ WAYS TO FALL</strong></div>
</aside>
<div class="objective-panel" id="objective-panel">
  <div class="objective-kicker"><span id="objective-difficulty"></span><i id="sync-signal"></i></div>
  <b id="objective-title"></b><span id="objective-hint"></span>
  <progress id="objective-progress" max="1" value="0" aria-label="Objective progress"></progress>
  <small id="role-feedback"></small>
</div>
<div class="instruction" id="instruction"></div><div class="countdown" id="countdown"></div>
<section class="role-dock">
  <div class="dock-heading"><b>CHOOSE THE PART YOU CONTROL</b><span>Solo Practice fills every other part with AI.</span></div>
  <div class="roles" id="role-cards"></div>
</section>
<div class="touch" aria-label="Touch controls">
  <button data-key="a" aria-label="Move left">${arrowIcon("left")}</button><button data-key="w" aria-label="Move forward">${arrowIcon("up")}</button>
  <button data-key="s" aria-label="Move backward">${arrowIcon("down")}</button><button data-key="d" aria-label="Move right">${arrowIcon("right")}</button>
  <button data-key=" " class="grab">ACT</button>
</div>
<div class="toast" id="toast" role="status" aria-live="polite"></div>

<dialog id="lobby">
  <button class="close" data-close="lobby" aria-label="Close">${closeIcon}</button>
  <h2>Assemble the crew.</h2>
  <p>Every team in a room races the same challenge with the same crew size. The first pilot fixes the room setup.</p>
  <fieldset class="setup-field"><legend>CHALLENGE</legend><div class="lobby-challenges">${challengeButtons("lobby")}</div></fieldset>
  <fieldset class="setup-field"><legend>CREW SIZE</legend><div class="crew-switch lobby-crew">${crewButtons("lobby")}</div></fieldset>
  <label class="field">YOUR CALLSIGN<input id="name" maxlength="20" placeholder="Cosmic noodle" autocomplete="nickname"></label>
  <div class="form-row">
    <label class="field">ROOM CODE<input id="code" maxlength="12" placeholder="ORBIT" value="ORBIT"></label>
    <label class="field">YOUR TEAM<select id="team"><option value="0">01 / Coral crew</option><option value="1">02 / Mint condition</option><option value="2">03 / Purple haze</option><option value="3">04 / Solar flares</option></select></label>
  </div>
  <label class="field">YOUR BODY PART<select id="part"></select></label>
  <div class="room-contract" id="room-contract"></div>
  <div class="actions"><button class="primary" id="join">Join room</button><button id="start" hidden>Start race</button><button id="invite">Copy invite</button></div>
  <p class="error" id="network-error"></p><div class="members" id="members"></div>
  <p class="tiny" id="lobby-footnote">The host starts when every active team fills every role. Assignments lock at countdown; reconnecting pilots resume their original role.</p>
</dialog>

<dialog id="help-dialog">
  <button class="close" data-close="help-dialog" aria-label="Close">${closeIcon}</button>
  <h2 id="help-title"></h2>
  <div id="help-roles"></div>
  <p id="help-course"></p>
  <p>Roles lock for a live race. Falls restore the current checkpoint and add the course penalty. Ranked clocks and results come from the server; practice is always unranked.</p>
  <button class="primary" data-close="help-dialog">Ready to coordinate</button>
</dialog>

<dialog id="leader-dialog" class="leader-dialog">
  <button class="close" data-close="leader-dialog" aria-label="Close">${closeIcon}</button>
  <h2>Exact times. Comparable crews.</h2>
  <div class="leader-filters">
    <div class="tab-list" id="leader-crew-tabs" role="tablist" aria-label="Crew-size leaderboard">${CREW_SIZES.map(size => `<button role="tab" data-leader-crew="${size}" aria-selected="${size === 5}">${size}-player records</button>`).join("")}</div>
    <div class="tab-list challenge-tabs" id="leader-challenge-tabs" role="tablist" aria-label="Challenge leaderboard">${CHALLENGES.map(challenge => `<button role="tab" data-leader-challenge="${challenge.id}" aria-selected="${challenge.id === 0}">${challenge.difficulty}</button>`).join("")}</div>
  </div>
  <p id="leader-description"></p><div id="leader-list">Connecting to the shared leaderboard…</div>
</dialog>

<dialog id="finish-dialog">
  <button class="close" data-close="finish-dialog" aria-label="Close">${closeIcon}</button>
  <h2>You held it together.</h2><p class="result-status" id="finish-label">MISSION COMPLETE</p>
  <div class="big-result" id="finish-time"></div><p id="finish-detail"></p>
  <button class="primary" id="again">Run it again</button>
</dialog>`;

let scene: ReturnType<typeof createScene>;
try {
  scene = createScene($("world"));
} catch (error) {
  $("toast").textContent = "3D rendering could not start. Enable WebGL in your browser and reload.";
  throw error;
}

let selectedChallenge: ChallengeId = CHALLENGE.Easy;
let selectedCrew: CrewSize = 5;
let leaderboardChallenge: ChallengeId = CHALLENGE.Easy;
let leaderboardCrew: CrewSize = 5;
let practice = false;
let playing = false;
let role = 4;
let myTeam = 0;
let body = createBody(selectedChallenge, selectedCrew);
let conn: DbConnection | undefined;
let ready = false;
let roomCode = "";
let lastStage = 0;
let lastFalls = 0;
let lastMistakes = 0;
let finishShown = false;
let matchKey = "";
let muted = false;
let audio: AudioContext | undefined;
const bodies = new Map<number, Body>([[0, body]]);
const keys = new Set<string>();
let toastTimer: ReturnType<typeof setTimeout>;

function toast(message: string) {
  $("toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").textContent = ""; }, 5000);
}

function beep(frequency = 440) {
  if (muted) return;
  try {
    audio ??= new AudioContext();
    void audio.resume();
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.5, audio.currentTime + 0.12);
    gain.gain.setValueAtTime(0.045, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.3);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + 0.3);
  } catch {}
}

function modal(id: string) {
  const dialog = $(id);
  if (dialog instanceof HTMLDialogElement) dialog.showModal();
  keys.clear();
}

document.querySelectorAll<HTMLElement>("[data-close]").forEach(element => {
  element.onclick = () => ($(element.dataset.close!) as HTMLDialogElement).close();
});

function roleIcon(index: number, crewSize: CrewSize) {
  const hand = crewSize === 3 ? index === 0 : index < 2;
  const torso = crewSize === 3 ? index === 1 : index === 2;
  if (hand) return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 18v-7m4 7V7m4 11V6m4 12V9m4 9v-5c0-2 4-2 4 1v6c0 7-4 10-10 10h-2C9 30 5 26 5 20v-2c0-3 2-4 4-1l2 3"/></svg>`;
  if (torso) return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 5c3 2 7 2 10 0l4 5-3 5v12H10V15l-3-5 4-5Z"/><path d="M12 17h8"/></svg>`;
  return `<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M11 4h5l-1 12-4 12H5l4-13 2-11Zm10 0h-5l1 12 4 12h6l-4-13-2-11Z"/></svg>`;
}

function assignmentLocked() {
  const state = ready && roomCode ? conn?.db.room.id.find(roomCode)?.state : undefined;
  return (practice && playing) || state === "countdown" || state === "racing" || (playing && !ready && !practice);
}

function joinedRoom() {
  return Boolean(ready && roomCode && conn?.identity && conn.db.player.id.find(conn.identity));
}

function configLocked() {
  return assignmentLocked() || joinedRoom();
}

function selectRole(value: number) {
  if (assignmentLocked() || !Number.isInteger(value) || value < 0 || value >= rolesFor(selectedCrew).length) return;
  role = value;
  drawRoles();
}

function drawRoles() {
  const roles = rolesFor(selectedCrew);
  if (role >= roles.length) role = roles.length - 1;
  const locked = assignmentLocked();
  $("role-cards").innerHTML = roles.map((definition, index) => `
    <button class="role ${index === role ? "active" : ""}" data-role="${index}" aria-pressed="${index === role}" ${locked ? "disabled" : ""} title="${locked ? "Assigned for this race" : definition.help}">
      <kbd>ROLE ${index + 1}</kbd><div class="role-icon">${roleIcon(index, selectedCrew)}</div><b>${definition.name}</b>
      <small id="pilot-${index}">${index === role ? "YOU CONTROL THIS" : "AI IN SOLO PRACTICE"}</small>
    </button>`).join("");
  document.querySelectorAll<HTMLButtonElement>("[data-role]").forEach(element => {
    element.onclick = () => selectRole(Number(element.dataset.role));
  });
  const part = $("part") as HTMLSelectElement;
  part.replaceChildren(...roles.map((definition, index) => new Option(definition.name, String(index), false, index === role)));
  part.disabled = locked;
  $("instruction").textContent = `${roles[role].name} · ${roles[role].help}`;
  updateActionLabel();
  const dockHeading = document.querySelector<HTMLElement>(".dock-heading b")!;
  const dockHelper = document.querySelector<HTMLElement>(".dock-heading span")!;
  dockHeading.textContent = practice ? "SOLO PRACTICE · YOUR PART" : locked ? "CREW ASSIGNMENTS · LOCKED" : `${selectedCrew}-PART BODY · PICK YOUR PART`;
  dockHelper.textContent = practice ? "AI controls every other part." : locked ? "One pilot per part. Every part matters." : "Solo Practice fills every other part with AI.";
  if (practice) {
    roles.forEach((_, index) => { $("pilot-" + index).textContent = index === role ? "YOU CONTROL THIS" : "AI CONTROLLED"; });
  }
}

function updateCourseUI() {
  const challenge = challengeFor(selectedChallenge);
  $("course-difficulty").textContent = challenge.difficulty;
  $("course-penalty").textContent = `+${challenge.fallPenaltyMs / 1000}s per fall`;
  $("course-title").textContent = challenge.name;
  $("course-meta").textContent = challenge.environment;
  $("course-count").textContent = `${challenge.stages.length} OBJECTIVES`;
  $("course-stages").innerHTML = challenge.stages.map((stage, index) => `
    <div class="stage ${index === 0 ? "current" : ""}" id="stage-${index}">
      <span class="stage-num">${String(index + 1).padStart(2, "0")}</span><div><b>${stage.name}</b><small>${stage.hint}</small></div>
    </div>`).join("");
  $("objective-difficulty").textContent = challenge.difficulty.toUpperCase();
  $("help-course").textContent = `${challenge.name}: ${challenge.summary} This course has ${challenge.stages.length} ordered objectives and adds ${challenge.fallPenaltyMs / 1000} seconds per fall.`;
  document.documentElement.style.setProperty("--challenge", challenge.accent);
}

function updateHelp() {
  const roles = rolesFor(selectedCrew);
  $("help-title").textContent = `${selectedCrew} minds. ${roles.length} essential jobs.`;
  $("help-roles").replaceChildren(...roles.map(definition => {
    const paragraph = document.createElement("p");
    const strong = document.createElement("b");
    strong.textContent = definition.name + ": ";
    paragraph.append(strong, definition.help + ".");
    return paragraph;
  }));
}

function setMode(nextChallenge: number, nextCrew: number, announce = false) {
  if (configLocked()) {
    if (announce) toast("Leave the current room or course before changing its setup.");
    return;
  }
  if (isChallenge(nextChallenge)) selectedChallenge = nextChallenge;
  if (isCrewSize(nextCrew)) selectedCrew = nextCrew;
  if (role >= rolesFor(selectedCrew).length) role = rolesFor(selectedCrew).length - 1;
  body = createBody(selectedChallenge, selectedCrew);
  bodies.clear(); bodies.set(0, body);
  scene.setChallenge(selectedChallenge);
  updateModeControls();
  drawRoles(); updateCourseUI(); updateHelp();
  if (announce) toast(`${challengeFor(selectedChallenge).difficulty} · ${selectedCrew}-pilot setup selected.`);
}

function updateModeControls() {
  const locked = configLocked();
  document.querySelectorAll<HTMLButtonElement>("[data-home-challenge], [data-lobby-challenge]").forEach(button => {
    const active = Number(button.dataset.homeChallenge ?? button.dataset.lobbyChallenge) === selectedChallenge;
    button.setAttribute("aria-pressed", String(active)); button.classList.toggle("active", active); button.disabled = locked;
  });
  document.querySelectorAll<HTMLButtonElement>("[data-home-crew], [data-lobby-crew]").forEach(button => {
    const active = Number(button.dataset.homeCrew ?? button.dataset.lobbyCrew) === selectedCrew;
    button.setAttribute("aria-pressed", String(active)); button.classList.toggle("active", active); button.disabled = locked;
  });
  const challenge = challengeFor(selectedChallenge);
  $("home-summary").innerHTML = `${selectedCrew} pilots · ${challenge.difficulty} · Exact server-timed records<br>Solo practice available. No download required.`;
  $("room-contract").textContent = `${challenge.difficulty} / ${challenge.name} · ${selectedCrew} pilots · ${rolesFor(selectedCrew).map(item => item.name).join(" + ")}`;
  $("lobby-footnote").textContent = `The host starts when every active team has all ${selectedCrew} roles. Assignments lock at countdown; reconnecting pilots resume their original role.`;
}

document.querySelectorAll<HTMLButtonElement>("[data-home-challenge], [data-lobby-challenge]").forEach(button => {
  button.onclick = () => setMode(Number(button.dataset.homeChallenge ?? button.dataset.lobbyChallenge), selectedCrew, true);
});
document.querySelectorAll<HTMLButtonElement>("[data-home-crew], [data-lobby-crew]").forEach(button => {
  button.onclick = () => setMode(selectedChallenge, Number(button.dataset.homeCrew ?? button.dataset.lobbyCrew), true);
});

function enter() {
  playing = true; finishShown = false; lastStage = 0; lastFalls = 0; lastMistakes = 0;
  document.body.classList.add("playing");
  document.body.dataset.challenge = String(selectedChallenge);
  scene.setChallenge(selectedChallenge); scene.setFollow(true);
  ($("lobby") as HTMLDialogElement).close();
  updateCourseUI();
}

function startPractice() {
  if (conn && roomCode) void conn.reducers.leave({}).catch(() => {});
  roomCode = ""; practice = true; body = createBody(selectedChallenge, selectedCrew);
  bodies.clear(); bodies.set(0, body); myTeam = 0; keys.clear(); enter(); drawRoles();
  $("mode-label").textContent = `${challengeFor(selectedChallenge).difficulty.toUpperCase()} / ${selectedCrew}-PILOT PRACTICE`;
  $("race-status").textContent = `${selectedCrew - 1} AI TEAMMATES · YOUR ROLE IS LOCKED`;
  $("standings").textContent = "";
  toast(rolesFor(selectedCrew)[role].help); beep();
}

$("practice").onclick = startPractice;
$("sound").onclick = () => {
  muted = !muted; $("sound").textContent = muted ? "Sound off" : "Sound on"; toast(muted ? "Sound off" : "Sound on");
};
$("help").onclick = () => modal("help-dialog");
$("exit").onclick = () => {
  if (conn && roomCode) void conn.reducers.leave({}).catch(() => {});
  playing = false; practice = false; roomCode = ""; keys.clear(); document.body.classList.remove("playing");
  scene.setFollow(false); body = createBody(selectedChallenge, selectedCrew); bodies.clear(); bodies.set(0, body);
  $("countdown").textContent = ""; updateModeControls(); drawRoles();
};
$("again").onclick = () => { ($("finish-dialog") as HTMLDialogElement).close(); practice ? startPractice() : modal("lobby"); };

function connectionError(message: string) {
  ready = false; $("connection").textContent = "MULTIPLAYER OFFLINE";
  $("network-error").textContent = `Multiplayer unavailable: ${message}. Solo practice is available.`;
  $("leader-list").textContent = "Unable to load verified results. The multiplayer server is unavailable.";
  ($("join") as HTMLButtonElement).disabled = false;
  if (playing && !practice) toast("Disconnected. Race input is paused. Open the lobby to reconnect.");
}

function adoptRoomConfig(challenge: number, crewSize: number) {
  if (!isChallenge(challenge) || !isCrewSize(crewSize)) return;
  selectedChallenge = challenge; selectedCrew = crewSize;
  if (role >= rolesFor(selectedCrew).length) role = rolesFor(selectedCrew).length - 1;
  scene.setChallenge(selectedChallenge); updateModeControls(); drawRoles(); updateCourseUI(); updateHelp();
}

function ensureConnection() {
  if (ready) return;
  if (conn) conn.disconnect();
  $("connection").textContent = "CONNECTING"; $("network-error").textContent = "Connecting to SpacetimeDB…";
  conn = connect(c => {
    conn = c; ready = true; $("connection").textContent = "SPACETIMEDB CONNECTED"; $("network-error").textContent = "";
    const me = c.identity && c.db.player.id.find(c.identity);
    if (me && !practice) {
      roomCode = me.room; role = me.role;
      const room = c.db.room.id.find(me.room);
      if (room) adoptRoomConfig(room.challenge, room.crewSize);
      ($("code") as HTMLInputElement).value = me.room; ($("name") as HTMLInputElement).value = me.name;
      ($("team") as HTMLSelectElement).value = String(me.team);
      if (!me.online) void c.reducers.join({ code: me.room, name: me.name, teamNumber: me.team, role: me.role, challenge: selectedChallenge, crewSize: selectedCrew, ruleset: RULESET }).catch(error => toast(String(error)));
    }
    refresh();
  }, refresh, connectionError);
}

$("room-panel").onclick = () => { if (practice) $("exit").click(); modal("lobby"); if (!ready) ensureConnection(); };
$("open-lobby").onclick = () => { modal("lobby"); ensureConnection(); };
$("leaders").onclick = () => {
  leaderboardChallenge = selectedChallenge; leaderboardCrew = selectedCrew; updateLeaderboardFilters();
  modal("leader-dialog"); ensureConnection(); refresh();
};
$("invite").onclick = async () => {
  const url = new URL(location.href);
  url.searchParams.set("room", ($("code") as HTMLInputElement).value.toUpperCase());
  try { await navigator.clipboard.writeText(url.href); toast("Invite link copied. Send it to your crew."); }
  catch { toast("Room code: " + ($("code") as HTMLInputElement).value); }
};

function syncKnownRoom() {
  if (!ready || !conn || joinedRoom()) return;
  const code = ($("code") as HTMLInputElement).value.trim().toUpperCase();
  const room = conn.db.room.id.find(code);
  if (room) {
    adoptRoomConfig(room.challenge, room.crewSize);
    $("room-contract").textContent = `ROOM SETUP · ${challengeFor(room.challenge).difficulty} / ${challengeFor(room.challenge).name} · ${room.crewSize} pilots`;
  }
}
$("code").addEventListener("input", syncKnownRoom);
$("part").addEventListener("change", event => selectRole(Number((event.currentTarget as HTMLSelectElement).value)));

$("join").onclick = async () => {
  if (!ready) { ensureConnection(); toast("Connecting… press Join room once connected."); return; }
  const name = ($("name") as HTMLInputElement).value.trim();
  if (!name) { $("network-error").textContent = "Choose a callsign first."; return; }
  try {
    const code = ($("code") as HTMLInputElement).value.trim().toUpperCase();
    const knownRoom = conn!.db.room.id.find(code);
    if (knownRoom) adoptRoomConfig(knownRoom.challenge, knownRoom.crewSize);
    await conn!.reducers.join({ code, name, teamNumber: Number(($("team") as HTMLSelectElement).value), role: Number(($("part") as HTMLSelectElement).value), challenge: selectedChallenge, crewSize: selectedCrew, ruleset: RULESET });
    roomCode = code; role = Number(($("part") as HTMLSelectElement).value); practice = false; refresh(); beep();
  } catch (error) { $("network-error").textContent = String(error); }
};
$("start").onclick = async () => { try { await conn!.reducers.start({}); } catch (error) { $("network-error").textContent = String(error); } };

function updateLeaderboardFilters() {
  document.querySelectorAll<HTMLButtonElement>("[data-leader-crew]").forEach(button => {
    const active = Number(button.dataset.leaderCrew) === leaderboardCrew;
    button.setAttribute("aria-selected", String(active)); button.classList.toggle("active", active);
  });
  document.querySelectorAll<HTMLButtonElement>("[data-leader-challenge]").forEach(button => {
    const active = Number(button.dataset.leaderChallenge) === leaderboardChallenge;
    button.setAttribute("aria-selected", String(active)); button.classList.toggle("active", active);
  });
  const challenge = challengeFor(leaderboardChallenge);
  $("leader-description").textContent = `${leaderboardCrew}-player ${challenge.difficulty} records · ${challenge.name} · Lower is better · Millisecond precision`;
}
document.querySelectorAll<HTMLButtonElement>("[data-leader-crew]").forEach(button => {
  button.onclick = () => { const size = Number(button.dataset.leaderCrew); if (isCrewSize(size)) leaderboardCrew = size; updateLeaderboardFilters(); refresh(); };
});
document.querySelectorAll<HTMLButtonElement>("[data-leader-challenge]").forEach(button => {
  button.onclick = () => { const challenge = Number(button.dataset.leaderChallenge); if (isChallenge(challenge)) leaderboardChallenge = challenge; updateLeaderboardFilters(); refresh(); };
});

function refresh() {
  if (!ready || !conn) return;
  const players = [...conn.db.player.iter()];
  const me = players.find(player => player.id.isEqual(conn!.identity!));
  if (me && me.online && roomCode && !practice) {
    roomCode = me.room; myTeam = me.team;
    const room = conn.db.room.id.find(roomCode);
    if (room) adoptRoomConfig(room.challenge, room.crewSize);
    if (assignmentLocked()) role = me.role;
    drawRoles();
    const roles = rolesFor(selectedCrew);
    const members = players.filter(player => player.room === roomCode);
    $("members").replaceChildren(...members.map(player => {
      const element = document.createElement("div");
      element.textContent = `T${player.team + 1} · ${roles[player.role]?.name ?? "Unknown role"} — ${player.name}${player.online ? "" : " · DISCONNECTED / RESERVED"}`;
      return element;
    }));
    $("start").hidden = !room?.host.isEqual(conn.identity!);
    $("start").textContent = room?.state === "finished" ? "Race again" : "Start race";
    roles.forEach((_, index) => { $("pilot-" + index).textContent = members.find(player => player.team === myTeam && player.role === index)?.name || "NEEDED BEFORE START"; });
    const locked = assignmentLocked();
    ($("join") as HTMLButtonElement).disabled = locked;
    for (const id of ["team", "code", "name"]) ($(id) as HTMLInputElement | HTMLSelectElement).disabled = locked;
    const activeTeams = [...new Set(members.filter(player => player.online).map(player => player.team))];
    const crewReady = activeTeams.length > 0 && activeTeams.every(team => roles.every((_, roleIndex) => members.some(player => player.team === team && player.role === roleIndex && player.online)));
    ($("start") as HTMLButtonElement).disabled = locked || !crewReady;
    $("start").title = crewReady ? `All ${selectedCrew} roles connected` : `Every active team needs ${selectedCrew} connected pilots`;
    updateModeControls();

    if (room && room.state !== "lobby" && !practice) {
      const nextMatch = `${room.id}:${room.startAt}`;
      if (!playing || matchKey !== nextMatch) { matchKey = nextMatch; enter(); ($("finish-dialog") as HTMLDialogElement).close(); }
      $("mode-label").textContent = `${challengeFor(selectedChallenge).difficulty.toUpperCase()} · TEAM ${myTeam + 1} / ROOM ${roomCode}`;
      $("race-status").textContent = room.state.toUpperCase();
      const teams = [...conn.db.team.iter()].filter(team => team.room === roomCode && members.some(player => player.team === team.number)).sort((a, b) => (a.finishMs || Infinity) - (b.finishMs || Infinity));
      bodies.clear();
      const decodedTeams = teams.flatMap(team => {
        const snapshot = decodeSnapshot(team.body, { version: room.ruleset, challenge: room.challenge, crewSize: room.crewSize });
        if (!snapshot.ok) return [];
        bodies.set(team.number, snapshot.body);
        return [{ team, body: snapshot.body }];
      });
      body = bodies.get(myTeam) || body;
      $("standings").replaceChildren(...decodedTeams.map(({ team, body: teamBody }) => {
        const element = document.createElement("div");
        element.textContent = `TEAM ${team.number + 1} · ${team.finishMs ? formatTime(team.finishMs) : `${teamBody.stage}/${challengeFor(teamBody.challenge).stages.length} objectives`}`;
        return element;
      }));
      if (room.state === "finished" && !body.finished && !finishShown) {
        finishShown = true; toast("Race ended. No finish recorded for your team. Open the lobby for a rematch.");
      }
    }
  }

  const results = [...conn.db.result.iter()]
    .filter(result => result.ruleset === RULESET && result.crewSize === leaderboardCrew && result.challenge === leaderboardChallenge)
    .sort((a, b) => a.timeMs - b.timeMs).slice(0, 15);
  $("leader-list").replaceChildren(...results.map((result, index) => {
    const row = document.createElement("div"); row.className = "leader-row";
    const rank = document.createElement("span"); rank.textContent = String(index + 1).padStart(2, "0");
    const names = document.createElement("span"); names.textContent = result.names;
    const time = document.createElement("strong"); time.textContent = formatTime(result.timeMs);
    row.append(rank, names, time); return row;
  }));
  if (!results.length) $("leader-list").textContent = `No ${leaderboardCrew}-player ${challengeFor(leaderboardChallenge).difficulty} finishes yet. Your crew can set the first exact time.`;
}

function input(): Input {
  if (document.querySelector("dialog[open]")) return { x: 0, z: 0, action: false };
  return {
    x: (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0),
    z: (keys.has("w") || keys.has("arrowup") ? 1 : 0) - (keys.has("s") || keys.has("arrowdown") ? 1 : 0),
    action: keys.has(" "),
  };
}

window.addEventListener("keydown", event => {
  if (document.querySelector("dialog[open]")) return;
  const key = event.key.toLowerCase();
  if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) event.preventDefault();
  keys.add(key);
});
window.addEventListener("keyup", event => keys.delete(event.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());
document.addEventListener("visibilitychange", () => keys.clear());
document.querySelectorAll<HTMLElement>("[data-key]").forEach(element => {
  element.onpointerdown = event => { element.setPointerCapture(event.pointerId); keys.add(element.dataset.key!); };
  element.onpointerup = element.onpointercancel = () => keys.delete(element.dataset.key!);
});

setInterval(() => {
  if (playing && !practice && ready && roomCode && conn?.db.room.id.find(roomCode)?.state === "racing") void conn.reducers.input(input()).catch(error => toast(String(error)));
}, 50);

function updateActionLabel() {
  const button = document.querySelector<HTMLButtonElement>(".touch .grab");
  if (!button) return;
  const stage = challengeFor(selectedChallenge).stages[body.stage];
  if (stage?.kind === "finalTiming") button.textContent = "SYNC";
  else if (stage?.kind === "duck" && (selectedCrew === 3 ? role === 1 : role === 2)) button.textContent = "BEND";
  else button.textContent = rolesFor(selectedCrew)[role]?.action ?? "ACT";
}

function roleFeedback() {
  const stage = challengeFor(body.challenge).stages[body.stage];
  if (!stage) return "Course complete";
  if (stage.kind === "finalTiming") return isFinalAligned(body.ticks) ? "ALIGN · every pilot ACT now" : "WAIT · watch the launch rings";
  if (body.crewSize === 3) {
    if (role === 0) return securelyHeld(body) ? "BOTH HANDS SECURE" : `LEFT ${body.handGrip[0] >= 0 ? "HELD" : "OPEN"} · RIGHT ${body.handGrip[1] >= 0 ? "HELD" : "OPEN"}`;
    if (role === 1) return body.bend ? "BENT LOW · keep moving" : body.brace ? "BRACED · absorbing movement" : "Hold ACT to brace or bend";
    return stage.kind === "switches" ? `BOTH SWITCHES ${Math.round(Math.min(...body.feet) * 100)}%` : "Drive both feet · coordinate pace with Torso";
  }
  if (role < 2) return body.handGrip[role] >= 0 ? `${role ? "RIGHT" : "LEFT"} HAND HOLDING · match the other hand` : `${role ? "RIGHT" : "LEFT"} HAND OPEN · move into contact`;
  if (role === 2) return body.bend ? "BENT LOW · keep moving" : body.brace ? "BRACED · stabilizing the crew" : "Hold ACT to brace or bend";
  const foot = role - 3;
  return stage.kind === "switches" ? `${foot ? "RIGHT" : "LEFT"} SWITCH ${Math.round(body.feet[foot] * 100)}%` : `Drive the ${foot ? "right" : "left"} foot · match the other leg`;
}

let previous = performance.now(), accumulator = 0;
function frame(timestamp: number) {
  const delta = Math.min((timestamp - previous) / 1000, 0.1); previous = timestamp; accumulator += delta;
  if (playing && practice && !document.querySelector("dialog[open]")) {
    while (accumulator >= 1 / 30) { step(body, practiceInputs(body, role, input())); accumulator -= 1 / 30; }
  } else accumulator = 0;
  if (playing) {
    const challenge = challengeFor(body.challenge), stage = challenge.stages[body.stage];
    let milliseconds = elapsedMs(body);
    if (!practice && conn && roomCode) {
      const room = conn.db.room.id.find(roomCode);
      if (room) {
        const start = Number(room.startAt / 1000n), remaining = Math.ceil((start - Date.now()) / 1000);
        $("countdown").textContent = room.state === "countdown" && remaining > 0 ? String(remaining) : "";
        milliseconds = room.state === "countdown" ? 0 : Math.max(0, Date.now() - start) + body.penaltyMs;
        const team = conn.db.team.id.find(`${roomCode}:${myTeam}`);
        if (team?.finishMs) milliseconds = team.finishMs;
      }
    }
    $("timer").textContent = formatTime(milliseconds);
    $("objective-title").textContent = body.finished ? "MISSION COMPLETE" : `${body.stage + 1} / ${challenge.stages.length} · ${stage.name}`;
    $("objective-hint").textContent = stage?.hint ?? "Your crew made it home.";
    ($("objective-progress") as HTMLProgressElement).value = body.finished ? 1 : stageProgressValue(body);
    $("objective-panel").dataset.stage = String(body.stage);
    $("role-feedback").textContent = roleFeedback();
    const aligned = stage?.kind === "finalTiming" && isFinalAligned(body.ticks);
    $("sync-signal").textContent = stage?.kind === "finalTiming" ? aligned ? "ALIGN · ACT" : "WAIT FOR ALIGN" : `${challenge.fallPenaltyMs / 1000}s FALL PENALTY`;
    $("sync-signal").classList.toggle("aligned", Boolean(aligned));
    challenge.stages.forEach((_, index) => {
      $("stage-" + index).classList.toggle("current", body.stage === index);
      $("stage-" + index).classList.toggle("complete", body.stage > index);
    });
    updateActionLabel();
    if (body.stage > lastStage) { lastStage = body.stage; beep(650); toast(challenge.stages[body.stage]?.hint ?? `All ${challenge.stages.length} objectives cleared!`); }
    if (body.falls > lastFalls) { lastFalls = body.falls; beep(180); toast(`Back to your checkpoint. +${challenge.fallPenaltyMs / 1000} second fall penalty.`); }
    if (body.mistakes > lastMistakes) { lastMistakes = body.mistakes; beep(130); toast(`Missed launch window. +${challenge.timingPenaltyMs / 1000} seconds. Reset and resync.`); }
    if (body.finished && !finishShown) {
      finishShown = true; $("finish-time").textContent = formatTime(milliseconds);
      $("finish-label").textContent = practice ? "PRACTICE COMPLETE / UNRANKED" : "VERIFIED TEAM FINISH";
      $("finish-detail").textContent = `${challenge.difficulty} · ${selectedCrew} pilots · ${body.falls} falls · ${body.mistakes} timing mistakes · ${(body.penaltyMs / 1000).toFixed(0)}s total penalties. ${practice ? "Bring your crew and turn coordination into competition." : "Saved to the matching persistent leaderboard."}`;
      modal("finish-dialog");
    }
  }
  scene.update(bodies, myTeam, timestamp / 1000);
  requestAnimationFrame(frame);
}

updateModeControls(); drawRoles(); updateCourseUI(); updateHelp(); updateLeaderboardFilters();
ensureConnection(); requestAnimationFrame(frame);
const invited = new URL(location.href).searchParams.get("room");
if (invited) { ($("code") as HTMLInputElement).value = invited; modal("lobby"); ensureConnection(); }
