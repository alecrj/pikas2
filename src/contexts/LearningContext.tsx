import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  SkillTree, 
  Lesson, 
  LearningProgress, 
  LessonProgress,
  TheorySegment,
  PracticeInstruction,
  Assessment,
  LessonState
} from '../types';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { dataManager } from '../engines/core/DataManager';
import { errorHandler } from '../engines/core/ErrorHandler';
import { eventBus } from '../engines/core/EventBus';

interface LearningContextType {
  currentSkillTree: SkillTree | null;
  currentLesson: Lesson | null;
  lessonState: LessonState | null;
  learningProgress: LearningProgress | null;
  isLoading: boolean;
  
  // Actions
  setCurrentSkillTree: (tree: SkillTree) => void;
  startLesson: (lesson: Lesson) => Promise<void>;
  completeTheorySegment: (segmentIndex: number) => void;
  completePracticeStep: (stepIndex: number, score: number) => void;
  completeLesson: (assessmentScore: number) => Promise<void>;
  pauseLesson: () => Promise<void>;
  resumeLesson: () => Promise<void>;
  resetLesson: () => void;
  
  // Progress tracking
  getLessonProgress: (lessonId: string) => LessonProgress | null;
  getSkillTreeProgress: (treeId: string) => number;
  getTotalProgress: () => number;
  
