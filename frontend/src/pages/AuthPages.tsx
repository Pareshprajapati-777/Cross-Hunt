import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Anchor, AlertCircle, ArrowRight } from 'lucide-react';

interface AuthPageProps {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  initialMode = 'login',
  onSuccess,
  onSwitchMode,
}) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('USER');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        const parts = fullName.trim().split(' ');
        const first_name = parts[0] || '';
        const last_name = parts.slice(1).join(' ') || '';
        await register({
          username,
          password,
          email,
          first_name,
          last_name,
          role,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setMode('login');
  };

  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center px-4 relative overflow-hidden bg-[#f8fafc]">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-sky-200 shadow-xl relative z-10">
        {/* Emblem & Title */}
        <div className="text-center mb-8 space-y-2">
          <div className="w-16 h-16 mx-auto rounded-full bg-white border-2 border-sky-400 flex items-center justify-center p-2 shadow-md overflow-hidden">
            <img
              src="/static/images/logo_icon.png"
              alt="Cross Hunt Emblem"
              className="w-full h-full object-contain rounded-full filter drop-shadow"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <Anchor className="w-6 h-6 text-sky-600" />
          </div>
          <h1 className="text-2xl font-display font-extrabold text-slate-900 tracking-tight">
            {mode === 'login' ? 'Sign In to Cross Hunt' : 'Create Maritime Account'}
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            {mode === 'login'
              ? 'Access your staterooms, voyage tickets, and event bookings.'
              : 'Join the premier luxury ocean travel & charter platform.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-800 text-xs flex items-center gap-2.5 shadow-sm font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

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
                  placeholder="Admiral James Cook"
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
                  placeholder="captain@maritime.com"
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
                  <option value="USER">Guest Traveler / Event Host</option>
                  <option value="CROSS_OWNER">Cruise Ship Operator</option>
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
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-sky-500 transition"
            />
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

        {/* Switch Mode Toggle */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          {mode === 'login' ? (
            <p className="text-xs text-slate-600 font-medium">
              Don't have a maritime account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  onSwitchMode('register');
                }}
                className="text-sky-600 hover:text-sky-700 font-bold cursor-pointer"
              >
                Join Voyage
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
  );
};
