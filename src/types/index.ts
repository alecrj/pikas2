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

export interface TheoryContent {
  type: 'text' | 'image' | 'video' | 'interactive';
  content: string;
  duration?: number;
  interactive?: boolean;
}

export interface PracticeStep {
  id: string;
  instruction: string;
  type: 'draw' | 'observe' | 'compare' | 'trace';
  hint?: string;
  expectedResult?: string;
  validation?: {
    type: 'stroke-count' | 'shape-accuracy' | 'color-match' | 'proportion';
    criteria: any;
  };
}

export interface AssessmentCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  passingScore: number;
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
  theory?: {
    content: TheoryContent[];
    duration: number;
  };
  practice?: {
    steps: PracticeStep[];
    canvas: {
      width: number;
      height: number;
      backgroundColor: string;
      referenceImage?: string;
    };
    expectedDuration: number;
  };
  assessment?: {
    criteria: AssessmentCriteria[];
    passingScore: number;
    maxAttempts: number;
  };
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
}

export interface Portfolio {
  id: string;
  userId: string;
  artworks: Artwork[];
  collections: Collection[];
  stats: {
    totalArtworks: number;
    totalLikes: number;
    totalViews: number;
    followerCount: number;
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