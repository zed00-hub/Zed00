import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Check for saved user on load
  useEffect(() => {
    const savedUser = localStorage.getItem('paramedical_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setIsLoading(false);
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    // Simulate API call - REPLACE THIS WITH REAL FIREBASE LOGIC LATER
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock Data
    const mockUser: User = {
      id: 'google-user-' + Date.now(),
      name: 'طالب شبه طبي',
      email: 'student@example.com',
      avatar: 'https://ui-avatars.com/api/?name=Medical+Student&background=0ea5e9&color=fff'
    };
    
    setUser(mockUser);
    localStorage.setItem('paramedical_user', JSON.stringify(mockUser));
    setIsLoading(false);
  };

  const logout = () => {
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