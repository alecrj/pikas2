// src/types/index.ts
import { SkPath, SkImage } from '@shopify/react-native-skia';

// ========================== CORE TYPES ==========================

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  timestamp: number;
}

export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsb: { h: number; s: number; b: number };
  alpha: number;
}

// ========================== DRAWING TYPES ==========================

export type DrawingTool = 'brush' | 'eraser' | 'move' | 'select' | 'zoom';

export type DrawingMode = 'normal' | 'reference' | 'guided' | 'timelapse';

export type BlendMode = 
  | 'normal' 
  | 'multiply' 
  | 'screen' 
  | 'overlay' 
  | 'soft-light' 
  | 'hard-light' 
  | 'color-dodge' 
  | 'color-burn' 
  | 'darken' 
  | 'lighten';

export type BrushCategory = 
  | 'pencil' 
  | 'ink' 
  | 'paint' 
  | 'watercolor' 
  | 'airbrush' 
  | 'marker' 
  | 'texture' 
  | 'eraser';

export interface BrushSettings {
  size: number;
  minSize: number;
  maxSize: number;
  opacity: number;
  flow: number;
  hardness: number;
  spacing: number;
  smoothing: number;
  pressureSensitivity?: number;
  tiltSensitivity?: number;
  velocitySensitivity?: number;
  jitter?: number;
  scatter?: number;
  textureScale?: number;
  textureDepth?: number;
  wetness?: number;
  mixing?: number;
  falloff?: number;
  rotation?: number;
  graininess?: number;
}

export interface Brush {
  id: string;
  name: string;
  category: BrushCategory;
  icon: string;
  settings: BrushSettings;
  pressureCurve: number[];
  tiltSupport: boolean;
  velocitySupport: boolean;
  blendMode?: BlendMode;
  customizable: boolean;
  textureId?: string;
  isEraser?: boolean;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  brushId: string;
  size: number;
  opacity: number;
  blendMode: BlendMode;
  smoothing: number;
  path?: SkPath;
}

export interface Layer {
  id: string;
  name: string;
  type: 'raster' | 'vector' | 'group';
  strokes: Stroke[];
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  data: any;
  order: number;
}

export interface DrawingStats {
  totalStrokes: number;
  totalTime: number;
  layersUsed: number;
  colorsUsed: number;
  brushesUsed: number;
  undoCount: number;
  redoCount: number;
}

export interface CanvasSettings {
  pressureSensitivity: boolean;
  tiltSensitivity: boolean;
  velocitySensitivity: boolean;
  palmRejection: boolean;
  quickMenuEnabled: boolean;
  autoSave: boolean;
  autoSaveInterval: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: number;
  data: any;
}

export interface DrawingState {
  currentTool: DrawingTool;
  currentColor: Color;
  currentBrush: Brush | null;
  brushSize: number;
  opacity: number;
  layers: Layer[];
  activeLayerId: string;
  strokes: Stroke[];
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  rotation: number;
  gridVisible: boolean;
  gridSize: number;
  referenceImage: string | null;
  referenceOpacity: number;
  drawingMode: DrawingMode;
  history: HistoryEntry[];
  historyIndex: number;
  stats: DrawingStats;
  settings: CanvasSettings;
  recentColors: string[];
  customBrushes: Brush[];
  savedPalettes: Color[][];
}

// ========================== LEARNING TYPES ==========================

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type LessonType = 'theory' | 'practice' | 'challenge' | 'assessment';

export type LessonStatus = 'locked' | 'available' | 'in-progress' | 'completed' | 'mastered';

export interface LessonObjective {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
}

// FIXED: Added missing content property options
export interface TheorySegment {
  id: string;
  type: 'text' | 'image' | 'video' | 'interactive';
  content: string | {
    text?: string;
    demo?: string;
    title?: string;
    instructions?: string;
    url?: string;
  };
  duration: number;
  order: number;
  interactive?: boolean;
}

