import { Achievement, AchievementType } from '../../types';
import { profileSystem } from './ProfileSystem';
import { dataManager } from '../core/DataManager';
import * as Haptics from 'expo-haptics';

/**
 * Progression System - Handles XP, levels, achievements, and rewards
 * Implements psychological engagement through gamification
 */
export class ProgressionSystem {
  private static instance: ProgressionSystem;
  private achievementDefinitions: Map<string, AchievementDefinition> = new Map();
  private progressListeners: Set<(event: ProgressionEvent) => void> = new Set();
  
  private constructor() {
    this.initializeAchievements();
  }

  public static getInstance(): ProgressionSystem {
    if (!ProgressionSystem.instance) {
      ProgressionSystem.instance = new ProgressionSystem();
    }
    return ProgressionSystem.instance;
  }

  private initializeAchievements(): void {
    // Lesson completion achievements
    this.registerAchievement({
      id: 'first_lesson',
      type: 'lesson_completion',
      title: 'First Steps',
      description: 'Complete your first lesson',
      iconUrl: 'achievement_first_lesson',
      maxProgress: 1,
      xpReward: 50,
      rarity: 'common',
    });

    this.registerAchievement({
      id: 'lesson_master_10',
      type: 'lesson_completion',
      title: 'Dedicated Learner',
      description: 'Complete 10 lessons',
      iconUrl: 'achievement_lessons_10',
      maxProgress: 10,
      xpReward: 200,
      rarity: 'rare',
    });

    this.registerAchievement({
      id: 'lesson_master_50',
      type: 'lesson_completion',
      title: 'Knowledge Seeker',
      description: 'Complete 50 lessons',
      iconUrl: 'achievement_lessons_50',
      maxProgress: 50,
      xpReward: 500,
      rarity: 'epic',
    });

    this.registerAchievement({
      id: 'lesson_master_100',
      type: 'lesson_completion',
      title: 'Master Scholar',
      description: 'Complete 100 lessons',
      iconUrl: 'achievement_lessons_100',
      maxProgress: 100,
      xpReward: 1000,
      rarity: 'legendary',
    });

    // Streak achievements
    this.registerAchievement({
      id: 'streak_7',
      type: 'streak_milestone',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      iconUrl: 'achievement_streak_7',
      maxProgress: 7,
      xpReward: 100,
      rarity: 'common',
    });

    this.registerAchievement({
      id: 'streak_30',
      type: 'streak_milestone',
      title: 'Dedicated Artist',
      description: 'Maintain a 30-day streak',
      iconUrl: 'achievement_streak_30',
      maxProgress: 30,
      xpReward: 300,
      rarity: 'rare',
    });

    this.registerAchievement({
      id: 'streak_100',
      type: 'streak_milestone',
      title: 'Centurion',
      description: 'Maintain a 100-day streak',
      iconUrl: 'achievement_streak_100',
      maxProgress: 100,
      xpReward: 1000,
      rarity: 'legendary',
    });

    // Artwork achievements
    this.registerAchievement({
      id: 'first_artwork',
      type: 'artwork_creation',
      title: 'Creative Debut',
      description: 'Create your first artwork',
      iconUrl: 'achievement_first_artwork',
      maxProgress: 1,
      xpReward: 50,
      rarity: 'common',
    });

    this.registerAchievement({
      id: 'artwork_10',
      type: 'artwork_creation',
      title: 'Prolific Creator',
      description: 'Create 10 artworks',
      iconUrl: 'achievement_artwork_10',
      maxProgress: 10,
      xpReward: 150,
      rarity: 'rare',
    });

    this.registerAchievement({
      id: 'artwork_shared',
      type: 'social_engagement',
      title: 'Sharing is Caring',
      description: 'Share your first artwork',
      iconUrl: 'achievement_share',
      maxProgress: 1,
      xpReward: 75,
      rarity: 'common',
    });

    // Skill mastery achievements
    this.registerAchievement({
      id: 'perfect_lesson',
      type: 'skill_mastery',
      title: 'Perfectionist',
      description: 'Complete a lesson with perfect score',
      iconUrl: 'achievement_perfect',
      maxProgress: 1,
      xpReward: 100,
      rarity: 'common',
    });

    this.registerAchievement({
      id: 'skill_tree_complete',
      type: 'skill_mastery',
      title: 'Tree Climber',
      description: 'Complete an entire skill tree',
      iconUrl: 'achievement_tree',
      maxProgress: 1,
      xpReward: 500,
      rarity: 'epic',
    });

    // Challenge achievements
    this.registerAchievement({
      id: 'challenge_participant',
      type: 'challenge_winner',
      title: 'Challenger',
      description: 'Participate in your first challenge',
      iconUrl: 'achievement_challenge',
      maxProgress: 1,
      xpReward: 50,
      rarity: 'common',
    });

    this.registerAchievement({
      id: 'challenge_winner',
      type: 'challenge_winner',
      title: 'Champion',
      description: 'Win a daily challenge',
      iconUrl: 'achievement_winner',
      maxProgress: 1,
      xpReward: 300,
      rarity: 'epic',
    });
  }

