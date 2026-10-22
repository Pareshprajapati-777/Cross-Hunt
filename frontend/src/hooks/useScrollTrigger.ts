import { useEffect, useRef } from 'react';
import { animate } from 'animejs';

/**
 * Scroll-triggered animations using Intersection Observer
 * Fires animations when elements enter viewport
 * Phase 3 - Taste-Skill premium polish
 */

export const useScrollTrigger = (
  selector: string,
  callback: () => void,
  threshold = 0.3
) => {
  const triggered = useRef(false);

  useEffect(() => {
    if (triggered.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered.current) {
          triggered.current = true;
          callback();
        }
      },
      { threshold, rootMargin: '-50px' }
    );

    const target = document.querySelector(selector);
    if (target) {
      observer.observe(target);
    }

    return () => {
      observer.disconnect();
    };
  }, [selector, callback, threshold]);
};

/**
 * Animate counter from 0 to target value
 * For statistics, pricing, capacity numbers
 */
export const animateCountUp = (
  selector: string,
  targetValue: number,
  options?: {
    duration?: number;
    delay?: number;
    suffix?: string;
    prefix?: string;
  }
) => {
  const {
    duration = 2000,
    delay = 0,
    suffix = '',
    prefix = ''
  } = options || {};

  const elements = document.querySelectorAll(selector);

  elements.forEach((element) => {
    const obj = { count: 0 };

    animate(obj, {
      count: targetValue,
      duration,
      delay,
      ease: 'outCubic',
      round: 1,
      onUpdate: () => {
        element.textContent = prefix + obj.count.toLocaleString() + suffix;
      }
    });
  });
};

/**
 * Staggered fade-in for card grids
 * Cards appear one by one with delay
 */
export const animateCardGrid = (containerSelector: string) => {
  const cards = Array.from(document.querySelectorAll(`${containerSelector} > *`));

  if (cards.length === 0) return;

  // Animate each card individually with stagger
  cards.forEach((card, index) => {
    animate(card as HTMLElement, {
      translateY: [40, 0],
      opacity: [0, 1],
      duration: 600,
      delay: index * 80, // 80ms stagger
      ease: 'outExpo'
    });
  });
};
