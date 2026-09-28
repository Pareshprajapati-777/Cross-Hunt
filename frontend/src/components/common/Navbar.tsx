import React, { useState, useEffect } from 'react';
import { Anchor, Compass, Calendar, LogOut, Menu, X, Shield, Ship, Waves } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentTab: string;
  onNavigate: (tab: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'py-2.5' : 'py-4'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl px-5 py-3 flex items-center justify-between border border-sky-200/80 shadow-lg shadow-sky-900/5">
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-3 text-left group cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-white border-2 border-sky-400 flex items-center justify-center p-1.5 shadow-sm group-hover:border-sky-500 overflow-hidden transition-all duration-300">
              <img
                src="/static/images/logo_icon.png"
                alt="Cross Hunt Emblem"
                className="w-full h-full object-contain rounded-full filter group-hover:rotate-45 transition-transform duration-700 ease-out"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Anchor className="w-5 h-5 text-sky-600 hidden group-hover:inline-block" />
            </div>
            <div>
              <span className="font-display font-extrabold text-xl tracking-wider text-slate-900 flex items-center gap-1">
                CROSS <span className="text-sky-600">HUNT</span>
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-semibold -mt-1">
                Luxury Maritime Voyages
              </span>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            <button
              onClick={() => onNavigate('home')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 cursor-pointer ${
                currentTab === 'home'
                  ? 'text-sky-700 bg-sky-50 border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'explore'
                  ? 'text-sky-700 bg-sky-50 border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Compass className="w-4 h-4 text-sky-600" />
              Explore Ships
            </button>
            <button
              onClick={() => onNavigate('tours')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'tours'
                  ? 'text-sky-700 bg-sky-50 border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Waves className="w-4 h-4 text-sky-600" />
              Public Tours
            </button>
            <button
              onClick={() => onNavigate('events')}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                currentTab === 'events'
                  ? 'text-sky-700 bg-sky-50 border border-sky-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              Private Events
            </button>
          </div>

          {/* User Controls & CTA */}
          <div className="hidden md:flex items-center space-x-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-800 text-sm font-semibold transition cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user.first_name || user.username}</span>
                  {user.is_admin && (
                    <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                      Admin
                    </span>
                  )}
                  {user.is_operator && !user.is_admin && (
                    <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-300 px-1.5 py-0.5 rounded font-bold">
                      Fleet Operator
                    </span>
                  )}
                </button>

                {/* Dropdown Menu */}
                {userDropdownOpen && (
                  <div
                    className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-2xl border border-sky-100 z-50 animate-in fade-in zoom-in-95 duration-150"
                    onMouseLeave={() => setUserDropdownOpen(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100 mb-1">
                      <p className="text-xs text-slate-400">Signed in as</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{user.email || user.username}</p>
                    </div>

                    <button
                      onClick={() => {
                        onNavigate('dashboard');
                        setUserDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:text-slate-900 hover:bg-sky-50 flex items-center gap-2 transition cursor-pointer font-medium"
                    >
                      <Ship className="w-4 h-4 text-sky-600" />
                      My Voyages & Tickets
                    </button>

                    {user.is_operator && (
                      <button
                        onClick={() => {
                          onNavigate('operator');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:text-slate-900 hover:bg-sky-50 flex items-center gap-2 transition cursor-pointer font-medium"
                      >
                        <Compass className="w-4 h-4 text-sky-600" />
                        Operator Fleet Suite
                      </button>
                    )}

                    {user.is_admin && (
                      <button
                        onClick={() => {
                          onNavigate('admin');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:text-slate-900 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer font-medium"
                      >
                        <Shield className="w-4 h-4 text-red-500" />
                        Admin Control Center
                      </button>
                    )}

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      onClick={async () => {
                        await logout();
                        setUserDropdownOpen(false);
                        onNavigate('home');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer font-semibold"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('login')}
                  className="px-4 py-1.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-1.5 rounded-xl text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-400/20 transition cursor-pointer"
                >
                  Join Voyage
                </button>
              </div>
            )}

            <button
              onClick={() => onNavigate('explore')}
              className="px-4 py-1.5 rounded-xl text-sm font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-300 flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              Book Ship
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-2xl bg-white border border-sky-200 space-y-2 shadow-2xl">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-sky-50 font-medium"
            >
              Home
            </button>
            <button
              onClick={() => {
                onNavigate('explore');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-sky-50 flex items-center gap-2 font-medium"
            >
              <Compass className="w-4 h-4 text-sky-600" />
              Explore Ships
            </button>
            <button
              onClick={() => {
                onNavigate('tours');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-sky-50 flex items-center gap-2 font-medium"
            >
              <Waves className="w-4 h-4 text-sky-600" />
              Public Tours
            </button>
            <button
              onClick={() => {
                onNavigate('events');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-sky-50 flex items-center gap-2 font-medium"
            >
              <Calendar className="w-4 h-4 text-amber-600" />
              Private Events
            </button>

            {user ? (
              <div className="border-t border-slate-100 pt-2 space-y-2">
                <button
                  onClick={() => {
                    onNavigate('dashboard');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sky-700 hover:bg-sky-50 flex items-center gap-2 font-semibold"
                >
                  <Ship className="w-4 h-4" />
                  My Voyages & Tickets
                </button>
                {user.is_operator && (
                  <button
                    onClick={() => {
                      onNavigate('operator');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-slate-700 hover:bg-sky-50 flex items-center gap-2 font-medium"
                  >
                    Operator Fleet Suite
                  </button>
                )}
                {user.is_admin && (
                  <button
                    onClick={() => {
                      onNavigate('admin');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                  >
                    Admin Control Center
                  </button>
                )}
                <button
                  onClick={async () => {
                    await logout();
                    setMobileMenuOpen(false);
                    onNavigate('home');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="border-t border-slate-100 pt-2 flex flex-col gap-2">
                <button
                  onClick={() => {
                    onNavigate('login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-slate-100 text-slate-800 font-semibold"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onNavigate('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-sky-500 text-white font-bold"
                >
                  Join Voyage
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
