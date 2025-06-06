import { 
    SkillTree, 
    Lesson, 
    SkillCategory,
    UnlockRequirement,
    SkillTreeProgress 
  } from '../../types';
  import { dataManager } from '../core/DataManager';
  import { errorHandler } from '../core/ErrorHandler';
  import { profileSystem } from '../user/ProfileSystem';
  
  /**
   * Manages skill trees and lesson progression paths
   * Handles unlock requirements and skill development tracking
   */
  export class SkillTreeManager {
    private static instance: SkillTreeManager;
    private skillTrees: Map<string, SkillTree> = new Map();
    private userProgress: Map<string, SkillTreeProgress> = new Map();
    private progressListeners: Set<(progress: Map<string, SkillTreeProgress>) => void> = new Set();
  
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
  
    private initializeSkillTrees(): void {
      // Initialize the Drawing Fundamentals skill tree
      const fundamentalsTree: SkillTree = {
        id: 'drawing-fundamentals',
        name: 'Drawing Fundamentals',
        description: 'Master the essential skills every artist needs',
        iconUrl: 'fundamentals_icon',
        category: 'fundamentals',
        lessons: this.createFundamentalsLessons(),
        totalXP: 1500,
        completionPercentage: 0,
      };
  
      this.skillTrees.set(fundamentalsTree.id, fundamentalsTree);
  
      // Future skill trees can be added here
      // this.skillTrees.set('digital-painting', digitalPaintingTree);
      // this.skillTrees.set('character-design', characterDesignTree);
    }
  
    private createFundamentalsLessons(): Lesson[] {
      const lessons: Lesson[] = [
        {
          id: 'lesson-1-lines-shapes',
          skillTreeId: 'drawing-fundamentals',
          title: 'Lines & Basic Shapes',
          description: 'Master straight lines, curves, and perfect circles with pressure control',
          thumbnailUrl: 'lesson_1_thumb',
          duration: 8,
          difficulty: 1,
          order: 1,
          prerequisites: [],
          objectives: [
            { id: 'obj-1-1', description: 'Draw consistent straight lines', completed: false },
            { id: 'obj-1-2', description: 'Create smooth curves with pressure variation', completed: false },
            { id: 'obj-1-3', description: 'Draw perfect circles and ellipses', completed: false },
          ],
          theoryContent: {
            segments: [
              {
                type: 'text',
                content: { 
                  text: 'Every great artwork starts with confident lines. Today, we\'ll master the foundation of all drawing.',
                  emphasis: 'primary' 
                },
                duration: 15,
              },
              {
                type: 'interactive',
                content: {
                  type: 'line-demo',
                  instruction: 'Watch how pressure affects line weight',
                },
                duration: 30,
              },
              {
                type: 'image',
                content: {
                  url: 'line_examples',
                  caption: 'Different line types and their uses',
                },
                duration: 20,
              },
            ],
            estimatedDuration: 120,
          },
          practiceContent: {
            instructions: [
              {
                step: 1,
                text: 'Draw 5 horizontal straight lines',
                highlightArea: { x: 100, y: 100, width: 600, height: 300 },
                requiredAction: 'draw_lines',
                validation: {
                  type: 'stroke_count',
                  params: { min: 5, max: 10 },
                  threshold: 0.8,
                },
              },
              {
                step: 2,
                text: 'Draw 5 vertical lines with varying pressure',
                highlightArea: { x: 100, y: 100, width: 600, height: 300 },
                requiredAction: 'draw_lines_pressure',
                validation: {
                  type: 'stroke_count',
                  params: { min: 5, max: 10, checkPressure: true },
                  threshold: 0.8,
                },
              },
              {
                step: 3,
                text: 'Draw 3 perfect circles',
                highlightArea: { x: 200, y: 200, width: 400, height: 400 },
                requiredAction: 'draw_circles',
                validation: {
                  type: 'shape_accuracy',
                  params: { targetShape: 'circle', count: 3 },
                  threshold: 0.75,
                },
              },
            ],
            referenceImage: 'lines_reference',
            guideLayers: [
              {
                id: 'guide-1',
                type: 'grid',
                visible: true,
                opacity: 0.3,
                data: { spacing: 50, color: '#cccccc' },
              },
            ],
            hints: [
              {
                id: 'hint-1',
                triggerCondition: 'instruction_0_fail',
                content: 'Try to keep your hand steady. Use your whole arm, not just your wrist!',
                type: 'tip',
              },
              {
                id: 'hint-2',
                triggerCondition: 'time_exceeded_60s',
                content: 'You\'re doing great! Take your time to get it right.',
                type: 'encouragement',
              },
            ],
            toolsRequired: ['pencil'],
            estimatedDuration: 300,
          },
          assessment: {
            criteria: [
              {
                id: 'line-consistency',
                description: 'Lines are straight and consistent',
                weight: 0.4,
                evaluationType: 'automatic',
              },
              {
                id: 'pressure-control',
                description: 'Demonstrates good pressure control',
                weight: 0.3,
                evaluationType: 'automatic',
              },
              {
                id: 'shape-accuracy',
                description: 'Circles are round and smooth',
                weight: 0.3,
                evaluationType: 'automatic',
              },
            ],
            passingScore: 0.7,
            bonusObjectives: [
              {
                id: 'bonus-speed',
                description: 'Complete in under 5 minutes',
                xpBonus: 50,
              },
              {
                id: 'bonus-perfect',
                description: 'All shapes perfect on first try',
                xpBonus: 100,
              },
            ],
          },
          xpReward: 100,
          unlockRequirements: [],
          tags: ['fundamentals', 'lines', 'shapes', 'beginner'],
        },
        // Lesson 2: Shape Construction
        {
          id: 'lesson-2-shape-construction',
          skillTreeId: 'drawing-fundamentals',
          title: 'Shape Construction',
          description: 'Combine basic shapes to create complex objects',
          thumbnailUrl: 'lesson_2_thumb',
          duration: 10,
          difficulty: 1,
          order: 2,
          prerequisites: ['lesson-1-lines-shapes'],
          objectives: [
            { id: 'obj-2-1', description: 'Break down complex objects into basic shapes', completed: false },
            { id: 'obj-2-2', description: 'Combine shapes smoothly', completed: false },
            { id: 'obj-2-3', description: 'Create an apple using circles and curves', completed: false },
          ],
          theoryContent: {
            segments: [
              {
                type: 'text',
                content: { 
                  text: 'Everything you see can be broken down into basic shapes. This is the secret to drawing anything!',
                  emphasis: 'primary' 
                },
                duration: 20,
              },
              {
                type: 'interactive',
                content: {
                  type: 'shape-breakdown',
                  instruction: 'See how this apple is made of simple shapes',
                },
                duration: 45,
              },
            ],
            estimatedDuration: 150,
          },
          practiceContent: {
            instructions: [
              {
                step: 1,
                text: 'Draw a large circle for the apple body',
                highlightArea: { x: 250, y: 250, width: 300, height: 300 },
                requiredAction: 'draw_circle',
              },
              {
                step: 2,
                text: 'Add a smaller circle on top for the indent',
                highlightArea: { x: 350, y: 200, width: 100, height: 100 },
                requiredAction: 'draw_circle_small',
              },
              {
                step: 3,
                text: 'Connect the shapes with smooth curves',
                highlightArea: { x: 250, y: 200, width: 300, height: 350 },
                requiredAction: 'draw_curves',
              },
              {
                step: 4,
                text: 'Add a stem and leaf',
                highlightArea: { x: 380, y: 180, width: 40, height: 80 },
                requiredAction: 'draw_details',
              },
            ],
            referenceImage: 'apple_construction',
            guideLayers: [
              {
                id: 'guide-apple',
                type: 'reference',
                visible: true,
                opacity: 0.2,
                data: { image: 'apple_outline' },
              },
            ],
            hints: [
              {
                id: 'hint-construction',
                triggerCondition: 'step_2_incomplete',
                content: 'Remember, the top circle should overlap the main circle slightly',
                type: 'tip',
              },
            ],
            toolsRequired: ['pencil'],
            estimatedDuration: 360,
          },
          assessment: {
            criteria: [
              {
                id: 'shape-breakdown',
                description: 'Successfully used basic shapes',
                weight: 0.5,
                evaluationType: 'automatic',
              },
              {
                id: 'smooth-connection',
                description: 'Shapes connect smoothly',
                weight: 0.5,
                evaluationType: 'automatic',
              },
            ],
            passingScore: 0.7,
            bonusObjectives: [],
          },
          xpReward: 120,
          unlockRequirements: [
            { type: 'lesson', value: 'lesson-1-lines-shapes' },
          ],
          tags: ['fundamentals', 'construction', 'shapes', 'beginner'],
        },
        // Additional lessons would follow the same pattern...
        // I'll create a simplified version for the remaining lessons to save space
      ];
  
      // Add remaining 13 lessons with essential information
      const additionalLessons = [
        { id: 'lesson-3-perspective', title: 'Perspective Basics', order: 3 },
        { id: 'lesson-4-light-shadow', title: 'Light & Shadow', order: 4 },
        { id: 'lesson-5-form-volume', title: 'Form & Volume', order: 5 },
        { id: 'lesson-6-proportions', title: 'Proportions', order: 6 },
        { id: 'lesson-7-color-theory', title: 'Color Theory', order: 7 },
        { id: 'lesson-8-value-contrast', title: 'Value & Contrast', order: 8 },
        { id: 'lesson-9-environments', title: 'Simple Environments', order: 9 },
        { id: 'lesson-10-characters', title: 'Character Basics', order: 10 },
        { id: 'lesson-11-color-application', title: 'Color Application', order: 11 },
        { id: 'lesson-12-texture', title: 'Texture Studies', order: 12 },
        { id: 'lesson-13-composition', title: 'Composition Rules', order: 13 },
        { id: 'lesson-14-style', title: 'Style Development', order: 14 },
        { id: 'lesson-15-portfolio', title: 'Portfolio Project', order: 15 },
      ];
  
      additionalLessons.forEach(lessonInfo => {
        lessons.push(this.createPlaceholderLesson(lessonInfo));
      });
  
      return lessons;
    }
  
    private createPlaceholderLesson(info: { id: string; title: string; order: number }): Lesson {
      // Create a simplified lesson structure for remaining lessons
      // In production, each would be fully fleshed out
      return {
        id: info.id,
        skillTreeId: 'drawing-fundamentals',
        title: info.title,
        description: `Learn the fundamentals of ${info.title.toLowerCase()}`,
        thumbnailUrl: `${info.id}_thumb`,
        duration: 10,
        difficulty: Math.min(5, Math.ceil(info.order / 3)) as 1 | 2 | 3 | 4 | 5,
        order: info.order,
        prerequisites: info.order > 1 ? [`lesson-${info.order - 1}`] : [],
        objectives: [
          { id: `obj-${info.order}-1`, description: 'Master the basics', completed: false },
          { id: `obj-${info.order}-2`, description: 'Apply techniques', completed: false },
          { id: `obj-${info.order}-3`, description: 'Create original work', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: `Introduction to ${info.title}` },
              duration: 120,
            },
          ],
          estimatedDuration: 180,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: `Practice ${info.title} fundamentals`,
              highlightArea: { x: 0, y: 0, width: 800, height: 600 },
              requiredAction: 'draw',
            },
          ],
          guideLayers: [],
          hints: [],
          toolsRequired: ['pencil'],
          estimatedDuration: 300,
        },
        assessment: {
          criteria: [
            {
              id: 'understanding',
              description: 'Demonstrates understanding',
              weight: 1,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [],
        },
        xpReward: 100 + (info.order * 10),
        unlockRequirements: info.order > 1 
          ? [{ type: 'lesson', value: `lesson-${info.order - 1}` }]
          : [],
        tags: ['fundamentals'],
      };
    }
  
    private async loadUserProgress(): Promise<void> {
      try {
        const progress = await dataManager.getLearningProgress();
        if (progress?.skillTrees) {
          progress.skillTrees.forEach(treeProgress => {
            this.userProgress.set(treeProgress.skillTreeId, treeProgress);
          });
        }
      } catch (error) {
        errorHandler.handleError(
          errorHandler.createError('PROGRESS_LOAD_ERROR', 'Failed to load skill tree progress', 'medium', error)
        );
      }
    }
  
    public getSkillTree(id: string): SkillTree | null {
      return this.skillTrees.get(id) || null;
    }
  
    public getAllSkillTrees(): SkillTree[] {
      return Array.from(this.skillTrees.values());
    }
  
    public getAvailableSkillTrees(): SkillTree[] {
      const user = profileSystem.getCurrentUser();
      if (!user) return [];
  
      return this.getAllSkillTrees().filter(tree => 
        this.checkSkillTreeRequirements(tree, user)
      );
    }
  
    private checkSkillTreeRequirements(tree: SkillTree, user: any): boolean {
      // Check if user meets requirements to access this skill tree
      // For now, fundamentals is always available
      if (tree.category === 'fundamentals') return true;
      
      // Advanced trees might require certain level or completed prerequisites
      return user.level >= 5;
    }
  
    public getLesson(lessonId: string): Lesson | null {
      for (const tree of this.skillTrees.values()) {
        const lesson = tree.lessons.find(l => l.id === lessonId);
        if (lesson) return lesson;
      }
      return null;
    }
  
    public getAvailableLessons(skillTreeId: string): Lesson[] {
      const tree = this.getSkillTree(skillTreeId);
      if (!tree) return [];
  
      const progress = this.userProgress.get(skillTreeId);
      const user = profileSystem.getCurrentUser();
  
      return tree.lessons.filter(lesson => 
        this.checkLessonRequirements(lesson, progress, user)
      );
    }
  
    private checkLessonRequirements(
      lesson: Lesson, 
      progress: SkillTreeProgress | undefined,
      user: any
    ): boolean {
      // Check each unlock requirement
      for (const req of lesson.unlockRequirements) {
        switch (req.type) {
          case 'lesson':
            if (!progress?.completedLessons.includes(req.value)) {
              return false;
            }
            break;
          case 'level':
            if (!user || user.level < req.value) {
              return false;
            }
            break;
          case 'xp':
            if (!user || user.totalXP < req.value) {
              return false;
            }
            break;
          case 'achievement':
            if (!user?.achievements.some((a: any) => a.id === req.value)) {
              return false;
            }
            break;
        }
      }
  
      // Check prerequisites
      for (const prereq of lesson.prerequisites) {
        if (!progress?.completedLessons.includes(prereq)) {
          return false;
        }
      }
  
      return true;
    }
  
    public async completeLesson(lessonId: string, xpEarned: number): Promise<void> {
      const lesson = this.getLesson(lessonId);
      if (!lesson) return;
  
      let progress = this.userProgress.get(lesson.skillTreeId);
      if (!progress) {
        progress = {
          skillTreeId: lesson.skillTreeId,
          unlockedLessons: [],
          completedLessons: [],
          totalXpEarned: 0,
          lastAccessedAt: new Date(),
        };
        this.userProgress.set(lesson.skillTreeId, progress);
      }
  
      // Mark lesson as completed
      if (!progress.completedLessons.includes(lessonId)) {
        progress.completedLessons.push(lessonId);
        progress.totalXpEarned += xpEarned;
        progress.lastAccessedAt = new Date();
  
        // Unlock next lessons
        const tree = this.getSkillTree(lesson.skillTreeId);
        if (tree) {
          tree.lessons.forEach(nextLesson => {
            if (nextLesson.prerequisites.includes(lessonId) &&
                !progress!.unlockedLessons.includes(nextLesson.id)) {
              progress!.unlockedLessons.push(nextLesson.id);
            }
          });
        }
  
        // Save progress
        await this.saveProgress();
        this.notifyProgressListeners();
      }
    }
  
    private async saveProgress(): Promise<void> {
      const progressArray = Array.from(this.userProgress.values());
      await dataManager.saveLearningProgress({
        userId: profileSystem.getCurrentUser()?.id || '',
        skillTrees: progressArray,
        totalXP: progressArray.reduce((sum, p) => sum + p.totalXpEarned, 0),
        currentStreak: 0, // Managed by ProfileSystem
        longestStreak: 0,
        dailyGoal: 100,
        dailyProgress: 0,
      });
    }
  
    public getSkillTreeProgress(skillTreeId: string): SkillTreeProgress | null {
      return this.userProgress.get(skillTreeId) || null;
    }
  
    public getOverallProgress(): {
      totalLessonsCompleted: number;
      totalLessonsAvailable: number;
      totalXpEarned: number;
      completionPercentage: number;
    } {
      let totalCompleted = 0;
      let totalAvailable = 0;
      let totalXp = 0;
  
      this.skillTrees.forEach(tree => {
        totalAvailable += tree.lessons.length;
        const progress = this.userProgress.get(tree.id);
        if (progress) {
          totalCompleted += progress.completedLessons.length;
          totalXp += progress.totalXpEarned;
        }
      });
  
      return {
        totalLessonsCompleted: totalCompleted,
        totalLessonsAvailable: totalAvailable,
        totalXpEarned: totalXp,
        completionPercentage: totalAvailable > 0 ? (totalCompleted / totalAvailable) * 100 : 0,
      };
    }
  
    public subscribeToProgress(callback: (progress: Map<string, SkillTreeProgress>) => void): () => void {
      this.progressListeners.add(callback);
      callback(this.userProgress);
      return () => this.progressListeners.delete(callback);
    }
  
    private notifyProgressListeners(): void {
      this.progressListeners.forEach(callback => callback(this.userProgress));
    }
  
    public getRecommendedNextLesson(): Lesson | null {
      // Find the next best lesson based on user progress
      const availableTrees = this.getAvailableSkillTrees();
      
      for (const tree of availableTrees) {
        const availableLessons = this.getAvailableLessons(tree.id);
        const progress = this.userProgress.get(tree.id);
        
        // Find first uncompleted lesson
        const nextLesson = availableLessons.find(lesson => 
          !progress?.completedLessons.includes(lesson.id)
        );
        
        if (nextLesson) return nextLesson;
      }
      
      return null;
    }
  }
  
  // Export singleton instance
  export const skillTreeManager = SkillTreeManager.getInstance();