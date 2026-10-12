import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export const OceanHeroScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isMobile = window.innerWidth < 768;
    const scene = new THREE.Scene();
    // Seamless fog matching exact page background #f8fafc with deeper viewing distance
    scene.fog = new THREE.FogExp2(0xf8fafc, 0.015);

    const camera = new THREE.PerspectiveCamera(
      42,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 4.6, 21.0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false, // Performance: antialias false on high-DPI screens saves massive rasterization time
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      // Cap pixel ratio to 1.25 max to prevent high-DPI lag and GPU thermal throttling
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.25));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      mount.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL initialization failed, using static fallback:', e);
      return;
    }

    // ============================================================
    // 1. LIGHTING
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

    const warmSpec = new THREE.PointLight(0xfef08a, 1.6, 40);
    warmSpec.position.set(0, 6, 8);
    scene.add(warmSpec);

    // ============================================================
    // 2. ULTRA-OPTIMIZED EXTENDED WATER MESH (Seamless deeper field)
    // ============================================================
    const segments = isMobile ? 22 : 36;
    const oceanGeo = new THREE.PlaneGeometry(160, 160, segments, segments);
    oceanGeo.rotateX(-Math.PI / 2);
    const posAttr = oceanGeo.attributes.position;
    const initialPositions = posAttr.array.slice() as Float32Array;

    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.12,
      metalness: 0.4,
      flatShading: true,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.position.y = -0.5;
    scene.add(oceanMesh);

    // ============================================================
    // 3. WATER SPRAY PARTICLES (Optimized particle count)
    // ============================================================
    const sparkleCount = isMobile ? 50 : 90;
    const sparkleGeo = new THREE.BufferGeometry();
    const sparkleCoords = new Float32Array(sparkleCount * 3);
    for (let i = 0; i < sparkleCount * 3; i += 3) {
      sparkleCoords[i] = (Math.random() - 0.5) * 110;
      sparkleCoords[i + 1] = Math.random() * 20 + 0.5;
      sparkleCoords[i + 2] = (Math.random() - 0.5) * 85;
    }
    sparkleGeo.setAttribute('position', new THREE.BufferAttribute(sparkleCoords, 3));
    const sparkleMat = new THREE.PointsMaterial({
      size: 0.18,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
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
    // 4. VISIBILITY & FRAME-THROTTLED ANIMATION LOOP
    // ============================================================
    let isVisible = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(mount);

    let animationFrameId: number;
    const startTime = performance.now();
    let lastWaveCalc = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Skip frame processing completely if scrolled out of view (saves 100% CPU/GPU)
      if (!isVisible) return;

      const now = performance.now();
      const elapsedTime = (now - startTime) * 0.001;

      // Throttle wave calculation to ~35fps for butter-smooth UI responsiveness
      if (now - lastWaveCalc > 28) {
        lastWaveCalc = now;
        const currentPos = oceanGeo.attributes.position;
        const count = currentPos.count;
        for (let i = 0; i < count; i++) {
          const u = initialPositions[i * 3];
          const v = initialPositions[i * 3 + 2];
          const wave =
            Math.sin(u * 0.22 + elapsedTime * 1.3) * 0.26 +
            Math.cos(v * 0.26 + elapsedTime * 0.95) * 0.2 +
            Math.sin((u + v) * 0.15 + elapsedTime * 1.5) * 0.08;
          currentPos.setY(i, wave);
        }
        currentPos.needsUpdate = true;
      }

      // Parallax Camera Easing
      targetX += (mouseX * 1.2 - targetX) * 0.04;
      targetY += (mouseY * 0.4 - targetY) * 0.04;
      camera.position.x = targetX;
      camera.position.y = 4.6 - targetY;
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
      observer.disconnect();
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
      className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden transition-opacity duration-700"
      style={{
        maskImage:
          'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 68%, rgba(0,0,0,0.45) 86%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage:
          'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 68%, rgba(0,0,0,0.45) 86%, rgba(0,0,0,0) 100%)',
      }}
      aria-hidden="true"
    />
  );
};

