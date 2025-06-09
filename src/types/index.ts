// Core type definitions for Pikaso - Production-ready type system

// --- Canvas Types ---

export interface Point {
  x: number;
  y: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  brushId: string;
  size: number;
  opacity: number;
  blendMode?: BlendMode;
  smoothing?: number;
}

export interface Layer {
  id: string;
  name: string;
  type: 'raster' | 'vector' | 'text' | 'adjustment';
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  data: any; // Canvas image data or vector data
  order: number;
  strokes: Stroke[];
}

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

export interface DrawingState {
  currentTool: 'brush' | 'eraser' | 'smudge' | 'eyedropper' | 'select';
  currentBrush: Brush;
  currentColor: Color;
  layers: Layer[];
  activeLayerId: string;
  history: HistoryEntry[];
  historyIndex: number;
  canvas: CanvasState;
  selection?: Selection;
  // FIXED: Added missing properties that code expects
  canvasSize: { width: number; height: number };
  pan: { x: number; y: number };
  zoom: number;
  backgroundColor: string;
}

export interface CanvasState {
  width: number;
  height: number;
  zoom: number;
  rotation: number;
  offset: { x: number; y: number };
  isDrawing: boolean;
  pressure: number;
  tilt: { x: number; y: number };
}

// --- User Types ---

export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  level: number;
  xp: number;
  totalXP: number;
  streakDays: number;
  lastActiveDate: Date;
  createdAt: Date;
  updatedAt: Date;
  preferences: UserPreferences;
  stats: UserStats;
  achievements: Achievement[];
  following: string[];
  followers: string[];
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  drawingPreferences: DrawingPreferences;
}

export interface NotificationSettings {
  dailyReminders: boolean;
  challengeAlerts: boolean;
  socialActivity: boolean;
  lessonCompletions: boolean;
  achievementUnlocks: boolean;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'followers' | 'private';
  portfolioVisibility: 'public' | 'followers' | 'private';
  showProgress: boolean;
  allowMessages: boolean;
}

export interface DrawingPreferences {
  defaultBrush: string;
  pressureSensitivity: number;
  smoothing: number;
  gridEnabled: boolean;
  autosaveInterval: number;
}

export interface UserStats {
  lessonsCompleted: number;
  totalDrawingTime: number;
  artworksCreated: number;
  artworksShared: number;
  challengesCompleted: number;
  skillsUnlocked: number;
  perfectLessons: number;
}

export interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  iconUrl: string;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export type AchievementType = 
  | 'lesson_completion'
  | 'skill_mastery'
  | 'streak_milestone'
  | 'artwork_creation'
  | 'social_engagement'
  | 'challenge_winner';

// --- Learning Types ---

export interface LessonState {
  lessonId: string;
  startedAt: Date;
  theoryProgress: {
    currentSegment: number;
    completedSegments: number[];
    timeSpent: number;
  };
  practiceProgress: {
    currentStep: number;
    completedSteps: number[];
    attempts: Record<number, Array<{ score: number; timestamp: Date }>>;
    hints: string[];
    timeSpent: number;
  };
  overallProgress: number;
  isPaused: boolean;
  pausedAt?: Date;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  bestScore: number;
  attempts: number;
  totalTimeSpent: number;
  xpEarned: number;
}

export interface Lesson {
  id: string;
  skillTreeId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: number; // in minutes
  difficulty: 1 | 2 | 3 | 4 | 5;
  order: number;
  prerequisites: string[];
  objectives: LearningObjective[];
  theoryContent: TheoryContent;
  practiceContent: PracticeContent;
  assessment: Assessment;
  xpReward: number;
  unlockRequirements: UnlockRequirement[];
  tags: string[];
}

export interface LearningObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface TheoryContent {
  segments: TheorySegment[];
  estimatedDuration: number;
}

export interface TheorySegment {
  type: 'text' | 'image' | 'video' | 'interactive';
  content: any;
  duration: number;
}

export interface PracticeContent {
  instructions: PracticeInstruction[];
  referenceImage?: string;
  guideLayers: GuideLayer[];
  hints: Hint[];
  toolsRequired: string[];
  estimatedDuration: number;
}

export interface PracticeInstruction {
  step: number;
  text: string;
  highlightArea?: Rectangle;
  requiredAction: string;
  validation?: ValidationRule;
}

export interface GuideLayer {
  id: string;
  type: 'grid' | 'reference' | 'overlay';
  visible: boolean;
  opacity: number;
  data: any;
}

export interface Hint {
  id: string;
  triggerCondition: string;
  content: string;
  type: 'tip' | 'correction' | 'encouragement';
}

export interface Assessment {
  criteria: AssessmentCriterion[];
  passingScore: number;
  bonusObjectives: BonusObjective[];
}

export interface AssessmentCriterion {
  id: string;
  description: string;
  weight: number;
  evaluationType: 'automatic' | 'self' | 'peer';
}

