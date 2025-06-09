// Community engine exports and operations
export { SocialEngine } from './SocialEngine';
export { ChallengeSystem } from './ChallengeSystem';

// FIXED: Create singleton instances
import { SocialEngine } from './SocialEngine';
import { ChallengeSystem } from './ChallengeSystem';

export const socialEngine = new SocialEngine();
export const challengeSystem = new ChallengeSystem();

/**
 * Community API - High-level interface for social features
 * Provides simplified access to community functionality
 */

// Community dashboard data
export interface CommunityDashboard {
  activeChallenges: any[];
  trendingArtwork: any[];
  userEngagement: {
    followersCount: number;
    followingCount: number;
    likesReceived: number;
    commentsReceived: number;
  };
  challenges: {
    dailyChallenge: any;
    weeklyChallenge: any;
    specialChallenges: any[];
  };
}

export const getCommunityDashboard = async (): Promise<CommunityDashboard> => {
  const activeChallenges = challengeSystem.getAllActiveChallenges();
  const trending = socialEngine.getTrendingContent();
  const user = socialEngine.getEngagementStats('current'); // Would need current user ID
  
  return {
    activeChallenges,
    trendingArtwork: trending,
    userEngagement: user,
    challenges: {
      dailyChallenge: challengeSystem.getActiveChallenge('daily'),
      weeklyChallenge: challengeSystem.getActiveChallenge('weekly'),
      specialChallenges: challengeSystem.getSpecialChallenges(),
    },
  };
};

// Social actions
export const followUser = async (userId: string): Promise<void> => {
  try {
    await socialEngine.followUser(userId);
  } catch (error) {
    throw new Error(`Failed to follow user: ${error}`);
  }
};

export const unfollowUser = async (userId: string): Promise<void> => {
  try {
    await socialEngine.unfollowUser(userId);
  } catch (error) {
    throw new Error(`Failed to unfollow user: ${error}`);
  }
};

export const likeArtwork = async (artworkId: string): Promise<void> => {
  try {
    await socialEngine.likeArtwork(artworkId);
  } catch (error) {
    throw new Error(`Failed to like artwork: ${error}`);
  }
};

export const commentOnArtwork = async (artworkId: string, text: string): Promise<any> => {
  try {
    return socialEngine.commentOnArtwork(artworkId, text);
  } catch (error) {
    throw new Error(`Failed to comment on artwork: ${error}`);
  }
};

export const shareArtwork = async (artworkId: string, message?: string): Promise<void> => {
  try {
    await socialEngine.shareArtwork(artworkId, message);
  } catch (error) {
    throw new Error(`Failed to share artwork: ${error}`);
  }
};

// Challenge actions
export const submitToChallenge = async (challengeId: string, artworkId: string): Promise<void> => {
  try {
    await challengeSystem.submitToChallenge(challengeId, artworkId);
  } catch (error) {
    throw new Error(`Failed to submit to challenge: ${error}`);
  }
};

// Content discovery
export const getFeed = async (page: number = 1): Promise<any[]> => {
  try {
    return socialEngine.generateFeed('current', page); // Would need current user ID
  } catch (error) {
    throw new Error(`Failed to get feed: ${error}`);
  }
};

export const getSuggestedUsers = async (): Promise<any[]> => {
  try {
    return socialEngine.getSuggestedUsers('current'); // Would need current user ID
  } catch (error) {
    throw new Error(`Failed to get suggested users: ${error}`);
  }
};