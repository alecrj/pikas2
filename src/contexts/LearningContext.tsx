import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  useMemo,
  useRef,
} from 'react';
import { Lesson, SkillTree, LearningProgress, LearningContextType } from '../types';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { errorHandler } from '../engines/core/ErrorHandler';

// Props for the LearningProvider component
interface LearningProviderProps {
  children: ReactNode;
}

// Define the LearningContext with a null default value
const LearningContext = createContext<LearningContextType | null>(null);

// LearningProvider component to wrap the app or relevant components
export function LearningProvider({ children }: LearningProviderProps) {
  // State management for learning-related data
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
  const [currentSkillTree, setCurrentSkillTreeState] = useState<SkillTree | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Ref to manage lesson state subscription cleanup
  const lessonStateUnsubscribeRef = useRef<(() => void) | null>(null);

  // Memoized insights for user feedback
  const insights = useMemo(
    () => [
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
        description: "You're on track for a 7-day learning streak!",
        actionable: false,
      },
    ],
    []
  );

  // Initialize the learning system
  const initializeLearning = useCallback(async () => {
    try {
      console.log('🎓 Initializing learning system...');
      await skillTreeManager.initialize();
      await lessonEngine.initialize();

      const trees = skillTreeManager.getAllSkillTrees();
      setSkillTrees(trees);

      if (trees.length > 0 && !currentSkillTree) {
        const defaultTree = trees.find((tree) => tree.id === 'drawing-fundamentals') || trees[0];
        setCurrentSkillTreeState(defaultTree);
      }

      const lessons = skillTreeManager.getAvailableLessons();
      setAvailableLessons(lessons);
      const unlocked = lessons.map((lesson) => lesson.id);
      setUnlockedLessons(unlocked);

      const recommended = lessons.slice(0, 3);
      setRecommendedLessons(recommended);
      setRecommendedLesson(recommended[0] || null);

      const unsubscribe = skillTreeManager.subscribeToProgress((progress) => {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      });

      setIsInitialized(true);
      console.log('✅ Learning system initialized successfully');
      return unsubscribe;
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
      return () => {};
    }
  }, [currentSkillTree]);

  // Effect to initialize the learning system on mount
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    const runInitialization = async () => {
      if (mounted) {
        unsubscribe = await initializeLearning();
      }
    };

    runInitialization();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
      if (lessonStateUnsubscribeRef.current) lessonStateUnsubscribeRef.current();
    };
  }, [initializeLearning]);

  // Effect to update available lessons when skill tree or progress changes
  useEffect(() => {
    if (isInitialized && currentSkillTree) {
      const lessons = skillTreeManager.getAvailableLessons(currentSkillTree.id);
      setAvailableLessons(lessons);
      const unlocked = lessons.map((lesson) => lesson.id);
      setUnlockedLessons(unlocked);
    }
  }, [currentSkillTree, isInitialized, completedLessons]);

  // Start a lesson
  const startLesson = useCallback(async (lesson: Lesson): Promise<void> => {
    try {
      setIsLoadingLesson(true);
      setCurrentLesson(lesson);
      await lessonEngine.startLesson(lesson);

      const unsubscribe = lessonEngine.subscribeToLessonState((state) => {
        setLessonState(state);
      });
      lessonStateUnsubscribeRef.current = unsubscribe;

      console.log(`🎯 Started lesson: ${lesson.title}`);
    } catch (error) {
      console.error('Failed to start lesson:', error);
      throw error;
    } finally {
      setIsLoadingLesson(false);
    }
  }, []);

  // Pause the current lesson
  const pauseLesson = useCallback(async () => {
    if (currentLesson) {
      lessonEngine.pauseLesson();
      console.log('⏸️ Lesson paused');
    }
  }, [currentLesson]);

  // Resume the current lesson
  const resumeLesson = useCallback(async () => {
    if (currentLesson) {
      lessonEngine.resumeLesson();
      console.log('▶️ Lesson resumed');
    }
  }, [currentLesson]);

  // Complete the current lesson
  const completeLesson = useCallback(
    async (score: number = 100): Promise<void> => {
      if (!currentLesson) return;

      try {
        await lessonEngine.completeLesson({});
        await skillTreeManager.completeLesson(currentLesson.id, score);
        setCurrentLesson(null);
        setLessonState(null);

        if (lessonStateUnsubscribeRef.current) {
          lessonStateUnsubscribeRef.current();
          lessonStateUnsubscribeRef.current = null;
        }

        console.log(`🎉 Lesson completed: ${currentLesson.title} (Score: ${score})`);
      } catch (error) {
        console.error('Failed to complete lesson:', error);
        throw error;
      }
    },
    [currentLesson]
  );

  // Exit the current lesson
  const exitLesson = useCallback(async () => {
    setCurrentLesson(null);
    setLessonState(null);
    if (lessonStateUnsubscribeRef.current) {
      lessonStateUnsubscribeRef.current();
      lessonStateUnsubscribeRef.current = null;
    }
    console.log('🚪 Exited lesson');
  }, []);

  // Update progress for the current lesson
  const updateProgress = useCallback(
    async (stepIndex: number, completed: boolean) => {
      if (!currentLesson) return;
      try {
        console.log(
          `📈 Progress updated: Step ${stepIndex + 1} ${completed ? 'completed' : 'started'}`
        );
      } catch (error) {
        console.error('Failed to update progress:', error);
      }
    },
    [currentLesson]
  );

  // Add a hint for the user
  const addHint = useCallback((hint: string) => {
    console.log(`💡 Hint provided: ${hint}`);
  }, []);

  // Validate a lesson step
  const validateStep = useCallback(
    async (stepIndex: number, userInput: any): Promise<boolean> => {
      if (!currentLesson) return false;
      try {
        const result = await lessonEngine.validateStep(currentLesson, stepIndex, userInput);
        return result.isValid;
      } catch (error) {
        console.error('Failed to validate step:', error);
        return false;
      }
    },
    [currentLesson]
  );

  // Get a specific lesson by ID
  const getLesson = useCallback((lessonId: string): Lesson | null => {
    return skillTreeManager.getLesson(lessonId);
  }, []);

  // Get progress for a specific lesson
  const getLessonProgress = useCallback((lessonId: string): number => {
    return skillTreeManager.getLessonProgress(lessonId);
  }, []);

  // Get the next recommended lesson
  const getNextLesson = useCallback((): Lesson | null => {
    return skillTreeManager.getRecommendedNextLesson();
  }, []);

  // Check if a lesson’s unlock requirements are met
  const checkUnlockRequirements = useCallback((lessonId: string): boolean => {
    return skillTreeManager.checkUnlockRequirements(lessonId);
  }, []);

  // Set the current skill tree
  const setCurrentSkillTree = useCallback((skillTree: SkillTree | null) => {
    setCurrentSkillTreeState(skillTree);
  }, []);

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo<LearningContextType>(
    () => ({
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
      startLesson,
      pauseLesson,
      resumeLesson,
      completeLesson,
      exitLesson,
      updateProgress,
      addHint,
      validateStep,
      getLesson,
      getLessonProgress,
      getNextLesson,
      checkUnlockRequirements,
    }),
    [
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
      startLesson,
      pauseLesson,
      resumeLesson,
      completeLesson,
      exitLesson,
      updateProgress,
      addHint,
      validateStep,
      getLesson,
      getLessonProgress,
      getNextLesson,
      checkUnlockRequirements,
    ]
  );

  return <LearningContext.Provider value={contextValue}>{children}</LearningContext.Provider>;
}

// Hook to access the LearningContext
export function useLearning(): LearningContextType {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}