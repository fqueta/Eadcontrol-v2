import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface UserPrefs {
  sidebarOpen: boolean;
}

interface UserPrefsContextType {
  prefs: UserPrefs;
  setPref: <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => void;
}

const UserPrefsContext = createContext<UserPrefsContextType | undefined>(undefined);

interface UserPrefsProviderProps {
  children: ReactNode;
}

const DEFAULT_PREFS: UserPrefs = {
  sidebarOpen: true,
};

/**
 * UserPrefsProvider
 * pt-BR: Gerencia preferências do usuário (ex.: estado da sidebar) e persiste em localStorage.
 * en-US: Manages user preferences (e.g., sidebar state) and persists to localStorage.
 */
export function UserPrefsProvider({ children }: UserPrefsProviderProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPrefs>(DEFAULT_PREFS);

  // Get storage key based on user ID or anonymous
  const getStorageKey = () => {
    return user?.id ? `prefs:${user.id}` : 'prefs:anon';
  };

  // Load preferences from localStorage
  const loadPrefs = () => {
    try {
      const storageKey = getStorageKey();
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsedPrefs = JSON.parse(stored);
        setPrefs({ ...DEFAULT_PREFS, ...parsedPrefs });
      } else {
        // Try to read from existing sidebar cookie as fallback
        const sidebarCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('sidebar:state='));
        
        if (sidebarCookie) {
          const cookieValue = sidebarCookie.split('=')[1];
          const sidebarOpen = cookieValue === 'true';
          setPrefs({ ...DEFAULT_PREFS, sidebarOpen });
          // Save to localStorage for future use
          localStorage.setItem(storageKey, JSON.stringify({ ...DEFAULT_PREFS, sidebarOpen }));
        } else {
          setPrefs(DEFAULT_PREFS);
        }
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
      setPrefs(DEFAULT_PREFS);
    }
  };

  // Save preferences to localStorage
  const savePrefs = (newPrefs: UserPrefs) => {
    try {
      const storageKey = getStorageKey();
      localStorage.setItem(storageKey, JSON.stringify(newPrefs));
    } catch (error) {
      console.warn('Failed to save user preferences:', error);
    }
  };

  // Set individual preference
  const setPref = <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
    const newPrefs = { ...prefs, [key]: value };
    setPrefs(newPrefs);
    savePrefs(newPrefs);
  };

  // Load preferences when component mounts or user changes
  useEffect(() => {
    loadPrefs();
  }, [user?.id]);

  return (
    <UserPrefsContext.Provider value={{ prefs, setPref }}>
      {children}
    </UserPrefsContext.Provider>
  );
}

export function useUserPrefs() {
  const context = useContext(UserPrefsContext);
  if (context === undefined) {
    throw new Error('useUserPrefs must be used within a UserPrefsProvider');
  }
  return context;
}