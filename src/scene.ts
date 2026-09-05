import * as THREE from "three";
import {
  CHALLENGE,
  courseFor,
  finalAlignment,
  hazardX,
  isFinalAligned,
  platformCenter,
  type ChallengeId,
  type CoursePalette,
} from "../shared/course.ts";
import type { Body } from "../shared/physics";
import { createCharacter, type CharacterRig } from "./character";

const TEAM_COLORS = [0xff806e, 0x91dfc5, 0xa5a0ff, 0xffd17d];

type MovingPlatform = { mesh: THREE.Mesh; z: number };
type CourseRig = {
  group: THREE.Group;
  barriers: THREE.Mesh[];
  hazards: THREE.Mesh[];
  movingPlatforms: MovingPlatform[];
  relays: THREE.Mesh[];
  footPads: THREE.Mesh[];
  finalRing?: THREE.Group;
};

export function createScene(container: HTMLElement) {
  const scene = new THREE.Scene();
  const initialPalette = courseFor(CHALLENGE.Easy).palette;
  scene.background = new THREE.Color(initialPalette.background);
  scene.fog = new THREE.FogExp2(initialPalette.fog, 0.012);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.23;
  container.append(renderer.domElement);

  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 220);
  camera.position.set(14, 14, -19);
  const hemisphere = new THREE.HemisphereLight(0xd7f8ff, 0x344556, 2.7);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight(0xffead6, 3.4);
  sun.position.set(-15, 28, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 90, bottom: -30, far: 140 });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const courseLight = new THREE.PointLight(0x93ffdc, 42, 42);
  courseLight.position.set(0, 8, 7);
  scene.add(courseLight);

  const material = (color: number, metalness = 0.05, roughness = 0.6) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const makeBox = (
    group: THREE.Group,
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    meshMaterial: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), meshMaterial);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const makeLabel = (
    group: THREE.Group,
    text: string,
    x: number,
    y: number,
    z: number,
    color: string,
    scale = 4,
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 128;
    const context = canvas.getContext("2d")!;
    context.fillStyle = color;
    context.font = "700 46px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText(text.toUpperCase(), 384, 75, 720);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false }));
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, scale / 6, 1);
    group.add(sprite);
    return sprite;
  };

  function addGate(group: THREE.Group, z: number, finish: boolean, palette: CoursePalette) {
    const dark = material(palette.dark, 0.3, 0.52);
    const accent = material(palette.signal, 0.25, 0.35);
    for (const x of [-4, 4]) {
      makeBox(group, 0.3, 6, 0.3, x, 3, z, dark);
      makeBox(group, 0.08, 5.4, 0.34, x, 3, z - 0.01, accent);
    }
    makeBox(group, 8.3, 0.52, 0.42, 0, 6, z, dark);
    makeLabel(group, finish ? "finish" : "checkpoint", 0, 5.7, z - 0.26, `#${palette.signal.toString(16).padStart(6, "0")}`, 3.4);
  }

  function addStageLabels(group: THREE.Group, challenge: ChallengeId, color: string) {
    const { stages } = courseFor(challenge);
    stages.forEach((stage, index) => {
      const previous = stages[index - 1];
      const z = index === 0 ? Math.max(2, stage.gate - 3) : Math.max(previous.gate + 2, stage.gate - 4);
      makeLabel(group, `${String(index + 1).padStart(2, "0")} / ${stage.name}`, 0, 4.9, z, color, 5.5);
    });
  }

  function addBarriers(group: THREE.Group, challenge: ChallengeId, palette: CoursePalette) {
    return courseFor(challenge).stages.slice(0, -1).map(stage => {
      const barrierMaterial = new THREE.MeshBasicMaterial({ color: palette.signal, transparent: true, opacity: 0.2, depthWrite: false });
      return makeBox(group, 9.4, 3.4, 0.06, 0, 1.7, stage.gate, barrierMaterial);
    });
  }

  function addSpaceDebris(group: THREE.Group, dark: THREE.Material, length: number, seed = 0) {
    for (let index = 0; index < 76; index++) {
      const angle = index * 2.399 + seed;
      const radius = 20 + (index % 9) * 3;
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + (index % 5) * 0.24, 0), dark);
      rock.position.set(Math.cos(angle) * radius, -3 - (index % 7) * 1.5, Math.sin(angle) * radius + length / 2);
      rock.rotation.set(index, index * 0.3, 0);
      group.add(rock);
    }
  }

  function buildEasy(): CourseRig {
    const challenge = CHALLENGE.Easy;
    const course = courseFor(challenge);
    const palette = course.palette;
    const group = new THREE.Group();
    const floor = material(palette.floor), dark = material(palette.dark, 0.22, 0.48);
    const accent = material(palette.signal, 0.18, 0.4), hazard = material(palette.hazard, 0.08, 0.55);
    for (const { centerZ: z, depth, width, centerY } of course.foundations) {
      makeBox(group, width, 0.7, depth, 0, centerY, z, floor);
      makeBox(group, width + 0.4, 0.2, depth + 0.3, 0, -0.85, z, dark);
      for (const x of [-4.4, 4.4]) makeBox(group, 0.09, 0.04, depth - 0.4, x, 0.015, z, accent);
    }
    makeBox(group, 2.6, 0.4, 8, 0, -0.2, 11, dark);
    for (let z = 7; z < 15; z += 0.8) makeBox(group, 2.5, 0.04, 0.06, 0, 0.03, z, accent);
    const payload = course.payloads[0];
    const pad = makeBox(group, 4, 0.08, 3, payload.dock[0], 0.04, payload.dock[2], accent);
    makeLabel(group, payload.label, payload.dock[0], 0.7, payload.dock[2] + 0.3, "#ffffff", 2.8);
    const relayGates = course.stages.filter(stage => stage.kind === "relay" || stage.kind === "storm").map(stage => stage.gate);
    const relays = relayGates.flatMap(z => [-0.9, 0.9].map(x => makeBox(group, 0.45, 0.45, 0.45, x, 2.05, z, material(0xffcc70, 0.3, 0.28))));
    const switchGate = course.stages.find(stage => stage.kind === "switches")!.gate;
    const footPads = [-0.45, 0.45].map((x, index) => {
      makeLabel(group, index ? "R" : "L", x, 0.8, switchGate, "#b7ffe2", 0.7);
      return makeBox(group, 0.85, 0.06, 2.5, x, 0.05, switchGate, material(0x385c62));
    });
    const sweeperDefinition = course.hazards[0];
    const sweeper = makeBox(group, ...sweeperDefinition.size, 0, sweeperDefinition.y, sweeperDefinition.z, hazard);
    makeBox(group, 9, 0.16, 0.3, 0, 0.1, sweeperDefinition.z, dark);
    addGate(group, course.stages.at(-1)!.gate, true, palette);
    addStageLabels(group, challenge, palette.label);
    addSpaceDebris(group, dark, course.length, course.debrisSeed);
    group.userData.deliveryPad = pad;
    scene.add(group);
    return { group, barriers: addBarriers(group, challenge, palette), hazards: [sweeper], movingPlatforms: [], relays, footPads };
  }

  function buildMedium(): CourseRig {
    const challenge = CHALLENGE.Medium;
    const course = courseFor(challenge);
    const palette = course.palette;
    const group = new THREE.Group();
    const floor = material(palette.floor, 0.34, 0.5), dark = material(palette.dark, 0.5, 0.38);
    const accent = material(palette.signal, 0.3, 0.3), hazard = material(palette.hazard, 0.25, 0.4);
    for (const { centerZ: z, depth, width, centerY } of course.foundations) {
      makeBox(group, width, 0.68, depth, 0, centerY, z, floor);
      makeBox(group, width + 0.35, 0.18, depth + 0.2, 0, -0.85, z, dark);
    }
    for (let z = 50.7; z < 66; z += 1.7) {
      const x = Math.sin(z * 0.72) * 0.72;
      makeBox(group, 2.3, 0.52, 1.55, x, -0.28, z, floor);
      makeBox(group, 2.45, 0.12, 1.65, x, -0.62, z, accent);
    }
    for (let z = 11; z <= 20; z += 2.3) {
      makeBox(group, 8.8, 0.22, 0.22, 0, 2.72, z, hazard);
      for (const x of [-4.1, 4.1]) makeBox(group, 0.2, 2.72, 0.2, x, 1.36, z, dark);
    }
    makeLabel(group, "bend under blue", 0, 2.45, 15.5, "#d6f7ff", 3.2);
    const hazards = course.hazards.map(definition => makeBox(group, ...definition.size, 0, definition.y, definition.z, hazard));
    const movingPlatforms: MovingPlatform[] = [];
    for (const band of course.platformBands) {
      for (const z of band.renderZ) {
        const mesh = makeBox(group, ...band.renderSize, 0, band.renderY, z, floor);
        makeBox(group, 9.2, 0.12, 0.18, 0, -0.7, z, dark);
        movingPlatforms.push({ mesh, z });
      }
    }
    const payload = course.payloads[0];
    const pad = makeBox(group, 3, 0.08, 2.6, payload.dock[0], 0.04, payload.dock[2], accent);
    makeLabel(group, payload.label, payload.dock[0], 0.72, payload.dock[2], "#e4fbff", 3);
    addGate(group, course.stages.at(-1)!.gate, true, palette);
    addStageLabels(group, challenge, palette.label);
    addSpaceDebris(group, dark, course.length, course.debrisSeed);
    group.userData.deliveryPad = pad;
    scene.add(group);
    return { group, barriers: addBarriers(group, challenge, palette), hazards, movingPlatforms, relays: [], footPads: [] };
  }

  function buildDifficult(): CourseRig {
    const challenge = CHALLENGE.Difficult;
    const course = courseFor(challenge);
    const palette = course.palette;
    const group = new THREE.Group();
    const floor = material(palette.floor, 0.42, 0.43), dark = material(palette.dark, 0.56, 0.34);
    const accent = material(palette.signal, 0.4, 0.3), hazard = material(palette.hazard, 0.3, 0.38);
    for (const { centerZ: z, depth, width, centerY } of course.foundations) {
      makeBox(group, width, 0.7, depth, 0, centerY, z, floor);
      makeBox(group, width + 0.3, 0.16, depth + 0.2, 0, centerY - 0.44, z, dark);
    }
    makeBox(group, 8.6, 5.7, 0.48, 0, 2.45, 8.4, dark);
    const relays = [-0.9, 0.9].map(x => {
      const relay = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.08, 10, 28), accent);
      relay.position.set(x, 2.05, 8.05);
      group.add(relay);
      return relay;
    });
    for (let index = 0; index < 4; index++) {
      const z = 10.5 + index * 3;
      const height = 0.48 * (index + 1);
      makeBox(group, 4.4, height, 2.85, index % 2 ? 0.15 : -0.15, height / 2 - 0.02, z, index % 2 ? accent : floor);
    }
    const movingPlatforms: MovingPlatform[] = [];
    for (const band of course.platformBands) {
      for (const z of band.renderZ) {
        const mesh = makeBox(group, ...band.renderSize, 0, band.renderY, z, floor);
        const frame = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: palette.signal }));
        mesh.add(frame);
        movingPlatforms.push({ mesh, z });
      }
    }
    const hazards = course.hazards.map(definition => makeBox(group, ...definition.size, 0, definition.y, definition.z, hazard));
    for (const { dock: [x, , z], label: title } of course.payloads) {
      const socket = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 12, 32), accent);
      socket.rotation.x = Math.PI / 2;
      socket.position.set(x, 0.12, z);
      socket.castShadow = true;
      group.add(socket);
      makeLabel(group, title, x, 1.08, z, "#ffd6c4", 1.5);
    }
    const finalRing = new THREE.Group();
    for (let index = 0; index < 3; index++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.45 + index * 0.5, 0.06 + index * 0.015, 10, 64),
        new THREE.MeshStandardMaterial({ color: index === 1 ? palette.hazard : palette.signal, emissive: index === 1 ? palette.hazard : palette.signal, emissiveIntensity: 0.8 }),
      );
      ring.rotation.y = index * 0.75;
      finalRing.add(ring);
    }
    const finalGate = course.stages.at(-1)!.gate;
    finalRing.position.set(0, 2.4, finalGate);
    group.add(finalRing);
    makeLabel(group, "wait for align", 0, 5.35, finalGate - 2.5, "#ffd6c4", 4.2);
    addStageLabels(group, challenge, palette.label);
    addSpaceDebris(group, dark, course.length, course.debrisSeed);
    scene.add(group);
    return { group, barriers: addBarriers(group, challenge, palette), hazards, movingPlatforms, relays, footPads: [], finalRing };
  }

  const courses = [buildEasy(), buildMedium(), buildDifficult()] as const;
  const starGeometry = new THREE.BufferGeometry();
  const points: number[] = [];
  for (let index = 0; index < 420; index++) points.push(Math.sin(index * 12.989) * 100, 8 + (index % 36), Math.cos(index * 7.23) * 100 + 38);
  starGeometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x9fc8d5, size: 0.065, transparent: true, opacity: 0.65 })));

  const robots = new Map<number, CharacterRig>();
  function robot(id: number) {
    const rig = createCharacter(id, TEAM_COLORS[id % TEAM_COLORS.length]);
    scene.add(rig.root);
    robots.set(id, rig);
    return rig;
  }

  const vector = new THREE.Vector3();
  const look = new THREE.Vector3(0, 1, 6);
  let follow = false;
  let activeChallenge: ChallengeId = CHALLENGE.Easy;

  function showChallenge(challenge: number) {
    const next = courseFor(challenge).id;
    activeChallenge = next;
    courses.forEach((course, index) => { course.group.visible = index === next; });
    const theme = courseFor(next).palette;
    (scene.background as THREE.Color).setHex(theme.background);
    (scene.fog as THREE.FogExp2).color.setHex(theme.fog);
    courseLight.color.setHex(theme.signal);
    hemisphere.color.setHex(theme.hemisphere);
  }
  showChallenge(activeChallenge);

  function update(bodies: Map<number, Body>, selected: number, time: number) {
    for (const [id, rig] of robots) rig.setVisible(bodies.has(id));
    for (const [id, body] of bodies) (robots.get(id) || robot(id)).update(body, time, !follow);
    const body = bodies.get(selected);
    if (body && body.challenge !== activeChallenge) showChallenge(body.challenge);
    const course = courses[activeChallenge];
    const ticks = body?.ticks ?? Math.round(time * 30);
    course.hazards.forEach((mesh, index) => { mesh.position.x = hazardX(activeChallenge, index, ticks); });
    course.movingPlatforms.forEach(({ mesh, z }) => { mesh.position.x = platformCenter(activeChallenge, z, ticks); });
    course.barriers.forEach((mesh, index) => { mesh.visible = !body || body.stage <= index; });
    course.relays.forEach((relay, index) => {
      relay.rotation.y = time * (index % 2 ? -1 : 1);
      const material = relay.material as THREE.MeshStandardMaterial;
      material.emissive?.setHex(body && body.charge > 0 ? courseFor(activeChallenge).palette.signal : 0x4b2e19);
      material.emissiveIntensity = body ? 0.25 + body.charge : 0.25;
    });
    course.footPads.forEach((mesh, index) => {
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(body && (body.stage > 3 || body.feet[index] > 0) ? 0x91dfc5 : 0x385c62);
    });
    if (course.finalRing) {
      const alignment = finalAlignment(ticks);
      course.finalRing.rotation.z = time * 0.55;
      course.finalRing.children.forEach((child, index) => {
        child.rotation.y = time * (index % 2 ? -1.1 : 0.8) + index;
        const ringMaterial = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
        ringMaterial.emissiveIntensity = isFinalAligned(ticks) ? 2.2 : 0.45;
      });
      course.finalRing.scale.setScalar(1 + Math.max(0, Math.abs(alignment) - 0.8) * 0.25);
    }

    if (body && follow) {
      const torso = body.nodes[0];
      camera.position.lerp(vector.set(torso.x + 10, torso.y + 8.5, torso.z - 15), 0.035);
      look.lerp(vector.set(torso.x, torso.y * 0.35 + 0.7, torso.z + 5), 0.04);
    } else {
      const previewZ = activeChallenge === CHALLENGE.Difficult ? -17 : -19;
      camera.position.lerp(vector.set(14, 14, previewZ), 0.025);
      look.lerp(vector.set(0, 1.2, 8), 0.03);
    }
    camera.lookAt(look);
    renderer.render(scene, camera);
  }

  const resize = () => {
    const width = container.clientWidth, height = container.clientHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();

  return {
    update,
    setFollow(value: boolean) { follow = value; },
    setChallenge(value: number) { showChallenge(value); },
    getChallenge() { return courseFor(activeChallenge); },
  };
}
