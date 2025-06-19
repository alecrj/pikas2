import { Lesson, LessonType, LessonContent } from '../../types';

/**
 * FIXED LESSON SYSTEM - Compatible with existing types
 * 
 * This works with your existing Lesson interface by:
 * 1. Keeping all existing properties (theoryContent, practiceContent, etc.)
 * 2. Adding the new 'content' array for the lesson engine
 * 3. Using proper LessonType values
 */

export const fundamentalLessons: Lesson[] = [
  // LESSON 1: Theory Quiz
  {
    id: 'lesson-intro-theory',
    title: 'Drawing Fundamentals Quiz',
    description: 'Test your understanding of basic drawing principles',
    type: 'theory' as LessonType,
    skillTree: 'drawing-fundamentals',
    order: 1,
    estimatedTime: 5,
    difficulty: 1,
    prerequisites: [],
    
    // NEW: Content array for modern lesson engine
    content: [
      {
        id: 'shoulder-technique',
        type: 'multiple_choice',
        question: 'Which technique produces the straightest lines?',
        options: [
          'Drawing from the wrist',
          'Drawing from the shoulder',
          'Drawing with fingertips',
          'Drawing very slowly'
        ],
        correctAnswer: 1,
        explanation: 'Professional artists draw from their shoulder for long, controlled lines. The shoulder provides stability and smooth movement.',
        hint: 'Think about which joint gives you the most control.',
        xp: 15,
      },
      {
        id: 'wrist-control',
        type: 'true_false',
        question: 'You should lock your wrist when drawing straight lines.',
        correctAnswer: true,
        explanation: 'Locking your wrist prevents wobbly lines and gives you better control.',
        xp: 10,
      },
      {
        id: 'circle-method',
        type: 'multiple_choice',
        question: 'What\'s the best way to draw a perfect circle?',
        options: [
          'Draw very slowly and carefully',
          'Use your elbow as a pivot point',
          'Start with a square first',
          'Draw many small curves'
        ],
        correctAnswer: 1,
        explanation: 'Using your elbow as a pivot creates natural circular motion.',
        xp: 15,
      }
    ],
    
    // EXISTING: Keep original structure for backward compatibility
    objectives: [
      {
        id: 'theory-1',
        description: 'Understand proper drawing technique',
        completed: false,
        required: true,
      }
    ],
    
    theoryContent: {
      segments: [
        {
          id: 'theory-1',
          type: 'text',
          content: 'Every masterpiece starts with a single line. Today, you\'ll learn the secret that separates amateur from professional artists: controlled, confident strokes.',
          duration: 30,
          order: 1,
        }
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
          text: 'Practice drawing straight lines using proper technique',
          type: 'draw',
          hint: 'Move from your shoulder, not your wrist!',
          expectedResult: 'Straight controlled lines',
          order: 1,
        }
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
      xp: 40,
      achievements: ['theory_master'],
      unlocks: ['lesson-line-practice'],
    },
    
    status: 'available',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['theory', 'fundamentals', 'basics'],
  },

  // LESSON 2: Line Practice
  {
    id: 'lesson-line-practice',
    title: 'Line Control Practice',
    description: 'Master drawing straight lines and basic shapes',
    type: 'practice' as LessonType,
    skillTree: 'drawing-fundamentals',
    order: 2,
    estimatedTime: 8,
    difficulty: 1,
    prerequisites: ['lesson-intro-theory'],
    
    // NEW: Drawing exercises content
    content: [
      {
        id: 'horizontal-lines',
        type: 'drawing_exercise',
        instruction: 'Draw 5 straight horizontal lines',
        hint: 'Use your shoulder, keep your wrist locked',
        validation: {
          type: 'line_count',
          params: { target: 5 },
          threshold: 0.8,
        },
        timeLimit: 90,
        xp: 20,
      },
      {
        id: 'vertical-lines',
        type: 'drawing_exercise',
        instruction: 'Draw 5 straight vertical lines',
        hint: 'Keep them parallel and evenly spaced',
        validation: {
          type: 'line_count',
          params: { target: 5 },
          threshold: 0.8,
        },
        timeLimit: 90,
        xp: 20,
      },
      {
        id: 'circles',
        type: 'drawing_exercise',
        instruction: 'Draw 3 circles',
        hint: 'Use your elbow as a pivot, don\'t worry about perfection',
        validation: {
          type: 'shape_accuracy',
          params: { 
            target: 'circle',
            count: 3 
          },
          threshold: 0.6,
        },
        timeLimit: 120,
        xp: 25,
      }
    ],
    
    // EXISTING: Original structure
    objectives: [
      {
        id: 'lines-1',
        description: 'Draw controlled straight lines',
        completed: false,
        required: true,
      },
      {
        id: 'circles-1',
        description: 'Create basic circular shapes',
        completed: false,
        required: true,
      }
    ],
    
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
      xp: 65,
      achievements: ['line_master'],
      unlocks: ['lesson-color-theory'],
    },
    
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['practice', 'lines', 'shapes', 'fundamentals'],
  },

  // LESSON 3: Color Theory
  {
    id: 'lesson-color-theory',
    title: 'Color Theory Basics',
    description: 'Learn about primary colors, complements, and harmony',
    type: 'theory' as LessonType,
    skillTree: 'drawing-fundamentals',
    order: 3,
    estimatedTime: 6,
    difficulty: 1,
    prerequisites: ['lesson-line-practice'],
    
    // NEW: Color theory content
    content: [
      {
        id: 'primary-colors',
        type: 'multiple_choice',
        question: 'What are the three primary colors?',
        options: [
          'Red, Green, Blue',
          'Red, Yellow, Blue',
          'Yellow, Orange, Red',
          'Blue, Purple, Green'
        ],
        correctAnswer: 1,
        explanation: 'Red, Yellow, and Blue are the primary colors - they cannot be created by mixing other colors.',
        xp: 15,
      },
      {
        id: 'complementary-red',
        type: 'color_match',
        question: 'Select the complementary color to red:',
        options: ['#FF0000', '#00FF00', '#0000FF', '#FFFF00'],
        correctAnswer: 1, // Green
        explanation: 'Green is directly opposite red on the color wheel.',
        xp: 20,
      },
      {
        id: 'warm-colors',
        type: 'multiple_choice',
        question: 'Which colors are considered "warm"?',
        options: [
          'Blues and greens',
          'Reds, oranges, and yellows',
          'Purples and violets',
          'Black and white'
        ],
        correctAnswer: 1,
        explanation: 'Warm colors remind us of fire and sunlight. They tend to advance in compositions.',
        xp: 15,
      }
    ],
    
    // EXISTING: Original structure
    objectives: [
      {
        id: 'color-1',
        description: 'Understand primary and complementary colors',
        completed: false,
        required: true,
      }
    ],
    
    theoryContent: {
      segments: [
        {
          id: 'theory-1',
          type: 'text',
          content: 'Color is one of the most powerful tools in an artist\'s toolkit. Understanding color theory will help you create more compelling and harmonious artwork.',
          duration: 30,
          order: 1,
        }
      ],
      totalDuration: 90,
      objectives: [
        {
          id: 'learn-1',
          description: 'Learn color wheel basics',
          type: 'primary',
          required: true,
        },
      ],
    },
    
    rewards: {
      xp: 50,
      achievements: ['color_theorist'],
      unlocks: ['lesson-apple-construction'],
    },
    
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['theory', 'color', 'fundamentals'],
  },

  // LESSON 4: Guided Apple Drawing
  {
    id: 'lesson-apple-construction',
    title: 'Draw an Apple',
    description: 'Learn construction drawing by creating a simple apple',
    type: 'practice' as LessonType, // Using 'practice' instead of 'guided'
    skillTree: 'drawing-fundamentals',
    order: 4,
    estimatedTime: 12,
    difficulty: 2,
    prerequisites: ['lesson-color-theory'],
    
    // NEW: Guided step content
    content: [
      {
        id: 'apple-circle',
        type: 'guided_step',
        instruction: 'Start with a circle for the apple body',
        hint: 'Make it slightly wider than tall',
        validation: {
          type: 'shape_accuracy',
          params: { target: 'circle' },
          threshold: 0.7,
        },
        xp: 20,
      },
      {
        id: 'apple-indent',
        type: 'guided_step',
        instruction: 'Add a small indent at the top',
        hint: 'Where the stem connects to the apple',
        validation: {
          type: 'curve_detection',
          params: { area: 'top_center' },
          threshold: 0.6,
        },
        xp: 25,
      },
      {
        id: 'apple-stem',
        type: 'guided_step',
        instruction: 'Draw a small stem',
        hint: 'Just a short rectangle at the top',
        validation: {
          type: 'shape_accuracy',
          params: { 
            target: 'rectangle',
            area: 'top_center'
          },
          threshold: 0.5,
        },
        xp: 30,
      }
    ],
    
    // EXISTING: Original structure
    objectives: [
      {
        id: 'construction-1',
        description: 'Apply construction drawing principles',
        completed: false,
        required: true,
      }
    ],
    
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
      ],
      hints: [],
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      },
      expectedDuration: 12,
    },
    
    rewards: {
      xp: 75,
      achievements: ['constructor', 'apple_artist'],
      unlocks: [], // End of fundamentals
    },
    
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: ['guided', 'construction', 'objects'],
  },
];

