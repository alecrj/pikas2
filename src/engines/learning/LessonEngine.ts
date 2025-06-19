import { 
  Lesson, 
  LessonContent,
  LessonProgress,
  ValidationResult,
} from '../../types';
import { dataManager } from '../core/DataManager';
import { errorHandler } from '../core/ErrorHandler';
import { EventBus } from '../core/EventBus';

/**
 * COMMERCIAL GRADE LESSON ENGINE
 * 
 * Handles ANY lesson type:
 * - Theory quizzes (multiple choice, true/false, color matching)
 * - Drawing exercises (with validation)
 * - Guided practice (step-by-step tutorials)
 * - Video lessons (interactive videos)
 * - Assessment tests
 * 
 * EASILY EXTENSIBLE: Just add new content types to the handlers
 */
export class LessonEngine {
  private static instance: LessonEngine;
  private eventBus: EventBus = EventBus.getInstance();
  
  private currentLesson: Lesson | null = null;
  private lessonProgress: LessonProgress | null = null;
  private contentIndex: number = 0;
  private startTime: number = 0;
  private sessionData: any = {};
  
  // Content handlers for different lesson types
  private contentHandlers: Map<string, ContentHandler> = new Map();
  
  private constructor() {
    this.initializeHandlers();
  }

  public static getInstance(): LessonEngine {
    if (!LessonEngine.instance) {
      LessonEngine.instance = new LessonEngine();
    }
    return LessonEngine.instance;
  }

  // =================== INITIALIZATION ===================

  private initializeHandlers(): void {
    // Theory question handlers
    this.contentHandlers.set('multiple_choice', new MultipleChoiceHandler());
    this.contentHandlers.set('true_false', new TrueFalseHandler());
    this.contentHandlers.set('color_match', new ColorMatchHandler());
    this.contentHandlers.set('visual_selection', new VisualSelectionHandler());
    
    // Drawing exercise handlers
    this.contentHandlers.set('drawing_exercise', new DrawingExerciseHandler());
    this.contentHandlers.set('guided_step', new GuidedStepHandler());
    this.contentHandlers.set('shape_practice', new ShapePracticeHandler());
    
    // Advanced content handlers
    this.contentHandlers.set('video_lesson', new VideoLessonHandler());
    this.contentHandlers.set('assessment', new AssessmentHandler());
    this.contentHandlers.set('portfolio_project', new PortfolioProjectHandler());
    
    console.log(`✅ Initialized ${this.contentHandlers.size} content handlers`);
  }

  // =================== MAIN LESSON FLOW ===================

  public async startLesson(lesson: Lesson): Promise<void> {
    try {
      console.log(`🎓 Starting lesson: ${lesson.title}`);
      
      this.currentLesson = lesson;
      this.contentIndex = 0;
      this.startTime = Date.now();
      this.sessionData = {
        answers: new Map(),
        attempts: new Map(),
        timeSpent: new Map(),
        score: 0,
        maxScore: 0,
      };
      
      // Initialize progress
      this.lessonProgress = {
        lessonId: lesson.id,
        contentProgress: 0,
        currentContentIndex: 0,
        totalContent: lesson.content.length,
        score: 0,
        timeSpent: 0,
        completed: false,
        startedAt: new Date().toISOString(),
      };
      
      // Emit lesson started event
      this.eventBus.emit('lesson:started', { 
        lessonId: lesson.id,
        lessonType: lesson.type,
        contentCount: lesson.content.length
      });
      
      // Calculate max possible score
      this.sessionData.maxScore = lesson.content.reduce((sum, content) => {
        return sum + (content.xp || 10);
      }, 0);
      
      console.log(`📊 Lesson started - ${lesson.content.length} content items, max score: ${this.sessionData.maxScore}`);
      
    } catch (error) {
      console.error('❌ Failed to start lesson:', error);
      throw error;
    }
  }

  public getCurrentContent(): LessonContent | null {
    if (!this.currentLesson || this.contentIndex >= this.currentLesson.content.length) {
      return null;
    }
    return this.currentLesson.content[this.contentIndex];
  }

  public getLessonProgress(): LessonProgress | null {
    return this.lessonProgress;
  }

  public getSessionData(): any {
    return { ...this.sessionData };
  }

  // =================== CONTENT INTERACTION ===================

