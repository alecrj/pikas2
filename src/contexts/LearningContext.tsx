// COMPLETE FIX for src/contexts/LearningContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Lesson, 
  LessonState, 
  LessonProgress, 
  SkillTree, 
  LearningProgress 
} from '../types';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { progressTracker } from '../engines/learning/ProgressTracker';
import { dataManager } from '../engines/core/DataManager';
import { errorHandler } from '../engines/core/ErrorHandler';

/**
 * Learning Context - Manages lesson delivery, progress, and skill development
 * Provides seamless theory-to-practice learning experience
 */

export interface LearningContextType {
  // Current lesson state
  currentLesson: Lesson | null;
  lessonState: LessonState | null;
  isLoadingLesson: boolean;
  
  // Available content
  skillTrees: SkillTree[];
  availableLessons: Lesson[];
  unlockedLessons: string[];
  
  // Progress tracking
  learningProgress: LearningProgress | null;
  completedLessons: string[];
  currentStreak: number;
  
  // FIXED: Added missing properties from error logs
  recommendedLesson: Lesson | null;
  insights: Array<{
    id: string;
    type: 'improvement' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    actionable: boolean;
  }>;
  
  // FIXED: Added missing currentSkillTree properties
  currentSkillTree: SkillTree | null;
  setCurrentSkillTree: (skillTree: SkillTree | null) => void;
  
  // Lesson control
  startLesson: (lesson: Lesson) => Promise<void>;
  pauseLesson: () => Promise<void>;
  resumeLesson: () => Promise<void>;
  completeLesson: (score?: number) => Promise<void>;
  exitLesson: () => Promise<void>;
  
  // Progress management
  updateProgress: (stepIndex: number, completed: boolean) => Promise<void>;
  addHint: (hint: string) => void;
  validateStep: (stepIndex: number, userInput: any) => Promise<boolean>;
  
  // Content access
  getLesson: (lessonId: string) => Lesson | null;
  getNextLesson: () => Lesson | null;
  checkUnlockRequirements: (lessonId: string) => boolean;
}

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
  
  // FIXED: Added missing state properties
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);
  const [insights, setInsights] = useState<Array<{
    id: string;
    type: 'improvement' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    actionable: boolean;
  }>>([]);

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

  const initializeLearning = async () => {
    try {
      // Load skill trees and lessons
      const trees = skillTreeManager.getAllSkillTrees();
      setSkillTrees(trees);
      
      // FIXED: Use getAllLessons method that we added
      const lessons = skillTreeManager.getAllLessons();
      setAvailableLessons(lessons);
      
      // Load user progress
      const progress = progressTracker.getProgress();
      if (progress) {  // FIXED: Null check
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      }
      
      // Determine unlocked lessons
      const unlocked = skillTreeManager.getUnlockedLessons();
      setUnlockedLessons(unlocked);
      
      // Set default skill tree
      if (trees.length > 0) {
        setCurrentSkillTree(trees[0]);
      }
      
      // Set recommendations and insights
      updateRecommendations();
      generateInsights();
      
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LEARNING_INIT_ERROR', 'Failed to initialize learning system', 'medium', error)
      );
    }
  };

  // FIXED: Added recommendation logic
  const updateRecommendations = () => {
    try {
      const recommended = progressTracker.getRecommendedLessons(1);
      if (recommended.length > 0) {
        const lesson = skillTreeManager.getLesson(recommended[0]);
        setRecommendedLesson(lesson);
      } else {
        setRecommendedLesson(null);
      }
    } catch (error) {
      console.warn('Failed to update recommendations:', error);
    }
  };

  // FIXED: Added insights generation
  const generateInsights = () => {
    try {
      const newInsights = [];
      
      // Progress-based insights
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
      
      // Recommendation insights
      if (recommendedLesson) {
        newInsights.push({
          id: 'next_lesson',
          type: 'suggestion' as const,
          title: 'Ready for Next Challenge',
          description: `Try "${recommendedLesson.title}" to continue your learning journey`,
          actionable: true,
        });
      }
      
      setInsights(newInsights);
    } catch (error) {
      console.warn('Failed to generate insights:', error);
    }
  };

  const startLesson = async (lesson: Lesson) => {
    try {
      setIsLoadingLesson(true);
      
      // Create new lesson state
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
      
      // Save state
      await dataManager.save(`lesson_state_${lesson.id}`, newLessonState);
      
      // Initialize lesson engine - FIXED: Single parameter
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
      // Mark lesson as completed - FIXED: Use completeLesson method
      await progressTracker.completeLesson(currentLesson.id, score);
      
      // Update progress
      const progress = progressTracker.getProgress();
      if (progress) {  // FIXED: Null check
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
      }
      
      // Clear current lesson
      setCurrentLesson(null);
      setLessonState(null);
      
      // Update recommendations
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
      // Save current state if needed
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
    if (!lessonState) return;
    
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
      
      // Calculate overall progress
      const totalSteps = currentLesson?.practiceContent.instructions.length || 1;
      updatedState.overallProgress = (updatedState.practiceProgress.completedSteps.length / totalSteps) * 100;
      
      setLessonState(updatedState);
      
      if (currentLesson) {
        await dataManager.save(`lesson_state_${currentLesson.id}`, updatedState);
      }
      
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

  const validateStep = async (stepIndex: number, userInput: any): Promise<boolean> => {
    if (!currentLesson) return false;
    
    try {
      // FIXED: Use validateStep method with correct parameters
      return await lessonEngine.validateStep(currentLesson, stepIndex, userInput);
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

  const value: LearningContextType = {
    // Current lesson state
    currentLesson,
    lessonState,
    isLoadingLesson,
    
    // Available content
    skillTrees,
    availableLessons,
    unlockedLessons,
    
    // Progress tracking
    learningProgress,
    completedLessons,
    currentStreak,
    
    // FIXED: Added missing properties
    recommendedLesson,
    insights,
    currentSkillTree,
    setCurrentSkillTree,
    
    // Lesson control
    startLesson,
    pauseLesson,
    resumeLesson,
    completeLesson,
    exitLesson,
    
    // Progress management
    updateProgress,
    addHint,
    validateStep,
    
    // Content access
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

// FIXED: Added alias for compatibility
export const useLessonContext = useLearning;