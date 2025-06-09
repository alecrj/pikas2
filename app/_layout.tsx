import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-gesture-handler';

export default function RootLayout() {
  useEffect(() => {
    // Initialize all engines
    const initializeEngines = async () => {
      try {
        console.log('Initializing engines...');
        
        // FIXED: Import and initialize engines with correct function names
        await Promise.all([
          import('../src/engines/core').then(m => m.initializeCoreEngine()),
          import('../src/engines/drawing').then(m => m.initializeDrawingEngine()),
          import('../src/engines/learning').then(m => m.initializeLearningEngine()),
          import('../src/engines/user').then(m => m.initializeUserEngine()),
          import('../src/engines/community').then(m => m.initializeCommunityEngine()),
        ]);
        
        console.log('All engines initialized successfully');
      } catch (error) {
        console.error('Failed to initialize engines:', error);
      }
    };

    initializeEngines();
  }, []);

  return (
    <>
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
    </>
  );
}