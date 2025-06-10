import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonState, setLessonState] = useState<LessonState | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);

  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  // FIXED: Added missing recommendedLessons property
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);
  const [insights, setInsights] = useState<Array<{
    id: string;
    type: 'improvement' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    actionable: boolean;
  }>>([]);

  useEffect(() => {
    initializeLearning();
  }, []);

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

  const initializeLearning = async () => {
    try {
      const trees = skillTreeManager.getAllSkillTrees();
      setSkillTrees(trees);

      const lessons = skillTreeManager.getAllLessons();
      setAvailableLessons(lessons);

      const progress = progressTracker.getProgress();
      if (progress) {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      }

      // Get unlocked lesson IDs
      const unlockedLessonObjects = skillTreeManager.getUnlockedLessons();
      const unlockedLessonIds = unlockedLessonObjects.map(lesson => lesson.id);
      setUnlockedLessons(unlockedLessonIds);

      if (trees.length > 0) setCurrentSkillTree(trees[0]);

      updateRecommendations();
      generateInsights();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LEARNING_INIT_ERROR', 'Failed to initialize learning system', 'medium', error)
      );
    }
  };

  const updateRecommendations = () => {
    try {
      const recommended = progressTracker.getRecommendedLessons(5); // Get top 5 recommendations
      const recommendedLessonObjects = recommended
        .map(lessonId => skillTreeManager.getLesson(lessonId))
        .filter((lesson): lesson is Lesson => lesson !== null);
      
      // FIXED: Update both single recommendation and recommendations array
      setRecommendedLessons(recommendedLessonObjects);
      setRecommendedLesson(recommendedLessonObjects.length > 0 ? recommendedLessonObjects[0] : null);
    } catch (error) {
      console.warn('Failed to update recommendations:', error);
      setRecommendedLessons([]);
      setRecommendedLesson(null);
    }
  };

  const generateInsights = () => {
    try {
      const newInsights = [];
      
      if (currentStreak >= 3) {
        newInsights.push({
          id: 'streak_achievement',
          type: 'achievement' as const,
          title: `${currentStreak} Day Streak!`,
          description: 'You\'re building a great learning habit. Keep it up!',
          actionable: false,
        });
      }
      
      if (completedLessons.length >= 5) {
        newInsights.push({
          id: 'skill_development',
          type: 'improvement' as const,
          title: 'Drawing Fundamentals',
          description: 'Your line work has improved significantly. Try more complex shapes!',
          actionable: true,
        });
      }
      
      if (recommendedLesson) {
        newInsights.push({
          id: 'next_lesson',
          type: 'suggestion' as const,
          title: 'Ready for Next Challenge',
          description: `Try "${recommendedLesson.title}" to continue your learning journey`,
          actionable: true,
        });
      }
      
      // Add performance insights
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
      
      setInsights(newInsights);
    } catch (error) {
      console.warn('Failed to generate insights:', error);
      setInsights([]);
    }
  };

  const startLesson = async (lesson: Lesson) => {
    try {
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
      await dataManager.save(`lesson_state_${lesson.id}`, newLessonState);
      await lessonEngine.startLesson(lesson);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_START_ERROR', 'Failed to start lesson', 'medium', error)
      );
    } finally {
      setIsLoadingLesson(false);
    }
  };

  const pauseLesson = async () => {
    if (!currentLesson || !lessonState) return;
    try {
      const pausedState = {
        ...lessonState,
        isPaused: true,
        pausedAt: new Date(),
      };
      setLessonState(pausedState);
      await dataManager.save(`lesson_state_${currentLesson.id}`, pausedState);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_PAUSE_ERROR', 'Failed to pause lesson', 'low', error)
      );
    }
  };

  const resumeLesson = async () => {
    if (!currentLesson || !lessonState) return;
    try {
      const resumedState = {
        ...lessonState,
        isPaused: false,
        pausedAt: undefined,
      };
      setLessonState(resumedState);
      await dataManager.save(`lesson_state_${currentLesson.id}`, resumedState);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_RESUME_ERROR', 'Failed to resume lesson', 'low', error)
      );
    }
  };

  const completeLesson = async (score: number = 100) => {
    if (!currentLesson || !lessonState) return;
    try {
      await progressTracker.completeLesson(currentLesson.id, score);
      const progress = progressTracker.getProgress();
      if (progress) {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
      }
      
      // Update unlocked lessons after completing a lesson
      const unlockedLessonObjects = skillTreeManager.getUnlockedLessons();
      const unlockedLessonIds = unlockedLessonObjects.map(lesson => lesson.id);
      setUnlockedLessons(unlockedLessonIds);
      
      setCurrentLesson(null);
      setLessonState(null);
      updateRecommendations();
      generateInsights();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_COMPLETE_ERROR', 'Failed to complete lesson', 'medium', error)
      );
    }
  };

  const exitLesson = async () => {
    if (!currentLesson) return;
    try {
      if (lessonState) {
        await dataManager.save(`lesson_state_${currentLesson.id}`, lessonState);
      }
      setCurrentLesson(null);
      setLessonState(null);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_EXIT_ERROR', 'Failed to exit lesson', 'low', error)
      );
    }
  };

  const updateProgress = async (stepIndex: number, completed: boolean) => {
    if (!lessonState || !currentLesson) return;
    try {
      const updatedState = {
        ...lessonState,
        practiceProgress: {
          ...lessonState.practiceProgress,
          currentStep: completed ? stepIndex + 1 : stepIndex,
          completedSteps: completed
            ? [...lessonState.practiceProgress.completedSteps, stepIndex]
            : lessonState.practiceProgress.completedSteps,
        },
      };
      const totalSteps = currentLesson.practiceContent.instructions.length || 1;
      updatedState.overallProgress = (updatedState.practiceProgress.completedSteps.length / totalSteps) * 100;
      setLessonState(updatedState);
      await dataManager.save(`lesson_state_${currentLesson.id}`, updatedState);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('PROGRESS_UPDATE_ERROR', 'Failed to update progress', 'low', error)
      );
    }
  };

  const addHint = (hint: string) => {
    if (!lessonState) return;
    const updatedState = {
      ...lessonState,
      practiceProgress: {
        ...lessonState.practiceProgress,
        hints: [...lessonState.practiceProgress.hints, hint],
      },
    };
    setLessonState(updatedState);
  };

  const validateStep = async (
    stepIndex: number,
    userInput: any
  ): Promise<boolean> => {
    if (!currentLesson) return false;
    try {
      const result = await lessonEngine.validateStep(currentLesson, stepIndex, userInput);
      return !!result.isValid;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('STEP_VALIDATION_ERROR', 'Failed to validate step', 'low', error)
      );
      return false;
    }
  };

  const getLesson = (lessonId: string): Lesson | null => {
    return skillTreeManager.getLesson(lessonId);
  };

  const getNextLesson = (): Lesson | null => {
    const recommended = progressTracker.getRecommendedLessons(1);
    return recommended.length > 0 ? skillTreeManager.getLesson(recommended[0]) : null;
  };

  const checkUnlockRequirements = (lessonId: string): boolean => {
    return skillTreeManager.checkUnlockRequirements(lessonId);
  };

  // FIXED: Ensure all required properties are included in context value
  const value: LearningContextType = {
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
    recommendedLessons, // FIXED: Added missing property
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
    getNextLesson,
    checkUnlockRequirements,
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

// Alias for compatibility
export const useLessonContext = useLearning;