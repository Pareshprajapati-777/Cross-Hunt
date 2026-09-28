import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { CruiseDetailPage } from './pages/CruiseDetailPage';
import { BookTourPage } from './pages/BookTourPage';
import { PrivateEventsPage } from './pages/PrivateEventsPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { OperatorDashboardPage } from './pages/OperatorDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthPage } from './pages/AuthPages';
import { Cruise, Booking } from './api/types';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('home');
  const [filterQuery, setFilterQuery] = useState<string>('');
  const [selectedCruise, setSelectedCruise] = useState<Cruise | null>(null);
  const [preselectedCabin, setPreselectedCabin] = useState<string>('OCEANVIEW');
  const [lastCreatedBooking, setLastCreatedBooking] = useState<Booking | null>(null);

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentTab, selectedCruise]);

  const handleNavigate = (tab: string, param?: string) => {
    setCurrentTab(tab);
    if (param) {
      setFilterQuery(param);
    }
  };

  const handleSelectCruise = (cruise: Cruise) => {
    setSelectedCruise(cruise);
    setCurrentTab('cruise-detail');
  };

  const handleBookCruise = (cruise: Cruise, cabin?: string) => {
    setSelectedCruise(cruise);
    if (cabin) setPreselectedCabin(cabin);
    setCurrentTab('book-tour');
  };

  const handleBookingSuccess = (booking: Booking) => {
    setLastCreatedBooking(booking);
    setCurrentTab('dashboard');
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
          />
        )}

        {currentTab === 'explore' && (
          <ExplorePage
            initialFilterQuery={filterQuery}
            onSelectCruise={handleSelectCruise}
            onBookCruise={handleBookCruise}
          />
        )}

        {currentTab === 'cruise-detail' && selectedCruise && (
          <CruiseDetailPage
            cruise={selectedCruise}
            onBack={() => setCurrentTab('explore')}
            onBookTour={(c, cabin) => handleBookCruise(c, cabin)}
            onBookEvent={() => setCurrentTab('events')}
          />
        )}

        {currentTab === 'book-tour' && selectedCruise && (
          <BookTourPage
            cruise={selectedCruise}
            initialCabin={preselectedCabin}
            onSuccess={handleBookingSuccess}
            onCancel={() => setCurrentTab('cruise-detail')}
            onNeedLogin={() => setCurrentTab('login')}
          />
        )}

        {currentTab === 'events' && (
          <PrivateEventsPage
            onSuccess={handleBookingSuccess}
            onNeedLogin={() => setCurrentTab('login')}
          />
        )}

        {currentTab === 'dashboard' && (
          <UserDashboardPage onExplore={() => setCurrentTab('explore')} />
        )}

        {currentTab === 'operator' && <OperatorDashboardPage />}

        {currentTab === 'admin' && <AdminDashboardPage />}

        {currentTab === 'login' && (
          <AuthPage
            initialMode="login"
            onSuccess={() => setCurrentTab('home')}
            onSwitchMode={(mode) => setCurrentTab(mode)}
          />
        )}

        {currentTab === 'register' && (
          <AuthPage
            initialMode="register"
            onSuccess={() => setCurrentTab('home')}
            onSwitchMode={(mode) => setCurrentTab(mode)}
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
