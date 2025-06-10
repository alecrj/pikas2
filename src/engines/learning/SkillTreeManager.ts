import { 
  Lesson, 
  SkillTree, 
  LearningProgress, 
  SkillTreeProgress,
  ValidationRule,
  TheoryContent,
  PracticeContent,
  Assessment
} from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';
import { progressionSystem } from '../user/ProgressionSystem';

/**
 * Skill Tree Manager - Handles learning paths, lesson progression, and skill development
 * Core system for structured art education with adaptive learning paths
 */
export class SkillTreeManager {
  private static instance: SkillTreeManager;
  private skillTrees: Map<string, SkillTree> = new Map();
  private userProgress: LearningProgress | null = null;
  private progressListeners: Set<(progress: LearningProgress) => void> = new Set();

  private constructor() {
    this.initializeSkillTrees();
    this.loadUserProgress();
  }

  public static getInstance(): SkillTreeManager {
    if (!SkillTreeManager.instance) {
      SkillTreeManager.instance = new SkillTreeManager();
    }
    return SkillTreeManager.instance;
  }

  private async loadUserProgress(): Promise<void> {
    try {
      const progress = await dataManager.get<LearningProgress>('learning_progress');
      if (progress) {
        this.userProgress = progress;
        this.notifyProgressListeners();
      } else {
        // Initialize new progress with all required properties
        this.userProgress = {
          userId: 'current_user',
          currentLevel: 1,
          totalXP: 0,
          skillTrees: [],
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: new Date().toISOString(),
          achievements: [],
          preferences: {
            dailyGoal: 100,
            reminderTime: '18:00',
            difficulty: 'adaptive',
          },
          dailyGoal: 100,
          dailyProgress: 0,
          completedLessons: [],
        };
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('PROGRESS_LOAD_ERROR', 'Failed to load learning progress', 'medium', error)
      );
    }
  }

  private initializeSkillTrees(): void {
    // Initialize the fundamentals skill tree with 15 lessons
    const fundamentalsTree: SkillTree = {
      id: 'fundamentals',
      name: 'Drawing Fundamentals',
      description: 'Master the essential building blocks of drawing',
      iconUrl: 'skill_tree_fundamentals',
      category: 'fundamentals',
      order: 1,
      prerequisites: [],
      estimatedDuration: 20,
      difficultyLevel: 'beginner',
      progress: 0,
      lessons: this.createFundamentalLessons(),
      totalXP: 2250, // 15 lessons × 150 XP average
      completionPercentage: 0,
    };

    this.skillTrees.set('fundamentals', fundamentalsTree);

    // Future skill trees (placeholders for now)
    const advancedTree: SkillTree = {
      id: 'advanced_techniques',
      name: 'Advanced Techniques',
      description: 'Explore sophisticated drawing methods',
      iconUrl: 'skill_tree_advanced',
      category: 'techniques',
      order: 2,
      prerequisites: ['fundamentals'],
      estimatedDuration: 30,
      difficultyLevel: 'advanced',
      progress: 0,
      lessons: [],
      totalXP: 3000,
      completionPercentage: 0,
    };

    this.skillTrees.set('advanced_techniques', advancedTree);
  }

