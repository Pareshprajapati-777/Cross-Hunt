import React from 'react';
import { Anchor, ShieldCheck, Waves, Sparkles, Navigation, Zap } from 'lucide-react';

export const CurvedMarqueeBanner: React.FC = () => {
  const marqueeItems = [
    { label: 'REAL-TIME SLOT LOCKING', icon: Zap },
    { label: '100% SEAWORTHY AUDITED', icon: ShieldCheck },
    { label: 'ZERO OVERLAP RISK', icon: Anchor },
    { label: 'INSTANT QR PASS ON WHATSAPP', icon: Sparkles },
    { label: 'LICENSED CAPTAINS ONLY', icon: Navigation },
    { label: 'ZERO HIDDEN PIER CHARGES', icon: Waves },
  ];

  return (
    <div className="wave-ribbon-container py-4 relative z-20 overflow-hidden select-none bg-[#061D36] border-y-2 border-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.45),0_0_50px_rgba(56,189,248,0.25)]">
      {/* Top and Bottom Glowing Blue Light Accent Lines */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8]" />
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-400 to-transparent shadow-[0_0_15px_#38bdf8]" />

      {/* Dynamic Animated Marquee Row */}
      <div className="animate-marquee-scroll flex items-center gap-8 whitespace-nowrap">
        {/* Render 3 cycles for seamless continuous infinite glide */}
        {[0, 1, 2].map((cycle) => (
          <React.Fragment key={cycle}>
            {marqueeItems.map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={`${cycle}-${idx}`}
                  className="inline-flex items-center gap-3 px-3 py-1 group"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0284c7]/25 border border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.4)] flex items-center justify-center text-[#38bdf8] group-hover:scale-110 group-hover:bg-[#0284c7] group-hover:text-white transition-all duration-300">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-heading-more text-xs sm:text-sm font-black tracking-wider text-white text-stroke-white group-hover:text-[#38bdf8] transition-colors drop-shadow">
                    {item.label}
                  </span>
                  <span className="text-[#38bdf8] font-black text-sm">✦</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
