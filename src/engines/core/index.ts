// Core engine exports and initialization
export { ErrorHandler, errorHandler } from './ErrorHandler';
export { ErrorBoundary, withErrorBoundary } from './ErrorBoundary';
export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
export { DataManager, dataManager } from './DataManager';
export { EventBus, eventBus } from './EventBus';

// FIXED: Added missing initialization functions
export const initializeCoreEngine = async (): Promise<void> => {
  try {
    // Initialize performance monitoring
    if (typeof window !== 'undefined') {
      const { performanceMonitor } = await import('./PerformanceMonitor');
      performanceMonitor.initialize();
    }
    
    // Initialize error handling
    const { errorHandler } = await import('./ErrorHandler');
    errorHandler.initialize();
    
    // Initialize event bus
    const { eventBus } = await import('./EventBus');
    // Event bus initializes automatically as singleton
    
    console.log('Core engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize core engine:', error);
    throw error;
  }
};

// Additional initialization helpers
export const initializeStorage = async (): Promise<void> => {
  try {
    const { dataManager } = await import('./DataManager');
    // DataManager initializes automatically as singleton
    console.log('Storage system initialized');
  } catch (error) {
    console.error('Failed to initialize storage:', error);
    throw error;
  }
};

export const initializeErrorHandling = async (): Promise<void> => {
  try {
    const { errorHandler } = await import('./ErrorHandler');
    errorHandler.initialize();
    console.log('Error handling initialized');
  } catch (error) {
    console.error('Failed to initialize error handling:', error);
    throw error;
  }
};