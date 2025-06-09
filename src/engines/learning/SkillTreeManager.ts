import { 
  SkillTree, 
  Lesson, 
  SkillCategory,
  UnlockRequirement,
  SkillTreeProgress,
  TheorySegment,
  PracticeInstruction,
  Assessment,
  ValidationRule
} from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';
import { profileSystem } from '../user/ProfileSystem';

/**
 * Manages skill trees and lesson progression paths
 * Complete implementation with 5 interactive lessons
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
      lessons: this.createCompleteLessons(),
      totalXP: 1500,
      completionPercentage: 0,
    };

    this.skillTrees.set(fundamentalsTree.id, fundamentalsTree);
  }

  private createCompleteLessons(): Lesson[] {
    return [
      // Lesson 1: Lines & Basic Shapes
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
                text: 'Welcome to your drawing journey! Every masterpiece starts with confident lines. Today, we\'ll master the foundation of all art - the ability to control your hand and create deliberate marks.',
                emphasis: 'primary' 
              },
              duration: 20,
            },
            {
              type: 'interactive',
              content: {
                type: 'pressure-demo',
                instruction: 'Try pressing harder and softer to see how it affects line weight',
                showPressureIndicator: true,
                targetPressureRange: { min: 0.2, max: 0.8 }
              },
              duration: 30,
            },
            {
              type: 'video',
              content: {
                url: 'line_technique_demo',
                caption: 'Professional artists use their whole arm, not just the wrist',
                keyPoints: [
                  'Lock your wrist for straight lines',
                  'Use shoulder movement for long strokes',
                  'Vary pressure for expressive lines'
                ]
              },
              duration: 45,
            },
            {
              type: 'text',
              content: {
                text: 'The secret to perfect circles? Don\'t try to draw them slowly! Use confident, quick motions and let muscle memory guide you.',
                emphasis: 'tip'
              },
              duration: 15,
            }
          ],
          estimatedDuration: 120,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw 5 horizontal straight lines. Keep them parallel and evenly spaced.',
              highlightArea: { x: 100, y: 100, width: 600, height: 300 },
              requiredAction: 'draw_lines',
              validation: {
                type: 'stroke_count',
                params: { min: 5, max: 10, expectedOrientation: 'horizontal' },
                threshold: 0.8,
              },
            },
            {
              step: 2,
              text: 'Now draw 5 vertical lines. Vary the pressure from light to heavy.',
              highlightArea: { x: 100, y: 100, width: 600, height: 400 },
              requiredAction: 'draw_lines_pressure',
              validation: {
                type: 'stroke_count',
                params: { 
                  min: 5, 
                  max: 10, 
                  checkPressure: true,
                  expectedOrientation: 'vertical',
                  pressureVariation: 0.3
                },
                threshold: 0.8,
              },
            },
            {
              step: 3,
              text: 'Draw 3 perfect circles using quick, confident motions.',
              highlightArea: { x: 150, y: 150, width: 500, height: 500 },
              requiredAction: 'draw_circles',
              validation: {
                type: 'shape_accuracy',
                params: { 
                  targetShape: 'circle', 
                  count: 3,
                  minRadius: 50,
                  maxRadius: 150,
                  circularityThreshold: 0.85
                },
                threshold: 0.75,
              },
            },
            {
              step: 4,
              text: 'Create a pattern using lines and circles together. Be creative!',
              highlightArea: { x: 50, y: 50, width: 700, height: 700 },
              requiredAction: 'free_draw',
              validation: {
                type: 'completion',
                params: { 
                  minStrokes: 8,
                  requiresLines: true,
                  requiresCircles: true
                },
                threshold: 1.0,
              },
            },
          ],
          referenceImage: 'lines_circles_reference',
          guideLayers: [
            {
              id: 'guide-grid',
              type: 'grid',
              visible: true,
              opacity: 0.2,
              data: { spacing: 50, color: '#E5E7EB' },
            },
            {
              id: 'guide-circles',
              type: 'overlay',
              visible: false,
              opacity: 0.3,
              data: { 
                shapes: [
                  { type: 'circle', x: 200, y: 400, radius: 80 },
                  { type: 'circle', x: 400, y: 400, radius: 80 },
                  { type: 'circle', x: 600, y: 400, radius: 80 }
                ]
              },
            },
          ],
          hints: [
            {
              id: 'hint-straight-lines',
              triggerCondition: 'instruction_0_fail',
              content: 'Lock your wrist and move from your shoulder for straighter lines. Speed helps!',
              type: 'tip',
            },
            {
              id: 'hint-pressure',
              triggerCondition: 'instruction_1_fail',
              content: 'Start with light pressure and gradually increase. Think of it like pressing a pencil harder on paper.',
              type: 'tip',
            },
            {
              id: 'hint-circles',
              triggerCondition: 'instruction_2_fail',
              content: 'Don\'t go slow! Quick, confident motions create better circles. Try drawing them counter-clockwise.',
              type: 'correction',
            },
            {
              id: 'hint-encouragement',
              triggerCondition: 'time_exceeded_180s',
              content: 'You\'re doing great! Remember, even master artists practice these basics daily.',
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
              weight: 0.3,
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
            {
              id: 'creativity',
              description: 'Shows creativity in final pattern',
              weight: 0.1,
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
              id: 'bonus-perfect-circles',
              description: 'All circles over 90% accuracy',
              xpBonus: 75,
            },
            {
              id: 'bonus-no-hints',
              description: 'Complete without using hints',
              xpBonus: 25,
            },
          ],
        },
        xpReward: 100,
        unlockRequirements: [],
        tags: ['fundamentals', 'lines', 'shapes', 'pressure', 'beginner'],
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
          { id: 'obj-2-3', description: 'Create recognizable objects from simple forms', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { 
                text: 'Here\'s a secret that will transform your drawing: Everything you see can be broken down into simple shapes. This technique is used by every professional artist!',
                emphasis: 'primary' 
              },
              duration: 20,
            },
            {
              type: 'interactive',
              content: {
                type: 'shape-breakdown',
                instruction: 'Watch how this apple transforms from basic circles',
                steps: [
                  { shapes: ['circle'], label: 'Start with main body' },
                  { shapes: ['circle', 'small-circle'], label: 'Add top indent' },
                  { shapes: ['circle', 'small-circle', 'curves'], label: 'Connect with curves' },
                  { shapes: ['apple'], label: 'Final apple!' }
                ]
              },
              duration: 45,
            },
            {
              type: 'image',
              content: {
                url: 'shape_construction_examples',
                caption: 'Complex objects built from simple shapes',
                annotations: [
                  { object: 'house', shapes: ['triangle', 'rectangle'] },
                  { object: 'tree', shapes: ['circle', 'rectangle'] },
                  { object: 'car', shapes: ['rectangles', 'circles'] }
                ]
              },
              duration: 30,
            },
          ],
          estimatedDuration: 150,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw a large circle for the apple body. Make it slightly wider than tall.',
              highlightArea: { x: 250, y: 250, width: 300, height: 300 },
              requiredAction: 'draw_circle',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'circle',
                  expectedSize: { width: 250, height: 240, tolerance: 50 },
                  position: { x: 400, y: 400, tolerance: 100 }
                },
                threshold: 0.7,
              },
            },
            {
              step: 2,
              text: 'Add a smaller circle at the top for the indent where the stem goes.',
              highlightArea: { x: 350, y: 180, width: 100, height: 100 },
              requiredAction: 'draw_circle_small',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'circle',
                  expectedSize: { width: 80, height: 80, tolerance: 30 },
                  position: { x: 400, y: 230, tolerance: 50 }
                },
                threshold: 0.7,
              },
            },
            {
              step: 3,
              text: 'Connect the circles with smooth curves to form the apple shape.',
              highlightArea: { x: 200, y: 200, width: 400, height: 350 },
              requiredAction: 'draw_curves',
              validation: {
                type: 'completion',
                params: {
                  minStrokes: 2,
                  expectedCurves: true,
                  smoothnessThreshold: 0.8
                },
                threshold: 0.8,
              },
            },
            {
              step: 4,
              text: 'Add a stem and a leaf to complete your apple.',
              highlightArea: { x: 380, y: 180, width: 40, height: 100 },
              requiredAction: 'draw_details',
              validation: {
                type: 'completion',
                params: {
                  minStrokes: 2,
                  requiresStem: true,
                  optionalLeaf: true
                },
                threshold: 1.0,
              },
            },
            {
              step: 5,
              text: 'Now create a simple house using rectangles and triangles.',
              highlightArea: { x: 100, y: 450, width: 600, height: 300 },
              requiredAction: 'draw_house',
              validation: {
                type: 'shape_construction',
                params: {
                  requiredShapes: ['rectangle', 'triangle'],
                  minShapes: 3,
                  recognizable: 'house'
                },
                threshold: 0.8,
              },
            },
          ],
          referenceImage: 'shape_construction_guide',
          guideLayers: [
            {
              id: 'guide-apple',
              type: 'reference',
              visible: true,
              opacity: 0.15,
              data: { image: 'apple_construction_steps' },
            },
            {
              id: 'guide-house',
              type: 'reference',
              visible: false,
              opacity: 0.15,
              data: { image: 'house_construction_guide' },
            },
          ],
          hints: [
            {
              id: 'hint-apple-shape',
              triggerCondition: 'step_2_incomplete',
              content: 'The top circle should overlap the main circle slightly. Think of where an apple dips in at the top.',
              type: 'tip',
            },
            {
              id: 'hint-smooth-curves',
              triggerCondition: 'instruction_2_fail',
              content: 'Use flowing strokes to connect the circles. The curves should feel natural, like the outline of a real apple.',
              type: 'correction',
            },
            {
              id: 'hint-house',
              triggerCondition: 'instruction_4_fail',
              content: 'Start with a rectangle for the walls, then add a triangle on top for the roof. Add smaller rectangles for doors and windows!',
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
              description: 'Successfully used basic shapes as construction',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'smooth-connection',
              description: 'Shapes connect smoothly and naturally',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'recognizable-objects',
              description: 'Created recognizable objects',
              weight: 0.3,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus-detail',
              description: 'Add shading or texture to objects',
              xpBonus: 50,
            },
            {
              id: 'bonus-creative',
              description: 'Create an additional object using shapes',
              xpBonus: 75,
            },
          ],
        },
        xpReward: 120,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson-1-lines-shapes' },
        ],
        tags: ['fundamentals', 'construction', 'shapes', 'beginner'],
      },

      // Lesson 3: Perspective Basics
      {
        id: 'lesson-3-perspective',
        skillTreeId: 'drawing-fundamentals',
        title: 'Perspective Basics',
        description: 'Learn to create depth with one-point perspective',
        thumbnailUrl: 'lesson_3_thumb',
        duration: 12,
        difficulty: 2,
        order: 3,
        prerequisites: ['lesson-2-shape-construction'],
        objectives: [
          { id: 'obj-3-1', description: 'Understand vanishing points and horizon lines', completed: false },
          { id: 'obj-3-2', description: 'Draw objects in correct perspective', completed: false },
          { id: 'obj-3-3', description: 'Create the illusion of depth', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { 
                text: 'Perspective is what makes flat drawings look 3D. It\'s the magic that brings depth to your art. Today, we\'ll master one-point perspective - the foundation of all spatial drawing.',
                emphasis: 'primary' 
              },
              duration: 20,
            },
            {
              type: 'interactive',
              content: {
                type: 'perspective-demo',
                instruction: 'Drag the vanishing point to see how it affects the cube',
                controls: ['vanishingPoint', 'horizonLine'],
                showGuides: true,
                object: 'cube'
              },
              duration: 60,
            },
            {
              type: 'video',
              content: {
                url: 'perspective_explanation',
                caption: 'How parallel lines converge to create depth',
                keyMoments: [
                  { time: 10, label: 'Horizon line placement' },
                  { time: 25, label: 'Finding the vanishing point' },
                  { time: 40, label: 'Drawing perspective lines' }
                ]
              },
              duration: 60,
            },
          ],
          estimatedDuration: 180,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw a horizon line across the middle of your canvas.',
              highlightArea: { x: 50, y: 380, width: 700, height: 40 },
              requiredAction: 'draw_horizon',
              validation: {
                type: 'line_detection',
                params: {
                  expectedOrientation: 'horizontal',
                  positionY: { target: 400, tolerance: 50 },
                  minLength: 600
                },
                threshold: 0.8,
              },
            },
            {
              step: 2,
              text: 'Place a vanishing point on the horizon line.',
              highlightArea: { x: 350, y: 380, width: 100, height: 40 },
              requiredAction: 'mark_point',
              validation: {
                type: 'point_placement',
                params: {
                  expectedPosition: { x: 400, y: 400, tolerance: 100 },
                  onHorizonLine: true
                },
                threshold: 0.9,
              },
            },
            {
              step: 3,
              text: 'Draw a square for the front face of a cube.',
              highlightArea: { x: 250, y: 450, width: 150, height: 150 },
              requiredAction: 'draw_square',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'square',
                  expectedSize: { width: 120, height: 120, tolerance: 30 },
                  belowHorizon: true
                },
                threshold: 0.7,
              },
            },
            {
              step: 4,
              text: 'Draw lines from each corner of the square to the vanishing point.',
              highlightArea: { x: 200, y: 350, width: 400, height: 300 },
              requiredAction: 'draw_perspective_lines',
              validation: {
                type: 'perspective_lines',
                params: {
                  fromShape: 'square',
                  toPoint: 'vanishing_point',
                  expectedLines: 4,
                  convergenceAccuracy: 0.85
                },
                threshold: 0.8,
              },
            },
            {
              step: 5,
              text: 'Complete the cube by drawing the back face and connecting lines.',
              highlightArea: { x: 200, y: 350, width: 400, height: 300 },
              requiredAction: 'complete_cube',
              validation: {
                type: 'shape_completion',
                params: {
                  targetShape: 'cube_perspective',
                  requiredLines: 3,
                  perspectiveAccuracy: 0.8
                },
                threshold: 0.8,
              },
            },
            {
              step: 6,
              text: 'Add a second cube on the opposite side to practice more!',
              highlightArea: { x: 400, y: 450, width: 300, height: 200 },
              requiredAction: 'draw_second_cube',
              validation: {
                type: 'shape_construction',
                params: {
                  targetShape: 'cube_perspective',
                  perspectiveConsistency: true,
                  vanishingPointMatch: true
                },
                threshold: 0.7,
              },
            },
          ],
          referenceImage: 'perspective_cube_guide',
          guideLayers: [
            {
              id: 'guide-perspective',
              type: 'overlay',
              visible: true,
              opacity: 0.2,
              data: { 
                lines: [
                  { type: 'horizon', y: 400 },
                  { type: 'vanishing_point', x: 400, y: 400 }
                ]
              },
            },
            {
              id: 'guide-cube',
              type: 'reference',
              visible: false,
              opacity: 0.2,
              data: { image: 'perspective_cube_overlay' },
            },
          ],
          hints: [
            {
              id: 'hint-horizon',
              triggerCondition: 'instruction_0_fail',
              content: 'The horizon line represents your eye level. Keep it straight and horizontal!',
              type: 'tip',
            },
            {
              id: 'hint-vanishing',
              triggerCondition: 'instruction_3_fail',
              content: 'All parallel lines that go away from you should meet at the vanishing point. Use a ruler or guide if needed!',
              type: 'correction',
            },
            {
              id: 'hint-cube-back',
              triggerCondition: 'instruction_4_fail',
              content: 'The back of the cube should be smaller than the front. Draw it where the perspective lines would naturally create another square.',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil', 'ruler'],
          estimatedDuration: 420,
        },
        assessment: {
          criteria: [
            {
              id: 'perspective-understanding',
              description: 'Demonstrates understanding of vanishing points',
              weight: 0.4,
              evaluationType: 'automatic',
            },
            {
              id: 'line-convergence',
              description: 'Lines converge correctly to vanishing point',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'spatial-accuracy',
              description: 'Objects show proper depth and proportion',
              weight: 0.3,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus-multiple-objects',
              description: 'Draw 3 or more objects in perspective',
              xpBonus: 75,
            },
            {
              id: 'bonus-complex-shapes',
              description: 'Add cylinders or pyramids in perspective',
              xpBonus: 100,
            },
          ],
        },
        xpReward: 150,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson-2-shape-construction' },
        ],
        tags: ['fundamentals', 'perspective', '3D', 'spatial', 'intermediate'],
      },

      // Lesson 4: Light & Shadow
      {
        id: 'lesson-4-light-shadow',
        skillTreeId: 'drawing-fundamentals',
        title: 'Light & Shadow',
        description: 'Master the art of shading to bring your drawings to life',
        thumbnailUrl: 'lesson_4_thumb',
        duration: 12,
        difficulty: 2,
        order: 4,
        prerequisites: ['lesson-3-perspective'],
        objectives: [
          { id: 'obj-4-1', description: 'Understand how light creates form', completed: false },
          { id: 'obj-4-2', description: 'Master basic shading techniques', completed: false },
          { id: 'obj-4-3', description: 'Create realistic shadows', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { 
                text: 'Light and shadow are what transform flat shapes into three-dimensional forms. Understanding how light behaves is crucial for creating believable, lifelike drawings.',
                emphasis: 'primary' 
              },
              duration: 20,
            },
            {
              type: 'interactive',
              content: {
                type: 'light-demo',
                instruction: 'Move the light source to see how shadows change',
                controls: ['lightPosition', 'lightIntensity'],
                objects: ['sphere', 'cube', 'cylinder'],
                showTerminology: true
              },
              duration: 60,
            },
            {
              type: 'image',
              content: {
                url: 'shading_terminology',
                caption: 'The five elements of shading',
                labels: [
                  { term: 'Highlight', description: 'Brightest point where light hits directly' },
                  { term: 'Light', description: 'Areas facing the light source' },
                  { term: 'Shadow', description: 'Areas facing away from light' },
                  { term: 'Reflected Light', description: 'Subtle light bouncing back' },
                  { term: 'Cast Shadow', description: 'Shadow created on surfaces' }
                ]
              },
              duration: 45,
            },
          ],
          estimatedDuration: 180,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw a circle for a sphere. This will be our base shape.',
              highlightArea: { x: 300, y: 300, width: 200, height: 200 },
              requiredAction: 'draw_circle',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'circle',
                  expectedSize: { radius: 80, tolerance: 20 },
                  position: { x: 400, y: 400, tolerance: 50 }
                },
                threshold: 0.8,
              },
            },
            {
              step: 2,
              text: 'Indicate where the light source is coming from (top-right).',
              highlightArea: { x: 500, y: 250, width: 100, height: 100 },
              requiredAction: 'mark_light_source',
              validation: {
                type: 'point_placement',
                params: {
                  expectedArea: { x: 550, y: 300, radius: 100 },
                  visualIndicator: 'sun_or_arrow'
                },
                threshold: 0.9,
              },
            },
            {
              step: 3,
              text: 'Add the highlight - a small bright area where light hits directly.',
              highlightArea: { x: 420, y: 350, width: 40, height: 40 },
              requiredAction: 'add_highlight',
              validation: {
                type: 'shading_element',
                params: {
                  element: 'highlight',
                  expectedPosition: 'top_right_quadrant',
                  size: 'small',
                  value: 'lightest'
                },
                threshold: 0.8,
              },
            },
            {
              step: 4,
              text: 'Shade the shadow side with smooth gradations. Start light and get darker.',
              highlightArea: { x: 300, y: 380, width: 200, height: 120 },
              requiredAction: 'add_core_shadow',
              validation: {
                type: 'shading_gradation',
                params: {
                  area: 'opposite_light_source',
                  smoothness: 0.7,
                  valueRange: { light: 0.3, dark: 0.8 }
                },
                threshold: 0.7,
              },
            },
            {
              step: 5,
              text: 'Add reflected light - a subtle lighter area within the shadow.',
              highlightArea: { x: 320, y: 450, width: 60, height: 30 },
              requiredAction: 'add_reflected_light',
              validation: {
                type: 'shading_element',
                params: {
                  element: 'reflected_light',
                  withinShadow: true,
                  subtlety: 0.8
                },
                threshold: 0.7,
              },
            },
            {
              step: 6,
              text: 'Draw the cast shadow on the ground. It should stretch away from the light.',
              highlightArea: { x: 300, y: 480, width: 250, height: 80 },
              requiredAction: 'add_cast_shadow',
              validation: {
                type: 'cast_shadow',
                params: {
                  direction: 'away_from_light',
                  connection: 'touches_object',
                  fadeOut: true
                },
                threshold: 0.8,
              },
            },
          ],
          referenceImage: 'sphere_shading_guide',
          guideLayers: [
            {
              id: 'guide-light-direction',
              type: 'overlay',
              visible: true,
              opacity: 0.3,
              data: { 
                arrows: [{ from: { x: 550, y: 300 }, to: { x: 400, y: 400 } }],
                gradient: 'radial_from_light'
              },
            },
            {
              id: 'guide-value-map',
              type: 'reference',
              visible: false,
              opacity: 0.3,
              data: { image: 'sphere_value_zones' },
            },
          ],
          hints: [
            {
              id: 'hint-highlight',
              triggerCondition: 'instruction_2_fail',
              content: 'The highlight should be small and on the side facing the light. It\'s the brightest spot!',
              type: 'tip',
            },
            {
              id: 'hint-smooth-shading',
              triggerCondition: 'instruction_3_fail',
              content: 'Use circular motions to blend the shading smoothly. Think of how light gradually fades into shadow.',
              type: 'correction',
            },
            {
              id: 'hint-reflected',
              triggerCondition: 'instruction_4_fail',
              content: 'Reflected light is subtle - it\'s lighter than the core shadow but never as bright as the lit side.',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil', 'blending'],
          estimatedDuration: 480,
        },
        assessment: {
          criteria: [
            {
              id: 'light-logic',
              description: 'Light source and shadows are logically consistent',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'value-range',
              description: 'Uses full range of values from light to dark',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'smooth-gradation',
              description: 'Shading transitions are smooth and natural',
              weight: 0.2,
              evaluationType: 'automatic',
            },
            {
              id: 'form-creation',
              description: 'Successfully creates 3D form through shading',
              weight: 0.2,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus-multiple-objects',
              description: 'Shade a cube and cylinder too',
              xpBonus: 100,
            },
            {
              id: 'bonus-texture',
              description: 'Add surface texture while maintaining form',
              xpBonus: 75,
            },
          ],
        },
        xpReward: 150,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson-3-perspective' },
        ],
        tags: ['fundamentals', 'shading', 'light', 'shadow', 'form', 'intermediate'],
      },

      // Lesson 5: Form & Volume
      {
        id: 'lesson-5-form-volume',
        skillTreeId: 'drawing-fundamentals',
        title: 'Form & Volume',
        description: 'Transform 2D shapes into believable 3D forms',
        thumbnailUrl: 'lesson_5_thumb',
        duration: 15,
        difficulty: 2,
        order: 5,
        prerequisites: ['lesson-4-light-shadow'],
        objectives: [
          { id: 'obj-5-1', description: 'Convert basic shapes into 3D forms', completed: false },
          { id: 'obj-5-2', description: 'Understand how forms interact in space', completed: false },
          { id: 'obj-5-3', description: 'Create complex objects from simple volumes', completed: false },
        ],
        theoryContent: {
          segments: [
            {
              type: 'text',
              content: { 
                text: 'Now we\'ll combine everything you\'ve learned! Form and volume are about making your drawings feel solid and real. We\'ll transform flat shapes into three-dimensional objects that seem to jump off the page.',
                emphasis: 'primary' 
              },
              duration: 20,
            },
            {
              type: 'interactive',
              content: {
                type: 'form-rotation',
                instruction: 'Rotate these forms to understand their 3D structure',
                forms: [
                  { shape: 'cylinder', showConstruction: true },
                  { shape: 'cone', showConstruction: true },
                  { shape: 'torus', showConstruction: true }
                ],
                controls: ['rotation', 'wireframe', 'shading']
              },
              duration: 60,
            },
            {
              type: 'video',
              content: {
                url: 'form_construction_process',
                caption: 'Building complex objects from simple forms',
                demonstrations: [
                  'Cylinder from rectangle + ellipses',
                  'Human figure from cylinders and spheres',
                  'Architecture from boxes and pyramids'
                ]
              },
              duration: 90,
            },
          ],
          estimatedDuration: 200,
        },
        practiceContent: {
          instructions: [
            {
              step: 1,
              text: 'Draw a vertical rectangle for the cylinder body.',
              highlightArea: { x: 350, y: 300, width: 100, height: 200 },
              requiredAction: 'draw_rectangle',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'rectangle',
                  expectedSize: { width: 80, height: 180, tolerance: 20 },
                  orientation: 'vertical'
                },
                threshold: 0.8,
              },
            },
            {
              step: 2,
              text: 'Add an ellipse at the top for the cylinder opening.',
              highlightArea: { x: 350, y: 280, width: 100, height: 40 },
              requiredAction: 'draw_ellipse_top',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'ellipse',
                  expectedSize: { width: 80, height: 30, tolerance: 10 },
                  alignmentWith: 'rectangle_top'
                },
                threshold: 0.8,
              },
            },
            {
              step: 3,
              text: 'Draw a partial ellipse at the bottom (only the front curve visible).',
              highlightArea: { x: 350, y: 480, width: 100, height: 40 },
              requiredAction: 'draw_ellipse_bottom',
              validation: {
                type: 'shape_accuracy',
                params: {
                  targetShape: 'partial_ellipse',
                  expectedCurve: 'front_only',
                  alignmentWith: 'rectangle_bottom'
                },
                threshold: 0.7,
              },
            },
            {
              step: 4,
              text: 'Add shading to show the cylinder\'s roundness. Light from top-right.',
              highlightArea: { x: 350, y: 300, width: 100, height: 200 },
              requiredAction: 'shade_cylinder',
              validation: {
                type: 'cylindrical_shading',
                params: {
                  gradientDirection: 'horizontal',
                  lightSide: 'right',
                  coreShaddow: 'left',
                  smoothness: 0.8
                },
                threshold: 0.7,
              },
            },
            {
              step: 5,
              text: 'Add a cast shadow to ground the cylinder.',
              highlightArea: { x: 320, y: 500, width: 160, height: 60 },
              requiredAction: 'add_ground_shadow',
              validation: {
                type: 'cast_shadow',
                params: {
                  shape: 'elliptical',
                  direction: 'left',
                  connection: 'base_of_cylinder'
                },
                threshold: 0.8,
              },
            },
            {
              step: 6,
              text: 'Create a cone next to the cylinder using the same principles.',
              highlightArea: { x: 500, y: 350, width: 150, height: 200 },
              requiredAction: 'draw_cone',
              validation: {
                type: 'form_construction',
                params: {
                  targetForm: 'cone',
                  requiredElements: ['triangle_body', 'ellipse_base', 'shading'],
                  consistency: 'matches_cylinder_lighting'
                },
                threshold: 0.7,
              },
            },
          ],
          referenceImage: 'forms_construction_guide',
          guideLayers: [
            {
              id: 'guide-construction',
              type: 'overlay',
              visible: true,
              opacity: 0.2,
              data: { 
                shapes: [
                  { type: 'centerline', x: 400, y1: 300, y2: 500 },
                  { type: 'ellipse_guide', x: 400, y: 300, width: 80, height: 30 }
                ]
              },
            },
            {
              id: 'guide-lighting',
              type: 'reference',
              visible: false,
              opacity: 0.25,
              data: { image: 'cylinder_shading_reference' },
            },
          ],
          hints: [
            {
              id: 'hint-ellipse',
              triggerCondition: 'instruction_1_fail',
              content: 'Ellipses get rounder as they move toward eye level. The top should be narrower than if you were looking straight at it.',
              type: 'tip',
            },
            {
              id: 'hint-cylinder-shading',
              triggerCondition: 'instruction_3_fail',
              content: 'Cylinder shading wraps around the form. Start light on one side and gradually darken as it turns away from light.',
              type: 'correction',
            },
            {
              id: 'hint-cone',
              triggerCondition: 'instruction_5_fail',
              content: 'A cone is just a triangle sitting on an ellipse! The shading radiates from the point down to the base.',
              type: 'tip',
            },
          ],
          toolsRequired: ['pencil', 'blending'],
          estimatedDuration: 600,
        },
        assessment: {
          criteria: [
            {
              id: 'form-construction',
              description: 'Successfully constructs 3D forms from 2D shapes',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'perspective-consistency',
              description: 'Forms show consistent perspective',
              weight: 0.2,
              evaluationType: 'automatic',
            },
            {
              id: 'volume-shading',
              description: 'Shading effectively creates sense of volume',
              weight: 0.3,
              evaluationType: 'automatic',
            },
            {
              id: 'spatial-relationship',
              description: 'Objects relate properly in 3D space',
              weight: 0.2,
              evaluationType: 'automatic',
            },
          ],
          passingScore: 0.7,
          bonusObjectives: [
            {
              id: 'bonus-complex-form',
              description: 'Create a complex object from multiple forms',
              xpBonus: 150,
            },
            {
              id: 'bonus-transparency',
              description: 'Show a transparent cylinder or glass',
              xpBonus: 100,
            },
          ],
        },
        xpReward: 200,
        unlockRequirements: [
          { type: 'lesson', value: 'lesson-4-light-shadow' },
        ],
        tags: ['fundamentals', 'form', 'volume', '3D', 'construction', 'intermediate'],
      },
    ];
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
    // First lesson is always available
    if (lesson.order === 1) return true;

    // Check prerequisites
    for (const prereq of lesson.prerequisites) {
      if (!progress?.completedLessons.includes(prereq)) {
        return false;
      }
    }

    // Check unlock requirements
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
    const user = profileSystem.getCurrentUser();
    
    await dataManager.saveLearningProgress({
      userId: user?.id || '',
      skillTrees: progressArray,
      totalXP: progressArray.reduce((sum, p) => sum + p.totalXpEarned, 0),
      currentStreak: user?.streakDays || 0,
      longestStreak: user?.streakDays || 0,
      dailyGoal: 100,
      dailyProgress: 0,
      completedLessons: progressArray.flatMap(p => p.completedLessons),
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

  public subscribeToProgress(callback: (progress: Map<string, SkillTreeProgress>) => void): () => void {
    this.progressListeners.add(callback);
    callback(this.userProgress);
    return () => this.progressListeners.delete(callback);
  }

  private notifyProgressListeners(): void {
    this.progressListeners.forEach(callback => callback(this.userProgress));
  }
  // FIXED: Add missing initialize method
public async initialize(): Promise<void> {
  console.log('SkillTreeManager initialized');
}

// FIXED: Add missing getAllLessons method
public getAllLessons(): Lesson[] {
  const allLessons: Lesson[] = [];
  this.skillTrees.forEach(tree => {
    allLessons.push(...tree.lessons);
  });
  return allLessons.sort((a, b) => a.order - b.order);
}

// FIXED: Add missing getUnlockedLessons method  
public getUnlockedLessons(): string[] {
  const unlockedLessons: string[] = [];
  const user = profileSystem.getCurrentUser();
  
  this.skillTrees.forEach(tree => {
    const progress = this.userProgress.get(tree.id);
    const availableLessons = this.getAvailableLessons(tree.id);
    
    availableLessons.forEach(lesson => {
      if (this.checkLessonRequirements(lesson, progress, user)) {
        unlockedLessons.push(lesson.id);
      }
    });
  });
  
  return unlockedLessons;
}

// FIXED: Add missing checkUnlockRequirements method
public checkUnlockRequirements(lessonId: string): boolean {
  const lesson = this.getLesson(lessonId);
  if (!lesson) return false;
  
  const progress = this.userProgress.get(lesson.skillTreeId);
  const user = profileSystem.getCurrentUser();
  
  return this.checkLessonRequirements(lesson, progress, user);
}

// FIXED: Add missing loadContent method  
public async loadContent(): Promise<void> {
  console.log('SkillTreeManager content loaded');
}
}

// Export singleton instance
export const skillTreeManager = SkillTreeManager.getInstance();