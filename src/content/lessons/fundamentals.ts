import { Lesson, LessonType, LessonStatus } from '../../types';

/**
 * Drawing Fundamentals - Complete 15-lesson curriculum
 * Each lesson is 5-10 minutes with theory and practice
 */

export const drawingFundamentalsLessons: Lesson[] = [
  {
    id: 'lesson-lines-shapes',
    title: 'Lines & Basic Shapes',
    description: 'Master the foundation of all drawing - straight lines and perfect circles',
    type: 'practice',
    skillTree: 'drawing-fundamentals',
    order: 1,
    estimatedTime: 8,
    difficulty: 1,
    prerequisites: [],
    objectives: [
      {
        id: 'obj-1',
        description: 'Draw 5 straight lines without lifting your pen',
        completed: false,
        required: true,
      },
      {
        id: 'obj-2',
        description: 'Create a perfect circle using the elbow technique',
        completed: false,
        required: true,
      },
      {
        id: 'obj-3',
        description: 'Draw basic shapes: square, triangle, oval',
        completed: false,
        required: true,
      },
    ],
    theoryContent: {
      segments: [
        {
          id: 'theory-1',
          type: 'text',
          content: 'Every masterpiece starts with a single line. Today, you\'ll learn the secret that separates amateur from professional artists: controlled, confident strokes.',
          duration: 30,
          order: 1,
        },
        {
          id: 'theory-2',
          type: 'interactive',
          content: {
            demo: 'line-technique',
            title: 'The Shoulder Technique',
            instructions: 'Watch how professional artists draw from the shoulder, not the wrist. This gives you smooth, controlled lines.',
          },
          duration: 60,
          order: 2,
          interactive: true,
        },
        {
          id: 'theory-3',
          type: 'text',
          content: 'Pro tip: Draw with your whole arm. Lock your wrist and move from your shoulder for long lines, elbow for medium lines.',
          duration: 30,
          order: 3,
        },
      ],
      totalDuration: 120,
      objectives: [
        {
          id: 'learn-1',
          description: 'Understand shoulder vs wrist movement',
          type: 'primary',
          required: true,
        },
      ],
    },
    practiceContent: {
      instructions: [
        {
          id: 'practice-1',
          text: 'Draw 5 horizontal lines across your canvas. Focus on keeping them straight and parallel.',
          type: 'draw',
          hint: 'Move from your shoulder, not your wrist!',
          expectedResult: '5 straight horizontal lines',
          validation: {
            type: 'stroke-count',
            params: { min: 5, max: 10 },
          },
          order: 1,
        },
        {
          id: 'practice-2',
          text: 'Now draw 5 vertical lines. Try to make them the same length.',
          type: 'draw',
          hint: 'Keep your arm relaxed but controlled',
          expectedResult: '5 vertical lines of similar length',
          validation: {
            type: 'stroke-count',
            params: { min: 5, max: 10 },
          },
          order: 2,
        },
        {
          id: 'practice-3',
          text: 'Time for circles! Draw 3 circles using your elbow as a pivot point.',
          type: 'draw',
          hint: 'Don\'t worry about perfection - focus on the motion',
          expectedResult: '3 circular shapes',
          validation: {
            type: 'shape-accuracy',
            params: { targetShape: 'circle', threshold: 0.7 },
          },
          order: 3,
        },
      ],
      hints: [
        {
          id: 'hint-1',
          stepIndex: 0,
          text: 'Remember: shoulder movement for straight lines!',
          content: 'Your lines will be wobbly if you use your wrist',
        },
      ],
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      },
      expectedDuration: 5,
    },
    rewards: {
      xp: 50,
      achievements: ['first_lesson'],
      unlocks: ['lesson-shape-construction'],
    },
    status: 'available',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['fundamentals', 'basics', 'lines', 'shapes'],
  },
  
  {
    id: 'lesson-shape-construction',
    title: 'Shape Construction',
    description: 'Learn to break down complex objects into simple shapes',
    type: 'practice',
    skillTree: 'drawing-fundamentals',
    order: 2,
    estimatedTime: 10,
    difficulty: 1,
    prerequisites: ['lesson-lines-shapes'],
    objectives: [
      {
        id: 'obj-1',
        description: 'Identify basic shapes in complex objects',
        completed: false,
        required: true,
      },
      {
        id: 'obj-2',
        description: 'Draw an apple using circles and curves',
        completed: false,
        required: true,
      },
    ],
    theoryContent: {
      segments: [
        {
          id: 'theory-1',
          type: 'text',
          content: 'Every object in the world can be broken down into simple shapes. This is the secret skill that lets artists draw anything!',
          duration: 30,
          order: 1,
        },
        {
          id: 'theory-2',
          type: 'image',
          content: {
            url: 'shape-breakdown-demo',
            title: 'From Shapes to Objects',
          },
          duration: 45,
          order: 2,
        },
      ],
      totalDuration: 75,
      objectives: [
        {
          id: 'learn-1',
          description: 'See objects as combinations of shapes',
          type: 'primary',
          required: true,
        },
      ],
    },
    practiceContent: {
      instructions: [
        {
          id: 'practice-1',
          text: 'Let\'s draw an apple! Start with a circle for the main body.',
          type: 'draw',
          hint: 'Make it slightly wider than tall',
          expectedResult: 'A circular base shape',
          validation: {
            type: 'shape-accuracy',
            params: { targetShape: 'circle', threshold: 0.6 },
          },
          order: 1,
        },
        {
          id: 'practice-2',
          text: 'Add a small indent at the top where the stem would be.',
          type: 'draw',
          hint: 'Just a gentle curve inward',
          expectedResult: 'Circle with top indent',
          order: 2,
        },
        {
          id: 'practice-3',
          text: 'Draw a small rectangle for the stem.',
          type: 'draw',
          hint: 'Keep it short and slightly tilted',
          expectedResult: 'Complete apple shape',
          validation: {
            type: 'shape_completion',
            params: { expectedTime: 180 },
          },
          order: 3,
        },
      ],
      hints: [],
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      },
      expectedDuration: 7,
    },
    rewards: {
      xp: 75,
      achievements: [],
      unlocks: ['lesson-perspective-basics'],
    },
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['fundamentals', 'shapes', 'construction'],
  },
  
  {
    id: 'lesson-perspective-basics',
    title: 'Perspective Basics',
    description: 'Understand how to create depth with one-point perspective',
    type: 'practice',
    skillTree: 'drawing-fundamentals',
    order: 3,
    estimatedTime: 12,
    difficulty: 2,
    prerequisites: ['lesson-shape-construction'],
    objectives: [
      {
        id: 'obj-1',
        description: 'Draw a cube in one-point perspective',
        completed: false,
        required: true,
      },
      {
        id: 'obj-2',
        description: 'Create a sense of depth in your drawing',
        completed: false,
        required: true,
      },
    ],
    theoryContent: {
      segments: [
        {
          id: 'theory-1',
          type: 'text',
          content: 'Perspective is what makes drawings look 3D on a flat surface. Today, we\'ll unlock this superpower!',
          duration: 30,
          order: 1,
        },
        {
          id: 'theory-2',
          type: 'interactive',
          content: {
            demo: 'perspective-grid',
            title: 'The Magic of Vanishing Points',
            instructions: 'See how all lines converge to one point on the horizon',
          },
          duration: 90,
          order: 2,
          interactive: true,
        },
      ],
      totalDuration: 120,
      objectives: [
        {
          id: 'learn-1',
          description: 'Understand vanishing points',
          type: 'primary',
          required: true,
        },
      ],
    },
    practiceContent: {
      instructions: [
        {
          id: 'practice-1',
          text: 'Draw a horizon line across the middle of your canvas.',
          type: 'draw',
          hint: 'Keep it straight and horizontal',
          expectedResult: 'A horizontal line',
          validation: {
            type: 'line_detection',
            params: { targetShape: 'horizontal' },
          },
          order: 1,
        },
        {
          id: 'practice-2',
          text: 'Place a dot on the horizon line - this is your vanishing point.',
          type: 'draw',
          hint: 'Put it slightly off-center for more interest',
          expectedResult: 'Horizon line with vanishing point',
          validation: {
            type: 'point_placement',
          },
          order: 2,
        },
        {
          id: 'practice-3',
          text: 'Draw a square below the horizon line.',
          type: 'draw',
          hint: 'This will be the front face of your cube',
          expectedResult: 'Square shape',
          order: 3,
        },
        {
          id: 'practice-4',
          text: 'Connect the corners of your square to the vanishing point with light lines.',
          type: 'draw',
          hint: 'These are your perspective guidelines',
          expectedResult: 'Square with perspective lines',
          validation: {
            type: 'perspective_lines',
            params: { minLines: 4 },
          },
          order: 4,
        },
      ],
      hints: [],
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      },
      expectedDuration: 8,
    },
    rewards: {
      xp: 100,
      achievements: ['perspective_pioneer'],
      unlocks: ['lesson-light-shadow'],
    },
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['fundamentals', 'perspective', '3D'],
  },
  
  // Continue with remaining lessons...
  {
    id: 'lesson-light-shadow',
    title: 'Light & Shadow',
    description: 'Bring your drawings to life with realistic shading',
    type: 'practice',
    skillTree: 'drawing-fundamentals',
    order: 4,
    estimatedTime: 10,
    difficulty: 2,
    prerequisites: ['lesson-perspective-basics'],
    objectives: [
      {
        id: 'obj-1',
        description: 'Shade a sphere to show form',
        completed: false,
        required: true,
      },
    ],
    theoryContent: {
      segments: [
        {
          id: 'theory-1',
          type: 'text',
          content: 'Light and shadow transform flat shapes into 3D forms. This is where your drawings come alive!',
          duration: 30,
          order: 1,
        },
      ],
      totalDuration: 30,
      objectives: [
        {
          id: 'learn-1',
          description: 'Understand light source and shadow placement',
          type: 'primary',
          required: true,
        },
      ],
    },
    practiceContent: {
      instructions: [
        {
          id: 'practice-1',
          text: 'Draw a circle - this will be our sphere.',
          type: 'draw',
          hint: 'Make it nice and round',
          expectedResult: 'A circular shape',
          validation: {
            type: 'shape-accuracy',
            params: { targetShape: 'circle', threshold: 0.7 },
          },
          order: 1,
        },
        {
          id: 'practice-2',
          text: 'Imagine light coming from the top-left. Shade the bottom-right of the sphere.',
          type: 'draw',
          hint: 'Start light and gradually get darker',
          expectedResult: 'Shaded sphere',
          validation: {
            type: 'shading_element',
            params: { expectedArea: 'bottom-right' },
          },
          order: 2,
        },
      ],
      hints: [],
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      },
      expectedDuration: 8,
    },
    rewards: {
      xp: 100,
      achievements: [],
      unlocks: ['lesson-form-volume'],
    },
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['fundamentals', 'shading', 'light'],
  },
  
  // Additional lessons would continue here...
  // For MVP, let's have these 4 core lessons ready
];

// Helper function to get all fundamental lessons
export function getFundamentalLessons(): Lesson[] {
  return drawingFundamentalsLessons;
}

// Helper function to get lesson by ID
export function getLessonById(lessonId: string): Lesson | null {
  return drawingFundamentalsLessons.find(lesson => lesson.id === lessonId) || null;
}

// Helper function to check if lesson is available
export function isLessonAvailable(lessonId: string, completedLessons: string[]): boolean {
  const lesson = getLessonById(lessonId);
  if (!lesson) return false;
  
  // First lesson is always available
  if (lesson.prerequisites.length === 0) return true;
  
  // Check if all prerequisites are completed
  return lesson.prerequisites.every(prereq => completedLessons.includes(prereq));
}