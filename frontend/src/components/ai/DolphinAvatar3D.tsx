import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface DolphinAvatar3DProps {
  isSpeaking?: boolean;
  isThinking?: boolean;
  onClick?: () => void;
  size?: number; // size in pixels
  className?: string;
  showFallbackOnly?: boolean;
}

export const DolphinAvatar3D: React.FC<DolphinAvatar3DProps> = ({
  isSpeaking = false,
  isThinking = false,
  onClick,
  size = 140,
  className = '',
  showFallbackOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const modelRef = useRef<THREE.Group | null>(null);

  // Track user mouse position relative to center of screen for interactive eye/head tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: -(e.clientY / window.innerHeight) * 2 + 1,
      };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (showFallbackOnly) {
      setHasError(true);
      setIsLoading(false);
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    // Check for prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // 1. Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.4, 4.2);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(size, size);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.25;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL not supported for 3D Dolphin avatar, falling back to 2D image.', e);
      setHasError(true);
      setIsLoading(false);
      return;
    }

    // 2. Lighting setup tailored for glossy cute 3D character
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfff8ed, 2.2);
    sunLight.position.set(4, 6, 5);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.0);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const softFill = new THREE.PointLight(0x93c5fd, 1.5, 10);
    softFill.position.set(0, -1, 3);
    scene.add(softFill);

    // 3. Load GLB Model
    const loader = new GLTFLoader();
    let animFrameId: number;
    let clock = new THREE.Clock();
    let isDisposed = false;

    loader.load(
      '/cross_hunt_dolphin_assistant.glb',
      (gltf) => {
        if (isDisposed) return;
        const model = gltf.scene;
        modelRef.current = model;

        // Auto-center and compute bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const sizeVec = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
        const scale = 2.4 / (maxDim || 1);

        model.scale.set(scale, scale, scale);
        // Center pivot
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale - 0.1;
        model.position.z = -center.z * scale;

        // Enhance materials
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (mesh.material) {
              const mat = mesh.material as THREE.MeshStandardMaterial;
              mat.roughness = Math.min(mat.roughness, 0.45);
              mat.metalness = Math.max(mat.metalness, 0.1);
              mat.needsUpdate = true;
            }
          }
        });

        const rootGroup = new THREE.Group();
        rootGroup.add(model);
        scene.add(rootGroup);

        setIsLoading(false);

        // 4. Animation loop: Idle swimming, floating bob, talking excitation, head tracking
        const animate = () => {
          if (isDisposed) return;
          animFrameId = requestAnimationFrame(animate);

          // Auto-pause rendering if document is hidden to conserve 100% resources
          if (document.hidden) return;

          const elapsed = clock.getElapsedTime();

          if (!prefersReducedMotion && rootGroup) {
            // Idle sinusoidal floating bob (swimming in water)
            const bobFrequency = isSpeaking ? 6.0 : (isThinking ? 4.0 : 2.0);
            const bobAmplitude = isSpeaking ? 0.12 : (isThinking ? 0.08 : 0.06);
            rootGroup.position.y = Math.sin(elapsed * bobFrequency) * bobAmplitude;

            // Gentle swimming sway (roll and yaw)
            const swayRoll = Math.sin(elapsed * 1.5) * 0.06;
            const swayPitch = Math.sin(elapsed * 2.0) * 0.04;
            const swayYaw = Math.cos(elapsed * 1.2) * 0.08;

            // Tracking cursor slightly
            const targetYaw = mousePosRef.current.x * 0.25;
            const targetPitch = mousePosRef.current.y * 0.15;

            // Excited talking nods
            const talkingNod = isSpeaking ? Math.sin(elapsed * 10) * 0.12 : 0;
            const talkingWiggle = isSpeaking ? Math.cos(elapsed * 8) * 0.1 : 0;

            // Smooth interpolation
            rootGroup.rotation.y += (targetYaw + swayYaw + talkingWiggle - rootGroup.rotation.y) * 0.08;
            rootGroup.rotation.x += (-targetPitch + swayPitch + talkingNod - rootGroup.rotation.x) * 0.08;
            rootGroup.rotation.z += (swayRoll - rootGroup.rotation.z) * 0.08;
          }

          renderer.render(scene, camera);
        };

        animate();
      },
      undefined,
      (err) => {
        console.warn('Failed to load 3D Dolphin GLB model, using 2D fallback:', err);
        setHasError(true);
        setIsLoading(false);
      }
    );

    // Cleanup resources
    return () => {
      isDisposed = true;
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (renderer) {
        if (renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
        renderer.dispose();
      }
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              mesh.material.forEach((m) => m.dispose());
            } else {
              mesh.material.dispose();
            }
          }
        }
      });
    };
  }, [size, isSpeaking, isThinking, showFallbackOnly]);

  return (
    <div
      onClick={onClick}
      style={{ width: size, height: size }}
      className={`relative select-none cursor-pointer flex items-center justify-center transition-transform duration-300 hover:scale-105 active:scale-95 ${className}`}
      title="Click to chat with Cross-Hunt AI 🐬"
    >
      {/* 3D Canvas Mount */}
      {!hasError && (
        <div
          ref={containerRef}
          style={{ width: size, height: size }}
          className="relative pointer-events-auto"
        />
      )}

      {/* 2D Fallback & Loading state with cute glowing dolphin avatar */}
      {(hasError || isLoading) && (
        <div className="absolute inset-0 flex items-center justify-center">
          <img
            src="/dolphin_icon.png"
            alt="Cross-Hunt AI Dolphin"
            className={`w-full h-full object-contain filter drop-shadow-lg transition-transform duration-500 ${
              isSpeaking ? 'animate-bounce' : 'animate-pulse'
            }`}
          />
        </div>
      )}

      {/* Animated Water / Ripple Aura beneath the dolphin */}
      <div className="absolute -bottom-1 w-3/4 h-3 bg-sky-400/25 rounded-full blur-[4px] pointer-events-none animate-pulse" />
    </div>
  );
};
