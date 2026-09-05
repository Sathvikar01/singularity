import * as THREE from "three";
import { type Body, LINKS } from "../shared/physics";
const COLORS = [0xff806e, 0x91dfc5, 0xa5a0ff, 0xffd17d];
export function createScene(container: HTMLElement) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#12212b");
  scene.fog = new THREE.FogExp2("#12212b", 0.012);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  container.append(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 200);
  camera.position.set(14, 14, -19);
  scene.add(new THREE.HemisphereLight(0xd7f8ff, 0x344556, 2.6));
  const sun = new THREE.DirectionalLight(0xffead6, 3.4);
  sun.position.set(-15, 28, 10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -30,
    right: 30,
    top: 60,
    bottom: -30,
    far: 100,
  });
  sun.shadow.bias = -0.0005;
  scene.add(sun);
  const mint = new THREE.PointLight(0x93ffdc, 35, 30);
  mint.position.set(0, 7, 5);
  scene.add(mint);
  const mat = (color: number, metalness = 0.05, roughness = 0.6) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });
  const dark = mat(0x273b45),
    floor = mat(0xcedbd5),
    coral = mat(0xff806e),
    accent = mat(0x96e9cd);
  function box(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    m: THREE.Material,
  ) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  function label(
    text: string,
    x: number,
    y: number,
    z: number,
    color = "#a4edda",
    scale = 3,
  ) {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 128;
    const c = canvas.getContext("2d")!;
    c.fillStyle = color;
    c.font = "700 48px sans-serif";
    c.textAlign = "center";
    c.fillText(text, 256, 75);
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        depthWrite: false,
      }),
    );
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, scale / 4, 1);
    scene.add(sprite);
    return sprite;
  }
  // Suspended industrial islands, a narrow balance bridge, delivery bay and sweepers.
  for (const [z, d] of [
    [1, 12],
    [21, 12],
    [36, 18],
  ]) {
    box(9.2, 0.7, d, 0, -0.4, z, floor);
    box(9.6, 0.2, d + 0.3, 0, -0.85, z, dark);
    for (const x of [-4.4, 4.4]) {
      box(0.09, 0.03, d - 0.4, x, 0.015, z, accent);
      for (let k = z - d / 2 + 1; k < z + d / 2; k += 2)
        box(0.2, 0.025, 0.5, x, 0.03, k, coral);
    }
    for (const x of [-3.5, 3.5]) box(0.6, 2, 0.6, x, -1.7, z, dark);
  }
  box(2.6, 0.4, 8, 0, -0.2, 11, dark);
  for (let z = 7; z < 15; z += 0.8) box(2.5, 0.04, 0.06, 0, 0.03, z, accent);
  for (const z of [0, 15, 28, 42]) {
    for (let x = -4; x < 4; x += 0.55)
      box(0.28, 0.025, 0.4, x, 0.03, z, z === 42 ? dark : accent);
  }
  for (const [z, title] of [
    [6, "01  /  THE CROSSING"],
    [17, "02  /  SPECIAL DELIVERY"],
    [29, "03  /  SWEEP STAKES"],
  ] as const) {
    label(title, 0, 4.6, z, "#c5f8e9", 5.5);
  }
  box(4, 0.05, 3, 0, 0.04, 25.5, accent);
  label("CARGO DROP", 0, 0.7, 26, "#ffffff", 2.8);
  for (const x of [-3.8, 3.8]) {
    box(0.3, 6, 0.3, x, 3, 42, dark);
    box(0.1, 5.5, 0.34, x, 3, 41.98, accent);
  }
  box(8, 0.6, 0.5, 0, 6, 42, dark);
  label("FINISH", 0, 6, 41.6, "#b7ffe2", 4);
  const sweeper = box(0.6, 1.1, 6, 0, 1.1, 33.5, coral);
  box(9, 0.16, 0.3, 0, 0.1, 33.5, dark);
  for (let i = 0; i < 70; i++) {
    const angle = i * 2.399;
    const radius = 20 + (i % 9) * 3;
    const rock = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.3 + (i % 5) * 0.24, 0),
      dark,
    );
    rock.position.set(
      Math.cos(angle) * radius,
      -3 - (i % 7) * 1.5,
      Math.sin(angle) * radius + 20,
    );
    rock.rotation.set(i, i * 0.3, 0);
    scene.add(rock);
  }
  const starGeo = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i < 300; i++)
    points.push(
      Math.sin(i * 12.989) * 90,
      10 + (i % 30),
      Math.cos(i * 7.23) * 90,
    );
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: 0x8ca9b8,
        size: 0.065,
        transparent: true,
        opacity: 0.65,
      }),
    ),
  );
  const robots = new Map<
    number,
    {
      nodes: THREE.Mesh[];
      links: THREE.Mesh[];
      cube: THREE.Mesh;
      eyes: THREE.Group;
      ring: THREE.Mesh;
    }
  >();
  function robot(id: number) {
    const material = mat(COLORS[id % 4], 0.2, 0.37);
    const joints = mat(0x293c49, 0.3, 0.4);
    const nodes = Array.from({ length: 6 }, (_, i) => {
      const geometry =
        i === 0
          ? new THREE.CapsuleGeometry(0.43, 0.55, 6, 12)
          : i === 1
            ? new THREE.SphereGeometry(0.47, 20, 16)
            : new THREE.SphereGeometry(i >= 4 ? 0.3 : 0.27, 14, 12);
      const m = new THREE.Mesh(
        geometry,
        i === 0 || i === 1 ? material : joints,
      );
      scene.add(m);
      m.castShadow = true;
      return m;
    });
    const links = LINKS.slice(0, 5).map(() => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.18, 1, 12),
        material,
      );
      m.castShadow = true;
      scene.add(m);
      return m;
    });
    const eyes = new THREE.Group();
    for (const x of [-0.17, 0.17]) {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xeefff5 }),
      );
      eye.position.set(x, 0.05, 0.4);
      eyes.add(eye);
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 10, 10),
        joints,
      );
      pupil.position.set(x, 0.05, 0.505);
      eyes.add(pupil);
    }
    scene.add(eyes);
    const cube = box(0.9, 0.9, 0.9, 0, 0.5, 18, mat(0xffcc70, 0.25, 0.35));
    const frame = new THREE.LineSegments(
      new THREE.EdgesGeometry(cube.geometry),
      new THREE.LineBasicMaterial({ color: 0xfff3c4 }),
    );
    cube.add(frame);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.8, 0.85, 48),
      new THREE.MeshBasicMaterial({
        color: COLORS[id % 4],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    const r = { nodes, links, cube, eyes, ring };
    robots.set(id, r);
    return r;
  }
  const v = new THREE.Vector3(),
    up = new THREE.Vector3(0, 1, 0),
    look = new THREE.Vector3(0, 1, 6);
  let follow = false;
  function update(bodies: Map<number, Body>, selected: number, time: number) {
    for (const [id, r] of robots) {
      const visible = bodies.has(id);
      [...r.nodes, ...r.links, r.cube, r.eyes, r.ring].forEach(
        (o) => (o.visible = visible),
      );
    }
    for (const [id, b] of bodies) {
      const r = robots.get(id) || robot(id);
      b.nodes.forEach((p, i) =>
        r.nodes[i].position.lerp(v.set(p.x, p.y, p.z), 0.5),
      );
      r.links.forEach((m, i) => {
        const [a, c] = LINKS[i],
          p = r.nodes[a].position,
          q = r.nodes[c].position;
        m.position.copy(p).add(q).multiplyScalar(0.5);
        v.copy(q).sub(p);
        m.scale.y = v.length();
        m.quaternion.setFromUnitVectors(up, v.normalize());
      });
      r.eyes.position.copy(r.nodes[1].position);
      r.eyes.rotation.y = b.look + (follow ? 0 : Math.PI);
      r.cube.position.lerp(v.set(b.cube.x, b.cube.y, b.cube.z), 0.5);
      r.cube.rotation.y = time * 0.2;
      r.ring.position.set(b.nodes[0].x, 0.06, b.nodes[0].z);
      r.cube.visible = !b.delivered;
    }
    const b = bodies.get(selected);
    if (b && follow) {
      const p = b.nodes[0];
      camera.position.lerp(v.set(p.x + 10, 10, p.z - 15), 0.035);
      look.lerp(v.set(p.x, 1, p.z + 5), 0.04);
    } else {
      camera.position.lerp(v.set(14, 14, -19), 0.025);
      look.lerp(v.set(0, 1, 8), 0.03);
    }
    camera.lookAt(look);
    sweeper.position.x = b
      ? Math.sin((b.ticks / 30) * 1.8) * 3.6
      : Math.sin(time * 1.8) * 3.6;
    renderer.render(scene, camera);
  }
  const resize = () => {
    const w = container.clientWidth,
      h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener("resize", resize);
  resize();
  return { update, setFollow: (f: boolean) => (follow = f) };
}
