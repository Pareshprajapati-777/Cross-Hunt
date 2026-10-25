import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModalProvider, useAuthModal } from './context/AuthModalContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { LoginRequiredModal } from './components/auth/LoginRequiredModal';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';

// Code-split heavy routes to maximize initial loading speed & minimize bundle size
const ExplorePage = React.lazy(() => import('./pages/ExplorePage').then((m) => ({ default: m.ExplorePage })));
const CruiseDetailPage = React.lazy(() => import('./pages/CruiseDetailPage').then((m) => ({ default: m.CruiseDetailPage })));
const BookTourPage = React.lazy(() => import('./pages/BookTourPage').then((m) => ({ default: m.BookTourPage })));
const ToursPage = React.lazy(() => import('./pages/ToursPage').then((m) => ({ default: m.ToursPage })));
const TourDetailPage = React.lazy(() => import('./pages/TourDetailPage').then((m) => ({ default: m.TourDetailPage })));
const BookPublicTourTicketPage = React.lazy(() => import('./pages/BookPublicTourTicketPage').then((m) => ({ default: m.BookPublicTourTicketPage })));
const ActivitiesPage = React.lazy(() => import('./pages/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })));
const ActivityDetailPage = React.lazy(() => import('./pages/ActivityDetailPage').then((m) => ({ default: m.ActivityDetailPage })));
const PrivateEventsPage = React.lazy(() => import('./pages/PrivateEventsPage').then((m) => ({ default: m.PrivateEventsPage })));
const UserDashboardPage = React.lazy(() => import('./pages/UserDashboardPage').then((m) => ({ default: m.UserDashboardPage })));
const OperatorDashboardPage = React.lazy(() => import('./pages/OperatorDashboardPage').then((m) => ({ default: m.OperatorDashboardPage })));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const TicketVerifyPage = React.lazy(() => import('./pages/TicketVerifyPage').then((m) => ({ default: m.TicketVerifyPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPages').then((m) => ({ default: m.AuthPage })));

import { CrossHuntAiWidget } from './components/ai/CrossHuntAiWidget';
import { Loader2, Lock, ArrowRight } from 'lucide-react';


/**
 * Automatically scrolls to top on every route change.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

/**
 * Sleek loading state while user auth session is being verified.
 */
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
        <p className="text-slate-500 text-sm font-medium">Loading your trip...</p>
      </div>
    </div>
  );
}

/**
 * Route guard: requires user to be logged in.
 * Renders a prominent Login Required window prompt if accessed without authentication.
 */
function ProtectedRoute({ children, featureName = 'Protected Passenger Feature' }: { children: React.ReactNode; featureName?: string }) {
  const { user, loading } = useAuth();
  const { openLoginModal } = useAuthModal();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }
  if (!user) {
    const returnUrl = `${location.pathname}${location.search}`;
    return (
      <div className="min-h-screen pt-32 pb-24 px-4 flex items-center justify-center bg-[#f8f9fa]">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border-2 border-sky-400 shadow-xl text-center space-y-4 shadow-[0_0_40px_rgba(14,165,233,0.25)]">
          <div className="w-16 h-16 rounded-2xl bg-[#051833] text-sky-400 flex items-center justify-center mx-auto shadow-lg shadow-sky-600/30">
            <Lock className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-800 text-[11px] font-extrabold uppercase tracking-wider border border-sky-200">
            Authentication Required • लॉगिन आवश्यक है
          </div>
          <h2 className="text-2xl font-black text-slate-900 font-serif">Login Required</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Is feature ka upyog karne ke liye passenger account login zaroori hai. Please sign in or register to access this service.
          </p>
          <div className="space-y-2.5 pt-2">
            <button
              onClick={() => {
                openLoginModal({
                  title: 'Account Login Required',
                  featureName,
                  returnUrl,
                });
              }}
              className="w-full py-3.5 rounded-2xl bg-[#051833] hover:bg-[#0a2548] text-[#fff8dc] font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Open Login Window / लॉगिन विंडो खोलें</span>
              <ArrowRight className="w-4 h-4 text-[#fff8dc]" />
            </button>
            <Link
              to={`/login?redirect=${encodeURIComponent(returnUrl)}`}
              className="block w-full py-3 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-xs border border-sky-200 transition text-center"
            >
              Go Directly to Sign In Page
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}

/**
 * Route guard: requires user to have Operator/Owner or Admin permissions.
 */
function OperatorRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.is_operator && !user.is_admin && user.role !== 'OWNER' && user.role !== 'CROSS_OWNER') {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/**
 * Route guard: requires Administrator permissions.
 */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (!user.is_admin && user.role !== 'ADMIN') {
    if (user.is_operator || user.role === 'OWNER' || user.role === 'CROSS_OWNER') {
      return <Navigate to="/owner" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

/**
 * Route guard for Login and Register pages. If already signed in or after authentication,
 * redirects to the intended booking page or to the appropriate user dashboard.
 */
function GuestRoute({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const fromState = (location.state as any)?.from;
  const redirectParam = searchParams.get('redirect');
  const returnUrl = redirectParam
    ? redirectParam
    : fromState
    ? (typeof fromState === 'string' ? fromState : `${fromState.pathname || ''}${fromState.search || ''}`)
    : null;

  const getDestination = (loggedUser: any) => {
    if (
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('/login') &&
      !returnUrl.startsWith('/register')
    ) {
      return returnUrl;
    }
    if (loggedUser?.is_admin || loggedUser?.role === 'ADMIN') return '/admin-panel';
    if (
      loggedUser?.is_operator ||
      loggedUser?.role === 'OWNER' ||
      loggedUser?.role === 'CROSS_OWNER'
    ) {
      return '/owner';
    }
    return '/dashboard';
  };

  if (loading) {
    return <PageLoader />;
  }
  if (user) {
    return <Navigate to={getDestination(user)} replace />;
  }

  const handleAuthSuccess = (loggedUser: any) => {
    navigate(getDestination(loggedUser), { replace: true });
  };

  return (
    <AuthPage
      key={mode}
      initialMode={mode}
      onSuccess={handleAuthSuccess}
      onSwitchMode={(nextMode) => {
        const query = searchParams.toString();
        navigate(`/${nextMode}${query ? `?${query}` : ''}`, { state: location.state });
      }}
    />
  );
}

/**
 * Main application content with route handlers and navigation wiring.
 */
const AppContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { requireAuth } = useAuthModal();

  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'explore') navigate(param ? `/explore?query=${encodeURIComponent(param)}` : '/explore');
    else if (tab === 'tours') navigate(param ? `/tours${param.startsWith('?') ? param : `?${param}`}` : '/tours');
    else if (tab === 'activities') navigate('/activities');
    else if (tab === 'events') navigate('/events');
    else if (tab === 'dashboard') navigate('/dashboard');
    else if (tab === 'owner') navigate('/owner');
    else if (tab === 'admin-panel') navigate('/admin-panel');
    else if (tab === 'login' || tab === 'register') {
      navigate(`/${tab}${location.search}`, { state: location.state });
    }
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#051833] flex flex-col justify-between selection:bg-[#0284c7]/20 selection:text-[#051833]">
      <ScrollToTop />
      {/* Universal Responsive Navbar */}
      <Navbar onNavigate={handleNavigate} />

      {/* Primary Routes */}
      <main className="flex-1">
        <React.Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Home View */}
          <Route
            path="/"
            element={
              <HomePage
                onNavigate={handleNavigate}
                onSelectCruise={(c) => { navigate(`/cruises/${c.slug || c.id}`); }}
                onBookCruise={(c, cabin) => {
                  const target = `/book-cruise/${c.slug || c.id}${cabin ? `?cabin=${cabin}` : ''}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Reserve Vessel',
                      featureName: `${c.name} Charter Reservation`,
                      description: 'Passenger account login is required to select cabin packages, view verified operator pricing, and reserve this vessel.',
                      iconType: 'ship',
                      returnUrl: target,
                    }
                  );
                }}
                onSelectTour={(t) => { navigate(`/tours/${t.slug || t.id}`); }}
                onBookTour={(t) => {
                  const target = `/book-tour/${t.slug || t.id}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Book Tour Tickets',
                      featureName: `${t.title} Cruise Tour`,
                      description: 'Passenger login is required to book public tour tickets and receive verified digital QR boarding passes.',
                      iconType: 'ticket',
                      returnUrl: target,
                    }
                  );
                }}
              />
            }
          />

          {/* Catalog: Explore Ships & Private Charters */}
          <Route
            path="/explore"
            element={
              <ExplorePage
                onSelectCruise={(c) => { navigate(`/cruises/${c.slug || c.id}`); }}
                onBookCruise={(c) => {
                  const target = `/book-cruise/${c.slug || c.id}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Reserve Vessel',
                      featureName: `${c.name} Charter Reservation`,
                      description: 'Passenger login is required to select packages, calculate charter rates, and reserve this vessel.',
                      iconType: 'ship',
                      returnUrl: target,
                    }
                  );
                }}
              />
            }
          />

          {/* Ship Details (supports both /cruises/:id and /ships/:id) */}
          <Route
            path="/cruises/:id"
            element={
              <CruiseDetailPage
                onBack={() => { navigate('/explore'); }}
                onBookTour={(c, cabin) => {
                  const target = `/book-cruise/${c.slug || c.id}${cabin ? `?cabin=${cabin}` : ''}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Reserve Vessel',
                      featureName: `${c.name} Charter Reservation`,
                      description: 'Passenger login is required to reserve this vessel and confirm booking.',
                      iconType: 'ship',
                      returnUrl: target,
                    }
                  );
                }}
                onBookEvent={() => { navigate('/events'); }}
              />
            }
          />
          <Route
            path="/ships/:id"
            element={
              <CruiseDetailPage
                onBack={() => { navigate('/explore'); }}
                onBookTour={(c, cabin) => {
                  const target = `/book-cruise/${c.slug || c.id}${cabin ? `?cabin=${cabin}` : ''}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Reserve Vessel',
                      featureName: `${c.name} Charter Reservation`,
                      description: 'Passenger login is required to reserve this vessel and confirm booking.',
                      iconType: 'ship',
                      returnUrl: target,
                    }
                  );
                }}
                onBookEvent={() => { navigate('/events'); }}
              />
            }
          />

          {/* Catalog: Scheduled Public Tours */}
          <Route
            path="/tours"
            element={
              <ToursPage
                onSelectTour={(t) => { navigate(`/tours/${t.slug || t.id}`); }}
                onBookTour={(t) => {
                  const target = `/book-tour/${t.slug || t.id}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Book Tour Tickets',
                      featureName: `${t.title} Cruise Tour`,
                      description: 'Passenger login is required to book tour tickets and receive verified digital QR boarding passes.',
                      iconType: 'ticket',
                      returnUrl: target,
                    }
                  );
                }}
              />
            }
          />

          {/* Public Tour Detail */}
          <Route
            path="/tours/:id"
            element={
              <TourDetailPage
                onBack={() => { navigate('/tours'); }}
                onBookTourTicket={(t) => {
                  const target = `/book-tour/${t.slug || t.id}`;
                  requireAuth(
                    () => { navigate(target); },
                    {
                      title: 'Sign In to Book Tour Tickets',
                      featureName: `${t.title} Cruise Tour`,
                      description: 'Passenger login is required to book tour tickets and receive verified digital QR boarding passes.',
                      iconType: 'ticket',
                      returnUrl: target,
                    }
                  );
                }}
              />
            }
          />

          {/* Catalog: Water Sports & Marine Activities */}
          <Route
            path="/activities"
            element={<ActivitiesPage />}
          />
          <Route
            path="/activities/:slug"
            element={<ActivityDetailPage />}
          />

          {/* Booking: Private Ship Charter (Requires Authenticated User) */}
          <Route
            path="/book-cruise/:id"
            element={
              <ProtectedRoute>
                <BookTourPage
                  onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                  onCancel={() => navigate('/explore')}
                  onNeedLogin={() => navigate('/login')}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/book-cruise"
            element={
              <ProtectedRoute>
                <BookTourPage
                  onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                  onCancel={() => navigate('/explore')}
                  onNeedLogin={() => navigate('/login')}
                />
              </ProtectedRoute>
            }
          />
          <Route path="/private-booking" element={<Navigate to="/explore" replace />} />

          {/* Booking: Public Cruise Tour Ticket (Requires Authenticated User) */}
          <Route
            path="/book-tour/:id"
            element={
              <ProtectedRoute>
                <BookPublicTourTicketPage
                  onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                  onCancel={() => navigate('/tours')}
                  onNeedLogin={() => navigate('/login')}
                />
              </ProtectedRoute>
            }
          />

          {/* Events: Private Celebrations & Weddings */}
          <Route
            path="/events"
            element={
              <PrivateEventsPage
                onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                onNeedLogin={() => {
                  requireAuth(() => {}, {
                    title: 'Sign In to Reserve Private Event',
                    featureName: 'Private Yacht Event Booking',
                    description: 'Passenger account login is required to customize packages and submit event charter reservations.',
                    iconType: 'ship',
                    returnUrl: '/events',
                  });
                }}
              />
            }
          />

          {/* QR Scan & Boarding Pass Verification (Prompt Requirement #12 & #13) */}
          <Route path="/ticket/verify/:code" element={<TicketVerifyPage />} />
          <Route path="/tickets/verify/:code" element={<TicketVerifyPage />} />
          <Route path="/ticket/:code" element={<TicketVerifyPage />} />
          <Route path="/boarding-pass/:code" element={<TicketVerifyPage />} />

          {/* Customer Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <UserDashboardPage
                  onExplore={() => { navigate('/explore'); }}
                  onSelectCruise={(c) => { navigate(`/cruises/${c.slug || c.id}`); }}
                  onBookCruise={(c) => { navigate(`/book-cruise/${c.slug || c.id}`); }}
                  onSelectTour={(t) => { navigate(`/tours/${t.slug || t.id}`); }}
                  onBookTour={(t) => { navigate(`/book-tour/${t.slug || t.id}`); }}
                />
              </ProtectedRoute>
            }
          />

          {/* Fleet Operator / Ship Owner Dashboard */}
          <Route
            path="/owner"
            element={
              <OperatorRoute>
                <OperatorDashboardPage />
              </OperatorRoute>
            }
          />
          <Route path="/operator" element={<Navigate to="/owner" replace />} />

          {/* Administrator Command Center */}
          <Route
            path="/admin-panel"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route path="/admin" element={<Navigate to="/admin-panel" replace />} />

          {/* Authentication Pages */}
          <Route path="/login" element={<GuestRoute key="login" mode="login" />} />
          <Route path="/register" element={<GuestRoute key="register" mode="register" />} />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </React.Suspense>
      </main>

      {/* Global Login Required Modal Window */}
      <LoginRequiredModal />

      {/* Personal AI Cruise Assistant Widget (3D Dolphin 🐬 + Chat Modal) */}
      <CrossHuntAiWidget />

      {/* Global Nautical Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthModalProvider>
          <FavoritesProvider>
            <AppContent />
          </FavoritesProvider>
        </AuthModalProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