// =================== HELPER FUNCTIONS ===================

export function getFundamentalLessons(): Lesson[] {
  return fundamentalLessons;
}

export function getLessonById(lessonId: string): Lesson | null {
  return fundamentalLessons.find(lesson => lesson.id === lessonId) || null;
}

export function isLessonAvailable(lessonId: string, completedLessons: string[]): boolean {
  const lesson = getLessonById(lessonId);
  if (!lesson) return false;
  
  if (lesson.prerequisites.length === 0) return true;
  
  return lesson.prerequisites.every(prereq => completedLessons.includes(prereq));
}

// =================== EASY LESSON CREATION HELPERS ===================

export function createTheoryLesson(config: {
  id: string;
  title: string;
  description: string;
  order: number;
  prerequisites: string[];
  questions: any[];
  tags?: string[];
}): Lesson {
  const totalXP = config.questions.reduce((sum, q) => sum + (q.xp || 10), 0);
  
  return {
    ...config,
    type: 'theory' as LessonType,
    skillTree: 'drawing-fundamentals',
    estimatedTime: Math.max(3, Math.min(10, config.questions.length * 1.5)),
    difficulty: 1,
    
    // NEW: Content array
    content: config.questions,
    
    // EXISTING: Original structure
    objectives: [
      {
        id: `${config.id}-obj`,
        description: `Complete ${config.title}`,
        completed: false,
        required: true,
      }
    ],
    
    theoryContent: {
      segments: [
        {
          id: `${config.id}-segment`,
          type: 'text',
          content: config.description,
          duration: 30,
          order: 1,
        }
      ],
      totalDuration: 30,
      objectives: [],
    },
    
    rewards: {
      xp: totalXP,
      achievements: [`${config.id.replace('lesson-', '')}_master`],
      unlocks: [],
    },
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: config.tags || ['theory'],
  };
}

