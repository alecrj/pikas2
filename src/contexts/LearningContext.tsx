import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Lesson, SkillTree, LearningProgress, LearningContextType } from '../types';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { challengeSystem } from '../engines/community/ChallengeSystem';
import { errorHandler } from '../engines/core/ErrorHandler';

interface LearningProviderProps {
  children: ReactNode;
}

const LearningContext = createContext<LearningContextType | null>(null);

export function LearningProvider({ children }: LearningProviderProps) {
  // State management
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonState, setLessonState] = useState<any>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Insights for learning recommendations
  const [insights] = useState([
    {
      id: 'daily_practice',
      type: 'suggestion' as const,
      title: 'Daily Practice',
      description: 'Practice for 15 minutes daily to build muscle memory',
      actionable: true,
    },
    {
      id: 'foundation_focus',
      type: 'improvement' as const,
      title: 'Foundation Skills',
      description: 'Master basic shapes before moving to complex drawings',
      actionable: true,
    },
    {
      id: 'streak_building',
      type: 'achievement' as const,
      title: 'Building Momentum',
      description: 'You\'re on track for a 7-day learning streak!',
      actionable: false,
    },
  ]);

  // Initialize the learning system
  useEffect(() => {
    let mounted = true;

    const initializeLearning = async () => {
      try {
        console.log('🎓 Initializing learning system...');

        // Initialize all learning engines
        await skillTreeManager.initialize();
        await lessonEngine.initialize();

        if (!mounted) return;

        // Load skill trees
        const trees = skillTreeManager.getAllSkillTrees();
        setSkillTrees(trees);

        // Set default skill tree (first available)
        if (trees.length > 0 && !currentSkillTree) {
          const defaultTree = trees.find(tree => tree.id === 'drawing-fundamentals') || trees[0];
          setCurrentSkillTree(defaultTree);
        }

        // Load available lessons
        const lessons = skillTreeManager.getAvailableLessons();
        setAvailableLessons(lessons);

        // Get unlocked lesson IDs
        const unlocked = lessons.map(lesson => lesson.id);
        setUnlockedLessons(unlocked);

        // Get recommended lessons
        const recommended = lessons.slice(0, 3);
        setRecommendedLessons(recommended);
        setRecommendedLesson(recommended[0] || null);

        // Subscribe to progress updates
        const unsubscribe = skillTreeManager.subscribeToProgress((progress) => {
          if (mounted) {
            setLearningProgress(progress);
            setCompletedLessons(progress.completedLessons);
            setCurrentStreak(progress.currentStreak);
          }
        });

        setIsInitialized(true);
        console.log('✅ Learning system initialized successfully');

        return () => {
          unsubscribe();
        };
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
      }
    };

    initializeLearning();

    return () => {
      mounted = false;
    };
  }, []);

  // Update available lessons when skill tree changes
  useEffect(() => {
    if (isInitialized && currentSkillTree) {
      const lessons = skillTreeManager.getAvailableLessons(currentSkillTree.id);
      setAvailableLessons(lessons);
      
      const unlocked = lessons.map(lesson => lesson.id);
      setUnlockedLessons(unlocked);
    }
  }, [currentSkillTree, isInitialized, completedLessons]);

  // Lesson management functions
  const startLesson = useCallback(async (lesson: Lesson): Promise<void> => {
    try {
      setIsLoadingLesson(true);
      setCurrentLesson(lesson);
      
      await lessonEngine.startLesson(lesson);
      
      // Subscribe to lesson state updates
      const unsubscribe = lessonEngine.subscribeToLessonState((state) => {
        setLessonState(state);
      });
      
      console.log(`🎯 Started lesson: ${lesson.title}`);
      
      // Clean up subscription when lesson completes
      // Note: Returning unsubscribe function would change return type,
      // so we'll handle cleanup elsewhere
    } catch (error) {
      console.error('Failed to start lesson:', error);
      throw error;
    } finally {
      setIsLoadingLesson(false);
    }
  }, []);

  const pauseLesson = useCallback(async () => {
    if (currentLesson) {
      lessonEngine.pauseLesson();
      console.log('⏸️ Lesson paused');
    }
  }, [currentLesson]);

  const resumeLesson = useCallback(async () => {
    if (currentLesson) {
      lessonEngine.resumeLesson();
      console.log('▶️ Lesson resumed');
    }
  }, [currentLesson]);

  const completeLesson = useCallback(async (score: number = 100): Promise<void> => {
    if (!currentLesson) return;
    
    try {
      // Complete in lesson engine
      const result = await lessonEngine.completeLesson({});
      
      // Update skill tree progress
      await skillTreeManager.completeLesson(currentLesson.id, score);
      
      // Update local state
      setCompletedLessons(prev => [...prev, currentLesson.id]);
      
      // Clear current lesson
      setCurrentLesson(null);
      setLessonState(null);
      
      console.log(`🎉 Lesson completed: ${currentLesson.title} (Score: ${score})`);
      
      // Note: We don't return the result to match the interface expectation
    } catch (error) {
      console.error('Failed to complete lesson:', error);
      throw error;
    }
  }, [currentLesson]);

  const exitLesson = useCallback(async () => {
    setCurrentLesson(null);
    setLessonState(null);
    console.log('🚪 Exited lesson');
  }, []);

  // Progress management
  const updateProgress = useCallback(async (stepIndex: number, completed: boolean) => {
    if (!currentLesson) return;
    
    try {
      // This would update the current lesson's progress
      console.log(`📈 Progress updated: Step ${stepIndex + 1} ${completed ? 'completed' : 'started'}`);
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  }, [currentLesson]);

  const addHint = useCallback((hint: string) => {
    console.log(`💡 Hint provided: ${hint}`);
    // This would be handled by the lesson engine UI
  }, []);

  const validateStep = useCallback(async (stepIndex: number, userInput: any): Promise<boolean> => {
    if (!currentLesson) return false;
    
    try {
      const result = await lessonEngine.validateStep(currentLesson, stepIndex, userInput);
      return result.isValid;
    } catch (error) {
      console.error('Failed to validate step:', error);
      return false;
    }
  }, [currentLesson]);

  // Utility functions
  const getLesson = useCallback((lessonId: string): Lesson | null => {
    return skillTreeManager.getLesson(lessonId);
  }, []);

  const getLessonProgress = useCallback((lessonId: string): number => {
    return skillTreeManager.getLessonProgress(lessonId);
  }, []);

  const getNextLesson = useCallback((): Lesson | null => {
    return skillTreeManager.getRecommendedNextLesson();
  }, []);

  const checkUnlockRequirements = useCallback((lessonId: string): boolean => {
    return skillTreeManager.checkUnlockRequirements(lessonId);
  }, []);

  // Context value
  const contextValue: LearningContextType = {
    // State
    currentLesson,
    lessonState,
    isLoadingLesson,
    skillTrees,
    availableLessons,
    unlockedLessons,
    learningProgress,
    completedLessons,
    currentStreak,
    recommendedLesson,
    recommendedLessons,
    insights,
    currentSkillTree,
    setCurrentSkillTree,

    // Lesson management
    startLesson,
    pauseLesson,
    resumeLesson,
    completeLesson,
    exitLesson,

    // Progress management
    updateProgress,
    addHint,
    validateStep,

    // Utility functions
    getLesson,
    getLessonProgress,
    getNextLesson,
    checkUnlockRequirements,
  };

  return (
    <LearningContext.Provider value={contextValue}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning(): LearningContextType {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}