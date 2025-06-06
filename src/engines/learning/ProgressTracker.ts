import { LearningProgress, SkillTreeProgress } from '../../types';
import { dataManager } from '../core/DataManager';
import { profileSystem } from '../user/ProfileSystem';
import { skillTreeManager } from './SkillTreeManager';

/**
 * Tracks and analyzes learning progress across all skill trees
 * Provides insights and recommendations for optimal learning path
 */
export class ProgressTracker {
  private static instance: ProgressTracker;
  private learningProgress: LearningProgress | null = null;
  private progressListeners: Set<(progress: LearningProgress) => void> = new Set();
  private analyticsData: LearningAnalytics = {
    averageSessionTime: 0,
    preferredLearningTime: 'evening',
    strongestSkills: [],
    areasForImprovement: [],
    learningVelocity: 0,
    estimatedMasteryDate: null,
  };

  private constructor() {
    this.loadProgress();
    this.startAnalytics();
  }

  public static getInstance(): ProgressTracker {
    if (!ProgressTracker.instance) {
      ProgressTracker.instance = new ProgressTracker();
    }
    return ProgressTracker.instance;
  }

  private async loadProgress(): Promise<void> {
    const progress = await dataManager.getLearningProgress();
    if (progress) {
      this.learningProgress = progress;
      this.analyzeProgress();
      this.notifyListeners();
    } else {
      // Initialize new progress
      const user = profileSystem.getCurrentUser();
      if (user) {
        this.learningProgress = {
          userId: user.id,
          completedLessons: [],
          skillTrees: [],
          totalXP: 0,
          currentStreak: 0,
          longestStreak: 0,
          dailyGoal: 100,
          dailyProgress: 0,
        };
      }
    }
  }

  private startAnalytics(): void {
    // Update analytics every 5 minutes
    setInterval(() => {
      if (this.learningProgress) {
        this.analyzeProgress();
      }
    }, 5 * 60 * 1000);
  }

  private analyzeProgress(): void {
    if (!this.learningProgress) return;

    // Calculate average session time
    this.calculateAverageSessionTime();

    // Determine preferred learning time
    this.determinePreferredLearningTime();

    // Identify strongest skills
    this.identifyStrongestSkills();

    // Find areas for improvement
    this.findAreasForImprovement();

    // Calculate learning velocity
    this.calculateLearningVelocity();

    // Estimate mastery date
    this.estimateMasteryDate();
  }

  private calculateAverageSessionTime(): void {
    // This would analyze session data
    // For now, using placeholder
    this.analyticsData.averageSessionTime = 25; // minutes
  }

