/**
 * User Engine Module
 * Manages user profiles, progression, and portfolios
 */

export { ProfileSystem, profileSystem } from './ProfileSystem';
export { ProgressionSystem, progressionSystem } from './ProgressionSystem';
export { PortfolioManager, portfolioManager } from './PortfolioManager';

// Re-export user-related types
export type {
  User,
  UserPreferences,
  UserStats,
  Achievement,
  AchievementType,
  Artwork,
} from '../../types';

// User engine initialization
export const initializeUserEngine = async (): Promise<void> => {
  console.log('👤 Initializing User Engine...');
  
  // Systems initialize themselves through singleton pattern
  // Any additional initialization can go here
  
  console.log('✅ User Engine initialized successfully');
};

// Utility functions for user management
export const getUserEngineStatus = () => {
  const user = profileSystem.getCurrentUser();
  const progressSummary = profileSystem.getProgressSummary();
  const achievementProgress = progressionSystem.getAchievementProgress();
  const portfolioStats = portfolioManager.getPortfolioStats();
  
  return {
    isLoggedIn: !!user,
    user: user ? {
      id: user.id,
      username: user.username,
      level: user.level,
      xp: user.xp,
      streakDays: user.streakDays,
    } : null,
    progress: progressSummary,
    achievements: achievementProgress,
    portfolio: portfolioStats,
  };
};

// Quick user actions
export const quickActions = {
  async login(email: string, password: string): Promise<User> {
    // In production, this would authenticate with backend
    // For MVP, we'll create/load a local user
    const existingUser = await profileSystem.getCurrentUser();
    if (existingUser && existingUser.email === email) {
      return existingUser;
    }
    
    // Create new user for demo
    return profileSystem.createUser(
      email,
      email.split('@')[0], // username from email
      email.split('@')[0] // display name from email
    );
  },
  
  async logout(): Promise<void> {
    await profileSystem.logout();
  },
  
  async updatePreferences(preferences: any): Promise<void> {
    await profileSystem.updatePreferences(preferences);
  },
  
  async checkDailyStreak(): Promise<void> {
    await profileSystem.updateStreak();
  },
  
  async createArtwork(artworkData: any): Promise<any> {
    return portfolioManager.createArtwork(artworkData);
  },
  
  async shareArtwork(artworkId: string): Promise<void> {
    await portfolioManager.shareArtwork(artworkId);
  },
};