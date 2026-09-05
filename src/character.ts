import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { Body } from "../shared/physics";

const UP = new THREE.Vector3(0, 1, 0);

function shade(color: THREE.ColorRepresentation, amount: number) {
  const result = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  result.getHSL(hsl);
  result.setHSL(
    hsl.h,
    Math.min(1, hsl.s * (amount < 0 ? 0.95 : 1)),
    Math.min(1, Math.max(0, hsl.l + amount)),
  );
  return result;
}

function enableShadows(mesh: THREE.Mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function setSegment(
  mesh: THREE.Mesh,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  direction: THREE.Vector3,
) {
  direction.copy(end).sub(start);
  const length = Math.max(direction.length(), 0.001);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.set(radius, length, radius);
  mesh.quaternion.setFromUnitVectors(UP, direction.multiplyScalar(1 / length));
}

export interface CharacterRig {
  root: THREE.Group;
  setVisible(visible: boolean): void;
  update(body: Body, time: number, preview: boolean): void;
}

/**
 * Imperative Three.js port of the supplied character kit. The game keeps its
 * six authoritative physics nodes; this rig derives the extra elbows, knees,
 * chest, pelvis and facial detail strictly as presentation.
 */
export function createCharacter(
  team: number,
  color: THREE.ColorRepresentation,
): CharacterRig {
  const root = new THREE.Group();
  root.name = `team-${team}-character`;

  const bodyColor = new THREE.Color(color);
  const materials = {
    body: new THREE.MeshStandardMaterial({
      color: bodyColor,
      roughness: 0.55,
      metalness: 0.05,
    }),
    dark: new THREE.MeshStandardMaterial({
      color: shade(bodyColor, -0.22),
      roughness: 0.7,
    }),
    skin: new THREE.MeshStandardMaterial({
      color: 0xffd9b8,
      roughness: 0.6,
    }),
    glove: new THREE.MeshStandardMaterial({
      color: 0xfffaf0,
      roughness: 0.5,
    }),
    shoe: new THREE.MeshStandardMaterial({
      color: 0x2b2a3a,
      roughness: 0.5,
    }),
    white: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
    }),
    black: new THREE.MeshStandardMaterial({
      color: 0x1c1b28,
      roughness: 0.4,
    }),
    blush: new THREE.MeshStandardMaterial({
      color: 0xff9db0,
      roughness: 1,
      transparent: true,
      opacity: 0.6,
    }),
    badge: new THREE.MeshStandardMaterial({
      color: shade(bodyColor, 0.28),
      roughness: 0.4,
      emissive: bodyColor,
      emissiveIntensity: 0.25,
    }),
    cargo: new THREE.MeshStandardMaterial({
      color: 0xffcc70,
      roughness: 0.35,
      metalness: 0.25,
    }),
    cell: new THREE.MeshStandardMaterial({
      color: 0x69d9ff,
      roughness: 0.28,
      metalness: 0.45,
      emissive: 0x123c56,
      emissiveIntensity: 0.45,
    }),
    core: new THREE.MeshStandardMaterial({
      color: 0xff7b68,
      roughness: 0.22,
      metalness: 0.5,
      emissive: 0x6b1821,
      emissiveIntensity: 0.55,
    }),
  };

  const chest = enableShadows(
    new THREE.Mesh(
      new RoundedBoxGeometry(0.92, 0.88, 0.56, 4, 0.14),
      materials.body,
    ),
  );
  const pelvis = enableShadows(
    new THREE.Mesh(
      new RoundedBoxGeometry(0.72, 0.4, 0.5, 4, 0.12),
      materials.dark,
    ),
  );
  root.add(chest, pelvis);

  const badge = new THREE.Mesh(
    new THREE.CircleGeometry(0.14, 24),
    materials.badge,
  );
  badge.position.set(0, 0.04, 0.286);
  chest.add(badge);

  const segmentGeometry = new THREE.CylinderGeometry(1, 1, 1, 14);
  const upperArms = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(segmentGeometry, materials.body)),
  );
  const forearms = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(segmentGeometry, materials.skin)),
  );
  const thighs = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(segmentGeometry, materials.body)),
  );
  const shins = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(segmentGeometry, materials.body)),
  );
  root.add(...upperArms, ...forearms, ...thighs, ...shins);

  const jointGeometry = new THREE.SphereGeometry(1, 14, 10);
  const elbows = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(jointGeometry, materials.skin)),
  );
  const knees = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(jointGeometry, materials.body)),
  );
  const hands = [0, 1].map(() =>
    enableShadows(new THREE.Mesh(jointGeometry, materials.glove)),
  );
  root.add(...elbows, ...knees, ...hands);
  elbows.forEach((mesh) => mesh.scale.setScalar(0.145));
  knees.forEach((mesh) => mesh.scale.setScalar(0.17));
  hands.forEach((mesh) => mesh.scale.set(0.23, 0.21, 0.23));

  const feet = [0, 1].map(() =>
    enableShadows(
      new THREE.Mesh(
        new RoundedBoxGeometry(0.43, 0.25, 0.68, 4, 0.11),
        materials.shoe,
      ),
    ),
  );
  root.add(...feet);

  const neck = enableShadows(new THREE.Mesh(segmentGeometry, materials.skin));
  root.add(neck);

  const head = new THREE.Group();
  const headBase = enableShadows(
    new THREE.Mesh(new THREE.SphereGeometry(0.43, 24, 18), materials.skin),
  );
  const hair = enableShadows(
    new THREE.Mesh(
      new THREE.SphereGeometry(
        0.35,
        18,
        12,
        0,
        Math.PI * 2,
        0,
        Math.PI * 0.52,
      ),
      materials.body,
    ),
  );
  hair.position.set(0, 0.3, -0.05);
  hair.rotation.x = 0.3;
  head.add(headBase, hair);

  const eyes = [-0.15, 0.15].map((x) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.105, 14, 10),
      materials.white,
    );
    eye.position.set(x, 0.055, 0.35);
    head.add(eye);
    return eye;
  });
  const pupils = [-0.15, 0.15].map((x) => {
    const pupil = new THREE.Mesh(
      new THREE.SphereGeometry(0.047, 10, 8),
      materials.black,
    );
    pupil.position.set(x, 0.055, 0.436);
    head.add(pupil);
    return pupil;
  });
  const brows = [-0.15, 0.15].map((x) => {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.025, 0.022),
      materials.black,
    );
    brow.position.set(x, 0.17, 0.375);
    head.add(brow);
    return brow;
  });
  const smile = new THREE.Mesh(
    new THREE.TorusGeometry(0.09, 0.015, 6, 16, Math.PI),
    materials.black,
  );
  smile.position.set(0, -0.12, 0.4);
  smile.rotation.z = Math.PI;
  const surprisedMouth = new THREE.Mesh(
    new THREE.SphereGeometry(0.065, 12, 10),
    materials.black,
  );
  surprisedMouth.position.set(0, -0.14, 0.395);
  const flatMouth = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.022, 0.02),
    materials.black,
  );
  flatMouth.position.set(0, -0.13, 0.414);
  const cheeks = [-0.26, 0.26].map((x) => {
    const cheek = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 8),
      materials.blush,
    );
    cheek.position.set(x, -0.06, 0.29);
    head.add(cheek);
    return cheek;
  });
  head.add(smile, surprisedMouth, flatMouth, ...cheeks);
  root.add(head);

  const payloads = [0, 1].map(() => {
    const group = new THREE.Group();
    const crate = enableShadows(
      new THREE.Mesh(
        new RoundedBoxGeometry(0.9, 0.9, 0.9, 3, 0.12),
        materials.cargo,
      ),
    );
    crate.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(crate.geometry),
        new THREE.LineBasicMaterial({ color: 0xfff3c4 }),
      ),
    );
    const cell = enableShadows(
      new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 18), materials.cell),
    );
    cell.rotation.z = Math.PI / 2;
    const core = enableShadows(
      new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), materials.core),
    );
    const coreRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.035, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0xffd1a5 }),
    );
    core.add(coreRing);
    group.add(crate, cell, core);
    root.add(group);
    return { group, crate, cell, core };
  });

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.8, 0.85, 48),
    new THREE.MeshBasicMaterial({
      color: bodyColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  root.add(ring);

  const torsoPosition = new THREE.Vector3();
  const headPosition = new THREE.Vector3();
  const handPositions = [new THREE.Vector3(), new THREE.Vector3()];
  const footPositions = [new THREE.Vector3(), new THREE.Vector3()];
  const shoulders = [new THREE.Vector3(), new THREE.Vector3()];
  const elbowsTarget = [new THREE.Vector3(), new THREE.Vector3()];
  const hips = [new THREE.Vector3(), new THREE.Vector3()];
  const kneesTarget = [new THREE.Vector3(), new THREE.Vector3()];
  const nodeTargets = Array.from({ length: 6 }, () => new THREE.Vector3());
  const payloadPositions = [new THREE.Vector3(), new THREE.Vector3()];
  const cargoTarget = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const offset = new THREE.Vector3();
  const neckStart = new THREE.Vector3();
  const neckEnd = new THREE.Vector3();
  let initialized = false;

  function readNode(target: THREE.Vector3, body: Body, index: number) {
    const node = body.nodes[index];
    nodeTargets[index].set(node.x, node.y, node.z);
    return initialized
      ? target.lerp(nodeTargets[index], 0.5)
      : target.copy(nodeTargets[index]);
  }

  function setExpression(body: Body, time: number) {
    const torsoNode = body.nodes[0];
    const falling = torsoNode.y < 1.15 || torsoNode.y - torsoNode.py < -0.16;
    const airborne = body.nodes[4].y > 0.72 && body.nodes[5].y > 0.72;
    const expression = body.finished
      ? 3
      : falling
        ? 2
        : body.brace || body.handGrip.some((grip) => grip >= 0)
          ? 1
          : airborne
            ? 3
            : 0;
    const blinking = (time + team * 0.73) % 3.6 < 0.11;
    const eyeOpen = expression === 3 ? 0.18 : blinking ? 0.1 : expression === 2 ? 1.35 : 1;
    eyes.forEach((eye) => eye.scale.set(1, eyeOpen, 1));
    pupils.forEach((pupil) => pupil.scale.setScalar(expression === 2 ? 0.65 : 1));
    smile.visible = expression === 0 || expression === 3;
    smile.scale.setScalar(expression === 3 ? 1.35 : 1);
    surprisedMouth.visible = expression === 2;
    flatMouth.visible = expression === 1;
    const browAngle = expression === 1 ? 0.5 : expression === 2 ? -0.35 : expression === 3 ? -0.15 : 0.1;
    const browY = expression === 2 ? 0.21 : 0.17;
    brows[0].rotation.z = -browAngle;
    brows[1].rotation.z = browAngle;
    brows.forEach((brow) => (brow.position.y = browY));
  }

  return {
    root,
    setVisible(visible) {
      root.visible = visible;
    },
    update(body, time, preview) {
      readNode(torsoPosition, body, 0);
      readNode(headPosition, body, 1);
      readNode(handPositions[0], body, 2);
      readNode(handPositions[1], body, 3);
      readNode(footPositions[0], body, 4);
      readNode(footPositions[1], body, 5);

      chest.position.copy(torsoPosition).addScaledVector(UP, 0.1);
      chest.rotation.y = preview ? Math.PI : 0;
      pelvis.position.copy(torsoPosition).addScaledVector(UP, -0.42);
      pelvis.rotation.y = preview ? Math.PI : 0;
      neckStart.copy(torsoPosition).addScaledVector(UP, 0.42);
      neckEnd.copy(headPosition).addScaledVector(UP, -0.38);
      setSegment(neck, neckStart, neckEnd, 0.18, direction);
      head.position.copy(headPosition);
      head.rotation.y = body.look + (preview ? Math.PI : 0);
      setExpression(body, time);

      for (let side = 0; side < 2; side++) {
        const sign = side === 0 ? -1 : 1;
        shoulders[side]
          .copy(torsoPosition)
          .add(offset.set(sign * 0.47, 0.28, 0));
        elbowsTarget[side]
          .copy(shoulders[side])
          .add(handPositions[side])
          .multiplyScalar(0.5)
          .add(offset.set(sign * 0.12, 0.03, -0.08));
        elbows[side].position.copy(elbowsTarget[side]);
        hands[side].position.copy(handPositions[side]);
        setSegment(
          upperArms[side],
          shoulders[side],
          elbowsTarget[side],
          0.13,
          direction,
        );
        setSegment(
          forearms[side],
          elbowsTarget[side],
          handPositions[side],
          0.115,
          direction,
        );

        hips[side]
          .copy(torsoPosition)
          .add(offset.set(sign * 0.22, -0.42, 0));
        kneesTarget[side]
          .copy(hips[side])
          .add(footPositions[side])
          .multiplyScalar(0.5)
          .add(offset.set(sign * 0.035, 0.03, -0.14));
        knees[side].position.copy(kneesTarget[side]);
        feet[side].position.copy(footPositions[side]);
        feet[side].position.y = Math.max(feet[side].position.y - 0.12, 0.14);
        feet[side].rotation.y = preview ? Math.PI : 0;
        setSegment(
          thighs[side],
          hips[side],
          kneesTarget[side],
          0.17,
          direction,
        );
        setSegment(
          shins[side],
          kneesTarget[side],
          footPositions[side],
          0.145,
          direction,
        );
      }

      payloads.forEach((payload, index) => {
        const object = body.objects[index];
        payload.group.visible = Boolean(object);
        if (!object) return;
        cargoTarget.set(object.x, object.y, object.z);
        if (initialized) payloadPositions[index].lerp(cargoTarget, 0.5);
        else payloadPositions[index].copy(cargoTarget);
        payload.group.position.copy(payloadPositions[index]);
        payload.group.rotation.y = time * (0.18 + index * 0.05);
        payload.crate.visible = body.challenge === 0;
        payload.cell.visible = body.challenge === 1;
        payload.core.visible = body.challenge === 2;
      });
      ring.position.set(torsoPosition.x, 0.06, torsoPosition.z);
      ring.scale.setScalar(body.brace ? 1.5 : 1);
      initialized = true;
    },
  };
}
