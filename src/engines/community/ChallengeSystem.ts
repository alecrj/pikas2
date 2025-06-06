import { Challenge, Artwork, Prize } from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';
import { profileSystem } from '../user/ProfileSystem';
import { portfolioManager } from '../user/PortfolioManager';
import { progressionSystem } from '../user/ProgressionSystem';
import { socialEngine } from './SocialEngine';

/**
 * Challenge System - Manages daily, weekly, and special art challenges
 * Drives community engagement through competitive creative prompts
 */
export class ChallengeSystem {
  private static instance: ChallengeSystem;
  private activeChallenges: Map<string, Challenge> = new Map();
  private userParticipation: Map<string, Set<string>> = new Map(); // userId -> Set of challengeIds
  private challengeListeners: Set<(challenges: Challenge[]) => void> = new Set();
  private participationListeners: Set<(event: ParticipationEvent) => void> = new Set();

  private readonly challengeTemplates = {
    daily: [
      { theme: 'Nature Study', requirements: ['Draw something from nature', 'Use at least 3 colors'] },
      { theme: 'Portrait Practice', requirements: ['Draw a face', 'Focus on expressions'] },
      { theme: 'Urban Sketching', requirements: ['Draw a building or street scene', 'Include perspective'] },
      { theme: 'Animal Kingdom', requirements: ['Draw any animal', 'Capture movement or texture'] },
      { theme: 'Still Life', requirements: ['Arrange and draw objects', 'Focus on light and shadow'] },
      { theme: 'Fantasy Friday', requirements: ['Create something imaginative', 'No limits!'] },
      { theme: 'Texture Challenge', requirements: ['Focus on different textures', 'Use various brush techniques'] },
    ],
    weekly: [
      { theme: 'Color Harmony', requirements: ['Create a piece with complementary colors', 'Tell a story through color'] },
      { theme: 'Character Design', requirements: ['Design an original character', 'Show personality through design'] },
      { theme: 'Landscape Journey', requirements: ['Create a landscape', 'Convey mood through atmosphere'] },
      { theme: 'Abstract Expression', requirements: ['Create abstract art', 'Express emotion through form and color'] },
    ],
  };

  private constructor() {
    this.loadActiveChallenges();
    this.initializeDailyChallenges();
    this.scheduleChallenge();
  }

  public static getInstance(): ChallengeSystem {
    if (!ChallengeSystem.instance) {
      ChallengeSystem.instance = new ChallengeSystem();
    }
    return ChallengeSystem.instance;
  }

  private async loadActiveChallenges(): Promise<void> {
    try {
      const savedChallenges = await dataManager.get<Challenge[]>('active_challenges');
      if (savedChallenges) {
        savedChallenges.forEach(challenge => {
          this.activeChallenges.set(challenge.id, challenge);
        });
      }

      const participation = await dataManager.get<Record<string, string[]>>('challenge_participation');
      if (participation) {
        Object.entries(participation).forEach(([userId, challengeIds]) => {
          this.userParticipation.set(userId, new Set(challengeIds));
        });
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('CHALLENGE_LOAD_ERROR', 'Failed to load challenges', 'low', error)
      );
    }
  }

  private initializeDailyChallenges(): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Check if today's challenge exists
    const todaysChallenge = Array.from(this.activeChallenges.values()).find(
      challenge => 
        challenge.type === 'daily' &&
        challenge.startDate.getTime() === todayStart.getTime()
    );

    if (!todaysChallenge) {
      this.createDailyChallenge();
    }

    // Check for weekly challenge
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week

    const thisWeeksChallenge = Array.from(this.activeChallenges.values()).find(
      challenge => 
        challenge.type === 'weekly' &&
        challenge.startDate >= weekStart &&
        challenge.startDate < new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    );

