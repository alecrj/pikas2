import { PerformanceMetrics } from '../../types';

/**
 * High-performance monitoring system for maintaining 60fps drawing experience
 * Tracks frame rates, memory usage, and provides optimization recommendations
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics;
  private frameStartTime: number = 0;
  private frameCount: number = 0;
  private lastFPSUpdate: number = 0;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();
  private rafId: number | null = null;
  private isInitialized: boolean = false;
  
  private performanceThresholds = {
    targetFPS: 60,
    minAcceptableFPS: 30,
    maxFrameTime: 16.67, // 60fps target
    maxMemoryUsage: 150 * 1024 * 1024, // 150MB
    maxDrawCalls: 1000,
    maxInputLatency: 16, // 1 frame
  };

  private constructor() {
    this.metrics = {
      fps: 60,
      frameTime: 0,
      memoryUsage: 0,
      drawCalls: 0,
      inputLatency: 0,
      renderTime: 0,
    };
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  // FIXED: Added missing initialize method
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }
    
    this.startMonitoring();
    this.isInitialized = true;
    console.log('PerformanceMonitor initialized');
  }

  // FIXED: Made startMonitoring public and renamed internal method
  public startMonitoring(): void {
    if (this.rafId) {
      // Already monitoring
      return;
    }

    this.beginMonitoringLoop();
  }

  private beginMonitoringLoop(): void {
    const monitor = () => {
      const now = performance.now();
      
      // Calculate frame time
      if (this.frameStartTime) {
        const frameTime = now - this.frameStartTime;
        this.metrics.frameTime = frameTime;
        
        // Update FPS every second
        this.frameCount++;
        if (now - this.lastFPSUpdate >= 1000) {
          this.metrics.fps = Math.round((this.frameCount * 1000) / (now - this.lastFPSUpdate));
          this.frameCount = 0;
          this.lastFPSUpdate = now;
          
          // Update memory usage if available
          if ('memory' in performance) {
            this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize;
          }
          
          // Notify observers
          this.notifyObservers();
          
          // Check for performance issues
          this.checkPerformance();
        }
      }
      
      this.frameStartTime = now;
      this.rafId = requestAnimationFrame(monitor);
    };
    
    monitor();
  }

  private checkPerformance(): void {
    const { fps, memoryUsage, frameTime, drawCalls, inputLatency } = this.metrics;
    
    // Critical performance issues
    if (fps < this.performanceThresholds.minAcceptableFPS) {
      this.handleCriticalPerformance();
    }
    
    // Memory warnings
    if (memoryUsage > this.performanceThresholds.maxMemoryUsage) {
      this.handleMemoryWarning();
    }
    
    // Frame time issues
    if (frameTime > this.performanceThresholds.maxFrameTime * 1.5) {
      this.handleFrameDrops();
    }
    
    // Input latency issues
    if (inputLatency > this.performanceThresholds.maxInputLatency) {
      this.handleInputLatency();
    }
  }

  private handleCriticalPerformance(): void {
    console.warn('Critical performance issue detected:', {
      fps: this.metrics.fps,
      frameTime: this.metrics.frameTime,
      recommendation: 'Reduce active layers or drawing complexity',
    });
    
    // Emit performance degradation event
    this.emitPerformanceEvent('critical', {
      type: 'low_fps',
      metrics: this.metrics,
    });
  }

  private handleMemoryWarning(): void {
    console.warn('High memory usage detected:', {
      usage: this.metrics.memoryUsage,
      recommendation: 'Clear undo history or merge layers',
    });
    
    this.emitPerformanceEvent('warning', {
      type: 'high_memory',
      metrics: this.metrics,
    });
  }

  private handleFrameDrops(): void {
    this.emitPerformanceEvent('warning', {
      type: 'frame_drops',
      metrics: this.metrics,
    });
  }

  private handleInputLatency(): void {
    this.emitPerformanceEvent('warning', {
      type: 'input_latency',
      metrics: this.metrics,
    });
  }

  private emitPerformanceEvent(severity: 'warning' | 'critical', data: any): void {
    // This would integrate with error tracking service
    if (typeof window !== 'undefined' && (window as any).performanceEventHandler) {
      (window as any).performanceEventHandler({ severity, ...data });
    }
  }

  public recordDrawCall(): void {
    this.metrics.drawCalls++;
  }

  public resetDrawCalls(): void {
    this.metrics.drawCalls = 0;
  }

  public recordInputLatency(latency: number): void {
    this.metrics.inputLatency = latency;
  }

  public recordRenderTime(time: number): void {
    this.metrics.renderTime = time;
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(callback);
    return () => this.observers.delete(callback);
  }

  private notifyObservers(): void {
    this.observers.forEach(callback => callback(this.getMetrics()));
  }

  public destroy(): void {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.observers.clear();
    this.isInitialized = false;
  }

  // Performance optimization utilities
  public shouldReduceQuality(): boolean {
    return this.metrics.fps < this.performanceThresholds.minAcceptableFPS;
  }

  public getQualityLevel(): 'high' | 'medium' | 'low' {
    if (this.metrics.fps >= this.performanceThresholds.targetFPS * 0.9) {
      return 'high';
    } else if (this.metrics.fps >= this.performanceThresholds.minAcceptableFPS) {
      return 'medium';
    }
    return 'low';
  }

  public getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    
    if (this.metrics.fps < this.performanceThresholds.targetFPS) {
      suggestions.push('Consider reducing canvas resolution or layer count');
    }
    
    if (this.metrics.memoryUsage > this.performanceThresholds.maxMemoryUsage * 0.8) {
      suggestions.push('Memory usage is high. Clear undo history or merge layers');
    }
    
    if (this.metrics.drawCalls > this.performanceThresholds.maxDrawCalls * 0.8) {
      suggestions.push('Too many draw calls. Consider layer optimization');
    }
    
    if (this.metrics.inputLatency > this.performanceThresholds.maxInputLatency) {
      suggestions.push('Input latency detected. Optimize touch event handling');
    }
    
    return suggestions;
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();