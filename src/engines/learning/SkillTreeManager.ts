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
        // Initialize new progress
        this.userProgress = {
          userId: 'current_user',
          skillTrees: [],
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
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
        skillTreeId: 'fundamentals',
        title: 'Lines & Basic Shapes',
        description: 'Master straight lines, curves, and basic geometric shapes',
        thumbnailUrl: 'lesson_1_thumb',
        duration: 8,
        difficulty: 1,
        order: 1,
        prerequisites: [],
        objectives: [
          { id: 'obj_1_1', description: 'Draw straight lines with confidence', completed: false },
          { id: 'obj_1_2', description: 'Create perfect circles and squares', completed: false },
          { id: 'obj_1_3', description: 'Understand line weight and pressure', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: 'Lines are the foundation of all drawing. In this lesson, you\'ll learn to control your marks and create confident strokes.' },
              duration: 30,
            },
            {
              type: 'interactive',
              content: { 
                demo: 'line_drawing',
                title: 'Line Control Exercise',
                instructions: 'Practice drawing straight lines by connecting the dots'
              },
              duration: 60,
            },
            {
              type: 'text',
              content: { text: 'Basic shapes - circles, squares, triangles - are building blocks for complex forms. Master these and you can draw anything.' },
              duration: 30,
            },
          ],
          estimatedDuration: 2,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw 10 straight horizontal lines using consistent pressure',
              highlightArea: { x: 100, y: 100, width: 300, height: 50 },
              requiredAction: 'draw_lines',
              validation: {
                type: 'line_detection',
                params: { minLines: 10, straightnessThreshold: 0.8 },
                threshold: 0.8,
              },
            },
            {
              step: 2,
              text: 'Draw 5 circles, focusing on closing the shape smoothly',
              highlightArea: { x: 100, y: 200, width: 300, height: 200 },
              requiredAction: 'draw_circles',
              validation: {
                type: 'shape_completion',
                params: { targetShape: 'circle', minShapes: 5 },
                threshold: 0.7,
              },
            },
            {
              step: 3,
              text: 'Create 3 squares with equal sides and sharp corners',
              highlightArea: { x: 100, y: 450, width: 300, height: 150 },
              requiredAction: 'draw_squares',
              validation: {
                type: 'shape_accuracy',
                params: { targetShape: 'square', minShapes: 3 },
                threshold: 0.75,
              },
            },
          ],
          referenceImage: 'lesson_1_reference',
          guideLayers: [
            {
              id: 'guide_grid',
              type: 'grid',
              visible: true,
              opacity: 0.3,
              data: { spacing: 50, color: '#cccccc' },
            },
          ],
          hints: [
            {
              id: 'hint_1_1',
              triggerCondition: 'instruction_0_fail',
              content: 'Keep your wrist stable and move from your shoulder for smoother lines',
              type: 'tip',
            },
            {
              id: 'hint_1_2',
              triggerCondition: 'instruction_1_fail',
              content: 'Don\'t worry about perfection - focus on completing the circular motion',
              type: 'encouragement',
            },
          ],
          toolsRequired: ['pencil'],
          estimatedDuration: 5,
        },
        assessment: {
          criteria: [
            {
              id: 'line_quality',
              description: 'Line confidence and consistency',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'shape_accuracy',
              description: 'Accuracy of basic shapes',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'completion',
              description: 'Completed all exercises',
              weight: 0.2,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus_speed',
              description: 'Complete in under 5 minutes',
              xpBonus: 25,
            },
          ],
        },
        xpReward: 100,
        unlockRequirements: [],
        tags: ['basics', 'lines', 'shapes', 'foundation'],
      },

      // Lesson 2: Shape Construction
      {
        id: 'lesson_2_construction',
        skillTreeId: 'fundamentals',
        title: 'Shape Construction',
        description: 'Build complex forms using basic shapes as building blocks',
        thumbnailUrl: 'lesson_2_thumb',
        duration: 10,
        difficulty: 2,
        order: 2,
        prerequisites: ['lesson_1_lines_shapes'],
        objectives: [
          { id: 'obj_2_1', description: 'Combine basic shapes to create complex forms', completed: false },
          { id: 'obj_2_2', description: 'Draw a simple apple using construction', completed: false },
          { id: 'obj_2_3', description: 'Understand proportional relationships', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: 'Everything you see can be broken down into basic shapes. An apple is a circle with modifications. A house is rectangles and triangles.' },
              duration: 45,
            },
            {
              type: 'interactive',
              content: { 
                demo: 'shape_breakdown',
                title: 'See the Shapes',
                instructions: 'Look at this apple and identify the basic shapes within it'
              },
              duration: 90,
            },
          ],
          estimatedDuration: 3,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Start with a circle for the basic apple shape',
              highlightArea: { x: 150, y: 150, width: 200, height: 200 },
              requiredAction: 'draw_base_circle',
              validation: {
                type: 'shape_construction',
                params: { requiredShape: 'circle', stage: 'base' },
                threshold: 0.7,
              },
            },
            {
              step: 2,
              text: 'Add the apple\'s indent at the top with curved lines',
              highlightArea: { x: 200, y: 150, width: 100, height: 50 },
              requiredAction: 'add_apple_indent',
              validation: {
                type: 'shape_construction',
                params: { modification: 'indent', position: 'top' },
                threshold: 0.6,
              },
            },
            {
              step: 3,
              text: 'Draw the stem as a small rectangle',
              highlightArea: { x: 240, y: 130, width: 20, height: 30 },
              requiredAction: 'add_stem',
              validation: {
                type: 'shape_construction',
                params: { component: 'stem', shape: 'rectangle' },
                threshold: 0.7,
              },
            },
          ],
          referenceImage: 'lesson_2_apple_reference',
          guideLayers: [
            {
              id: 'construction_guides',
              type: 'overlay',
              visible: true,
              opacity: 0.4,
              data: { shapes: ['circle', 'construction_lines'] },
            },
          ],
          hints: [
            {
              id: 'hint_2_1',
              triggerCondition: 'instruction_0_fail',
              content: 'Don\'t aim for a perfect circle - organic shapes are more natural',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil'],
          estimatedDuration: 6,
        },
        assessment: {
          criteria: [
            {
              id: 'construction_method',
              description: 'Proper use of construction approach',
              weight: 0.5,
              evaluationType: 'automatic',
            },
            {
              id: 'proportions',
              description: 'Correct proportional relationships',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'completion',
              description: 'Completed apple drawing',
              weight: 0.2,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus_variation',
              description: 'Draw two different apple varieties',
              xpBonus: 30,
            },
          ],
        },
        xpReward: 125,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson_1_lines_shapes' },
        ],
        tags: ['construction', 'shapes', 'apple', 'forms'],
      },

      // Lesson 3: Perspective Basics
      {
        id: 'lesson_3_perspective',
        skillTreeId: 'fundamentals',
        title: 'Perspective Basics',
        description: 'Learn one-point perspective to create depth and dimension',
        thumbnailUrl: 'lesson_3_thumb',
        duration: 12,
        difficulty: 2,
        order: 3,
        prerequisites: ['lesson_2_construction'],
        objectives: [
          { id: 'obj_3_1', description: 'Understand the concept of vanishing points', completed: false },
          { id: 'obj_3_2', description: 'Draw a cube in one-point perspective', completed: false },
          { id: 'obj_3_3', description: 'Apply perspective to create depth', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: 'Perspective makes flat drawings look three-dimensional. It\'s how we show that objects get smaller as they move away from us.' },
              duration: 60,
            },
            {
              type: 'interactive',
              content: { 
                demo: 'vanishing_point',
                title: 'The Vanishing Point',
                instructions: 'Watch how parallel lines appear to meet at a distant point'
              },
              duration: 90,
            },
          ],
          estimatedDuration: 3,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Place a vanishing point on the horizon line',
              highlightArea: { x: 250, y: 200, width: 10, height: 10 },
              requiredAction: 'place_vanishing_point',
              validation: {
                type: 'point_placement',
                params: { location: 'horizon_line', type: 'vanishing_point' },
                threshold: 0.8,
              },
            },
            {
              step: 2,
              text: 'Draw the front face of the cube as a square',
              highlightArea: { x: 100, y: 150, width: 100, height: 100 },
              requiredAction: 'draw_cube_front',
              validation: {
                type: 'shape_accuracy',
                params: { targetShape: 'square', position: 'front' },
                threshold: 0.75,
              },
            },
            {
              step: 3,
              text: 'Connect the corners to the vanishing point with light lines',
              highlightArea: { x: 100, y: 150, width: 300, height: 100 },
              requiredAction: 'draw_perspective_lines',
              validation: {
                type: 'perspective_lines',
                params: { fromCorners: true, toVanishingPoint: true },
                threshold: 0.7,
              },
            },
            {
              step: 4,
              text: 'Draw the back edges of the cube and complete the form',
              highlightArea: { x: 150, y: 175, width: 80, height: 80 },
              requiredAction: 'complete_cube',
              validation: {
                type: 'shape_completion',
                params: { targetShape: 'cube_perspective', faces: 3 },
                threshold: 0.7,
              },
            },
          ],
          referenceImage: 'lesson_3_cube_reference',
          guideLayers: [
            {
              id: 'perspective_grid',
              type: 'overlay',
              visible: true,
              opacity: 0.3,
              data: { type: 'one_point_perspective', vanishingPoint: { x: 250, y: 200 } },
            },
          ],
          hints: [
            {
              id: 'hint_3_1',
              triggerCondition: 'instruction_2_fail',
              content: 'All parallel lines going away from you should point toward the vanishing point',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil'],
          estimatedDuration: 8,
        },
        assessment: {
          criteria: [
            {
              id: 'perspective_accuracy',
              description: 'Correct use of one-point perspective',
              weight: 0.6,
              evaluationType: 'automatic',
            },
            {
              id: 'cube_construction',
              description: 'Proper cube construction',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'line_quality',
              description: 'Clean, confident lines',
              weight: 0.1,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus_multiple_cubes',
              description: 'Draw three cubes at different depths',
              xpBonus: 35,
            },
          ],
        },
        xpReward: 150,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson_2_construction' },
        ],
        tags: ['perspective', 'cube', 'depth', '3d'],
      },

      // Continue with remaining lessons...
      // For brevity, I'll create simplified versions of the remaining lessons

      // Lesson 4: Light & Shadow
      {
        id: 'lesson_4_light_shadow',
        skillTreeId: 'fundamentals',
        title: 'Light & Shadow',
        description: 'Understand how light creates form through highlights and shadows',
        thumbnailUrl: 'lesson_4_thumb',
        duration: 12,
        difficulty: 3,
        order: 4,
        prerequisites: ['lesson_3_perspective'],
        objectives: [
          { id: 'obj_4_1', description: 'Identify light source and shadow patterns', completed: false },
          { id: 'obj_4_2', description: 'Shade a sphere with realistic lighting', completed: false },
          { id: 'obj_4_3', description: 'Understand cast shadows', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: 'Light reveals form. Without shadows, objects look flat. Learn to see and draw the light.' },
              duration: 90,
            },
          ],
          estimatedDuration: 3,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw a circle for the sphere',
              highlightArea: { x: 200, y: 200, width: 100, height: 100 },
              requiredAction: 'draw_sphere_base',
              validation: {
                type: 'shape_accuracy',
                params: { targetShape: 'circle' },
                threshold: 0.7,
              },
            },
            {
              step: 2,
              text: 'Add the core shadow on the side opposite the light',
              highlightArea: { x: 240, y: 220, width: 40, height: 60 },
              requiredAction: 'add_core_shadow',
              validation: {
                type: 'shading_element',
                params: { type: 'core_shadow', position: 'opposite_light' },
                threshold: 0.6,
              },
            },
            {
              step: 3,
              text: 'Create gradual shading from light to shadow',
              highlightArea: { x: 200, y: 200, width: 100, height: 100 },
              requiredAction: 'add_gradation',
              validation: {
                type: 'shading_gradation',
                params: { smooth: true, direction: 'light_to_shadow' },
                threshold: 0.7,
              },
            },
            {
              step: 4,
              text: 'Add the cast shadow on the ground',
              highlightArea: { x: 220, y: 300, width: 80, height: 20 },
              requiredAction: 'add_cast_shadow',
              validation: {
                type: 'cast_shadow',
                params: { attached: true, direction: 'away_from_light' },
                threshold: 0.6,
              },
            },
          ],
          referenceImage: 'lesson_4_sphere_reference',
          guideLayers: [],
          hints: [
            {
              id: 'hint_4_1',
              triggerCondition: 'instruction_2_fail',
              content: 'Use gentle, overlapping strokes to create smooth gradations',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil'],
          estimatedDuration: 8,
        },
        assessment: {
          criteria: [
            {
              id: 'shadow_accuracy',
              description: 'Correct shadow placement',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'gradation_quality',
              description: 'Smooth light transitions',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'form_understanding',
              description: 'Understanding of 3D form',
              weight: 0.2,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus_reflected_light',
              description: 'Add subtle reflected light',
              xpBonus: 40,
            },
          ],
        },
        xpReward: 175,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson_3_perspective' },
        ],
        tags: ['light', 'shadow', 'sphere', 'shading'],
      },

      // Lesson 5: Form & Volume
      {
        id: 'lesson_5_form_volume',
        skillTreeId: 'fundamentals',
        title: 'Form & Volume',
        description: 'Create convincing three-dimensional forms with proper construction',
        thumbnailUrl: 'lesson_5_thumb',
        duration: 15,
        difficulty: 3,
        order: 5,
        prerequisites: ['lesson_4_light_shadow'],
        objectives: [
          { id: 'obj_5_1', description: 'Draw a cylinder with proper construction', completed: false },
          { id: 'obj_5_2', description: 'Apply cylindrical shading principles', completed: false },
          { id: 'obj_5_3', description: 'Understand ellipses in perspective', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: 'Cylinders are everywhere - cups, bottles, arms, legs. Master the cylinder and you can draw most organic forms.' },
              duration: 90,
            },
          ],
          estimatedDuration: 3,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw the top ellipse of the cylinder',
              highlightArea: { x: 200, y: 150, width: 100, height: 30 },
              requiredAction: 'draw_top_ellipse',
              validation: {
                type: 'shape_accuracy',
                params: { targetShape: 'ellipse', orientation: 'horizontal' },
                threshold: 0.7,
              },
            },
            {
              step: 2,
              text: 'Draw vertical lines for the cylinder sides',
              highlightArea: { x: 200, y: 150, width: 100, height: 150 },
              requiredAction: 'draw_cylinder_sides',
              validation: {
                type: 'form_construction',
                params: { type: 'cylinder', stage: 'sides' },
                threshold: 0.7,
              },
            },
            {
              step: 3,
              text: 'Add the bottom ellipse',
              highlightArea: { x: 200, y: 270, width: 100, height: 30 },
              requiredAction: 'draw_bottom_ellipse',
              validation: {
                type: 'shape_accuracy',
                params: { targetShape: 'ellipse', position: 'bottom' },
                threshold: 0.7,
              },
            },
            {
              step: 4,
              text: 'Apply cylindrical shading with a highlight down the center',
              highlightArea: { x: 200, y: 150, width: 100, height: 150 },
              requiredAction: 'add_cylindrical_shading',
              validation: {
                type: 'cylindrical_shading',
                params: { highlight: 'center', gradation: 'curved' },
                threshold: 0.6,
              },
            },
          ],
          referenceImage: 'lesson_5_cylinder_reference',
          guideLayers: [],
          hints: [
            {
              id: 'hint_5_1',
              triggerCondition: 'instruction_3_fail',
              content: 'The shading should curve around the form - think of wrapping paper around a tube',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil'],
          estimatedDuration: 10,
        },
        assessment: {
          criteria: [
            {
              id: 'cylinder_construction',
              description: 'Proper cylinder construction',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'ellipse_accuracy',
              description: 'Correct ellipse shapes',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'cylindrical_shading',
              description: 'Appropriate curved shading',
              weight: 0.3,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus_multiple_angles',
              description: 'Draw cylinders at different angles',
              xpBonus: 45,
            },
          ],
        },
        xpReward: 200,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson_4_light_shadow' },
        ],
        tags: ['cylinder', 'form', 'volume', 'ellipse'],
      },

      // Simplified versions of remaining lessons (6-15)
      // Each would have similar detailed structure in production

      ...this.createRemainingLessons(), // This would contain lessons 6-15
    ];

    return lessons;
  }

  private createRemainingLessons(): Lesson[] {
    // Simplified lesson templates for lessons 6-15
    const remainingLessons: Lesson[] = [];
    
    const lessonTemplates = [
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
        skillTreeId: 'fundamentals',
        title: template.title,
        description: template.description,
        thumbnailUrl: `${template.id}_thumb`,
        duration: 12 + (index * 2), // Progressive difficulty
        difficulty: Math.min(5, Math.floor(index / 3) + 2) as 1 | 2 | 3 | 4 | 5,
                order: index + 6,
        prerequisites: index > 0 ? [lessonTemplates[index - 1].id] : ['lesson_5_form_volume'],
        objectives: [
          { id: `obj_${index + 6}_1`, description: `Master ${template.title.toLowerCase()}`, completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { text: `Learn the principles of ${template.title.toLowerCase()}` },
              duration: 90,
            },
          ],
          estimatedDuration: 3,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: `Apply ${template.title.toLowerCase()} techniques`,
              highlightArea: { x: 150, y: 150, width: 200, height: 200 },
              requiredAction: 'practice_technique',
              validation: {
                type: 'completion',
                params: { minProgress: 0.8 },
                threshold: 0.7,
              },
            },
          ],
          referenceImage: `${template.id}_reference`,
          guideLayers: [],
          hints: [],
          toolsRequired: ['pencil'],
          estimatedDuration: 8 + index,
        },
        assessment: {
          criteria: [
            {
              id: 'technique_application',
              description: `Proper ${template.title.toLowerCase()} application`,
              weight: 1.0,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [],
        },
        xpReward: template.xp,
        unlockRequirements: index > 0 ? [
          { type: 'lesson', value: lessonTemplates[index - 1].id },
        ] : [
          { type: 'lesson', value: 'lesson_5_form_volume' },
        ],
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

  public getAvailableLessons(): Lesson[] {
    if (!this.userProgress) return [];

    const available: Lesson[] = [];
    
    for (const tree of this.skillTrees.values()) {
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

    // Check unlock requirements
    for (const requirement of lesson.unlockRequirements) {
      if (!this.meetsRequirement(requirement)) {
        return false;
      }
    }

    return true;
  }

  private meetsRequirement(requirement: any): boolean {
    // Simplified requirement checking
    switch (requirement.type) {
      case 'lesson':
        return this.userProgress?.completedLessons.includes(requirement.value) || false;
      case 'level':
        // Would check user level
        return true;
      case 'xp':
        return (this.userProgress?.totalXP || 0) >= requirement.value;
      default:
        return false;
    }
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

    // Add XP
    this.userProgress.totalXP += lesson.xpReward;

    // Update skill tree progress
    let treeProgress = this.userProgress.skillTrees.find(
      // FIXED: Added explicit type annotation for treeProgress parameter
      (treeProgress: SkillTreeProgress) => treeProgress.skillTreeId === lesson.skillTreeId
    );

    if (!treeProgress) {
      treeProgress = {
        skillTreeId: lesson.skillTreeId,
        unlockedLessons: [],
        completedLessons: [],
        totalXpEarned: 0,
        lastAccessedAt: new Date(),
      };
      this.userProgress.skillTrees.push(treeProgress);
    }

    if (!treeProgress.completedLessons.includes(lessonId)) {
      treeProgress.completedLessons.push(lessonId);
    }

    treeProgress.totalXpEarned += lesson.xpReward;
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

    // FIXED: Added explicit type annotation for progress parameter
    this.userProgress.skillTrees.forEach((progress: SkillTreeProgress) => {
      const tree = this.skillTrees.get(progress.skillTreeId);
      if (tree) {
        const completionRate = progress.completedLessons.length / tree.lessons.length;
        tree.completionPercentage = Math.round(completionRate * 100);
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
  // Add these methods to the SkillTreeManager class:

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

  public getAvailableLessons(treeId?: string): Lesson[] {
    if (!this.userProgress) return [];

    const available: Lesson[] = [];
    const trees = treeId 
      ? [this.skillTrees.get(treeId)].filter(Boolean)
      : Array.from(this.skillTrees.values());
    
    for (const tree of trees) {
      if (!tree) continue;
      for (const lesson of tree.lessons) {
        if (this.isLessonUnlocked(lesson)) {
          available.push(lesson);
        }
      }
    }

    return available.sort((a, b) => a.order - b.order);
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