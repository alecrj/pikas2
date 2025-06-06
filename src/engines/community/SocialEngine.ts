import { User, Artwork, Comment } from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';
import { profileSystem } from '../user/ProfileSystem';
import { portfolioManager } from '../user/PortfolioManager';

/**
 * Social Engine - Manages community interactions, following, and social features
 * Handles the social graph and community engagement mechanics
 */
export class SocialEngine {
  private static instance: SocialEngine;
  private socialGraph: Map<string, Set<string>> = new Map(); // userId -> Set of follower IDs
  private feedCache: Map<string, FeedItem[]> = new Map();
  private socialListeners: Set<(event: SocialEvent) => void> = new Set();
  private trendingContent: TrendingData = {
    artworks: [],
    artists: [],
    challenges: [],
    lastUpdated: null,
  };

  private constructor() {
    this.initializeSocialGraph();
    this.startTrendingUpdates();
  }

  public static getInstance(): SocialEngine {
    if (!SocialEngine.instance) {
      SocialEngine.instance = new SocialEngine();
    }
    return SocialEngine.instance;
  }

  private async initializeSocialGraph(): Promise<void> {
    try {
      const socialData = await dataManager.get<any>('social_graph');
      if (socialData) {
        // Reconstruct the social graph
        Object.entries(socialData).forEach(([userId, followers]) => {
          this.socialGraph.set(userId, new Set(followers as string[]));
        });
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('SOCIAL_INIT_ERROR', 'Failed to initialize social graph', 'low', error)
      );
    }
  }

  private startTrendingUpdates(): void {
    // Update trending content every hour
    this.updateTrendingContent();
    setInterval(() => {
      this.updateTrendingContent();
    }, 60 * 60 * 1000);
  }

  public async followUser(targetUserId: string): Promise<void> {
    const currentUser = profileSystem.getCurrentUser();
    if (!currentUser || currentUser.id === targetUserId) return;

    // Update follower's following list
    await profileSystem.followUser(targetUserId);

    // Update target's followers set
    let followers = this.socialGraph.get(targetUserId);
    if (!followers) {
      followers = new Set();
      this.socialGraph.set(targetUserId, followers);
    }
    followers.add(currentUser.id);

    // Save social graph
    await this.saveSocialGraph();

    // Emit social event
    this.emitSocialEvent({
      type: 'follow',
      actorId: currentUser.id,
      targetId: targetUserId,
      timestamp: new Date(),
    });

    // Send notification to target user
    this.sendNotification(targetUserId, {
      type: 'new_follower',
      message: `${currentUser.displayName} started following you`,
      actorId: currentUser.id,
    });
  }

  public async unfollowUser(targetUserId: string): Promise<void> {
    const currentUser = profileSystem.getCurrentUser();
    if (!currentUser) return;

    // Update follower's following list
    await profileSystem.unfollowUser(targetUserId);

    // Update target's followers set
    const followers = this.socialGraph.get(targetUserId);
    if (followers) {
      followers.delete(currentUser.id);
      if (followers.size === 0) {
        this.socialGraph.delete(targetUserId);
      }
    }

    // Save social graph
    await this.saveSocialGraph();

    // Emit social event
    this.emitSocialEvent({
      type: 'unfollow',
      actorId: currentUser.id,
      targetId: targetUserId,
      timestamp: new Date(),
    });
  }

  public getFollowers(userId: string): string[] {
    const followers = this.socialGraph.get(userId);
    return followers ? Array.from(followers) : [];
  }

  public getFollowerCount(userId: string): number {
    const followers = this.socialGraph.get(userId);
    return followers ? followers.size : 0;
  }

  public isFollowing(userId: string, targetUserId: string): boolean {
    const followers = this.socialGraph.get(targetUserId);
    return followers ? followers.has(userId) : false;
  }

