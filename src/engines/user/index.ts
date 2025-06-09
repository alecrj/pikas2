// User engine exports and operations
export { ProfileSystem } from './ProfileSystem';
export { ProgressionSystem } from './ProgressionSystem';
export { PortfolioManager } from './PortfolioManager';

// FIXED: Create singleton instances
import { ProfileSystem } from './ProfileSystem';
import { ProgressionSystem } from './ProgressionSystem';
import { PortfolioManager } from './PortfolioManager';
import { User } from '../../types';

export const profileSystem = new ProfileSystem();
export const progressionSystem = new ProgressionSystem();
export const portfolioManager = new PortfolioManager();

/**
 * User API - High-level interface for user management
 * Provides simplified access to user functionality
 */

// User dashboard data
export interface UserDashboard {
  user: User | null;
  progressSummary: {
    level: number;
    xp: number;
    xpToNext: number;
    streakDays: number;
    lessonsCompleted: number;
  };
  achievementProgress: {
    total: number;
    unlocked: number;
    recent: any[];
  };
  portfolioStats: {
    totalArtworks: number;
    publicArtworks: number;
    totalLikes: number;
    totalViews: number;
  };
}

export const getUserDashboard = async (): Promise<UserDashboard> => {
  const user = profileSystem.getCurrentUser();
  const progressSummary = profileSystem.getProgressSummary();
  const achievementProgress = progressionSystem.getAchievementProgress();
  const portfolioStats = portfolioManager.getPortfolioStats();
  
  return {
    user,
    progressSummary,
    achievementProgress,
    portfolioStats,
  };
};

// Authentication
export async function login(email: string, password: string): Promise<User> {
  try {
    // In production, authenticate with backend
    const existingUser = await profileSystem.getCurrentUser();
    
    if (existingUser && existingUser.email === email) {
      return existingUser;
    }
    
    return profileSystem.createUser(
      email,
      email.split('@')[0], // username from email
      email.split('@')[0]  // display name from email
    );
  } catch (error) {
    throw new Error(`Login failed: ${error}`);
  }
}

export async function logout(): Promise<void> {
  try {
    await profileSystem.logout();
  } catch (error) {
    throw new Error(`Logout failed: ${error}`);
  }
}

export async function updatePreferences(preferences: any): Promise<void> {
  try {
    await profileSystem.updatePreferences(preferences);
  } catch (error) {
    throw new Error(`Failed to update preferences: ${error}`);
  }
}

export async function updateStreak(): Promise<void> {
  try {
    await profileSystem.updateStreak();
  } catch (error) {
    throw new Error(`Failed to update streak: ${error}`);
  }
}

export async function createArtwork(artworkData: any): Promise<any> {
  try {
    return portfolioManager.createArtwork(artworkData);
  } catch (error) {
    throw new Error(`Failed to create artwork: ${error}`);
  }
}

export async function shareArtwork(artworkId: string): Promise<void> {
  try {
    await portfolioManager.shareArtwork(artworkId);
  } catch (error) {
    throw new Error(`Failed to share artwork: ${error}`);
  }
}