/**
 * Community Engine Module
 * Manages social features, challenges, and community engagement
 */

export { SocialEngine, socialEngine } from './SocialEngine';
export { ChallengeSystem, challengeSystem } from './ChallengeSystem';

// Re-export community-related types
export type {
  Challenge,
  Prize,
  Comment,
} from '../../types';

// Community engine initialization
export const initializeCommunityEngine = async (): Promise<void> => {
  console.log('🌟 Initializing Community Engine...');
  
  // Systems initialize themselves through singleton pattern
  // Any additional initialization can go here
  
  console.log('✅ Community Engine initialized successfully');
};

// Utility functions for community management
export const getCommunityEngineStatus = () => {
  const activeChallenges = challengeSystem.getAllActiveChallenges();
  const trending = socialEngine.getTrendingContent();
  const user = socialEngine.getEngagementStats('current'); // Would need current user ID
  
  return {
    activeChallenges: activeChallenges.length,
    dailyChallenge: challengeSystem.getActiveChallenge('daily'),
    weeklyChallenge: challengeSystem.getActiveChallenge('weekly'),
    trendingArtworks: trending.artworks.length,
    trendingArtists: trending.artists.length,
    userEngagement: user,
  };
};

// Quick community actions
export const quickActions = {
  async followUser(userId: string): Promise<void> {
    await socialEngine.followUser(userId);
  },
  
  async unfollowUser(userId: string): Promise<void> {
    await socialEngine.unfollowUser(userId);
  },
  
  async likeArtwork(artworkId: string): Promise<void> {
    await socialEngine.likeArtwork(artworkId);
  },
  
  async commentOnArtwork(artworkId: string, text: string): Promise<any> {
    return socialEngine.commentOnArtwork(artworkId, text);
  },
  
  async shareArtwork(artworkId: string, message?: string): Promise<void> {
    await socialEngine.shareArtwork(artworkId, message);
  },
  
  async submitToChallenge(challengeId: string, artworkId: string): Promise<void> {
    await challengeSystem.submitToChallenge(challengeId, artworkId);
  },
  
  async getFeed(page?: number): Promise<any[]> {
    return socialEngine.generateFeed('current', page); // Would need current user ID
  },
  
  getSuggestedUsers(): string[] {
    return socialEngine.getSuggestedUsers('current'); // Would need current user ID
  },
};