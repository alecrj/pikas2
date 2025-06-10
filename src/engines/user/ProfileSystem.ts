import { User, UserPreferences, UserStats, UserProfile } from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';

/**
 * User Profile Management System
 * Handles user accounts, preferences, and profile data with enterprise-level reliability
 */
export class ProfileSystem {
  private static instance: ProfileSystem;
  private currentUser: User | null = null;
  private userListeners: Set<(user: User | null) => void> = new Set();

  private constructor() {
    this.loadUserFromStorage();
  }

  public static getInstance(): ProfileSystem {
    if (!ProfileSystem.instance) {
      ProfileSystem.instance = new ProfileSystem();
    }
    return ProfileSystem.instance;
  }

  private async loadUserFromStorage(): Promise<void> {
    try {
      const storedUser = await dataManager.getUserProfile();
      if (storedUser) {
        this.currentUser = storedUser;
        this.notifyListeners();
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('USER_LOAD_ERROR', 'Failed to load user profile', 'medium', error)
      );
    }
  }

  // FIXED: Corrected method signature to match expected interface
  public async createUser(
    email: string,
    username: string,
    displayName: string
  ): Promise<User>;
  public async createUser(
    profile: Partial<UserProfile>
  ): Promise<User>;
  public async createUser(
    emailOrProfile: string | Partial<UserProfile>,
    username?: string,
    displayName?: string
  ): Promise<User> {
    try {
      let email: string;
      let finalUsername: string;
      let finalDisplayName: string;
      
      if (typeof emailOrProfile === 'string') {
        // Legacy three-parameter signature
        email = emailOrProfile;
        finalUsername = username!;
        finalDisplayName = displayName!;
      } else {
        // New single-parameter signature
        email = emailOrProfile.email || '';
        finalUsername = emailOrProfile.displayName || 'User';
        finalDisplayName = emailOrProfile.displayName || 'User';
      }

      const newUser: User = {
        id: this.generateUserId(),
        email, // FIXED: Added email property
        username: finalUsername,
        displayName: finalDisplayName,
        level: 1,
        xp: 0,
        totalXP: 0,
        streakDays: 0,
        lastActiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(), // FIXED: Added updatedAt property
        preferences: this.getDefaultPreferences(),
        stats: this.getDefaultStats(),
        achievements: [],
        following: [],
        followers: [],
        avatar: typeof emailOrProfile === 'object' ? emailOrProfile.avatar : undefined,
        bio: undefined,
        isVerified: false,
        isOnline: true,
        lastSeenAt: Date.now(),
      };

      await this.setCurrentUser(newUser);
      return newUser;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('USER_CREATE_ERROR', 'Failed to create user', 'high', error)
      );
      throw error;
    }
  }

  public async setCurrentUser(user: User): Promise<void> {
    this.currentUser = user;
    await dataManager.saveUserProfile(user);
    errorHandler.setUserId(user.id);
    this.notifyListeners();
  }

  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  // FIXED: Added missing updateProfile method
  public async updateProfile(userId: string, updates: Partial<User>): Promise<User> {
    if (!this.currentUser || this.currentUser.id !== userId) {
      throw new Error('User not found or unauthorized');
    }

    try {
      this.currentUser = {
        ...this.currentUser,
        ...updates,
        updatedAt: new Date(),
      };

      await dataManager.saveUserProfile(this.currentUser);
      this.notifyListeners();
      return this.currentUser;
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('PROFILE_UPDATE_ERROR', 'Failed to update profile', 'medium', error)
      );
      throw error;
    }
  }

  // FIXED: Added missing deleteUser method
  public async deleteUser(userId: string): Promise<void> {
    if (!this.currentUser || this.currentUser.id !== userId) {
      throw new Error('User not found or unauthorized');
    }

    try {
      await dataManager.remove('user_profile');
      this.currentUser = null;
      this.notifyListeners();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('USER_DELETE_ERROR', 'Failed to delete user', 'high', error)
      );
      throw error;
    }
  }

  public async updateUser(updates: Partial<User>): Promise<User | null> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    this.currentUser = {
      ...this.currentUser,
      ...updates,
      updatedAt: new Date(),
    };

    await dataManager.saveUserProfile(this.currentUser);
    this.notifyListeners();
    return this.currentUser;
  }

  public async updatePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // FIXED: Properly update nested preferences object
    this.currentUser.preferences = {
      ...this.currentUser.preferences,
      ...preferences,
    };

    await dataManager.saveUserProfile(this.currentUser);
    this.notifyListeners();
  }

  public async updateStats(statUpdates: Partial<UserStats>): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // FIXED: Properly update nested stats object
    this.currentUser.stats = {
      ...this.currentUser.stats,
      ...statUpdates,
    };

    await dataManager.saveUserProfile(this.currentUser);
    this.notifyListeners();
  }

  public async incrementStat(statName: keyof UserStats, amount: number = 1): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // FIXED: Properly access nested stats object
    const currentValue = this.currentUser.stats[statName];
    if (typeof currentValue === 'number') {
      await this.updateStats({
        [statName]: currentValue + amount,
      } as Partial<UserStats>);
    }
  }

  public async updateStreak(): Promise<void> {
    if (!this.currentUser) return;

    const now = new Date();
    // FIXED: Properly access lastActiveDate property
    const lastActive = new Date(this.currentUser.lastActiveDate);
    const daysSinceLastActive = Math.floor(
      (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActive === 0) {
      // Already active today
      return;
    } else if (daysSinceLastActive === 1) {
      // Consecutive day
      this.currentUser.streakDays++;
    } else {
      // Streak broken
      this.currentUser.streakDays = 1;
    }

    // FIXED: Properly update lastActiveDate property
    this.currentUser.lastActiveDate = now;
    await dataManager.saveUserProfile(this.currentUser);
    this.notifyListeners();
  }

  public async addXP(amount: number): Promise<{
    leveledUp: boolean;
    newLevel?: number;
    xpToNextLevel: number;
  }> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // FIXED: Properly access level and xp properties
    const oldLevel = this.currentUser.level;
    this.currentUser.xp += amount;
    this.currentUser.totalXP += amount;

    // Level calculation (100 XP per level with increasing requirements)
    const xpForNextLevel = this.getXPRequiredForLevel(this.currentUser.level + 1);
    
    let leveledUp = false;
    while (this.currentUser.xp >= xpForNextLevel) {
      this.currentUser.xp -= xpForNextLevel;
      this.currentUser.level++;
      leveledUp = true;
    }

    await dataManager.saveUserProfile(this.currentUser);
    this.notifyListeners();

    return {
      leveledUp,
      newLevel: leveledUp ? this.currentUser.level : undefined,
      xpToNextLevel: this.getXPRequiredForLevel(this.currentUser.level + 1) - this.currentUser.xp,
    };
  }

  private getXPRequiredForLevel(level: number): number {
    // Progressive XP requirements: 100, 150, 225, 337, ...
    return Math.floor(100 * Math.pow(1.5, level - 1));
  }

  public async followUser(userId: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    if (!this.currentUser.following.includes(userId)) {
      this.currentUser.following.push(userId);
      await dataManager.saveUserProfile(this.currentUser);
      this.notifyListeners();
    }
  }

  public async unfollowUser(userId: string): Promise<void> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    const index = this.currentUser.following.indexOf(userId);
    if (index > -1) {
      this.currentUser.following.splice(index, 1);
      await dataManager.saveUserProfile(this.currentUser);
      this.notifyListeners();
    }
  }

  public async logout(): Promise<void> {
    this.currentUser = null;
    await dataManager.remove('user_profile');
    this.notifyListeners();
  }

  public subscribeToUser(callback: (user: User | null) => void): () => void {
    this.userListeners.add(callback);
    callback(this.currentUser); // Immediate callback with current state
    return () => this.userListeners.delete(callback);
  }

  private notifyListeners(): void {
    this.userListeners.forEach(callback => callback(this.currentUser));
  }

  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      theme: 'auto', // FIXED: Use valid theme value
      language: 'en',
      notifications: {
        lessons: true,
        achievements: true,
        social: true,
        challenges: true,
        lessonCompletions: true,
        achievementUnlocks: true,
        challengeAlerts: true,
        socialActivity: true,
      },
      privacy: {
        profile: 'public',
        artwork: 'public',
        progress: 'public',
        showProgress: true,
        allowMessages: true,
        portfolioVisibility: 'public',
      },
      learning: {
        dailyGoal: 100,
        difficulty: 'adaptive',
      },
      drawingPreferences: {
        defaultBrush: 'pencil',
        pressureSensitivity: 0.8,
        smoothing: 0.5,
        gridEnabled: false,
        autosaveInterval: 30000, // 30 seconds
      },
    };
  }

  private getDefaultStats(): UserStats {
    return {
      totalDrawingTime: 0,
      totalLessonsCompleted: 0,
      totalArtworksCreated: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageSessionTime: 0,
      favoriteTools: [],
      skillDistribution: {},
      
      // FIXED: Include all required stats properties
      artworksCreated: 0,
      artworksShared: 0,
      challengesCompleted: 0,
      skillsUnlocked: 0,
      perfectLessons: 0,
      lessonsCompleted: 0,
    };
  }

  // Analytics helpers
  public getProgressSummary(): {
    level: number;
    xp: number;
    xpProgress: number;
    streakDays: number;
    totalArtworks: number;
    completionRate: number;
  } | null {
    if (!this.currentUser) return null;

    // FIXED: Properly access level and xp properties
    const xpForCurrentLevel = this.getXPRequiredForLevel(this.currentUser.level);
    const xpForNextLevel = this.getXPRequiredForLevel(this.currentUser.level + 1);
    const xpProgress = this.currentUser.xp / xpForNextLevel;

    // FIXED: Properly access nested stats properties
    const completionRate = this.currentUser.stats.totalLessonsCompleted > 0
      ? this.currentUser.stats.perfectLessons / this.currentUser.stats.totalLessonsCompleted
      : 0;

    return {
      level: this.currentUser.level,
      xp: this.currentUser.xp,
      xpProgress,
      streakDays: this.currentUser.streakDays,
      totalArtworks: this.currentUser.stats.totalArtworksCreated,
      completionRate,
    };
  }
}

// Export singleton instance
export const profileSystem = ProfileSystem.getInstance();