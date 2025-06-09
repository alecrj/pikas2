import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { UserProgressProvider } from './src/contexts/UserProgressContext';
import { DrawingProvider } from './src/contexts/DrawingContext';
import { LearningProvider } from './src/contexts/LearningContext';
import { ErrorBoundary } from './src/engines/core/ErrorBoundary';
import { errorHandler } from './src/engines/core/ErrorHandler';
import { eventBus } from './src/engines/core/EventBus';
// import { performanceMonitor } from './src/engines/core/PerformanceMonitor'; // Not needed right now
import RootLayout from './app/_layout';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize error handler
        errorHandler.setUserId('user-' + Date.now()); // Replace with actual user ID from auth
        
        // Register global error handlers
        errorHandler.registerHandler('NETWORK_ERROR', (error) => {
          console.log('Network error handled:', error.message);
        });

        // Initialize event listeners
        eventBus.on('app_launched', () => {
          // No performanceMonitor.recordAppLaunch(), just log for now
          console.log('App launched event fired');
        });

        eventBus.on('drawing_started', (data) => {
          console.log('Drawing started:', data);
        });

        eventBus.on('lesson_started', (data) => {
          console.log('Lesson started:', data);
        });

        // Simulate loading resources
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
                  <RootLayout />
                </LearningProvider>
              </DrawingProvider>
            </UserProgressProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
