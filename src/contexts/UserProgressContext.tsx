import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { UserProfile, UserProgress, Portfolio, Achievement, Artwork, Collection, UserProgressContextValue } from '../types';
import { profileSystem } from '../engines/user/ProfileSystem';
import { progressionSystem } from '../engines/user/ProgressionSystem';
import { portfolioManager } from '../engines/user/PortfolioManager';
import { EventBus } from '../engines/core/EventBus';
import { errorHandler } from '../engines/core/ErrorHandler';

interface UserProgressState {
  user: UserProfile | null;
  progress: UserProgress | null;
  portfolio: Portfolio | null;
  isLoading: boolean;
  error: string | null;
}

type UserProgressAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_USER'; user: UserProfile }
  | { type: 'SET_PROGRESS'; progress: UserProgress }
  | { type: 'SET_PORTFOLIO'; portfolio: Portfolio }
  | { type: 'UPDATE_USER'; updates: Partial<UserProfile> }
  | { type: 'UPDATE_PROGRESS'; updates: Partial<UserProgress> }
  | { type: 'ADD_XP'; amount: number; source?: string }
  | { type: 'ADD_ACHIEVEMENT'; achievement: Achievement }
  | { type: 'UPDATE_STREAK'; streakDays: number }
  | { type: 'ADD_ARTWORK'; artwork: Artwork }
  | { type: 'UPDATE_ARTWORK'; artworkId: string; updates: Partial<Artwork> }
  | { type: 'DELETE_ARTWORK'; artworkId: string }
  | { type: 'ADD_COLLECTION'; collection: Collection };

const initialState: UserProgressState = {
  user: null,
  progress: null,
  portfolio: null,
  isLoading: false,
  error: null,
};

function userProgressReducer(state: UserProgressState, action: UserProgressAction): UserProgressState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
      
    case 'SET_ERROR':
      return { ...state, error: action.error, isLoading: false };
      
    case 'SET_USER':
      return { ...state, user: action.user, error: null };
      
    case 'SET_PROGRESS':
      return { ...state, progress: action.progress, error: null };
      
    case 'SET_PORTFOLIO':
      return { ...state, portfolio: action.portfolio, error: null };
      
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.updates } : null,
      };
      
    case 'UPDATE_PROGRESS':
      return {
        ...state,
        progress: state.progress ? { ...state.progress, ...action.updates } : null,
      };
      
    case 'ADD_XP':
      if (!state.progress) return state;
      
      const newXP = state.progress.xp + action.amount;
      const currentLevel = state.progress.level;
      const xpPerLevel = 1000; // Base XP per level
      const newLevel = Math.floor(newXP / xpPerLevel) + 1;
      const xpToNextLevel = (newLevel * xpPerLevel) - newXP;
      
      return {
        ...state,
        progress: {
          ...state.progress,
          xp: newXP,
          level: newLevel,
          xpToNextLevel,
          lastActivityDate: new Date().toISOString(),
        },
      };
      
    case 'ADD_ACHIEVEMENT':
      if (!state.progress) return state;
      
      const existingAchievement = state.progress.achievements.find(a => a.id === action.achievement.id);
      if (existingAchievement) return state;
      
      const unlockedAchievement = {
        ...action.achievement,
        unlockedAt: Date.now(),
      };
      
      return {
        ...state,
        progress: {
          ...state.progress,
          achievements: [...state.progress.achievements, unlockedAchievement],
          xp: state.progress.xp + action.achievement.xpReward,
        },
      };
      
    case 'UPDATE_STREAK':
      return {
        ...state,
        progress: state.progress ? {
          ...state.progress,
          streakDays: action.streakDays,
          lastActivityDate: new Date().toISOString(),
        } : null,
      };
      
    case 'ADD_ARTWORK':
      if (!state.portfolio) return state;
      
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          artworks: [...state.portfolio.artworks, action.artwork],
          stats: {
            ...state.portfolio.stats,
            totalArtworks: state.portfolio.stats.totalArtworks + 1,
          },
        },
      };
      
    case 'UPDATE_ARTWORK':
      if (!state.portfolio) return state;
      
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          artworks: state.portfolio.artworks.map(artwork =>
            artwork.id === action.artworkId ? { ...artwork, ...action.updates } : artwork
          ),
        },
      };
      
    case 'DELETE_ARTWORK':
      if (!state.portfolio) return state;
      
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          artworks: state.portfolio.artworks.filter(artwork => artwork.id !== action.artworkId),
          stats: {
            ...state.portfolio.stats,
            totalArtworks: Math.max(0, state.portfolio.stats.totalArtworks - 1),
          },
        },
      };
      
    case 'ADD_COLLECTION':
      if (!state.portfolio) return state;
      
      return {
        ...state,
        portfolio: {
          ...state.portfolio,
          collections: [...state.portfolio.collections, action.collection],
        },
      };
      
    default:
      return state;
  }
}

