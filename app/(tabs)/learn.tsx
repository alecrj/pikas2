import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  FadeInRight,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { useLearning } from '../../src/contexts/LearningContext';
import { skillTreeManager } from '../../src/engines/learning/SkillTreeManager';
import { SkillTree, Lesson, SkillTreeProgress } from '../../src/types';
import {
  BookOpen,
  Trophy,
  Lock,
  CheckCircle,
  ChevronRight,
  Star,
  Clock,
  TrendingUp,
  Award,
  Target,
  Zap,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function LearnScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, progress, addXP } = useUserProgress();
  const { currentSkillTree, setCurrentSkillTree, startLesson } = useLearning();
  
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [progressMap, setProgressMap] = useState<Map<string, SkillTreeProgress>>(new Map());
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  
  // IMPORTANT: Move createStyles call AFTER all hooks to fix hooks order
  const [styles] = useState(() => createStyles(theme));

  useEffect(() => {
    loadSkillTrees();
    loadRecommendedLesson();
    
    // Subscribe to progress updates
    const unsubscribe = skillTreeManager.subscribeToProgress((learningProgress) => {
      const map = new Map<string, SkillTreeProgress>();
      learningProgress.skillTrees.forEach(tree => {
        map.set(tree.skillTreeId, tree);
      });
      setProgressMap(map);
    });
    
    return unsubscribe;
  }, []);

  const loadSkillTrees = async () => {
    try {
      const trees = skillTreeManager.getAvailableSkillTrees();
      setSkillTrees(trees);
      
      if (!currentSkillTree && trees.length > 0) {
        setCurrentSkillTree(trees[0]);
      }
    } catch (error) {
      console.error('Failed to load skill trees:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecommendedLesson = () => {
    const lesson = skillTreeManager.getRecommendedNextLesson();
    setRecommendedLesson(lesson);
  };

  const handleStartLesson = async (lesson: Lesson) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('🎯 Starting lesson:', lesson.id);
      
      // Start the lesson in the context
      await startLesson(lesson);
      
      // Navigate to the lesson screen
      router.push(`/lesson/${lesson.id}`);
    } catch (error) {
      console.error('Failed to start lesson:', error);
      Alert.alert(
        'Error',
        'Failed to start the lesson. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const renderRecommendedSection = () => {
    if (!recommendedLesson) return null;

    return (
      <Animated.View 
        entering={FadeInDown.delay(200).springify()}
        style={styles.recommendedSection}
      >
        <LinearGradient
          colors={[theme.colors.primary + '20', theme.colors.primary + '10']}
          style={styles.recommendedGradient}
        >
          <View style={styles.recommendedHeader}>
            <Zap size={20} color={theme.colors.primary} />
            <Text style={styles.recommendedTitle}>Continue Learning</Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.recommendedLesson,
              { opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => handleStartLesson(recommendedLesson)}
          >
            <View style={styles.lessonIcon}>
              <BookOpen size={32} color={theme.colors.primary} />
            </View>
            <View style={styles.recommendedContent}>
              <Text style={styles.recommendedLessonTitle}>{recommendedLesson.title}</Text>
              <Text style={styles.recommendedDescription}>{recommendedLesson.description}</Text>
              <View style={styles.lessonMeta}>
                <View style={styles.metaItem}>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>
                    {recommendedLesson.duration || recommendedLesson.estimatedTime} min
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Trophy size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.metaText}>
                    {recommendedLesson.xpReward || recommendedLesson.rewards?.xp} XP
                  </Text>
                </View>
              </View>
            </View>
            <ChevronRight size={24} color={theme.colors.primary} />
          </Pressable>
        </LinearGradient>
      </Animated.View>
    );
  };

  const renderSkillTree = (tree: SkillTree, index: number) => {
    const treeProgress = progressMap.get(tree.id);
    const completedCount = treeProgress?.completedLessons.length || 0;
    const totalCount = tree.lessons.length;
    const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
      <Animated.View
        key={tree.id}
        entering={FadeInRight.delay(index * 100).springify()}
        style={styles.skillTreeCard}
      >
        <Pressable
          style={({ pressed }) => [
            styles.skillTreeHeader,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            setCurrentSkillTree(tree);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          <View style={styles.treeInfo}>
            <Text style={styles.treeName}>{tree.name}</Text>
            <Text style={styles.treeDescription}>{tree.description}</Text>
          </View>
          <View style={styles.treeProgress}>
            <Text style={styles.progressText}>{completedCount}/{totalCount}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${completionPercentage}%` },
                ]}
              />
            </View>
          </View>
        </Pressable>

        {currentSkillTree?.id === tree.id && (
          <View style={styles.lessonList}>
            {tree.lessons.map((lesson, lessonIndex) => 
              renderLesson(lesson, lessonIndex, treeProgress)
            )}
          </View>
        )}
      </Animated.View>
    );
  };

  const renderLesson = (
    lesson: Lesson, 
    index: number, 
    treeProgress: SkillTreeProgress | undefined
  ) => {
    const isCompleted = treeProgress?.completedLessons.includes(lesson.id) || false;
    const isUnlocked = skillTreeManager.getAvailableLessons(lesson.skillTree || lesson.skillTreeId || '').includes(lesson);
    const isNext = recommendedLesson?.id === lesson.id;

    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Animated.View
        key={lesson.id}
        entering={FadeInDown.delay(index * 50).springify()}
        style={[styles.lessonCard, animatedStyle]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.lessonPressable,
            isCompleted && styles.lessonCompleted,
            !isUnlocked && styles.lessonLocked,
            isNext && styles.lessonNext,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          onPress={() => {
            if (isUnlocked) {
              scale.value = withSpring(0.95, {}, () => {
                scale.value = withSpring(1);
              });
              handleStartLesson(lesson);
            } else {
              Alert.alert(
                'Lesson Locked',
                'Complete the previous lessons to unlock this one.',
                [{ text: 'OK' }]
              );
            }
          }}
          disabled={!isUnlocked}
        >
          <View style={styles.lessonLeft}>
            <View style={[
              styles.lessonIconContainer,
              isCompleted && styles.lessonIconCompleted,
              isNext && styles.lessonIconNext,
            ]}>
              {isCompleted ? (
                <CheckCircle size={24} color={theme.colors.surface} />
              ) : !isUnlocked ? (
                <Lock size={24} color={theme.colors.textSecondary} />
              ) : (
                <Text style={styles.lessonNumber}>{lesson.order}</Text>
              )}
            </View>
            <View style={styles.lessonContent}>
              <Text style={[
                styles.lessonTitle,
                !isUnlocked && styles.lessonTitleLocked,
              ]}>
                {lesson.title}
              </Text>
              <Text style={[
                styles.lessonDescription,
                !isUnlocked && styles.lessonDescriptionLocked,
              ]}>
                {lesson.description}
              </Text>
              <View style={styles.lessonMetaRow}>
                <View style={styles.metaItem}>
                  <Clock size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.metaTextSmall}>
                    {lesson.duration || lesson.estimatedTime} min
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Star size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.metaTextSmall}>
                    {'⭐'.repeat(lesson.difficulty)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Trophy size={12} color={theme.colors.textSecondary} />
                  <Text style={styles.metaTextSmall}>
                    {lesson.xpReward || lesson.rewards?.xp} XP
                  </Text>
                </View>
              </View>
            </View>
          </View>
          <ChevronRight 
            size={20} 
            color={isUnlocked ? theme.colors.primary : theme.colors.textSecondary} 
          />
        </Pressable>
      </Animated.View>
    );
  };

  const renderProgressOverview = () => {
    const overview = skillTreeManager.getOverallProgress();
    
    return (
      <View style={styles.progressOverview}>
        <Text style={styles.overviewTitle}>Your Progress</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Target size={24} color={theme.colors.primary} />
            <Text style={styles.statValue}>{overview.totalLessonsCompleted}</Text>
            <Text style={styles.statLabel}>Lessons</Text>
          </View>
          <View style={styles.statCard}>
            <Trophy size={24} color={theme.colors.warning} />
            <Text style={styles.statValue}>{overview.totalXpEarned}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </View>
          <View style={styles.statCard}>
            <TrendingUp size={24} color={theme.colors.success} />
            <Text style={styles.statValue}>{Math.round(overview.completionPercentage)}%</Text>
            <Text style={styles.statLabel}>Complete</Text>
          </View>
          <View style={styles.statCard}>
            <Award size={24} color={theme.colors.error} />
            <Text style={styles.statValue}>{progress?.achievements.length || 0}</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Learn to Draw</Text>
        <Text style={styles.headerSubtitle}>
          Master the fundamentals step by step
        </Text>
      </View>

      {renderProgressOverview()}
      {renderRecommendedSection()}

      <View style={styles.skillTreesSection}>
        <Text style={styles.sectionTitle}>Skill Trees</Text>
        {skillTrees.map((tree, index) => renderSkillTree(tree, index))}
      </View>

      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  progressOverview: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  statCard: {
    width: (screenWidth - 52) / 4,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    margin: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recommendedSection: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  recommendedGradient: {
    borderRadius: 16,
    padding: 16,
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  recommendedLesson: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
  },
  lessonIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  recommendedContent: {
    flex: 1,
  },
  recommendedLessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  recommendedDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  metaTextSmall: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  skillTreesSection: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  skillTreeCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  skillTreeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  treeInfo: {
    flex: 1,
    marginRight: 16,
  },
  treeName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  treeDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  treeProgress: {
    alignItems: 'flex-end',
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    width: 60,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  lessonList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  lessonCard: {
    marginBottom: 12,
  },
  lessonPressable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    padding: 12,
  },
  lessonCompleted: {
    backgroundColor: theme.colors.success + '10',
  },
  lessonLocked: {
    opacity: 0.5,
  },
  lessonNext: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  lessonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  lessonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonIconCompleted: {
    backgroundColor: theme.colors.success,
  },
  lessonIconNext: {
    backgroundColor: theme.colors.primary,
  },
  lessonNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  lessonContent: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  lessonTitleLocked: {
    color: theme.colors.textSecondary,
  },
  lessonDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  lessonDescriptionLocked: {
    color: theme.colors.textSecondary + '80',
  },
  bottomSpacing: {
    height: 100,
  },
});