  private createFundamentalLessons(): Lesson[] {
    const lessons: Lesson[] = [
      // Lesson 1: Lines & Basic Shapes
      {
        id: 'lesson_1_lines_shapes',
        title: 'Lines & Basic Shapes',
        description: 'Master straight lines, curves, and basic geometric shapes',
        type: 'practice',
        skillTree: 'fundamentals',
        order: 1,
        estimatedTime: 8,
        difficulty: 1,
        prerequisites: [],
        objectives: [
          { id: 'obj_1_1', description: 'Draw straight lines with confidence', completed: false, required: true },
          { id: 'obj_1_2', description: 'Create perfect circles and squares', completed: false, required: true },
          { id: 'obj_1_3', description: 'Understand line weight and pressure', completed: false, required: false },
        ],
        theoryContent: {
          segments: [
            {
              id: 'theory_1_1',
              type: 'text',
              content: { text: 'Lines are the foundation of all drawing. In this lesson, you\'ll learn to control your marks and create confident strokes.' },
              duration: 30,
              order: 1,
            },
            {
              id: 'theory_1_2',
              type: 'interactive',
              content: { 
                demo: 'line_drawing',
                title: 'Line Control Exercise',
                instructions: 'Practice drawing straight lines by connecting the dots'
              },
              duration: 60,
              order: 2,
            },
            {
              id: 'theory_1_3',
              type: 'text',
              content: { text: 'Basic shapes - circles, squares, triangles - are building blocks for complex forms. Master these and you can draw anything.' },
              duration: 30,
              order: 3,
            },
          ],
          totalDuration: 2,
          objectives: [
            { id: 'theory_obj_1', description: 'Understand line fundamentals', type: 'primary', required: true },
          ],
        },
        practiceContent: {
          instructions: [
            {
              id: 'practice_1_1',
              text: 'Draw 10 straight horizontal lines using consistent pressure',
              type: 'draw',
              order: 1,
              highlightArea: { x: 100, y: 100, width: 300, height: 50 },
              validation: {
                type: 'line_detection',
                params: { minLines: 10, straightnessThreshold: 0.8 },
                threshold: 0.8,
              },
            },
            {
              id: 'practice_1_2',
              text: 'Draw 5 circles, focusing on closing the shape smoothly',
              type: 'draw',
              order: 2,
              highlightArea: { x: 100, y: 200, width: 300, height: 200 },
              validation: {
                type: 'shape_completion',
                params: { targetShape: 'circle', minShapes: 5 },
                threshold: 0.7,
              },
            },
            {
              id: 'practice_1_3',
              text: 'Create 3 squares with equal sides and sharp corners',
              type: 'draw',
              order: 3,
              highlightArea: { x: 100, y: 450, width: 300, height: 150 },
              validation: {
                type: 'shape-accuracy',
                params: { targetShape: 'square', minShapes: 3 },
                threshold: 0.75,
              },
            },
          ],
          hints: [
            {
              id: 'hint_1_1',
              stepIndex: 0,
              text: 'Keep your wrist stable and move from your shoulder for smoother lines',
              content: 'Keep your wrist stable and move from your shoulder for smoother lines',
              triggerCondition: 'instruction_0_fail',
            },
            {
              id: 'hint_1_2',
              stepIndex: 1,
              text: 'Don\'t worry about perfection - focus on completing the circular motion',
              content: 'Don\'t worry about perfection - focus on completing the circular motion',
              triggerCondition: 'instruction_1_fail',
            },
          ],
          referenceImage: 'lesson_1_reference',
          canvas: {
            width: 1024,
            height: 768,
            backgroundColor: '#ffffff',
          },
          expectedDuration: 5,
        },
        assessment: {
          criteria: [
            {
              id: 'line_quality',
              name: 'Line Quality',
              description: 'Line confidence and consistency',
              weight: 0.4,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
            {
              id: 'shape_accuracy',
              name: 'Shape Accuracy',
              description: 'Accuracy of basic shapes',
              weight: 0.4,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
            {
              id: 'completion',
              name: 'Completion',
              description: 'Completed all exercises',
              weight: 0.2,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          maxAttempts: 3,
          bonusObjectives: [
            {
              id: 'bonus_speed',
              description: 'Complete in under 5 minutes',
              xpBonus: 25,
            },
          ],
        },
        rewards: {
          xp: 100,
          achievements: ['first_lesson'],
          unlocks: ['lesson_2_construction'],
        },
        status: 'available',
        progress: 0,
        attempts: 0,
        timeSpent: 0,
        // Backward compatibility
        duration: 8,
        xpReward: 100,
        skillTreeId: 'fundamentals',
        unlockRequirements: [],
        tags: ['basics', 'lines', 'shapes', 'foundation'],
      },

      // Lesson 2: Shape Construction
      {
        id: 'lesson_2_construction',
        title: 'Shape Construction',
        description: 'Build complex forms using basic shapes as building blocks',
        type: 'practice',
        skillTree: 'fundamentals',
        order: 2,
        estimatedTime: 10,
        difficulty: 2,
        prerequisites: ['lesson_1_lines_shapes'],
        objectives: [
          { id: 'obj_2_1', description: 'Combine basic shapes to create complex forms', completed: false, required: true },
          { id: 'obj_2_2', description: 'Draw a simple apple using construction', completed: false, required: true },
          { id: 'obj_2_3', description: 'Understand proportional relationships', completed: false, required: false },
        ],
        theoryContent: {
          segments: [
            {
              id: 'theory_2_1',
              type: 'text',
              content: { text: 'Everything you see can be broken down into basic shapes. An apple is a circle with modifications. A house is rectangles and triangles.' },
              duration: 45,
              order: 1,
            },
            {
              id: 'theory_2_2',
              type: 'interactive',
              content: { 
                demo: 'shape_breakdown',
                title: 'See the Shapes',
                instructions: 'Look at this apple and identify the basic shapes within it'
              },
              duration: 90,
              order: 2,
            },
          ],
          totalDuration: 3,
          objectives: [
            { id: 'theory_obj_2', description: 'Understand shape construction', type: 'primary', required: true },
          ],
        },
        practiceContent: {
          instructions: [
            {
              id: 'practice_2_1',
              text: 'Start with a circle for the basic apple shape',
              type: 'draw',
              order: 1,
              highlightArea: { x: 150, y: 150, width: 200, height: 200 },
              validation: {
                type: 'shape_construction',
                params: { requiredShape: 'circle', stage: 'base' },
                threshold: 0.7,
              },
            },
            {
              id: 'practice_2_2',
              text: 'Add the apple\'s indent at the top with curved lines',
              type: 'draw',
              order: 2,
              highlightArea: { x: 200, y: 150, width: 100, height: 50 },
              validation: {
                type: 'shape_construction',
                params: { modification: 'indent', position: 'top' },
                threshold: 0.6,
              },
            },
            {
              id: 'practice_2_3',
              text: 'Draw the stem as a small rectangle',
              type: 'draw',
              order: 3,
              highlightArea: { x: 240, y: 130, width: 20, height: 30 },
              validation: {
                type: 'shape_construction',
                params: { component: 'stem', shape: 'rectangle' },
                threshold: 0.7,
              },
            },
          ],
          hints: [
            {
              id: 'hint_2_1',
              stepIndex: 0,
              text: 'Don\'t aim for a perfect circle - organic shapes are more natural',
              content: 'Don\'t aim for a perfect circle - organic shapes are more natural',
              triggerCondition: 'instruction_0_fail',
            },
          ],
          referenceImage: 'lesson_2_apple_reference',
          canvas: {
            width: 1024,
            height: 768,
            backgroundColor: '#ffffff',
          },
          expectedDuration: 6,
        },
        assessment: {
          criteria: [
            {
              id: 'construction_method',
              name: 'Construction Method',
              description: 'Proper use of construction approach',
              weight: 0.5,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
            {
              id: 'proportions',
              name: 'Proportions',
              description: 'Correct proportional relationships',
              weight: 0.3,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
            {
              id: 'completion',
              name: 'Completion',
              description: 'Completed apple drawing',
              weight: 0.2,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          maxAttempts: 3,
          bonusObjectives: [
            {
              id: 'bonus_variation',
              description: 'Draw two different apple varieties',
              xpBonus: 30,
            },
          ],
        },
        rewards: {
          xp: 125,
          achievements: ['shape_constructor'],
          unlocks: ['lesson_3_perspective'],
        },
        status: 'locked',
        progress: 0,
        attempts: 0,
        timeSpent: 0,
        // Backward compatibility
        duration: 10,
        xpReward: 125,
        skillTreeId: 'fundamentals',
        unlockRequirements: ['lesson_1_lines_shapes'],
        tags: ['construction', 'shapes', 'apple', 'forms'],
      },

      // Continue with remaining lessons...
      ...this.createRemainingLessons(),
    ];

    return lessons;
  }

  private createRemainingLessons(): Lesson[] {
    // Simplified lesson templates for lessons 3-15
    const remainingLessons: Lesson[] = [];
    
    const lessonTemplates = [
      { id: 'lesson_3_perspective', title: 'Perspective Basics', description: 'Learn one-point perspective to create depth and dimension', xp: 150 },
      { id: 'lesson_4_light_shadow', title: 'Light & Shadow', description: 'Understand how light creates form through highlights and shadows', xp: 175 },
      { id: 'lesson_5_form_volume', title: 'Form & Volume', description: 'Create convincing three-dimensional forms with proper construction', xp: 200 },
      { id: 'lesson_6_proportions', title: 'Proportions', description: 'Master proportional relationships', xp: 175 },
      { id: 'lesson_7_color_theory', title: 'Color Theory', description: 'Understand color relationships', xp: 200 },
      { id: 'lesson_8_value_contrast', title: 'Value & Contrast', description: 'Create strong value compositions', xp: 175 },
      { id: 'lesson_9_environments', title: 'Simple Environments', description: 'Draw basic landscapes', xp: 225 },
      { id: 'lesson_10_character_basics', title: 'Character Basics', description: 'Introduction to figure drawing', xp: 250 },
      { id: 'lesson_11_color_application', title: 'Color Application', description: 'Apply color to your drawings', xp: 200 },
      { id: 'lesson_12_texture_studies', title: 'Texture Studies', description: 'Create realistic textures', xp: 175 },
      { id: 'lesson_13_composition', title: 'Composition Rules', description: 'Arrange elements effectively', xp: 200 },
      { id: 'lesson_14_style_development', title: 'Style Development', description: 'Find your artistic voice', xp: 225 },
      { id: 'lesson_15_portfolio_project', title: 'Portfolio Project', description: 'Create a complete artwork', xp: 300 },
    ];

    lessonTemplates.forEach((template, index) => {
      const lesson: Lesson = {
        id: template.id,
        title: template.title,
        description: template.description,
        type: 'practice',
        skillTree: 'fundamentals',
        order: index + 3, // Start from 3 since we have lessons 1 and 2 above
        estimatedTime: 12 + (index * 2), // Progressive difficulty
        difficulty: Math.min(5, Math.floor(index / 3) + 2) as 1 | 2 | 3 | 4 | 5,
        prerequisites: index > 0 ? [lessonTemplates[index - 1].id] : ['lesson_2_construction'],
        objectives: [
          { id: `obj_${index + 3}_1`, description: `Master ${template.title.toLowerCase()}`, completed: false, required: true },
        ],
        theoryContent: {
          segments: [
            {
              id: `theory_${index + 3}_1`,
              type: 'text',
              content: { text: `Learn the principles of ${template.title.toLowerCase()}` },
              duration: 90,
              order: 1,
            },
          ],
          totalDuration: 3,
          objectives: [
            { id: `theory_obj_${index + 3}`, description: `Understand ${template.title.toLowerCase()}`, type: 'primary', required: true },
          ],
        },
        practiceContent: {
          instructions: [
            {
              id: `practice_${index + 3}_1`,
              text: `Apply ${template.title.toLowerCase()} techniques`,
              type: 'draw',
              order: 1,
              highlightArea: { x: 150, y: 150, width: 200, height: 200 },
              validation: {
                type: 'completion',
                params: { minProgress: 0.8 },
                threshold: 0.7,
              },
            },
          ],
          hints: [],
          referenceImage: `${template.id}_reference`,
          canvas: {
            width: 1024,
            height: 768,
            backgroundColor: '#ffffff',
          },
          expectedDuration: 8 + index,
        },
        assessment: {
          criteria: [
            {
              id: 'technique_application',
              name: 'Technique Application',
              description: `Proper ${template.title.toLowerCase()} application`,
              weight: 1.0,
              passingScore: 0.7,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          maxAttempts: 3,
          bonusObjectives: [],
        },
        rewards: {
          xp: template.xp,
          achievements: [],
          unlocks: [],
        },
        status: 'locked',
        progress: 0,
        attempts: 0,
        timeSpent: 0,
        // Backward compatibility
        duration: 12 + (index * 2),
        xpReward: template.xp,
        skillTreeId: 'fundamentals',
        unlockRequirements: index > 0 ? [lessonTemplates[index - 1].id] : ['lesson_2_construction'],
        tags: [template.title.toLowerCase().replace(' ', '_')],
      };

      remainingLessons.push(lesson);
    });

    return remainingLessons;
  }

  // Core API Methods

  public getSkillTree(treeId: string): SkillTree | null {
    return this.skillTrees.get(treeId) || null;
  }

  public getAllSkillTrees(): SkillTree[] {
    return Array.from(this.skillTrees.values());
  }

  public getLesson(lessonId: string): Lesson | null {
    for (const tree of this.skillTrees.values()) {
      const lesson = tree.lessons.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
    return null;
  }

  public getAvailableLessons(treeId?: string): Lesson[] {
    if (!this.userProgress) return [];

    const available: Lesson[] = [];
    const trees = treeId 
      ? [this.skillTrees.get(treeId)].filter(Boolean) as SkillTree[]
      : Array.from(this.skillTrees.values());
    
    for (const tree of trees) {
      for (const lesson of tree.lessons) {
        if (this.isLessonUnlocked(lesson)) {
          available.push(lesson);
        }
      }
    }

    return available.sort((a, b) => a.order - b.order);
  }

  public isLessonUnlocked(lesson: Lesson): boolean {
    if (!this.userProgress) return false;

    // Check prerequisites
    for (const prereq of lesson.prerequisites) {
      if (!this.userProgress.completedLessons.includes(prereq)) {
        return false;
      }
    }

    // Check unlock requirements (backward compatibility)
    if (lesson.unlockRequirements) {
      for (const requirement of lesson.unlockRequirements) {
        if (!this.meetsRequirement(requirement)) {
          return false;
        }
      }
    }

    return true;
  }

  private meetsRequirement(requirement: string): boolean {
    // Simplified requirement checking for string requirements
    return this.userProgress?.completedLessons.includes(requirement) || false;
  }

  public async completeLesson(lessonId: string, score: number): Promise<void> {
    if (!this.userProgress) return;

    const lesson = this.getLesson(lessonId);
    if (!lesson) {
      throw new Error(`Lesson ${lessonId} not found`);
    }

    // Add to completed lessons if not already completed
    if (!this.userProgress.completedLessons.includes(lessonId)) {
      this.userProgress.completedLessons.push(lessonId);
    }

    // Add XP (use backward compatibility properties)
    const xpReward = lesson.xpReward || lesson.rewards?.xp || 100;
    this.userProgress.totalXP += xpReward;

    // Update skill tree progress
    let treeProgress = this.userProgress.skillTrees.find(
      (tp: SkillTreeProgress) => tp.skillTreeId === (lesson.skillTreeId || lesson.skillTree)
    );

    if (!treeProgress) {
      treeProgress = {
        skillTreeId: lesson.skillTreeId || lesson.skillTree,
        completedLessons: [],
        totalXpEarned: 0,
        lastAccessedAt: new Date(),
        completionPercentage: 0,
      };
      this.userProgress.skillTrees.push(treeProgress);
    }

    if (!treeProgress.completedLessons.includes(lessonId)) {
      treeProgress.completedLessons.push(lessonId);
    }

    treeProgress.totalXpEarned += xpReward;
    treeProgress.lastAccessedAt = new Date();

    // Update completion percentages
    this.updateCompletionPercentages();

    // Save progress
    await this.saveProgress();

    // Record with progression system
    await progressionSystem.recordLessonCompletion(lessonId, score);

    // Notify listeners
    this.notifyProgressListeners();
  }

  private updateCompletionPercentages(): void {
    if (!this.userProgress) return;

    this.userProgress.skillTrees.forEach((progress: SkillTreeProgress) => {
      const tree = this.skillTrees.get(progress.skillTreeId);
      if (tree) {
        const completionRate = progress.completedLessons.length / tree.lessons.length;
        tree.completionPercentage = Math.round(completionRate * 100);
        progress.completionPercentage = tree.completionPercentage;
      }
    });
  }

  private async saveProgress(): Promise<void> {
    if (this.userProgress) {
      await dataManager.set('learning_progress', this.userProgress);
    }
  }

  public getUserProgress(): LearningProgress | null {
    return this.userProgress;
  }

  public subscribeToProgress(callback: (progress: LearningProgress) => void): () => void {
    this.progressListeners.add(callback);
    if (this.userProgress) {
      callback(this.userProgress);
    }
    return () => this.progressListeners.delete(callback);
  }

  private notifyProgressListeners(): void {
    if (this.userProgress) {
      this.progressListeners.forEach(callback => callback(this.userProgress!));
    }
  }

  // Analytics and progress tracking
  public getProgressSummary(): {
    totalLessons: number;
    completedLessons: number;
    totalXP: number;
    currentStreak: number;
    skillTreesInProgress: number;
    nextLessonRecommendation?: Lesson;
  } {
    if (!this.userProgress) {
      return {
        totalLessons: 0,
        completedLessons: 0,
        totalXP: 0,
        currentStreak: 0,
        skillTreesInProgress: 0,
      };
    }

    const totalLessons = Array.from(this.skillTrees.values())
      .reduce((sum, tree) => sum + tree.lessons.length, 0);

    const availableLessons = this.getAvailableLessons();
    const nextLesson = availableLessons.find(
      lesson => !this.userProgress!.completedLessons.includes(lesson.id)
    );

    return {
      totalLessons,
      completedLessons: this.userProgress.completedLessons.length,
      totalXP: this.userProgress.totalXP,
      currentStreak: this.userProgress.currentStreak,
      skillTreesInProgress: this.userProgress.skillTrees.length,
      nextLessonRecommendation: nextLesson,
    };
  }

  // Methods for external API compatibility
  public getAvailableSkillTrees(): SkillTree[] {
    return this.getAllSkillTrees();
  }

  public getRecommendedNextLesson(): Lesson | null {
    const availableLessons = this.getAvailableLessons();
    const uncompletedLessons = availableLessons.filter(
      lesson => !this.userProgress?.completedLessons.includes(lesson.id)
    );
    return uncompletedLessons[0] || null;
  }

  public getOverallProgress(): {
    totalLessonsCompleted: number;
    totalXpEarned: number;
    completionPercentage: number;
  } {
    const progress = this.getProgressSummary();
    return {
      totalLessonsCompleted: progress.completedLessons,
      totalXpEarned: progress.totalXP,
      completionPercentage: progress.totalLessons > 0 
        ? Math.round((progress.completedLessons / progress.totalLessons) * 100)
        : 0,
    };
  }

  public getAllLessons(): Lesson[] {
    const allLessons: Lesson[] = [];
    for (const tree of this.skillTrees.values()) {
      allLessons.push(...tree.lessons);
    }
    return allLessons;
  }

  public getUnlockedLessons(): Lesson[] {
    return this.getAvailableLessons();
  }

  public checkUnlockRequirements(lessonId: string): boolean {
    const lesson = this.getLesson(lessonId);
    return lesson ? this.isLessonUnlocked(lesson) : false;
  }
}

// Export singleton instance
export const skillTreeManager = SkillTreeManager.getInstance();