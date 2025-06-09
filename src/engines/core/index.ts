// src/engines/core/index.ts
export { ErrorHandler, errorHandler } from './ErrorHandler';
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
export { DataManager, dataManager } from './DataManager';
export { EventBus, eventBus } from './EventBus';

export async function initializeCoreEngine(): Promise<void> {
  try {
    // Initialize performance monitoring
    performanceMonitor.startMonitoring();
    
    // Initialize error handler
    errorHandler.initialize();
    
    console.log('Core engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize core engine:', error);
    throw error;
  }
}