import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Achievement, Artwork, LearningProgress } from '../types';
import { profileSystem } from '../engines/user/ProfileSystem';
import { progressionSystem } from '../engines/user/ProgressionSystem';
import { portfolioManager } from '../engines/user/PortfolioManager';
import { progressTracker } from '../engines/learning/ProgressTracker';
import { errorHandler } from '../engines/core/ErrorHandler';

/**
 * User Progress Context - Manages user state, progression, and achievements
 * Central state management for all user-related data
 */

interface UserProgressContextValue {
  // User state
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Progress state
  level: number;
  xp: number;
  xpToNextLevel: number;
  xpProgress: number; // 0-100 percentage
  streakDays: number;
  dailyGoalProgress: number; // 0-100 percentage
  
  // Achievements
  achievements: Achievement[];
  recentAchievements: Achievement[];
  achievementProgress: {
    total: number;
    unlocked: number;
    percentage: number;
  };
  
  // Portfolio
  artworks: Artwork[];
  portfolioStats: {
    totalArtworks: number;
    publicArtworks: number;
    totalLikes: number;
    totalViews: number;
  };
  
  // Learning progress
  learningProgress: LearningProgress | null;
  currentLesson: string | null;
  recommendedLessons: string[];
  
  // Actions
  createUser: (userData: Partial<User>) => Promise<User>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  addXP: (amount: number) => Promise<void>;
  addAchievement: (achievementId: string) => Promise<void>;
  unlockAchievement: (achievementId: string) => Promise<void>;
  updateDailyProgress: (xp: number) => Promise<void>;
  checkDailyStreak: () => Promise<void>;
}

const UserProgressContext = createContext<UserProgressContextValue | undefined>(undefined);

