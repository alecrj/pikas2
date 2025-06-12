import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Dimensions,
  Modal,
  SafeAreaView,
} from 'react-native';
import Animated, { 
  FadeInUp, 
  FadeInDown, 
  useSharedValue, 
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/contexts/ThemeContext';
import { useLearning } from '../../src/contexts/LearningContext';
import { useUserProgress } from '../../src/contexts/UserProgressContext';
import { skillTreeManager } from '../../src/engines/learning/SkillTreeManager';
import { lessonEngine } from '../../src/engines/learning/LessonEngine';
import { Lesson, TheorySegment, PracticeInstruction } from '../../src/types';
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Circle,
  BookOpen,
  Brush,
  Target,
  Clock,
  Star,
  Trophy,
  Lightbulb,
  X,
  RotateCcw,
  Eye,
  EyeOff,
  Volume2,
  VolumeX,
  Settings,
  HelpCircle,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type LessonPhase = 'intro' | 'theory' | 'practice' | 'assessment' | 'complete';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const theme = useTheme();
  const { startLesson, completeLesson, validateStep } = useLearning();
  const { addXP, updateLearningStats } = useUserProgress();
  
  // Lesson state
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentPhase, setCurrentPhase] = useState<LessonPhase>('intro');
  const [currentTheoryIndex, setCurrentTheoryIndex] = useState(0);
  const [currentPracticeIndex, setCurrentPracticeIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<string>('');
  const [lessonScore, setLessonScore] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Animation values
  const progressAnimation = useSharedValue(0);
  const phaseAnimation = useSharedValue(0);
  
  // Refs
  const startTime = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const styles = createStyles(theme);

  // Load lesson data
  useEffect(() => {
    if (id && typeof id === 'string') {
      const lessonData = skillTreeManager.getLesson(id);
      if (lessonData) {
        setLesson(lessonData);
        startTimer();
      } else {
        Alert.alert('Error', 'Lesson not found');
        router.back();
      }
    }
  }, [id]);

  // Timer management
  const startTimer = () => {
    startTime.current = Date.now();
    timerRef.current = setInterval(() => {
      if (!isPaused) {
        setTimeSpent(Math.floor((Date.now() - startTime.current) / 1000));
      }
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  // Calculate progress
  const calculateProgress = useCallback((): number => {
    if (!lesson) return 0;
    
    const totalSteps = 1 + // intro
      lesson.theoryContent.segments.length +
      lesson.practiceContent.instructions.length +
      1; // assessment
    
    let currentStep = 0;
    
    switch (currentPhase) {
      case 'intro':
        currentStep = 0;
        break;
      case 'theory':
        currentStep = 1 + currentTheoryIndex;
        break;
      case 'practice':
        currentStep = 1 + lesson.theoryContent.segments.length + currentPracticeIndex;
        break;
      case 'assessment':
        currentStep = totalSteps - 1;
        break;
      case 'complete':
        currentStep = totalSteps;
        break;
    }
    
    return (currentStep / totalSteps) * 100;
  }, [lesson, currentPhase, currentTheoryIndex, currentPracticeIndex]);

  // Update progress animation
  useEffect(() => {
    const progress = calculateProgress();
    progressAnimation.value = withTiming(progress / 100, { duration: 500 });
  }, [currentPhase, currentTheoryIndex, currentPracticeIndex]);

  // Phase transition
  const transitionToPhase = (newPhase: LessonPhase) => {
    phaseAnimation.value = withSpring(0, { damping: 15 }, () => {
      setCurrentPhase(newPhase);
      phaseAnimation.value = withSpring(1, { damping: 15 });
    });
  };

  // Lesson navigation
  const startLessonFlow = async () => {
    if (!lesson) return;
    
    try {
      await startLesson(lesson);
      transitionToPhase('theory');
    } catch (error) {
      Alert.alert('Error', 'Failed to start lesson');
    }
  };

  const nextTheorySegment = () => {
    if (!lesson) return;
    
    if (currentTheoryIndex < lesson.theoryContent.segments.length - 1) {
      setCurrentTheoryIndex(currentTheoryIndex + 1);
    } else {
      transitionToPhase('practice');
    }
  };

  const previousTheorySegment = () => {
    if (currentTheoryIndex > 0) {
      setCurrentTheoryIndex(currentTheoryIndex - 1);
    } else {
      transitionToPhase('intro');
    }
  };

  const nextPracticeStep = async () => {
    if (!lesson) return;
    
    const currentInstruction = lesson.practiceContent.instructions[currentPracticeIndex];
    
    // Validate current step
    const isValid = await validateStep(currentPracticeIndex, {
      // Mock validation data
      strokes: [{ points: [{ x: 100, y: 100 }] }],
      completed: true,
    });
    
    if (isValid) {
      setCompletedSteps(prev => new Set([...prev, currentInstruction.id]));
      setLessonScore(lessonScore + 20);
      
      if (currentPracticeIndex < lesson.practiceContent.instructions.length - 1) {
        setCurrentPracticeIndex(currentPracticeIndex + 1);
      } else {
        transitionToPhase('assessment');
      }
    } else {
      // Show hint if validation fails
      const hint = lesson.practiceContent.hints.find(h => h.stepIndex === currentPracticeIndex);
      if (hint) {
        setCurrentHint(hint.text);
        setShowHint(true);
      }
    }
  };

  const completeLessonFlow = async () => {
    if (!lesson) return;
    
    try {
      stopTimer();
      
      const finalScore = Math.max(60, lessonScore + (timeSpent < lesson.estimatedTime * 60 ? 20 : 0));
      
      await completeLesson(finalScore);
      
      // Award XP and update stats
      addXP(lesson.rewards.xp);
      updateLearningStats('lessons', { 
        lessonsCompleted: 1,
        totalStudyTime: timeSpent,
      });
      
      setLessonScore(finalScore);
      transitionToPhase('complete');
      
    } catch (error) {
      Alert.alert('Error', 'Failed to complete lesson');
    }
  };

  const exitLesson = () => {
    Alert.alert(
      'Exit Lesson',
      'Are you sure you want to exit? Your progress will be saved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Exit', 
          onPress: () => {
            stopTimer();
            router.back();
          }
        },
      ]
    );
  };

  // Animated styles
  const progressBarStyle = useAnimatedStyle(() => ({
    width: `${progressAnimation.value * 100}%`,
  }));

  const phaseStyle = useAnimatedStyle(() => ({
    opacity: phaseAnimation.value,
    transform: [
      {
        translateY: (1 - phaseAnimation.value) * 20,
      },
    ],
  }));

  // Render methods
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
      <Pressable style={styles.headerButton} onPress={exitLesson}>
        <ChevronLeft size={24} color={theme.colors.text} />
      </Pressable>
      
      <View style={styles.headerCenter}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {lesson?.title || 'Loading...'}
        </Text>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { backgroundColor: theme.colors.border }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { backgroundColor: theme.colors.primary },
                progressBarStyle
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.colors.textSecondary }]}>
            {Math.round(calculateProgress())}%
          </Text>
        </View>
      </View>
      
      <Pressable style={styles.headerButton} onPress={() => setShowSettings(true)}>
        <Settings size={24} color={theme.colors.text} />
      </Pressable>
    </View>
  );

  const renderIntroPhase = () => (
    <Animated.View style={[styles.phaseContainer, phaseStyle]}>
      <ScrollView contentContainerStyle={styles.introContent}>
        <View style={styles.lessonIntro}>
          <View style={[styles.lessonIcon, { backgroundColor: theme.colors.primary + '20' }]}>
            <BookOpen size={32} color={theme.colors.primary} />
          </View>
          
          <Text style={[styles.lessonTitle, { color: theme.colors.text }]}>
            {lesson?.title}
          </Text>
          
          <Text style={[styles.lessonDescription, { color: theme.colors.textSecondary }]}>
            {lesson?.description}
          </Text>
          
          <View style={styles.lessonMeta}>
            <View style={styles.metaItem}>
              <Clock size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {lesson?.estimatedTime} min
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Star size={16} color={theme.colors.warning} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {lesson?.rewards.xp} XP
              </Text>
            </View>
            
            <View style={styles.metaItem}>
              <Target size={16} color={theme.colors.success} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                Level {lesson?.difficulty}
              </Text>
            </View>
          </View>
          
          <View style={styles.objectivesContainer}>
            <Text style={[styles.objectivesTitle, { color: theme.colors.text }]}>
              What you'll learn:
            </Text>
            
            {lesson?.objectives.map((objective, index) => (
              <View key={objective.id} style={styles.objectiveItem}>
                <CheckCircle size={16} color={theme.colors.success} />
                <Text style={[styles.objectiveText, { color: theme.colors.text }]}>
                  {objective.description}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.phaseActions}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={startLessonFlow}
        >
          <Play size={20} color={theme.colors.surface} />
          <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
            Start Lesson
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderTheoryPhase = () => {
    const currentSegment = lesson?.theoryContent.segments[currentTheoryIndex];
    if (!currentSegment) return null;
    
    return (
      <Animated.View style={[styles.phaseContainer, phaseStyle]}>
        <ScrollView contentContainerStyle={styles.theoryContent}>
          <View style={styles.segmentHeader}>
            <View style={[styles.segmentIcon, { backgroundColor: theme.colors.info + '20' }]}>
              <BookOpen size={24} color={theme.colors.info} />
            </View>
            
            <Text style={[styles.segmentTitle, { color: theme.colors.text }]}>
              Theory • {currentTheoryIndex + 1} of {lesson?.theoryContent.segments.length}
            </Text>
          </View>
          
          <View style={[styles.segmentCard, { backgroundColor: theme.colors.surface }]}>
            {currentSegment.type === 'text' && (
              <Text style={[styles.segmentText, { color: theme.colors.text }]}>
                {typeof currentSegment.content === 'string' 
                  ? currentSegment.content 
                  : currentSegment.content.text}
              </Text>
            )}
            
            {currentSegment.type === 'interactive' && (
              <View style={styles.interactiveContent}>
                <Text style={[styles.interactiveTitle, { color: theme.colors.primary }]}>
                  {typeof currentSegment.content === 'object' && currentSegment.content.title
                    ? currentSegment.content.title
                    : 'Interactive Demo'}
                </Text>
                
                <Text style={[styles.interactiveInstructions, { color: theme.colors.text }]}>
                  {typeof currentSegment.content === 'object' && currentSegment.content.instructions
                    ? currentSegment.content.instructions
                    : 'Follow along with the demonstration below.'}
                </Text>
                
                <View style={[styles.demoArea, { backgroundColor: theme.colors.background }]}>
                  <Eye size={32} color={theme.colors.textSecondary} />
                  <Text style={[styles.demoText, { color: theme.colors.textSecondary }]}>
                    Interactive demo would appear here
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        
        <View style={styles.phaseActions}>
          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
            onPress={previousTheorySegment}
          >
            <ChevronLeft size={20} color={theme.colors.text} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
              Previous
            </Text>
          </Pressable>
          
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
            onPress={nextTheorySegment}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
              {currentTheoryIndex < (lesson?.theoryContent.segments.length || 0) - 1 ? 'Next' : 'Practice'}
            </Text>
            <ChevronRight size={20} color={theme.colors.surface} />
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const renderPracticePhase = () => {
    const currentInstruction = lesson?.practiceContent.instructions[currentPracticeIndex];
    if (!currentInstruction) return null;
    
    const isCompleted = completedSteps.has(currentInstruction.id);
    
    return (
      <Animated.View style={[styles.phaseContainer, phaseStyle]}>
        <ScrollView contentContainerStyle={styles.practiceContent}>
          <View style={styles.segmentHeader}>
            <View style={[styles.segmentIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Brush size={24} color={theme.colors.primary} />
            </View>
            
            <Text style={[styles.segmentTitle, { color: theme.colors.text }]}>
              Practice • Step {currentPracticeIndex + 1} of {lesson?.practiceContent.instructions.length}
            </Text>
          </View>
          
          <View style={[styles.segmentCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.instructionText, { color: theme.colors.text }]}>
              {currentInstruction.text}
            </Text>
            
            {currentInstruction.hint && (
              <View style={[styles.hintContainer, { backgroundColor: theme.colors.warning + '20' }]}>
                <Lightbulb size={16} color={theme.colors.warning} />
                <Text style={[styles.hintText, { color: theme.colors.text }]}>
                  Tip: {currentInstruction.hint}
                </Text>
              </View>
            )}
            
            <View style={[styles.practiceArea, { backgroundColor: theme.colors.background }]}>
              <Brush size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.practiceAreaText, { color: theme.colors.textSecondary }]}>
                Drawing canvas would appear here
              </Text>
              <Text style={[styles.practiceAreaSubtext, { color: theme.colors.textSecondary }]}>
                Follow the instructions above to complete this step
              </Text>
            </View>
          </View>
        </ScrollView>
        
        <View style={styles.phaseActions}>
          <Pressable
            style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
            onPress={() => {
              if (currentPracticeIndex > 0) {
                setCurrentPracticeIndex(currentPracticeIndex - 1);
              } else {
                transitionToPhase('theory');
                setCurrentTheoryIndex((lesson?.theoryContent.segments.length || 1) - 1);
              }
            }}
          >
            <ChevronLeft size={20} color={theme.colors.text} />
            <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
              Previous
            </Text>
          </Pressable>
          
          <Pressable
            style={[
              styles.primaryButton, 
              { backgroundColor: isCompleted ? theme.colors.success : theme.colors.primary }
            ]}
            onPress={nextPracticeStep}
          >
            {isCompleted ? (
              <CheckCircle size={20} color={theme.colors.surface} />
            ) : (
              <Circle size={20} color={theme.colors.surface} />
            )}
            <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
              {currentPracticeIndex < (lesson?.practiceContent.instructions.length || 0) - 1 
                ? 'Next Step' 
                : 'Complete Practice'}
            </Text>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  const renderAssessmentPhase = () => (
    <Animated.View style={[styles.phaseContainer, phaseStyle]}>
      <ScrollView contentContainerStyle={styles.assessmentContent}>
        <View style={styles.segmentHeader}>
          <View style={[styles.segmentIcon, { backgroundColor: theme.colors.success + '20' }]}>
            <Target size={24} color={theme.colors.success} />
          </View>
          
          <Text style={[styles.segmentTitle, { color: theme.colors.text }]}>
            Assessment
          </Text>
        </View>
        
        <View style={[styles.segmentCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.assessmentTitle, { color: theme.colors.text }]}>
            Great work! Let's review what you've learned.
          </Text>
          
          <Text style={[styles.assessmentDescription, { color: theme.colors.textSecondary }]}>
            You've completed all the practice steps. Your understanding will be assessed based on your performance.
          </Text>
          
          <View style={styles.scorePreview}>
            <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
              Current Score
            </Text>
            <Text style={[styles.scoreValue, { color: theme.colors.primary }]}>
              {lessonScore}/100
            </Text>
          </View>
          
          <View style={styles.timeSpentContainer}>
            <Clock size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.timeSpentText, { color: theme.colors.textSecondary }]}>
              Time spent: {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <View style={styles.phaseActions}>
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.colors.success }]}
          onPress={completeLessonFlow}
        >
          <Trophy size={20} color={theme.colors.surface} />
          <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
            Complete Lesson
          </Text>
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderCompletePhase = () => (
    <Animated.View style={[styles.phaseContainer, phaseStyle]}>
      <ScrollView contentContainerStyle={styles.completeContent}>
        <View style={styles.completionHeader}>
          <View style={[styles.completionIcon, { backgroundColor: theme.colors.success + '20' }]}>
            <Trophy size={48} color={theme.colors.success} />
          </View>
          
          <Text style={[styles.completionTitle, { color: theme.colors.text }]}>
            Lesson Complete!
          </Text>
          
          <Text style={[styles.completionSubtitle, { color: theme.colors.textSecondary }]}>
            Congratulations on completing {lesson?.title}
          </Text>
        </View>
        
        <View style={[styles.resultsCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>
              Final Score
            </Text>
            <Text style={[styles.resultValue, { color: theme.colors.success }]}>
              {lessonScore}/100
            </Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>
              XP Earned
            </Text>
            <Text style={[styles.resultValue, { color: theme.colors.primary }]}>
              +{lesson?.rewards.xp}
            </Text>
          </View>
          
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: theme.colors.textSecondary }]}>
              Time Spent
            </Text>
            <Text style={[styles.resultValue, { color: theme.colors.text }]}>
              {Math.floor(timeSpent / 60)}m {timeSpent % 60}s
            </Text>
          </View>
        </View>
        
        {lesson?.rewards.achievements && lesson.rewards.achievements.length > 0 && (
          <View style={[styles.achievementsCard, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.achievementsTitle, { color: theme.colors.text }]}>
              Achievements Unlocked
            </Text>
            
            {lesson.rewards.achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementItem}>
                <Star size={16} color={theme.colors.warning} />
                <Text style={[styles.achievementText, { color: theme.colors.text }]}>
                  {achievement}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <View style={styles.phaseActions}>
        <Pressable
          style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
          onPress={() => router.push('/(tabs)/learn')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>
            Back to Lessons
          </Text>
        </Pressable>
        
        <Pressable
          style={[styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/(tabs)/draw')}
        >
          <Text style={[styles.primaryButtonText, { color: theme.colors.surface }]}>
            Practice Drawing
          </Text>
          <Brush size={20} color={theme.colors.surface} />
        </Pressable>
      </View>
    </Animated.View>
  );

  const renderHintModal = () => (
    <Modal
      visible={showHint}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHint(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.hintModal, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.hintModalHeader}>
            <Lightbulb size={24} color={theme.colors.warning} />
            <Text style={[styles.hintModalTitle, { color: theme.colors.text }]}>
              Hint
            </Text>
            <Pressable onPress={() => setShowHint(false)}>
              <X size={24} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          
          <Text style={[styles.hintModalText, { color: theme.colors.text }]}>
            {currentHint}
          </Text>
          
          <Pressable
            style={[styles.hintModalButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setShowHint(false)}
          >
            <Text style={[styles.hintModalButtonText, { color: theme.colors.surface }]}>
              Got it!
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  if (!lesson) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: theme.colors.text }]}>
            Loading lesson...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}
      
      {currentPhase === 'intro' && renderIntroPhase()}
      {currentPhase === 'theory' && renderTheoryPhase()}
      {currentPhase === 'practice' && renderPracticePhase()}
      {currentPhase === 'assessment' && renderAssessmentPhase()}
      {currentPhase === 'complete' && renderCompletePhase()}
      
      {renderHintModal()}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 32,
  },
  phaseContainer: {
    flex: 1,
  },
  introContent: {
    padding: 24,
    alignItems: 'center',
  },
  lessonIntro: {
    alignItems: 'center',
    maxWidth: 400,
  },
  lessonIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  lessonTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  lessonDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  lessonMeta: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginBottom: 32,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 4,
  },
  metaText: {
    fontSize: 14,
    marginLeft: 6,
  },
  objectivesContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  objectivesTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  objectiveText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  theoryContent: {
    padding: 24,
  },
  practiceContent: {
    padding: 24,
  },
  assessmentContent: {
    padding: 24,
  },
  completeContent: {
    padding: 24,
    alignItems: 'center',
  },
  segmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  segmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  segmentTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  segmentCard: {
    borderRadius: 12,
    padding: 20,
  },
  segmentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  interactiveContent: {
    alignItems: 'center',
  },
  interactiveTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  interactiveInstructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  demoArea: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoText: {
    fontSize: 14,
    marginTop: 8,
  },
  instructionText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  hintText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  practiceArea: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0,0,0,0.1)',
  },
  practiceAreaText: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  practiceAreaSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  assessmentTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  assessmentDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  scorePreview: {
    alignItems: 'center',
    marginBottom: 16,
  },
  scoreLabel: {
    fontSize: 14,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
  },
  timeSpentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeSpentText: {
    fontSize: 12,
    marginLeft: 4,
  },
  completionHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  completionIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  resultsCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 14,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  achievementsCard: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
  },
  achievementsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementText: {
    fontSize: 14,
    marginLeft: 8,
  },
  phaseActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 8,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintModal: {
    width: '85%',
    padding: 20,
    borderRadius: 16,
  },
  hintModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  hintModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginLeft: 8,
  },
  hintModalText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  hintModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  hintModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});