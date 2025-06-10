import { Artwork, Layer, Collection } from '../../types';
import { EventBus } from '../core/EventBus';
import { errorHandler } from '../core/ErrorHandler';
import { dataManager } from '../core/DataManager';

interface Portfolio {
  id: string;
  userId: string;
  artworks: Artwork[];
  collections: Collection[];
  stats: {
    totalArtworks: number;
    publicArtworks: number;
    totalLikes: number;
    totalViews: number;
    averageTimeSpent: number;
  };
  settings: {
    publicProfile: boolean;
    showProgress: boolean;
    allowComments: boolean;
  };
}

/**
 * Portfolio Manager - Manages user artwork collections and galleries
 * Handles artwork storage, organization, and portfolio analytics
 */
export class PortfolioManager {
  private static instance: PortfolioManager;
  private eventBus: EventBus = EventBus.getInstance();
  
  // Portfolio storage
  private portfolios: Map<string, Portfolio> = new Map();
  private artworks: Map<string, Artwork> = new Map();
  
  // Analytics
  private artworkAnalytics: Map<string, {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    averageViewTime: number;
  }> = new Map();
  
  private constructor() {
    this.loadPortfolios();
  }

  public static getInstance(): PortfolioManager {
    if (!PortfolioManager.instance) {
      PortfolioManager.instance = new PortfolioManager();
    }
    return PortfolioManager.instance;
  }

  // ---- PUBLIC API ----

  public createPortfolio(userId: string): Portfolio {
    const portfolio: Portfolio = {
      id: `portfolio_${userId}`,
      userId,
      artworks: [],
      collections: [],
      stats: {
        totalArtworks: 0,
        publicArtworks: 0,
        totalLikes: 0,
        totalViews: 0,
        averageTimeSpent: 0,
      },
      settings: {
        publicProfile: true,
        showProgress: true,
        allowComments: true,
      },
    };
    
    this.portfolios.set(userId, portfolio);
    this.savePortfolios();
    
    this.eventBus.emit('portfolio:created', { portfolio });
    return portfolio;
  }

  public getUserPortfolio(userId: string): Portfolio | null {
    return this.portfolios.get(userId) || null;
  }

