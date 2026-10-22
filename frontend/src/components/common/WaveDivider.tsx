import React from 'react';
import { Anchor } from 'lucide-react';

/**
 * Wave Divider — Maritime section separator
 * Creates a flowing wave effect between sections
 * Phase 4 - Awesome-Design-MD maritime finishing touches
 */
export const WaveDivider: React.FC<{
  className?: string;
  flip?: boolean;
  color?: 'ocean' | 'sand' | 'cream';
}> = ({ className = '', flip = false, color = 'ocean' }) => {
  const colors = {
    ocean: {
      primary: '#0284c7',   // sky-600
      secondary: '#0369a1', // sky-700
      tertiary: '#0ea5e9',  // sky-500
    },
    sand: {
      primary: '#d97706',   // amber-600
      secondary: '#b45309', // amber-700
      tertiary: '#f59e0b',  // amber-500
    },
    cream: {
      primary: '#f8fafc',   // slate-50
      secondary: '#f1f5f9', // slate-100
      tertiary: '#e2e8f0',  // slate-200
    },
  };

  const c = colors[color];

  return (
    <div className={`relative w-full overflow-hidden leading-none ${className}`}>
      <svg
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        className={`relative w-full h-[60px] sm:h-[80px] md:h-[100px] ${flip ? 'rotate-180' : ''}`}
        style={{ display: 'block' }}
      >
        {/* Primary wave */}
        <path
          d="M0,60 C240,100 480,20 720,60 C960,100 1200,20 1440,60 L1440,120 L0,120 Z"
          fill={c.primary}
          fillOpacity="1"
        />
        {/* Secondary wave (offset) */}
        <path
          d="M0,70 C300,110 400,30 600,70 C800,110 900,30 1200,70 C1350,100 1410,80 1440,70 L1440,120 L0,120 Z"
          fill={c.secondary}
          fillOpacity="0.7"
        />
        {/* Tertiary wave (offset further) */}
        <path
          d="M0,80 C200,110 350,50 550,80 C750,110 850,50 1050,80 C1200,100 1350,90 1440,80 L1440,120 L0,120 Z"
          fill={c.tertiary}
          fillOpacity="0.4"
        />
      </svg>
    </div>
  );
};

/**
 * Simple horizontal rule with nautical styling
 */
export const NauticalDivider: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`relative py-8 ${className}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <div className="bg-slate-50 px-4">
            <Anchor className="w-4 h-4 text-sky-400/50" />
          </div>
        </div>
      </div>
    </div>
  </div>
);