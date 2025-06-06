/**
 * Core Engine
 * Handles system-wide performance, error handling, and data management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PerformanceMetrics, ErrorLog, StorageKeys, AppEvent, AppEventType } from '../../types';

// Performance Monitor
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private frameCount = 0;
  private lastFrameTime = 0;
  private isMonitoring = false;
  private animationFrameId: number | null = null;

  private constructor() {}

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.lastFrameTime = performance.now();
    this.monitor();
  }

  stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private monitor = (): void => {
    if (!this.isMonitoring) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastFrameTime;
    const fps = 1000 / frameTime;

    this.frameCount++;

    // Record metrics every 60 frames (roughly 1 second at 60fps)
    if (this.frameCount % 60 === 0) {
      const metric: PerformanceMetrics = {
        fps: Math.round(fps),
        frameTime: Math.round(frameTime * 100) / 100,
        memoryUsage: this.getMemoryUsage(),
        cpuUsage: 0, // Placeholder - requires native module
        drawCalls: 0, // Will be updated by drawing engine
        timestamp: new Date()
      };

      this.metrics.push(metric);
      
      // Keep only last 100 metrics
      if (this.metrics.length > 100) {
        this.metrics.shift();
      }

      // Warn if FPS drops below 30
      if (fps < 30) {
        console.warn('Performance warning: FPS dropped below 30', metric);
      }
    }

    this.lastFrameTime = currentTime;
    this.animationFrameId = requestAnimationFrame(this.monitor);
  };

  private getMemoryUsage(): number {
    // @ts-ignore - performance.memory is Chrome-specific
    if (performance.memory) {
      // @ts-ignore
      return Math.round(performance.memory.usedJSHeapSize / 1048576); // Convert to MB
    }
    return 0;
  }

  getMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  getAverageFPS(): number {
    if (this.metrics.length === 0) return 60;
    const sum = this.metrics.reduce((acc, m) => acc + m.fps, 0);
    return Math.round(sum / this.metrics.length);
  }

  reset(): void {
    this.metrics = [];
    this.frameCount = 0;
  }
}

// Error Handler
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLogs: ErrorLog[] = [];
  private errorCallbacks: ((error: ErrorLog) => void)[] = [];

  private constructor() {
    this.setupGlobalErrorHandling();
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  private setupGlobalErrorHandling(): void {
    // Handle unhandled promise rejections
    const originalHandler = global.onunhandledrejection;
    global.onunhandledrejection = (event: any) => {
      this.logError({
        message: 'Unhandled Promise Rejection',
        severity: 'high',
        context: { reason: event.reason }
      });
      
      if (originalHandler) {
        originalHandler.call(global, event);
      }
    };

    // Handle global errors
    const originalErrorHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
      this.logError({
        message: error.message,
        stack: error.stack,
        severity: isFatal ? 'critical' : 'high',
        context: { isFatal }
      });

      if (originalErrorHandler) {
        originalErrorHandler(error, isFatal);
      }
    });
  }

  logError(params: {
    message: string;
    stack?: string;
    context?: any;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): void {
    const errorLog: ErrorLog = {
      id: this.generateId(),
      message: params.message,
      stack: params.stack,
      context: params.context,
      severity: params.severity,
      timestamp: new Date(),
      resolved: false
    };

    this.errorLogs.push(errorLog);
    
    // Keep only last 50 errors
    if (this.errorLogs.length > 50) {
      this.errorLogs.shift();
    }

    // Notify callbacks
    this.errorCallbacks.forEach(callback => callback(errorLog));

    // Log to console in development
    if (__DEV__) {
      console.error(`[${params.severity.toUpperCase()}]`, params.message, params.context);
    }

    // Save to storage for crash reporting
    this.saveErrorLogs();
  }

  private async saveErrorLogs(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'pikaso_error_logs',
        JSON.stringify(this.errorLogs)
      );
    } catch (error) {
      console.error('Failed to save error logs:', error);
    }
  }

  onError(callback: (error: ErrorLog) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  getErrors(severity?: 'low' | 'medium' | 'high' | 'critical'): ErrorLog[] {
    if (severity) {
      return this.errorLogs.filter(log => log.severity === severity);
    }
    return [...this.errorLogs];
  }

  clearErrors(): void {
    this.errorLogs = [];
    this.saveErrorLogs();
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Data Manager
export class DataManager {
  private static instance: DataManager;
  private cache: Map<string, any> = new Map();
  private offlineQueue: any[] = [];

  private constructor() {
    this.loadOfflineQueue();
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  async save(key: string, data: any): Promise<void> {
    try {
      const serialized = JSON.stringify(data);
      await AsyncStorage.setItem(key, serialized);
      this.cache.set(key, data);
    } catch (error) {
      ErrorHandler.getInstance().logError({
        message: 'Failed to save data',
        context: { key, error },
        severity: 'medium'
      });
      throw error;
    }
  }

  async load<T>(key: string): Promise<T | null> {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        return this.cache.get(key) as T;
      }

      const serialized = await AsyncStorage.getItem(key);
      if (serialized) {
        const data = JSON.parse(serialized) as T;
        this.cache.set(key, data);
        return data;
      }
      return null;
    } catch (error) {
      ErrorHandler.getInstance().logError({
        message: 'Failed to load data',
        context: { key, error },
        severity: 'medium'
      });
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      this.cache.delete(key);
    } catch (error) {
      ErrorHandler.getInstance().logError({
        message: 'Failed to delete data',
        context: { key, error },
        severity: 'low'
      });
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
      this.cache.clear();
    } catch (error) {
      ErrorHandler.getInstance().logError({
        message: 'Failed to clear data',
        context: { error },
        severity: 'high'
      });
    }
  }

  // Offline queue management
  queueForSync(data: any): void {
    this.offlineQueue.push({
      id: this.generateId(),
      data,
      timestamp: new Date(),
      attempts: 0
    });
    this.saveOfflineQueue();
  }

  async processOfflineQueue(processor: (item: any) => Promise<boolean>): Promise<void> {
    const failedItems: any[] = [];

    for (const item of this.offlineQueue) {
      try {
        const success = await processor(item.data);
        if (!success) {
          item.attempts++;
          if (item.attempts < 3) {
            failedItems.push(item);
          }
        }
      } catch (error) {
        item.attempts++;
        if (item.attempts < 3) {
          failedItems.push(item);
        }
      }
    }

    this.offlineQueue = failedItems;
    await this.saveOfflineQueue();
  }

  private async loadOfflineQueue(): Promise<void> {
    const queue = await this.load<any[]>('pikaso_offline_queue');
    if (queue) {
      this.offlineQueue = queue;
    }
  }

  private async saveOfflineQueue(): Promise<void> {
    await this.save('pikaso_offline_queue', this.offlineQueue);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Event Bus
export class EventBus {
  private static instance: EventBus;
  private listeners: Map<AppEventType, ((event: AppEvent) => void)[]> = new Map();
  private eventHistory: AppEvent[] = [];

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  emit(type: AppEventType, payload: any): void {
    const event: AppEvent = {
      type,
      payload,
      timestamp: new Date()
    };

    this.eventHistory.push(event);
    
    // Keep only last 100 events
    if (this.eventHistory.length > 100) {
      this.eventHistory.shift();
    }

    const listeners = this.listeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        ErrorHandler.getInstance().logError({
          message: 'Event listener error',
          context: { type, error },
          severity: 'medium'
        });
      }
    });

    // Log important events
    if (__DEV__) {
      console.log(`[Event] ${type}`, payload);
    }
  }

  on(type: AppEventType, listener: (event: AppEvent) => void): () => void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);

    // Return unsubscribe function
    return () => {
      const updatedListeners = this.listeners.get(type) || [];
      const index = updatedListeners.indexOf(listener);
      if (index > -1) {
        updatedListeners.splice(index, 1);
        this.listeners.set(type, updatedListeners);
      }
    };
  }

  getHistory(type?: AppEventType): AppEvent[] {
    if (type) {
      return this.eventHistory.filter(event => event.type === type);
    }
    return [...this.eventHistory];
  }
}

// Export singleton instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const errorHandler = ErrorHandler.getInstance();
export const dataManager = DataManager.getInstance();
export const eventBus = EventBus.getInstance();