  // Learning helpers
  getNextLesson: () => Lesson | null;
  getAvailableLessons: (treeId: string) => Lesson[];
  checkPrerequisites: (lesson: Lesson) => boolean;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonState, setLessonState] = useState<LessonState | null>(null);
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLearningProgress();
  }, []);

  const loadLearningProgress = async () => {
    try {
      setIsLoading(true);
      const progress = await dataManager.getLearningProgress();
      setLearningProgress(progress);
      
      // Set default skill tree if none selected
      const trees = skillTreeManager.getAllSkillTrees();
      if (trees.length > 0 && !currentSkillTree) {
        setCurrentSkillTree(trees[0]);
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LEARNING_LOAD_ERROR', 'Failed to load learning progress', 'medium', error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startLesson = async (lesson: Lesson) => {
    try {
      setCurrentLesson(lesson);
      
      // Check if resuming a paused lesson
      const savedState = await dataManager.load(`lesson_state_${lesson.id}`);
      if (savedState) {
        setLessonState(savedState);
        eventBus.emit('lesson_resumed', { lessonId: lesson.id });
      } else {
        // Initialize new lesson state
        const newState: LessonState = {
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
        setLessonState(newState);
        eventBus.emit('lesson_started', { lessonId: lesson.id });
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_START_ERROR', 'Failed to start lesson', 'high', error)
      );
    }
  };

  const completeTheorySegment = (segmentIndex: number) => {
    if (!lessonState || !currentLesson) return;

    const updatedState = {
      ...lessonState,
      theoryProgress: {
        ...lessonState.theoryProgress,
        currentSegment: segmentIndex + 1,
        completedSegments: [...lessonState.theoryProgress.completedSegments, segmentIndex],
      },
    };

    // Calculate overall progress
    const theoryCompletion = updatedState.theoryProgress.completedSegments.length / 
                           currentLesson.theoryContent.segments.length;
    updatedState.overallProgress = theoryCompletion * 0.3; // Theory is 30% of lesson

    setLessonState(updatedState);
    eventBus.emit('theory_segment_completed', { 
      lessonId: currentLesson.id, 
      segmentIndex,
      progress: updatedState.overallProgress
    });
  };

  const completePracticeStep = (stepIndex: number, score: number) => {
    if (!lessonState || !currentLesson) return;

    const attempts = lessonState.practiceProgress.attempts[stepIndex] || [];
    const updatedState = {
      ...lessonState,
      practiceProgress: {
        ...lessonState.practiceProgress,
        currentStep: stepIndex + 1,
        completedSteps: score >= 0.7 
          ? [...lessonState.practiceProgress.completedSteps, stepIndex]
          : lessonState.practiceProgress.completedSteps,
        attempts: {
          ...lessonState.practiceProgress.attempts,
          [stepIndex]: [...attempts, { score, timestamp: new Date() }],
        },
      },
    };

    // Calculate overall progress
    const theoryCompletion = lessonState.theoryProgress.completedSegments.length / 
                           currentLesson.theoryContent.segments.length;
    const practiceCompletion = updatedState.practiceProgress.completedSteps.length / 
                             currentLesson.practiceContent.instructions.length;
    updatedState.overallProgress = (theoryCompletion * 0.3) + (practiceCompletion * 0.5);

    setLessonState(updatedState);
    eventBus.emit('practice_step_completed', { 
      lessonId: currentLesson.id, 
      stepIndex,
      score,
      progress: updatedState.overallProgress
    });
  };

  const completeLesson = async (assessmentScore: number) => {
    if (!currentLesson || !lessonState) return;

    try {
      // Calculate XP earned
      const baseXP = currentLesson.xpReward;
      const bonusXP = assessmentScore >= 0.9 ? Math.floor(baseXP * 0.2) : 0;
      const totalXP = baseXP + bonusXP;

      // Complete the lesson in skill tree manager
      await skillTreeManager.completeLesson(currentLesson.id, totalXP);

      // Save lesson progress
      const lessonProgress: LessonProgress = {
        lessonId: currentLesson.id,
        completed: true,
        completedAt: new Date(),
        bestScore: assessmentScore,
        attempts: 1,
        totalTimeSpent: lessonState.theoryProgress.timeSpent + lessonState.practiceProgress.timeSpent,
        xpEarned: totalXP,
      };

      // Update learning progress
      if (learningProgress) {
        const updatedProgress = {
          ...learningProgress,
          completedLessons: [...learningProgress.completedLessons, currentLesson.id],
          totalXP: learningProgress.totalXP + totalXP,
        };
        await dataManager.saveLearningProgress(updatedProgress);
        setLearningProgress(updatedProgress);
      }

      // Clear lesson state
      await dataManager.remove(`lesson_state_${currentLesson.id}`);
      
      eventBus.emit('lesson_completed', {
        lessonId: currentLesson.id,
        score: assessmentScore,
        xpEarned: totalXP,
      });

      // Reset current lesson
      setCurrentLesson(null);
      setLessonState(null);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_COMPLETE_ERROR', 'Failed to complete lesson', 'high', error)
      );
    }
  };

  const pauseLesson = async () => {
    if (!lessonState || !currentLesson) return;

    try {
      const pausedState = {
        ...lessonState,
        isPaused: true,
        pausedAt: new Date(),
      };
      
      await dataManager.save(`lesson_state_${currentLesson.id}`, pausedState);
      setLessonState(pausedState);
      
      eventBus.emit('lesson_paused', { lessonId: currentLesson.id });
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_PAUSE_ERROR', 'Failed to pause lesson', 'medium', error)
      );
    }
  };

  const resumeLesson = async () => {
    if (!lessonState || !currentLesson) return;

    const resumedState = {
      ...lessonState,
      isPaused: false,
      pausedAt: undefined,
    };
    
    setLessonState(resumedState);
    eventBus.emit('lesson_resumed', { lessonId: currentLesson.id });
  };

  const resetLesson = () => {
    if (!currentLesson) return;

    const newState: LessonState = {
      lessonId: currentLesson.id,
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
    
    setLessonState(newState);
    eventBus.emit('lesson_reset', { lessonId: currentLesson.id });
  };

  const getLessonProgress = (lessonId: string): LessonProgress | null => {
    // Implementation would fetch from saved progress
    return null;
  };

  const getSkillTreeProgress = (treeId: string): number => {
    if (!learningProgress) return 0;
    
    const tree = skillTreeManager.getSkillTree(treeId);
    if (!tree) return 0;
    
    const completedInTree = tree.lessons.filter(lesson => 
      learningProgress.completedLessons.includes(lesson.id)
    ).length;
    
    return (completedInTree / tree.lessons.length) * 100;
  };

  const getTotalProgress = (): number => {
    if (!learningProgress) return 0;
    
    const allTrees = skillTreeManager.getAllSkillTrees();
    const totalLessons = allTrees.reduce((sum, tree) => sum + tree.lessons.length, 0);
    const completedLessons = learningProgress.completedLessons.length;
    
    return totalLessons > 0 ? (completedLessons / totalLessons) * 100 : 0;
  };

  const getNextLesson = (): Lesson | null => {
    return skillTreeManager.getRecommendedNextLesson();
  };

  const getAvailableLessons = (treeId: string): Lesson[] => {
    return skillTreeManager.getAvailableLessons(treeId);
  };

  const checkPrerequisites = (lesson: Lesson): boolean => {
    const availableLessons = skillTreeManager.getAvailableLessons(lesson.skillTreeId);
    return availableLessons.includes(lesson);
  };

  const value: LearningContextType = {
    currentSkillTree,
    currentLesson,
    lessonState,
    learningProgress,
    isLoading,
    setCurrentSkillTree,
    startLesson,
    completeTheorySegment,
    completePracticeStep,
    completeLesson,
    pauseLesson,
    resumeLesson,
    resetLesson,
    getLessonProgress,
    getSkillTreeProgress,
    getTotalProgress,
    getNextLesson,
    getAvailableLessons,
    checkPrerequisites,
  };

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
}