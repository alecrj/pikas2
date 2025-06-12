import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, LearningProgress, Portfolio } from '../../types';

/**
 * Enhanced Data Manager with all required methods for contexts and engines
 * Handles data persistence with proper error handling and type safety
 */
class DataManager {
  private static instance: DataManager;
  private cache: Map<string, any> = new Map();
  private writeQueue: Map<string, Promise<void>> = new Map();

  private constructor() {}

  public static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // ---- GENERIC STORAGE METHODS ----

  public async get<T = any>(key: string): Promise<T | null> {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const value = await AsyncStorage.getItem(key);
      if (value === null) return null;

      const parsed = JSON.parse(value);

      // Cache the result
      this.cache.set(key, parsed);

      return parsed;
    } catch (error) {
      console.error(`Failed to get data for key ${key}:`, error);
      return null;
    }
  }

  public async set<T = any>(key: string, value: T): Promise<void> {
    try {
      // Wait for any pending write for this key
      if (this.writeQueue.has(key)) {
        await this.writeQueue.get(key);
      }

      // Create write promise
      const writePromise = this.performWrite(key, value);
      this.writeQueue.set(key, writePromise);

      await writePromise;

      // Update cache
      this.cache.set(key, value);

      // Clear from queue
      this.writeQueue.delete(key);
    } catch (error) {
      console.error(`Failed to set data for key ${key}:`, error);
      this.writeQueue.delete(key);
      throw error;
    }
  }

  private async performWrite<T>(key: string, value: T): Promise<void> {
    const serialized = JSON.stringify(value);
    await AsyncStorage.setItem(key, serialized);
  }

  public async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      this.cache.delete(key);
    } catch (error) {
      console.error(`Failed to remove data for key ${key}:`, error);
      throw error;
    }
  }

  public async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      this.cache.clear();
      this.writeQueue.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
      throw error;
    }
  }

  // ---- USER PROFILE METHODS ----

  public async getUserProfile(): Promise<UserProfile | null> {
    return this.get<UserProfile>('user_profile');
  }

  public async saveUserProfile(profile: UserProfile): Promise<void> {
    return this.set('user_profile', profile);
  }

  public async updateUserProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const currentProfile = await this.getUserProfile();
      if (!currentProfile) return null;

      const updatedProfile = { ...currentProfile, ...updates };
      await this.saveUserProfile(updatedProfile);
      return updatedProfile;
    } catch (error) {
      console.error('Failed to update user profile:', error);
      return null;
    }
  }

  // ---- LEARNING PROGRESS METHODS ----

  public async getLearningProgress(): Promise<LearningProgress | null> {
    return this.get<LearningProgress>('learning_progress');
  }

  public async saveLearningProgress(progress: LearningProgress): Promise<void> {
    return this.set('learning_progress', progress);
  }

  public async updateLearningProgress(updates: Partial<LearningProgress>): Promise<LearningProgress | null> {
    try {
      const currentProgress = await this.getLearningProgress();
      if (!currentProgress) return null;

      const updatedProgress = { ...currentProgress, ...updates };
      await this.saveLearningProgress(updatedProgress);
      return updatedProgress;
    } catch (error) {
      console.error('Failed to update learning progress:', error);
      return null;
    }
  }

  // ---- LESSON COMPLETION METHODS ----

  public async getCompletedLessons(): Promise<string[]> {
    const lessons = await this.get<string[]>('completed_lessons');
    return lessons || [];
  }

  public async addCompletedLesson(lessonId: string): Promise<void> {
    try {
      const completed = await this.getCompletedLessons();
      if (!completed.includes(lessonId)) {
        completed.push(lessonId);
        await this.set('completed_lessons', completed);
      }
    } catch (error) {
      console.error('Failed to add completed lesson:', error);
      throw error;
    }
  }

  public async getLessonProgress(lessonId: string): Promise<number> {
    try {
      const progress = await this.get<Record<string, number>>('lesson_progress') || {};
      return progress[lessonId] || 0;
    } catch (error) {
      console.error('Failed to get lesson progress:', error);
      return 0;
    }
  }

  public async setLessonProgress(lessonId: string, progress: number): Promise<void> {
    try {
      const allProgress = await this.get<Record<string, number>>('lesson_progress') || {};
      allProgress[lessonId] = progress;
      await this.set('lesson_progress', allProgress);
    } catch (error) {
      console.error('Failed to set lesson progress:', error);
      throw error;
    }
  }

  // ---- PORTFOLIO METHODS ----

  public async getPortfolio(userId: string): Promise<Portfolio | null> {
    return this.get<Portfolio>(`portfolio_${userId}`);
  }

  public async savePortfolio(userId: string, portfolio: Portfolio): Promise<void> {
    return this.set(`portfolio_${userId}`, portfolio);
  }

  // ---- SETTINGS METHODS ----

  public async getAppSettings(): Promise<any> {
    const settings = await this.get('app_settings');
    return settings || {
      theme: 'auto',
      notifications: {
        lessons: true,
        achievements: true,
        social: true,
        challenges: true,
      },
      drawing: {
        pressureSensitivity: 0.8,
        smoothing: 0.5,
        autosave: true,
        hapticFeedback: true,
      },
      learning: {
        dailyGoal: 1,
        reminderTime: '19:00',
        difficulty: 'adaptive',
      },
    };
  }

  public async saveAppSettings(settings: any): Promise<void> {
    return this.set('app_settings', settings);
  }

  public async updateAppSettings(updates: any): Promise<any> {
    try {
      const currentSettings = await this.getAppSettings();
      const updatedSettings = this.deepMerge(currentSettings, updates);
      await this.saveAppSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update app settings:', error);
      throw error;
    }
  }

  // ---- DRAWING DATA METHODS ----

  public async saveDrawing(drawingId: string, drawingData: any): Promise<void> {
    return this.set(`drawing_${drawingId}`, drawingData);
  }

  public async getDrawing(drawingId: string): Promise<any> {
    return this.get(`drawing_${drawingId}`);
  }

  public async getSavedDrawings(): Promise<string[]> {
    const drawings = await this.get<string[]>('saved_drawings');
    return drawings || [];
  }

  public async addSavedDrawing(drawingId: string): Promise<void> {
    try {
      const drawings = await this.getSavedDrawings();
      if (!drawings.includes(drawingId)) {
        drawings.push(drawingId);
        await this.set('saved_drawings', drawings);
      }
    } catch (error) {
      console.error('Failed to add saved drawing:', error);
      throw error;
    }
  }

  // ---- ACHIEVEMENT METHODS ----

  public async getUnlockedAchievements(): Promise<string[]> {
    const achievements = await this.get<string[]>('unlocked_achievements');
    return achievements || [];
  }

  public async unlockAchievement(achievementId: string): Promise<void> {
    try {
      const achievements = await this.getUnlockedAchievements();
      if (!achievements.includes(achievementId)) {
        achievements.push(achievementId);
        await this.set('unlocked_achievements', achievements);
      }
    } catch (error) {
      console.error('Failed to unlock achievement:', error);
      throw error;
    }
  }

  // ---- CHALLENGE METHODS ----

  public async getChallengeData(): Promise<any> {
    return this.get('challenge_data') || {
      submissions: [],
      votes: [],
      participation: [],
    };
  }

  public async saveChallengeData(data: any): Promise<void> {
    return this.set('challenge_data', data);
  }

  // ---- ANALYTICS METHODS ----

  public async recordEvent(eventType: string, eventData: any): Promise<void> {
    try {
      const events = await this.get<any[]>('analytics_events') || [];
      events.push({
        type: eventType,
        data: eventData,
        timestamp: Date.now(),
      });

      // Keep only last 1000 events
      if (events.length > 1000) {
        events.splice(0, events.length - 1000);
      }

      await this.set('analytics_events', events);
    } catch (error) {
      console.error('Failed to record event:', error);
    }
  }

  public async getAnalyticsEvents(limit?: number): Promise<any[]> {
    try {
      const events = await this.get<any[]>('analytics_events') || [];
      return limit ? events.slice(-limit) : events;
    } catch (error) {
      console.error('Failed to get analytics events:', error);
      return [];
    }
  }

  // ---- CACHE MANAGEMENT ----

  public clearCache(): void {
    this.cache.clear();
  }

  public getCacheSize(): number {
    return this.cache.size;
  }

  public getCacheKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  // ---- BACKUP AND RESTORE ----

  public async exportAllData(): Promise<any> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const allData: Record<string, any> = {};

      for (const key of allKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          try {
            allData[key] = JSON.parse(value);
          } catch {
            allData[key] = value; // Store as string if not JSON
          }
        }
      }

      return {
        exportDate: Date.now(),
        version: '1.0.0',
        data: allData,
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw error;
    }
  }

  public async importAllData(exportData: any): Promise<void> {
    try {
      if (!exportData || !exportData.data) {
        throw new Error('Invalid export data format');
      }

      // Clear existing data
      await this.clear();

      // Import new data
      for (const [key, value] of Object.entries(exportData.data)) {
        await AsyncStorage.setItem(key, JSON.stringify(value));
      }

      // Clear cache to force reload
      this.clearCache();
    } catch (error) {
      console.error('Failed to import data:', error);
      throw error;
    }
  }

  // ---- UTILITY METHODS ----

  private deepMerge(target: any, source: any): any {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return target;

    const result = { ...target };

    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          result[key] = this.deepMerge(target[key], source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  public async getStorageInfo(): Promise<{
    totalKeys: number;
    estimatedSize: number;
    cacheSize: number;
  }> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      let estimatedSize = 0;

      for (const key of allKeys.slice(0, 10)) { // Sample first 10 keys
        const value = await AsyncStorage.getItem(key);
        if (value) {
          estimatedSize += value.length;
        }
      }

      // Extrapolate total size
      const avgKeySize = estimatedSize / Math.max(1, Math.min(10, allKeys.length));
      const totalEstimatedSize = avgKeySize * allKeys.length;

      return {
        totalKeys: allKeys.length,
        estimatedSize: totalEstimatedSize,
        cacheSize: this.cache.size,
      };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return {
        totalKeys: 0,
        estimatedSize: 0,
        cacheSize: this.cache.size,
      };
    }
  }

  // ---- MIGRATION METHODS ----

  public async migrateData(fromVersion: string, toVersion: string): Promise<void> {
    try {
      console.log(`Migrating data from ${fromVersion} to ${toVersion}`);

      // Add migration logic here as needed

      await this.set('data_version', toVersion);
    } catch (error) {
      console.error('Failed to migrate data:', error);
      throw error;
    }
  }

  public async getDataVersion(): Promise<string> {
    const version = await this.get<string>('data_version');
    return version || '1.0.0';
  }

  // ---- EXTRA: Save and Load Methods ----

  /**
   * Save data to persistent storage
   */
  async save<T>(key: string, value: T): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, serializedValue);
      console.log(`✅ Saved data for key: ${key}`);
    } catch (error) {
      console.error(`❌ Failed to save data for key ${key}:`, error);
      throw new Error(`Failed to save data: ${error}`);
    }
  }

  /**
   * Load data from persistent storage
   */
  async load<T>(key: string, defaultValue?: T): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data) as T;
      }
      return defaultValue || null;
    } catch (error) {
      console.error(`❌ Failed to load data for key ${key}:`, error);
      return defaultValue || null;
    }
  }
}

// Export singleton instance
export const dataManager = DataManager.getInstance();
