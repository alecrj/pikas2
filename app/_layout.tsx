import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { StatusBar } from 'expo-status-bar';

// Contexts
import { ThemeProvider } from '../src/contexts/ThemeContext';
import { UserProgressProvider } from '../src/contexts/UserProgressContext';
import { DrawingProvider } from '../src/contexts/DrawingContext';
import { LearningProvider } from '../src/contexts/LearningContext';

// Engines
import { skillTreeManager } from '../src/engines/learning/SkillTreeManager';
import { lessonEngine } from '../src/engines/learning/LessonEngine';
import { challengeSystem } from '../src/engines/community/ChallengeSystem';
import { brushEngine } from '../src/engines/drawing/BrushEngine';
import { errorHandler } from '../src/engines/core/ErrorHandler';
import { performanceMonitor } from '../src/engines/core/PerformanceMonitor';

// Components
import { ErrorBoundary } from '../src/engines/core/ErrorBoundary';

export default function RootLayout() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        console.log('🚀 App Index: Starting application initialization...');
        
        // Initialize core systems first
        console.log('🎯 Initializing core systems...');
        performanceMonitor.startMonitoring();
        
        // Initialize learning systems with proper error handling
        console.log('🎓 Initializing learning system...');
        try {
          await skillTreeManager.initialize();
          await lessonEngine.initialize();
          console.log('✅ Learning system initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize learning system:', error);
          errorHandler.handleError(
            errorHandler.createError(
              'LEARNING_INIT_ERROR',
              'Failed to initialize learning system',
              'high',
              error
            )
          );
          throw error;
        }

        // Initialize drawing system
        console.log('🎨 Initializing drawing system...');
        try {
          // Brush engine doesn't need async initialization, but we ensure it's ready
          const allBrushes = brushEngine.getAllBrushes();
          console.log(`✅ Drawing system initialized with ${allBrushes.length} brushes`);
        } catch (error) {
          console.error('❌ Failed to initialize drawing system:', error);
          errorHandler.handleError(
            errorHandler.createError(
              'DRAWING_INIT_ERROR',
              'Failed to initialize drawing system',
              'medium',
              error
            )
          );
        }

        // Initialize challenge system
        console.log('🏆 Initializing challenge system...');
        try {
          // Challenge system initializes automatically, just verify it's ready
          const activeChallenges = challengeSystem.getAllActiveChallenges();
          console.log(`✅ Challenge system initialized with ${activeChallenges.length} active challenges`);
        } catch (error) {
          console.error('❌ Failed to initialize challenge system:', error);
          errorHandler.handleError(
            errorHandler.createError(
              'CHALLENGE_INIT_ERROR',
              'Failed to initialize challenge system',
              'low',
              error
            )
          );
        }

        if (mounted) {
          setIsInitialized(true);
          console.log('🎉 App initialization completed successfully');
          
          // Log performance metrics
          const metrics = performanceMonitor.getMetrics();
          console.log('📊 Performance metrics:', metrics);
        }

      } catch (error) {
        console.error('💥 App initialization failed:', error);
        
        if (mounted) {
          setInitializationError(
            error instanceof Error ? error.message : 'Unknown initialization error'
          );
        }
        
        // Still set as initialized to allow basic app functionality
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    initializeApp();

    return () => {
      mounted = false;
    };
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#000000',
      }}>
        <Animated.View entering={FadeIn}>
          <Text style={{ 
            color: '#FFFFFF', 
            fontSize: 24, 
            fontWeight: '700',
            marginBottom: 16,
          }}>
            Pikaso
          </Text>
          <Text style={{ 
            color: '#CCCCCC', 
            fontSize: 16,
            textAlign: 'center',
          }}>
            Initializing learning platform...
          </Text>
          {initializationError && (
            <Text style={{ 
              color: '#FF6B6B', 
              fontSize: 12,
              textAlign: 'center',
              marginTop: 8,
              maxWidth: 300,
            }}>
              Warning: {initializationError}
            </Text>
          )}
        </Animated.View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <ThemeProvider>
          <UserProgressProvider>
            <DrawingProvider>
              <LearningProvider>
                <StatusBar style="auto" />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="onboarding" />
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="lesson/[id]" />
                  <Stack.Screen name="drawing/[id]" />
                  <Stack.Screen name="profile/[id]" />
                  <Stack.Screen name="settings" />
                </Stack>
              </LearningProvider>
            </DrawingProvider>
          </UserProgressProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}