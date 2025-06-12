import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  Lesson,
  LessonState,
  SkillTree,
  LearningProgress,
  LearningContextType,
} from '../types';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { progressTracker } from '../engines/learning/ProgressTracker';
import { dataManager } from '../engines/core/DataManager';
import { errorHandler } from '../engines/core/ErrorHandler';

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export const LearningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Core lesson state
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonState, setLessonState] = useState<LessonState | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);

  // Learning content state
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]);

  // Progress state
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  // Recommendation state
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);

  // Insights and analytics
  const [insights, setInsights] = useState<Array<{
    id: string;
    type: 'improvement' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    actionable: boolean;
  }>>([]);

  // Performance optimization: Memoize heavy computations
  const progressMap = useMemo(() => {
    const map = new Map<string, any>();
    if (learningProgress?.skillTrees) {
      learningProgress.skillTrees.forEach(tree => {
        map.set(tree.skillTreeId, tree);
      });
    }
    return map;
  }, [learningProgress]);

  const unlockedLessonsSet = useMemo(() => {
    return new Set(unlockedLessons);
  }, [unlockedLessons]);

  // Initialize learning system
  useEffect(() => {
    initializeLearning();
  }, []);

  // Subscribe to progress updates
  useEffect(() => {
    const unsubscribe = progressTracker.subscribeToProgress((progress) => {
      setLearningProgress(progress);
      setCompletedLessons(progress.completedLessons);
      setCurrentStreak(progress.currentStreak);
      updateRecommendations();
      generateInsights();
    });

    return unsubscribe;
  }, []);

  const initializeLearning = useCallback(async () => {
    try {
      console.log('🎓 Initializing learning system...');
      
      // Load skill trees with error handling
      const trees = skillTreeManager.getAllSkillTrees();
      setSkillTrees(trees);

      // Load all available lessons
      const lessons = skillTreeManager.getAllLessons();
      setAvailableLessons(lessons);

      // Get current progress
      const progress = progressTracker.getProgress();
      if (progress) {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      }

      // Get unlocked lessons
      const unlockedLessonObjects = skillTreeManager.getUnlockedLessons();
      const unlockedLessonIds = unlockedLessonObjects.map(lesson => lesson.id);
      setUnlockedLessons(unlockedLessonIds);

      // Set default skill tree
      if (trees.length > 0) {
        setCurrentSkillTree(trees[0]);
      }

      // Load recommendations and insights
      await updateRecommendations();
      generateInsights();

      console.log('✅ Learning system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize learning system:', error);
      errorHandler.handleError(
        errorHandler.createError('LEARNING_INIT_ERROR', 'Failed to initialize learning system', 'medium', error)
      );
    }
  }, []);

  const updateRecommendations = useCallback(async () => {
    try {
      console.log('🎯 Updating lesson recommendations...');
      
      // Get recommended lesson IDs from progress tracker
      const recommended = progressTracker.getRecommendedLessons(5);
      
      // Convert IDs to lesson objects, filtering out null values
      const recommendedLessonObjects = recommended
        .map(lessonId => skillTreeManager.getLesson(lessonId))
        .filter((lesson): lesson is Lesson => lesson !== null);
      
      setRecommendedLessons(recommendedLessonObjects);
      setRecommendedLesson(recommendedLessonObjects.length > 0 ? recommendedLessonObjects[0] : null);
      
      console.log(`✅ Updated recommendations: ${recommendedLessonObjects.length} lessons`);
    } catch (error) {
      console.warn('⚠️ Failed to update recommendations:', error);
      setRecommendedLessons([]);
      setRecommendedLesson(null);
    }
  }, []);

  const generateInsights = useCallback(() => {
    try {
      console.log('💡 Generating learning insights...');
      const newInsights = [];
      
      // Streak achievements
      if (currentStreak >= 3) {
        newInsights.push({
          id: 'streak_achievement',
          type: 'achievement' as const,
          title: `${currentStreak} Day Streak!`,
          description: 'You\'re building a great learning habit. Keep it up!',
          actionable: false,
        });
      }
      
      // Skill development insights
      if (completedLessons.length >= 5) {
        newInsights.push({
          id: 'skill_development',
          type: 'improvement' as const,
          title: 'Drawing Fundamentals',
          description: 'Your line work has improved significantly. Try more complex shapes!',
          actionable: true,
        });
      }
      
      // Next lesson suggestions
      if (recommendedLesson) {
        newInsights.push({
          id: 'next_lesson',
          type: 'suggestion' as const,
          title: 'Ready for Next Challenge',
          description: `Try "${recommendedLesson.title}" to continue your learning journey`,
          actionable: true,
        });
      }
      
      // Performance insights
      if (learningProgress) {
        const averageProgress = learningProgress.completedLessons.length > 0 ? 
          learningProgress.totalXP / learningProgress.completedLessons.length : 0;
        
        if (averageProgress > 80) {
          newInsights.push({
            id: 'high_performance',
            type: 'achievement' as const,
            title: 'Excellence in Learning',
            description: 'You\'re averaging high scores! Consider more challenging lessons.',
            actionable: true,
          });
        }
      }
      
      // Learning pattern insights
      if (completedLessons.length > 0) {
        const lastWeekCount = completedLessons.length; // Simplified for now
        if (lastWeekCount >= 3) {
          newInsights.push({
            id: 'consistency_praise',
            type: 'achievement' as const,
            title: 'Consistent Learner',
            description: `You've completed ${lastWeekCount} lessons recently. Great consistency!`,
            actionable: false,
          });
        }
      }
      
      setInsights(newInsights);
      console.log(`✅ Generated ${newInsights.length} insights`);
    } catch (error) {
      console.warn('⚠️ Failed to generate insights:', error);
      setInsights([]);
    }
  }, [currentStreak, completedLessons, recommendedLesson, learningProgress]);

  const startLesson = useCallback(async (lesson: Lesson) => {
    try {
      console.log(`🎯 Starting lesson: ${lesson.title}`);
      setIsLoadingLesson(true);
      
      const newLessonState: LessonState = {
        lessonId: lesson.id,
        startedAt: new Date(),
        theoryProgress: {
          currentSegment: 0,
          completedSegments: [],
          timeSpent: 0,
        },
        practiceProgress: {
          currentStep: 0,
          completedSteps: [],
          attempts: {},
          hints: [],
          timeSpent: 0,
        },
        overallProgress: 0,
        isPaused: false,
      };
      
      setCurrentLesson(lesson);
      setLessonState(newLessonState);
      
      // Save lesson state
      await dataManager.save(`lesson_state_${lesson.id}`, newLessonState);
      
      // Initialize lesson in engine
      await lessonEngine.startLesson(lesson);
      
      console.log('✅ Lesson started successfully');
    } catch (error) {
      console.error('❌ Failed to start lesson:', error);
      errorHandler.handleError(
        errorHandler.createError('LESSON_START_ERROR', 'Failed to start lesson', 'medium', error)
      );
      throw error; // Re-throw to let UI handle the error
    } finally {
      setIsLoadingLesson(false);
    }
  }, []);

  const pauseLesson = useCallback(async () => {
    if (!currentLesson || !lessonState) return;
    try {
      console.log(`⏸️ Pausing lesson: ${currentLesson.title}`);
      
      const pausedState = {
        ...lessonState,
        isPaused: true,
        pausedAt: new Date(),
      };
      
      setLessonState(pausedState);
      await dataManager.save(`lesson_state_${currentLesson.id}`, pausedState);
      
      console.log('✅ Lesson paused');
    } catch (error) {
      console.error('❌ Failed to pause lesson:', error);
      errorHandler.handleError(
        errorHandler.createError('LESSON_PAUSE_ERROR', 'Failed to pause lesson', 'low', error)
      );
    }
  }, [currentLesson, lessonState]);

  const resumeLesson = useCallback(async () => {
    if (!currentLesson || !lessonState) return;
    try {
      console.log(`▶️ Resuming lesson: ${currentLesson.title}`);
      
      const resumedState = {
        ...lessonState,
        isPaused: false,
        pausedAt: undefined,
      };
      
      setLessonState(resumedState);
      await dataManager.save(`lesson_state_${currentLesson.id}`, resumedState);
      
      console.log('✅ Lesson resumed');
    } catch (error) {
      console.error('❌ Failed to resume lesson:', error);
      errorHandler.handleError(
        errorHandler.createError('LESSON_RESUME_ERROR', 'Failed to resume lesson', 'low', error)
      );
    }
  }, [currentLesson, lessonState]);

  const completeLesson = useCallback(async (score: number = 100) => {
    if (!currentLesson || !lessonState) return;
    try {
      console.log(`🎉 Completing lesson: ${currentLesson.title} with score: ${score}`);
      
      // Update progress tracker
      await progressTracker.completeLesson(currentLesson.id, score);
      
      // Refresh progress state
      const progress = progressTracker.getProgress();
      if (progress) {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      }
      
      // Update unlocked lessons
      const unlockedLessonObjects = skillTreeManager.getUnlockedLessons();
      const unlockedLessonIds = unlockedLessonObjects.map(lesson => lesson.id);
      setUnlockedLessons(unlockedLessonIds);
      
      // Clear current lesson
      setCurrentLesson(null);
      setLessonState(null);
      
      // Update recommendations and insights
      await updateRecommendations();
      generateInsights();
      
      console.log('✅ Lesson completed successfully');
    } catch (error) {
      console.error('❌ Failed to complete lesson:', error);
      errorHandler.handleError(
        errorHandler.createError('LESSON_COMPLETE_ERROR', 'Failed to complete lesson', 'medium', error)
      );
      throw error;
    }
  }, [currentLesson, lessonState, updateRecommendations, generateInsights]);

  const exitLesson = useCallback(async () => {
    if (!currentLesson) return;
    try {
      console.log(`🚪 Exiting lesson: ${currentLesson.title}`);
      
      // Save current lesson state before exiting
      if (lessonState) {
        await dataManager.save(`lesson_state_${currentLesson.id}`, lessonState);
      }
      
      setCurrentLesson(null);
      setLessonState(null);
      
      console.log('✅ Lesson exited');
    } catch (error) {
      console.error('❌ Failed to exit lesson:', error);
      errorHandler.handleError(
        errorHandler.createError('LESSON_EXIT_ERROR', 'Failed to exit lesson', 'low', error)
      );
    }
  }, [currentLesson, lessonState]);

  const updateProgress = useCallback(async (stepIndex: number, completed: boolean) => {
    if (!lessonState || !currentLesson) return;
    try {
      console.log(`📈 Updating progress: step ${stepIndex}, completed: ${completed}`);
      
      const updatedState = {
        ...lessonState,
        practiceProgress: {
          ...lessonState.practiceProgress,
          currentStep: completed ? stepIndex + 1 : stepIndex,
          completedSteps: completed
            ? [...new Set([...lessonState.practiceProgress.completedSteps, stepIndex])]
            : lessonState.practiceProgress.completedSteps,
        },
      };
      
      // Calculate overall progress
      const totalSteps = currentLesson.practiceContent?.instructions?.length || 1;
      updatedState.overallProgress = (updatedState.practiceProgress.completedSteps.length / totalSteps) * 100;
      
      setLessonState(updatedState);
      await dataManager.save(`lesson_state_${currentLesson.id}`, updatedState);
      
      console.log(`✅ Progress updated: ${Math.round(updatedState.overallProgress)}%`);
    } catch (error) {
      console.error('❌ Failed to update progress:', error);
      errorHandler.handleError(
        errorHandler.createError('PROGRESS_UPDATE_ERROR', 'Failed to update progress', 'low', error)
      );
    }
  }, [lessonState, currentLesson]);

  const addHint = useCallback((hint: string) => {
    if (!lessonState) return;
    
    console.log(`💡 Adding hint: ${hint}`);
    
    const updatedState = {
      ...lessonState,
      practiceProgress: {
        ...lessonState.practiceProgress,
        hints: [...lessonState.practiceProgress.hints, hint],
      },
    };
    
    setLessonState(updatedState);
  }, [lessonState]);

  const validateStep = useCallback(async (
    stepIndex: number,
    userInput: any
  ): Promise<boolean> => {
    if (!currentLesson) return false;
    try {
      console.log(`🔍 Validating step ${stepIndex}`);
      
      const result = await lessonEngine.validateStep(currentLesson, stepIndex, userInput);
      const isValid = !!result.isValid;
      
      console.log(`✅ Step validation result: ${isValid}`);
      return isValid;
    } catch (error) {
      console.error('❌ Failed to validate step:', error);
      errorHandler.handleError(
        errorHandler.createError('STEP_VALIDATION_ERROR', 'Failed to validate step', 'low', error)
      );
      return false;
    }
  }, [currentLesson]);

  // Utility functions
  const getLesson = useCallback((lessonId: string): Lesson | null => {
    return skillTreeManager.getLesson(lessonId);
  }, []);

  const getNextLesson = useCallback((): Lesson | null => {
    const recommended = progressTracker.getRecommendedLessons(1);
    return recommended.length > 0 ? skillTreeManager.getLesson(recommended[0]) : null;
  }, []);

  const checkUnlockRequirements = useCallback((lessonId: string): boolean => {
    return unlockedLessonsSet.has(lessonId);
  }, [unlockedLessonsSet]);

  // Enhanced utility functions for production use
  const getLessonProgress = useCallback((lessonId: string): number => {
    if (completedLessons.includes(lessonId)) return 100;
    if (currentLesson?.id === lessonId && lessonState) {
      return lessonState.overallProgress;
    }
    return 0;
  }, [completedLessons, currentLesson, lessonState]);

  const getSkillTreeProgress = useCallback((skillTreeId: string) => {
    return progressMap.get(skillTreeId);
  }, [progressMap]);

  const refreshProgress = useCallback(async () => {
    try {
      const progress = progressTracker.getProgress();
      if (progress) {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      }
      await updateRecommendations();
      generateInsights();
    } catch (error) {
      console.error('❌ Failed to refresh progress:', error);
    }
  }, [updateRecommendations, generateInsights]);

  // Create the context value with all required properties
  const value: LearningContextType = {
    // Core lesson state
    currentLesson,
    lessonState,
    isLoadingLesson,

    // Learning content
    skillTrees,
    availableLessons,
    unlockedLessons,

    // Progress state
    learningProgress,
    completedLessons,
    currentStreak,

    // Recommendations and insights
    recommendedLesson,
    recommendedLessons,
    insights,
    currentSkillTree,
    setCurrentSkillTree,

    // Core lesson operations
    startLesson,
    pauseLesson,
    resumeLesson,
    completeLesson,
    exitLesson,

    // Progress operations
    updateProgress,
    addHint,
    validateStep,

    // Utility functions
    getLesson,
    getNextLesson,
    checkUnlockRequirements,

    // Enhanced utility functions for production
    getLessonProgress,
    getSkillTreeProgress,
    refreshProgress,
  };

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
};

export const useLearning = (): LearningContextType => {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
};

// Alias for compatibility with existing code
export const useLessonContext = useLearning;