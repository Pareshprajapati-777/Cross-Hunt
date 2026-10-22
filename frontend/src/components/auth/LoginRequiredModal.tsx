import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthModal } from '../../context/AuthModalContext';
import {
  Lock,
  Heart,
  Ship,
  Ticket,
  Star,
  ShieldCheck,
  X,
  ArrowRight,
  UserPlus,
  LogIn,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const LoginRequiredModal: React.FC = () => {
  const { isOpen, options, closeLoginModal } = useAuthModal();
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeLoginModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeLoginModal]);

  if (!isOpen) return null;

  const returnUrl = options?.returnUrl || window.location.pathname + window.location.search;
  const featureName = options?.featureName || 'This Feature';
  const title = options?.title || 'Account Login Required';
  const subtitle = options?.subtitle || 'Is feature ka upyog karne ke liye passenger login zaroori hai';
  const description =
    options?.description ||
    `To access ${featureName}, reserve private charters, or save ships to your passenger wishlist, please sign in or create an account.`;

  // Render appropriate badge icon
  const renderIcon = () => {
    switch (options?.iconType) {
      case 'heart':
        return <Heart className="w-7 h-7 text-rose-500 fill-rose-500 animate-pulse" />;
      case 'ship':
        return <Ship className="w-7 h-7 text-sky-400" />;
      case 'ticket':
        return <Ticket className="w-7 h-7 text-amber-400" />;
      case 'star':
        return <Star className="w-7 h-7 text-amber-400 fill-amber-400" />;
      case 'shield':
        return <ShieldCheck className="w-7 h-7 text-emerald-400" />;
      case 'lock':
      default:
        return <Lock className="w-7 h-7 text-sky-400" />;
    }
  };

  const handleSignIn = () => {
    closeLoginModal();
    navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, {
      state: { from: returnUrl, reason: 'booking' },
    });
  };

  const handleRegister = () => {
    closeLoginModal();
    navigate(`/register?redirect=${encodeURIComponent(returnUrl)}`, {
      state: { from: returnUrl, reason: 'booking' },
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#030d1c]/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={closeLoginModal}
    >
      {/* Modal Container */}
      <div
        className="relative w-full max-w-lg my-auto rounded-3xl bg-white shadow-2xl border-2 border-sky-400 shadow-[0_0_50px_rgba(14,165,233,0.35),0_15px_45px_rgba(2,132,199,0.2)] ring-1 ring-sky-300/40 p-6 sm:p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={closeLoginModal}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
          aria-label="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Floating Illuminated Emblem Header */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#051833] via-[#082F5B] to-[#1677C8] p-0.5 shadow-xl shadow-sky-600/30 flex items-center justify-center">
              <div className="w-full h-full rounded-[14px] bg-[#051833] flex items-center justify-center">
                {renderIcon()}
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 ring-2 ring-white text-[10px] text-slate-900 font-black shadow-sm">
              <Sparkles className="w-3 h-3 text-slate-950" />
            </span>
          </div>

          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-[11px] font-extrabold uppercase tracking-wider border border-sky-200">
              <Lock className="w-3 h-3 text-sky-600" />
              <span>Authentication Required • लॉगिन आवश्यक है</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-serif tracking-tight pt-1">
              {title}
            </h3>
            <p className="text-xs text-sky-700 font-semibold">{subtitle}</p>
          </div>
        </div>

        {/* Feature Explanation Box */}
        <div className="my-5 p-4 rounded-2xl bg-gradient-to-r from-sky-50/80 via-blue-50/60 to-cyan-50/80 border border-sky-200/80 text-left space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="text-sky-900 font-bold uppercase tracking-wider text-[11px]">
              Target Feature:
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-white border border-sky-200 text-sky-800 font-bold text-[11px]">
              {featureName}
            </span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed font-normal">{description}</p>
        </div>

        {/* Value Perks List */}
        <div className="space-y-2 mb-6 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Digital gate boarding passes with scannable QR ticket verification</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Save favorite luxury ships & yachts directly to your passenger panel</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Real-time booking management, WhatsApp reminders, and GST invoices</span>
          </div>
        </div>

        {/* Dual Primary Call-to-Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleSignIn}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[#051833]/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-[#fff8dc]" />
            <span>Sign In to Continue / लॉगिन करें</span>
            <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
          </button>

          <button
            type="button"
            onClick={handleRegister}
            className="w-full py-3.5 px-5 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs sm:text-sm border-2 border-slate-200 hover:border-sky-400 flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
          >
            <UserPlus className="w-4 h-4 text-sky-600" />
            <span>Create Free Account / नया खाता बनाएं</span>
          </button>

          <button
            type="button"
            onClick={closeLoginModal}
            className="w-full py-2 text-center text-xs font-bold text-slate-400 hover:text-slate-600 transition cursor-pointer mt-1"
          >
            Continue Browsing Without Logging In (बाद में करें)
          </button>
        </div>
      </div>
    </div>
  );
};
