import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useAuthModal } from './AuthModalContext';
import { Cruise } from '../api/types';
import { FavoriteItem, getMyFavorites, toggleFavoriteShip } from '../api/favorites';
import { useNavigate, useLocation } from 'react-router-dom';

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoriteShipIds: Set<number>;
  loading: boolean;
  isFavorite: (shipId: number) => boolean;
  toggleFavorite: (cruise: Cruise) => Promise<boolean | null>;
  refreshFavorites: () => Promise<void>;
  notice: string | null;
  clearNotice: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { openLoginModal } = useAuthModal();
  const navigate = useNavigate();
  const location = useLocation();

  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteShipIds, setFavoriteShipIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState<boolean>(false);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteShipIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const res = await getMyFavorites();
      if (res && res.favorites) {
        setFavorites(res.favorites);
        setFavoriteShipIds(new Set(res.ship_ids || res.favorites.map((f) => f.cruise_id)));
      }
    } catch {
      // Ignored if user not logged in or network error
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const isFavorite = useCallback(
    (shipId: number): boolean => {
      return favoriteShipIds.has(shipId);
    },
    [favoriteShipIds]
  );

  const toggleFavorite = useCallback(
    async (cruise: Cruise): Promise<boolean | null> => {
      if (!user) {
        const returnUrl = `${location.pathname}${location.search}`;
        openLoginModal({
          title: 'Sign In to Save Favorites',
          featureName: 'Wishlist & Favorite Ships',
          description: `Passenger login is required to save "${cruise.name}" and view your bookmarked vessels in your user dashboard panel.`,
          iconType: 'heart',
          returnUrl,
        });
        return null;
      }

      const shipId = cruise.id;
      const currentlyFav = favoriteShipIds.has(shipId);

      // Optimistic update
      setFavoriteShipIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) {
          next.delete(shipId);
        } else {
          next.add(shipId);
        }
        return next;
      });

      if (currentlyFav) {
        setFavorites((prev) => prev.filter((f) => f.cruise_id !== shipId));
      } else {
        const tempItem: FavoriteItem = {
          id: Date.now(),
          cruise_id: shipId,
          created_at: new Date().toISOString(),
          cruise: cruise,
        };
        setFavorites((prev) => [tempItem, ...prev]);
      }

      try {
        const res = await toggleFavoriteShip(shipId);
        if (res.success) {
          setNotice(res.message);
          setTimeout(() => setNotice(null), 3500);
          return res.favorited;
        }
      } catch (err: any) {
        // Rollback on failure
        fetchFavorites();
        setNotice(err.message || 'Failed to update favorites.');
        setTimeout(() => setNotice(null), 4000);
      }
      return !currentlyFav;
    },
    [user, favoriteShipIds, location, navigate, fetchFavorites]
  );

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteShipIds,
        loading,
        isFavorite,
        toggleFavorite,
        refreshFavorites: fetchFavorites,
        notice,
        clearNotice: () => setNotice(null),
      }}
    >
      {children}

      {/* Floating Interactive Toast Notice */}
      {notice && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="px-4 py-3 rounded-2xl bg-[#051833] text-white text-xs font-semibold shadow-2xl border border-sky-400/30 flex items-center gap-3 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span>{notice}</span>
            <button
              onClick={() => setNotice(null)}
              className="text-slate-400 hover:text-white ml-2 text-sm font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