    if (!thisWeeksChallenge) {
      this.createWeeklyChallenge();
    }
  }

  private scheduleChallenge(): void {
    // Schedule daily challenge creation at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.createDailyChallenge();
      // Reschedule for next day
      setInterval(() => {
        this.createDailyChallenge();
      }, 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    // Schedule weekly challenge creation
    const nextMonday = new Date(now);
    nextMonday.setDate(nextMonday.getDate() + ((1 - nextMonday.getDay() + 7) % 7));
    nextMonday.setHours(0, 0, 0, 0);
    
    const msUntilMonday = nextMonday.getTime() - now.getTime();
    
    setTimeout(() => {
      this.createWeeklyChallenge();
      // Reschedule for next week
      setInterval(() => {
        this.createWeeklyChallenge();
      }, 7 * 24 * 60 * 60 * 1000);
    }, msUntilMonday);
  }

  private async createDailyChallenge(): Promise<void> {
    const template = this.challengeTemplates.daily[
      new Date().getDate() % this.challengeTemplates.daily.length
    ];

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 1);

    const challenge: Challenge = {
      id: `daily_${startDate.getTime()}`,
      title: `Daily Challenge: ${template.theme}`,
      description: `Today's creative challenge: ${template.theme}`,
      type: 'daily',
      startDate,
      endDate,
      theme: template.theme,
      requirements: template.requirements,
      prizes: [
        { place: 1, xpReward: 200, description: 'Daily Champion' },
        { place: 2, xpReward: 150, description: 'Runner Up' },
        { place: 3, xpReward: 100, description: 'Third Place' },
      ],
      participants: 0,
      submissions: [],
    };

    this.activeChallenges.set(challenge.id, challenge);
    await this.saveChallenges();
    this.notifyChallengeListeners();

    // Notify users about new daily challenge
    this.notifyNewChallenge(challenge);
  }

  private async createWeeklyChallenge(): Promise<void> {
    const weekNumber = Math.floor(new Date().getTime() / (7 * 24 * 60 * 60 * 1000));
    const template = this.challengeTemplates.weekly[
      weekNumber % this.challengeTemplates.weekly.length
    ];

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Monday
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const challenge: Challenge = {
      id: `weekly_${startDate.getTime()}`,
      title: `Weekly Challenge: ${template.theme}`,
      description: `This week's artistic journey: ${template.theme}`,
      type: 'weekly',
      startDate,
      endDate,
      theme: template.theme,
      requirements: template.requirements,
      prizes: [
        { place: 1, xpReward: 500, description: 'Weekly Master' },
        { place: 2, xpReward: 300, description: 'Silver Medal' },
        { place: 3, xpReward: 200, description: 'Bronze Medal' },
      ],
      participants: 0,
      submissions: [],
    };

    this.activeChallenges.set(challenge.id, challenge);
    await this.saveChallenges();
    this.notifyChallengeListeners();

    // Notify users about new weekly challenge
    this.notifyNewChallenge(challenge);
  }

  public async createSpecialChallenge(params: {
    title: string;
    description: string;
    theme: string;
    requirements: string[];
    duration: number; // days
    prizes: Prize[];
  }): Promise<Challenge> {
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + params.duration);

    const challenge: Challenge = {
      id: `special_${Date.now()}`,
      title: params.title,
      description: params.description,
      type: 'special',
      startDate,
      endDate,
      theme: params.theme,
      requirements: params.requirements,
      prizes: params.prizes,
      participants: 0,
      submissions: [],
    };

    this.activeChallenges.set(challenge.id, challenge);
    await this.saveChallenges();
    this.notifyChallengeListeners();

    // Notify users about special challenge
    this.notifyNewChallenge(challenge);

    return challenge;
  }

  public async submitToChallenge(challengeId: string, artworkId: string): Promise<void> {
    const challenge = this.activeChallenges.get(challengeId);
    const user = profileSystem.getCurrentUser();
    
    if (!challenge || !user) {
      throw new Error('Invalid challenge or user');
    }

    if (new Date() > challenge.endDate) {
      throw new Error('Challenge has ended');
    }

    const artwork = await portfolioManager.getArtwork(artworkId);
    if (!artwork || artwork.userId !== user.id) {
      throw new Error('Invalid artwork');
    }

    // Check if user already submitted
    const existingSubmission = challenge.submissions.find(
      sub => sub.userId === user.id
    );

    if (existingSubmission) {
      // Update submission
      const index = challenge.submissions.indexOf(existingSubmission);
      challenge.submissions[index] = artwork;
    } else {
      // New submission
      challenge.submissions.push(artwork);
      challenge.participants++;

      // Track participation
      let userChallenges = this.userParticipation.get(user.id);
      if (!userChallenges) {
        userChallenges = new Set();
        this.userParticipation.set(user.id, userChallenges);
      }
      userChallenges.add(challengeId);
    }

    // Update artwork to link to challenge
    artwork.challengeId = challengeId;
    await portfolioManager.updateArtwork(artworkId, artwork);

    // Save changes
    await this.saveChallenges();
    await this.saveParticipation();

    // Record participation for progression
    await progressionSystem.recordChallengeParticipation(challengeId, false);

    // Emit participation event
    this.emitParticipationEvent({
      type: 'submission',
      userId: user.id,
      challengeId,
      artworkId,
      timestamp: new Date(),
    });
  }

  public getActiveChallenge(type: 'daily' | 'weekly'): Challenge | null {
    const now = new Date();
    
    for (const challenge of this.activeChallenges.values()) {
      if (challenge.type === type && 
          now >= challenge.startDate && 
          now < challenge.endDate) {
        return challenge;
      }
    }
    
    return null;
  }

  public getAllActiveChallenges(): Challenge[] {
    const now = new Date();
    return Array.from(this.activeChallenges.values())
      .filter(challenge => now < challenge.endDate)
      .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());
  }

  public getPastChallenges(limit: number = 10): Challenge[] {
    const now = new Date();
    return Array.from(this.activeChallenges.values())
      .filter(challenge => now >= challenge.endDate)
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())
      .slice(0, limit);
  }

  public getUserChallenges(userId: string): Challenge[] {
    const userChallengeIds = this.userParticipation.get(userId);
    if (!userChallengeIds) return [];

    return Array.from(userChallengeIds)
      .map(id => this.activeChallenges.get(id))
      .filter((challenge): challenge is Challenge => challenge !== undefined)
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  }

  public async evaluateChallenge(challengeId: string): Promise<void> {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge || new Date() < challenge.endDate) {
      throw new Error('Challenge not ready for evaluation');
    }

    if (challenge.winners) {
      // Already evaluated
      return;
    }

    // Calculate scores for each submission
    const scoredSubmissions = challenge.submissions.map(artwork => {
      // Simple scoring based on engagement
      // In production, this could include AI evaluation, peer voting, etc.
      const score = artwork.likes * 2 + artwork.comments.length * 3 + artwork.views * 0.1;
      return { artwork, score };
    });

    // Sort by score
    scoredSubmissions.sort((a, b) => b.score - a.score);

    // Determine winners
    const winners: string[] = [];
    challenge.prizes.forEach((prize, index) => {
      if (scoredSubmissions[index]) {
        winners.push(scoredSubmissions[index].artwork.userId);
        
        // Award XP
        progressionSystem.recordChallengeParticipation(
          challengeId, 
          index === 0 // won if first place
        );
      }
    });

    challenge.winners = winners;
    await this.saveChallenges();

    // Notify winners
    winners.forEach((userId, index) => {
      this.notifyWinner(userId, challenge, index + 1);
    });
  }

  private notifyNewChallenge(challenge: Challenge): void {
    // In production, send push notifications
    console.log('New challenge available:', challenge.title);
  }

  private notifyWinner(userId: string, challenge: Challenge, place: number): void {
    // In production, send push notifications
    console.log(`User ${userId} won place ${place} in ${challenge.title}`);
  }

  private async saveChallenges(): Promise<void> {
    const challengesArray = Array.from(this.activeChallenges.values());
    await dataManager.set('active_challenges', challengesArray);
  }

  private async saveParticipation(): Promise<void> {
    const participationData: Record<string, string[]> = {};
    this.userParticipation.forEach((challengeIds, userId) => {
      participationData[userId] = Array.from(challengeIds);
    });
    await dataManager.set('challenge_participation', participationData);
  }

  public subscribeToChallenge(callback: (challenges: Challenge[]) => void): () => void {
    this.challengeListeners.add(callback);
    callback(this.getAllActiveChallenges());
    return () => this.challengeListeners.delete(callback);
  }

  private notifyChallengeListeners(): void {
    const activeChallenges = this.getAllActiveChallenges();
    this.challengeListeners.forEach(callback => callback(activeChallenges));
  }

  public subscribeToParticipation(callback: (event: ParticipationEvent) => void): () => void {
    this.participationListeners.add(callback);
    return () => this.participationListeners.delete(callback);
  }

  private emitParticipationEvent(event: ParticipationEvent): void {
    this.participationListeners.forEach(callback => callback(event));
  }

  public getChallengeStats(challengeId: string): ChallengeStats | null {
    const challenge = this.activeChallenges.get(challengeId);
    if (!challenge) return null;

    const totalLikes = challenge.submissions.reduce((sum, artwork) => sum + artwork.likes, 0);
    const totalComments = challenge.submissions.reduce((sum, artwork) => sum + artwork.comments.length, 0);
    
    return {
      participants: challenge.participants,
      submissions: challenge.submissions.length,
      totalEngagement: totalLikes + totalComments,
      averageEngagement: challenge.submissions.length > 0 
        ? (totalLikes + totalComments) / challenge.submissions.length 
        : 0,
      topSubmission: challenge.submissions.sort((a, b) => b.likes - a.likes)[0] || null,
      timeRemaining: Math.max(0, challenge.endDate.getTime() - Date.now()),
    };
  }

  public getUserParticipationStats(userId: string): ParticipationStats {
    const userChallenges = this.getUserChallenges(userId);
    let wins = 0;
    let participations = userChallenges.length;

    userChallenges.forEach(challenge => {
      if (challenge.winners && challenge.winners[0] === userId) {
        wins++;
      }
    });

    return {
      totalParticipations: participations,
      wins,
      winRate: participations > 0 ? (wins / participations) * 100 : 0,
      currentStreak: this.calculateParticipationStreak(userId),
      favoriteTheme: this.getFavoriteTheme(userChallenges),
    };
  }

  private calculateParticipationStreak(userId: string): number {
    const userChallenges = this.getUserChallenges(userId)
      .filter(c => c.type === 'daily')
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < userChallenges.length; i++) {
      const challengeDate = new Date(userChallenges[i].startDate);
      challengeDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((today.getTime() - challengeDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === i) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private getFavoriteTheme(challenges: Challenge[]): string {
    const themeCounts = new Map<string, number>();
    
    challenges.forEach(challenge => {
      const count = themeCounts.get(challenge.theme) || 0;
      themeCounts.set(challenge.theme, count + 1);
    });

    let favoriteTheme = 'Various';
    let maxCount = 0;

    themeCounts.forEach((count, theme) => {
      if (count > maxCount) {
        maxCount = count;
        favoriteTheme = theme;
      }
    });

    return favoriteTheme;
  }
}

interface ParticipationEvent {
  type: 'submission' | 'win';
  userId: string;
  challengeId: string;
  artworkId?: string;
  place?: number;
  timestamp: Date;
}

interface ChallengeStats {
  participants: number;
  submissions: number;
  totalEngagement: number;
  averageEngagement: number;
  topSubmission: Artwork | null;
  timeRemaining: number;
}

interface ParticipationStats {
  totalParticipations: number;
  wins: number;
  winRate: number;
  currentStreak: number;
  favoriteTheme: string;
}

// Export singleton instance
export const challengeSystem = ChallengeSystem.getInstance();