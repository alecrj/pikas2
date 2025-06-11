import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useTheme } from '../../src/contexts/ThemeContext';

// Debug component that safely tests each context
function DebugHomeScreen() {
  const [debugInfo, setDebugInfo] = useState({
    mounted: false,
    themeWorking: false,
    userProgressWorking: false,
    learningWorking: false,
    errors: [] as string[],
  });

  useEffect(() => {
    console.log('🏠 Home Screen: Mounting');
    
    let errors: string[] = [];
    let themeWorking = false;
    let userProgressWorking = false;
    let learningWorking = false;

    // Test Theme Context
    try {
      const theme = useTheme();
      if (theme && theme.colors) {
        themeWorking = true;
        console.log('✅ Home: ThemeContext working');
      } else {
        errors.push('ThemeContext returned null/undefined');
      }
    } catch (error: any) {
      errors.push(`ThemeContext error: ${error.message}`);
      console.error('❌ Home: ThemeContext failed', error);
    }

    // Test UserProgress Context
    try {
      // Import dynamically to catch import errors
      const { useUserProgress } = require('../../src/contexts/UserProgressContext');
      const userProgress = useUserProgress();
      
      if (userProgress) {
        userProgressWorking = true;
        console.log('✅ Home: UserProgressContext working', {
          hasUser: !!userProgress.user,
          isLoading: userProgress.isLoading,
        });
      } else {
        errors.push('UserProgressContext returned null/undefined');
      }
    } catch (error: any) {
      errors.push(`UserProgressContext error: ${error.message}`);
      console.error('❌ Home: UserProgressContext failed', error);
    }

    // Test Learning Context
    try {
      const { useLearning } = require('../../src/contexts/LearningContext');
      const learning = useLearning();
      
      if (learning) {
        learningWorking = true;
        console.log('✅ Home: LearningContext working');
      } else {
        errors.push('LearningContext returned null/undefined');
      }
    } catch (error: any) {
      errors.push(`LearningContext error: ${error.message}`);
      console.error('❌ Home: LearningContext failed', error);
    }

    setDebugInfo({
      mounted: true,
      themeWorking,
      userProgressWorking,
      learningWorking,
      errors,
    });

    console.log('🏠 Home Screen: Debug complete', {
      themeWorking,
      userProgressWorking,
      learningWorking,
      errorCount: errors.length,
    });
  }, []);

  // Get theme safely
  let colors;
  try {
    const theme = useTheme();
    colors = theme?.colors || {
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      primary: '#6366F1',
      surface: '#F9FAFB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    };
  } catch {
    colors = {
      background: '#FFFFFF',
      text: '#000000',
      textSecondary: '#666666',
      primary: '#6366F1',
      surface: '#F9FAFB',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    };
  }

  if (!debugInfo.mounted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Debugging contexts...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          🔍 Debug Information
        </Text>
        
        <View style={[styles.debugCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.debugTitle, { color: colors.text }]}>
            Context Status
          </Text>
          
          <DebugItem
            label="Theme Context"
            working={debugInfo.themeWorking}
            colors={colors}
          />
          
          <DebugItem
            label="UserProgress Context"
            working={debugInfo.userProgressWorking}
            colors={colors}
          />
          
          <DebugItem
            label="Learning Context"
            working={debugInfo.learningWorking}
            colors={colors}
          />
        </View>

        {debugInfo.errors.length > 0 && (
          <View style={[styles.errorCard, { backgroundColor: colors.error + '10' }]}>
            <Text style={[styles.errorTitle, { color: colors.error }]}>
              Errors Found ({debugInfo.errors.length})
            </Text>
            {debugInfo.errors.map((error, index) => (
              <Text key={index} style={[styles.errorText, { color: colors.error }]}>
                • {error}
              </Text>
            ))}
          </View>
        )}

        <View style={[styles.nextStepsCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.nextStepsTitle, { color: colors.text }]}>
            Next Steps
          </Text>
          <Text style={[styles.nextStepsText, { color: colors.textSecondary }]}>
            1. Check Metro console for detailed error messages
          </Text>
          <Text style={[styles.nextStepsText, { color: colors.textSecondary }]}>
            2. Verify all context providers are properly wrapped
          </Text>
          <Text style={[styles.nextStepsText, { color: colors.textSecondary }]}>
            3. Ensure all required engine files exist
          </Text>
          <Text style={[styles.nextStepsText, { color: colors.textSecondary }]}>
            4. Test each tab individually
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function DebugItem({ label, working, colors }: { 
  label: string; 
  working: boolean; 
  colors: any;
}) {
  return (
    <View style={styles.debugItem}>
      <Text style={[styles.debugLabel, { color: colors.text }]}>
        {label}
      </Text>
      <Text style={[
        styles.debugStatus, 
        { color: working ? colors.success : colors.error }
      ]}>
        {working ? '✅ Working' : '❌ Failed'}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  console.log('🏠 Home Screen: Component rendering');
  
  return (
    <React.Suspense 
      fallback={
        <View style={styles.fallbackContainer}>
          <ActivityIndicator size="large" />
          <Text>Loading Home...</Text>
        </View>
      }
    >
      <DebugHomeScreen />
    </React.Suspense>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  debugCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  debugItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  debugLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  debugStatus: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  nextStepsCard: {
    padding: 16,
    borderRadius: 12,
  },
  nextStepsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  nextStepsText: {
    fontSize: 14,
    marginBottom: 4,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});