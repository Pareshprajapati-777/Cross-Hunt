import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Anchor, Compass, Calendar, LogOut, Menu, X, Shield, Ship, Waves, Search, Heart, ArrowRight, Bell, AlertTriangle, Tag, Megaphone, Check, Sparkles, Zap, Wallet, QrCode } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getUserNotifications, markNotificationRead, markAllNotificationsRead } from '../../api/dashboards';
import { getWalletSummary } from '../../api/wallet';
import { WalletModal } from '../wallet/WalletModal';
import { BoardingPassScannerModal } from '../ticket/BoardingPassScannerModal';

interface NavbarProps {
  currentTab?: string;
  onNavigate?: (tab: string, param?: string) => void;
}

const getReadNotifIds = (userId?: number): Set<number> => {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(`cruisehunt_read_notifs_${userId}`) || localStorage.getItem(`crosshunt_read_notifs_${userId}`);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
};

const saveReadNotifIds = (userId: number, ids: number[]) => {
  try {
    const existing = getReadNotifIds(userId);
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(`cruisehunt_read_notifs_${userId}`, JSON.stringify(Array.from(existing)));
  } catch {}
};

export const Navbar: React.FC<NavbarProps> = ({ currentTab: propCurrentTab, onNavigate: propOnNavigate }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [copiedPromo, setCopiedPromo] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [scannerModalOpen, setScannerModalOpen] = useState(false);

  const isStaffOrOwner = Boolean(
    user?.is_admin ||
    user?.role === 'ADMIN' ||
    user?.is_operator ||
    user?.role === 'OWNER' ||
    user?.role === 'CRUISE_OWNER' ||
    user?.role === 'CROSS_OWNER'
  );

  useEffect(() => {
    if (!user || isStaffOrOwner) {
      setWalletBalance(0);
      return;
    }

    const refreshWallet = () => {
      getWalletSummary()
        .then((res) => {
          if (res && typeof res.wallet_balance === 'number') {
            setWalletBalance(res.wallet_balance);
          }
        })
        .catch(() => {});
    };

    refreshWallet();
    window.addEventListener('wallet-updated', refreshWallet);
    const interval = setInterval(refreshWallet, 30000);
    return () => {
      window.removeEventListener('wallet-updated', refreshWallet);
      clearInterval(interval);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    const refreshNotifs = () => {
      getUserNotifications()
        .then((res) => {
          const readSet = getReadNotifIds(user.id);
          const list = (res.notifications || []).map((n: any) => ({
            ...n,
            is_read: Boolean(n.is_read || readSet.has(n.id)),
          }));
          setNotifications(list);
          const unread = list.filter((n: any) => !n.is_read).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    };

    refreshNotifs();
    window.addEventListener('notification-updated', refreshNotifs);
    const interval = setInterval(refreshNotifs, 25000);
    return () => {
      window.removeEventListener('notification-updated', refreshNotifs);
      clearInterval(interval);
    };
  }, [user?.id]);

  const handleOpenNotifications = () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    setUserDropdownOpen(false);

    if (next && user) {
      // Instant dismissal of badge and ticks on viewing!
      setUnreadCount(0);
      setNotifications((prev) => {
        const allIds = prev.map((n) => n.id);
        if (allIds.length > 0) {
          saveReadNotifIds(user.id, allIds);
        }
        return prev.map((n) => ({ ...n, is_read: true }));
      });

      // Synchronize with server in background
      markAllNotificationsRead()
        .then(() => {
          getUserNotifications()
            .then((res) => {
              const allIds = (res.notifications || []).map((n: any) => n.id);
              saveReadNotifIds(user.id, allIds);
              const list = (res.notifications || []).map((n: any) => ({
                ...n,
                is_read: true,
              }));
              setNotifications(list);
              setUnreadCount(0);
            })
            .catch(() => {});
        })
        .catch(() => {});
    }
  };

  const handleMarkAllRead = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    setUnreadCount(0);
    setNotifications((prev) => {
      const allIds = prev.map((n) => n.id);
      saveReadNotifIds(user.id, allIds);
      return prev.map((n) => ({ ...n, is_read: true }));
    });
    try {
      await markAllNotificationsRead();
    } catch {}
  };

  const formatNotifDate = (dateVal: string) => {
    if (!dateVal) return '';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return dateVal;
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleNotificationClick = async (notif: any) => {
    if (user) {
      saveReadNotifIds(user.id, [notif.id]);
    }
    if (!notif.is_read) {
      markNotificationRead(notif.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (notif.action_link) {
      setNotificationsOpen(false);
      navigate(notif.action_link);
    }
  };

  // Derive active tab from URL path
  const currentTab = propCurrentTab || (() => {
    const p = location.pathname.toLowerCase();
    if (p === '/' || p === '') return 'home';
    if (p.startsWith('/explore') || p.startsWith('/cruises') || p.startsWith('/ships')) return 'explore';
    if (p.startsWith('/tours') || p.startsWith('/book-tour')) return 'tours';
    if (p.startsWith('/activities')) return 'activities';
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
    if (tab === 'login' || tab === 'register') {
      navigate(`/${tab}${location.search}`, { state: location.state });
      return;
    }
    const routeMap: Record<string, string> = {
      home: '/',
      explore: param ? `/explore?query=${encodeURIComponent(param)}` : '/explore',
      destinations: '/tours',
      about: '/about',
      contact: '/contact',
      tours: '/tours',
      activities: '/activities',
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
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl px-5 sm:px-6 py-2.5 flex items-center justify-between border-2 border-sky-400 shadow-[0_0_25px_rgba(14,165,233,0.35),0_0_50px_rgba(56,189,248,0.18),0_10px_30px_rgba(2,132,199,0.1)] ring-1 ring-sky-300/40">
          {/* Logo & Brand */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0284c7] via-[#0369a1] to-[#fff8dc] p-[2px] shadow-sm flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center overflow-hidden">
                <Ship className="w-5 h-5 text-[#0284c7]" />
              </div>
            </div>
            <div>
              <span className="font-heading-more text-lg tracking-wider text-[#051833] flex items-center gap-1.5 leading-none">
                CRUISE <span className="text-[#0284c7]">HUNT</span>
              </span>
            </div>
          </button>

          {/* Desktop Nav Links (Clean Pearl Light & Deep Navy Style) */}
          <div className="hidden lg:flex items-center space-x-1.5 bg-[#f1f5f9]/90 border border-[#0284c7]/15 rounded-full p-1 backdrop-blur-md">
            {[
              { id: 'home', label: 'Home' },
              { id: 'explore', label: 'Fleet & Ships' },
              { id: 'tours', label: 'Public Tours' },
              { id: 'activities', label: 'Activities' },
              { id: 'events', label: 'Private Events' },
            ].map((tab) => {
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onNavigate(tab.id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#051833] text-[#fff8dc] shadow-md shadow-[#051833]/25 font-black'
                      : 'text-[#334155] hover:text-[#051833] hover:bg-white'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* User Controls & Navy CTA */}
          <div className="hidden md:flex items-center space-x-3">
            <button
              onClick={() => onNavigate('explore')}
              className="px-4 py-1.5 rounded-full bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] text-xs font-black transition flex items-center gap-1.5 shadow-md shadow-[#051833]/20 cursor-pointer"
            >
              <span>Charter a Ship</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#fff8dc]" />
            </button>
            {user ? (
              <>
                {/* Top Boarding Pass Scanner for Vessel Owners & Operators */}
                {isStaffOrOwner && (
                  <button
                    type="button"
                    onClick={() => setScannerModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md shadow-emerald-700/25 transition cursor-pointer"
                    title="Scan Customer Boarding Pass for Ship Entry"
                  >
                    <QrCode className="w-3.5 h-3.5 text-emerald-200" />
                    <span className="hidden sm:inline">Scan Boarding Pass</span>
                    <span className="sm:hidden">Scan</span>
                  </button>
                )}

                {/* Direct Notifications Bell */}
                <div className="relative">
                  <button
                    onClick={handleOpenNotifications}
                    className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                    title="Platform Notifications"
                    aria-label="Platform Notifications"
                  >
                    <Bell className="w-5 h-5 text-slate-700" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Dropdown Flyout */}
                  {notificationsOpen && (
                    <div
                      className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white p-3 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
                      onMouseLeave={() => setNotificationsOpen(false)}
                    >
                      <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-sky-600" />
                          <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          {notifications.length > 0 && (
                            <button
                              type="button"
                              onClick={handleMarkAllRead}
                              className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 transition flex items-center gap-1 cursor-pointer hover:underline"
                              title="Mark all notifications as read"
                            >
                              <Check className="w-3 h-3 text-sky-600" />
                              <span>Mark all read</span>
                            </button>
                          )}
                          {unreadCount > 0 ? (
                            <span className="text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full">
                              {unreadCount} new
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">All caught up</span>
                          )}
                        </div>
                      </div>

                      <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                        {notifications.length === 0 ? (
                          <div className="py-8 text-center text-xs text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          notifications.map((notif) => {
                            const isOffer = notif.notification_type === 'OFFER';
                            const isAlert = notif.notification_type === 'UPDATE';
                            const promoCodeMatch = notif.promo_code || (() => {
                              const m = `${notif.title} ${notif.message}`.match(/(?:coupon\s+code|promo\s+code|voucher|coupon|code)\s*[:\-]?\s*([A-Z0-9_-]{4,20})/i);
                              return m ? m[1].toUpperCase() : null;
                            })();

                            return (
                              <div
                                key={notif.id}
                                onClick={() => handleNotificationClick(notif)}
                                className={`p-2.5 rounded-xl transition cursor-pointer border ${
                                  notif.is_read
                                    ? 'bg-slate-50/50 border-slate-100 text-slate-600'
                                    : isOffer
                                    ? 'bg-amber-50/70 border-amber-200 text-slate-900 shadow-sm'
                                    : isAlert
                                    ? 'bg-rose-50/70 border-rose-200 text-slate-900 shadow-sm'
                                    : 'bg-sky-50/70 border-sky-200 text-slate-900 shadow-sm'
                                } hover:border-slate-300`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className="mt-0.5 flex-shrink-0">
                                    {isOffer ? (
                                      <Tag className="w-4 h-4 text-amber-600" />
                                    ) : isAlert ? (
                                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                                    ) : (
                                      <Megaphone className="w-4 h-4 text-sky-600" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1">
                                      <p className="text-xs font-bold truncate">{notif.title}</p>
                                      {!notif.is_read && (
                                        <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                                      {notif.message}
                                    </p>

                                    {/* Actionable Promo Code Chip */}
                                    {promoCodeMatch && (
                                      <div className="mt-2 pt-1.5 border-t border-amber-200/80 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-950 font-mono font-bold text-[10px] border border-amber-300">
                                          <Tag className="w-2.5 h-2.5 text-amber-700" />
                                          <span>{promoCodeMatch}</span>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(promoCodeMatch);
                                            setCopiedPromo(promoCodeMatch);
                                            setTimeout(() => setCopiedPromo(null), 2500);
                                          }}
                                          className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                                        >
                                          {copiedPromo === promoCodeMatch ? (
                                            <>
                                              <Check className="w-2.5 h-2.5" />
                                              <span>Copied!</span>
                                            </>
                                          ) : (
                                            <span>Copy Code</span>
                                          )}
                                        </button>
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                      <span>{formatNotifDate(notif.created_at)}</span>
                                      {notif.sender_name && <span>{notif.sender_name}</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>


                <div className="relative">
                  <button
                    onClick={() => {
                      setUserDropdownOpen(!userDropdownOpen);
                      setNotificationsOpen(false);
                    }}
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

                      {/* Ship Entry Scanner Trigger - Owners & Admins */}
                      {isStaffOrOwner && (
                        <>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            onClick={() => {
                              setScannerModalOpen(true);
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 flex items-center gap-2 transition cursor-pointer font-bold"
                          >
                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                            Scan Boarding Pass (Ship Entry)
                          </button>
                        </>
                      )}

                      {/* Wallet Balance & Refunds Drawer Trigger - Passengers only */}
                      {!isStaffOrOwner && (
                        <>
                          <div className="border-t border-slate-100 my-1"></div>
                          <button
                            onClick={() => {
                              setWalletModalOpen(true);
                              setUserDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 flex items-center justify-between transition cursor-pointer font-bold"
                          >
                            <span className="flex items-center gap-2">
                              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
                              My Wallet &amp; Refunds
                            </span>
                            <span className="font-mono text-emerald-700 font-extrabold">
                              ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
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
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    currentTab === 'login'
                      ? 'bg-black text-white border border-black shadow-sm ring-2 ring-sky-400/40'
                      : 'text-black border border-black bg-white hover:bg-black hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    currentTab === 'register'
                      ? 'bg-sky-600 text-white border border-sky-600 shadow-sm ring-2 ring-sky-400/50'
                      : 'bg-black hover:bg-slate-800 text-white border border-black shadow-sm'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile controls */}
          <div className="md:hidden flex items-center space-x-1.5 sm:space-x-2">
            {user && isStaffOrOwner && (
              <button
                type="button"
                onClick={() => setScannerModalOpen(true)}
                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-sm flex items-center gap-1 cursor-pointer"
                title="Scan Customer Boarding Pass for Ship Entry"
              >
                <QrCode className="w-3.5 h-3.5 text-emerald-200" />
                <span>Scan</span>
              </button>
            )}
            {user && (
              <>

                <div className="relative">
                  <button
                    type="button"
                    onClick={handleOpenNotifications}
                    className="relative p-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-900 transition cursor-pointer"
                    title="Platform Notifications"
                    aria-label="Platform Notifications"
                  >
                  <Bell className="w-5 h-5 text-slate-700" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div
                    className="fixed inset-x-4 top-20 max-w-sm mx-auto rounded-2xl bg-white p-3 shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-150 text-left"
                  >
                    <div className="flex items-center justify-between px-2 pb-2.5 mb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-sky-600" />
                        <h4 className="text-sm font-bold text-slate-900">Notifications</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 transition flex items-center gap-1 cursor-pointer hover:underline"
                            title="Mark all notifications as read"
                          >
                            <Check className="w-3 h-3 text-sky-600" />
                            <span>Mark read</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setNotificationsOpen(false)}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((notif) => {
                          const isOffer = notif.notification_type === 'OFFER';
                          const isAlert = notif.notification_type === 'UPDATE';
                          const promoCodeMatch = notif.promo_code || (() => {
                            const m = `${notif.title} ${notif.message}`.match(/(?:coupon\s+code|promo\s+code|voucher|coupon|code)\s*[:\-]?\s*([A-Z0-9_-]{4,20})/i);
                            return m ? m[1].toUpperCase() : null;
                          })();

                          return (
                            <div
                              key={notif.id}
                              onClick={() => handleNotificationClick(notif)}
                              className={`p-2.5 rounded-xl transition cursor-pointer border ${
                                notif.is_read
                                  ? 'bg-slate-50/50 border-slate-100 text-slate-600'
                                  : isOffer
                                  ? 'bg-amber-50/70 border-amber-200 text-slate-900 shadow-sm'
                                  : isAlert
                                  ? 'bg-rose-50/70 border-rose-200 text-slate-900 shadow-sm'
                                  : 'bg-sky-50/70 border-sky-200 text-slate-900 shadow-sm'
                              } hover:border-slate-300`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className="mt-0.5 flex-shrink-0">
                                  {isOffer ? (
                                    <Tag className="w-4 h-4 text-amber-600" />
                                  ) : isAlert ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                  ) : (
                                    <Megaphone className="w-4 h-4 text-sky-600" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-1">
                                    <p className="text-xs font-bold truncate">{notif.title}</p>
                                    {!notif.is_read && (
                                      <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-snug">
                                    {notif.message}
                                  </p>
                                  {promoCodeMatch && (
                                    <div className="mt-2 pt-1.5 border-t border-amber-200/80 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100/90 text-amber-950 font-mono font-bold text-[10px] border border-amber-300">
                                        <Tag className="w-2.5 h-2.5 text-amber-700" />
                                        <span>{promoCodeMatch}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigator.clipboard.writeText(promoCodeMatch);
                                          setCopiedPromo(promoCodeMatch);
                                          setTimeout(() => setCopiedPromo(null), 2500);
                                        }}
                                        className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1"
                                      >
                                        {copiedPromo === promoCodeMatch ? (
                                          <>
                                            <Check className="w-2.5 h-2.5" />
                                            <span>Copied!</span>
                                          </>
                                        ) : (
                                          <span>Copy</span>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                                    <span>{formatNotifDate(notif.created_at)}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
            <button
              onClick={() => {
                setMobileMenuOpen(!mobileMenuOpen);
                setNotificationsOpen(false);
              }}
              className="p-2 rounded-lg bg-slate-100 border border-slate-200 text-[#051833] hover:text-[#0284c7]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown drawer (Clean White & Navy) */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 p-4 rounded-2xl bg-white border border-[#0284c7]/20 space-y-2 shadow-2xl text-[#051833] max-h-[85dvh] overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              onClick={() => {
                onNavigate('home');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#051833] bg-sky-50 font-bold flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#0284c7]" />
              Home
            </button>
            <button
              onClick={() => {
                onNavigate('explore');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#334155] hover:bg-slate-50 flex items-center gap-2 font-medium"
            >
              <Compass className="w-4 h-4 text-[#0284c7]" />
              Fleet & Ships
            </button>
            <button
              onClick={() => {
                onNavigate('tours');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#334155] hover:bg-slate-50 flex items-center gap-2 font-medium"
            >
              <Waves className="w-4 h-4 text-[#0284c7]" />
              Public Tours
            </button>
            <button
              onClick={() => {
                onNavigate('activities');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#334155] hover:bg-slate-50 flex items-center gap-2 font-medium"
            >
              <Zap className="w-4 h-4 text-[#0284c7]" />
              Activities &amp; Water Sports
            </button>
            <button
              onClick={() => {
                onNavigate('events');
                setMobileMenuOpen(false);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-[#334155] hover:bg-slate-50 flex items-center gap-2 font-medium"
            >
              <Calendar className="w-4 h-4 text-[#0284c7]" />
              Private Events
            </button>

            {user ? (
              <div className="border-t border-slate-100 pt-2 space-y-2">
                {/* Mobile Drawer Wallet Hero Card - Passengers only */}
                {!isStaffOrOwner && (
                  <div
                    onClick={() => {
                      setWalletModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 text-white cursor-pointer shadow-md flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-emerald-200" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-200">
                          Cruise-Hunt Wallet
                        </div>
                        <div className="text-base font-black">
                          ₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl border border-white/25">
                      View &amp; Top-up →
                    </span>
                  </div>
                )}

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

                {/* Mobile Boarding Pass Scan Button for Owners */}
                {isStaffOrOwner && (
                  <button
                    onClick={() => {
                      setScannerModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between font-bold text-xs shadow-md"
                  >
                    <span className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-200" />
                      Scan Boarding Pass (Ship Entry)
                    </span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">
                      Gate Entry
                    </span>
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
                  className="w-full py-2 rounded-xl bg-white border border-black text-black font-bold hover:bg-slate-100 transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onNavigate('register');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-xl bg-black border border-black text-white font-bold hover:bg-slate-800 shadow-md transition"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Global Wallet Modal - Passengers only */}
      <WalletModal
        isOpen={walletModalOpen && !isStaffOrOwner}
        onClose={() => setWalletModalOpen(false)}
      />

      {/* Boarding Pass Scanner Modal - Vessel Owners & Operators */}
      <BoardingPassScannerModal
        isOpen={scannerModalOpen && isStaffOrOwner}
        onClose={() => setScannerModalOpen(false)}
      />
    </nav>
  );
};
