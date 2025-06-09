// Learning engine exports and initialization
export { SkillTreeManager, skillTreeManager } from './SkillTreeManager';
export { LessonEngine, lessonEngine } from './LessonEngine';
export { ProgressTracker, progressTracker } from './ProgressTracker';

// FIXED: Added missing initialization function
export const initializeLearningEngine = async (): Promise<void> => {
  try {
    // Initialize skill tree manager
    const { skillTreeManager } = await import('./SkillTreeManager');
    await skillTreeManager.initialize();
    
    // Initialize lesson engine
    const { lessonEngine } = await import('./LessonEngine');
    await lessonEngine.initialize();
    
    // Initialize progress tracker
    const { progressTracker } = await import('./ProgressTracker');
    await progressTracker.initialize();
    
    console.log('Learning engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize learning engine:', error);
    throw error;
  }
};

// Additional learning system helpers
export const initializeContent = async (): Promise<void> => {
  try {
    const { skillTreeManager } = await import('./SkillTreeManager');
    await skillTreeManager.loadContent();
    console.log('Learning content initialized');
  } catch (error) {
    console.error('Failed to initialize learning content:', error);
    throw error;
  }
};

export const initializeProgress = async (): Promise<void> => {
  try {
    const { progressTracker } = await import('./ProgressTracker');
    await progressTracker.loadProgress();
    console.log('Progress tracking initialized');
  } catch (error) {
    console.error('Failed to initialize progress tracking:', error);
    throw error;
  }
};