  public async submitAnswer(contentId: string, answer: any): Promise<ValidationResult> {
    if (!this.currentLesson || !this.lessonProgress) {
      throw new Error('No active lesson');
    }

    try {
      const currentContent = this.getCurrentContent();
      if (!currentContent || currentContent.id !== contentId) {
        throw new Error('Content mismatch');
      }

      console.log(`📝 Submitting answer for ${contentId}:`, answer);

      // Get appropriate handler
      const handler = this.contentHandlers.get(currentContent.type);
      if (!handler) {
        throw new Error(`No handler for content type: ${currentContent.type}`);
      }

      // Track attempt
      const attemptCount = (this.sessionData.attempts.get(contentId) || 0) + 1;
      this.sessionData.attempts.set(contentId, attemptCount);

      // Validate answer
      const result = await handler.validateAnswer(currentContent, answer, attemptCount);
      
      // Store answer and result
      this.sessionData.answers.set(contentId, answer);
      
      if (result.isCorrect) {
        // Award XP (with bonus for first attempt)
        const xpEarned = attemptCount === 1 ? result.xpAwarded : Math.floor(result.xpAwarded * 0.5);
        this.sessionData.score += xpEarned;
        result.xpAwarded = xpEarned;
        
        console.log(`✅ Correct answer! +${xpEarned} XP (attempt ${attemptCount})`);
      } else {
        console.log(`❌ Incorrect answer (attempt ${attemptCount})`);
      }

      // Emit answer event
      this.eventBus.emit('lesson:answer_submitted', {
        lessonId: this.currentLesson.id,
        contentId,
        isCorrect: result.isCorrect,
        attempt: attemptCount,
        xpEarned: result.xpAwarded,
      });

      return result;
      
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      return {
        isCorrect: false,
        feedback: 'Error processing answer',
        xpAwarded: 0,
      };
    }
  }

  public async nextContent(): Promise<boolean> {
    if (!this.currentLesson || !this.lessonProgress) {
      return false;
    }

    this.contentIndex++;
    this.lessonProgress.currentContentIndex = this.contentIndex;
    this.lessonProgress.contentProgress = (this.contentIndex / this.currentLesson.content.length) * 100;

    // Update time spent
    const timeSpent = Date.now() - this.startTime;
    this.lessonProgress.timeSpent = timeSpent;

    console.log(`➡️ Moving to content ${this.contentIndex + 1}/${this.currentLesson.content.length}`);

    // Check if lesson is complete
    if (this.contentIndex >= this.currentLesson.content.length) {
      return await this.completeLesson();
    }

    // Emit progress event
    this.eventBus.emit('lesson:progress', {
      lessonId: this.currentLesson.id,
      contentIndex: this.contentIndex,
      progress: this.lessonProgress.contentProgress,
    });

    return true;
  }

  public async previousContent(): Promise<boolean> {
    if (this.contentIndex > 0) {
      this.contentIndex--;
      if (this.lessonProgress) {
        this.lessonProgress.currentContentIndex = this.contentIndex;
        this.lessonProgress.contentProgress = (this.contentIndex / (this.currentLesson?.content.length || 1)) * 100;
      }
      return true;
    }
    return false;
  }

  // =================== LESSON COMPLETION ===================

  private async completeLesson(): Promise<boolean> {
    if (!this.currentLesson || !this.lessonProgress) {
      return false;
    }

    try {
      console.log(`🎉 Completing lesson: ${this.currentLesson.title}`);

      // Calculate final score
      const finalScore = Math.min(100, (this.sessionData.score / this.sessionData.maxScore) * 100);
      
      // Update progress
      this.lessonProgress.completed = true;
      this.lessonProgress.score = finalScore;
      this.lessonProgress.timeSpent = Date.now() - this.startTime;
      this.lessonProgress.completedAt = new Date().toISOString();

      // Save lesson completion
      await dataManager.saveLessonCompletion({
        lessonId: this.currentLesson.id,
        score: finalScore,
        xpEarned: this.sessionData.score,
        timeSpent: this.lessonProgress.timeSpent,
        attempts: Object.fromEntries(this.sessionData.attempts),
        completedAt: this.lessonProgress.completedAt,
      });

      // Emit completion event
      this.eventBus.emit('lesson:completed', {
        lessonId: this.currentLesson.id,
        score: finalScore,
        xpEarned: this.sessionData.score,
        timeSpent: this.lessonProgress.timeSpent,
        achievements: this.currentLesson.rewards.achievements || [],
      });

      console.log(`📊 Lesson completed - Score: ${finalScore}%, XP: ${this.sessionData.score}`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to complete lesson:', error);
      return false;
    }
  }

  // =================== LESSON MANAGEMENT ===================

  public pauseLesson(): void {
    if (this.lessonProgress) {
      this.lessonProgress.timeSpent = Date.now() - this.startTime;
      this.eventBus.emit('lesson:paused', { lessonId: this.currentLesson?.id });
    }
  }

  public resumeLesson(): void {
    this.startTime = Date.now() - (this.lessonProgress?.timeSpent || 0);
    this.eventBus.emit('lesson:resumed', { lessonId: this.currentLesson?.id });
  }

  public exitLesson(): void {
    if (this.currentLesson && this.lessonProgress) {
      this.lessonProgress.timeSpent = Date.now() - this.startTime;
      // Save partial progress
      dataManager.saveLessonProgress(this.lessonProgress);
      this.eventBus.emit('lesson:exited', { lessonId: this.currentLesson.id });
    }
    
    this.currentLesson = null;
    this.lessonProgress = null;
    this.contentIndex = 0;
    this.sessionData = {};
  }

  // =================== HELPER METHODS ===================

  public getHint(contentId: string): string | null {
    const content = this.getCurrentContent();
    if (content && content.id === contentId) {
      return content.hint || null;
    }
    return null;
  }

  public canShowHint(contentId: string): boolean {
    const attempts = this.sessionData.attempts.get(contentId) || 0;
    return attempts >= 1; // Show hint after first wrong attempt
  }

  public getContentStats(): {
    completed: number;
    total: number;
    correctAnswers: number;
    totalAttempts: number;
  } {
    const total = this.currentLesson?.content.length || 0;
    const completed = this.contentIndex;
    
    let correctAnswers = 0;
    let totalAttempts = 0;
    
    for (const [contentId, attempts] of this.sessionData.attempts.entries()) {
      totalAttempts += attempts;
      if (this.sessionData.answers.has(contentId)) {
        correctAnswers++;
      }
    }
    
    return { completed, total, correctAnswers, totalAttempts };
  }
}

// =================== CONTENT HANDLERS ===================

interface ContentHandler {
  validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult>;
}

class MultipleChoiceHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    const isCorrect = answer === content.correctAnswer;
    
