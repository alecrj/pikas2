import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';

// Tab bar icons
import { 
  Home,
  Brush,
  BookOpen,
  Trophy,
  User,
  Settings,
} from 'lucide-react-native';

export default function TabLayout() {
  const { colors, theme } = useTheme();
  const { progress, getDailyGoalProgress } = useUserProgress();
  
  // Safe data access with fallbacks
  const streakDays = progress?.streakDays || 0;
  const dailyGoalProgress = getDailyGoalProgress ? getDailyGoalProgress() : 0;
  
  const handleTabPress = () => {
    try {
      // Haptic feedback on tab press
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Graceful fallback if haptics fail
      console.warn('Haptics not available:', error);
    }
  };

  const safeColors = {
    primary: colors?.primary || '#6366F1',
    textSecondary: colors?.textSecondary || '#6B7280',
    surface: colors?.surface || '#FFFFFF',
    border: colors?.border || '#E5E7EB',
    text: colors?.text || '#111827',
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: safeColors.primary,
        tabBarInactiveTintColor: safeColors.textSecondary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : safeColors.surface,
          borderTopColor: safeColors.border,
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          position: 'absolute',
          elevation: 0,
        },
        tabBarBackground: () => 
          Platform.OS === 'ios' ? (
            <BlurView
              intensity={100}
              tint={theme?.name === 'dark' ? 'dark' : 'light'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
          ) : null,
        headerStyle: {
          backgroundColor: safeColors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: safeColors.text,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 24} color={color} strokeWidth={2} />
          ),
          headerTitle: streakDays > 0 ? `Day ${streakDays} 🔥` : 'Welcome',
          headerRight: () => (
            <ProgressIndicator progress={dailyGoalProgress} colors={safeColors} />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="draw"
        options={{
          title: 'Draw',
          tabBarLabel: 'Draw',
          tabBarIcon: ({ color, size }) => (
            <Brush size={size || 24} color={color} strokeWidth={2} />
          ),
          headerShown: false,
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarLabel: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size || 24} color={color} strokeWidth={2} />
          ),
          headerTitle: 'Skill Trees',
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: 'Gallery',
          tabBarLabel: 'Gallery',
          tabBarIcon: ({ color, size }) => (
            <Trophy size={size || 24} color={color} strokeWidth={2} />
          ),
          headerTitle: 'Community',
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <User size={size || 24} color={color} strokeWidth={2} />
          ),
          headerTitle: 'Profile',
          headerRight: () => (
            <SettingsButton colors={safeColors} />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}

// Progress indicator component with error handling
function ProgressIndicator({ progress, colors }: { progress: number; colors: any }) {
  const safeProgress = Math.max(0, Math.min(100, progress || 0));
  
  return (
    <View style={{ 
      marginRight: 16,
      width: 60,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    }}>
      <View
        style={{
          width: `${safeProgress}%`,
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

// Settings button component with error handling
function SettingsButton({ colors }: { colors: any }) {
  const router = useRouter();
  
  const handlePress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push('/settings');
    } catch (error) {
      console.warn('Navigation or haptics failed:', error);
      // Fallback navigation without haptics
      router.push('/settings');
    }
  };
  
  return (
    <Pressable
      onPress={handlePress}
      style={{ marginRight: 16 }}
    >
      <Settings size={24} color={colors.text} strokeWidth={2} />
    </Pressable>
  );
}