import { Artwork, Layer, Dimensions } from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';
import { progressionSystem } from './ProgressionSystem';
import { profileSystem } from './ProfileSystem';

/**
 * Portfolio Manager - Handles artwork storage, organization, and sharing
 * Manages the user's creative portfolio with efficient storage and retrieval
 */
export class PortfolioManager {
  private static instance: PortfolioManager;
  private artworkCache: Map<string, Artwork> = new Map();
  private portfolioListeners: Set<(artworks: Artwork[]) => void> = new Set();
  
  private readonly MAX_ARTWORK_SIZE = 10 * 1024 * 1024; // 10MB per artwork
  private readonly THUMBNAIL_SIZE = { width: 400, height: 400 };
  
  private constructor() {
    this.loadArtworksFromStorage();
  }

  public static getInstance(): PortfolioManager {
    if (!PortfolioManager.instance) {
      PortfolioManager.instance = new PortfolioManager();
    }
    return PortfolioManager.instance;
  }

  private async loadArtworksFromStorage(): Promise<void> {
    try {
      const artworks = await dataManager.getAllArtworks();
      artworks.forEach(artwork => {
        this.artworkCache.set(artwork.id, artwork);
      });
      this.notifyListeners();
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('PORTFOLIO_LOAD_ERROR', 'Failed to load portfolio', 'medium', error)
      );
    }
  }

  public async createArtwork(params: {
    title: string;
    description?: string;
    layers: Layer[];
    dimensions: Dimensions;
    lessonId?: string;
    challengeId?: string;
    duration: number;
    tools: string[];
  }): Promise<Artwork> {
    const user = profileSystem.getCurrentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    const artwork: Artwork = {
      id: this.generateArtworkId(),
      userId: user.id,
      title: params.title,
      description: params.description,
      thumbnailUrl: '', // Will be generated
      fullImageUrl: '', // Will be generated
      lessonId: params.lessonId,
      challengeId: params.challengeId,
      layers: params.layers,
      dimensions: params.dimensions,
      createdAt: new Date(),
      updatedAt: new Date(),
      likes: 0,
      views: 0,
      comments: [],
      tags: this.generateTags(params),
      isPublic: false,
      tools: params.tools,
      duration: params.duration,
    };

    // Generate images
    await this.generateArtworkImages(artwork);

    // Save to storage
    await this.saveArtwork(artwork);

    // Update progression
    await progressionSystem.recordArtworkCreation(artwork.id);

    return artwork;
  }

  private async generateArtworkImages(artwork: Artwork): Promise<void> {
    // In a real implementation, this would:
    // 1. Flatten layers into a single image
    // 2. Generate thumbnail
    // 3. Save full resolution image
    // 4. Upload to cloud storage
    
    // For now, we'll use placeholder URLs
    artwork.thumbnailUrl = `thumbnail_${artwork.id}`;
    artwork.fullImageUrl = `full_${artwork.id}`;
  }

  private generateTags(params: any): string[] {
    const tags: string[] = [];
    
    // Add tool tags
    tags.push(...params.tools);
    
    // Add lesson/challenge tags
    if (params.lessonId) {
      tags.push('lesson-work');
    }
    if (params.challengeId) {
      tags.push('challenge-entry');
    }
    
    // Add time-based tags
    const minutes = Math.floor(params.duration / 60);
    if (minutes < 5) {
      tags.push('quick-sketch');
    } else if (minutes < 30) {
      tags.push('study');
    } else {
      tags.push('detailed-work');
    }
    
    return tags;
  }

  private async saveArtwork(artwork: Artwork): Promise<void> {
    // Validate size
    const size = this.estimateArtworkSize(artwork);
    if (size > this.MAX_ARTWORK_SIZE) {
      throw new Error('Artwork size exceeds maximum allowed');
    }

    // Add to cache
    this.artworkCache.set(artwork.id, artwork);

    // Save to storage
    await dataManager.saveArtwork(artwork.id, artwork);

    // Notify listeners
    this.notifyListeners();
  }

  private estimateArtworkSize(artwork: Artwork): number {
    // Rough estimation based on layers and dimensions
    let size = 0;
    artwork.layers.forEach(layer => {
      if (layer.type === 'raster') {
        // 4 bytes per pixel (RGBA)
        size += artwork.dimensions.width * artwork.dimensions.height * 4;
      }
    });
    return size;
  }

  public async updateArtwork(artworkId: string, updates: Partial<Artwork>): Promise<Artwork> {
    const artwork = await this.getArtwork(artworkId);
    if (!artwork) {
      throw new Error('Artwork not found');
    }

    const user = profileSystem.getCurrentUser();
    if (artwork.userId !== user?.id) {
      throw new Error('Unauthorized to update this artwork');
    }

    const updatedArtwork: Artwork = {
      ...artwork,
      ...updates,
      updatedAt: new Date(),
    };

    await this.saveArtwork(updatedArtwork);
    return updatedArtwork;
  }

  public async deleteArtwork(artworkId: string): Promise<void> {
    const artwork = await this.getArtwork(artworkId);
    if (!artwork) {
      throw new Error('Artwork not found');
    }

    const user = profileSystem.getCurrentUser();
    if (artwork.userId !== user?.id) {
      throw new Error('Unauthorized to delete this artwork');
    }

    // Remove from cache
    this.artworkCache.delete(artworkId);

    // Remove from storage
    const allArtworks = await dataManager.get<Record<string, Artwork>>('artworks') || {};
    delete allArtworks[artworkId];
    await dataManager.set('artworks', allArtworks);

    // Notify listeners
    this.notifyListeners();
  }

  public async getArtwork(artworkId: string): Promise<Artwork | null> {
    // Check cache first
    if (this.artworkCache.has(artworkId)) {
      return this.artworkCache.get(artworkId)!;
    }

    // Load from storage
    const artwork = await dataManager.getArtwork(artworkId);
    if (artwork) {
      this.artworkCache.set(artworkId, artwork);
    }
    return artwork;
  }

  public getUserArtworks(userId?: string): Artwork[] {
    const targetUserId = userId || profileSystem.getCurrentUser()?.id;
    if (!targetUserId) return [];

    return Array.from(this.artworkCache.values())
      .filter(artwork => artwork.userId === targetUserId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public getPublicArtworks(): Artwork[] {
    return Array.from(this.artworkCache.values())
      .filter(artwork => artwork.isPublic)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public getArtworksByLesson(lessonId: string): Artwork[] {
    return Array.from(this.artworkCache.values())
      .filter(artwork => artwork.lessonId === lessonId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public getArtworksByChallenge(challengeId: string): Artwork[] {
    return Array.from(this.artworkCache.values())
      .filter(artwork => artwork.challengeId === challengeId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  public async shareArtwork(artworkId: string): Promise<void> {
    const artwork = await this.getArtwork(artworkId);
    if (!artwork) {
      throw new Error('Artwork not found');
    }

    artwork.isPublic = true;
    await this.saveArtwork(artwork);

    // Update progression
    await progressionSystem.recordArtworkShared(artworkId);
  }

  public async unshareArtwork(artworkId: string): Promise<void> {
    const artwork = await this.getArtwork(artworkId);
    if (!artwork) {
      throw new Error('Artwork not found');
    }

    artwork.isPublic = false;
    await this.saveArtwork(artwork);
  }

  public async likeArtwork(artworkId: string): Promise<void> {
    const artwork = await this.getArtwork(artworkId);
    if (!artwork) {
      throw new Error('Artwork not found');
    }

    artwork.likes++;
    await this.saveArtwork(artwork);
  }

  public async viewArtwork(artworkId: string): Promise<void> {
    const artwork = await this.getArtwork(artworkId);
    if (!artwork) {
      throw new Error('Artwork not found');
    }

    artwork.views++;
    await this.saveArtwork(artwork);
  }

  public subscribeToPortfolio(callback: (artworks: Artwork[]) => void): () => void {
    this.portfolioListeners.add(callback);
    callback(this.getUserArtworks()); // Immediate callback
    return () => this.portfolioListeners.delete(callback);
  }

  private notifyListeners(): void {
    const artworks = this.getUserArtworks();
    this.portfolioListeners.forEach(callback => callback(artworks));
  }

  private generateArtworkId(): string {
    return `artwork_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Analytics and statistics
  public getPortfolioStats(userId?: string): {
    totalArtworks: number;
    publicArtworks: number;
    totalLikes: number;
    totalViews: number;
    averageTimeSpent: number;
    mostUsedTools: string[];
    favoriteTime: string;
  } {
    const artworks = this.getUserArtworks(userId);
    
    if (artworks.length === 0) {
      return {
        totalArtworks: 0,
        publicArtworks: 0,
        totalLikes: 0,
        totalViews: 0,
        averageTimeSpent: 0,
        mostUsedTools: [],
        favoriteTime: 'Unknown',
      };
    }

    const stats = {
      totalArtworks: artworks.length,
      publicArtworks: artworks.filter(a => a.isPublic).length,
      totalLikes: artworks.reduce((sum, a) => sum + a.likes, 0),
      totalViews: artworks.reduce((sum, a) => sum + a.views, 0),
      averageTimeSpent: artworks.reduce((sum, a) => sum + a.duration, 0) / artworks.length,
      mostUsedTools: this.getMostUsedTools(artworks),
      favoriteTime: this.getFavoriteDrawingTime(artworks),
    };

    return stats;
  }

  private getMostUsedTools(artworks: Artwork[]): string[] {
    const toolCounts = new Map<string, number>();
    
    artworks.forEach(artwork => {
      artwork.tools.forEach(tool => {
        toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
      });
    });

    return Array.from(toolCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tool]) => tool);
  }

  private getFavoriteDrawingTime(artworks: Artwork[]): string {
    const hourCounts = new Array(24).fill(0);
    
    artworks.forEach(artwork => {
      const hour = new Date(artwork.createdAt).getHours();
      hourCounts[hour]++;
    });

    const favoriteHour = hourCounts.indexOf(Math.max(...hourCounts));
    
    if (favoriteHour >= 5 && favoriteHour < 12) {
      return 'Morning';
    } else if (favoriteHour >= 12 && favoriteHour < 17) {
      return 'Afternoon';
    } else if (favoriteHour >= 17 && favoriteHour < 21) {
      return 'Evening';
    } else {
      return 'Night';
    }
  }

  public async exportPortfolio(): Promise<any> {
    const user = profileSystem.getCurrentUser();
    if (!user) {
      throw new Error('No user logged in');
    }

    const artworks = this.getUserArtworks();
    const stats = this.getPortfolioStats();

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        level: user.level,
      },
      artworks: artworks.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description,
        createdAt: a.createdAt,
        duration: a.duration,
        tools: a.tools,
        tags: a.tags,
        likes: a.likes,
        views: a.views,
      })),
      stats,
      exportedAt: new Date(),
    };
  }
}

// Export singleton instance
export const portfolioManager = PortfolioManager.getInstance();