import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LearningContextType, Lesson, SkillTree, LessonState, LearningProgress } from '../types';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { progressTracker } from '../engines/learning/ProgressTracker';
import { errorHandler } from '../engines/core/ErrorHandler';

interface LearningProviderProps {
  children: ReactNode;
}

const LearningContext = createContext<LearningContextType | null>(null);

export function LearningProvider({ children }: LearningProviderProps) {
  // Core state
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  const [lessonState, setLessonState] = useState<LessonState | null>(null);
  const [isLoadingLesson, setIsLoadingLesson] = useState(false);
  
  // Skill trees and lessons
  const [skillTrees, setSkillTrees] = useState<SkillTree[]>([]);
  const [availableLessons, setAvailableLessons] = useState<Lesson[]>([]);
  const [unlockedLessons, setUnlockedLessons] = useState<string[]>([]);
  
  // Progress tracking
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // Recommendations and insights
  const [recommendedLesson, setRecommendedLesson] = useState<Lesson | null>(null);
  const [recommendedLessons, setRecommendedLessons] = useState<Lesson[]>([]);
  const [insights, setInsights] = useState<Array<{
    id: string;
    type: 'improvement' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    actionable: boolean;
  }>>([]);
  
  // Skill tree navigation
  const [currentSkillTree, setCurrentSkillTree] = useState<SkillTree | null>(null);

  // Initialize learning system
  useEffect(() => {
    initializeLearningSystem();
  }, []);

  const initializeLearningSystem = async () => {
    try {
      console.log('🎓 Initializing learning system...');
      
      // Initialize managers
      await skillTreeManager.initialize();
      await lessonEngine.initialize();
      await progressTracker.initialize();
      
      // Load skill trees
      const trees = await skillTreeManager.getSkillTrees();
      setSkillTrees(trees);
      
      // Load available lessons
      const lessons = await skillTreeManager.getAllLessons();
      setAvailableLessons(lessons);
      
      // Load progress
      const progress = progressTracker.getProgress();
      if (progress) {
        setLearningProgress(progress);
        setCompletedLessons(progress.completedLessons);
        setCurrentStreak(progress.currentStreak);
      }
      
      // Update recommendations
      updateRecommendations();
      
      // Generate insights
      generateInsights();
      
      console.log('✅ Learning system initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize learning system:', error);
      errorHandler.handleError(
        errorHandler.createError('LEARNING_INIT_ERROR', 'Failed to initialize learning system', 'high', error)
      );
    }
  };

  const updateRecommendations = async () => {
    try {
      console.log('🎯 Updating lesson recommendations...');
      
      const recommendations = progressTracker.getRecommendedLessons(5);
      const recommendedLessonObjects = recommendations.map(id => 
        availableLessons.find(lesson => lesson.id === id)
      ).filter(Boolean) as Lesson[];
      
      setRecommendedLessons(recommendedLessonObjects);
      setRecommendedLesson(recommendedLessonObjects[0] || null);
      
      console.log(`✅ Updated recommendations: ${recommendedLessonObjects.length} lessons`);
    } catch (error) {
      console.error('❌ Failed to update recommendations:', error);
    }
  };

  const generateInsights = async () => {
    try {
      console.log('💡 Generating learning insights...');
      
      const progressInsights = progressTracker.getProgressInsights();
      const formattedInsights = progressInsights.map(insight => ({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: insight.type as 'improvement' | 'achievement' | 'suggestion',
        title: insight.title,
        description: insight.message,
        actionable: insight.priority === 'high',
      }));
      
      setInsights(formattedInsights);
      
      console.log(`✅ Generated ${formattedInsights.length} insights`);
    } catch (error) {
      console.error('❌ Failed to generate insights:', error);
    }
  };

  // Lesson management functions
  const startLesson = async (lesson: Lesson): Promise<void> => {
    try {
      setIsLoadingLesson(true);
      
      // Start lesson in engine
      await lessonEngine.startLesson(lesson.id);
      
      // Update state
      setCurrentLesson(lesson);
      setLessonState({
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
      });
      
      console.log('🎓 Lesson started:', lesson.id);
    } catch (error) {
      console.error('❌ Failed to start lesson:', error);
      throw error;
    } finally {
      setIsLoadingLesson(false);
    }
  };

  const pauseLesson = async (): Promise<void> => {
    if (!currentLesson || !lessonState) return;
    
    try {
      await lessonEngine.pauseLesson(currentLesson.id);
      setLessonState({
        ...lessonState,
        isPaused: true,
        pausedAt: new Date(),
      });
      
      console.log('⏸️ Lesson paused:', currentLesson.id);
    } catch (error) {
      console.error('❌ Failed to pause lesson:', error);
      throw error;
    }
  };

  const resumeLesson = async (): Promise<void> => {
    if (!currentLesson || !lessonState) return;
    
    try {
      await lessonEngine.resumeLesson(currentLesson.id);
      setLessonState({
        ...lessonState,
        isPaused: false,
        pausedAt: undefined,
      });
      
      console.log('▶️ Lesson resumed:', currentLesson.id);
    } catch (error) {
      console.error('❌ Failed to resume lesson:', error);
      throw error;
    }
  };

  const completeLesson = async (score: number = 100): Promise<void> => {
    if (!currentLesson) return;
    
    try {
      // Complete lesson in progress tracker
      await progressTracker.completeLesson(currentLesson.id, score);
      
      // Update completed lessons
      if (!completedLessons.includes(currentLesson.id)) {
        setCompletedLessons(prev => [...prev, currentLesson.id]);
      }
      
      // Clear current lesson
      setCurrentLesson(null);
      setLessonState(null);
      
      // Update recommendations
      await updateRecommendations();
      
      console.log('✅ Lesson completed:', currentLesson.id, { score });
    } catch (error) {
      console.error('❌ Failed to complete lesson:', error);
      throw error;
    }
  };

  const exitLesson = async (): Promise<void> => {
    if (!currentLesson) return;
    
    try {
      // Save progress before exiting
      if (lessonState) {
        await lessonEngine.saveProgress(currentLesson.id, lessonState);
      }
      
      // Clear current lesson
      setCurrentLesson(null);
      setLessonState(null);
      
      console.log('🚪 Lesson exited:', currentLesson.id);
    } catch (error) {
      console.error('❌ Failed to exit lesson:', error);
      throw error;
    }
  };

  const updateProgress = async (stepIndex: number, completed: boolean): Promise<void> => {
    if (!lessonState) return;
    
    try {
      const updatedState = { ...lessonState };
      
      if (completed && !updatedState.practiceProgress.completedSteps.includes(stepIndex)) {
        updatedState.practiceProgress.completedSteps.push(stepIndex);
        updatedState.practiceProgress.currentStep = Math.min(
          stepIndex + 1,
          currentLesson?.practiceContent.instructions.length || 0
        );
      }
      
      // Calculate overall progress
      const totalSteps = (currentLesson?.theoryContent.segments.length || 0) + 
                        (currentLesson?.practiceContent.instructions.length || 0);
      const completedSteps = updatedState.theoryProgress.completedSegments.length + 
                           updatedState.practiceProgress.completedSteps.length;
      updatedState.overallProgress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
      
      setLessonState(updatedState);
      
      console.log('📈 Progress updated:', { stepIndex, completed, progress: updatedState.overallProgress });
    } catch (error) {
      console.error('❌ Failed to update progress:', error);
      throw error;
    }
  };

  const addHint = (hint: string): void => {
    if (!lessonState) return;
    
    setLessonState({
      ...lessonState,
      practiceProgress: {
        ...lessonState.practiceProgress,
        hints: [...lessonState.practiceProgress.hints, hint],
      },
    });
    
    console.log('💡 Hint added:', hint);
  };

  const validateStep = async (stepIndex: number, userInput: any): Promise<boolean> => {
    if (!currentLesson) return false;
    
    try {
      const instruction = currentLesson.practiceContent.instructions[stepIndex];
      if (!instruction?.validation) return true;
      
      // This would implement actual validation logic
      // For now, return true as placeholder
      const isValid = true;
      
      if (isValid) {
        await updateProgress(stepIndex, true);
      }
      
      console.log('✅ Step validated:', { stepIndex, isValid });
      return isValid;
    } catch (error) {
      console.error('❌ Failed to validate step:', error);
      return false;
    }
  };

  // Utility functions
  const getLesson = (lessonId: string): Lesson | null => {
    return availableLessons.find(lesson => lesson.id === lessonId) || null;
  };

  // FIXED: Added missing getLessonProgress method
  const getLessonProgress = (lessonId: string): number => {
    if (currentLesson?.id === lessonId && lessonState) {
      return lessonState.overallProgress;
    }
    
    // Check if lesson is completed
    if (completedLessons.includes(lessonId)) {
      return 100;
    }
    
    // Return 0 for lessons not started
    return 0;
  };

  const getNextLesson = (): Lesson | null => {
    if (!currentSkillTree) return recommendedLesson;
    
    const skillTreeLessons = currentSkillTree.lessons.sort((a, b) => a.order - b.order);
    const nextLesson = skillTreeLessons.find(lesson => !completedLessons.includes(lesson.id));
    
    return nextLesson || null;
  };

  const checkUnlockRequirements = (lessonId: string): boolean => {
    const lesson = getLesson(lessonId);
    if (!lesson) return false;
    
    // Check if all prerequisites are completed
    const allPrerequisitesCompleted = lesson.prerequisites.every(prereqId => 
      completedLessons.includes(prereqId)
    );
    
    return allPrerequisitesCompleted;
  };

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
    
    // Actions
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
    getLessonProgress, // FIXED: Now included in the context value
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