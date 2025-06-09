import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { UserProgressProvider } from '../src/contexts/UserProgressContext';
import { DrawingProvider } from '../src/contexts/DrawingContext';
import { LearningProvider } from '../src/contexts/LearningContext';
import { ErrorBoundary } from '../src/engines/core/ErrorBoundary';
import { errorHandler } from '../src/engines/core/ErrorHandler';
import { eventBus } from '../src/engines/core/EventBus';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize error handler
        errorHandler.setUserId('user-' + Date.now());
        
        // Register global error handlers
        errorHandler.registerHandler('NETWORK_ERROR', (error) => {
          console.log('Network error handled:', error.message);
        });

        // Initialize event listeners
        eventBus.on('app_launched', () => {
          console.log('App launched event fired');
        });

        eventBus.on('drawing_started', (data) => {
          console.log('Drawing started:', data);
        });

        eventBus.on('lesson_started', (data) => {
          console.log('Lesson started:', data);
        });

        // Initialize all engines
        console.log('Initializing engines...');
        
        await Promise.all([
          import('../src/engines/core').then(m => m.initializeCoreEngine()),
          import('../src/engines/drawing').then(m => m.initializeDrawingEngine()),
          import('../src/engines/learning').then(m => m.initializeLearningEngine()),
          import('../src/engines/user').then(m => m.initializeUserEngine()),
          import('../src/engines/community').then(m => m.initializeCommunityEngine()),
        ]);
        
        console.log('All engines initialized successfully');

        // Simulate loading resources
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Emit app launched event
        eventBus.emit('app_launched', { timestamp: Date.now() });
      } catch (e) {
        console.warn('Error during app initialization:', e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <SafeAreaProvider>
          <ThemeProvider>
            <UserProgressProvider>
              <DrawingProvider>
                <LearningProvider>
                  <StatusBar style="auto" />
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  >
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen name="lesson/[id]" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="drawing/[id]" options={{ presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="profile/[id]" options={{ presentation: 'modal' }} />
                    <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
                    <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                  </Stack>
                </LearningProvider>
              </DrawingProvider>
            </UserProgressProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}