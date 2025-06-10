import { Challenge, Artwork, ChallengeSubmission, Prize } from '../../types';
import { EventBus } from '../core/EventBus';
import { errorHandler } from '../core/ErrorHandler';
import { dataManager } from '../core/DataManager';

/**
 * Challenge System - Manages daily, weekly, and special art challenges
 * Drives engagement through competitive and collaborative challenges
 */
export class ChallengeSystem {
  private static instance: ChallengeSystem;
  private eventBus: EventBus = EventBus.getInstance();
  
  // Challenge storage
  private challenges: Map<string, Challenge> = new Map();
  private userSubmissions: Map<string, ChallengeSubmission[]> = new Map();
  private userVotes: Map<string, Set<string>> = new Map(); // userId -> submissionIds
  
  // Challenge templates
  private challengeTemplates = {
    daily: [
      {
        theme: 'Quick Sketch',
        prompt: 'Draw a simple object from your surroundings in 5 minutes',
        duration: 24 * 60 * 60 * 1000, // 24 hours
        difficulty: 'beginner' as const,
        xpReward: 50,
      },
      {
        theme: 'Shape Study',
        prompt: 'Create an artwork using only circles and squares',
        duration: 24 * 60 * 60 * 1000,
        difficulty: 'beginner' as const,
        xpReward: 75,
      },
      {
        theme: 'Light and Shadow',
        prompt: 'Draw an object focusing on its shadows',
        duration: 24 * 60 * 60 * 1000,
        difficulty: 'intermediate' as const,
        xpReward: 100,
      },
    ],
    weekly: [
      {
        theme: 'Portrait Week',
        prompt: 'Draw a self-portrait or portrait of someone you know',
        duration: 7 * 24 * 60 * 60 * 1000, // 7 days
        difficulty: 'intermediate' as const,
        xpReward: 300,
      },
      {
        theme: 'Nature Study',
        prompt: 'Create an artwork inspired by nature',
        duration: 7 * 24 * 60 * 60 * 1000,
        difficulty: 'beginner' as const,
        xpReward: 250,
      },
      {
        theme: 'Color Harmony',
        prompt: 'Create an artwork using complementary colors',
        duration: 7 * 24 * 60 * 60 * 1000,
        difficulty: 'intermediate' as const,
        xpReward: 350,
      },
    ],
    special: [
      {
        theme: 'Community Celebration',
        prompt: 'Create an artwork that represents community and togetherness',
        duration: 14 * 24 * 60 * 60 * 1000, // 14 days
        difficulty: 'intermediate' as const,
        xpReward: 500,
      },
    ],
  };
  
  private constructor() {
    this.loadChallenges();
    this.scheduleChallengeCycles();
  }

  public static getInstance(): ChallengeSystem {
    if (!ChallengeSystem.instance) {
      ChallengeSystem.instance = new ChallengeSystem();
    }
    return ChallengeSystem.instance;
  }

  // ---- PUBLIC API ----

  public getDailyChallenge(): Challenge | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    
    const dailyChallenge = Array.from(this.challenges.values()).find(
      challenge => 
        challenge.type === 'daily' && 
        challenge.startDate === todayStart
    );
    
