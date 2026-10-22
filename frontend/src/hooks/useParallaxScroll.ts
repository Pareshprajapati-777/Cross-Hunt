import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

/**
 * Parallax scroll effect for hero elements
 * Different depths create sense of spatial dimension
 * Phase 3 - Taste-Skill premium polish
 */
export const useParallaxScroll = () => {
  const ticking = useRef(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      lastScrollY.current = window.scrollY;

      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const scrollY = lastScrollY.current;

          // Only apply parallax in first 800px of scroll
          if (scrollY <= 800) {
            // Headline moves slower (creates depth)
            animate('.hero-headline', {
              translateY: scrollY * 0.3,
              duration: 0,
              easing: 'linear'
            });

            // Subtitle moves medium speed
            animate('.hero-subtitle', {
              translateY: scrollY * 0.2,
              duration: 0,
              easing: 'linear'
            });

            // Trust badges move slightly
            animate('.trust-badge', {
              translateY: scrollY * 0.15,
              duration: 0,
              easing: 'linear'
            });

            // Crown badge moves fastest (foreground)
            animate('.crown-badge', {
              translateY: scrollY * -0.1,
              duration: 0,
              easing: 'linear'
            });

            // Watch video button counter-moves (creates depth)
            animate('.watch-video-btn', {
              translateY: scrollY * -0.25,
              duration: 0,
              easing: 'linear'
            });

            // Search form moves slowly (background layer)
            animate('.search-form-container', {
              translateY: scrollY * 0.4,
              duration: 0,
              easing: 'linear'
            });
          }

          ticking.current = false;
        });

        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
};
