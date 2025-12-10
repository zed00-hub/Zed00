import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { User } from '../types';

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

  // Listen to Firebase auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const mappedUser: User = {
          id: fbUser.uid,
          name: fbUser.displayName || 'Utilisateur',
          email: fbUser.email || '',
          avatar: fbUser.photoURL || undefined,
        };
        setUser(mappedUser);
        localStorage.setItem('paramedical_user', JSON.stringify(mappedUser));
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
      const result = await signInWithPopup(auth, googleProvider);
      console.log("AuthContext: Login successful!", result.user.email);
      // User state and localStorage handled by onAuthStateChanged
    } catch (error: any) {
      console.error("AuthContext: Login error:", error);
      console.error("AuthContext: Error code:", error?.code);
      console.error("AuthContext: Error message:", error?.message);
      setIsLoading(false);
      throw error;
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