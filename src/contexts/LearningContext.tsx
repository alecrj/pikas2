import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  Lesson, 
  SkillTree, 
  LearningProgress,
  TheorySegment,
  PracticeInstruction,
  Assessment
} from '../types';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { progressTracker } from '../engines/learning/ProgressTracker';
import { errorHandler } from '../engines/core/ErrorHandler';
import * as Haptics from 'expo-haptics';

/**
 * Learning Context - Manages lesson delivery and skill progression
 * Central state for all learning-related features
 */

interface LearningContextValue {
  // Current lesson state
  currentLesson: Lesson | null;
  lessonPhase: 'not_started' | 'theory' | 'ready_for_practice' | 'practice' | 
               'ready_for_assessment' | 'completed' | 'paused';
  theoryProgress: number; // 0-100
  practiceProgress: number; // 0-100
  currentInstruction: number;
  
  // Skill trees
  skillTrees: SkillTree[];
  availableSkillTrees: SkillTree[];
  currentSkillTree: SkillTree | null;
  
  // Available lessons
  availableLessons: Lesson[];
  recommendedLesson: Lesson | null;
  
  // Progress tracking
  overallProgress: {
    totalLessonsCompleted: number;
    totalLessonsAvailable: number;
    totalXpEarned: number;
    completionPercentage: number;
  };
  
