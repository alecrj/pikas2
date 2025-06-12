import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { useLearning } from '../../src/contexts/LearningContext';
import { Lesson, SkillTree } from '../../src/types';
import {
  BookOpen,
  Play,
  Trophy,
  Star,
  ChevronRight,
  Target,
  Zap,
  TrendingUp,
} from 'lucide-react-native';

export default function LearnScreen() {
  // FIXED: All hooks called unconditionally at the top level in the same order every time
  const theme = useTheme();
  const router = useRouter();
  const { user, progress, addXP } = useUserProgress();
  const { 
    currentSkillTree, 
    setCurrentSkillTree, 
    startLesson,
    skillTrees,
    availableLessons,
    recommendedLessons,
    insights,
    completedLessons,
    currentStreak,
    getLessonProgress,
  } = useLearning();

  // FIXED: All useState hooks called unconditionally
  const [selectedSkillTree, setSelectedSkillTree] = useState<SkillTree | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [expandedSkillTree, setExpandedSkillTree] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastInteraction, setLastInteraction] = useState(Date.now());
  const [screenMounted, setScreenMounted] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // FIXED: useEffect hooks called unconditionally
  useEffect(() => {
    setScreenMounted(true);
    return () => setScreenMounted(false);
  }, []);

  useEffect(() => {
    // Initialize default skill tree if none selected
    if (!currentSkillTree && skillTrees.length > 0) {
      const defaultTree = skillTrees.find(tree => tree.id === 'fundamentals') || skillTrees[0];
      if (defaultTree) {
        setCurrentSkillTree(defaultTree);
        setSelectedSkillTree(defaultTree);
      }
    }
  }, [skillTrees, currentSkillTree, setCurrentSkillTree]);

  useEffect(() => {
    // Update interaction timestamp periodically
    const interval = setInterval(() => {
      setLastInteraction(Date.now());
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // FIXED: All callback functions defined unconditionally
  const handleLessonStart = useCallback(async (lesson: Lesson) => {
    if (isLoadingLesson) return;

    try {
      setIsLoadingLesson(true);
      
      // Check if lesson is available
      const lessonProgress = getLessonProgress(lesson.id);
      
      if (lessonProgress >= 100) {
        Alert.alert(
          'Lesson Completed',
          'You\'ve already completed this lesson. Would you like to review it?',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Review', 
              onPress: () => {
                router.push(`/lesson/${lesson.id}`);
              }
            },
          ]
        );
        return;
      }

      // Start the lesson
      await startLesson(lesson);
      router.push(`/lesson/${lesson.id}`);
      
    } catch (error) {
      console.error('Failed to start lesson:', error);
      Alert.alert('Error', 'Failed to start lesson. Please try again.');
    } finally {
      setIsLoadingLesson(false);
    }
  }, [isLoadingLesson, getLessonProgress, startLesson, router]);

  const handleSkillTreeSelect = useCallback((skillTree: SkillTree) => {
    setSelectedSkillTree(skillTree);
    setCurrentSkillTree(skillTree);
    setExpandedSkillTree(skillTree.id);
  }, [setCurrentSkillTree]);

  const toggleSkillTreeExpansion = useCallback((treeId: string) => {
    setExpandedSkillTree(prev => prev === treeId ? null : treeId);
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh data logic would go here
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const styles = createStyles(theme);

  const renderProgressRing = (progress: number, size: number = 60) => {
    const radius = (size - 8) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ position: 'absolute' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.border}
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.primary}
            strokeWidth="4"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <View style={[styles.progressText, { width: size, height: size }]}>
          <Text style={[styles.progressNumber, { color: theme.colors.text }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>
    );
  };

  const renderSkillTree = (skillTree: SkillTree) => {
    const isExpanded = expandedSkillTree === skillTree.id;
    const isSelected = selectedSkillTree?.id === skillTree.id;
    
    return (
      <Animated.View 
        key={skillTree.id}
        entering={FadeInUp.delay(100)}
        style={styles.skillTreeContainer}
      >
        <Pressable
          style={[
            styles.skillTreeHeader,
            {
              backgroundColor: isSelected ? theme.colors.primary + '20' : theme.colors.surface,
              borderColor: isSelected ? theme.colors.primary : theme.colors.border,
            },
          ]}
          onPress={() => handleSkillTreeSelect(skillTree)}
        >
          <View style={styles.skillTreeInfo}>
            <Text style={[styles.skillTreeTitle, { color: theme.colors.text }]}>
              {skillTree.name}
            </Text>
            <Text style={[styles.skillTreeDescription, { color: theme.colors.textSecondary }]}>
              {skillTree.description}
            </Text>
            <View style={styles.skillTreeStats}>
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {skillTree.lessons.length} lessons • {skillTree.estimatedDuration}h
              </Text>
            </View>
          </View>
          {renderProgressRing(skillTree.progress || 0, 50)}
        </Pressable>

        {isExpanded && (
          <Animated.View 
            entering={FadeInDown}
            style={styles.lessonsContainer}
          >
            {skillTree.lessons
              .sort((a, b) => a.order - b.order)
              .map((lesson, index) => renderLesson(lesson, index))}
          </Animated.View>
        )}
      </Animated.View>
    );
  };

  const renderLesson = (lesson: Lesson, index: number) => {
    const progress = getLessonProgress(lesson.id);
    const isCompleted = progress >= 100;
    const isAvailable = lesson.prerequisites.every(prereq => 
      completedLessons.includes(prereq)
    );

    return (
      <Pressable
        key={lesson.id}
        style={[
          styles.lessonCard,
          {
            backgroundColor: isCompleted 
              ? theme.colors.success + '20' 
              : theme.colors.surface,
            borderColor: isCompleted 
              ? theme.colors.success 
              : theme.colors.border,
            opacity: isAvailable ? 1 : 0.6,
          },
        ]}
        onPress={() => isAvailable && handleLessonStart(lesson)}
        disabled={!isAvailable || isLoadingLesson}
      >
        <View style={styles.lessonHeader}>
          <View style={styles.lessonNumber}>
            <Text style={[styles.lessonNumberText, { color: theme.colors.primary }]}>
              {index + 1}
            </Text>
          </View>
          <View style={styles.lessonInfo}>
            <Text style={[styles.lessonTitle, { color: theme.colors.text }]}>
              {lesson.title}
            </Text>
            <Text style={[styles.lessonDescription, { color: theme.colors.textSecondary }]}>
              {lesson.description}
            </Text>
            <View style={styles.lessonMeta}>
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {lesson.estimatedTime}min • {lesson.rewards.xp} XP
              </Text>
            </View>
          </View>
          <View style={styles.lessonAction}>
            {isCompleted ? (
              <Trophy size={24} color={theme.colors.success} />
            ) : (
              <Play size={24} color={isAvailable ? theme.colors.primary : theme.colors.textSecondary} />
            )}
          </View>
        </View>
        
        {progress > 0 && progress < 100 && (
          <View style={styles.progressBar}>
            <View style={[styles.progressBarBg, { backgroundColor: theme.colors.border }]}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: theme.colors.primary, width: `${progress}%` },
                ]}
              />
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  const renderInsights = () => {
    if (insights.length === 0) return null;

    return (
      <Animated.View 
        entering={FadeInUp.delay(200)}
        style={styles.insightsContainer}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Learning Insights
          </Text>
          <Pressable onPress={() => setShowInsights(!showInsights)}>
            <TrendingUp size={24} color={theme.colors.primary} />
          </Pressable>
        </View>

        {showInsights && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {insights.slice(0, 3).map((insight, index) => (
              <View
                key={insight.id}
                style={[
                  styles.insightCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                ]}
              >
                <Text style={[styles.insightTitle, { color: theme.colors.text }]}>
                  {insight.title}
                </Text>
                <Text style={[styles.insightDescription, { color: theme.colors.textSecondary }]}>
                  {insight.description}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    );
  };

  const renderRecommendations = () => {
    if (recommendedLessons.length === 0) return null;

    return (
      <Animated.View 
        entering={FadeInUp.delay(300)}
        style={styles.recommendationsContainer}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Recommended for You
          </Text>
          <Target size={24} color={theme.colors.primary} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {recommendedLessons.slice(0, 3).map((lesson) => (
            <Pressable
              key={lesson.id}
              style={[
                styles.recommendationCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.primary },
              ]}
              onPress={() => handleLessonStart(lesson)}
            >
              <Text style={[styles.recommendationTitle, { color: theme.colors.text }]}>
                {lesson.title}
              </Text>
              <Text style={[styles.recommendationMeta, { color: theme.colors.textSecondary }]}>
                {lesson.estimatedTime}min • {lesson.rewards.xp} XP
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  // Render loading state
  if (!screenMounted || skillTrees.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading learning content...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <Animated.View entering={FadeInUp} style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Learn & Practice
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Master drawing through structured lessons
          </Text>
        </Animated.View>

        {renderInsights()}
        {renderRecommendations()}

        <View style={styles.skillTreesSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Skill Trees
          </Text>
          {skillTrees.map(renderSkillTree)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  refreshIndicator: {
    height: 40,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  insightsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  insightCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  recommendationsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  recommendationCard: {
    width: 200,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginRight: 12,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationMeta: {
    fontSize: 14,
  },
  skillTreesSection: {
    padding: 20,
    paddingTop: 0,
  },
  skillTreeContainer: {
    marginBottom: 16,
  },
  skillTreeHeader: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  skillTreeInfo: {
    flex: 1,
    marginRight: 16,
  },
  skillTreeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  skillTreeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  skillTreeStats: {
    flexDirection: 'row',
  },
  statText: {
    fontSize: 12,
  },
  progressText: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '600',
  },
  lessonsContainer: {
    paddingTop: 8,
  },
  lessonCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonNumberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  lessonDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  lessonMeta: {
    flexDirection: 'row',
  },
  metaText: {
    fontSize: 12,
  },
  lessonAction: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    marginTop: 12,
  },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 2,
  },
});