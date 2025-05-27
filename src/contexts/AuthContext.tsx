"use client";
import type { UserProfile, HealthGoal, AiFeedbackPreferences } from '@/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (phone: string, otp: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (updatedProfileData: Partial<UserProfile>) => void;
  addHealthGoal: (goal: Omit<HealthGoal, 'id'>) => void;
  updateHealthGoal: (updatedGoal: HealthGoal) => void;
  updateAiPreferences: (preferences: Partial<AiFeedbackPreferences>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const initialMockUser: UserProfile = {
  id: 'user123',
  name: 'Alex Ryder',
  phoneNumber: '+11234567890',
  email: 'alex.ryder@example.com',
  dateOfBirth: '1985-07-15',
  allergies: ['Penicillin', 'Peanuts'],
  riskFactors: { smoking: 'former', hypertension: 'false' },
  aiFeedbackPreferences: {
    symptomExplainabilityLevel: 'brief',
    nudgeFrequency: 'medium',
  },
  healthGoals: [
    { id: 'goal1', description: 'Drink 8 glasses of water daily', status: 'in_progress', targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { id: 'goal2', description: 'Walk 10,000 steps 5 times a week', status: 'pending', targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
    { id: 'goal3', description: 'Meditate for 10 minutes daily', status: 'completed' },
  ],
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedAuth = localStorage.getItem('vitaLogProAuth');
    const storedUser = localStorage.getItem('vitaLogProUser');
    if (storedAuth === 'true' && storedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(storedUser));
    } else if (storedAuth === 'true') { // Fallback if user data is missing
      setIsAuthenticated(true);
      setUser(initialMockUser); // Set to initial mock if just auth flag is present
      localStorage.setItem('vitaLogProUser', JSON.stringify(initialMockUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (phone: string, otp: string): Promise<boolean> => {
    setIsLoading(true);
    return new Promise(resolve => {
      setTimeout(() => {
        // Simplified OTP check for "+11234567890" and "123456"
        if (phone === '+11234567890' && otp === '123456') {
          setIsAuthenticated(true);
          const currentUser = initialMockUser; // Use initial on new login
          setUser(currentUser);
          localStorage.setItem('vitaLogProAuth', 'true');
          localStorage.setItem('vitaLogProUser', JSON.stringify(currentUser));
          router.push('/'); // Navigate to dashboard
          resolve(true);
        } else {
          resolve(false);
        }
        setIsLoading(false);
      }, 1000);
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('vitaLogProAuth');
    localStorage.removeItem('vitaLogProUser');
    router.push('/auth/login');
  };
  
  const updateUserProfile = (updatedProfileData: Partial<UserProfile>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newUser = { ...prevUser, ...updatedProfileData };
      localStorage.setItem('vitaLogProUser', JSON.stringify(newUser));
      return newUser;
    });
  };

  const addHealthGoal = (goal: Omit<HealthGoal, 'id'>) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const newGoal = { ...goal, id: `goal${Date.now()}` };
      const updatedGoals = [...prevUser.healthGoals, newGoal];
      const newUser = { ...prevUser, healthGoals: updatedGoals };
      localStorage.setItem('vitaLogProUser', JSON.stringify(newUser));
      return newUser;
    });
  };
  
  const updateHealthGoal = (updatedGoal: HealthGoal) => {
    setUser(prevUser => {
      if (!prevUser) return null;
      const updatedGoals = prevUser.healthGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
      const newUser = { ...prevUser, healthGoals: updatedGoals };
      localStorage.setItem('vitaLogProUser', JSON.stringify(newUser));
      return newUser;
    });
  };

  const updateAiPreferences = (preferences: Partial<AiFeedbackPreferences>) => {
    setUser(prevUser => {
      if(!prevUser) return null;
      const newPreferences = { ...prevUser.aiFeedbackPreferences, ...preferences };
      const newUser = { ...prevUser, aiFeedbackPreferences: newPreferences };
      localStorage.setItem('vitaLogProUser', JSON.stringify(newUser));
      return newUser;
    });
  };


  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout, isLoading, updateUserProfile, addHealthGoal, updateHealthGoal, updateAiPreferences }}>
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