  private registerAchievement(definition: AchievementDefinition): void {
    this.achievementDefinitions.set(definition.id, definition);
  }

  public async checkAchievements(type: AchievementType, progress: number = 1): Promise<Achievement[]> {
    const user = profileSystem.getCurrentUser();
    if (!user) return [];

    const unlockedAchievements: Achievement[] = [];
    
    // Check all achievements of this type
    for (const [id, definition] of this.achievementDefinitions) {
      if (definition.type !== type) continue;

      const existingAchievement = user.achievements.find(a => a.id === id);
      
      if (existingAchievement && existingAchievement.unlockedAt) {
        // Already unlocked
        continue;
      }

      const currentProgress = existingAchievement?.progress || 0;
      const newProgress = Math.min(currentProgress + progress, definition.maxProgress);

      if (newProgress >= definition.maxProgress) {
        // Achievement unlocked!
        const achievement: Achievement = {
          id: definition.id,
          type: definition.type,
          title: definition.title,
          description: definition.description,
          iconUrl: definition.iconUrl,
          unlockedAt: new Date(),
          progress: definition.maxProgress,
          maxProgress: definition.maxProgress,
          xpReward: definition.xpReward,
          rarity: definition.rarity,
        };

        unlockedAchievements.push(achievement);
        await this.unlockAchievement(achievement);
      } else if (newProgress > currentProgress) {
        // Update progress
        await this.updateAchievementProgress(id, newProgress);
      }
    }

    return unlockedAchievements;
  }

  // FIXED: Made unlockAchievement public and accepting Achievement parameter
  public async unlockAchievement(achievement: Achievement): Promise<void> {
    const user = profileSystem.getCurrentUser();
    if (!user) return;

    // Add or update achievement
    const existingIndex = user.achievements.findIndex(a => a.id === achievement.id);
    if (existingIndex >= 0) {
      user.achievements[existingIndex] = achievement;
    } else {
      user.achievements.push(achievement);
    }

    // Award XP
    await profileSystem.addXP(achievement.xpReward);

    // Save updated user
    await profileSystem.updateUser(user);

    // Trigger celebration
    this.celebrateAchievement(achievement);

    // Notify listeners
    this.notifyProgress({
      type: 'achievement_unlocked',
      achievement,
      xpAwarded: achievement.xpReward,
    });
  }

  // FIXED: Added missing getAchievement method
  public getAchievement(achievementId: string): Achievement | null {
    const user = profileSystem.getCurrentUser();
    if (!user) return null;

    return user.achievements.find(a => a.id === achievementId) || null;
  }

  // FIXED: Added getAchievementDefinition method for completeness
  public getAchievementDefinition(achievementId: string): AchievementDefinition | null {
    return this.achievementDefinitions.get(achievementId) || null;
  }

  private async updateAchievementProgress(achievementId: string, progress: number): Promise<void> {
    const user = profileSystem.getCurrentUser();
    if (!user) return;

    const definition = this.achievementDefinitions.get(achievementId);
    if (!definition) return;

    const existingIndex = user.achievements.findIndex(a => a.id === achievementId);
    const achievement: Achievement = {
      id: achievementId,
      type: definition.type,
      title: definition.title,
      description: definition.description,
      iconUrl: definition.iconUrl,
      progress,
      maxProgress: definition.maxProgress,
      xpReward: definition.xpReward,
      rarity: definition.rarity,
    };

    if (existingIndex >= 0) {
      user.achievements[existingIndex] = achievement;
    } else {
      user.achievements.push(achievement);
    }

    await profileSystem.updateUser(user);

    // Notify progress update
    this.notifyProgress({
      type: 'achievement_progress',
      achievement,
      progress,
    });
  }