export interface PracticeInstruction {
  id: string;
  text: string;
  type: 'draw' | 'observe' | 'compare' | 'trace';
  hint?: string;
  expectedResult?: string;
  validation?: ValidationRule;
  order: number;
  highlightArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// FIXED: Enhanced ValidationRule interface
export interface ValidationRule {
  type: 'stroke-count' | 'shape-accuracy' | 'color-match' | 'proportion' | 
        'line_detection' | 'shape_completion' | 'shape_construction' | 
        'point_placement' | 'perspective_lines' | 'shading_element' | 
        'shading_gradation' | 'cast_shadow' | 'cylindrical_shading' | 
        'form_construction' | 'completion';
  criteria?: any;
  threshold?: number;
  params?: {
    min?: number;
    max?: number;
    targetColor?: string;
    targetShape?: string;
    expectedTime?: number;
    [key: string]: any;
  };
}

export interface Assessment {
  criteria: AssessmentCriteria[];
  passingScore: number;
  maxAttempts: number;
  bonusObjectives?: {
    id: string;
    description: string;
    xpBonus: number;
  }[];
}

export interface LearningObjective {
  id: string;
  description: string;
  type: 'primary' | 'secondary' | 'bonus';
  required: boolean;
}

export interface TheoryContent {
  segments: TheorySegment[];
  totalDuration: number;
  objectives: LearningObjective[];
}

export interface PracticeContent {
  instructions: PracticeInstruction[];
  hints: {
    id: string;
    stepIndex: number;
    text: string;
    content?: string; // FIXED: Added content property for hints
    triggerCondition?: string;
  }[];
  referenceImage?: string;
  canvas: {
    width: number;
    height: number;
    backgroundColor: string;
  };
  expectedDuration: number;
}

export interface AssessmentCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  passingScore: number;
  evaluationType?: 'automatic' | 'manual';
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  type: LessonType;
  skillTree: string;
  order: number;
  estimatedTime: number;
  difficulty: number;
  prerequisites: string[];
  objectives: LessonObjective[];
  theoryContent: TheoryContent;
  practiceContent: PracticeContent;
  assessment?: Assessment;
  rewards: {
    xp: number;
    achievements: string[];
    unlocks: string[];
  };
  status: LessonStatus;
  progress: number;
  completedAt?: number;
  attempts: number;
  bestScore?: number;
  timeSpent: number;
  tags: string[]; // FIXED: Added tags property for lesson categorization and search
  
  // Backward compatibility properties (marked as optional but functional)
  duration?: number; // Maps to estimatedTime
  xpReward?: number; // Maps to rewards.xp
  skillTreeId?: string; // Maps to skillTree
  unlockRequirements?: string[]; // Maps to prerequisites
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  category: string;
  order: number;
  lessons: Lesson[];
  prerequisites: string[];
  totalXP: number;
  estimatedDuration: number;
  difficultyLevel: SkillLevel;
  progress: number;
  unlockedAt?: number;
  completedAt?: number;
  iconUrl?: string;
  completionPercentage?: number;
}

export interface SkillTreeProgress {
  skillTreeId: string;
  completedLessons: string[];
  totalXpEarned: number;
  lastAccessedAt?: Date; // FIXED: Added missing property
  lastActivityDate?: string;
  completionPercentage: number;
}

// FIXED: Enhanced LearningProgress interface
export interface LearningProgress {
  userId: string;
  currentLevel: number;
  totalXP: number;
  completedLessons: string[];
  skillTrees: SkillTreeProgress[];
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string;
  achievements: string[];
  preferences: {
    dailyGoal: number;
    reminderTime?: string;
    difficulty: 'adaptive' | 'challenging' | 'comfortable';
  };
  // FIXED: Added missing daily tracking properties
  dailyProgress: number;
  dailyGoal: number;
}

export interface LessonState {
  lessonId: string;
  startedAt: Date;
  pausedAt?: Date;
  theoryProgress: {
    currentSegment: number;
    completedSegments: number[];
    timeSpent: number;
  };
  practiceProgress: {
    currentStep: number;
    completedSteps: number[];
    attempts: Record<string, number>;
    hints: string[];
    timeSpent: number;
  };
  overallProgress: number;
  isPaused: boolean;
}

// FIXED: Added missing LessonCompletionResult interface
export interface LessonCompletionResult {
  lessonId: string;
  score: number;
  xpEarned: number;
  completed: boolean;
  perfectScore: boolean;
  timeSpent: number;
  achievements: string[];
}

export interface LearningPath {
  id: string;
  name: string;
  description: string;
  skillTrees: string[];
  targetSkillLevel: SkillLevel;
  estimatedWeeks: number;
  prerequisites: SkillLevel[];
}

