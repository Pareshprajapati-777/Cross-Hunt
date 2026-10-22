import React, { useRef, useEffect } from 'react';
import { animate } from 'animejs';

interface MagneticButtonProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  strength?: number; // Magnetic pull strength (0.1 - 0.5)
}

/**
 * Magnetic Button - follows mouse cursor with smooth easing
 * Phase 3 - Taste-Skill premium polish
 *
 * Usage:
 * <MagneticButton className="btn-primary" onClick={handleClick}>
 *   Click Me
 * </MagneticButton>
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  onClick,
  strength = 0.3
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isAnimating.current) return;

      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Calculate distance from center
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;

      // Apply magnetic pull with strength multiplier
      const moveX = deltaX * strength;
      const moveY = deltaY * strength;

      isAnimating.current = true;

      animate(btn, {
        translateX: moveX,
        translateY: moveY,
        duration: 400,
        ease: 'outCubic',
        onComplete: () => {
          isAnimating.current = false;
        }
      });
    };

    const handleMouseLeave = () => {
      isAnimating.current = true;

      animate(btn, {
        translateX: 0,
        translateY: 0,
        duration: 600,
        ease: 'outElastic(1, 0.6)', // Gentle elastic return
        onComplete: () => {
          isAnimating.current = false;
        }
      });
    };

    btn.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      btn.removeEventListener('mousemove', handleMouseMove);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return (
    <button
      ref={btnRef}
      className={className}
      onClick={onClick}
      style={{ willChange: 'transform' }}
    >
      {children}
    </button>
  );
};
