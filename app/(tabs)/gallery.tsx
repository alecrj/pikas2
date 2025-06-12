import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Dimensions,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { challengeSystem } from '../../src/engines/community/ChallengeSystem';
import { portfolioManager } from '../../src/engines/user/PortfolioManager';
import { Artwork, Challenge, Collection } from '../../src/types';
import {
  Image as ImageIcon,
  Plus,
  Grid,
  List,
  Search,
  Filter,
  Heart,
  Eye,
  Share2,
  Trophy,
  Calendar,
  Clock,
  Users,
  Star,
  Layers,
  Palette,
  Download,
  Edit3,
  Trash2,
  Folder,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

type ViewMode = 'grid' | 'list';
type FilterType = 'all' | 'public' | 'private' | 'recent' | 'liked' | 'challenges';

export default function GalleryScreen() {
  const theme = useTheme();
  const { user, portfolio } = useUserProgress();
  
  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [showCreateCollection, setShowCreateCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  
  // Data state
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [portfolioStats, setPortfolioStats] = useState<any>(null);
  const [featuredArtworks, setFeaturedArtworks] = useState<Artwork[]>([]);
  
  const styles = createStyles(theme);

  // Load portfolio data
  useEffect(() => {
    loadPortfolioData();
  }, [user]);

  const loadPortfolioData = useCallback(async () => {
    if (!user) return;

    try {
      // Load user's artworks
      const userArtworks = portfolioManager.getUserArtworks(user.id);
      setArtworks(userArtworks);

      // Load portfolio stats
      const stats = portfolioManager.getPortfolioStats(user.id);
      setPortfolioStats(stats);

      // Load collections
      const userPortfolio = portfolioManager.getUserPortfolio(user.id);
      if (userPortfolio) {
        setCollections(userPortfolio.collections);
      }

      // Load featured artworks
      const featured = portfolioManager.getFeaturedArtworks(6);
      setFeaturedArtworks(featured);

      // Load active challenges
      const activeChallenges = challengeSystem.getAllActiveChallenges();
      setChallenges(activeChallenges.slice(0, 3));

    } catch (error) {
      console.error('Failed to load portfolio data:', error);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPortfolioData();
    setRefreshing(false);
  }, [loadPortfolioData]);

  const filteredArtworks = artworks.filter(artwork => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = artwork.title.toLowerCase().includes(query);
      const matchesTags = artwork.tags.some(tag => tag.toLowerCase().includes(query));
      if (!matchesTitle && !matchesTags) return false;
    }

    // Apply type filter
    switch (filterType) {
      case 'public':
        return artwork.visibility === 'public';
      case 'private':
        return artwork.visibility === 'private';
      case 'recent':
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return artwork.createdAt > weekAgo;
      case 'liked':
        return artwork.stats.likes > 0;
      case 'challenges':
        return !!artwork.challengeId;
      default:
        return true;
    }
  });

  const handleArtworkPress = (artwork: Artwork) => {
    setSelectedArtwork(artwork);
  };

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;

    try {
      await portfolioManager.createCollection(user.id, {
        name: newCollectionName.trim(),
        artworkIds: [],
        visibility: 'private',
      });

      setNewCollectionName('');
      setShowCreateCollection(false);
      await loadPortfolioData();
    } catch (error) {
      Alert.alert('Error', 'Failed to create collection');
    }
  };

  const renderPortfolioStats = () => {
    if (!portfolioStats) return null;

    return (
      <Animated.View entering={FadeInUp.delay(100)} style={styles.statsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Portfolio Overview
        </Text>
        
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <ImageIcon size={24} color={theme.colors.primary} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {portfolioStats.totalArtworks}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Artworks
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Heart size={24} color={theme.colors.error} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {portfolioStats.totalLikes}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Likes
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <Eye size={24} color={theme.colors.info} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {portfolioStats.totalViews}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Views
            </Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
            <TrendingUp size={24} color={theme.colors.success} />
            <Text style={[styles.statNumber, { color: theme.colors.text }]}>
              {Math.round(portfolioStats.averageTimeSpent)}m
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Avg Time
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderActiveChallenges = () => {
    if (challenges.length === 0) return null;

    return (
      <Animated.View entering={FadeInUp.delay(200)} style={styles.challengesSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Active Challenges
          </Text>
          <Pressable style={styles.seeAllButton}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              See All
            </Text>
            <ArrowRight size={16} color={theme.colors.primary} />
          </Pressable>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {challenges.map((challenge) => (
            <Pressable
              key={challenge.id}
              style={[styles.challengeCard, { backgroundColor: theme.colors.surface }]}
            >
              <View style={styles.challengeHeader}>
                <Trophy size={20} color={theme.colors.warning} />
                <Text style={[styles.challengeType, { color: theme.colors.textSecondary }]}>
                  {challenge.type}
                </Text>
              </View>
              
              <Text style={[styles.challengeTitle, { color: theme.colors.text }]}>
                {challenge.title}
              </Text>
              
              <Text style={[styles.challengeDescription, { color: theme.colors.textSecondary }]}>
                {challenge.description}
              </Text>
              
              <View style={styles.challengeFooter}>
                <View style={styles.challengeInfo}>
                  <Users size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.challengeParticipants, { color: theme.colors.textSecondary }]}>
                    {challenge.participants}
                  </Text>
                </View>
                
                <View style={styles.challengeInfo}>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.challengeTime, { color: theme.colors.textSecondary }]}>
                    {Math.ceil((challenge.endDate - Date.now()) / (24 * 60 * 60 * 1000))}d left
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderCollections = () => {
    if (collections.length === 0) return null;

    return (
      <Animated.View entering={FadeInUp.delay(300)} style={styles.collectionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Collections
          </Text>
          <Pressable
            style={styles.addButton}
            onPress={() => setShowCreateCollection(true)}
          >
            <Plus size={20} color={theme.colors.primary} />
          </Pressable>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {collections.map((collection) => (
            <Pressable
              key={collection.id}
              style={[styles.collectionCard, { backgroundColor: theme.colors.surface }]}
            >
              <View style={[styles.collectionThumbnail, { backgroundColor: theme.colors.background }]}>
                <Folder size={32} color={theme.colors.textSecondary} />
              </View>
              
              <Text style={[styles.collectionName, { color: theme.colors.text }]}>
                {collection.name}
              </Text>
              
              <Text style={[styles.collectionCount, { color: theme.colors.textSecondary }]}>
                {collection.artworkIds.length} items
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    );
  };

  const renderToolbar = () => (
    <View style={[styles.toolbar, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.text }]}
          placeholder="Search artworks..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      <View style={styles.toolbarActions}>
        <Pressable
          style={[styles.filterButton, filterType !== 'all' && styles.filterButtonActive]}
          onPress={() => {
            // Cycle through filter types
            const filters: FilterType[] = ['all', 'public', 'private', 'recent', 'liked', 'challenges'];
            const currentIndex = filters.indexOf(filterType);
            const nextIndex = (currentIndex + 1) % filters.length;
            setFilterType(filters[nextIndex]);
          }}
        >
          <Filter size={20} color={theme.colors.text} />
        </Pressable>
        
        <Pressable
          style={styles.viewModeButton}
          onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
        >
          {viewMode === 'grid' ? (
            <List size={20} color={theme.colors.text} />
          ) : (
            <Grid size={20} color={theme.colors.text} />
          )}
        </Pressable>
      </View>
    </View>
  );

  const renderArtworkGrid = () => (
    <View style={styles.artworkGrid}>
      {filteredArtworks.map((artwork, index) => (
        <Animated.View
          key={artwork.id}
          entering={FadeInUp.delay(index * 50)}
          style={styles.gridItemContainer}
        >
          <Pressable
            style={[styles.artworkGridItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleArtworkPress(artwork)}
          >
            <View style={[styles.artworkThumbnail, { backgroundColor: theme.colors.background }]}>
              <ImageIcon size={24} color={theme.colors.textSecondary} />
            </View>
            
            <View style={styles.artworkInfo}>
              <Text style={[styles.artworkTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {artwork.title}
              </Text>
              
              <View style={styles.artworkStats}>
                <View style={styles.statItem}>
                  <Heart size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {artwork.stats.likes}
                  </Text>
                </View>
                
                <View style={styles.statItem}>
                  <Eye size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {artwork.stats.views}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );

  const renderArtworkList = () => (
    <View style={styles.artworkList}>
      {filteredArtworks.map((artwork, index) => (
        <Animated.View
          key={artwork.id}
          entering={FadeInUp.delay(index * 50)}
        >
          <Pressable
            style={[styles.artworkListItem, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleArtworkPress(artwork)}
          >
            <View style={[styles.listItemThumbnail, { backgroundColor: theme.colors.background }]}>
              <ImageIcon size={20} color={theme.colors.textSecondary} />
            </View>
            
            <View style={styles.listItemInfo}>
              <Text style={[styles.listItemTitle, { color: theme.colors.text }]}>
                {artwork.title}
              </Text>
              
              <Text style={[styles.listItemDescription, { color: theme.colors.textSecondary }]}>
                {artwork.description || 'No description'}
              </Text>
              
              <View style={styles.listItemMeta}>
                <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                  {new Date(artwork.createdAt).toLocaleDateString()}
                </Text>
                
                <View style={styles.listItemStats}>
                  <Heart size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {artwork.stats.likes}
                  </Text>
                  
                  <Eye size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                    {artwork.stats.views}
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </View>
  );

  const renderCreateCollectionModal = () => (
    <Modal
      visible={showCreateCollection}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCreateCollection(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Create Collection
          </Text>
          
          <TextInput
            style={[styles.modalInput, { 
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              borderColor: theme.colors.border,
            }]}
            placeholder="Collection name"
            placeholderTextColor={theme.colors.textSecondary}
            value={newCollectionName}
            onChangeText={setNewCollectionName}
            autoFocus
          />
          
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowCreateCollection(false)}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.modalButton, styles.createButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleCreateCollection}
            >
              <Text style={[styles.buttonText, { color: theme.colors.surface }]}>
                Create
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyState}>
          <ImageIcon size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
            Sign in to view your portfolio
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {renderPortfolioStats()}
        {renderActiveChallenges()}
        {renderCollections()}
        
        <View style={styles.artworksSection}>
          {renderToolbar()}
          
          {filteredArtworks.length === 0 ? (
            <View style={styles.emptyState}>
              <ImageIcon size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
                No artworks found
              </Text>
              <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
                {searchQuery || filterType !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start creating to build your portfolio'
                }
              </Text>
            </View>
          ) : (
            viewMode === 'grid' ? renderArtworkGrid() : renderArtworkList()
          )}
        </View>
      </ScrollView>
      
      {renderCreateCollectionModal()}
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  challengesSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  collectionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  addButton: {
    padding: 8,
  },
  challengeCard: {
    width: 280,
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeType: {
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginLeft: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeParticipants: {
    fontSize: 12,
    marginLeft: 4,
  },
  challengeTime: {
    fontSize: 12,
    marginLeft: 4,
  },
  collectionCard: {
    width: 120,
    padding: 12,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
  },
  collectionThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  collectionName: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  collectionCount: {
    fontSize: 12,
    textAlign: 'center',
  },
  artworksSection: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingLeft: 8,
  },
  toolbarActions: {
    flexDirection: 'row',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  viewModeButton: {
    padding: 8,
  },
  artworkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
  },
  gridItemContainer: {
    width: (screenWidth - 48) / 2,
    marginBottom: 16,
    marginRight: 16,
  },
  artworkGridItem: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  artworkThumbnail: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  artworkInfo: {
    padding: 12,
  },
  artworkTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  artworkStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  artworkList: {
    padding: 16,
  },
  artworkListItem: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  listItemThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  listItemDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  listItemMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
  },
  listItemStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 8,
  },
  createButton: {
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});