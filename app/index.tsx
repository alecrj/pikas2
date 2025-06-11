import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserProgress } from '../src/contexts/UserProgressContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function AppIndex() {
  const router = useRouter();
  const { user, isLoading } = useUserProgress();
  const { colors } = useTheme();
  const [isInitializing, setIsInitializing] = React.useState(true);

  useEffect(() => {
    const handleInitialNavigation = async () => {
      try {
        // Small delay to ensure all contexts are initialized
        await new Promise(resolve => setTimeout(resolve, 200));
        setIsInitializing(false);
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setIsInitializing(false);
      }
    };

    handleInitialNavigation();
  }, []);

  useEffect(() => {
    if (!isInitializing && !isLoading) {
      if (user?.id) {
        // User exists and is properly initialized, go to main app
        router.replace('/(tabs)');
      } else {
        // No user or incomplete setup, go to onboarding
        router.replace('/onboarding');
      }
    }
  }, [user, isLoading, isInitializing, router]);

  // Professional loading screen while determining route
  return (
    <View 
      style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: colors.background 
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}