export interface LearningState {
  currentLesson: Lesson | null;
  currentSkillTree: SkillTree | null;
  availableLessons: Lesson[];
  completedLessons: string[];
  learningPaths: LearningPath[];
  skillTrees: SkillTree[];
  dailyGoal: {
    target: number;
    completed: number;
    streak: number;
  };
  weeklyProgress: {
    lessonsCompleted: number;
    timeSpent: number;
    xpGained: number;
  };
  preferences: {
    reminderTime?: string;
    difficultyPreference: 'adaptive' | 'challenging' | 'comfortable';
    learningStyle: 'visual' | 'kinesthetic' | 'mixed';
  };
}

// ========================== USER TYPES ==========================

// FIXED: Enhanced User interface with all required properties
export interface User {
  id: string;
  username: string;
  displayName: string;
  email: string; // FIXED: Added email
  avatar?: string;
  bio?: string;
  following: string[];
  followers: string[];
  isVerified?: boolean;
  isOnline?: boolean;
  lastSeenAt?: number;
  
  // FIXED: Added missing progression properties that were being accessed
  level: number;
  xp: number;
  totalXP: number;
  streakDays: number;
  lastActiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // FIXED: Added missing nested objects
  preferences: UserPreferences;
  stats: UserStats;
  achievements: Achievement[];
}

export interface UserProfile {
  id: string;
  displayName: string;
  email: string;
  avatar?: string;
  joinedAt: number;
  lastActiveAt: number;
  skillLevel: SkillLevel;
  learningGoals: string[];
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    notifications: boolean;
    privacy: 'public' | 'friends' | 'private';
  };
  stats: {
    totalDrawingTime: number;
    totalLessonsCompleted: number;
    totalArtworksCreated: number;
    currentStreak: number;
    longestStreak: number;
  };
}

export interface UserProgress {
  userId: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  skillPoints: {
    drawing: number;
    theory: number;
    creativity: number;
    technique: number;
  };
  achievements: Achievement[];
  streakDays: number;
  lastActivityDate: string;
  learningStats: {
    lessonsCompleted: number;
    skillTreesCompleted: number;
    totalStudyTime: number;
    averageSessionTime: number;
    strongestSkills: string[];
    improvementAreas: string[];
  };
}

// FIXED: Enhanced Achievement interface
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'skill' | 'social' | 'milestone' | 'streak' | 'creativity';
  requirements: {
    type: string;
    value: number;
    condition?: string;
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  xpReward: number;
  unlockedAt?: number;
  progress?: number;
  maxProgress?: number; // FIXED: Added missing property
  title?: string; // FIXED: Added for compatibility
  iconUrl?: string; // FIXED: Added for compatibility
}

// FIXED: Enhanced UserPreferences interface
export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language?: string; // FIXED: Added language
  notifications: {
    lessons: boolean;
    achievements: boolean;
    social: boolean;
    challenges: boolean;
    lessonCompletions?: boolean; // FIXED: Added missing notification types
    achievementUnlocks?: boolean;
    challengeAlerts?: boolean;
    socialActivity?: boolean;
  };
  privacy: {
    profile: 'public' | 'friends' | 'private';
    artwork: 'public' | 'friends' | 'private';
    progress: 'public' | 'friends' | 'private';
    showProgress?: boolean; // FIXED: Added missing property
    allowMessages?: boolean;
    portfolioVisibility?: 'public' | 'friends' | 'private';
  };
  learning?: {
    dailyGoal: number;
    reminderTime?: string;
    difficulty: 'adaptive' | 'challenging' | 'comfortable';
  };
  drawingPreferences?: {
    defaultBrush: string;
    pressureSensitivity: number;
    smoothing: number;
    gridEnabled: boolean;
    autosaveInterval: number;
  };
}

// FIXED: Enhanced UserStats interface
export interface UserStats {
  totalDrawingTime: number;
  totalLessonsCompleted: number;
  totalArtworksCreated: number;
  currentStreak: number;
  longestStreak: number;
  averageSessionTime?: number;
  favoriteTools?: string[];
  skillDistribution?: Record<string, number>;
  
  // FIXED: Added missing stats that were being accessed
  artworksCreated: number;
  artworksShared: number;
  challengesCompleted: number;
  skillsUnlocked: number;
  perfectLessons: number;
  lessonsCompleted: number; // FIXED: Added for compatibility
}