  private determinePreferredLearningTime(): void {
    // Analyze when user is most active
    // Placeholder implementation
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      this.analyticsData.preferredLearningTime = 'morning';
    } else if (hour >= 12 && hour < 17) {
      this.analyticsData.preferredLearningTime = 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      this.analyticsData.preferredLearningTime = 'evening';
    } else {
      this.analyticsData.preferredLearningTime = 'night';
    }
  }

  private identifyStrongestSkills(): void {
    if (!this.learningProgress) return;

    const skillScores: Map<string, number> = new Map();

    // Analyze completed lessons and their categories
    this.learningProgress.completedLessons.forEach(lessonId => {
      const lesson = skillTreeManager.getLesson(lessonId);
      if (lesson) {
        lesson.tags.forEach(tag => {
          const current = skillScores.get(tag) || 0;
          skillScores.set(tag, current + 1);
        });
      }
    });

    // Get top 3 skills
    this.analyticsData.strongestSkills = Array.from(skillScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([skill]) => skill);
  }

  private findAreasForImprovement(): void {
    // Identify skills that need more practice
    const allSkills = ['lines', 'shapes', 'perspective', 'color', 'composition'];
    this.analyticsData.areasForImprovement = allSkills.filter(skill => 
      !this.analyticsData.strongestSkills.includes(skill)
    ).slice(0, 2);
  }

  private calculateLearningVelocity(): void {
    if (!this.learningProgress) return;

    // Calculate lessons completed per week
    const weeksActive = 1; // Placeholder - would calculate from user data
    const lessonsPerWeek = this.learningProgress.completedLessons.length / Math.max(1, weeksActive);
    
    this.analyticsData.learningVelocity = lessonsPerWeek;
  }

  private estimateMasteryDate(): void {
    if (!this.learningProgress || this.analyticsData.learningVelocity === 0) {
      this.analyticsData.estimatedMasteryDate = null;
      return;
    }

    const totalLessons = skillTreeManager.getAllSkillTrees()
      .reduce((sum, tree) => sum + tree.lessons.length, 0);
    const remainingLessons = totalLessons - this.learningProgress.completedLessons.length;
    const weeksToComplete = remainingLessons / this.analyticsData.learningVelocity;

    const masteryDate = new Date();
    masteryDate.setDate(masteryDate.getDate() + (weeksToComplete * 7));
    
    this.analyticsData.estimatedMasteryDate = masteryDate;
  }

  public async updateDailyProgress(xpEarned: number): Promise<void> {
    if (!this.learningProgress) return;

    this.learningProgress.dailyProgress += xpEarned;
    
    // Check if daily goal is met
    if (this.learningProgress.dailyProgress >= this.learningProgress.dailyGoal) {
      // Trigger celebration
      this.celebrateDailyGoal();
    }

    await this.saveProgress();
    this.notifyListeners();
  }

  private celebrateDailyGoal(): void {
    // This would trigger UI celebration
    if (typeof window !== 'undefined' && (window as any).celebrateGoal) {
      (window as any).celebrateGoal({
        type: 'daily_goal',
        message: 'Daily goal achieved! 🎉',
      });
    }
  }

  public async resetDailyProgress(): Promise<void> {
    if (!this.learningProgress) return;

    this.learningProgress.dailyProgress = 0;
    await this.saveProgress();
    this.notifyListeners();
  }

  public async updateStreak(active: boolean): Promise<void> {
    if (!this.learningProgress) return;

    if (active) {
      this.learningProgress.currentStreak++;
      if (this.learningProgress.currentStreak > this.learningProgress.longestStreak) {
        this.learningProgress.longestStreak = this.learningProgress.currentStreak;
      }
    } else {
      this.learningProgress.currentStreak = 0;
    }

    await this.saveProgress();
    this.notifyListeners();
  }

  public async setDailyGoal(xpGoal: number): Promise<void> {
    if (!this.learningProgress) return;

    this.learningProgress.dailyGoal = Math.max(50, Math.min(500, xpGoal));
    await this.saveProgress();
    this.notifyListeners();
  }

  public getProgress(): LearningProgress | null {
    return this.learningProgress;
  }

  public getAnalytics(): LearningAnalytics {
    return { ...this.analyticsData };
  }

  public getProgressInsights(): ProgressInsight[] {
    const insights: ProgressInsight[] = [];

    if (!this.learningProgress) return insights;

    // Streak insights
    if (this.learningProgress.currentStreak >= 7) {
      insights.push({
        type: 'achievement',
        title: 'Great Streak!',
        message: `${this.learningProgress.currentStreak} days in a row! Keep it up!`,
        priority: 'high',
      });
    } else if (this.learningProgress.currentStreak === 0) {
      insights.push({
        type: 'motivation',
        title: 'Start a New Streak',
        message: 'Complete a lesson today to start building your streak!',
        priority: 'medium',
      });
    }

    // Progress insights
    const overallProgress = skillTreeManager.getOverallProgress();
    if (overallProgress.completionPercentage >= 50) {
      insights.push({
        type: 'milestone',
        title: 'Halfway There!',
        message: 'You\'ve completed over half of the available lessons!',
        priority: 'high',
      });
    }

    // Velocity insights
    if (this.analyticsData.learningVelocity > 3) {
      insights.push({
        type: 'achievement',
        title: 'Fast Learner',
        message: 'You\'re completing lessons faster than 90% of users!',
        priority: 'medium',
      });
    }

    // Skill insights
    if (this.analyticsData.strongestSkills.length > 0) {
      insights.push({
        type: 'skill',
        title: 'Strongest Skills',
        message: `You excel at: ${this.analyticsData.strongestSkills.join(', ')}`,
        priority: 'low',
      });
    }

    // Improvement insights
    if (this.analyticsData.areasForImprovement.length > 0) {
      insights.push({
        type: 'recommendation',
        title: 'Try These Next',
        message: `Focus on: ${this.analyticsData.areasForImprovement.join(', ')}`,
        priority: 'medium',
      });
    }

    return insights;
  }

  public getRecommendedLessons(count: number = 3): string[] {
    const recommendations: string[] = [];
    
    // Get next lesson in current path
    const nextLesson = skillTreeManager.getRecommendedNextLesson();
    if (nextLesson) {
      recommendations.push(nextLesson.id);
    }

    // Add lessons that match areas for improvement
    const allTrees = skillTreeManager.getAllSkillTrees();
    for (const tree of allTrees) {
      const availableLessons = skillTreeManager.getAvailableLessons(tree.id);
      for (const lesson of availableLessons) {
        if (recommendations.length >= count) break;
        
        // Check if lesson matches improvement areas
        const matchesImprovement = lesson.tags.some(tag => 
          this.analyticsData.areasForImprovement.includes(tag)
        );
        
        if (matchesImprovement && !recommendations.includes(lesson.id)) {
          recommendations.push(lesson.id);
        }
      }
    }

    // Fill remaining slots with any available lessons
    for (const tree of allTrees) {
      const availableLessons = skillTreeManager.getAvailableLessons(tree.id);
      for (const lesson of availableLessons) {
        if (recommendations.length >= count) break;
        if (!recommendations.includes(lesson.id)) {
          recommendations.push(lesson.id);
        }
      }
    }

    return recommendations.slice(0, count);
  }

  private async saveProgress(): Promise<void> {
    if (this.learningProgress) {
      await dataManager.saveLearningProgress(this.learningProgress);
    }
  }

  public subscribeToProgress(callback: (progress: LearningProgress) => void): () => void {
    this.progressListeners.add(callback);
    if (this.learningProgress) {
      callback(this.learningProgress);
    }
    return () => this.progressListeners.delete(callback);
  }

  private notifyListeners(): void {
    if (this.learningProgress) {
      this.progressListeners.forEach(callback => callback(this.learningProgress!));
    }
  }

  public getDailyProgressPercentage(): number {
    if (!this.learningProgress) return 0;
    return Math.min(100, (this.learningProgress.dailyProgress / this.learningProgress.dailyGoal) * 100);
  }

  public getStreakStatus(): {
    current: number;
    longest: number;
    isActive: boolean;
    daysUntilLost: number;
  } {
    if (!this.learningProgress) {
      return { current: 0, longest: 0, isActive: false, daysUntilLost: 0 };
    }

    // Check if streak is still active (within 24 hours)
    const lastActivity = new Date(); // Would get from actual activity data
    const hoursSinceActivity = 0; // Placeholder
    const isActive = hoursSinceActivity < 24;

    return {
      current: this.learningProgress.currentStreak,
      longest: this.learningProgress.longestStreak,
      isActive,
      daysUntilLost: isActive ? Math.floor((24 - hoursSinceActivity) / 24) : 0,
    };
  }
}

interface LearningAnalytics {
  averageSessionTime: number; // minutes
  preferredLearningTime: 'morning' | 'afternoon' | 'evening' | 'night';
  strongestSkills: string[];
  areasForImprovement: string[];
  learningVelocity: number; // lessons per week
  estimatedMasteryDate: Date | null;
}

interface ProgressInsight {
  type: 'achievement' | 'milestone' | 'recommendation' | 'motivation' | 'skill';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

// Export singleton instance
export const progressTracker = ProgressTracker.getInstance();