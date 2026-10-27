import React, { useState, useEffect, useRef } from 'react';
import { DolphinAvatar3D } from './DolphinAvatar3D';
import { CruiseHuntChatModal, CrossHuntChatModal } from './CrossHuntChatModal';
import { Sparkles, MessageCircle, X } from 'lucide-react';

export const CruiseHuntAiWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    try {
      return (sessionStorage.getItem('cruise_hunt_ai_open') || sessionStorage.getItem('cross_hunt_ai_open')) === 'true';
    } catch {
      return false;
    }
  });
  const [isMinimized, setIsMinimized] = useState<boolean>(() => {
    try {
      return (sessionStorage.getItem('cruise_hunt_ai_minimized') || sessionStorage.getItem('cross_hunt_ai_minimized')) === 'true';
    } catch {
      return false;
    }
  });
  const [showTooltip, setShowTooltip] = useState(false);

  // Sync state to sessionStorage for seamless resume across navigation / back button
  useEffect(() => {
    try {
      sessionStorage.setItem('cruise_hunt_ai_open', isOpen ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      sessionStorage.setItem('cruise_hunt_ai_minimized', isMinimized ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isMinimized]);

  // Position state for movable desktop dragging (defaults to bottom-right)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initX: number; initY: number }>({
    startX: 0,
    startY: 0,
    initX: 0,
    initY: 0,
  });
  const hasMovedRef = useRef(false);

  // Auto-hide tooltip after 14 seconds or when opened
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 14000);
    return () => clearTimeout(timer);
  }, []);

  // Listen for open events triggered from hero dolphin or other parts of the site
  useEffect(() => {
    const handleOpenAi = () => {
      setIsOpen(true);
      setIsMinimized(false);
      setShowTooltip(false);
    };
    window.addEventListener('open-cruise-hunt-ai', handleOpenAi);
    window.addEventListener('open-cross-hunt-ai', handleOpenAi);
    return () => {
      window.removeEventListener('open-cruise-hunt-ai', handleOpenAi);
      window.removeEventListener('open-cross-hunt-ai', handleOpenAi);
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag on primary mouse button
    if (e.button !== 0) return;

    const currentX = position ? position.x : window.innerWidth - 130;
    const currentY = position ? position.y : window.innerHeight - 130;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initX: currentX,
      initY: currentY,
    };
    hasMovedRef.current = false;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      hasMovedRef.current = true;
    }

    // Clamp inside viewport
    const newX = Math.max(10, Math.min(window.innerWidth - 110, dragStartRef.current.initX + deltaX));
    const newY = Math.max(10, Math.min(window.innerHeight - 110, dragStartRef.current.initY + deltaY));

    const newPos = { x: newX, y: newY };
    setPosition(newPos);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);

    if (position) {
      localStorage.setItem('cruise_hunt_dolphin_pos', JSON.stringify(position));
    }

    // If user clicked without dragging, toggle chat open / resume
    if (!hasMovedRef.current) {
      if (isMinimized) {
        setIsMinimized(false);
        setIsOpen(true);
      } else {
        setIsOpen((prev) => !prev);
        setIsMinimized(false);
      }
      setShowTooltip(false);
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowTooltip(false);
  };

  const handleMinimizeChat = () => {
    setIsMinimized(true);
  };

  const handleResumeChat = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setShowTooltip(false);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  return (
    <>
      {/* ============================================================== */}
      {/* 1. MOVABLE 3D DOLPHIN AVATAR AT BOTTOM-RIGHT                   */}
      {/* ============================================================== */}
      {!isOpen && (
        <div
          style={
            position
              ? { left: `${position.x}px`, top: `${position.y}px` }
              : { right: '24px', bottom: '24px' }
          }
          className={`fixed z-40 touch-none select-none transition-shadow ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Speech Bubble Tooltip matching mockup */}
          {showTooltip && (
            <div
              className="absolute -top-20 -left-44 sm:-left-48 w-52 sm:w-56 bg-white/95 backdrop-blur-md text-slate-800 p-2.5 rounded-2xl shadow-xl border border-sky-200 text-xs animate-bounce"
              style={{ animationDuration: '3s' }}
              onClick={(e) => {
                e.stopPropagation();
                handleOpenChat();
              }}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="font-semibold leading-tight text-slate-800 text-[11px] sm:text-xs">
                  Hi! I'm your Cruise Assistant.
                  <span className="block font-normal text-sky-700 mt-0.5">
                    Click me and ask anything about your trip! 🐬✨
                  </span>
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="text-slate-400 hover:text-slate-600 p-0.5"
                  title="Dismiss"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              {/* Tooltip Arrow Pointer pointing towards dolphin */}
              <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white border-b border-r border-sky-200 transform rotate-45" />
            </div>
          )}

          {/* Floating Dolphin Avatar matching cute 3D cartoon style */}
          <div className="relative group cursor-pointer" onClick={handleOpenChat}>
            <div
              className="w-24 h-24 relative flex items-center justify-center animate-bounce"
              style={{ animationDuration: '3.5s' }}
            >
              <img
                src="/dolphin_icon_transparent.png"
                alt="Cruise-Hunt AI"
                className="w-20 h-20 object-contain drop-shadow-2xl group-hover:scale-110 transition-transform duration-300 select-none pointer-events-none"
              />
              <div className="absolute inset-2 bg-sky-400/25 rounded-full blur-md group-hover:bg-sky-400/45 transition-all pointer-events-none" />
            </div>

            {/* Quick Badge Pulse */}
            <div className="absolute bottom-1 right-2 w-7 h-7 bg-sky-600 hover:bg-sky-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white pointer-events-none group-hover:scale-110 transition-transform">
              <MessageCircle className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. CHAT MODAL WINDOW                                           */}
      {/* ============================================================== */}
      <CruiseHuntChatModal
        isOpen={isOpen}
        onClose={handleCloseChat}
        onMinimize={handleMinimizeChat}
        onResume={handleResumeChat}
        isMinimized={isMinimized}
      />
    </>
  );
};

export const CrossHuntAiWidget = CruiseHuntAiWidget;