export function createPracticeLesson(config: {
  id: string;
  title: string;
  description: string;
  order: number;
  prerequisites: string[];
  exercises: any[];
  tags?: string[];
}): Lesson {
  const totalXP = config.exercises.reduce((sum, e) => sum + (e.xp || 15), 0);
  
  return {
    ...config,
    type: 'practice' as LessonType,
    skillTree: 'drawing-fundamentals',
    estimatedTime: Math.max(5, Math.min(15, config.exercises.length * 3)),
    difficulty: 1,
    
    // NEW: Content array
    content: config.exercises,
    
    // EXISTING: Original structure
    objectives: [
      {
        id: `${config.id}-obj`,
        description: `Complete ${config.title}`,
        completed: false,
        required: true,
      }
    ],
    
    practiceContent: {
      instructions: config.exercises.map((exercise, index) => ({
        id: exercise.id || `instruction-${index}`,
        text: exercise.instruction || exercise.text || 'Practice exercise',
        type: 'draw',
        hint: exercise.hint,
        expectedResult: 'Complete the exercise',
        order: index + 1,
      })),
      hints: [],
      canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#FFFFFF',
      },
      expectedDuration: Math.max(5, config.exercises.length * 2),
    },
    
    rewards: {
      xp: totalXP,
      achievements: [`${config.id.replace('lesson-', '')}_master`],
      unlocks: [],
    },
    status: 'locked',
    progress: 0,
    attempts: 0,
    timeSpent: 0,
    tags: config.tags || ['practice'],
  };
}

// =================== ADDING NEW LESSONS IS EASY ===================

/*
EXAMPLE: Add a new lesson like this:

const newLesson = createTheoryLesson({
  id: 'lesson-perspective-advanced',
  title: 'Advanced Perspective',
  description: 'Master 2-point and 3-point perspective',
  order: 5,
  prerequisites: ['lesson-apple-construction'],
  questions: [
    {
      id: 'two-point-perspective',
      type: 'multiple_choice',
      question: 'In two-point perspective, what remains vertical?',
      options: ['Nothing', 'Vertical edges', 'Horizontal edges', 'All edges'],
      correctAnswer: 1,
      explanation: 'Vertical edges remain vertical in two-point perspective.',
      xp: 20,
    }
  ],
  tags: ['advanced', 'perspective'],
});

fundamentalLessons.push(newLesson);
*/