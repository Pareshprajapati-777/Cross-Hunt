import React, { createContext, useContext, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export interface AuthModalOptions {
  title?: string;
  subtitle?: string;
  featureName?: string;
  description?: string;
  returnUrl?: string;
  iconType?: 'lock' | 'heart' | 'ship' | 'ticket' | 'star' | 'shield';
  onSuccess?: () => void;
}

interface AuthModalContextType {
  isOpen: boolean;
  options: AuthModalOptions | null;
  openLoginModal: (opts?: AuthModalOptions) => void;
  closeLoginModal: () => void;
  requireAuth: (action: () => void, opts?: AuthModalOptions) => boolean;
}

const AuthModalContext = createContext<AuthModalContextType | undefined>(undefined);

export const AuthModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AuthModalOptions | null>(null);

  const openLoginModal = useCallback(
    (opts?: AuthModalOptions) => {
      const defaultReturnUrl = `${location.pathname}${location.search}`;
      setOptions({
        returnUrl: defaultReturnUrl,
        ...opts,
      });
      setIsOpen(true);
    },
    [location]
  );

  const closeLoginModal = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const requireAuth = useCallback(
    (action: () => void, opts?: AuthModalOptions): boolean => {
      if (user) {
        action();
        return true;
      }
      openLoginModal(opts);
      return false;
    },
    [user, openLoginModal]
  );

  return (
    <AuthModalContext.Provider
      value={{
        isOpen,
        options,
        openLoginModal,
        closeLoginModal,
        requireAuth,
      }}
    >
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = () => {
  const context = useContext(AuthModalContext);
  if (!context) {
    throw new Error('useAuthModal must be used within an AuthModalProvider');
  }
  return context;
};
