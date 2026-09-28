import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const OceanHeroScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf0f9ff, 0.018);

    const camera = new THREE.PerspectiveCamera(
      40,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    // Elevated perspective so the water channel and floating ship are clearly framed
    camera.position.set(0, 3.8, 18.5);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      mount.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed, using static fallback:', e);
      return;
    }

    // ============================================================
    // 1. MARITIME DAYLIGHT LIGHTING
    // ============================================================
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8);
    sunLight.position.set(16, 26, 18);
    sunLight.castShadow = false;
    scene.add(sunLight);

    const azureFill = new THREE.DirectionalLight(0x38bdf8, 1.6);
    azureFill.position.set(-18, 14, -10);
    scene.add(azureFill);

    const warmSpec = new THREE.PointLight(0xfef08a, 1.8, 40);
    warmSpec.position.set(0, 6, 8);
    scene.add(warmSpec);

    // ============================================================
    // 2. CRYSTALLINE BLUE WATER CHANNEL (RIVER / OCEAN SURFACE)
    // ============================================================
    const segments = isMobile ? 45 : 90;
    const oceanGeo = new THREE.PlaneGeometry(120, 90, segments, segments);
    oceanGeo.rotateX(-Math.PI / 2);
    const posAttr = oceanGeo.attributes.position;
    const initialPositions = posAttr.array.slice() as Float32Array;

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Mediterranean Azure Sea Blue
      roughness: 0.1,
      metalness: 0.45,
      flatShading: true,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -0.7;
    scene.add(oceanMesh);

    // ============================================================
    // 3. WATER SURFACE SPRAY & OCEAN BOKEH PARTICLES
    // ============================================================
    const sparkleCount = isMobile ? 80 : 160;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparkleCoords = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparkleCoords[i] = (Math.random() - 0.5) * 85;
      sparkleCoords[i + 1] = Math.random() * 18 + 0.5;
      sparkleCoords[i + 2] = (Math.random() - 0.5) * 60;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparkleCoords, 3));
    const sparkleMat = new THREE.PointsMaterial({
      size: 0.16,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75,
    });
    const oceanSparkles = new THREE.Points(sparkleGeo, sparkleMat);
    scene.add(oceanSparkles);

    // Parallax mouse variables
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // ============================================================
    // 4. CONTINUOUS SERENE RIVER / OCEAN WATER WAVE ANIMATION
    // ============================================================
    let animationFrameId: number;
    const startTime = performance.now();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = (performance.now() - startTime) * 0.001;

      // Gentle undulating river/ocean waves
      const currentPos = oceanGeo.attributes.position;
      for (let i = 0; i < currentPos.count; i++) {
        const u = initialPositions[i * 3];
        const v = initialPositions[i * 3 + 2];
        const wave =
          Math.sin(u * 0.22 + elapsedTime * 1.4) * 0.28 +
          Math.cos(v * 0.26 + elapsedTime * 1.0) * 0.22 +
          Math.sin((u + v) * 0.15 + elapsedTime * 1.6) * 0.1;
        currentPos.setY(i, wave);
      }
      currentPos.needsUpdate = true;

      // Parallax Camera Easing
      targetX += (mouseX * 1.4 - targetX) * 0.04;
      targetY += (mouseY * 0.5 - targetY) * 0.04;
      camera.position.x = targetX;
      camera.position.y = 3.8 - targetY;
      camera.lookAt(0, 0.4, 0);

      if (renderer) {
        renderer.render(scene, camera);
      }
    };
    animate();

    const handleResize = () => {
      if (!mount || !renderer) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer && renderer.domElement && mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
        renderer.dispose();
      }
      oceanGeo.dispose();
      oceanMat.dispose();
      sparkleGeo.dispose();
      sparkleMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden"
      aria-hidden="true"
    />
  );
};

