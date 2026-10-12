import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Anchor, Compass, Calendar, LogOut, Menu, X, Shield, Ship, Waves, Search, Heart, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  currentTab?: string;
  onNavigate?: (tab: string, param?: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab: propCurrentTab, onNavigate: propOnNavigate }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Derive active tab from URL path
  const currentTab = propCurrentTab || (() => {
    const p = location.pathname.toLowerCase();
    if (p === '/' || p === '') return 'home';
    if (p.startsWith('/explore') || p.startsWith('/cruises') || p.startsWith('/ships')) return 'explore';
    if (p.startsWith('/tours') || p.startsWith('/book-tour')) return 'tours';
    if (p.startsWith('/events')) return 'events';
    if (p.startsWith('/dashboard')) return 'dashboard';
    if (p.startsWith('/owner') || p.startsWith('/operator')) return 'owner';
    if (p.startsWith('/admin')) return 'admin-panel';
    if (p.startsWith('/login')) return 'login';
    if (p.startsWith('/register')) return 'register';
    if (p.startsWith('/about')) return 'about';
    if (p.startsWith('/contact')) return 'contact';
    return 'home';
  })();

  const onNavigate = (tab: string, param?: string) => {
    if (propOnNavigate) {
      propOnNavigate(tab, param);
      return;
    }
    const routeMap: Record<string, string> = {
      home: '/',
      explore: param ? `/explore?query=${encodeURIComponent(param)}` : '/explore',
      destinations: '/tours',
      about: '/about',
      contact: '/contact',
      tours: '/tours',
      events: '/events',
      dashboard: '/dashboard',
      owner: '/owner',
      'admin-panel': '/admin-panel',
      login: '/login',
      register: '/register',
    };
    if (routeMap[tab]) {
      navigate(routeMap[tab]);
    }
  };

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
        scrolled ? 'py-2' : 'py-3.5'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl px-5 sm:px-6 py-2.5 flex items-center justify-between border border-sky-100/90 shadow-lg shadow-sky-950/5">
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 p-[2px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center overflow-hidden">
                <Ship className="w-5 h-5 text-sky-300" />
              </div>
            </div>
            <div>
              <span className="font-display font-black text-lg tracking-wider text-slate-900 flex items-center gap-1 leading-none">
                CROSS <span className="text-sky-600">HUNT</span>
              </span>
              <span className="block text-[9px] uppercase tracking-widest text-slate-400 font-bold mt-0.5">
                Luxury Ship & Boat Trips
              </span>
            </div>
          </button>

          {/* Desktop Nav Links (Matching user screenshot) */}
          <div className="hidden lg:flex items-center space-x-1 xl:space-x-2">
            <button
              onClick={() => onNavigate('home')}
              className={`relative px-3.5 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'home'
                  ? 'text-sky-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Home
              {currentTab === 'home' && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-sky-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => onNavigate('explore')}
              className={`px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'explore'
                  ? 'text-sky-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Explore Ships
            </button>
            <button
              onClick={() => onNavigate('tours')}
              className={`px-3 py-1.5 text-sm font-semibold transition-all cursor-pointer ${
                currentTab === 'tours'
                  ? 'text-sky-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Public Tours
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
                  {user.is_admin ? (
                    <span className="text-[10px] bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold">
                      Admin
                    </span>
                  ) : user.is_operator ? (
                    <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-300 px-1.5 py-0.5 rounded font-bold">
                      Ship Owner
                    </span>
                  ) : (
                    <span className="text-[10px] bg-sky-100 text-sky-800 border border-sky-200 px-1.5 py-0.5 rounded font-bold">
                      Customer
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

                    {/* Role-Specific Dashboard Primary Entry */}
                    {user.is_admin ? (
                      <button
                        onClick={() => {
                          onNavigate('admin-panel');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-700 hover:text-red-900 hover:bg-red-50 flex items-center gap-2 transition cursor-pointer font-bold"
                      >
                        <Shield className="w-4 h-4 text-red-600" />
                        Admin Control Center
                      </button>
                    ) : user.is_operator ? (
                      <button
                        onClick={() => {
                          onNavigate('owner');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-amber-800 hover:text-amber-900 hover:bg-amber-50 flex items-center gap-2 transition cursor-pointer font-bold"
                      >
                        <Ship className="w-4 h-4 text-amber-600" />
                        My Fleet & Operations
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onNavigate('dashboard');
                          setUserDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-sky-800 hover:text-sky-900 hover:bg-sky-50 flex items-center gap-2 transition cursor-pointer font-bold"
                      >
                        <Ship className="w-4 h-4 text-sky-600" />
                        Customer Dashboard
                      </button>
                    )}

                    {/* Additional cross-navigation for Admin */}
                    {user.is_admin && (
                      <>
                        <button
                          onClick={() => {
                            onNavigate('owner');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer font-medium"
                        >
                          <Compass className="w-3.5 h-3.5 text-slate-500" />
                          Fleet Operator View
                        </button>
                        <button
                          onClick={() => {
                            onNavigate('dashboard');
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition cursor-pointer font-medium"
                        >
                          <Ship className="w-3.5 h-3.5 text-slate-500" />
                          Customer View
                        </button>
                      </>
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
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onNavigate('explore')}
                  className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Search Ships"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="p-2 text-slate-500 hover:text-rose-500 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  title="Wishlist"
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('login')}
                  className="px-3.5 py-1.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('register')}
                  className="px-4 py-2 rounded-xl text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20 transition cursor-pointer active:scale-95"
                >
                  Sign Up
                </button>
              </div>
            )}

            <button
              onClick={() => onNavigate('explore')}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold bg-gradient-to-r from-sky-900 to-blue-950 hover:from-sky-800 hover:to-blue-900 text-white flex items-center gap-1.5 transition-all shadow-md shadow-sky-950/20 active:scale-95 cursor-pointer ml-1"
            >
              <span>Book Ship</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
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
                {user.is_admin ? (
                  <button
                    onClick={() => {
                      onNavigate('admin-panel');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-red-700 bg-red-50 flex items-center gap-2 font-bold"
                  >
                    <Shield className="w-4 h-4 text-red-600" />
                    Admin Control Center
                  </button>
                ) : user.is_operator ? (
                  <button
                    onClick={() => {
                      onNavigate('owner');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-amber-800 bg-amber-50 flex items-center gap-2 font-bold"
                  >
                    <Ship className="w-4 h-4 text-amber-600" />
                    My Fleet & Operations
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onNavigate('dashboard');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sky-700 bg-sky-50 flex items-center gap-2 font-bold"
                  >
                    <Ship className="w-4 h-4 text-sky-600" />
                    Customer Dashboard
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
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
