import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Theme Context - Manages app theme with professional color accuracy
 * Supports light, dark, and system themes with smooth transitions
 */

interface Theme {
  name: 'light' | 'dark';
  colors: {
    // Primary colors
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    
    // Background colors
    background: string;
    surface: string;
    card: string;
    modal: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textDisabled: string;
    textInverse: string;
    
    // UI colors
    border: string;
    divider: string;
    shadow: string;
    overlay: string;
    
    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;
    
    // Drawing specific
    canvas: string;
    grid: string;
    selection: string;
    highlight: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string };
    h2: { fontSize: number; fontWeight: string };
    h3: { fontSize: number; fontWeight: string };
    h4: { fontSize: number; fontWeight: string };
    body: { fontSize: number; fontWeight: string };
    caption: { fontSize: number; fontWeight: string };
    button: { fontSize: number; fontWeight: string };
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  animation: {
    fast: number;
    normal: number;
    slow: number;
  };
}

const lightTheme: Theme = {
  name: 'light',
  colors: {
    primary: '#6366F1',
    primaryLight: '#818CF8',
    primaryDark: '#4F46E5',
    secondary: '#EC4899',
    accent: '#8B5CF6',
    
    background: '#FFFFFF',
    surface: '#F9FAFB',
    card: '#FFFFFF',
    modal: '#FFFFFF',
    
    text: '#111827',
    textSecondary: '#6B7280',
    textDisabled: '#9CA3AF',
    textInverse: '#FFFFFF',
    
    border: '#E5E7EB',
    divider: '#F3F4F6',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.5)',
    
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    
    canvas: '#FFFFFF',
    grid: '#F3F4F6',
    selection: 'rgba(99, 102, 241, 0.2)',
    highlight: 'rgba(236, 72, 153, 0.2)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  typography: {
    h1: { fontSize: 32, fontWeight: '700' },
    h2: { fontSize: 24, fontWeight: '600' },
    h3: { fontSize: 20, fontWeight: '600' },
    h4: { fontSize: 18, fontWeight: '500' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 14, fontWeight: '400' },
    button: { fontSize: 16, fontWeight: '500' },
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  animation: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  name: 'dark',
  colors: {
    primary: '#818CF8',
    primaryLight: '#A5B4FC',
    primaryDark: '#6366F1',
    secondary: '#F472B6',
    accent: '#A78BFA',
    
    background: '#111827',
    surface: '#1F2937',
    card: '#1F2937',
    modal: '#1F2937',
    
    text: '#F9FAFB',
    textSecondary: '#D1D5DB',
    textDisabled: '#6B7280',
    textInverse: '#111827',
    
    border: '#374151',
    divider: '#1F2937',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
    
    canvas: '#1A1A1A',
    grid: '#2A2A2A',
    selection: 'rgba(129, 140, 248, 0.3)',
    highlight: 'rgba(244, 114, 182, 0.3)',
  },
};

interface ThemeContextValue {
  theme: Theme;
  themeMode: 'light' | 'dark' | 'system';
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  colors: Theme['colors'];
  spacing: Theme['spacing'];
  typography: Theme['typography'];
  borderRadius: Theme['borderRadius'];
  animation: Theme['animation'];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<'light' | 'dark' | 'system'>('system');
  const [theme, setTheme] = useState<Theme>(lightTheme);

  useEffect(() => {
    loadThemePreference();
  }, []);

  useEffect(() => {
    updateTheme();
  }, [themeMode, systemColorScheme]);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setThemeModeState(savedTheme as 'light' | 'dark' | 'system');
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const updateTheme = () => {
    let selectedTheme: Theme;
    
    if (themeMode === 'system') {
      selectedTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme;
    } else {
      selectedTheme = themeMode === 'dark' ? darkTheme : lightTheme;
    }
    
    setTheme(selectedTheme);
  };

  const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    setThemeModeState(mode);
    try {
      await AsyncStorage.setItem('theme_preference', mode);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = theme.name === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const value: ThemeContextValue = {
    theme,
    themeMode,
    setThemeMode,
    toggleTheme,
    colors: theme.colors,
    spacing: theme.spacing,
    typography: theme.typography,
    borderRadius: theme.borderRadius,
    animation: theme.animation,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Styled component helper
export const themed = {
  View: (styles: any) => styles,
  Text: (styles: any) => styles,
  // Add more as needed
};