  public async generateFeed(userId: string, page: number = 0, pageSize: number = 20): Promise<FeedItem[]> {
    const cacheKey = `${userId}_${page}_${pageSize}`;
    
    // Check cache first
    const cached = this.feedCache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    const user = await this.getUserData(userId);
    if (!user) return [];

    const feedItems: FeedItem[] = [];

    // Get content from followed users
    for (const followedId of user.following) {
      const artworks = portfolioManager.getUserArtworks(followedId)
        .filter(artwork => artwork.isPublic)
        .slice(0, 5); // Recent 5 artworks

      artworks.forEach(artwork => {
        feedItems.push({
          id: `artwork_${artwork.id}`,
          type: 'artwork',
          content: artwork,
          userId: followedId,
          timestamp: artwork.createdAt,
          engagement: {
            likes: artwork.likes,
            comments: artwork.comments.length,
            shares: 0,
          },
        });
      });
    }

    // Add trending content
    this.trendingContent.artworks.slice(0, 3).forEach(artwork => {
      if (!feedItems.find(item => item.content.id === artwork.id)) {
        feedItems.push({
          id: `trending_${artwork.id}`,
          type: 'trending',
          content: artwork,
          userId: artwork.userId,
          timestamp: artwork.createdAt,
          engagement: {
            likes: artwork.likes,
            comments: artwork.comments.length,
            shares: 0,
          },
        });
      }
    });

    // Sort by timestamp
    feedItems.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Paginate
    const paginatedFeed = feedItems.slice(page * pageSize, (page + 1) * pageSize);

    // Cache the result
    this.feedCache.set(cacheKey, paginatedFeed);

    return paginatedFeed;
  }

  private isCacheValid(cached: any): boolean {
    // Cache is valid for 5 minutes
    return true; // Simplified for now
  }

  public async likeArtwork(artworkId: string): Promise<void> {
    const currentUser = profileSystem.getCurrentUser();
    if (!currentUser) return;

    await portfolioManager.likeArtwork(artworkId);

    const artwork = await portfolioManager.getArtwork(artworkId);
    if (artwork && artwork.userId !== currentUser.id) {
      this.sendNotification(artwork.userId, {
        type: 'artwork_liked',
        message: `${currentUser.displayName} liked your artwork`,
        actorId: currentUser.id,
        artworkId,
      });
    }

    this.emitSocialEvent({
      type: 'like',
      actorId: currentUser.id,
      targetId: artworkId,
      targetType: 'artwork',
      timestamp: new Date(),
    });
  }

  public async commentOnArtwork(artworkId: string, text: string): Promise<Comment> {
    const currentUser = profileSystem.getCurrentUser();
    if (!currentUser) return Promise.reject('No user logged in');

    const comment: Comment = {
      id: this.generateId(),
      userId: currentUser.id,
      text,
      createdAt: new Date(),
      likes: 0,
      replies: [],
    };

    const artwork = await portfolioManager.getArtwork(artworkId);
    if (artwork) {
      artwork.comments.push(comment);
      await portfolioManager.updateArtwork(artworkId, artwork);

      if (artwork.userId !== currentUser.id) {
        this.sendNotification(artwork.userId, {
          type: 'new_comment',
          message: `${currentUser.displayName} commented on your artwork`,
          actorId: currentUser.id,
          artworkId,
          commentId: comment.id,
        });
      }
    }

    this.emitSocialEvent({
      type: 'comment',
      actorId: currentUser.id,
      targetId: artworkId,
      targetType: 'artwork',
      timestamp: new Date(),
      data: { commentId: comment.id },
    });

    return comment;
  }

  public async shareArtwork(artworkId: string, message?: string): Promise<void> {
    const currentUser = profileSystem.getCurrentUser();
    if (!currentUser) return;

    // In a real app, this would create a share post
    // For now, we'll just track the share

    this.emitSocialEvent({
      type: 'share',
      actorId: currentUser.id,
      targetId: artworkId,
      targetType: 'artwork',
      timestamp: new Date(),
      data: { message },
    });

    const artwork = await portfolioManager.getArtwork(artworkId);
    if (artwork && artwork.userId !== currentUser.id) {
      this.sendNotification(artwork.userId, {
        type: 'artwork_shared',
        message: `${currentUser.displayName} shared your artwork`,
        actorId: currentUser.id,
        artworkId,
      });
    }
  }

  private async updateTrendingContent(): Promise<void> {
    try {
      // Get all public artworks
      const allArtworks = portfolioManager.getPublicArtworks();
      
      // Calculate trending score based on recent engagement
      const scoredArtworks = allArtworks.map(artwork => {
        const ageInDays = (Date.now() - artwork.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const engagementScore = artwork.likes + (artwork.comments.length * 2);
        const trendingScore = engagementScore / Math.pow(ageInDays + 1, 1.5);
        
        return { artwork, score: trendingScore };
      });

      // Sort by trending score
      scoredArtworks.sort((a, b) => b.score - a.score);
      
      // Update trending artworks
      this.trendingContent.artworks = scoredArtworks
        .slice(0, 10)
        .map(item => item.artwork);

      // Update trending artists (users with most engagement)
      const artistScores = new Map<string, number>();
      allArtworks.forEach(artwork => {
        const current = artistScores.get(artwork.userId) || 0;
        artistScores.set(artwork.userId, current + artwork.likes + artwork.comments.length);
      });

      this.trendingContent.artists = Array.from(artistScores.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([userId]) => userId);

      this.trendingContent.lastUpdated = new Date();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('TRENDING_UPDATE_ERROR', 'Failed to update trending content', 'low', error)
      );
    }
  }