const UserProgressContext = createContext<UserProgressContextValue | null>(null);

interface UserProgressProviderProps {
  children: ReactNode;
}

export function UserProgressProvider({ children }: UserProgressProviderProps) {
  const [state, dispatch] = useReducer(userProgressReducer, initialState);
  const eventBus = EventBus.getInstance();

  // Initialize user data on mount
  useEffect(() => {
    initializeUserData();
  }, []);

  // Helper function to calculate XP to next level
  const calculateXPToNextLevel = (level: number, currentXP: number): number => {
    const xpForNextLevel = level * 1000; // Simple calculation
    return Math.max(0, xpForNextLevel - currentXP);
  };

  const initializeUserData = async () => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      // Load or create user profile
      const user = await profileSystem.getCurrentUser();
      if (user) {
        // Convert User to UserProfile format
        const userProfile: UserProfile = {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          avatar: user.avatar,
          joinedAt: user.createdAt.getTime(),
          lastActiveAt: user.updatedAt.getTime(),
          skillLevel: 'beginner', // Default skill level
          learningGoals: [], // Default empty goals
          preferences: {
            theme: user.preferences.theme,
            notifications: true, // Simplified for UserProfile
            privacy: 'public', // Default privacy
          },
          stats: {
            totalDrawingTime: user.stats.totalDrawingTime,
            totalLessonsCompleted: user.stats.totalLessonsCompleted,
            totalArtworksCreated: user.stats.totalArtworksCreated,
            currentStreak: user.streakDays,
            longestStreak: user.stats.longestStreak,
          },
        };
        dispatch({ type: 'SET_USER', user: userProfile });
        
        // Create UserProgress from User data
        const userProgress: UserProgress = {
          userId: user.id,
          level: user.level,
          xp: user.xp,
          xpToNextLevel: calculateXPToNextLevel(user.level, user.xp),
          skillPoints: {
            drawing: 0,
            theory: 0,
            creativity: 0,
            technique: 0,
          },
          achievements: user.achievements,
          streakDays: user.streakDays,
          lastActivityDate: user.lastActiveDate.toISOString(),
          learningStats: {
            lessonsCompleted: user.stats.lessonsCompleted || user.stats.totalLessonsCompleted,
            skillTreesCompleted: 0,
            totalStudyTime: user.stats.totalDrawingTime,
            averageSessionTime: user.stats.averageSessionTime || 0,
            strongestSkills: [],
            improvementAreas: [],
          },
        };
        dispatch({ type: 'SET_PROGRESS', progress: userProgress });
        
        // Load portfolio
        const portfolio = await portfolioManager.getUserPortfolio(user.id);
        if (portfolio) {
          // Ensure portfolio has all required properties
          const completePortfolio: Portfolio = {
            ...portfolio,
            stats: {
              ...portfolio.stats,
              followerCount: portfolio.stats.followerCount || 0,
              publicArtworks: portfolio.stats.publicArtworks || 0,
              averageTimeSpent: portfolio.stats.averageTimeSpent || 0,
            },
          };
          dispatch({ type: 'SET_PORTFOLIO', portfolio: completePortfolio });
        }
      }
      
      dispatch({ type: 'SET_LOADING', loading: false });
    } catch (error) {
      console.error('Failed to initialize user data:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to load user data' });
    }
  };

  // User management
  const createUser = async (profile: Partial<UserProfile>): Promise<void> => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      // Use correct method signature with required parameters
      const newUser = await profileSystem.createUser(
        profile.email || '',
        profile.displayName || 'User',
        profile.displayName || 'User'
      );
      
      // Convert User to UserProfile
      const userProfile: UserProfile = {
        id: newUser.id,
        displayName: newUser.displayName,
        email: newUser.email,
        avatar: newUser.avatar,
        joinedAt: newUser.createdAt.getTime(),
        lastActiveAt: newUser.updatedAt.getTime(),
        skillLevel: profile.skillLevel || 'beginner',
        learningGoals: profile.learningGoals || [],
        preferences: {
          theme: profile.preferences?.theme || 'auto',
          notifications: profile.preferences?.notifications || true,
          privacy: profile.preferences?.privacy || 'public',
        },
        stats: {
          totalDrawingTime: 0,
          totalLessonsCompleted: 0,
          totalArtworksCreated: 0,
          currentStreak: 0,
          longestStreak: 0,
        },
      };
      dispatch({ type: 'SET_USER', user: userProfile });
      
      // Create initial progress
      const initialProgress: UserProgress = {
        userId: newUser.id,
        level: 1,
        xp: 0,
        xpToNextLevel: 1000,
        skillPoints: {
          drawing: 0,
          theory: 0,
          creativity: 0,
          technique: 0,
        },
        achievements: [],
        streakDays: 0,
        lastActivityDate: new Date().toISOString(),
        learningStats: {
          lessonsCompleted: 0,
          skillTreesCompleted: 0,
          totalStudyTime: 0,
          averageSessionTime: 0,
          strongestSkills: [],
          improvementAreas: [],
        },
      };
      dispatch({ type: 'SET_PROGRESS', progress: initialProgress });
      
      // Create initial portfolio
      const initialPortfolio = await portfolioManager.createPortfolio(newUser.id);
      // Ensure portfolio has all required properties
      const completePortfolio: Portfolio = {
        ...initialPortfolio,
        stats: {
          ...initialPortfolio.stats,
          followerCount: 0, // Ensure followerCount is present
          publicArtworks: 0,
          averageTimeSpent: 0,
        },
      };
      dispatch({ type: 'SET_PORTFOLIO', portfolio: completePortfolio });
      
      eventBus.emit('user:created', { user: newUser });
      dispatch({ type: 'SET_LOADING', loading: false });
    } catch (error) {
      console.error('Failed to create user:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to create user account' });
      throw error;
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!state.user) return;
    
    try {
      // Use updateUser method (which exists in ProfileSystem)
      const updatedUser = await profileSystem.updateUser({
        displayName: updates.displayName,
        avatar: updates.avatar,
        // Convert UserProfile updates to User format
      });
      
      if (updatedUser) {
        const userProfile: UserProfile = {
          ...state.user,
          ...updates,
          lastActiveAt: Date.now(),
        };
        dispatch({ type: 'SET_USER', user: userProfile });
        eventBus.emit('user:updated', { user: userProfile });
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to update profile' });
      throw error;
    }
  };

  const deleteAccount = async (): Promise<void> => {
    if (!state.user) return;
    
    try {
      await profileSystem.logout(); // Use existing logout method
      dispatch({ type: 'SET_USER', user: null as any }); // Handle null assignment
      dispatch({ type: 'SET_PROGRESS', progress: null as any }); // Handle null assignment
      dispatch({ type: 'SET_PORTFOLIO', portfolio: null as any }); // Handle null assignment
      eventBus.emit('user:deleted', { userId: state.user.id });
    } catch (error) {
      console.error('Failed to delete account:', error);
      dispatch({ type: 'SET_ERROR', error: 'Failed to delete account' });
      throw error;
    }
  };

  // Progress management
  const addXP = (amount: number, source?: string) => {
    dispatch({ type: 'ADD_XP', amount, source });
    eventBus.emit('user:xpGained', { amount, source, newTotal: (state.progress?.xp || 0) + amount });
    
    // Check for level up
    if (state.progress) {
      const currentLevel = state.progress.level;
      const newXP = state.progress.xp + amount;
      const xpPerLevel = 1000;
      const newLevel = Math.floor(newXP / xpPerLevel) + 1;
      
      if (newLevel > currentLevel) {
        eventBus.emit('user:levelUp', { oldLevel: currentLevel, newLevel });
        // Trigger level up achievement
        addAchievement(`level_${newLevel}`);
      }
    }
  };

  const addAchievement = (achievementId: string) => {
    // Use progressionSystem to unlock achievement
    progressionSystem.unlockAchievement({
      id: achievementId,
      name: getAchievementName(achievementId),
      title: getAchievementName(achievementId),
      description: getAchievementDescription(achievementId),
      icon: getAchievementIcon(achievementId),
      iconUrl: getAchievementIcon(achievementId),
      category: getAchievementCategory(achievementId),
      requirements: { type: 'custom', value: 1 },
      rarity: 'common',
      xpReward: getAchievementXP(achievementId),
      unlockedAt: Date.now(),
    });
  };

  const updateStreak = () => {
    if (!state.progress) return;
    
    const today = new Date().toDateString();
    const lastActivity = new Date(state.progress.lastActivityDate).toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    let newStreak = state.progress.streakDays;
    
    if (lastActivity === yesterday) {
      // Continuing streak
      newStreak += 1;
    } else if (lastActivity !== today) {
      // Streak broken
      newStreak = 1;
    }
    // If lastActivity === today, no change needed
    
    dispatch({ type: 'UPDATE_STREAK', streakDays: newStreak });
    
    // Check streak achievements
    if (newStreak === 7) addAchievement('week_streak');
    if (newStreak === 30) addAchievement('month_streak');
    if (newStreak === 100) addAchievement('legendary_streak');
  };

  const checkDailyStreak = () => {
    updateStreak();
  };

  // Portfolio management
  const saveArtwork = async (artwork: Omit<Artwork, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!state.user) throw new Error('User not logged in');
    
    try {
      const newArtwork = await portfolioManager.addArtwork(state.user.id, artwork);
      dispatch({ type: 'ADD_ARTWORK', artwork: newArtwork });
      eventBus.emit('artwork:created', { artwork: newArtwork });
      
      // Award achievement for first artwork
      if (state.portfolio && state.portfolio.stats.totalArtworks === 0) {
        addAchievement('first_artwork');
      }
      
      return newArtwork.id;
    } catch (error) {
      console.error('Failed to save artwork:', error);
      throw error;
    }
  };

  const updateArtwork = async (artworkId: string, updates: Partial<Artwork>): Promise<void> => {
    if (!state.user) return;
    
    try {
      await portfolioManager.updateArtwork(artworkId, updates);
      dispatch({ type: 'UPDATE_ARTWORK', artworkId, updates });
      eventBus.emit('artwork:updated', { artworkId, updates });
    } catch (error) {
      console.error('Failed to update artwork:', error);
      throw error;
    }
  };

  const deleteArtwork = async (artworkId: string): Promise<void> => {
    if (!state.user) return;
    
    try {
      await portfolioManager.deleteArtwork(artworkId);
      dispatch({ type: 'DELETE_ARTWORK', artworkId });
      eventBus.emit('artwork:deleted', { artworkId });
    } catch (error) {
      console.error('Failed to delete artwork:', error);
      throw error;
    }
  };

  const createCollection = async (collection: Omit<Collection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
    if (!state.user) throw new Error('User not logged in');
    
    try {
      const newCollection = await portfolioManager.createCollection(state.user.id, collection);
      dispatch({ type: 'ADD_COLLECTION', collection: newCollection });
      eventBus.emit('collection:created', { collection: newCollection });
      return newCollection.id;
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  };

  // Stats and analytics
  const getDailyGoalProgress = (): number => {
    // Calculate progress towards daily goal (e.g., XP gained today)
    if (!state.progress) return 0;
    
    const today = new Date().toDateString();
    const lastActivity = new Date(state.progress.lastActivityDate).toDateString();
    
    if (lastActivity === today) {
      // Return progress based on some daily metric
      return Math.min(100, (state.progress.xp % 100)); // Example: 100 XP daily goal
    }
    
    return 0;
  };

  const getWeeklyStats = () => {
    if (!state.progress) return null;
    
    return {
      lessonsCompleted: state.progress.learningStats.lessonsCompleted,
      totalStudyTime: state.progress.learningStats.totalStudyTime,
      xpGained: state.progress.xp,
      achievementsUnlocked: state.progress.achievements.length,
      streakDays: state.progress.streakDays,
    };
  };

  const getLearningInsights = () => {
    if (!state.progress) return null;
    
    return {
      strongestSkills: state.progress.learningStats.strongestSkills,
      improvementAreas: state.progress.learningStats.improvementAreas,
      averageSessionTime: state.progress.learningStats.averageSessionTime,
      totalStudyTime: state.progress.learningStats.totalStudyTime,
      recommendation: generateLearningRecommendation(),
    };
  };

  // Add missing updateLearningStats method
  const updateLearningStats = (category: string, stats: Record<string, number>) => {
    if (!state.progress) return;
    
    const updates: Partial<UserProgress> = {
      learningStats: {
        ...state.progress.learningStats,
        ...stats,
      },
      lastActivityDate: new Date().toISOString(),
    };
    
    dispatch({ type: 'UPDATE_PROGRESS', updates });
    eventBus.emit('user:learningStatsUpdated', { category, stats });
  };

  // Helper functions
  const getAchievementName = (id: string): string => {
    const names: Record<string, string> = {
      'first_stroke': 'First Stroke',
      'hundred_strokes': 'Century Mark',
      'first_artwork': 'Creator',
      'first_export': 'Publisher',
      'first_share': 'Socialite',
      'layer_master': 'Layer Master',
      'week_streak': 'Week Warrior',
      'month_streak': 'Monthly Master',
      'legendary_streak': 'Legendary Learner',
    };
    return names[id] || 'Achievement';
  };

  const getAchievementDescription = (id: string): string => {
    const descriptions: Record<string, string> = {
      'first_stroke': 'Made your first brush stroke',
      'hundred_strokes': 'Completed 100 brush strokes',
      'first_artwork': 'Created your first artwork',
      'first_export': 'Exported your first artwork',
      'first_share': 'Shared your first artwork',
      'layer_master': 'Used 5 or more layers',
      'week_streak': 'Maintained a 7-day learning streak',
      'month_streak': 'Maintained a 30-day learning streak',
      'legendary_streak': 'Maintained a 100-day learning streak',
    };
    return descriptions[id] || 'Achievement unlocked';
  };

  const getAchievementIcon = (id: string): string => {
    const icons: Record<string, string> = {
      'first_stroke': '🎨',
      'hundred_strokes': '💯',
      'first_artwork': '🖼️',
      'first_export': '📤',
      'first_share': '📱',
      'layer_master': '📚',
      'week_streak': '🔥',
      'month_streak': '🏆',
      'legendary_streak': '👑',
    };
    return icons[id] || '🏅';
  };

  const getAchievementCategory = (id: string): Achievement['category'] => {
    if (id.includes('streak')) return 'streak';
    if (id.includes('layer') || id.includes('stroke')) return 'skill';
    if (id.includes('share') || id.includes('export')) return 'social';
    return 'milestone';
  };

  const getAchievementXP = (id: string): number => {
    const xpRewards: Record<string, number> = {
      'first_stroke': 10,
      'hundred_strokes': 50,
      'first_artwork': 25,
      'first_export': 15,
      'first_share': 20,
      'layer_master': 30,
      'week_streak': 100,
      'month_streak': 500,
      'legendary_streak': 2000,
    };
    return xpRewards[id] || 10;
  };

  const generateLearningRecommendation = (): string => {
    if (!state.progress) return 'Complete your profile to get recommendations';
    
    const { learningStats } = state.progress;
    
    if (learningStats.lessonsCompleted < 5) {
      return 'Start with the Drawing Fundamentals skill tree';
    }
    
    if (learningStats.averageSessionTime < 10) {
      return 'Try to practice for at least 10 minutes per session';
    }
    
    if (learningStats.improvementAreas.length > 0) {
      return `Focus on improving: ${learningStats.improvementAreas.join(', ')}`;
    }
    
    return 'Great progress! Keep practicing daily to maintain your streak';
  };

  const contextValue: UserProgressContextValue = {
    user: state.user,
    progress: state.progress,
    portfolio: state.portfolio,
    isLoading: state.isLoading,
    error: state.error,
    
    // User management
    createUser,
    updateProfile,
    deleteAccount,
    
    // Progress management
    addXP,
    addAchievement,
    updateStreak,
    checkDailyStreak,
    updateLearningStats, // Added missing method
    
    // Portfolio management
    saveArtwork,
    updateArtwork,
    deleteArtwork,
    createCollection,
    
    // Stats and analytics
    getDailyGoalProgress,
    getWeeklyStats,
    getLearningInsights,
  };

  return (
    <UserProgressContext.Provider value={contextValue}>
      {children}
    </UserProgressContext.Provider>
  );
}

export function useUserProgress() {
  const context = useContext(UserProgressContext);
  if (!context) {
    throw new Error('useUserProgress must be used within a UserProgressProvider');
  }
  return context;
}

// Additional hook for progress-specific functionality
export function useProgress() {
  const { progress } = useUserProgress();
  
  return {
    level: progress?.level || 1,
    xp: progress?.xp || 0,
    xpToNextLevel: progress?.xpToNextLevel || 1000,
    xpProgress: progress ? Math.min(1, progress.xp / 1000) : 0, // Ensure 0-1 range
    streakDays: progress?.streakDays || 0,
    achievements: progress?.achievements || [],
    learningStats: progress?.learningStats || {
      lessonsCompleted: 0,
      skillTreesCompleted: 0,
      totalStudyTime: 0,
      averageSessionTime: 0,
      strongestSkills: [],
      improvementAreas: [],
    },
  };
}