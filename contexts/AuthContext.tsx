import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithPopup, signInWithRedirect, getRedirectResult, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { User } from '../types';
import { syncUserProfile } from '../services/analyticsService';

interface AuthContextType {
  user: User | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for saved user on load while Firebase initializes
  useEffect(() => {
    const savedUser = localStorage.getItem('paramedical_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // Listen to Firebase auth state & Redirect Result
  useEffect(() => {
    // Check for redirect result first (for mobile)
    getRedirectResult(auth).then((result) => {
      if (result) {
        console.log("AuthContext: Redirect login successful!", result.user.email);
      }
    }).catch((error) => {
      console.error("AuthContext: Redirect login error:", error);
    });

    // ... other imports

    // ...

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const mappedUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Utilisateur',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || undefined,
        };
        // Only update if id changed to prevent loops
        setUser(curr => (curr?.id === mappedUser.id ? curr : mappedUser));
        localStorage.setItem('paramedical_user', JSON.stringify(mappedUser));

        // Sync to analytics
        syncUserProfile(mappedUser);
      } else {
        setUser(null);
        localStorage.removeItem('paramedical_user');
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      console.log("AuthContext: Starting Google login...");
      // Try popup first
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("AuthContext: Popup error:", error);
      // Fallback to redirect for mobile/strict browsers
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user' || window.innerWidth < 768) {
        console.log("AuthContext: Falling back to redirect...");
        await signInWithRedirect(auth, googleProvider);
      } else {
        setIsLoading(false);
        throw error;
      }
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    localStorage.removeItem('paramedical_user');
  };

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};