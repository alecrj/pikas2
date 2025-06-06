/**
 * Core Engine Module
 * Provides foundational services for performance, error handling, and data management
 */

export { PerformanceMonitor, performanceMonitor } from './PerformanceMonitor';
export { ErrorHandler, errorHandler, withErrorBoundary } from './ErrorHandler';
export { DataManager, dataManager } from './DataManager';

// Re-export types
export type { PerformanceMetrics, AppError } from '../../types';

// Core engine initialization
export const initializeCoreEngine = async (): Promise<void> => {
  // Initialize all core services
  console.log('🚀 Initializing Pikaso Core Engine...');
  
  // Performance monitoring starts automatically
  // Error handling is set up automatically
  // Data manager initializes cache automatically
  
  // Any additional initialization can go here
  console.log('✅ Core Engine initialized successfully');
};

// Utility functions for engine management
export const getCoreEngineStatus = () => {
  return {
    performance: performanceMonitor.getMetrics(),
    cache: dataManager.getCacheStats(),
    initialized: true,
  };
};

export const shutdownCoreEngine = async (): Promise<void> => {
  // Cleanup operations
  performanceMonitor.destroy();
  await dataManager.clearAllData();
  console.log('🛑 Core Engine shutdown complete');
};