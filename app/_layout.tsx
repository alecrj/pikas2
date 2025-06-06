import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { ThemeProvider, useTheme } from '../src/contexts/ThemeContext';
import { UserProgressProvider } from '../src/contexts/UserProgressContext';
import { DrawingProvider } from '../src/contexts/DrawingContext';
import { LearningProvider } from '../src/contexts/LearningContext';
import { ErrorHandler, errorHandler } from '../src/engines/core/ErrorHandler';
import { performanceMonitor } from '../src/engines/core/PerformanceMonitor';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';

// Keep splash screen visible while loading
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const { colors, theme } = useTheme();

  useEffect(() => {
    // Initialize engines
    initializeEngines();
  }, []);

  const initializeEngines = async () => {
    try {
      // Initialize all engines
      await Promise.all([
        import('../src/engines/core').then(m => m.initializeCoreEngine()),
        import('../src/engines/user').then(m => m.initializeUserEngine()),
        import('../src/engines/learning').then(m => m.initializeLearningEngine()),
        import('../src/engines/community').then(m => m.initializeCommunityEngine()),
      ]);

      // Hide splash screen
      await SplashScreen.hideAsync();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('ENGINE_INIT_ERROR', 'Failed to initialize engines', 'critical', error)
      );
    }
  };

  return (
    <>
      <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTintColor: colors.text,
            headerTitleStyle: {
              fontWeight: '600',
            },
            contentStyle: {
              backgroundColor: colors.background,
            },
            animation: 'default',
          }}
        >
          <Stack.Screen 
            name="(tabs)" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="onboarding" 
            options={{ 
              headerShown: false,
              presentation: 'fullScreenModal',
            }} 
          />
          <Stack.Screen 
            name="drawing/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'fullScreenModal',
            }} 
          />
          <Stack.Screen 
            name="lesson/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'fullScreenModal',
            }} 
          />
          <Stack.Screen 
            name="settings" 
            options={{ 
              title: 'Settings',
              presentation: 'modal',
            }} 
          />
          <Stack.Screen 
            name="profile/[id]" 
            options={{ 
              title: 'Profile',
              presentation: 'modal',
            }} 
          />
        </Stack>
      </View>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <UserProgressProvider>
            <DrawingProvider>
              <LearningProvider>
                <RootLayoutNav />
              </LearningProvider>
            </DrawingProvider>
          </UserProgressProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}