// FIXED: Enhanced Portfolio interface
export interface Portfolio {
  id: string;
  userId: string;
  artworks: Artwork[];
  collections: Collection[];
  stats: {
    totalArtworks: number;
    totalLikes: number;
    totalViews: number;
    followerCount: number; // FIXED: Added missing property
    publicArtworks?: number; // FIXED: Added missing property
    averageTimeSpent?: number; // FIXED: Added missing property
  };
  settings: {
    publicProfile: boolean;
    showProgress: boolean;
    allowComments: boolean;
  };
}

export interface Artwork {
  id: string;
  userId: string;
  title: string;
  description?: string;
  tags: string[];
  lessonId?: string;
  skillTree?: string;
  drawingData: DrawingState;
  thumbnail: string;
  imageUrl: string;
  createdAt: number;
  updatedAt: number;
  stats: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
  };
  metadata: {
    drawingTime: number;
    strokeCount: number;
    layersUsed: number;
    brushesUsed: string[];
    canvasSize: { width: number; height: number };
  };
  visibility: 'public' | 'unlisted' | 'private';
  featured: boolean;
  
  // Extended properties for social features
  isPublic?: boolean;
  likes?: number;
  views?: number;
  comments?: Comment[];
  duration?: number;
  tools?: string[];
  layers?: Layer[];
  dimensions?: { width: number; height: number };
  challengeId?: string;
  thumbnailUrl?: string; // Alias for thumbnail
  fullImageUrl?: string; // Alias for imageUrl
}

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  artworkIds: string[];
  coverImageId?: string;
  createdAt: number;
  updatedAt: number;
  visibility: 'public' | 'unlisted' | 'private';
}

// ========================== COMMUNITY TYPES ==========================

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly' | 'special';
  theme: string;
  prompt: string;
  rules: string[];
  startDate: number;
  endDate: number;
  difficulty: SkillLevel;
  rewards: {
    xp: number;
    achievements: string[];
    badges: string[];
  };
  participants: number;
  submissions: ChallengeSubmission[];
  featured: boolean;
  tags: string[];
  prizes?: Prize[];
  winners?: string[];
}

export interface Prize {
  id: string;
  name: string;
  description: string;
  type: 'xp' | 'achievement' | 'badge' | 'feature';
  value: any;
  place: number;
}

export interface ChallengeSubmission {
  id: string;
  challengeId: string;
  userId: string;
  artworkId: string;
  submittedAt: number;
  votes: number;
  rank?: number;
  featured: boolean;
  
  // Extended properties
  likes?: number;
  comments?: Comment[];
  views?: number;
}

export interface SocialFeed {
  posts: FeedPost[];
  hasMore: boolean;
  lastUpdated: number;
}

export interface FeedPost {
  id: string;
  userId: string;
  type: 'artwork' | 'achievement' | 'lesson-complete' | 'challenge' | 'milestone';
  content: {
    artworkId?: string;
    achievementId?: string;
    lessonId?: string;
    challengeId?: string;
    text?: string;
  };
  createdAt: number;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
    isLiked: boolean;
  };
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: number;
  likes: number;
  replies: Comment[];
  isLiked: boolean;
}

// ========================== PERFORMANCE TYPES ==========================

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  inputLatency: number;
  renderTime: number;
}

// FIXED: Enhanced AppError interface
export interface AppError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
  timestamp: Date;
  stack?: string;
  userId?: string; // FIXED: Added missing property
}

export interface ErrorInfo {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  deviceInfo?: {
    platform: string;
    version: string;
    model: string;
  };
}

// ========================== THEME TYPES ==========================

export interface Theme {
  name: 'light' | 'dark';
  colors: {
    primary: string;
    primaryDark: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    h1: { fontSize: number; fontWeight: string; lineHeight: number };
    h2: { fontSize: number; fontWeight: string; lineHeight: number };
    h3: { fontSize: number; fontWeight: string; lineHeight: number };
    h4: { fontSize: number; fontWeight: string; lineHeight: number }; // FIXED: Added h4
    body: { fontSize: number; fontWeight: string; lineHeight: number };
    caption: { fontSize: number; fontWeight: string; lineHeight: number };
  };
}

// ========================== CONTEXT TYPES ==========================

export interface ThemeContextValue {
  theme: Theme;
  colors: Theme['colors'];
  spacing: Theme['spacing'];
  borderRadius: Theme['borderRadius'];
  toggleTheme: () => void;
  isDark: boolean;
}