  // Learning insights
  insights: Array<{
    type: 'achievement' | 'milestone' | 'recommendation' | 'motivation' | 'skill';
    title: string;
    message: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  
  // Real-time guidance
  currentGuidance: {
    type: 'none' | 'hint' | 'correction' | 'encouragement';
    message?: string;
    showGuide?: boolean;
  };
  
  // Actions
  startLesson: (lessonId: string) => Promise<void>;
  progressTheory: (segmentIndex: number) => void;
  startPractice: () => void;
  progressPractice: (instructionIndex: number, drawingData: any) => void;
  completeLesson: (assessmentData: any) => Promise<any>;
  pauseLesson: () => void;
  resumeLesson: () => void;
  skipToNextInstruction: () => void;
  requestHint: () => void;
  
  // Skill tree navigation
  selectSkillTree: (skillTreeId: string) => void;
  unlockLesson: (lessonId: string) => boolean;
  
  // Progress tracking
  checkDrawingProgress: (drawingData: any) => void;
  getProgressStats: () => any;
}

const LearningContext = createContext<LearningContextValue | undefined>(undefined);

export const LearningProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonState, setLessonState] = useState<any>(null);
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [overallProgress, setOverallProgress] = useState({
    totalLessonsCompleted: 0,
    totalLessonsAvailable: 0,
    totalXpEarned: 0,
    completionPercentage: 0,
  });
  const [insights, setInsights] = useState<any[]>([]);
  const [currentGuidance, setCurrentGuidance] = useState<any>({ type: 'none' });

  // Initialize learning system
  useEffect(() => {
    initializeLearning();
  }, []);

  // Subscribe to lesson state updates
  useEffect(() => {
    const unsubscribeLesson = lessonEngine.subscribeToLessonState((state) => {
      setLessonState(state);
    });

    const unsubscribeProgress = skillTreeManager.subscribeToProgress(() => {
      updateAvailableLessons();
      updateOverallProgress();
    });

    return () => {
      unsubscribeLesson();
      unsubscribeProgress();
    };
  }, [currentSkillTree]);

  // Update insights periodically
  useEffect(() => {
    const interval = setInterval(() => {
      updateInsights();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const initializeLearning = async () => {
    try {
      // Load all skill trees
      const trees = skillTreeManager.getAllSkillTrees();
      setSkillTrees(trees);
      
      // Select first available skill tree
      const availableTrees = skillTreeManager.getAvailableSkillTrees();
      if (availableTrees.length > 0) {
        setCurrentSkillTree(availableTrees[0]);
      }
      
      // Update progress
      updateOverallProgress();
      updateInsights();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LEARNING_INIT_ERROR', 'Failed to initialize learning system', 'medium', error)
      );
    }
  };

  const updateAvailableLessons = () => {
    if (!currentSkillTree) return;
    
    const lessons = skillTreeManager.getAvailableLessons(currentSkillTree.id);
    setAvailableLessons(lessons);
  };

  const updateOverallProgress = () => {
    const progress = skillTreeManager.getOverallProgress();
    setOverallProgress(progress);
  };

  const updateInsights = () => {
    const newInsights = progressTracker.getProgressInsights();
    setInsights(newInsights);
  };

  const startLesson = async (lessonId: string) => {
    try {
      const lesson = skillTreeManager.getLesson(lessonId);
      if (!lesson) {
        throw new Error('Lesson not found');
      }
      
      await lessonEngine.startLesson(lesson);
      setCurrentLesson(lesson);
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_START_ERROR', 'Failed to start lesson', 'medium', error)
      );
      throw error;
    }
  };

  const progressTheory = (segmentIndex: number) => {
    lessonEngine.progressTheory(segmentIndex);
  };

  const startPractice = () => {
    lessonEngine.startPractice();
    
    // Haptic feedback for phase transition
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const progressPractice = (instructionIndex: number, drawingData: any) => {
    lessonEngine.progressPractice(instructionIndex, drawingData);
  };

  const completeLesson = async (assessmentData: any) => {
    try {
      const result = await lessonEngine.completeLesson(assessmentData);
      
      if (currentLesson) {
        await skillTreeManager.completeLesson(currentLesson.id, result.xpEarned);
        await progressTracker.updateDailyProgress(result.xpEarned);
      }
      
      // Celebration haptics
      if (result.passed) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Clear current lesson
      setCurrentLesson(null);
      
      // Update progress
      updateOverallProgress();
      updateInsights();
      
      return result;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('LESSON_COMPLETE_ERROR', 'Failed to complete lesson', 'medium', error)
      );
      throw error;
    }
  };

  const pauseLesson = () => {
    lessonEngine.pauseLesson();
  };

  const resumeLesson = () => {
    lessonEngine.resumeLesson();
  };

  const skipToNextInstruction = () => {
    if (!lessonState || !currentLesson) return;
    
    const nextInstruction = lessonState.currentInstruction + 1;
    if (nextInstruction < currentLesson.practiceContent.instructions.length) {
      progressPractice(nextInstruction, {});
    }
  };

  const requestHint = () => {
    if (!currentLesson || !lessonState) return;
    
    const instruction = lessonState.currentInstruction;
    const hints = currentLesson.practiceContent.hints;
    
    // Find appropriate hint
    const hint = hints.find(h => 
      h.triggerCondition === `instruction_${instruction}_request`
    ) || hints[0];
    
    if (hint) {
      setCurrentGuidance({
        type: 'hint',
        message: hint.content,
        showGuide: true,
      });
      
      // Clear guidance after 5 seconds
      setTimeout(() => {
        setCurrentGuidance({ type: 'none' });
      }, 5000);
    }
  };

  const selectSkillTree = (skillTreeId: string) => {
    const tree = skillTreeManager.getSkillTree(skillTreeId);
    if (tree) {
      setCurrentSkillTree(tree);
      updateAvailableLessons();
    }
  };

  const unlockLesson = (lessonId: string): boolean => {
    // Check if lesson can be unlocked
    // This would involve checking prerequisites and requirements
    return false; // Placeholder
  };

  const checkDrawingProgress = (drawingData: any) => {
    const guidance = lessonEngine.checkDrawingProgress(drawingData);
    setCurrentGuidance(guidance);
  };

  const getProgressStats = () => {
    return {
      overall: overallProgress,
      currentLesson: currentLesson ? {
        id: currentLesson.id,
        title: currentLesson.title,
        theoryProgress: lessonState?.theoryProgress || 0,
        practiceProgress: lessonState?.practiceProgress || 0,
      } : null,
      streakStatus: progressTracker.getStreakStatus(),
      dailyProgress: progressTracker.getDailyProgressPercentage(),
    };
  };

  // Computed values
  const lessonPhase = lessonState?.phase || 'not_started';
  const theoryProgress = lessonState?.theoryProgress || 0;
  const practiceProgress = lessonState?.practiceProgress || 0;
  const currentInstruction = lessonState?.currentInstruction || 0;
  const recommendedLesson = skillTreeManager.getRecommendedNextLesson();
  const availableSkillTrees = skillTreeManager.getAvailableSkillTrees();

  const value: LearningContextValue = {
    // Current lesson state
    currentLesson,
    lessonPhase,
    theoryProgress,
    practiceProgress,
    currentInstruction,
    
    // Skill trees
    skillTrees,
    availableSkillTrees,
    currentSkillTree,
    
    // Available lessons
    availableLessons,
    recommendedLesson,
    
    // Progress tracking
    overallProgress,
    
    // Learning insights
    insights,
    
    // Real-time guidance
    currentGuidance,
    
    // Actions
    startLesson,
    progressTheory,
    startPractice,
    progressPractice,
    completeLesson,
    pauseLesson,
    resumeLesson,
    skipToNextInstruction,
    requestHint,
    
    // Skill tree navigation
    selectSkillTree,
    unlockLesson,
    
    // Progress tracking
    checkDrawingProgress,
    getProgressStats,
  };

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
};

export const useLearning = (): LearningContextValue => {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within a LearningProvider');
  }
  return context;
};

// Specific hooks for learning features
export const useCurrentLesson = () => {
  const { 
    currentLesson, 
    lessonPhase, 
    theoryProgress, 
    practiceProgress,
    currentInstruction,
    currentGuidance,
  } = useLearning();
  
  return {
    lesson: currentLesson,
    phase: lessonPhase,
    theoryProgress,
    practiceProgress,
    currentInstruction,
    guidance: currentGuidance,
  };
};

export const useSkillTrees = () => {
  const {
    skillTrees,
    availableSkillTrees,
    currentSkillTree,
    selectSkillTree,
  } = useLearning();
  
  return {
    all: skillTrees,
    available: availableSkillTrees,
    current: currentSkillTree,
    select: selectSkillTree,
  };
};

export const useLessonList = () => {
  const {
    availableLessons,
    recommendedLesson,
    startLesson,
    unlockLesson,
  } = useLearning();
  
  return {
    available: availableLessons,
    recommended: recommendedLesson,
    start: startLesson,
    unlock: unlockLesson,
  };
};

export const useLearningProgress = () => {
  const {
    overallProgress,
    insights,
    getProgressStats,
  } = useLearning();
  
  return {
    overall: overallProgress,
    insights,
    stats: getProgressStats(),
  };
};