export const UserProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [portfolioStats, setPortfolioStats] = useState({
    totalArtworks: 0,
    publicArtworks: 0,
    totalLikes: 0,
    totalViews: 0,
  });
  const [learningProgress, setLearningProgress] = useState<LearningProgress | null>(null);
  const [recommendedLessons, setRecommendedLessons] = useState<string[]>([]);
  const [currentLesson, setCurrentLesson] = useState<string | null>(null);

  // Initialize user data
  useEffect(() => {
    initializeUser();
  }, []);

  // Subscribe to user updates
  useEffect(() => {
    const unsubscribeUser = profileSystem.subscribeToUser((updatedUser) => {
      setUser(updatedUser);
    });

    const unsubscribeProgress = progressionSystem.subscribeToProgress((event) => {
      if (event.type === 'achievement_unlocked' && event.achievement) {
        setRecentAchievements(prev => [event.achievement!, ...prev].slice(0, 5));
        loadAchievements();
      }
    });

    const unsubscribePortfolio = portfolioManager.subscribeToPortfolio((updatedArtworks) => {
      setArtworks(updatedArtworks);
      updatePortfolioStats();
    });

    const unsubscribeLearning = progressTracker.subscribeToProgress((progress) => {
      setLearningProgress(progress);
      updateRecommendedLessons();
    });

    return () => {
      unsubscribeUser();
      unsubscribeProgress();
      unsubscribeLearning();
    };
  }, []);

  const initializeUser = async () => {
    try {
      setIsLoading(true);
      const currentUser = profileSystem.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await loadUserData();
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('USER_INIT_ERROR', 'Failed to initialize user', 'medium', error)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserData = async () => {
    await Promise.all([
      loadAchievements(),
      loadPortfolio(),
      loadLearningProgress(),
    ]);
  };

  const loadAchievements = async () => {
    const achievementData = progressionSystem.getAchievementProgress();
    setAchievements(user?.achievements || []);
  };

  const loadPortfolio = async () => {
    const userArtworks = portfolioManager.getUserArtworks();
    setArtworks(userArtworks);
    updatePortfolioStats();
  };

  const loadLearningProgress = async () => {
    const progress = progressTracker.getProgress();
    setLearningProgress(progress);
    updateRecommendedLessons();
  };

  const updatePortfolioStats = () => {
    const stats = portfolioManager.getPortfolioStats();
    setPortfolioStats({
      totalArtworks: stats.totalArtworks,
      publicArtworks: stats.publicArtworks,
      totalLikes: stats.totalLikes,
      totalViews: stats.totalViews,
    });
  };

  const updateRecommendedLessons = () => {
    const recommended = progressTracker.getRecommendedLessons(3);
    setRecommendedLessons(recommended);
  };

  const createUser = async (userData: Partial<User>): Promise<User> => {
    try {
      setIsLoading(true);
      
      const newUser = await profileSystem.createUser(
        userData.email || `${userData.displayName || 'newartist'}@pikaso.app`,
        userData.username || userData.displayName?.toLowerCase().replace(/\s+/g, '') || 'newartist',
        userData.displayName || 'New Artist'
      );

      setUser(newUser);
      await loadUserData();
      
      return newUser;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('USER_CREATE_ERROR', 'Failed to create user', 'high', error)
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const existingUser = profileSystem.getCurrentUser();
      if (existingUser && existingUser.email === email) {
        setUser(existingUser);
      } else {
        const newUser = await profileSystem.createUser(
          email,
          email.split('@')[0],
          email.split('@')[0]
        );
        setUser(newUser);
      }
      await loadUserData();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.authError('Login failed', error)
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await profileSystem.logout();
      setUser(null);
      setAchievements([]);
      setArtworks([]);
      setLearningProgress(null);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.authError('Logout failed', error)
      );
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    try {
      const updatedUser = await profileSystem.updateUser(updates);
      setUser(updatedUser);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('PROFILE_UPDATE_ERROR', 'Failed to update profile', 'medium', error)
      );
      throw error;
    }
  };

  const addXP = async (amount: number) => {
    try {
      const result = await profileSystem.addXP(amount);
      if (result.leveledUp) {
        if (typeof window !== 'undefined' && (window as any).celebrateLevelUp) {
          (window as any).celebrateLevelUp({
            newLevel: result.newLevel,
            message: `Congratulations! You've reached level ${result.newLevel}!`,
          });
        }
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('XP_ADD_ERROR', 'Failed to add XP', 'low', error)
      );
    }
  };

  const addAchievement = async (achievementId: string) => {
    if (!user) return;
    const achievement = user.achievements.find((a: Achievement) => a.id === achievementId);
    if (achievement && !achievement.unlockedAt) {
      achievement.unlockedAt = new Date();
      await progressionSystem.unlockAchievement(achievement);
      setUser({ ...user });
      setRecentAchievements(prev => [achievement, ...prev].slice(0, 5));
      await loadAchievements();
      if (typeof window !== 'undefined' && (window as any).showAchievementUnlocked) {
        (window as any).showAchievementUnlocked(achievement);
      }
    }
  };

  const unlockAchievement = async (achievementId: string) => {
    await addAchievement(achievementId);
  };

  const updateDailyProgress = async (xp: number) => {
    try {
      await progressTracker.updateDailyProgress(xp);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('DAILY_PROGRESS_ERROR', 'Failed to update daily progress', 'low', error)
      );
    }
  };

  const checkDailyStreak = async () => {
    try {
      await profileSystem.updateStreak();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('STREAK_UPDATE_ERROR', 'Failed to update streak', 'low', error)
      );
    }
  };

  // Calculate derived values
  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const xpForNextLevel = Math.floor(100 * Math.pow(1.5, level));
  const xpProgress = (xp / xpForNextLevel) * 100;
  const streakDays = user?.streakDays || 0;
  const dailyGoalProgress = progressTracker.getDailyProgressPercentage();

  const achievementProgress = progressionSystem.getAchievementProgress();

  const value: UserProgressContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    level,
    xp,
    xpToNextLevel: xpForNextLevel - xp,
    xpProgress,
    streakDays,
    dailyGoalProgress,
    achievements,
    recentAchievements,
    achievementProgress: {
      total: achievementProgress.total,
      unlocked: achievementProgress.unlocked,
      percentage: achievementProgress.total > 0 
        ? (achievementProgress.unlocked / achievementProgress.total) * 100 
        : 0,
    },
    artworks,
    portfolioStats,
    learningProgress,
    currentLesson,
    recommendedLessons,
    createUser,
    login,
    logout,
    updateProfile,
    addXP,
    addAchievement,
    unlockAchievement,
    updateDailyProgress,
    checkDailyStreak,
  };

  return (
    <UserProgressContext.Provider value={value}>
      {children}
    </UserProgressContext.Provider>
  );
};

export const useUserProgress = (): UserProgressContextValue => {
  const context = useContext(UserProgressContext);
  if (!context) {
    throw new Error('useUserProgress must be used within a UserProgressProvider');
  }
  return context;
};

// FIXED: Properly export all hooks
export const useUser = () => {
  const { user, isLoading, isAuthenticated } = useUserProgress();
  return { user, isLoading, isAuthenticated };
};

export const useProgress = () => {
  const { level, xp, xpToNextLevel, xpProgress, streakDays, dailyGoalProgress } = useUserProgress();
  return { level, xp, xpToNextLevel, xpProgress, streakDays, dailyGoalProgress };
};

export const useAchievements = () => {
  const { achievements, recentAchievements, achievementProgress } = useUserProgress();
  return { achievements, recentAchievements, achievementProgress };
};

export const usePortfolio = () => {
  const { artworks, portfolioStats } = useUserProgress();
  return { artworks, portfolioStats };
};

export const useLearning = () => {
  const { learningProgress, currentLesson, recommendedLessons } = useUserProgress();
  return { learningProgress, currentLesson, recommendedLessons };
};