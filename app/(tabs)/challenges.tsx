import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { challengeSystem } from '../../src/engines/community/ChallengeSystem';
import { portfolioManager } from '../../src/engines/user/PortfolioManager';
import { Challenge, ChallengeSubmission, Artwork } from '../../src/types';
import {
  Trophy,
  Calendar,
  Clock,
  Users,
  Star,
  Heart,
  Eye,
  Share2,
  Plus,
  Image as ImageIcon,
  Award,
  Target,
  Zap,
  Crown,
  Medal,
  ChevronRight,
  Upload,
  Filter,
  TrendingUp,
  Fire,
} from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

type ChallengeFilter = 'all' | 'active' | 'upcoming' | 'completed';

export default function ChallengesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { user, addXP, updateLearningStats } = useUserProgress();
  
  // State management
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userSubmissions, setUserSubmissions] = useState<ChallengeSubmission[]>([]);
  const [filterType, setFilterType] = useState<ChallengeFilter>('active');
  const [refreshing, setRefreshing] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionDescription, setSubmissionDescription] = useState('');
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [featuredSubmissions, setFeaturedSubmissions] = useState<any[]>([]);
  
  const styles = createStyles(theme);

  // Load challenges data
  useEffect(() => {
    loadChallengesData();
  }, []);

  const loadChallengesData = useCallback(async () => {
    try {
      // Load all challenges
      const allChallenges = challengeSystem.getAllActiveChallenges();
      const pastChallenges = challengeSystem.getPastChallenges(5);
      
      // Combine and sort challenges
      const combinedChallenges = [...allChallenges, ...pastChallenges]
        .sort((a, b) => b.startDate - a.startDate);
      
      setChallenges(combinedChallenges);

      // Load user submissions if logged in
      if (user) {
        const submissions = challengeSystem.getUserSubmissions(user.id);
        setUserSubmissions(submissions);
      }

      // Load leaderboards for active challenges
      const leaderboardData = allChallenges.map(challenge => ({
        challengeId: challenge.id,
        leaderboard: challengeSystem.getChallengeLeaderboard(challenge.id),
      }));
      setLeaderboards(leaderboardData);

      // Load featured submissions
      const featured = allChallenges.flatMap(challenge => 
        challenge.submissions.filter(sub => sub.featured).slice(0, 2)
      );
      setFeaturedSubmissions(featured);

    } catch (error) {
      console.error('Failed to load challenges data:', error);
    }
  }, [user]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadChallengesData();
    setRefreshing(false);
  }, [loadChallengesData]);

  // Create sample active challenges if none exist
  useEffect(() => {
    if (challenges.length === 0) {
      createSampleChallenges();
    }
  }, []);

  const createSampleChallenges = () => {
    // Create daily challenge
    const dailyChallenge = challengeSystem.createDailyChallenge();
    
    // Create weekly challenge
    const weeklyChallenge = challengeSystem.createWeeklyChallenge();
    
    // Create special challenge
    challengeSystem.createSpecialChallenge(
      'Community Art Jam',
      'Collaboration',
      'Create an artwork that represents community and togetherness',
      7,
      {
        xp: 500,
        achievements: ['community_artist'],
        badges: ['collaborative_spirit'],
      }
    );

    // Reload data
    loadChallengesData();
  };

  const filteredChallenges = challenges.filter(challenge => {
    const now = Date.now();
    
    switch (filterType) {
      case 'active':
        return now >= challenge.startDate && now < challenge.endDate;
      case 'upcoming':
        return now < challenge.startDate;
      case 'completed':
        return now >= challenge.endDate;
      default:
        return true;
    }
  });

  const handleJoinChallenge = async (challenge: Challenge) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to join challenges');
      return;
    }

    setSelectedChallenge(challenge);
    setShowSubmitModal(true);
  };

  const handleSubmitArtwork = async () => {
    if (!selectedChallenge || !user || !submissionTitle.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      // Create artwork entry
      const artwork: Omit<Artwork, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
        title: submissionTitle.trim(),
        description: submissionDescription.trim(),
        tags: [selectedChallenge.theme, selectedChallenge.type],
        lessonId: undefined,
        skillTree: undefined,
        drawingData: {} as any, // Would be actual drawing data
        thumbnail: `thumbnail_${Date.now()}`,
        imageUrl: `artwork_${Date.now()}`,
        stats: { views: 0, likes: 0, comments: 0, shares: 0 },
        metadata: {
          drawingTime: 600, // 10 minutes
          strokeCount: 150,
          layersUsed: 2,
          brushesUsed: ['pencil-2b', 'watercolor'],
          canvasSize: { width: 1024, height: 768 },
        },
        visibility: 'public',
        featured: false,
      };

      // Save artwork to portfolio
      const artworkId = await portfolioManager.addArtwork(user.id, artwork);
      
      // Get the saved artwork
      const savedArtwork = portfolioManager.getArtwork(artworkId);
      
      if (savedArtwork) {
        // Submit to challenge
        const success = challengeSystem.submitArtwork(selectedChallenge.id, savedArtwork, user.id);
        
        if (success) {
          // Award XP and update stats
          addXP(selectedChallenge.rewards.xp);
          updateLearningStats('challenges', { challengesCompleted: 1 });
          
          Alert.alert('Success!', 'Your artwork has been submitted to the challenge');
          
          // Reset form and close modal
          setSubmissionTitle('');
          setSubmissionDescription('');
          setShowSubmitModal(false);
          setSelectedChallenge(null);
          
          // Reload data
          await loadChallengesData();
        } else {
          Alert.alert('Error', 'Failed to submit to challenge');
        }
      }
      
    } catch (error) {
      console.error('Submit artwork error:', error);
      Alert.alert('Error', 'Failed to submit artwork');
    }
  };

  const handleVoteSubmission = async (submissionId: string) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to vote');
      return;
    }

    const success = challengeSystem.voteForSubmission(submissionId, user.id);
    
    if (success) {
      Alert.alert('Vote Recorded', 'Thank you for voting!');
      await loadChallengesData();
    } else {
      Alert.alert('Unable to Vote', 'You may have already voted for this submission');
    }
  };

  const getTimeRemaining = (endDate: number): string => {
    const now = Date.now();
    const remaining = endDate - now;
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
    const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {(['all', 'active', 'upcoming', 'completed'] as ChallengeFilter[]).map(filter => (
        <Pressable
          key={filter}
          style={[
            styles.filterTab,
            filterType === filter && { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => setFilterType(filter)}
        >
          <Text
            style={[
              styles.filterTabText,
              {
                color: filterType === filter ? theme.colors.surface : theme.colors.text,
              },
            ]}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  const renderFeaturedChallenges = () => {
    const featuredChallenges = filteredChallenges.filter(c => c.featured).slice(0, 2);
    
    if (featuredChallenges.length === 0) return null;

    return (
      <Animated.View entering={FadeInUp.delay(100)} style={styles.featuredSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Featured Challenges
        </Text>
        
        {featuredChallenges.map((challenge) => (
          <Pressable
            key={challenge.id}
            style={[styles.featuredCard, { backgroundColor: theme.colors.surface }]}
            onPress={() => handleJoinChallenge(challenge)}
          >
            <View style={styles.featuredHeader}>
              <View style={styles.challengeTypeContainer}>
                <Trophy size={16} color={theme.colors.warning} />
                <Text style={[styles.challengeType, { color: theme.colors.warning }]}>
                  {challenge.type.toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.prizeContainer}>
                <Star size={14} color={theme.colors.primary} />
                <Text style={[styles.prizeText, { color: theme.colors.primary }]}>
                  {challenge.rewards.xp} XP
                </Text>
              </View>
            </View>
            
            <Text style={[styles.featuredTitle, { color: theme.colors.text }]}>
              {challenge.title}
            </Text>
            
            <Text style={[styles.featuredDescription, { color: theme.colors.textSecondary }]}>
              {challenge.description}
            </Text>
            
            <View style={styles.featuredFooter}>
              <View style={styles.challengeStats}>
                <Users size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {challenge.participants} participants
                </Text>
              </View>
              
              <View style={styles.timeRemaining}>
                <Clock size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.timeText, { color: theme.colors.textSecondary }]}>
                  {getTimeRemaining(challenge.endDate)}
                </Text>
              </View>
            </View>
          </Pressable>
        ))}
      </Animated.View>
    );
  };

  const renderChallengesList = () => (
    <Animated.View entering={FadeInUp.delay(200)} style={styles.challengesSection}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        All Challenges
      </Text>
      
      {filteredChallenges.map((challenge, index) => (
        <Animated.View
          key={challenge.id}
          entering={FadeInUp.delay(index * 50)}
          style={[styles.challengeCard, { backgroundColor: theme.colors.surface }]}
        >
          <Pressable onPress={() => handleJoinChallenge(challenge)}>
            <View style={styles.challengeHeader}>
              <View style={styles.challengeInfo}>
                <View style={styles.challengeMeta}>
                  <Trophy size={16} color={theme.colors.warning} />
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
              </View>
              
              <ChevronRight size={20} color={theme.colors.textSecondary} />
            </View>
            
            <View style={styles.challengeFooter}>
              <View style={styles.challengeMetrics}>
                <View style={styles.metric}>
                  <Users size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.metricText, { color: theme.colors.textSecondary }]}>
                    {challenge.participants}
                  </Text>
                </View>
                
                <View style={styles.metric}>
                  <Star size={14} color={theme.colors.primary} />
                  <Text style={[styles.metricText, { color: theme.colors.primary }]}>
                    {challenge.rewards.xp} XP
                  </Text>
                </View>
                
                <View style={styles.metric}>
                  <Clock size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.metricText, { color: theme.colors.textSecondary }]}>
                    {getTimeRemaining(challenge.endDate)}
                  </Text>
                </View>
              </View>
              
              {userSubmissions.some(sub => sub.challengeId === challenge.id) && (
                <View style={[styles.submittedBadge, { backgroundColor: theme.colors.success }]}>
                  <Text style={[styles.submittedText, { color: theme.colors.surface }]}>
                    Submitted
                  </Text>
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </Animated.View>
  );

  const renderSubmissionModal = () => (
    <Modal
      visible={showSubmitModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowSubmitModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Submit to Challenge
          </Text>
          
          {selectedChallenge && (
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              {selectedChallenge.title}
            </Text>
          )}
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Artwork Title *
            </Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              value={submissionTitle}
              onChangeText={setSubmissionTitle}
              placeholder="Enter artwork title"
              placeholderTextColor={theme.colors.textSecondary}
            />
          </View>
          
          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              Description
            </Text>
            <TextInput
              style={[styles.textArea, { 
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                borderColor: theme.colors.border,
              }]}
              value={submissionDescription}
              onChangeText={setSubmissionDescription}
              placeholder="Describe your artwork..."
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              numberOfLines={3}
            />
          </View>
          
          <View style={[styles.uploadArea, { 
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
          }]}>
            <Upload size={32} color={theme.colors.textSecondary} />
            <Text style={[styles.uploadText, { color: theme.colors.textSecondary }]}>
              Tap to upload artwork
            </Text>
            <Text style={[styles.uploadHint, { color: theme.colors.textSecondary }]}>
              Or create new artwork in Draw tab
            </Text>
          </View>
          
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setShowSubmitModal(false)}
            >
              <Text style={[styles.buttonText, { color: theme.colors.textSecondary }]}>
                Cancel
              </Text>
            </Pressable>
            
            <Pressable
              style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSubmitArtwork}
            >
              <Text style={[styles.buttonText, { color: theme.colors.surface }]}>
                Submit
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Art Challenges
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
            Compete, create, and grow with the community
          </Text>
        </View>
        
        {renderFilterTabs()}
        {renderFeaturedChallenges()}
        {renderChallengesList()}
        
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {renderSubmissionModal()}
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
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  featuredSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  featuredCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengeTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  challengeType: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizeText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  featuredTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  featuredDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  featuredFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeRemaining: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    marginLeft: 4,
  },
  timeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  challengesSection: {
    paddingHorizontal: 20,
  },
  challengeCard: {
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  challengeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  challengeMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metric: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metricText: {
    fontSize: 12,
    marginLeft: 4,
  },
  submittedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  submittedText: {
    fontSize: 10,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    padding: 24,
    borderRadius: 16,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    height: 80,
    textAlignVertical: 'top',
  },
  uploadArea: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 32,
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
  },
  uploadHint: {
    fontSize: 12,
    marginTop: 4,
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
  submitButton: {
    marginLeft: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
});