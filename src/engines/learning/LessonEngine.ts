import { 
    Lesson, 
    TheorySegment, 
    PracticeInstruction, 
    Assessment,
    ValidationRule,
    LearningObjective 
  } from '../../types';
  import { dataManager } from '../core/DataManager';
  import { errorHandler } from '../core/ErrorHandler';
  import { progressionSystem } from '../user/ProgressionSystem';
  import { performanceMonitor } from '../core/PerformanceMonitor';
  
  /**
   * Scalable lesson delivery system that handles theory, practice, and assessment
   * Optimized for seamless learning experience with real-time guidance
   */
  export class LessonEngine {
    private static instance: LessonEngine;
    private currentLesson: Lesson | null = null;
    private lessonState: LessonState = {
      phase: 'not_started',
      theoryProgress: 0,
      practiceProgress: 0,
      startTime: null,
      pausedTime: 0,
      completedObjectives: [],
      currentInstruction: 0,
      validationResults: new Map(),
    };
    private lessonListeners: Set<(state: LessonState) => void> = new Set();
    private practiceValidators: Map<string, ValidationFunction> = new Map();
  
    private constructor() {
      this.initializeValidators();
    }
  
    public static getInstance(): LessonEngine {
      if (!LessonEngine.instance) {
        LessonEngine.instance = new LessonEngine();
      }
      return LessonEngine.instance;
    }
  
    private initializeValidators(): void {
      // Stroke count validator
      this.practiceValidators.set('stroke_count', (rule: ValidationRule, data: any) => {
        const strokeCount = data.strokes?.length || 0;
        return strokeCount >= rule.params.min && strokeCount <= rule.params.max;
      });
  
      // Color match validator
      this.practiceValidators.set('color_match', (rule: ValidationRule, data: any) => {
        const targetColor = rule.params.targetColor;
        const usedColors = data.colors || [];
        return usedColors.some((color: string) => 
          this.colorDistance(color, targetColor) < rule.threshold
        );
      });
  
      // Shape accuracy validator
      this.practiceValidators.set('shape_accuracy', (rule: ValidationRule, data: any) => {
        const accuracy = this.calculateShapeAccuracy(data.strokes, rule.params.targetShape);
        return accuracy >= rule.threshold;
      });
  
      // Completion validator
      this.practiceValidators.set('completion', (rule: ValidationRule, data: any) => {
        const completionRate = data.completionRate || 0;
        return completionRate >= rule.threshold;
      });
    }
  
    public async startLesson(lesson: Lesson): Promise<void> {
      try {
        performanceMonitor.resetDrawCalls();
        
        this.currentLesson = lesson;
        this.lessonState = {
          phase: 'theory',
          theoryProgress: 0,
          practiceProgress: 0,
          startTime: Date.now(),
          pausedTime: 0,
          completedObjectives: [],
          currentInstruction: 0,
          validationResults: new Map(),
        };
  
        // Preload lesson assets
        await this.preloadLessonAssets(lesson);
  
        // Track lesson start
        await dataManager.set(`lesson_start_${lesson.id}`, {
          timestamp: Date.now(),
          userId: await this.getCurrentUserId(),
        });
  
        this.notifyListeners();
      } catch (error) {
        errorHandler.handleError(
          errorHandler.createError('LESSON_START_ERROR', 'Failed to start lesson', 'medium', error)
        );
        throw error;
      }
    }
  
    private async preloadLessonAssets(lesson: Lesson): Promise<void> {
      const preloadPromises: Promise<void>[] = [];
  
      // Preload theory content images/videos
      lesson.theoryContent.segments.forEach(segment => {
        if (segment.type === 'image' || segment.type === 'video') {
          preloadPromises.push(this.preloadAsset(segment.content.url));
        }
      });
  
      // Preload practice reference image
      if (lesson.practiceContent.referenceImage) {
        preloadPromises.push(this.preloadAsset(lesson.practiceContent.referenceImage));
      }
  
      await Promise.all(preloadPromises);
    }
  
    private async preloadAsset(url: string): Promise<void> {
      // In production, this would actually preload the asset
      // For now, it's a placeholder
      return Promise.resolve();
    }
  
    public progressTheory(segmentIndex: number): void {
      if (!this.currentLesson || this.lessonState.phase !== 'theory') return;
  
      const totalSegments = this.currentLesson.theoryContent.segments.length;
      this.lessonState.theoryProgress = ((segmentIndex + 1) / totalSegments) * 100;
  
      if (segmentIndex >= totalSegments - 1) {
        this.lessonState.phase = 'ready_for_practice';
      }
  
      this.notifyListeners();
    }
  
    public startPractice(): void {
      if (!this.currentLesson || this.lessonState.phase !== 'ready_for_practice') return;
  
      this.lessonState.phase = 'practice';
      this.lessonState.currentInstruction = 0;
      this.notifyListeners();
    }
  
    public progressPractice(instructionIndex: number, drawingData: any): void {
      if (!this.currentLesson || this.lessonState.phase !== 'practice') return;
  
      const instruction = this.currentLesson.practiceContent.instructions[instructionIndex];
      
      // Validate if instruction has validation rules
      if (instruction.validation) {
        const isValid = this.validateInstruction(instruction.validation, drawingData);
        this.lessonState.validationResults.set(instructionIndex, isValid);
        
        if (!isValid) {
          // Provide hint if validation fails
          this.provideHint(instructionIndex);
          return;
        }
      }
  
      // Progress to next instruction
      const totalInstructions = this.currentLesson.practiceContent.instructions.length;
      this.lessonState.currentInstruction = instructionIndex + 1;
      this.lessonState.practiceProgress = ((instructionIndex + 1) / totalInstructions) * 100;
  
      if (instructionIndex >= totalInstructions - 1) {
        this.lessonState.phase = 'ready_for_assessment';
      }
  
      this.notifyListeners();
    }
  
    private validateInstruction(rule: ValidationRule, data: any): boolean {
      const validator = this.practiceValidators.get(rule.type);
      if (!validator) return true;
      
      return validator(rule, data);
    }
  
    private provideHint(instructionIndex: number): void {
      if (!this.currentLesson) return;
  
      const hints = this.currentLesson.practiceContent.hints;
      const relevantHint = hints.find(hint => 
        hint.triggerCondition === `instruction_${instructionIndex}_fail`
      );
  
      if (relevantHint) {
        this.emitHint(relevantHint);
      }
    }
  
    private emitHint(hint: any): void {
      // This would integrate with the UI to show the hint
      if (typeof window !== 'undefined' && (window as any).showHint) {
        (window as any).showHint(hint);
      }
    }
  
    public async completeLesson(assessmentData: any): Promise<LessonCompletionResult> {
      if (!this.currentLesson || this.lessonState.phase !== 'ready_for_assessment') {
        throw new Error('Cannot complete lesson in current state');
      }
  
      const assessmentResult = this.assessLesson(assessmentData);
      const duration = Date.now() - (this.lessonState.startTime || 0) - this.lessonState.pausedTime;
  
      // Calculate XP reward
      let xpEarned = this.currentLesson.xpReward;
      if (assessmentResult.score >= 0.95) {
        xpEarned *= 1.5; // Perfect score bonus
      }
  
      // Complete objectives
      const completedObjectives = this.currentLesson.objectives.map(obj => ({
        ...obj,
        completed: assessmentResult.objectiveResults[obj.id] || false,
      }));
  
      // Save completion
      await this.saveLessonCompletion({
        lessonId: this.currentLesson.id,
        score: assessmentResult.score,
        duration,
        xpEarned,
        completedObjectives,
        timestamp: Date.now(),
      });
  
      // Update progression
      await progressionSystem.recordLessonCompletion(
        this.currentLesson.id,
        assessmentResult.score
      );
  
      this.lessonState.phase = 'completed';
      this.notifyListeners();
  
      return {
        passed: assessmentResult.passed,
        score: assessmentResult.score,
        xpEarned,
        duration,
        feedback: assessmentResult.feedback,
        nextLessonId: this.getNextLessonId(),
      };
    }
  
    private assessLesson(data: any): AssessmentResult {
      if (!this.currentLesson) {
        throw new Error('No current lesson');
      }
  
      const assessment = this.currentLesson.assessment;
      let totalScore = 0;
      let totalWeight = 0;
      const objectiveResults: Record<string, boolean> = {};
      const feedback: string[] = [];
  
      // Evaluate each criterion
      assessment.criteria.forEach(criterion => {
        const score = this.evaluateCriterion(criterion, data);
        totalScore += score * criterion.weight;
        totalWeight += criterion.weight;
  
        if (score < 0.7) {
          feedback.push(`Need improvement: ${criterion.description}`);
        } else if (score >= 0.9) {
          feedback.push(`Excellent: ${criterion.description}`);
        }
      });
  
      const finalScore = totalWeight > 0 ? totalScore / totalWeight : 0;
      const passed = finalScore >= assessment.passingScore;
  
      // Check bonus objectives
      assessment.bonusObjectives.forEach(bonus => {
        if (this.evaluateBonusObjective(bonus, data)) {
          feedback.push(`Bonus achieved: ${bonus.description} (+${bonus.xpBonus} XP)`);
        }
      });
  
      // Map to learning objectives
      this.currentLesson.objectives.forEach(obj => {
        objectiveResults[obj.id] = finalScore >= 0.7; // Simple mapping for now
      });
  
      return {
        passed,
        score: finalScore,
        objectiveResults,
        feedback,
      };
    }
  
    private evaluateCriterion(criterion: any, data: any): number {
      // Simplified evaluation - in production this would be more sophisticated
      switch (criterion.evaluationType) {
        case 'automatic':
          // Use validation rules to score
          return Math.random() * 0.3 + 0.7; // Placeholder
        case 'self':
          return data.selfAssessment?.[criterion.id] || 0.8;
        case 'peer':
          return data.peerAssessment?.[criterion.id] || 0.75;
        default:
          return 0.8;
      }
    }
  
    private evaluateBonusObjective(bonus: any, data: any): boolean {
      // Placeholder - would have specific logic per bonus type
      return Math.random() > 0.7;
    }
  
    private async saveLessonCompletion(completion: any): Promise<void> {
      const completions = await dataManager.get<any[]>('lesson_completions') || [];
      completions.push(completion);
      await dataManager.set('lesson_completions', completions);
    }
  
    private getNextLessonId(): string | undefined {
      // This would check skill tree progression
      return undefined; // Placeholder
    }
  
    public pauseLesson(): void {
      if (this.lessonState.phase === 'practice' || this.lessonState.phase === 'theory') {
        this.lessonState.pausedTime += Date.now() - (this.lessonState.startTime || 0);
        this.lessonState.phase = 'paused';
        this.notifyListeners();
      }
    }
  
    public resumeLesson(): void {
      if (this.lessonState.phase === 'paused') {
        this.lessonState.startTime = Date.now();
        this.lessonState.phase = this.lessonState.theoryProgress < 100 ? 'theory' : 'practice';
        this.notifyListeners();
      }
    }
  
    public getCurrentLesson(): Lesson | null {
      return this.currentLesson;
    }
  
    public getLessonState(): LessonState {
      return { ...this.lessonState };
    }
  
    public subscribeToLessonState(callback: (state: LessonState) => void): () => void {
      this.lessonListeners.add(callback);
      callback(this.lessonState);
      return () => this.lessonListeners.delete(callback);
    }
  
    private notifyListeners(): void {
      this.lessonListeners.forEach(callback => callback(this.getLessonState()));
    }
  
    private async getCurrentUserId(): Promise<string> {
      const user = await dataManager.getUserProfile();
      return user?.id || 'anonymous';
    }
  
    private colorDistance(color1: string, color2: string): number {
      // Simple RGB distance calculation
      // In production, use proper color space conversion
      return 0; // Placeholder
    }
  
    private calculateShapeAccuracy(strokes: any[], targetShape: any): number {
      // Calculate how accurately the strokes match the target shape
      // This would use computer vision or geometric algorithms
      return 0.85; // Placeholder
    }
  
    // Real-time guidance system
    public checkDrawingProgress(drawingData: any): GuidanceResponse {
      if (!this.currentLesson || this.lessonState.phase !== 'practice') {
        return { type: 'none' };
      }
  
      const currentInstruction = this.currentLesson.practiceContent.instructions[
        this.lessonState.currentInstruction
      ];
  
      // Check if user needs help
      const timeSinceStart = Date.now() - (this.lessonState.startTime || 0);
      const expectedTime = currentInstruction.validation?.params.expectedTime || 30000;
  
      if (timeSinceStart > expectedTime * 1.5) {
        return {
          type: 'hint',
          message: 'Take your time! Try following the guide overlay.',
          showGuide: true,
        };
      }
  
      // Check drawing accuracy
      if (currentInstruction.validation) {
        const isValid = this.validateInstruction(currentInstruction.validation, drawingData);
        if (!isValid) {
          return {
            type: 'correction',
            message: 'Almost there! Adjust your strokes to match the guide.',
            highlightArea: currentInstruction.highlightArea,
          };
        }
      }
  
      return {
        type: 'encouragement',
        message: 'Great job! Keep going!',
      };
    }
  }
  
  interface LessonState {
    phase: 'not_started' | 'theory' | 'ready_for_practice' | 'practice' | 
           'ready_for_assessment' | 'completed' | 'paused';
    theoryProgress: number;
    practiceProgress: number;
    startTime: number | null;
    pausedTime: number;
    completedObjectives: string[];
    currentInstruction: number;
    validationResults: Map<number, boolean>;
  }
  
  interface LessonCompletionResult {
    passed: boolean;
    score: number;
    xpEarned: number;
    duration: number;
    feedback: string[];
    nextLessonId?: string;
  }
  
  interface AssessmentResult {
    passed: boolean;
    score: number;
    objectiveResults: Record<string, boolean>;
    feedback: string[];
  }
  
  interface GuidanceResponse {
    type: 'none' | 'hint' | 'correction' | 'encouragement';
    message?: string;
    showGuide?: boolean;
    highlightArea?: any;
  }
  
  type ValidationFunction = (rule: ValidationRule, data: any) => boolean;
  
  // Export singleton instance
  export const lessonEngine = LessonEngine.getInstance();