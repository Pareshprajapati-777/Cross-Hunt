import React, { useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { forgotPassword, resetPassword } from '../api/auth';
import {
  Anchor,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';

export type AuthMode = 'login' | 'register' | 'forgot';

interface AuthPageProps {
  initialMode?: AuthMode;
  onSuccess: (user: any) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onSwitchMode,
}) => {
  const { login, register } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Derive initial mode directly from URL or initialMode prop
  const currentPathMode: AuthMode = location.pathname.startsWith('/register')
    ? 'register'
    : location.pathname.startsWith('/login')
    ? 'login'
    : initialMode;
  const [mode, setMode] = useState<AuthMode>(currentPathMode);

  // Sync mode whenever URL path or initialMode prop changes (unless user explicitly entered forgot mode)
  React.useEffect(() => {
    if (mode === 'forgot') return;
    const nextMode: AuthMode = location.pathname.startsWith('/register')
      ? 'register'
      : location.pathname.startsWith('/login')
      ? 'login'
      : initialMode;
    setMode(nextMode);
    setError(null);
  }, [location.pathname, initialMode]);

  const fromState = (location.state as any)?.from;
  const redirectParam = searchParams.get('redirect');
  const isBookingRedirect =
    (location.state as any)?.reason === 'booking' ||
    (typeof fromState === 'string' && (fromState.includes('book-cruise') || fromState.includes('book-tour') || fromState.includes('events'))) ||
    (fromState?.pathname && (fromState.pathname.includes('book-cruise') || fromState.pathname.includes('book-tour') || fromState.pathname.includes('events'))) ||
    (redirectParam && (redirectParam.includes('book-cruise') || redirectParam.includes('book-tour') || redirectParam.includes('events')));

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('USER');

  // Password Visibility Toggle
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Forgot Password Fields
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResetSuccessMsg(null);

    try {
      if (mode === 'login') {
        const loggedUser = await login(username, password);
        onSuccess(loggedUser);
      } else if (mode === 'register') {
        const parts = fullName.trim().split(' ');
        const first_name = parts[0] || '';
        const last_name = parts.slice(1).join(' ') || '';
        const loggedUser = await register({
          username,
          password,
          email,
          first_name,
          last_name,
          role,
        });
        onSuccess(loggedUser);
      } else if (mode === 'forgot') {
        if (!forgotIdentifier.trim()) {
          throw new Error('Please enter your username or registered email.');
        }
        if (newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters long.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify both fields.');
        }

        const res = await resetPassword(forgotIdentifier.trim(), newPassword);
        setResetSuccessMsg(res.message || 'Password successfully reset! Please sign in with your new password.');
        setUsername(res.username || forgotIdentifier);
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Operation failed. Please verify your details.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setMode('login');
    setError(null);
    setResetSuccessMsg(null);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center px-4 relative overflow-hidden bg-[#f8fafc]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

      {/* Login / Register / Forgot Password Card with Blue Light Glow Effect */}
      <div className="relative w-full max-w-md z-10">
        {/* Soft Ambient Blue Light Glow Aura */}
        <div className="absolute -inset-1.5 rounded-[32px] bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-400 opacity-50 blur-xl pointer-events-none animate-pulse" />

        {/* Card with Blue Glowing Border */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl p-8 border-2 border-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.35),0_10px_40px_rgba(2,132,199,0.15)] ring-1 ring-sky-300/50">
          {/* Emblem & Title */}
          <div className="text-center mb-8 space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-white border-2 border-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.4)] flex items-center justify-center p-2 overflow-hidden">
              {mode === 'forgot' ? (
                <KeyRound className="w-7 h-7 text-sky-600" />
              ) : (
                <>
                  <img
                    src="/static/images/logo_icon.png"
                    alt="Cross Hunt Emblem"
                    className="w-full h-full object-contain rounded-full filter drop-shadow"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Anchor className="w-6 h-6 text-sky-600" />
                </>
              )}
            </div>

            <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
              {mode === 'login'
                ? 'Sign In to Cross Hunt'
                : mode === 'register'
                ? 'Create an Account'
                : 'Reset Your Password'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {mode === 'login'
                ? 'Access your cabins, trip tickets, and bookings.'
                : mode === 'register'
                ? 'Book private boat charters and cruise trips with verified operators.'
                : 'Set a new password for your passenger or operator account.'}
            </p>
          </div>

          {/* Booking Authentication Notice */}
          {isBookingRedirect && mode !== 'forgot' && (
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-sky-50 via-cyan-50 to-blue-50 border border-sky-300 text-sky-950 text-xs shadow-sm flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                <Anchor className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-sky-950 text-sm">Account Required to Book Ship</p>
                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                  Please sign in or create an account to proceed with reserving your vessel or cruise tour tickets.
                </p>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Alert (e.g. Password Reset Successful) */}
          {resetSuccessMsg && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs shadow-sm space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setResetSuccessMsg(null);
                  setError(null);
                }}
                className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition cursor-pointer"
              >
                Sign In with New Password
              </button>
            </div>
          )}

          {/* MODE 1 & 2: LOGIN OR REGISTER FORM */}
          {mode !== 'forgot' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                      Account Purpose
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                    >
                      <option value="USER">Travel User</option>
                      <option value="CROSS_OWNER">Ship Owner</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. user1 or paresh"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setForgotIdentifier(username);
                        setError(null);
                        setResetSuccessMsg(null);
                      }}
                      className="text-xs text-sky-600 hover:text-sky-800 font-bold transition cursor-pointer hover:underline"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 text-sky-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-bold text-sm tracking-wide shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Authenticating...' : mode === 'login' ? 'SIGN IN' : 'CREATE ACCOUNT'}</span>
                <ArrowRight className="w-4 h-4 text-sky-100" />
              </button>
            </form>
          ) : (
            /* MODE 3: FORGOT / RESET PASSWORD FORM */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Username or Registered Email
                </label>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="e.g. user1 or name@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  New Password (Min 6 Characters)
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition cursor-pointer"
                    title={showResetPassword ? 'Hide password' : 'Show password'}
                    aria-label={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4 text-sky-600" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-display font-bold text-sm tracking-wide shadow-md shadow-sky-500/25 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                <span>{loading ? 'Resetting Password...' : 'RESET PASSWORD'}</span>
                <ArrowRight className="w-4 h-4 text-sky-100" />
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setResetSuccessMsg(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Sign In (लॉगिन पर वापस जाएं)</span>
                </button>
              </div>
            </form>
          )}

          {/* Switch Mode Toggle (Login vs Register) */}
          {mode !== 'forgot' && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              {mode === 'login' ? (
                <p className="text-xs text-slate-600 font-medium">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('register');
                      onSwitchMode('register');
                    }}
                    className="text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p className="text-xs text-slate-600 font-medium">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      onSwitchMode('login');
                    }}
                    className="text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          )}

          {/* Demo Quick-Fill Pill Bar */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center space-y-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Demo Credentials Quick-Fill
            </span>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('user1', 'User@12345')}
                className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-[11px] font-bold cursor-pointer transition shadow-sm"
              >
                Guest (user1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('owner1', 'Owner@12345')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-[11px] font-bold cursor-pointer transition shadow-sm"
              >
                Operator (owner1)
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'Admin@12345')}
                className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-[11px] font-bold cursor-pointer transition shadow-sm"
              >
                Admin (admin)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
