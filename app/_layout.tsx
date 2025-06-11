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
import { AppErrorBoundary, NavigationDebugger, ContextDebugger } from '../src/utils/DebugUtils';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Simple error boundary fallback for core engines
class CoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🚨 Core Error:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('🚨 Core Error Details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Continue anyway - most features should work
      console.warn('Recovering from core error, continuing with app...');
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = React.useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        NavigationDebugger.log('App initialization starting');
        
        // Initialize with minimal requirements
        // We'll skip engine initialization as they might not exist yet
        console.log('Preparing app...');
        
        // Just ensure basic setup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        NavigationDebugger.log('App initialization completed');
      } catch (e) {
        console.warn('Error during app initialization (non-critical):', e);
        // Continue anyway
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = React.useCallback(async () => {
    if (appIsReady) {
      try {
        await SplashScreen.hideAsync();
        NavigationDebugger.log('Splash screen hidden');
      } catch (error) {
        console.warn('Failed to hide splash screen:', error);
      }
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <AppErrorBoundary>
      <CoreErrorBoundary>
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
                      <Stack.Screen 
                        name="index" 
                        options={{ 
                          headerShown: false,
                          animation: 'none' // Prevent animation issues
                        }} 
                      />
                      <Stack.Screen 
                        name="onboarding" 
                        options={{ 
                          presentation: 'fullScreenModal',
                          animation: 'slide_from_bottom'
                        }} 
                      />
                      <Stack.Screen 
                        name="(tabs)" 
                        options={{ 
                          headerShown: false,
                          animation: 'none' // Prevent animation issues
                        }} 
                      />
                      <Stack.Screen 
                        name="lesson/[id]" 
                        options={{ 
                          presentation: 'modal',
                          animation: 'slide_from_bottom'
                        }} 
                      />
                      <Stack.Screen 
                        name="drawing/[id]" 
                        options={{ 
                          presentation: 'fullScreenModal',
                          animation: 'slide_from_right'
                        }} 
                      />
                      <Stack.Screen 
                        name="profile/[id]" 
                        options={{ 
                          presentation: 'modal',
                          animation: 'slide_from_bottom'
                        }} 
                      />
                      <Stack.Screen 
                        name="settings" 
                        options={{ 
                          presentation: 'modal',
                          animation: 'slide_from_bottom'
                        }} 
                      />
                    </Stack>
                  </LearningProvider>
                </DrawingProvider>
              </UserProgressProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </CoreErrorBoundary>
    </AppErrorBoundary>
  );
}