    return dailyChallenge || null;
  }

  public getWeeklyChallenges(): Challenge[] {
    const now = Date.now();
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    
    return Array.from(this.challenges.values()).filter(
      challenge => 
        challenge.type === 'weekly' && 
        challenge.startDate >= weekStart.getTime() &&
        challenge.startDate < weekStart.getTime() + 7 * 24 * 60 * 60 * 1000
    );
  }

  public getAllActiveChallenges(): Challenge[] {
    const now = Date.now();
    return Array.from(this.challenges.values()).filter(
      challenge => now >= challenge.startDate && now < challenge.endDate
    );
  }

  public getChallenge(challengeId: string): Challenge | null {
    return this.challenges.get(challengeId) || null;
  }

  public createDailyChallenge(): Challenge {
    const template = this.getRandomTemplate('daily');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const challenge: Challenge = {
      id: `daily_${Date.now()}`,
      title: `Daily Challenge: ${template.theme}`,
      description: template.prompt,
      type: 'daily',
      theme: template.theme,
      prompt: template.prompt,
      rules: [
        'Submit your artwork before midnight',
        'Follow the theme and prompt',
        'Be respectful in comments',
        'Original artwork only',
      ],
      startDate: today.getTime(),
      endDate: tomorrow.getTime(),
      difficulty: template.difficulty,
      rewards: {
        xp: template.xpReward,
        achievements: [`daily_${template.theme.toLowerCase().replace(/\s+/g, '_')}`],
        badges: [],
      },
      participants: 0,
      submissions: [],
      featured: false,
      tags: [template.theme.toLowerCase(), 'daily', template.difficulty],
      prizes: [
        {
          id: 'first_place',
          name: 'Daily Champion',
          description: 'Most liked submission',
          type: 'xp',
          value: 100,
          place: 1,
        },
        {
          id: 'participation',
          name: 'Participant',
          description: 'Completed the challenge',
          type: 'xp',
          value: 25,
          place: 0,
        },
      ],
    };
    
    this.challenges.set(challenge.id, challenge);
    this.saveChallenges();
    
    this.eventBus.emit('challenge:created', { challenge });
    return challenge;
  }

  public createWeeklyChallenge(): Challenge {
    const template = this.getRandomTemplate('weekly');
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const challenge: Challenge = {
      id: `weekly_${Date.now()}`,
      title: `Weekly Challenge: ${template.theme}`,
      description: template.prompt,
      type: 'weekly',
      theme: template.theme,
      prompt: template.prompt,
      rules: [
        'Submit your artwork before Sunday midnight',
        'Follow the theme and prompt',
        'Be respectful in comments',
        'Original artwork only',
        'Multiple submissions allowed',
      ],
      startDate: weekStart.getTime(),
      endDate: weekEnd.getTime(),
      difficulty: template.difficulty,
      rewards: {
        xp: template.xpReward,
        achievements: [`weekly_${template.theme.toLowerCase().replace(/\s+/g, '_')}`],
        badges: ['weekly_warrior'],
      },
      participants: 0,
      submissions: [],
      featured: true,
      tags: [template.theme.toLowerCase(), 'weekly', template.difficulty],
      prizes: [
        {
          id: 'first_place',
          name: 'Weekly Winner',
          description: 'Best overall submission',
          type: 'xp',
          value: 500,
          place: 1,
        },
        {
          id: 'second_place',
          name: 'Runner Up',
          description: 'Second best submission',
          type: 'xp',
          value: 300,
          place: 2,
        },
        {
          id: 'third_place',
          name: 'Third Place',
          description: 'Third best submission',
          type: 'xp',
          value: 200,
          place: 3,
        },
        {
          id: 'popular_choice',
          name: 'Popular Choice',
          description: 'Most liked submission',
          type: 'badge',
          value: 'popular_artist',
          place: 0,
        },
      ],
    };
    
    this.challenges.set(challenge.id, challenge);
    this.saveChallenges();
    
    this.eventBus.emit('challenge:created', { challenge });
    return challenge;
  }

  public createSpecialChallenge(
    title: string,
    theme: string,
    prompt: string,
    durationDays: number,
    rewards: Challenge['rewards']
  ): Challenge {
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);
    
    const challenge: Challenge = {
      id: `special_${Date.now()}`,
      title,
      description: prompt,
      type: 'special',
      theme,
      prompt,
      rules: [
        'Follow the theme and prompt',
        'Be respectful in comments',
        'Original artwork only',
        'One submission per user',
      ],
      startDate: startDate.getTime(),
      endDate: endDate.getTime(),
      difficulty: 'intermediate',
      rewards,
      participants: 0,
      submissions: [],
      featured: true,
      tags: [theme.toLowerCase(), 'special', 'event'],
      prizes: [],
    };
    
    this.challenges.set(challenge.id, challenge);
    this.saveChallenges();
    
    this.eventBus.emit('challenge:created', { challenge, special: true });
    return challenge;
  }

  public submitArtwork(challengeId: string, artwork: Artwork, userId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      errorHandler.handleError({
        code: 'CHALLENGE_NOT_FOUND',
        message: 'Challenge not found',
        severity: 'medium',
        context: { challengeId },
        timestamp: new Date(),
      });
      return false;
    }

    // Check if challenge is active
    if (Date.now() > challenge.endDate) {
      errorHandler.handleError({
        code: 'CHALLENGE_ENDED',
        message: 'Challenge has ended',
        severity: 'low',
        context: { challengeId },
        timestamp: new Date(),
      });
      return false;
    }

    // Check if user already submitted
    const userSubmissionsForChallenge = challenge.submissions.filter(
      sub => sub.userId === userId
    );
    
    if (challenge.type !== 'weekly' && userSubmissionsForChallenge.length > 0) {
      errorHandler.handleError({
        code: 'ALREADY_SUBMITTED',
        message: 'User has already submitted to this challenge',
        severity: 'low',
        context: { challengeId, userId },
        timestamp: new Date(),
      });
      return false;
    }

    // Create submission
    const submission: ChallengeSubmission = {
      id: `submission_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      challengeId,
      userId,
      artworkId: artwork.id,
      submittedAt: Date.now(),
      votes: 0,
      featured: false,
    };

    // Add submission to challenge
    challenge.submissions.push(submission);
    challenge.participants = new Set(challenge.submissions.map(s => s.userId)).size;

    // Store user submission
    const userSubs = this.userSubmissions.get(userId) || [];
    userSubs.push(submission);
    this.userSubmissions.set(userId, userSubs);

    // Update artwork with challenge reference
    artwork.challengeId = challengeId;

    this.saveChallenges();
    this.eventBus.emit('challenge:submitted', { 
      challenge, 
      submission, 
      artwork,
      userId 
    });

    return true;
  }

  public voteForSubmission(submissionId: string, userId: string): boolean {
    // Find the submission
    let targetSubmission: ChallengeSubmission | null = null;
    let targetChallenge: Challenge | null = null;

    for (const challenge of this.challenges.values()) {
      const submission = challenge.submissions.find(s => s.id === submissionId);
      if (submission) {
        targetSubmission = submission;
        targetChallenge = challenge;
        break;
      }
    }

    if (!targetSubmission || !targetChallenge) return false;

    // Check if challenge is still active
    const now = Date.now();
    if (!(now >= targetChallenge.startDate && now < targetChallenge.endDate)) {
      return false;
    }

    // Check if user already voted
    const userVoteSet = this.userVotes.get(userId) || new Set();
    if (userVoteSet.has(submissionId)) return false;

    // Add vote
    targetSubmission.votes++;
    userVoteSet.add(submissionId);
    this.userVotes.set(userId, userVoteSet);

    this.saveChallenges();
    this.eventBus.emit('challenge:voted', { 
      submission: targetSubmission, 
      challenge: targetChallenge,
      userId 
    });

    return true;
  }

  public getUpcomingChallenges(): Challenge[] {
    const now = Date.now();
    return Array.from(this.challenges.values())
      .filter(challenge => now < challenge.endDate)
      .sort((a, b) => a.endDate - b.endDate);
  }

  public getPastChallenges(limit: number = 10): Challenge[] {
    const now = Date.now();
    return Array.from(this.challenges.values())
      .filter(challenge => now >= challenge.endDate)
      .sort((a, b) => b.endDate - a.endDate)
      .slice(0, limit);
  }

  public getUserSubmissions(userId: string): ChallengeSubmission[] {
    return this.userSubmissions.get(userId) || [];
  }

  public getUserActiveChallenges(userId: string): Challenge[] {
    const userSubs = this.getUserSubmissions(userId);
    const submittedChallengeIds = new Set(userSubs.map(s => s.challengeId));
    
    return this.getAllActiveChallenges()
      .filter(challenge => !submittedChallengeIds.has(challenge.id))
      .sort((a, b) => a.startDate - a.startDate);
  }

  public concludeChallenge(challengeId: string): void {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || Date.now() < challenge.endDate) {
      return;
    }

    // Already concluded
    if (challenge.winners) {
      return;
    }

    // Calculate winners based on votes
    const sortedSubmissions = [...challenge.submissions]
      .sort((a, b) => b.votes - a.votes);

    const winners: string[] = [];
    
    // Award prizes
    challenge.prizes?.forEach((prize, index) => {
      if (prize.place > 0 && sortedSubmissions[prize.place - 1]) {
        const winnerSubmission = sortedSubmissions[prize.place - 1];
        winners.push(winnerSubmission.userId);
        
        this.eventBus.emit('challenge:prize_awarded', {
          challenge,
          submission: winnerSubmission,
          prize,
          userId: winnerSubmission.userId,
        });
      }
    });

    // Mark challenge as concluded
    challenge.winners = winners;
    
    // Award participation prizes
    challenge.submissions.forEach(submission => {
      const participationPrize = challenge.prizes?.find(p => p.place === 0);
      if (participationPrize) {
        this.eventBus.emit('challenge:prize_awarded', {
          challenge,
          submission,
          prize: participationPrize,
          userId: submission.userId,
        });
      }
    });

    this.saveChallenges();
    this.eventBus.emit('challenge:concluded', { challenge, winners });
  }

  public getChallengeLeaderboard(challengeId: string): Array<{
    submission: ChallengeSubmission;
    rank: number;
    user?: any;
  }> {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return [];

    return challenge.submissions
      .sort((a, b) => b.votes - a.votes)
      .map((submission, index) => ({
        submission,
        rank: index + 1,
      }));
  }

  public featureSubmission(submissionId: string): boolean {
    let updated = false;

    for (const challenge of this.challenges.values()) {
      const submission = challenge.submissions.find(s => s.id === submissionId);
      if (submission) {
        submission.featured = true;
        updated = true;
        
        this.eventBus.emit('challenge:submission_featured', {
          challenge,
          submission,
        });
        break;
      }
    }

    if (updated) {
      this.saveChallenges();
    }

    return updated;
  }

  public getChallengeStats(challengeId: string): {
    totalSubmissions: number;
    totalVotes: number;
    averageVotesPerSubmission: number;
    participationRate: number;
    topSubmission: Artwork | null;
    timeRemaining: number;
  } | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) return null;

    const totalVotes = challenge.submissions.reduce((sum, sub) => sum + sub.votes, 0);
    const avgVotes = challenge.submissions.length > 0 
      ? totalVotes / challenge.submissions.length 
      : 0;

    return {
      totalSubmissions: challenge.submissions.length,
      totalVotes,
      averageVotesPerSubmission: avgVotes,
      participationRate: challenge.participants, // Could calculate based on active users
      topSubmission: null, // Would need to fetch artwork
      timeRemaining: Math.max(0, challenge.endDate - Date.now()),
    };
  }

  public getUserChallengeStats(userId: string): {
    totalParticipations: number;
    totalWins: number;
    totalVotes: number;
    favoriteThemes: string[];
    winRate: number;
  } {
    const userSubs = this.getUserSubmissions(userId);
    let totalWins = 0;
    let totalVotes = 0;
    const themeCount = new Map<string, number>();

    userSubs.forEach(sub => {
      const challenge = Array.from(this.challenges.values())
        .find(c => c.id === sub.challengeId);
      
      if (challenge) {
        if (challenge.winners && challenge.winners[0] === userId) {
          totalWins++;
        }
        totalVotes += sub.votes;
        
        const count = themeCount.get(challenge.theme) || 0;
        themeCount.set(challenge.theme, count + 1);
      }
    });

    const favoriteThemes = Array.from(themeCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([theme]) => theme);

    return {
      totalParticipations: userSubs.length,
      totalWins,
      totalVotes,
      favoriteThemes,
      winRate: userSubs.length > 0 ? totalWins / userSubs.length : 0,
    };
  }

  // ---- PRIVATE METHODS ----

  private getRandomTemplate(type: 'daily' | 'weekly' | 'special') {
    const templates = this.challengeTemplates[type];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private async loadChallenges(): Promise<void> {
    try {
      const savedChallenges = await dataManager.get<Record<string, Challenge>>('challenges');
      if (savedChallenges) {
        Object.entries(savedChallenges).forEach(([id, challenge]) => {
          this.challenges.set(id, challenge);
        });
      }

      const savedSubmissions = await dataManager.get<Record<string, ChallengeSubmission[]>>('user_submissions');
      if (savedSubmissions) {
        Object.entries(savedSubmissions).forEach(([userId, submissions]) => {
          this.userSubmissions.set(userId, submissions);
        });
      }

      const savedVotes = await dataManager.get<Record<string, string[]>>('user_votes');
      if (savedVotes) {
        Object.entries(savedVotes).forEach(([userId, votes]) => {
          this.userVotes.set(userId, new Set(votes));
        });
      }
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  }

  private async saveChallenges(): Promise<void> {
    try {
      const challengesObj: Record<string, Challenge> = {};
      this.challenges.forEach((challenge, id) => {
        challengesObj[id] = challenge;
      });
      await dataManager.set('challenges', challengesObj);

      const submissionsObj: Record<string, ChallengeSubmission[]> = {};
      this.userSubmissions.forEach((submissions, userId) => {
        submissionsObj[userId] = submissions;
      });
      await dataManager.set('user_submissions', submissionsObj);

      const votesObj: Record<string, string[]> = {};
      this.userVotes.forEach((votes, userId) => {
        votesObj[userId] = Array.from(votes);
      });
      await dataManager.set('user_votes', votesObj);
    } catch (error) {
      console.error('Failed to save challenges:', error);
    }
  }

  private scheduleChallengeCycles(): void {
    // Schedule daily challenge creation
    const scheduleDailyChallenge = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      
      const timeUntilMidnight = tomorrow.getTime() - now.getTime();
      
      setTimeout(() => {
        this.createDailyChallenge();
        // Schedule next daily
        setInterval(() => {
          this.createDailyChallenge();
        }, 24 * 60 * 60 * 1000);
      }, timeUntilMidnight);
    };

    // Schedule weekly challenge creation
    const scheduleWeeklyChallenge = () => {
      const now = new Date();
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);
      nextMonday.setHours(0, 0, 0, 0);
      
      const timeUntilMonday = nextMonday.getTime() - now.getTime();
      
      setTimeout(() => {
        this.createWeeklyChallenge();
        // Schedule next weekly
        setInterval(() => {
          this.createWeeklyChallenge();
        }, 7 * 24 * 60 * 60 * 1000);
      }, timeUntilMonday);
    };

    // Schedule challenge conclusions
    const scheduleConclusionChecks = () => {
      setInterval(() => {
        this.challenges.forEach((challenge, id) => {
          if (Date.now() > challenge.endDate && !challenge.winners) {
            this.concludeChallenge(id);
          }
        });
      }, 60 * 60 * 1000); // Check every hour
    };

    scheduleDailyChallenge();
    scheduleWeeklyChallenge();
    scheduleConclusionChecks();

    // Create initial challenges if none exist
    if (this.challenges.size === 0) {
      this.createDailyChallenge();
      this.createWeeklyChallenge();
    }
  }
}

// Export singleton instance
export const challengeSystem = ChallengeSystem.getInstance();