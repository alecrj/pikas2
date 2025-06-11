import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useUserProgress } from '../src/contexts/UserProgressContext';
import { useTheme } from '../src/contexts/ThemeContext';
import { NavigationDebugger, useDebugMount, useDebugRender } from '../src/utils/DebugUtils';

export default function AppIndex() {
  const router = useRouter();
  const { user, isLoading } = useUserProgress();
  const { colors } = useTheme();
  const [isNavigating, setIsNavigating] = React.useState(false);
  
  // Debug logging
  useDebugMount('AppIndex');
  useDebugRender('AppIndex', { user: user?.id, isLoading, isNavigating });

  useEffect(() => {
    NavigationDebugger.log('AppIndex useEffect', { 
      hasUser: !!user, 
      userId: user?.id,
      isLoading,
      isNavigating 
    });

    // Prevent multiple navigations
    if (isNavigating) {
      NavigationDebugger.log('Navigation already in progress, skipping');
      return;
    }

    // Wait for loading to complete
    if (isLoading) {
      NavigationDebugger.log('Still loading user data, waiting...');
      return;
    }

    // Navigation logic with proper guards
    const handleNavigation = async () => {
      try {
        setIsNavigating(true);
        
        // Small delay to ensure all contexts are stable
        await new Promise(resolve => setTimeout(resolve, 100));
        
        if (user?.id) {
          NavigationDebugger.log('User exists, navigating to tabs', { userId: user.id });
          router.replace('/(tabs)');
        } else {
          NavigationDebugger.log('No user found, navigating to onboarding');
          router.replace('/onboarding');
        }
      } catch (error) {
        NavigationDebugger.error('Navigation failed', error);
        // Fallback to onboarding on error
        router.replace('/onboarding');
      } finally {
        setIsNavigating(false);
      }
    };

    // Only navigate when we have a definitive state
    if (!isLoading && !isNavigating) {
      handleNavigation();
    }
  }, [user, isLoading, isNavigating, router]);

  // Professional loading screen
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
      <Text style={{ 
        marginTop: 16, 
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '500'
      }}>
        {isLoading ? 'Loading your workspace...' : 'Initializing...'}
      </Text>
      {__DEV__ && (
        <Text style={{ 
          marginTop: 8, 
          color: colors.textSecondary,
          fontSize: 12,
          opacity: 0.6
        }}>
          User: {user?.id || 'None'} | Loading: {isLoading ? 'Yes' : 'No'}
        </Text>
      )}
    </View>
  );
}