import React, { useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { CruiseDetailPage } from './pages/CruiseDetailPage';
import { BookTourPage } from './pages/BookTourPage';
import { ToursPage } from './pages/ToursPage';
import { TourDetailPage } from './pages/TourDetailPage';
import { BookPublicTourTicketPage } from './pages/BookPublicTourTicketPage';
import { PrivateEventsPage } from './pages/PrivateEventsPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { TicketVerifyPage } from './pages/TicketVerifyPage';
import { AuthPage } from './pages/AuthPages';
import { CrossHuntAiWidget } from './components/ai/CrossHuntAiWidget';
import { Loader2 } from 'lucide-react';


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
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader />;
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
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
 * Route guard for Login and Register pages. If already signed in, redirects to appropriate dashboard.
 */
function GuestRoute({ mode }: { mode: 'login' | 'register' }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <PageLoader />;
  }
  if (user) {
    if (user.is_admin || user.role === 'ADMIN') return <Navigate to="/admin-panel" replace />;
    if (user.is_operator || user.role === 'OWNER' || user.role === 'CROSS_OWNER') return <Navigate to="/owner" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleAuthSuccess = (loggedUser: any) => {
    if (loggedUser?.is_admin || loggedUser?.role === 'ADMIN') {
      navigate('/admin-panel');
    } else if (
      loggedUser?.is_operator ||
      loggedUser?.role === 'OWNER' ||
      loggedUser?.role === 'CROSS_OWNER'
    ) {
      navigate('/owner');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <AuthPage
      initialMode={mode}
      onSuccess={handleAuthSuccess}
      onSwitchMode={(nextMode) => navigate(`/${nextMode}`)}
    />
  );
}

/**
 * Main application content with route handlers and navigation wiring.
 */
const AppContent: React.FC = () => {
  const navigate = useNavigate();

  const handleNavigate = (tab: string, param?: string) => {
    if (tab === 'home') navigate('/');
    else if (tab === 'explore') navigate(param ? `/explore?query=${encodeURIComponent(param)}` : '/explore');
    else if (tab === 'tours') navigate(param ? `/tours${param.startsWith('?') ? param : `?${param}`}` : '/tours');
    else if (tab === 'events') navigate('/events');
    else if (tab === 'dashboard') navigate('/dashboard');
    else if (tab === 'owner') navigate('/owner');
    else if (tab === 'admin-panel') navigate('/admin-panel');
    else if (tab === 'login') navigate('/login');
    else if (tab === 'register') navigate('/register');
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#051833] flex flex-col justify-between selection:bg-[#0284c7]/20 selection:text-[#051833]">
      <ScrollToTop />
      {/* Universal Responsive Navbar */}
      <Navbar />

      {/* Primary Routes */}
      <main className="flex-1">
        <Routes>
          {/* Home View */}
          <Route
            path="/"
            element={
              <HomePage
                onNavigate={handleNavigate}
                onSelectCruise={(c) => { navigate(`/cruises/${c.slug || c.id}`); }}
                onBookCruise={(c, cabin) => { navigate(`/book-cruise/${c.slug || c.id}${cabin ? `?cabin=${cabin}` : ''}`); }}
                onSelectTour={(t) => { navigate(`/tours/${t.slug || t.id}`); }}
                onBookTour={(t) => { navigate(`/book-tour/${t.slug || t.id}`); }}
              />
            }
          />

          {/* Catalog: Explore Ships & Private Charters */}
          <Route
            path="/explore"
            element={
              <ExplorePage
                onSelectCruise={(c) => { navigate(`/cruises/${c.slug || c.id}`); }}
                onBookCruise={(c) => { navigate(`/book-cruise/${c.slug || c.id}`); }}
              />
            }
          />

          {/* Ship Details (supports both /cruises/:id and /ships/:id) */}
          <Route
            path="/cruises/:id"
            element={
              <CruiseDetailPage
                onBack={() => { navigate('/explore'); }}
                onBookTour={(c, cabin) => { navigate(`/book-cruise/${c.slug || c.id}${cabin ? `?cabin=${cabin}` : ''}`); }}
                onBookEvent={() => { navigate('/events'); }}
              />
            }
          />
          <Route
            path="/ships/:id"
            element={
              <CruiseDetailPage
                onBack={() => { navigate('/explore'); }}
                onBookTour={(c, cabin) => { navigate(`/book-cruise/${c.slug || c.id}${cabin ? `?cabin=${cabin}` : ''}`); }}
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
                onBookTour={(t) => { navigate(`/book-tour/${t.slug || t.id}`); }}
              />
            }
          />

          {/* Public Tour Detail */}
          <Route
            path="/tours/:id"
            element={
              <TourDetailPage
                onBack={() => { navigate('/tours'); }}
                onBookTourTicket={(t) => { navigate(`/book-tour/${t.slug || t.id}`); }}
              />
            }
          />

          {/* Booking: Private Ship Charter */}
          <Route
            path="/book-cruise/:id"
            element={
              <BookTourPage
                onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                onCancel={() => navigate('/explore')}
                onNeedLogin={() => navigate('/login')}
              />
            }
          />
          <Route
            path="/book-cruise"
            element={
              <BookTourPage
                onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                onCancel={() => navigate('/explore')}
                onNeedLogin={() => navigate('/login')}
              />
            }
          />
          <Route path="/private-booking" element={<Navigate to="/explore" replace />} />

          {/* Booking: Public Cruise Tour Ticket */}
          <Route
            path="/book-tour/:id"
            element={
              <BookPublicTourTicketPage
                onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                onCancel={() => navigate('/tours')}
                onNeedLogin={() => navigate('/login')}
              />
            }
          />

          {/* Events: Private Celebrations & Weddings */}
          <Route
            path="/events"
            element={
              <PrivateEventsPage
                onSuccess={(b) => navigate(`/dashboard?booking_id=${b?.booking_id || ''}&openPass=true`)}
                onNeedLogin={() => navigate('/login')}
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
          <Route path="/login" element={<GuestRoute mode="login" />} />
          <Route path="/register" element={<GuestRoute mode="register" />} />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Personal AI Cruise Assistant Widget (3D Dolphin 🐬 + Chat Modal) */}
      <CrossHuntAiWidget />

      {/* Global Nautical Footer */}
      <Footer />
    </div>
  );
};


export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
