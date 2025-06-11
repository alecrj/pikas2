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
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { useLearning } from '../../src/contexts/LearningContext';
import { typography } from '../../src/constants/typography';
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
  BookOpen,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const { colors, spacing, borderRadius } = useTheme();
  
  // Single context usage with proper destructuring
  const { 
    user, 
    isLoading, 
    getDailyGoalProgress, 
    checkDailyStreak,
    progress 
  } = useUserProgress();
  
  const { recommendedLesson, learningProgress, insights } = useLearning();
  const [dailyChallenge, setDailyChallenge] = React.useState<any>(null);

  // Safe data access with fallbacks
  const level = progress?.level || 1;
  const xp = progress?.xp || 0;
  const xpToNextLevel = progress?.xpToNextLevel || 100;
  const streakDays = progress?.streakDays || 0;
  const achievements = progress?.achievements || [];
  const xpProgress = xpToNextLevel > 0 ? xp / (xp + xpToNextLevel) : 0;

  useEffect(() => {
    // Check daily streak on mount
    if (checkDailyStreak) {
      checkDailyStreak();
    }
    
    // Safe challenge loading with mock data
    const loadDailyChallenge = async () => {
      try {
        const mockChallenge = {
          theme: "Draw your morning coffee",
          participants: 847,
          type: 'daily',
          reward: 50,
          timeLeft: '18h 32m'
        };
        setDailyChallenge(mockChallenge);
      } catch (error) {
        console.warn('Challenge system not ready, using mock data');
        setDailyChallenge({
          theme: "Draw your morning coffee", 
          participants: 847,
          type: 'daily'
        });
      }
    };

    loadDailyChallenge();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading your workspace...
        </Text>
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
    } else {
      // Navigate to learn tab if no specific lesson
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push('/learn');
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

  // Safe daily goal calculation
  const dailyGoalProgress = getDailyGoalProgress ? getDailyGoalProgress() : 0;
  
  // Safe achievements count
  const completedAchievements = achievements.filter(a => a.unlockedAt).length;

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
        <Text style={[
          styles.userName, 
          { 
            color: colors.text, 
            fontSize: typography.h2.fontSize, 
            fontWeight: typography.h2.fontWeight 
          }
        ]}>
          {user.displayName || 'Artist'}
        </Text>
      </View>

      {/* Progress Card */}
      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.md }}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark || colors.primary]}
          style={[styles.progressCard, { borderRadius: borderRadius.xl }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.progressHeader}>
            <View>
              <Text style={[
                styles.levelText, 
                { 
                  fontSize: typography.h3.fontSize, 
                  fontWeight: typography.h3.fontWeight 
                }
              ]}>
                Level {level}
              </Text>
              <Text style={styles.xpText}>
                {xp.toLocaleString()} / {(xpToNextLevel + xp).toLocaleString()} XP
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
                  { width: `${Math.min(100, Math.max(0, xpProgress * 100))}%` }
                ]}
              />
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target size={20} color="white" />
              <Text style={styles.statValue}>{Math.round(dailyGoalProgress)}%</Text>
              <Text style={styles.statLabel}>Daily Goal</Text>
            </View>
            <View style={styles.statItem}>
              <Clock size={20} color="white" />
              <Text style={styles.statValue}>
                {learningProgress?.completedLessons?.length || 0}
              </Text>
              <Text style={styles.statLabel}>Lessons</Text>
            </View>
            <View style={styles.statItem}>
              <Trophy size={20} color="white" />
              <Text style={styles.statValue}>
                {completedAchievements}
              </Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Quick Actions */}
      <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
        <Text style={[
          styles.sectionTitle, 
          { 
            color: colors.text, 
            fontSize: typography.h3.fontSize, 
            fontWeight: typography.h3.fontWeight 
          }
        ]}>
          Quick Actions
        </Text>
        
        <View style={styles.actionGrid}>
          {/* Continue Learning */}
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
              {recommendedLesson?.title || 'Start Drawing Fundamentals'}
            </Text>
            <ArrowRight 
              size={20} 
              color={colors.primary} 
              style={styles.actionArrow}
            />
          </Pressable>

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
          <Text style={[
            styles.sectionTitle, 
            { 
              color: colors.text, 
              fontSize: typography.h3.fontSize, 
              fontWeight: typography.h3.fontWeight 
            }
          ]}>
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
                <Text style={[
                  styles.challengeTitle, 
                  { 
                    fontSize: typography.h4.fontSize, 
                    fontWeight: typography.h4.fontWeight 
                  }
                ]}>
                  {dailyChallenge.theme}
                </Text>
                <Text style={styles.challengeDescription}>
                  {dailyChallenge.participants.toLocaleString()} artists participating
                </Text>
                {dailyChallenge.timeLeft && (
                  <Text style={styles.challengeTime}>
                    {dailyChallenge.timeLeft} left
                  </Text>
                )}
              </View>
              <ArrowRight size={24} color="white" />
            </View>
          </Pressable>
        </View>
      )}

      {/* Learning Insights */}
      {insights && insights.length > 0 && (
        <View style={[styles.section, { paddingHorizontal: spacing.md }]}>
          <Text style={[
            styles.sectionTitle, 
            { 
              color: colors.text, 
              fontSize: typography.h3.fontSize, 
              fontWeight: typography.h3.fontWeight 
            }
          ]}>
            Your Progress Insights
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
          <Text style={[
            styles.sectionTitle, 
            { 
              color: colors.text, 
              fontSize: typography.h3.fontSize, 
              fontWeight: typography.h3.fontWeight 
            }
          ]}>
            Community Highlights
          </Text>
          <Pressable onPress={() => router.push('/gallery')}>
            <Text style={[styles.seeAllText, { color: colors.primary }]}>
              See All
            </Text>
          </Pressable>
        </View>
        
        <Pressable
          onPress={() => router.push('/gallery')}
          style={[
            styles.communityCard,
            { 
              backgroundColor: colors.surface,
              borderRadius: borderRadius.lg,
            }
          ]}
        >
          <LinearGradient
            colors={[colors.primary + '15', colors.secondary + '15']}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Users size={28} color={colors.primary} />
          <View style={styles.communityTextContainer}>
            <Text style={[styles.communityTitle, { color: colors.text }]}>
              Join the Community
            </Text>
            <Text style={[styles.communitySubtitle, { color: colors.textSecondary }]}>
              Share your artwork and get inspired by 10,000+ artists
            </Text>
          </View>
          <ArrowRight size={20} color={colors.primary} />
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  welcomeSection: {
    marginTop: 16,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '400',
  },
  userName: {
    marginTop: 4,
  },
  progressCard: {
    padding: 24,
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
    fontSize: 14,
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
    fontSize: 16,
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
    marginTop: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
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
    fontWeight: '600',
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
    minHeight: 120,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  actionSubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
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
    fontWeight: '700',
  },
  challengeDescription: {
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    fontSize: 14,
  },
  challengeTime: {
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  insightCard: {
    padding: 16,
    width: screenWidth * 0.7,
  },
  insightTitle: {
    fontWeight: '600',
    marginTop: 8,
    fontSize: 16,
  },
  insightMessage: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  communityTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  communityTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  communitySubtitle: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
});