    return {
      isCorrect,
      feedback: isCorrect ? 'Correct!' : content.explanation || 'Not quite right.',
      explanation: content.explanation,
      xpAwarded: content.xp || 10,
      showHint: !isCorrect && attemptCount >= 1,
      hint: content.hint,
    };
  }
}

class TrueFalseHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    const isCorrect = answer === content.correctAnswer;
    
    return {
      isCorrect,
      feedback: isCorrect ? 'Correct!' : 'Try again!',
      explanation: content.explanation,
      xpAwarded: content.xp || 8,
      showHint: !isCorrect && attemptCount >= 1,
      hint: content.hint,
    };
  }
}

class ColorMatchHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    let isCorrect = false;
    
    if (typeof content.correctAnswer === 'number' && content.options) {
      // Answer is index into options array
      isCorrect = answer === content.options[content.correctAnswer];
    } else {
      // Direct color comparison
      isCorrect = answer === content.correctAnswer;
    }
    
    return {
      isCorrect,
      feedback: isCorrect ? 'Perfect color choice!' : 'Not the right color.',
      explanation: content.explanation,
      xpAwarded: content.xp || 15,
      showHint: !isCorrect && attemptCount >= 1,
      hint: content.hint,
    };
  }
}

class VisualSelectionHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // For image-based questions
    const isCorrect = answer === content.correctAnswer;
    
    return {
      isCorrect,
      feedback: isCorrect ? 'Great eye!' : 'Look more carefully.',
      explanation: content.explanation,
      xpAwarded: content.xp || 12,
      showHint: !isCorrect && attemptCount >= 1,
      hint: content.hint,
    };
  }
}

class DrawingExerciseHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // Validate drawing based on the exercise type
    const validation = content.validation;
    if (!validation) {
      return {
        isCorrect: true,
        feedback: 'Great practice!',
        xpAwarded: content.xp || 15,
      };
    }

    let isCorrect = false;
    let feedback = '';

    switch (validation.type) {
      case 'line_count':
        const lineCount = answer.strokes?.length || 0;
        isCorrect = lineCount >= validation.target;
        feedback = isCorrect 
          ? `Perfect! You drew ${lineCount} lines.`
          : `You need to draw ${validation.target} lines. You drew ${lineCount}.`;
        break;
        
      case 'shape_accuracy':
        const accuracy = this.calculateShapeAccuracy(answer.strokes, validation.target);
        isCorrect = accuracy >= (validation.tolerance || 0.7);
        feedback = isCorrect
          ? `Excellent ${validation.target}!`
          : `Keep practicing your ${validation.target} shape.`;
        break;
        
      case 'shape_recognition':
        const recognizedShapes = this.recognizeShapes(answer.strokes);
        const requiredShapes = validation.targets || [];
        isCorrect = requiredShapes.every(shape => recognizedShapes.includes(shape));
        feedback = isCorrect
          ? 'All shapes recognized!'
          : `Try drawing: ${requiredShapes.join(', ')}`;
        break;
        
      default:
        isCorrect = true;
        feedback = 'Good effort!';
    }

    return {
      isCorrect,
      feedback,
      explanation: content.explanation,
      xpAwarded: content.xp || 15,
      showHint: !isCorrect && attemptCount >= 1,
      hint: content.hint,
    };
  }

  private calculateShapeAccuracy(strokes: any[], targetShape: string): number {
    // Simplified shape accuracy calculation
    // In production, this would use computer vision algorithms
    if (!strokes || strokes.length === 0) return 0;
    
    const stroke = strokes[0];
    const points = stroke.points || [];
    
    if (points.length < 3) return 0;
    
    switch (targetShape) {
      case 'circle':
        return this.calculateCircleAccuracy(points);
      case 'line':
        return this.calculateLineAccuracy(points);
      case 'square':
      case 'rectangle':
        return this.calculateRectangleAccuracy(points);
      default:
        return 0.5; // Default moderate accuracy
    }
  }

  private calculateCircleAccuracy(points: any[]): number {
    // Simple circle accuracy: check if points form roughly circular pattern
    if (points.length < 10) return 0.3;
    
    // Calculate center point
    const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
    const centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    
    // Calculate average radius
    const distances = points.map(p => 
      Math.sqrt(Math.pow(p.x - centerX, 2) + Math.pow(p.y - centerY, 2))
    );
    const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    
    // Calculate variance in radius (lower = more circular)
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) / distances.length;
    const normalizedVariance = variance / (avgRadius * avgRadius);
    
    // Convert to accuracy score (0-1)
    return Math.max(0, Math.min(1, 1 - normalizedVariance * 5));
  }

  private calculateLineAccuracy(points: any[]): number {
    if (points.length < 2) return 0;
    
    const startPoint = points[0];
    const endPoint = points[points.length - 1];
    
    // Calculate how straight the line is
    const idealDistance = Math.sqrt(
      Math.pow(endPoint.x - startPoint.x, 2) + Math.pow(endPoint.y - startPoint.y, 2)
    );
    
    if (idealDistance < 10) return 0.3; // Too short
    
    // Calculate total path distance
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
      totalDistance += Math.sqrt(
        Math.pow(points[i].x - points[i-1].x, 2) + Math.pow(points[i].y - points[i-1].y, 2)
      );
    }
    
    // Straightness = ideal distance / actual distance
    const straightness = idealDistance / totalDistance;
    return Math.max(0, Math.min(1, straightness));
  }

  private calculateRectangleAccuracy(points: any[]): number {
    // Simplified rectangle detection
    if (points.length < 8) return 0.3;
    
    // For now, just check if it's roughly rectangular in bounding box
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const minY = Math.min(...points.map(p => p.y));
    const maxY = Math.max(...points.map(p => p.y));
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    if (width < 20 || height < 20) return 0.3; // Too small
    
    // Basic rectangle = has width and height
    return 0.7; // Moderate score for basic rectangle
  }

  private recognizeShapes(strokes: any[]): string[] {
    const shapes: string[] = [];
    
    for (const stroke of strokes) {
      const points = stroke.points || [];
      if (points.length < 3) continue;
      
      const circleAccuracy = this.calculateCircleAccuracy(points);
      const lineAccuracy = this.calculateLineAccuracy(points);
      const rectAccuracy = this.calculateRectangleAccuracy(points);
      
      if (circleAccuracy > 0.6) shapes.push('circle');
      else if (lineAccuracy > 0.7) shapes.push('line');
      else if (rectAccuracy > 0.6) shapes.push('rectangle');
    }
    
    return shapes;
  }
}

class GuidedStepHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // For guided steps, use drawing validation
    const drawingHandler = new DrawingExerciseHandler();
    return drawingHandler.validateAnswer(content, answer, attemptCount);
  }
}

class ShapePracticeHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // Similar to drawing exercise but focused on shapes
    const drawingHandler = new DrawingExerciseHandler();
    return drawingHandler.validateAnswer(content, answer, attemptCount);
  }
}

class VideoLessonHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // For video lessons, validate based on interaction type
    return {
      isCorrect: true,
      feedback: 'Video completed!',
      xpAwarded: content.xp || 5,
    };
  }
}

class AssessmentHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // Comprehensive assessment validation
    const isCorrect = answer === content.correctAnswer;
    
    return {
      isCorrect,
      feedback: isCorrect ? 'Excellent work!' : 'Review the material and try again.',
      explanation: content.explanation,
      xpAwarded: content.xp || 20,
      showHint: false, // No hints in assessments
    };
  }
}

class PortfolioProjectHandler implements ContentHandler {
  async validateAnswer(content: LessonContent, answer: any, attemptCount: number): Promise<ValidationResult> {
    // Portfolio projects are always "correct" but scored on effort
    return {
      isCorrect: true,
      feedback: 'Great addition to your portfolio!',
      xpAwarded: content.xp || 50,
    };
  }
}

// Export singleton instance
export const lessonEngine = LessonEngine.getInstance();