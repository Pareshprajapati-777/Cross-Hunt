import React, { useState, useEffect } from 'react';
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
import { AuthPage } from './pages/AuthPages';
import { Cruise, Booking, PublicTour } from './api/types';

function getTabFromPath(): string {
  const path = window.location.pathname.toLowerCase().replace(/^\/|\/$/g, '');
  if (path === 'dashboard') return 'dashboard';
  if (path === 'owner' || path === 'operator') return 'owner';
  if (path === 'admin-panel' || path === 'admin') return 'admin-panel';
  if (path === 'explore') return 'explore';
  if (path === 'tours') return 'tours';
  if (path === 'events') return 'events';
  if (path === 'login') return 'login';
  if (path === 'register') return 'register';
  return 'home';
}

const MainApp: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>(getTabFromPath());
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedCruise, setSelectedCruise] = useState<Cruise | null>(null);
  const [selectedTour, setSelectedTour] = useState<PublicTour | null>(null);
  const [preselectedCabin, setPreselectedCabin] = useState<string>('OCEANVIEW');

  // Listen to browser forward/backward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentTab(getTabFromPath());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab, selectedCruise, selectedTour]);

  const handleNavigate = (tab: string, param?: string) => {
    setCurrentTab(tab);
    if (param) {
      setFilterQuery(param);
    }

    const pathToUrlMap: Record<string, string> = {
      'home': '/',
      'dashboard': '/dashboard',
      'owner': '/owner',
      'admin-panel': '/admin-panel',
      'explore': '/explore',
      'tours': '/tours',
      'events': '/events',
      'login': '/login',
      'register': '/register',
    };

    if (pathToUrlMap[tab]) {
      window.history.pushState({}, '', pathToUrlMap[tab]);
    }
  };

  // Role-based route enforcement
  useEffect(() => {
    if (!loading && user) {
      if (currentTab === 'owner' && !user.is_operator && !user.is_admin) {
        handleNavigate('dashboard');
      } else if (currentTab === 'admin-panel' && !user.is_admin) {
        if (user.is_operator) {
          handleNavigate('owner');
        } else {
          handleNavigate('dashboard');
        }
      }
    } else if (!loading && !user) {
      if (currentTab === 'dashboard' || currentTab === 'owner' || currentTab === 'admin-panel') {
        handleNavigate('login');
      }
    }
  }, [currentTab, user, loading]);

  const handleSelectCruise = (cruise: Cruise) => {
    setSelectedCruise(cruise);
    setCurrentTab('cruise-detail');
  };

  const handleBookCruise = (cruise: Cruise, cabin?: string) => {
    setSelectedCruise(cruise);
    if (cabin) setPreselectedCabin(cabin);
    setCurrentTab('book-tour');
  };

  const handleSelectTour = (tour: PublicTour) => {
    setSelectedTour(tour);
    setCurrentTab('tour-detail');
  };

  const handleBookPublicTour = (tour: PublicTour) => {
    setSelectedTour(tour);
    setCurrentTab('book-public-tour');
  };

  const handleBookingSuccess = (_booking: Booking) => {
    handleNavigate('dashboard');
  };

  // Specific role redirection upon successful login / registration
  const handleAuthSuccess = (loggedUser: any) => {
    if (loggedUser?.is_admin || loggedUser?.role === 'ADMIN') {
      handleNavigate('admin-panel');
    } else if (
      loggedUser?.is_operator ||
      loggedUser?.role === 'OWNER' ||
      loggedUser?.role === 'CROSS_OWNER'
    ) {
      handleNavigate('owner');
    } else {
      handleNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between selection:bg-sky-500/20 selection:text-sky-800">
      {/* Liquid Glass Dock Navbar */}
      <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

      {/* Main Page Rendering */}
      <div className="flex-1">
        {currentTab === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectCruise={handleSelectCruise}
            onBookCruise={handleBookCruise}
            onSelectTour={handleSelectTour}
            onBookTour={handleBookPublicTour}
          />
        )}

        {currentTab === 'explore' && (
          <ExplorePage
            initialFilterQuery={filterQuery}
            onSelectCruise={handleSelectCruise}
            onBookCruise={handleBookCruise}
          />
        )}

        {currentTab === 'tours' && (
          <ToursPage
            onSelectTour={handleSelectTour}
            onBookTour={handleBookPublicTour}
          />
        )}

        {currentTab === 'tour-detail' && selectedTour && (
          <TourDetailPage
            tour={selectedTour}
            onBack={() => handleNavigate('tours')}
            onBookTourTicket={(t) => handleBookPublicTour(t)}
          />
        )}

        {currentTab === 'book-public-tour' && selectedTour && (
          <BookPublicTourTicketPage
            tour={selectedTour}
            onSuccess={handleBookingSuccess}
            onCancel={() => handleNavigate('tour-detail')}
            onNeedLogin={() => handleNavigate('login')}
          />
        )}

        {currentTab === 'cruise-detail' && selectedCruise && (
          <CruiseDetailPage
            cruise={selectedCruise}
            onBack={() => handleNavigate('explore')}
            onBookTour={(c, cabin) => handleBookCruise(c, cabin)}
            onBookEvent={() => handleNavigate('events')}
          />
        )}

        {currentTab === 'book-tour' && selectedCruise && (
          <BookTourPage
            cruise={selectedCruise}
            initialCabin={preselectedCabin}
            onSuccess={handleBookingSuccess}
            onCancel={() => handleNavigate('cruise-detail')}
            onNeedLogin={() => handleNavigate('login')}
          />
        )}

        {currentTab === 'events' && (
          <PrivateEventsPage
            onSuccess={handleBookingSuccess}
            onNeedLogin={() => handleNavigate('login')}
          />
        )}

        {currentTab === 'dashboard' && (
          <UserDashboardPage
            onExplore={() => handleNavigate('explore')}
            onSelectCruise={handleSelectCruise}
            onBookCruise={handleBookCruise}
            onSelectTour={handleSelectTour}
            onBookTour={handleBookPublicTour}
          />
        )}

        {(currentTab === 'owner' || currentTab === 'operator') && (
          <OperatorDashboardPage />
        )}

        {(currentTab === 'admin-panel' || currentTab === 'admin') && (
          <AdminDashboardPage />
        )}

        {currentTab === 'login' && (
          <AuthPage
            initialMode="login"
            onSuccess={handleAuthSuccess}
            onSwitchMode={(mode) => handleNavigate(mode)}
          />
        )}

        {currentTab === 'register' && (
          <AuthPage
            initialMode="register"
            onSuccess={handleAuthSuccess}
            onSwitchMode={(mode) => handleNavigate(mode)}
          />
        )}
      </div>

      {/* Luxury Nautical Footer */}
      <Footer onNavigate={handleNavigate} />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