  public getTrendingContent(): TrendingData {
    return { ...this.trendingContent };
  }

  public async discoverArtists(category?: string, limit: number = 20): Promise<User[]> {
    // Get all users (in production, this would be from a backend)
    const allUsers: User[] = []; // Would fetch from backend
    
    // For now, return trending artists
    const trendingUserIds = this.trendingContent.artists.slice(0, limit);
    const users: User[] = [];
    
    for (const userId of trendingUserIds) {
      const userData = await this.getUserData(userId);
      if (userData) {
        users.push(userData);
      }
    }
    
    return users;
  }

  public async searchUsers(query: string): Promise<User[]> {
    // In production, this would search backend
    // For now, return empty array
    return [];
  }

  public getEngagementStats(userId: string): EngagementStats {
    const artworks = portfolioManager.getUserArtworks(userId);
    
    let totalLikes = 0;
    let totalComments = 0;
    let totalViews = 0;
    
    artworks.forEach(artwork => {
      totalLikes += artwork.likes;
      totalComments += artwork.comments.length;
      totalViews += artwork.views;
    });
    
    return {
      totalLikes,
      totalComments,
      totalViews,
      followerCount: this.getFollowerCount(userId),
      followingCount: 0, // Would get from user data
      engagementRate: artworks.length > 0 
        ? ((totalLikes + totalComments) / totalViews) * 100 
        : 0,
    };
  }

  private async saveSocialGraph(): Promise<void> {
    const graphData: Record<string, string[]> = {};
    this.socialGraph.forEach((followers, userId) => {
      graphData[userId] = Array.from(followers);
    });
    await dataManager.set('social_graph', graphData);
  }

  private async getUserData(userId: string): Promise<User | null> {
    // In production, this would fetch from backend
    // For now, check if it's the current user
    const currentUser = profileSystem.getCurrentUser();
    if (currentUser?.id === userId) {
      return currentUser;
    }
    return null;
  }

  private sendNotification(userId: string, notification: any): void {
    // In production, this would send push notifications
    // For now, just log
    console.log('Notification for', userId, notification);
  }

  private emitSocialEvent(event: SocialEvent): void {
    this.socialListeners.forEach(listener => listener(event));
  }

  public subscribeToSocialEvents(callback: (event: SocialEvent) => void): () => void {
    this.socialListeners.add(callback);
    return () => this.socialListeners.delete(callback);
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public async getMutualFollowers(userId1: string, userId2: string): Promise<string[]> {
    const followers1 = new Set(this.getFollowers(userId1));
    const followers2 = new Set(this.getFollowers(userId2));
    
    const mutual: string[] = [];
    followers1.forEach(followerId => {
      if (followers2.has(followerId)) {
        mutual.push(followerId);
      }
    });
    
    return mutual;
  }

  public getSuggestedUsers(userId: string, limit: number = 5): string[] {
    // Suggest users based on mutual connections and interests
    const suggestions: Set<string> = new Set();
    const user = profileSystem.getCurrentUser();
    
    if (!user || user.id !== userId) return [];
    
    // Get followers of people you follow
    user.following.forEach(followedId => {
      const theirFollowers = this.getFollowers(followedId);
      theirFollowers.forEach(followerId => {
        if (followerId !== userId && !user.following.includes(followerId)) {
          suggestions.add(followerId);
        }
      });
    });
    
    // Add trending artists
    this.trendingContent.artists.forEach(artistId => {
      if (artistId !== userId && !user.following.includes(artistId)) {
        suggestions.add(artistId);
      }
    });
    
    return Array.from(suggestions).slice(0, limit);
  }
}

interface FeedItem {
  id: string;
  type: 'artwork' | 'achievement' | 'challenge' | 'trending';
  content: any;
  userId: string;
  timestamp: Date;
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

interface TrendingData {
  artworks: Artwork[];
  artists: string[];
  challenges: any[];
  lastUpdated: Date | null;
}

interface SocialEvent {
  type: 'follow' | 'unfollow' | 'like' | 'comment' | 'share';
  actorId: string;
  targetId: string;
  targetType?: 'user' | 'artwork' | 'challenge';
  timestamp: Date;
  data?: any;
}

interface EngagementStats {
  totalLikes: number;
  totalComments: number;
  totalViews: number;
  followerCount: number;
  followingCount: number;
  engagementRate: number;
}

// Export singleton instance
export const socialEngine = SocialEngine.getInstance();