import { Platform } from 'react-native';
import { performanceMonitor } from '../core/PerformanceMonitor';
import { EventBus } from '../core/EventBus';
import { Point, Stroke } from '../../types';

/**
 * Performance Optimizer for Professional Drawing Engine
 * Maintains 60fps performance with complex artwork
 */
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private eventBus: EventBus = EventBus.getInstance();
  
  // Performance metrics
  private frameCount: number = 0;
  private lastFrameTime: number = 0;
  private frameTimeHistory: number[] = [];
  private targetFPS: number = 60;
  private targetFrameTime: number = 1000 / 60; // 16.67ms
  
  // Optimization state
  private isOptimizing: boolean = false;
  private optimizationLevel: number = 0; // 0 = none, 1 = mild, 2 = aggressive
  private deviceTier: 'high' | 'medium' | 'low' = 'high';
  
  // Rendering optimizations
  private strokeBatchSize: number = 100;
  private maxPointsPerStroke: number = 1000;
  private simplificationThreshold: number = 0.5;
  private cullingEnabled: boolean = true;
  private lodEnabled: boolean = true;
  
  // Memory management
  private memoryPressure: number = 0;
  private maxMemoryUsage: number = 512 * 1024 * 1024; // 512MB
  private strokeCacheLimit: number = 200;
  private textureAtlasSize: number = 2048;
  
  // Canvas optimization
  private maxCanvasSize: number = 4096;
  private dynamicResolution: boolean = true;
  private currentPixelRatio: number = 3;
  private minPixelRatio: number = 1;
  private maxPixelRatio: number = 3;
  
  // Brush optimization
  private brushQuality: 'high' | 'medium' | 'low' = 'high';
  private textureQuality: number = 1.0;
  private smoothingQuality: number = 1.0;
  private pressureSampling: number = 1.0;
  
  // Gesture optimization
  private inputPrediction: boolean = true;
  private inputCoalescing: boolean = true;
  private maxInputLatency: number = 8; // ms
  
  private constructor() {
    this.detectDeviceCapabilities();
    this.setupPerformanceMonitoring();
    this.setupEventListeners();
  }

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // ---- PUBLIC API ----

  public startFrame(): void {
    this.frameCount++;
    this.lastFrameTime = performance.now();
  }

  public endFrame(): void {
    const frameTime = performance.now() - this.lastFrameTime;
    this.frameTimeHistory.push(frameTime);
    
    // Keep last 60 frames for analysis
    if (this.frameTimeHistory.length > 60) {
      this.frameTimeHistory.shift();
    }
    
    // Check if optimization needed
    if (frameTime > this.targetFrameTime * 1.2) {
      this.analyzePerformance();
    }
    
    // Record metrics
    performanceMonitor.recordRenderTime(frameTime);
  }

  public optimizeStroke(stroke: Stroke): Stroke {
    // Apply optimizations based on current level
    let optimizedStroke = { ...stroke };
    
    if (this.optimizationLevel > 0) {
      // Simplify stroke points
      optimizedStroke.points = this.simplifyPoints(
        stroke.points, 
        this.simplificationThreshold * this.optimizationLevel
      );
      
      // Limit points per stroke
      if (optimizedStroke.points.length > this.maxPointsPerStroke) {
        optimizedStroke.points = this.decimatePoints(
          optimizedStroke.points,
          this.maxPointsPerStroke
        );
      }
    }
    
    return optimizedStroke;
  }

  public shouldRenderStroke(stroke: Stroke, viewport: any): boolean {
    if (!this.cullingEnabled) return true;
    
    // Frustum culling - check if stroke is in viewport
    const bounds = this.getStrokeBounds(stroke);
    return this.isInViewport(bounds, viewport);
  }

  public getOptimalPixelRatio(): number {
    if (!this.dynamicResolution) return this.currentPixelRatio;
    
    // Adjust pixel ratio based on performance
    const avgFrameTime = this.getAverageFrameTime();
    
    if (avgFrameTime > this.targetFrameTime * 1.5 && this.currentPixelRatio > this.minPixelRatio) {
      this.currentPixelRatio = Math.max(this.minPixelRatio, this.currentPixelRatio - 0.5);
      console.log(`Reducing pixel ratio to ${this.currentPixelRatio} for performance`);
    } else if (avgFrameTime < this.targetFrameTime * 0.8 && this.currentPixelRatio < this.maxPixelRatio) {
      this.currentPixelRatio = Math.min(this.maxPixelRatio, this.currentPixelRatio + 0.5);
      console.log(`Increasing pixel ratio to ${this.currentPixelRatio} for quality`);
    }
    
    return this.currentPixelRatio;
  }

  public getOptimalBrushSettings(): any {
    return {
      quality: this.brushQuality,
      textureQuality: this.textureQuality,
      smoothingQuality: this.smoothingQuality,
      pressureSampling: this.pressureSampling,
      useTexture: this.brushQuality === 'high',
      useAdvancedBlending: this.brushQuality !== 'low',
      maxTextureSize: this.brushQuality === 'high' ? 512 : 256,
    };
  }

  public predictNextPoint(currentPoint: Point, lastPoint: Point | null, velocity: number): Point | null {
    if (!this.inputPrediction || !lastPoint) return null;
    
    // Simple linear prediction
    const dx = currentPoint.x - lastPoint.x;
    const dy = currentPoint.y - lastPoint.y;
    
    // Predict based on velocity
    const predictionFactor = Math.min(velocity / 100, 1) * 0.5;
    
    return {
      x: currentPoint.x + dx * predictionFactor,
      y: currentPoint.y + dy * predictionFactor,
      pressure: currentPoint.pressure,
      tiltX: currentPoint.tiltX,
      tiltY: currentPoint.tiltY,
      timestamp: currentPoint.timestamp + 8, // Predict 8ms ahead
    };
  }

  public coalesceInputPoints(points: Point[]): Point[] {
    if (!this.inputCoalescing || points.length < 3) return points;
    
    // Combine nearby points to reduce processing
    const coalescedPoints: Point[] = [points[0]];
    const threshold = 2; // pixels
    
    for (let i = 1; i < points.length - 1; i++) {
      const lastPoint = coalescedPoints[coalescedPoints.length - 1];
      const currentPoint = points[i];
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - lastPoint.x, 2) +
        Math.pow(currentPoint.y - lastPoint.y, 2)
      );
      
      if (distance > threshold) {
        coalescedPoints.push(currentPoint);
      } else {
        // Merge pressure values
        lastPoint.pressure = (lastPoint.pressure + currentPoint.pressure) / 2;
      }
    }
    
    // Always include last point
    coalescedPoints.push(points[points.length - 1]);
    
    return coalescedPoints;
  }

  public getMemoryUsage(): number {
    return this.memoryPressure;
  }

  public setOptimizationLevel(level: 0 | 1 | 2): void {
    this.optimizationLevel = level;
    this.applyOptimizationSettings();
    this.eventBus.emit('performance:optimizationChanged', { level });
  }

  public getPerformanceStats(): any {
    return {
      averageFPS: this.getAverageFPS(),
      averageFrameTime: this.getAverageFrameTime(),
      optimizationLevel: this.optimizationLevel,
      deviceTier: this.deviceTier,
      memoryPressure: this.memoryPressure,
      currentPixelRatio: this.currentPixelRatio,
      brushQuality: this.brushQuality,
    };
  }

  // ---- PRIVATE METHODS ----

  private detectDeviceCapabilities(): void {
    // Detect device tier based on various factors
    const ram = this.getDeviceRAM();
    const cores = this.getDeviceCores();
    
    if (ram >= 6 && cores >= 8) {
      this.deviceTier = 'high';
      this.maxCanvasSize = 8192;
      this.textureAtlasSize = 4096;
      this.maxPixelRatio = 3;
    } else if (ram >= 4 && cores >= 4) {
      this.deviceTier = 'medium';
      this.maxCanvasSize = 4096;
      this.textureAtlasSize = 2048;
      this.maxPixelRatio = 2;
    } else {
      this.deviceTier = 'low';
      this.maxCanvasSize = 2048;
      this.textureAtlasSize = 1024;
      this.maxPixelRatio = 1.5;
      this.setOptimizationLevel(1); // Start with mild optimization
    }
    
    console.log(`Device tier detected: ${this.deviceTier} (RAM: ${ram}GB, Cores: ${cores})`);
  }

  private getDeviceRAM(): number {
    // Platform-specific RAM detection
    if (Platform.OS === 'ios') {
      // iOS doesn't expose RAM directly, estimate based on model
      return 4; // Conservative estimate
    } else {
      // Android - would use native module
      return 4; // Conservative estimate
    }
  }

  private getDeviceCores(): number {
    // Would use native module to get actual core count
    return 4; // Conservative estimate
  }

  private setupPerformanceMonitoring(): void {
    // Monitor frame rate every second
    setInterval(() => {
      if (this.frameCount > 0) {
        const fps = this.frameCount;
        this.frameCount = 0;
        
        if (fps < 50 && !this.isOptimizing) {
          console.warn(`Low FPS detected: ${fps}`);
          this.optimizeForPerformance();
        } else if (fps > 58 && this.optimizationLevel > 0) {
          // Consider reducing optimization
          this.considerQualityImprovement();
        }
      }
    }, 1000);
  }

  private setupEventListeners(): void {
    // Listen for memory warnings
    this.eventBus.on('system:memoryWarning', () => {
      this.handleMemoryPressure();
    });
    
    // Listen for app state changes
    this.eventBus.on('app:background', () => {
      this.handleAppBackground();
    });
    
    this.eventBus.on('app:foreground', () => {
      this.handleAppForeground();
    });
  }

  private analyzePerformance(): void {
    const avgFrameTime = this.getAverageFrameTime();
    const maxFrameTime = Math.max(...this.frameTimeHistory);
    
    console.log(`Performance: Avg ${avgFrameTime.toFixed(2)}ms, Max ${maxFrameTime.toFixed(2)}ms`);
    
    if (avgFrameTime > this.targetFrameTime * 1.5) {
      this.optimizeForPerformance();
    }
  }

  private optimizeForPerformance(): void {
    if (this.isOptimizing) return;
    
    this.isOptimizing = true;
    
    if (this.optimizationLevel < 2) {
      this.setOptimizationLevel((this.optimizationLevel + 1) as 0 | 1 | 2);
    } else {
      // Already at max optimization, try other strategies
      this.applyAggressiveOptimizations();
    }
    
    setTimeout(() => {
      this.isOptimizing = false;
    }, 1000);
  }

  private considerQualityImprovement(): void {
    if (this.optimizationLevel > 0) {
      const avgFrameTime = this.getAverageFrameTime();
      
      if (avgFrameTime < this.targetFrameTime * 0.7) {
        // Performance is good, reduce optimization
        this.setOptimizationLevel((this.optimizationLevel - 1) as 0 | 1 | 2);
      }
    }
  }

  private applyOptimizationSettings(): void {
    switch (this.optimizationLevel) {
      case 0: // No optimization
        this.strokeBatchSize = 100;
        this.maxPointsPerStroke = 1000;
        this.simplificationThreshold = 0.5;
        this.brushQuality = 'high';
        this.textureQuality = 1.0;
        this.smoothingQuality = 1.0;
        this.pressureSampling = 1.0;
        this.inputPrediction = true;
        this.inputCoalescing = true;
        break;
        
      case 1: // Mild optimization
        this.strokeBatchSize = 50;
        this.maxPointsPerStroke = 500;
        this.simplificationThreshold = 1.0;
        this.brushQuality = 'medium';
        this.textureQuality = 0.8;
        this.smoothingQuality = 0.8;
        this.pressureSampling = 0.8;
        this.inputPrediction = true;
        this.inputCoalescing = true;
        break;
        
      case 2: // Aggressive optimization
        this.strokeBatchSize = 25;
        this.maxPointsPerStroke = 250;
        this.simplificationThreshold = 2.0;
        this.brushQuality = 'low';
        this.textureQuality = 0.5;
        this.smoothingQuality = 0.5;
        this.pressureSampling = 0.5;
        this.inputPrediction = false;
        this.inputCoalescing = true;
        break;
    }
  }

  private applyAggressiveOptimizations(): void {
    console.warn('Applying aggressive optimizations');
    
    // Reduce canvas resolution
    if (this.currentPixelRatio > this.minPixelRatio) {
      this.currentPixelRatio = this.minPixelRatio;
    }
    
    // Disable expensive features
    this.cullingEnabled = true;
    this.lodEnabled = true;
    this.dynamicResolution = true;
    
    // Reduce memory usage
    this.strokeCacheLimit = 50;
    
    this.eventBus.emit('performance:aggressiveOptimization');
  }

  private simplifyPoints(points: Point[], tolerance: number): Point[] {
    if (points.length < 3) return points;
    
    // Douglas-Peucker algorithm for line simplification
    const simplified = this.douglasPeucker(points, tolerance);
    
    // Ensure we keep important points (high pressure changes, etc.)
    return this.preserveImportantPoints(simplified, points);
  }

  private douglasPeucker(points: Point[], epsilon: number): Point[] {
    if (points.length < 3) return points;
    
    // Find point with maximum distance from line
    let maxDistance = 0;
    let maxIndex = 0;
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(
        points[i],
        points[0],
        points[points.length - 1]
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }
    
    // If max distance is greater than epsilon, recursively simplify
    if (maxDistance > epsilon) {
      const left = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
      const right = this.douglasPeucker(points.slice(maxIndex), epsilon);
      
      return [...left.slice(0, -1), ...right];
    } else {
      return [points[0], points[points.length - 1]];
    }
  }

  private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        Math.pow(point.x - lineStart.x, 2) +
        Math.pow(point.y - lineStart.y, 2)
      );
    }
    
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / 
              (dx * dx + dy * dy);
    
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    
    return Math.sqrt(
      Math.pow(point.x - projX, 2) +
      Math.pow(point.y - projY, 2)
    );
  }

  private preserveImportantPoints(simplified: Point[], original: Point[]): Point[] {
    // Add back points with significant pressure changes
    const result = [...simplified];
    
    for (let i = 1; i < original.length - 1; i++) {
      const prevPressure = original[i - 1].pressure || 0.5;
      const currentPressure = original[i].pressure || 0.5;
      const nextPressure = original[i + 1].pressure || 0.5;
      
      const pressureChange = Math.abs(currentPressure - prevPressure) + 
                           Math.abs(nextPressure - currentPressure);
      
      if (pressureChange > 0.3) {
        // This is an important point, ensure it's included
        const exists = result.some(p => 
          Math.abs(p.x - original[i].x) < 1 && 
          Math.abs(p.y - original[i].y) < 1
        );
        
        if (!exists) {
          result.push(original[i]);
        }
      }
    }
    
    // Sort by timestamp
    return result.sort((a, b) => a.timestamp - b.timestamp);
  }

  private decimatePoints(points: Point[], targetCount: number): Point[] {
    if (points.length <= targetCount) return points;
    
    const step = Math.floor(points.length / targetCount);
    const decimated: Point[] = [];
    
    for (let i = 0; i < points.length; i += step) {
      decimated.push(points[i]);
    }
    
    // Always include last point
    if (decimated[decimated.length - 1] !== points[points.length - 1]) {
      decimated.push(points[points.length - 1]);
    }
    
    return decimated;
  }

  private getStrokeBounds(stroke: Stroke): any {
    if (stroke.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }
    
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    
    // Add stroke size to bounds
    const padding = stroke.size / 2;
    
    return {
      x: minX - padding,
      y: minY - padding,
      width: maxX - minX + stroke.size,
      height: maxY - minY + stroke.size,
    };
  }

  private isInViewport(bounds: any, viewport: any): boolean {
    return !(
      bounds.x + bounds.width < viewport.x ||
      bounds.x > viewport.x + viewport.width ||
      bounds.y + bounds.height < viewport.y ||
      bounds.y > viewport.y + viewport.height
    );
  }

  private handleMemoryPressure(): void {
    console.warn('Memory pressure detected, optimizing...');
    
    this.memoryPressure = 0.8;
    
    // Reduce cache limits
    this.strokeCacheLimit = Math.floor(this.strokeCacheLimit * 0.5);
    
    // Reduce texture quality
    this.textureQuality = Math.max(0.5, this.textureQuality * 0.8);
    
    // Force optimization
    if (this.optimizationLevel < 2) {
      this.setOptimizationLevel(2);
    }
    
    this.eventBus.emit('performance:memoryPressure');
  }

  private handleAppBackground(): void {
    // Reduce resource usage in background
    this.setOptimizationLevel(2);
    this.dynamicResolution = false;
    this.currentPixelRatio = this.minPixelRatio;
  }

  private handleAppForeground(): void {
    // Restore performance settings
    this.dynamicResolution = true;
    
    // Gradually restore quality
    setTimeout(() => {
      if (this.getAverageFPS() > 55) {
        this.setOptimizationLevel(0);
      }
    }, 1000);
  }

  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  private getAverageFPS(): number {
    const avgFrameTime = this.getAverageFrameTime();
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 60;
  }

  // ---- PUBLIC UTILITIES ----

  public static measurePerformance<T>(
    operation: () => T,
    label: string
  ): T {
    const start = performance.now();
    const result = operation();
    const duration = performance.now() - start;
    
    if (duration > 16) {
      console.warn(`${label} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  }

  public static debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  public static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();