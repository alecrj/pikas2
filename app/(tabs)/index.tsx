import React, { useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUserProgress, useProgress } from '../../src/contexts/UserProgressContext';
import { useLearning } from '../../src/contexts/LearningContext';
import { useLearning as useLessonContext } from '../../src/contexts/LearningContext';
import { challengeSystem } from '../../src/engines/community/ChallengeSystem';
import { typography } from '../../src/constants/typography'; // FIXED: Import typography
import * as Haptics from 'expo-haptics';
import {
  Zap,
  Target,
  Clock,
  ArrowRight,
  Trophy,
  Palette,
  Users,
  TrendingUp,
  BookOpen, // FIXED: Moved import to top
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, borderRadius } = useTheme(); // FIXED: Removed typography from theme
  const { user, isLoading, dailyGoalProgress, checkDailyStreak } = useUserProgress();
  const { level, xp, xpToNextLevel, xpProgress, streakDays } = useProgress();
  const { recommendedLessons, learningProgress } = useLearning();
  const { recommendedLesson, insights } = useLessonContext();
  const [dailyChallenge, setDailyChallenge] = React.useState<any>(null);

  useEffect(() => {
    // Check daily streak on mount
    checkDailyStreak();
    
    // Load daily challenge
    const challenge = challengeSystem.getActiveChallenge('daily');
    setDailyChallenge(challenge);
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    // Redirect to onboarding if no user
    router.replace('/onboarding');
    return null;
  }

  const handleStartLesson = () => {
    if (recommendedLesson) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push(`/lesson/${recommendedLesson.id}`);
    }
  };

  const handleStartDrawing = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/draw');
  };

  const handleViewChallenge = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/gallery');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome Section */}
      <View style={[styles.welcomeSection, { paddingHorizontal: spacing.md }]}>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Welcome back,
        </Text>
        {/* FIXED: Applied typography styles separately */}
        <Text style={[styles.userName, { color: colors.text, fontSize: typography.h2.fontSize, fontWeight: typography.h2.fontWeight }]}>
          {user.displayName}
        </Text>
      </View>

      {/* Progress Card */}
      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={[styles.progressCard, { borderRadius: borderRadius.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.progressHeader}>
            <View>
              {/* FIXED: Applied typography styles separately */}
              <Text style={[styles.levelText, { fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight }]}>
                Level {level}
              </Text>
              <Text style={styles.xpText}>
                {xp} / {xpToNextLevel + xp} XP
              </Text>
            </View>
            <View style={styles.streakContainer}>
              <Zap size={24} color="#FFC107" />
              <Text style={styles.streakText}>{streakDays}</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBg}>
              <View 
                style={[
                  styles.progressBarFill,
                  { width: `${xpProgress}%` }
                ]}
              />
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target size={20} color="white" />
              <Text style={styles.statValue}>{dailyGoalProgress}%</Text>
              <Text style={styles.statLabel}>Daily Goal</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={20} color="white" />
              <Text style={styles.statValue}>
                {learningProgress?.completedLessons.length || 0}
              </Text>
              <Text style={styles.statLabel}>Lessons</Text>
            </View>
            <View style={styles.statItem}>
              <Trophy size={20} color="white" />
              <Text style={styles.statValue}>
                {user.achievements.filter(a => a.unlockedAt).length}
              </Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
        {/* FIXED: Applied typography styles separately */}
        <Text style={[styles.sectionTitle, { color: colors.text, fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight }]}>
          Quick Actions
        </Text>
        
        <View style={styles.actionGrid}>
          {/* Continue Learning */}
          {recommendedLesson && (
            <Pressable
              onPress={handleStartLesson}
              style={[
                styles.actionCard,
                { 
                  backgroundColor: colors.surface,
                  borderRadius: borderRadius.lg,
                }
              ]}
            >
              <LinearGradient
                colors={[colors.primary + '20', colors.primary + '10']}
                style={StyleSheet.absoluteFillObject}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <BookOpen size={28} color={colors.primary} />
              <Text style={[styles.actionTitle, { color: colors.text }]}>
                Continue Learning
              </Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
                {recommendedLesson.title}
              </Text>
              <ArrowRight 
                size={20} 
                color={colors.primary} 
                style={styles.actionArrow}
              />
            </Pressable>
          )}

          {/* Free Draw */}
          <Pressable
            onPress={handleStartDrawing}
            style={[
              styles.actionCard,
              { 
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <LinearGradient
              colors={[colors.secondary + '20', colors.secondary + '10']}
              style={StyleSheet.absoluteFillObject}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <Palette size={28} color={colors.secondary} />
            <Text style={[styles.actionTitle, { color: colors.text }]}>
              Free Draw
            </Text>
            <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>
              Practice & Create
            </Text>
            <ArrowRight 
              size={20} 
              color={colors.secondary} 
              style={styles.actionArrow}
            />
          </Pressable>
        </View>
      </View>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
          {/* FIXED: Applied typography styles separately */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight }]}>
            Today's Challenge
          </Text>
          
          <Pressable
            onPress={handleViewChallenge}
            style={[
              styles.challengeCard,
              { 
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
              }
            ]}
          >
            <LinearGradient
              colors={['#FF6B6B', '#4ECDC4']}
              style={[
                StyleSheet.absoluteFillObject,
                { borderRadius: borderRadius.lg }
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.challengeContent}>
              <Trophy size={32} color="white" />
              <View style={styles.challengeText}>
                {/* FIXED: Applied typography styles separately */}
                <Text style={[styles.challengeTitle, { fontSize: typography.h4.fontSize, fontWeight: typography.h4.fontWeight }]}>
                  {dailyChallenge.theme}
                </Text>
                <Text style={styles.challengeDescription}>
                  {dailyChallenge.participants} artists participating
                </Text>
              </View>
              <ArrowRight size={24} color="white" />
            </View>
          </Pressable>
        </View>
      )}

      {/* Learning Insights */}
      {insights.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
          {/* FIXED: Applied typography styles separately */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight }]}>
            Insights
          </Text>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: spacing.md }}
          >
            {insights.slice(0, 3).map((insight, index) => (
              <View
                key={index}
                style={[
                  styles.insightCard,
                  { 
                    backgroundColor: colors.surface,
                    borderRadius: borderRadius.md,
                    marginRight: spacing.sm,
                  }
                ]}
              >
                <TrendingUp 
                  size={20} 
                  color={
                    insight.type === 'achievement' ? colors.success :
                    insight.type === 'improvement' ? colors.warning :
                    colors.info
                  } 
                />
                <Text style={[styles.insightTitle, { color: colors.text }]}>
                  {insight.title}
                </Text>
                {/* FIXED: Use description instead of message */}
                <Text style={[styles.insightMessage, { color: colors.textSecondary }]}>
                  {insight.description}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Community Activity */}
      <View style={[styles.section, { paddingHorizontal: spacing.md, marginBottom: 100 }]}>
        <View style={styles.sectionHeader}>
          {/* FIXED: Applied typography styles separately */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight }]}>
            Community
          </Text>
          <Pressable onPress={() => router.push('/gallery')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              See All
            </Text>
          </Pressable>
        </View>
        
        <View
          style={[
            styles.communityCard,
            { 
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
            }
          ]}
        >
          <Users size={24} color={colors.primary} />
          <Text style={[styles.communityText, { color: colors.text }]}>
            Join the community to see what others are creating!
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeSection: {
    marginTop: 16,
  },
  welcomeText: {
    fontSize: 16,
  },
  userName: {
    marginTop: 4,
  },
  progressCard: {
    padding: 20,
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  levelText: {
    color: 'white',
  },
  xpText: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  progressBarContainer: {
    marginTop: 20,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  actionSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  actionArrow: {
    position: 'absolute',
    bottom: 16,
    right: 16,
  },
  challengeCard: {
    overflow: 'hidden',
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  challengeText: {
    flex: 1,
    marginLeft: 16,
  },
  challengeTitle: {
    color: 'white',
  },
  challengeDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  insightCard: {
    padding: 16,
    width: screenWidth * 0.7,
  },
  insightTitle: {
    fontWeight: '600',
    marginTop: 8,
  },
  insightMessage: {
    fontSize: 14,
    marginTop: 4,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  communityText: {
    flex: 1,
    marginLeft: 16,
    fontSize: 16,
  },
});