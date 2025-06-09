// src/engines/learning/index.ts
export { SkillTreeManager, skillTreeManager } from './SkillTreeManager';
export { LessonEngine, lessonEngine } from './LessonEngine';
export { ProgressTracker, progressTracker } from './ProgressTracker';

export async function initializeLearningEngine(): Promise<void> {
  try {
    // Initialize lesson engine
    await lessonEngine.initialize();
    
    console.log('Learning engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize learning engine:', error);
    throw error;
  }
}