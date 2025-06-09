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
  const { streakDays, dailyGoalProgress } = useUserProgress();

  const handleTabPress = () => {
    // Haptic feedback on tab press
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : colors.surface,
          borderTopColor: colors.border,
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
              tint={theme.name === 'dark' ? 'dark' : 'light'}
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
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text,
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
            <Home size={size} color={color} strokeWidth={2} />
          ),
          headerTitle: `Day ${streakDays} 🔥`,
          headerRight: () => (
            <ProgressIndicator progress={dailyGoalProgress} />
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
            <Brush size={size} color={color} strokeWidth={2} />
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
            <BookOpen size={size} color={color} strokeWidth={2} />
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
            <Trophy size={size} color={color} strokeWidth={2} />
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
            <User size={size} color={color} strokeWidth={2} />
          ),
          headerTitle: 'Profile',
          headerRight: () => (
            <SettingsButton />
          ),
        }}
        listeners={{
          tabPress: handleTabPress,
        }}
      />
    </Tabs>
  );
}

// Progress indicator component
function ProgressIndicator({ progress }: { progress: number }) {
  const { colors } = useTheme();
  
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
          width: `${progress}%`,
          height: '100%',
          backgroundColor: colors.primary,
          borderRadius: 2,
        }}
      />
    </View>
  );
}

// Settings button component
function SettingsButton() {
  const { colors } = useTheme();
  const router = useRouter();
  
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/settings');
      }}
      style={{ marginRight: 16 }}
    >
      <Settings size={24} color={colors.text} strokeWidth={2} />
    </Pressable>
  );
}