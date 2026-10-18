"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
export default function PosScene({
  playing,
  run,
}: {
  playing: boolean;
  run: number;
}) {
  const mount = useRef<HTMLDivElement>(null);
  const active = useRef(playing);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [status, setStatus] = useState("Cargando modelo 3D…");
  useEffect(() => {
    active.current = playing;
    if (playing) mixerRef.current?.setTime(0);
  }, [playing, run]);
  useEffect(() => {
    if (!mount.current) return;
    const host = mount.current;
    let disposed = false;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setStatus(
        "La vista 3D no está disponible. Puedes continuar con el pago de prueba.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    controls.maxPolarAngle = Math.PI * 0.85;
    scene.add(new THREE.HemisphereLight(0xdbeaff, 0x5a6173, 3));
    const key = new THREE.DirectionalLight(0xffffff, 4);
    key.position.set(3, 6, 4);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9f8cff, 3);
    fill.position.set(-4, 2, -3);
    scene.add(fill);
    let root: THREE.Group | undefined;
    const release = (object: THREE.Object3D) =>
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          mats.forEach((mat) => {
            Object.values(mat).forEach((value) => {
              if (value instanceof THREE.Texture) value.dispose();
            });
            mat.dispose();
          });
        }
      });
    new GLTFLoader().load(
      "/models/pos/scene.gltf",
      (gltf) => {
        if (disposed) {
          release(gltf.scene);
          return;
        }
        root = gltf.scene;
        const box = new THREE.Box3().setFromObject(root);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const wrapper = new THREE.Group();
        const scale = 2.8 / Math.max(size.x, size.y, size.z);
        root.position.sub(center);
        wrapper.add(root);
        wrapper.scale.setScalar(scale);
        scene.add(wrapper);
        camera.position.set(3, 2.4, 4.2);
        controls.target.set(0, 0, 0);
        controls.update();
        if (gltf.animations.length) {
          const mixer = new THREE.AnimationMixer(root);
          mixerRef.current = mixer;
          gltf.animations.forEach((clip) => {
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
            action.play();
          });
          mixer.setTime(0);
        }
        setStatus("");
      },
      undefined,
      () => {
        if (!disposed)
          setStatus(
            "No se pudo cargar el modelo. El simulador sigue disponible.",
          );
      },
    );
    const resize = () => {
      const w = host.clientWidth,
        h = host.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();
    const clock = new THREE.Clock();
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const render = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      if (active.current && !reduced) mixerRef.current?.update(dt);
      controls.update();
      renderer.render(scene, camera);
      frame = requestAnimationFrame(render);
    };
    render();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      if (root) release(root);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);
  return (
    <div
      className="pos-scene"
      role="img"
      aria-label="Modelo tridimensional de un terminal POS. Arrastra para rotarlo."
    >
      <div className="pos-canvas" ref={mount} />
      {status && <div className="model-status">{status}</div>}
    </div>
  );
}
