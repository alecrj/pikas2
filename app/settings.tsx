import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  TextInput,
  Modal,
  Slider,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from '../src/contexts/ThemeContext';
import { useUserProgress } from '../src/contexts/UserProgressContext';
import { useDrawing } from '../src/contexts/DrawingContext';
import {
  Settings,
  User,
  Palette,
  Bell,
  Lock,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
  Smartphone,
  Volume2,
  VolumeX,
  Download,
  Upload,
  Trash2,
  Edit3,
  Mail,
  Shield,
  Globe,
  Target,
  Clock,
  Sliders,
  Brush,
  Info,
  ExternalLink,
} from 'lucide-react-native';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  type: 'toggle' | 'navigation' | 'action' | 'slider' | 'picker';
  value?: any;
  icon: any;
  onPress?: () => void;
  onChange?: (value: any) => void;
  options?: string[];
}

interface SettingSection {
  title: string;
  items: SettingItem[];
}

export default function SettingsScreen() {
  const theme = useTheme();
  const { user, updateProfile, deleteAccount } = useUserProgress();
  const { state: drawingState, dispatch: drawingDispatch } = useDrawing();
  
  // Local state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [showExportData, setShowExportData] = useState(false);
  
  // Settings state
  const [notifications, setNotifications] = useState({
    lessons: true,
    achievements: true,
    social: true,
    challenges: true,
    dailyReminder: true,
  });
  
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    artworkVisibility: 'public',
    showProgress: true,
    allowMessages: true,
  });
  
  const [drawingPreferences, setDrawingPreferences] = useState({
    pressureSensitivity: 0.8,
    smoothing: 0.5,
    autosave: true,
    autosaveInterval: 5,
    hapticFeedback: true,
    soundEffects: false,
  });
  
  const [learningSettings, setLearningSettings] = useState({
    dailyGoal: 1,
    reminderTime: '19:00',
    difficulty: 'adaptive',
    autoProgress: true,
  });
  
  const styles = createStyles(theme);

  const handleUpdateProfile = useCallback(async () => {
    if (!user || !newDisplayName.trim()) return;
    
    try {
      await updateProfile({ displayName: newDisplayName.trim() });
      setShowEditProfile(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    }
  }, [user, newDisplayName, updateProfile]);

  const handleDeleteAccount = useCallback(async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAccount();
              Alert.alert('Account Deleted', 'Your account has been deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          },
        },
      ]
    );
  }, [deleteAccount]);

  const handleExportData = useCallback(() => {
    Alert.alert(
      'Export Data',
      'Your data will be exported as a JSON file. This includes your profile, artworks, and progress.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: () => {
            // In a real app, this would trigger data export
            Alert.alert('Success', 'Data export started. You\'ll be notified when ready.');
          },
        },
      ]
    );
  }, []);

  const settingSections: SettingSection[] = [
    {
      title: 'Account',
      items: [
        {
          id: 'profile',
          title: 'Edit Profile',
          subtitle: user?.displayName || 'Set your display name',
          type: 'navigation',
          icon: User,
          onPress: () => setShowEditProfile(true),
        },
        {
          id: 'email',
          title: 'Email',
          subtitle: user?.email || 'Not set',
          type: 'navigation',
          icon: Mail,
        },
        {
          id: 'privacy',
          title: 'Privacy Settings',
          subtitle: 'Control who can see your content',
          type: 'navigation',
          icon: Lock,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          id: 'theme',
          title: 'Dark Mode',
          subtitle: 'Toggle between light and dark themes',
          type: 'toggle',
          value: theme.name === 'dark',
          icon: theme.name === 'dark' ? Moon : Sun,
          onChange: (value) => {
            theme.toggleTheme();
          },
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          id: 'lesson_notifications',
          title: 'Lesson Reminders',
          subtitle: 'Get reminded to practice daily',
          type: 'toggle',
          value: notifications.lessons,
          icon: Bell,
          onChange: (value) => setNotifications(prev => ({ ...prev, lessons: value })),
        },
        {
          id: 'achievement_notifications',
          title: 'Achievements',
          subtitle: 'Celebrate your progress',
          type: 'toggle',
          value: notifications.achievements,
          icon: Target,
          onChange: (value) => setNotifications(prev => ({ ...prev, achievements: value })),
        },
        {
          id: 'social_notifications',
          title: 'Social Activity',
          subtitle: 'Likes, comments, and follows',
          type: 'toggle',
          value: notifications.social,
          icon: Globe,
          onChange: (value) => setNotifications(prev => ({ ...prev, social: value })),
        },
        {
          id: 'challenge_notifications',
          title: 'Challenges',
          subtitle: 'New challenges and deadlines',
          type: 'toggle',
          value: notifications.challenges,
          icon: Target,
          onChange: (value) => setNotifications(prev => ({ ...prev, challenges: value })),
        },
      ],
    },
    {
      title: 'Drawing',
      items: [
        {
          id: 'pressure_sensitivity',
          title: 'Pressure Sensitivity',
          subtitle: `${Math.round(drawingPreferences.pressureSensitivity * 100)}%`,
          type: 'slider',
          value: drawingPreferences.pressureSensitivity,
          icon: Brush,
          onChange: (value) => {
            setDrawingPreferences(prev => ({ ...prev, pressureSensitivity: value }));
            drawingDispatch({ type: 'SET_PRESSURE_SENSITIVITY', enabled: value > 0 });
          },
        },
        {
          id: 'smoothing',
          title: 'Stroke Smoothing',
          subtitle: `${Math.round(drawingPreferences.smoothing * 100)}%`,
          type: 'slider',
          value: drawingPreferences.smoothing,
          icon: Sliders,
          onChange: (value) => {
            setDrawingPreferences(prev => ({ ...prev, smoothing: value }));
          },
        },
        {
          id: 'autosave',
          title: 'Auto-save',
          subtitle: 'Automatically save your progress',
          type: 'toggle',
          value: drawingPreferences.autosave,
          icon: Download,
          onChange: (value) => setDrawingPreferences(prev => ({ ...prev, autosave: value })),
        },
        {
          id: 'haptic_feedback',
          title: 'Haptic Feedback',
          subtitle: 'Feel brush strokes and interactions',
          type: 'toggle',
          value: drawingPreferences.hapticFeedback,
          icon: Smartphone,
          onChange: (value) => setDrawingPreferences(prev => ({ ...prev, hapticFeedback: value })),
        },
        {
          id: 'sound_effects',
          title: 'Sound Effects',
          subtitle: 'Audio feedback for interactions',
          type: 'toggle',
          value: drawingPreferences.soundEffects,
          icon: drawingPreferences.soundEffects ? Volume2 : VolumeX,
          onChange: (value) => setDrawingPreferences(prev => ({ ...prev, soundEffects: value })),
        },
      ],
    },
    {
      title: 'Learning',
      items: [
        {
          id: 'daily_goal',
          title: 'Daily Goal',
          subtitle: `${learningSettings.dailyGoal} lesson${learningSettings.dailyGoal > 1 ? 's' : ''} per day`,
          type: 'picker',
          value: learningSettings.dailyGoal,
          icon: Target,
          options: ['1', '2', '3', '5'],
          onChange: (value) => setLearningSettings(prev => ({ ...prev, dailyGoal: parseInt(value) })),
        },
        {
          id: 'reminder_time',
          title: 'Daily Reminder',
          subtitle: learningSettings.reminderTime,
          type: 'navigation',
          icon: Clock,
        },
        {
          id: 'difficulty',
          title: 'Difficulty Mode',
          subtitle: learningSettings.difficulty,
          type: 'picker',
          value: learningSettings.difficulty,
          icon: Sliders,
          options: ['comfortable', 'adaptive', 'challenging'],
          onChange: (value) => setLearningSettings(prev => ({ ...prev, difficulty: value })),
        },
      ],
    },
    {
      title: 'Data & Privacy',
      items: [
        {
          id: 'export_data',
          title: 'Export My Data',
          subtitle: 'Download your profile and artworks',
          type: 'action',
          icon: Upload,
          onPress: handleExportData,
        },
        {
          id: 'clear_cache',
          title: 'Clear Cache',
          subtitle: 'Free up storage space',
          type: 'action',
          icon: Trash2,
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          },
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          id: 'help',
          title: 'Help & FAQ',
          subtitle: 'Get answers to common questions',
          type: 'navigation',
          icon: HelpCircle,
        },
        {
          id: 'contact',
          title: 'Contact Support',
          subtitle: 'Get help from our team',
          type: 'navigation',
          icon: Mail,
        },
        {
          id: 'about',
          title: 'About Pikaso',
          subtitle: 'Version 1.0.0',
          type: 'navigation',
          icon: Info,
        },
        {
          id: 'privacy_policy',
          title: 'Privacy Policy',
          type: 'navigation',
          icon: Shield,
        },
        {
          id: 'terms',
          title: 'Terms of Service',
          type: 'navigation',
          icon: ExternalLink,
        },
      ],
    },
    {
      title: 'Account Actions',
      items: [
        {
          id: 'logout',
          title: 'Sign Out',
          subtitle: 'Sign out of your account',
          type: 'action',
          icon: LogOut,
          onPress: () => {
            Alert.alert(
              'Sign Out',
              'Are you sure you want to sign out?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', onPress: () => {
                  // Handle logout
                  Alert.alert('Signed Out', 'You have been signed out successfully');
                }},
              ]
            );
          },
        },
        {
          id: 'delete_account',
          title: 'Delete Account',
          subtitle: 'Permanently delete your account',
          type: 'action',
          icon: Trash2,
          onPress: handleDeleteAccount,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem) => {
    const IconComponent = item.icon;
    
    return (
      <Pressable
        key={item.id}
        style={[styles.settingItem, { backgroundColor: theme.colors.surface }]}
        onPress={item.onPress}
      >
        <View style={styles.settingContent}>
          <View style={styles.settingIcon}>
            <IconComponent size={24} color={theme.colors.text} />
          </View>
          
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: theme.colors.text }]}>
              {item.title}
            </Text>
            {item.subtitle && (
              <Text style={[styles.settingSubtitle, { color: theme.colors.textSecondary }]}>
                {item.subtitle}
              </Text>
            )}
          </View>
          
          <View style={styles.settingControl}>
            {item.type === 'toggle' && (
              <Switch
                value={item.value}
                onValueChange={item.onChange}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.surface}
              />
            )}
            
            {item.type === 'slider' && (
              <View style={styles.sliderContainer}>
                <Slider
                  style={styles.slider}
                  value={item.value}
                  onValueChange={item.onChange}
                  minimumValue={0}
                  maximumValue={1}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
              </View>
            )}
            
            {(item.type === 'navigation' || item.type === 'action') && (
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  const renderEditProfileModal = () => (
    <Modal
      visible={showEditProfile}
      transparent
      animationType="slide"
      onRequestClose={() => setShowEditProfile(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Edit Profile
          </Text>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Display Name
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              value={newDisplayName}
              onChangeText={setNewDisplayName}
              placeholder="Enter your display name"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowEditProfile(false)}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleUpdateProfile}
            >
              <Text style={[styles.buttonText, { color: theme.colors.surface }]}>
                Save
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Settings size={28} color={theme.colors.text} />
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Settings
          </Text>
        </View>
        
        {settingSections.map((section, sectionIndex) => (
          <Animated.View
            key={section.title}
            entering={FadeInUp.delay(sectionIndex * 100)}
            style={styles.section}
          >
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              {section.title}
            </Text>
            
            <View style={styles.sectionContent}>
              {section.items.map(renderSettingItem)}
            </View>
          </Animated.View>
        ))}
        
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Pikaso v1.0.0
          </Text>
          <Text style={[styles.footerText, { color: theme.colors.textSecondary }]}>
            Made with ❤️ for artists
          </Text>
        </View>
      </ScrollView>
      
      {renderEditProfileModal()}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginLeft: 12,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  sectionContent: {
    paddingHorizontal: 20,
  },
  settingItem: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  settingIcon: {
    marginRight: 16,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  settingControl: {
    alignItems: 'center',
  },
  sliderContainer: {
    width: 100,
  },
  slider: {
    width: 100,
    height: 20,
  },
  footer: {
    alignItems: 'center',
    padding: 40,
  },
  footerText: {
    fontSize: 14,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});