// FIXED: Enhanced UserProgressContextValue interface
export interface UserProgressContextValue {
  user: UserProfile | null;
  progress: UserProgress | null;
  portfolio: Portfolio | null;
  isLoading: boolean;
  error: string | null;
  
  // User management
  createUser: (profile: Partial<UserProfile>) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;
  
  // Progress management
  addXP: (amount: number, source?: string) => void;
  addAchievement: (achievementId: string) => void;
  updateStreak: () => void;
  checkDailyStreak: () => void;
  updateLearningStats: (category: string, stats: Record<string, number>) => void;
  
  // Portfolio management
  saveArtwork: (artwork: Omit<Artwork, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateArtwork: (artworkId: string, updates: Partial<Artwork>) => Promise<void>;
  deleteArtwork: (artworkId: string) => Promise<void>;
  createCollection: (collection: Omit<Collection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  
  // Stats and analytics
  getDailyGoalProgress: () => number;
  getWeeklyStats: () => any;
  getLearningInsights: () => any;
}

// FIXED: Enhanced LearningContextType interface
export interface LearningContextType {
  currentLesson: Lesson | null;
  lessonState: LessonState | null;
  isLoadingLesson: boolean;

  skillTrees: SkillTree[];
  availableLessons: Lesson[];
  unlockedLessons: string[];

  learningProgress: LearningProgress | null;
  completedLessons: string[];
  currentStreak: number;

  recommendedLesson: Lesson | null;
  recommendedLessons: Lesson[]; // FIXED: Added missing property
  insights: Array<{
    id: string;
    type: 'improvement' | 'achievement' | 'suggestion';
    title: string;
    description: string;
    actionable: boolean;
  }>;

  currentSkillTree: SkillTree | null;
  setCurrentSkillTree: (skillTree: SkillTree | null) => void;

  startLesson: (lesson: Lesson) => Promise<void>;
  pauseLesson: () => Promise<void>;
  resumeLesson: () => Promise<void>;
  completeLesson: (score?: number) => Promise<void>;
  exitLesson: () => Promise<void>;

  updateProgress: (stepIndex: number, completed: boolean) => Promise<void>;
  addHint: (hint: string) => void;
  validateStep: (stepIndex: number, userInput: any) => Promise<boolean>;

  getLesson: (lessonId: string) => Lesson | null;
  getNextLesson: () => Lesson | null;
  checkUnlockRequirements: (lessonId: string) => boolean;
}

export interface LearningContextValue {
  state: LearningState;
  
  // Lesson management
  startLesson: (lessonId: string) => Promise<void>;
  completeLesson: (lessonId: string, score?: number) => Promise<void>;
  updateLessonProgress: (lessonId: string, progress: number) => void;
  
  // Skill tree management
  getAvailableLessons: (skillTreeId?: string) => Lesson[];
  getRecommendedLessons: () => Lesson[];
  unlockLesson: (lessonId: string) => void;
  
  // Progress tracking
  getLearningProgress: () => any;
  getSkillTreeProgress: (skillTreeId: string) => number;
  updateDailyGoal: (target: number) => void;
  
  // Learning path management
  startLearningPath: (pathId: string) => void;
  getPersonalizedPath: () => LearningPath;
}

// ========================== API TYPES ==========================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ========================== EVENT TYPES ==========================

export interface AppEvent {
  type: string;
  payload: any;
  timestamp: number;
  userId?: string;
}

export interface DrawingEvent extends AppEvent {
  type: 'stroke:start' | 'stroke:add' | 'stroke:end' | 'layer:add' | 'layer:delete' | 'canvas:clear';
  payload: {
    strokeId?: string;
    layerId?: string;
    point?: Point;
    stroke?: Stroke;
  };
}

export interface LearningEvent extends AppEvent {
  type: 'lesson:start' | 'lesson:complete' | 'skill:unlock' | 'achievement:earn';
  payload: {
    lessonId?: string;
    skillId?: string;
    achievementId?: string;
    score?: number;
    timeSpent?: number;
  };
}

export interface UserEvent extends AppEvent {
  type: 'user:register' | 'user:login' | 'user:logout' | 'artwork:save' | 'artwork:share';
  payload: {
    userId?: string;
    artworkId?: string;
    platform?: string;
  };
}

// ========================== UTILITY TYPES ==========================

export interface Dimensions {
  width: number;
  height: number;
}

// FIXED: Achievement type enum
export type AchievementType = 'skill' | 'social' | 'milestone' | 'streak' | 'creativity';