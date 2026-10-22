import { useEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';

export const useHeroAnimations = () => {
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    // Staggered entrance for trust badges
    animate('.trust-badge', {
      translateY: [40, 0],
      opacity: [0, 1],
      duration: 900,
      delay: stagger(120, { start: 400 }),
      ease: 'outExpo'
    });

    // Headline fade-in with scale
    animate('.hero-headline', {
      translateY: [30, 0],
      opacity: [0, 1],
      scale: [0.96, 1],
      duration: 1100,
      delay: 200,
      ease: 'outCubic'
    });

    // Crown badge bounce entrance
    animate('.crown-badge', {
      translateY: [-50, 0],
      opacity: [0, 1],
      duration: 800,
      ease: 'outBack'
    });

    // Search form slide up
    animate('.search-form-container', {
      translateY: [60, 0],
      opacity: [0, 1],
      duration: 1000,
      delay: 600,
      ease: 'outExpo'
    });

    // Continuous subtle pulse on trust badge icons
    animate('.trust-badge-icon', {
      scale: [1, 1.08, 1],
      duration: 2400,
      loop: true,
      ease: 'inOutQuad',
      delay: stagger(200)
    });

    // Glow pulse effect
    animate('.trust-badge-glow', {
      opacity: [0.7, 1, 0.7],
      duration: 3000,
      loop: true,
      ease: 'inOutSine'
    });

    // Subtitle fade in
    animate('.hero-subtitle', {
      translateY: [20, 0],
      opacity: [0, 1],
      duration: 900,
      delay: 400,
      ease: 'outCubic'
    });

    // Floating animation for "Watch Video" button
    animate('.watch-video-btn', {
      translateY: [-8, 8],
      duration: 3000,
      loop: true,
      alternate: true,
      ease: 'inOutSine'
    });

  }, []);
};

// Counter animation utility
export const animateCounter = (element: HTMLElement, target: number, duration = 2000) => {
  const obj = { count: 0 };
  animate(obj, {
    count: target,
    duration,
    delay: 800,
    ease: 'outCubic',
    round: 1,
    onUpdate: () => {
      element.textContent = obj.count.toString();
    }
  });
};