export interface BonusObjective {
  id: string;
  description: string;
  xpBonus: number;
}

export interface UnlockRequirement {
  type: 'level' | 'xp' | 'lesson' | 'achievement';
  value: any;
}

export interface SkillTree {
  id: string;
  name: string;
  description: string;
  iconUrl: string;
  category: SkillCategory;
  lessons: Lesson[];
  totalXP: number;
  completionPercentage: number;
}

export type SkillCategory = 
  | 'fundamentals'
  | 'techniques'
  | 'styles'
  | 'digital_tools'
  | 'traditional_media'
  | 'specialized';

// --- Progress Types ---

export interface LearningProgress {
  userId: string;
  currentLesson?: string;
  completedLessons: string[];
  skillTrees: SkillTreeProgress[];
  totalXP: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoal: number;
  dailyProgress: number;
}

export interface SkillTreeProgress {
  skillTreeId: string;
  unlockedLessons: string[];
  completedLessons: string[];
  totalXpEarned: number;
  lastAccessedAt: Date;
}

// FIXED: Extended ValidationRule types to match SkillTreeManager usage
export interface ValidationRule {
  type: 'stroke_count' | 'color_match' | 'shape_accuracy' | 'completion' | 
        'shape_construction' | 'line_detection' | 'point_placement' | 'perspective_lines' |
        'shape_completion' | 'shading_element' | 'shading_gradation' | 'cast_shadow' |
        'cylindrical_shading' | 'form_construction';
  params: any;
  threshold: number;
}

// --- Performance Monitoring ---

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  drawCalls: number;
  inputLatency: number;
  renderTime: number;
}

// --- Error Handling Types ---

export interface AppError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  context?: any;
  timestamp: Date;
  userId?: string;
}

// --- Navigation Types ---

export type RootStackParamList = {
  Home: undefined;
  Drawing: { lessonId?: string; artworkId?: string };
  Lesson: { lessonId: string };
  Profile: { userId?: string };
  Gallery: { userId?: string };
  Challenge: { challengeId: string };
  Settings: undefined;
  Onboarding: undefined;
};

// --- Artwork/Challenge Types ---

export interface Artwork {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  lessonId?: string;
  challengeId?: string;
  layers: Layer[];
  dimensions: Dimensions;
  createdAt: Date;
  updatedAt: Date;
  likes: number;
  views: number;
  comments: Comment[];
  tags: string[];
  isPublic: boolean;
  tools: string[];
  duration: number; // time spent in seconds
}

export interface Dimensions {
  width: number;
  height: number;
  dpi: number;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  createdAt: Date;
  likes: number;
  replies: Comment[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'special';
  startDate: Date;
  endDate: Date;
  theme: string;
  requirements: string[];
  prizes: Prize[];
  participants: number;
  submissions: Artwork[];
  winners?: string[];
}

export interface Prize {
  place: number;
  xpReward: number;
  achievementId?: string;
  description: string;
}

// --- Brush/Tool Types ---

export interface Brush {
  id: string;
  name: string;
  category: BrushCategory;
  icon: string;
  settings: BrushSettings;
  pressureCurve: number[];
  tiltSupport: boolean;
  customizable: boolean;
}

export type BrushCategory = 
  | 'pencil'
  | 'ink'
  | 'paint'
  | 'watercolor'
  | 'marker'
  | 'airbrush'
  | 'texture'
  | 'special';

// FIXED: BrushSettings - Made compatible with both number and RangeValue usage
export interface BrushSettings {
  size: number; // Changed from RangeValue to number for simplicity
  minSize: number;
  maxSize: number;
  opacity: number; // Changed from RangeValue to number for simplicity
  flow: number; // Changed from RangeValue to number for simplicity
  hardness: number; // Changed from RangeValue to number for simplicity
  spacing: number; // Changed from RangeValue to number for simplicity
  scatter?: number; // Changed from RangeValue to number for simplicity
  texture?: string;
  mixMode?: 'normal' | 'wet' | 'multiply';
  smoothing: number;
  pressureSensitivity?: number; // Added for Apple Pencil support
}

// Keep RangeValue for settings UI where it's needed
export interface RangeValue {
  min: number;
  max: number;
  default: number;
  current: number;
}

export interface Color {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsb: { h: number; s: number; b: number };
  alpha: number;
}

export interface HistoryEntry {
  id: string;
  action: string;
  timestamp: Date;
  data: any;
}

export interface Selection {
  type: 'rectangle' | 'ellipse' | 'lasso' | 'magic';
  bounds: Rectangle;
  mask?: ImageData;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

// --- Typography Types for UI ---
export interface TypographyStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold' | '100' | '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  lineHeight?: number;
  letterSpacing?: number;
}

export interface Typography {
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  h4: TypographyStyle;
  body: TypographyStyle;
  caption: TypographyStyle;
}