  private celebrateAchievement(achievement: Achievement): void {
    // Haptic feedback based on rarity
    switch (achievement.rarity) {
      case 'legendary':
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'epic':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case 'rare':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      default:
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  public async recordLessonCompletion(lessonId: string, score: number): Promise<void> {
    const user = profileSystem.getCurrentUser();
    if (!user) return;

    // Update stats
    await profileSystem.incrementStat('lessonsCompleted');
    
    if (score >= 0.95) { // 95% or higher is perfect
      await profileSystem.incrementStat('perfectLessons');
      await this.checkAchievements('skill_mastery', 1);
    }

    // Check lesson achievements
    await this.checkAchievements('lesson_completion', 1);

    // Update daily streak
    await profileSystem.updateStreak();
    
    // Check streak achievements
    const progressSummary = profileSystem.getProgressSummary();
    if (progressSummary) {
      await this.checkStreakAchievements(progressSummary.streakDays);
    }
  }

  private async checkStreakAchievements(currentStreak: number): Promise<void> {
    const streakMilestones = [7, 30, 100];
    
    for (const milestone of streakMilestones) {
      if (currentStreak >= milestone) {
        const achievementId = `streak_${milestone}`;
        const achievement = this.achievementDefinitions.get(achievementId);
        if (achievement) {
          const user = profileSystem.getCurrentUser();
          const existing = user?.achievements.find(a => a.id === achievementId);
          if (!existing?.unlockedAt) {
            await this.checkAchievements('streak_milestone', milestone);
          }
        }
      }
    }
  }

  public async recordArtworkCreation(artworkId: string): Promise<void> {
    await profileSystem.incrementStat('artworksCreated');
    await this.checkAchievements('artwork_creation', 1);
  }

  public async recordArtworkShared(artworkId: string): Promise<void> {
    await profileSystem.incrementStat('artworksShared');
    await this.checkAchievements('social_engagement', 1);
  }

  public async recordChallengeParticipation(challengeId: string, won: boolean): Promise<void> {
    await profileSystem.incrementStat('challengesCompleted');
    await this.checkAchievements('challenge_winner', 1);
  }

  public subscribeToProgress(callback: (event: ProgressionEvent) => void): () => void {
    this.progressListeners.add(callback);
    return () => this.progressListeners.delete(callback);
  }

  private notifyProgress(event: ProgressionEvent): void {
    this.progressListeners.forEach(callback => callback(event));
  }

  public getAchievementProgress(): {
    total: number;
    unlocked: number;
    inProgress: Achievement[];
    locked: AchievementDefinition[];
  } {
    const user = profileSystem.getCurrentUser();
    if (!user) {
      return {
        total: this.achievementDefinitions.size,
        unlocked: 0,
        inProgress: [],
        locked: Array.from(this.achievementDefinitions.values()),
      };
    }

    const unlocked = user.achievements.filter(a => a.unlockedAt).length;
    const inProgress = user.achievements.filter(a => !a.unlockedAt && a.progress > 0);
    
    const unlockedIds = new Set(user.achievements.map(a => a.id));
    const locked = Array.from(this.achievementDefinitions.values())
      .filter(def => !unlockedIds.has(def.id));

    return {
      total: this.achievementDefinitions.size,
      unlocked,
      inProgress,
      locked,
    };
  }

  public calculateDailyXPGoal(): number {
    const user = profileSystem.getCurrentUser();
    if (!user) return 50; // Default goal

    // Adaptive goal based on user's average performance
    const avgXPPerDay = user.totalXP / Math.max(1, 
      Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );

    // Set goal slightly above average to encourage growth
    return Math.max(50, Math.min(500, Math.floor(avgXPPerDay * 1.2)));
  }
}

interface AchievementDefinition {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  iconUrl: string;
  maxProgress: number;
  xpReward: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface ProgressionEvent {
  type: 'achievement_unlocked' | 'achievement_progress' | 'level_up' | 'xp_gained';
  achievement?: Achievement;
  xpAwarded?: number;
  newLevel?: number;
  progress?: number;
}

// Export singleton instance
export const progressionSystem = ProgressionSystem.getInstance();