  public addArtwork(userId: string, artworkData: Omit<Artwork, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Artwork {
    const portfolio = this.portfolios.get(userId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const artwork: Artwork = {
      ...artworkData,
      id: `artwork_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: artworkData.stats || {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
      },
      metadata: artworkData.metadata || {
        drawingTime: 0,
        strokeCount: 0,
        layersUsed: 0,
        brushesUsed: [],
        canvasSize: { width: 1024, height: 768 },
      },
    };

    // Generate thumbnail
    artwork.thumbnail = artwork.thumbnail || `thumbnail_${artwork.id}`;
    artwork.imageUrl = artwork.imageUrl || `full_${artwork.id}`;

    // Store artwork
    this.artworks.set(artwork.id, artwork);
    portfolio.artworks.push(artwork);
    
    // Update portfolio stats
    portfolio.stats.totalArtworks++;
    if (artwork.visibility === 'public') {
      portfolio.stats.publicArtworks++;
    }

    // Initialize analytics
    this.artworkAnalytics.set(artwork.id, {
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      averageViewTime: 0,
    });

    this.savePortfolios();
    this.eventBus.emit('artwork:created', { artwork, userId });

    return artwork;
  }

  public updateArtwork(artworkId: string, updates: Partial<Artwork>): Artwork | null {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return null;

    // Update artwork
    Object.assign(artwork, updates, {
      updatedAt: Date.now(),
    });

    // Update portfolio stats if visibility changed
    if (updates.visibility) {
      const portfolio = this.portfolios.get(artwork.userId);
      if (portfolio) {
        const wasPublic = artwork.visibility === 'public';
        const isPublic = updates.visibility === 'public';
        
        if (wasPublic && !isPublic) {
          portfolio.stats.publicArtworks--;
        } else if (!wasPublic && isPublic) {
          portfolio.stats.publicArtworks++;
        }
      }
    }

    this.savePortfolios();
    this.eventBus.emit('artwork:updated', { artwork });

    return artwork;
  }

  public deleteArtwork(artworkId: string): boolean {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return false;

    const portfolio = this.portfolios.get(artwork.userId);
    if (!portfolio) return false;

    // Remove from portfolio
    portfolio.artworks = portfolio.artworks.filter(a => a.id !== artworkId);
    
    // Update stats
    portfolio.stats.totalArtworks--;
    if (artwork.visibility === 'public') {
      portfolio.stats.publicArtworks--;
    }

    // Remove from storage
    this.artworks.delete(artworkId);
    this.artworkAnalytics.delete(artworkId);

    // Remove from collections
    portfolio.collections.forEach(collection => {
      collection.artworkIds = collection.artworkIds.filter(id => id !== artworkId);
    });

    this.savePortfolios();
    this.eventBus.emit('artwork:deleted', { artworkId, userId: artwork.userId });

    return true;
  }

  public getArtwork(artworkId: string): Artwork | null {
    return this.artworks.get(artworkId) || null;
  }

  public getUserArtworks(userId: string): Artwork[] {
    const portfolio = this.portfolios.get(userId);
    return portfolio ? portfolio.artworks : [];
  }

  public getRecentArtworks(userId: string, limit: number = 10): Artwork[] {
    const artworks = this.getUserArtworks(userId);
    return artworks
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  public getPublicArtworks(userId: string): Artwork[] {
    const artworks = this.getUserArtworks(userId);
    return artworks
      .filter(artwork => artwork.visibility === 'public')
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public getFeaturedArtworks(limit: number = 10): Artwork[] {
    const allArtworks = Array.from(this.artworks.values());
    return allArtworks
      .filter(artwork => artwork.featured && artwork.visibility === 'public')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  }

  public getArtworksByChallenge(challengeId: string): Artwork[] {
    const allArtworks = Array.from(this.artworks.values());
    return allArtworks
      .filter(artwork => artwork.challengeId === challengeId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  public makeArtworkPublic(artworkId: string): boolean {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return false;

    artwork.visibility = 'public';
    this.updateArtwork(artworkId, { visibility: 'public' });
    
    this.eventBus.emit('artwork:public', { artwork });
    return true;
  }

  public makeArtworkPrivate(artworkId: string): boolean {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return false;

    artwork.visibility = 'private';
    this.updateArtwork(artworkId, { visibility: 'private' });
    
    this.eventBus.emit('artwork:private', { artwork });
    return true;
  }

  public recordArtworkView(artworkId: string, userId: string): void {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return;

    const analytics = this.artworkAnalytics.get(artworkId);
    if (analytics) {
      analytics.views++;
      artwork.stats.views++;
    }

    this.eventBus.emit('artwork:viewed', { artworkId, userId });
  }

  public recordArtworkLike(artworkId: string, userId: string): void {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return;

    const analytics = this.artworkAnalytics.get(artworkId);
    if (analytics) {
      analytics.likes++;
      artwork.stats.likes++;
    }

    const portfolio = this.portfolios.get(artwork.userId);
    if (portfolio) {
      portfolio.stats.totalLikes++;
    }

    this.eventBus.emit('artwork:liked', { artworkId, userId });
  }

  public createCollection(userId: string, collectionData: Omit<Collection, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Collection {
    const portfolio = this.portfolios.get(userId);
    if (!portfolio) {
      throw new Error('Portfolio not found');
    }

    const collection: Collection = {
      ...collectionData,
      id: `collection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    portfolio.collections.push(collection);
    
    this.savePortfolios();
    this.eventBus.emit('collection:created', { collection });

    return collection;
  }

  public updateCollection(collectionId: string, updates: Partial<Collection>): Collection | null {
    for (const portfolio of this.portfolios.values()) {
      const collection = portfolio.collections.find(c => c.id === collectionId);
      if (collection) {
        Object.assign(collection, updates, {
          updatedAt: Date.now(),
        });
        
        this.savePortfolios();
        this.eventBus.emit('collection:updated', { collection });
        return collection;
      }
    }
    return null;
  }

  public deleteCollection(collectionId: string): boolean {
    for (const portfolio of this.portfolios.values()) {
      const index = portfolio.collections.findIndex(c => c.id === collectionId);
      if (index !== -1) {
        const [collection] = portfolio.collections.splice(index, 1);
        
        this.savePortfolios();
        this.eventBus.emit('collection:deleted', { collectionId });
        return true;
      }
    }
    return false;
  }

  public addToCollection(collectionId: string, artworkId: string): boolean {
    const artwork = this.artworks.get(artworkId);
    if (!artwork) return false;

    for (const portfolio of this.portfolios.values()) {
      const collection = portfolio.collections.find(c => c.id === collectionId);
      if (collection && collection.userId === artwork.userId) {
        if (!collection.artworkIds.includes(artworkId)) {
          collection.artworkIds.push(artworkId);
          collection.updatedAt = Date.now();
          
          this.savePortfolios();
          this.eventBus.emit('collection:artwork_added', { collectionId, artworkId });
          return true;
        }
      }
    }
    return false;
  }

  public removeFromCollection(collectionId: string, artworkId: string): boolean {
    for (const portfolio of this.portfolios.values()) {
      const collection = portfolio.collections.find(c => c.id === collectionId);
      if (collection) {
        const index = collection.artworkIds.indexOf(artworkId);
        if (index !== -1) {
          collection.artworkIds.splice(index, 1);
          collection.updatedAt = Date.now();
          
          this.savePortfolios();
          this.eventBus.emit('collection:artwork_removed', { collectionId, artworkId });
          return true;
        }
      }
    }
    return false;
  }

  public getPortfolioStats(userId: string): {
    totalArtworks: number;
    publicArtworks: number;
    totalLikes: number;
    totalViews: number;
    averageTimeSpent: number;
    mostUsedBrushes: string[];
    favoriteColors: string[];
    skillProgression: any[];
  } {
    const portfolio = this.portfolios.get(userId);
    if (!portfolio) {
      return {
        totalArtworks: 0,
        publicArtworks: 0,
        totalLikes: 0,
        totalViews: 0,
        averageTimeSpent: 0,
        mostUsedBrushes: [],
        favoriteColors: [],
        skillProgression: [],
      };
    }

    const artworks = portfolio.artworks;
    
    // Calculate total stats
    const stats = {
      ...portfolio.stats,
      mostUsedBrushes: this.getMostUsedBrushes(artworks),
      favoriteColors: this.getFavoriteColors(artworks),
      skillProgression: this.getSkillProgression(artworks),
    };

    return stats;
  }

  private getMostUsedBrushes(artworks: Artwork[]): string[] {
    const brushCount = new Map<string, number>();
    
    artworks.forEach(artwork => {
      artwork.metadata.brushesUsed.forEach(brush => {
        const count = brushCount.get(brush) || 0;
        brushCount.set(brush, count + 1);
      });
    });

    return Array.from(brushCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([brush]) => brush);
  }

  private getFavoriteColors(artworks: Artwork[]): string[] {
    const colorCount = new Map<string, number>();
    
    artworks.forEach(artwork => {
      // This would analyze drawing data for most used colors
      // For now, return empty array
    });

    return Array.from(colorCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);
  }

  private getSkillProgression(artworks: Artwork[]): any[] {
    // Analyze artworks over time to show skill progression
    const monthlyProgress = new Map<string, {
      count: number;
      avgComplexity: number;
      avgTimeSpent: number;
    }>();

    artworks.forEach(artwork => {
      const month = new Date(artwork.createdAt).toISOString().substring(0, 7);
      const current = monthlyProgress.get(month) || {
        count: 0,
        avgComplexity: 0,
        avgTimeSpent: 0,
      };

      current.count++;
      current.avgTimeSpent = (current.avgTimeSpent * (current.count - 1) + artwork.metadata.drawingTime) / current.count;
      // Calculate complexity based on layers, strokes, etc.
      const complexity = artwork.metadata.layersUsed * 2 + artwork.metadata.strokeCount / 100;
      current.avgComplexity = (current.avgComplexity * (current.count - 1) + complexity) / current.count;

      monthlyProgress.set(month, current);
    });

    return Array.from(monthlyProgress.entries())
      .map(([month, data]) => ({
        month,
        artworksCreated: data.count,
        averageComplexity: data.avgComplexity,
        averageTimeSpent: data.avgTimeSpent,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  }

  public exportPortfolioData(userId: string): {
    user: string;
    exportDate: number;
    portfolio: Portfolio | null;
    artworks: Artwork[];
    analytics: any;
  } {
    const portfolio = this.portfolios.get(userId);
    const userArtworks = this.getUserArtworks(userId);
    
    const analytics = userArtworks.map(a => ({
      artworkId: a.id,
      title: a.title,
      createdAt: a.createdAt,
      stats: a.stats,
      metadata: a.metadata,
    }));

    return {
      user: userId,
      exportDate: Date.now(),
      portfolio,
      artworks: userArtworks,
      analytics,
    };
  }

  // ---- PRIVATE METHODS ----

  private async loadPortfolios(): Promise<void> {
    try {
      const savedPortfolios = await dataManager.get<Record<string, Portfolio>>('portfolios');
      if (savedPortfolios) {
        Object.entries(savedPortfolios).forEach(([userId, portfolio]) => {
          this.portfolios.set(userId, portfolio);
          
          // Rebuild artwork map
          portfolio.artworks.forEach(artwork => {
            this.artworks.set(artwork.id, artwork);
          });
        });
      }

      const savedAnalytics = await dataManager.get<any>('artwork_analytics');
      if (savedAnalytics) {
        Object.entries(savedAnalytics).forEach(([artworkId, analytics]) => {
          this.artworkAnalytics.set(artworkId, analytics as any);
        });
      }
    } catch (error) {
      console.error('Failed to load portfolios:', error);
    }
  }

  private async savePortfolios(): Promise<void> {
    try {
      const portfoliosObj: Record<string, Portfolio> = {};
      this.portfolios.forEach((portfolio, userId) => {
        portfoliosObj[userId] = portfolio;
      });
      await dataManager.set('portfolios', portfoliosObj);

      const analyticsObj: Record<string, any> = {};
      this.artworkAnalytics.forEach((analytics, artworkId) => {
        analyticsObj[artworkId] = analytics;
      });
      await dataManager.set('artwork_analytics', analyticsObj);
    } catch (error) {
      console.error('Failed to save portfolios:', error);
    }
  }
}

// Export singleton instance
export const portfolioManager = PortfolioManager.getInstance();