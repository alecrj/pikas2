// src/engines/drawing/index.ts
export { ProfessionalCanvas } from './ProfessionalCanvas';
export { BrushEngine } from './BrushEngine';
export { PerformanceOptimizer } from './PerformanceOptimizer';

export async function initializeDrawingEngine(): Promise<void> {
  try {
    // Drawing engine doesn't need explicit initialization
    console.log('Drawing engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize drawing engine:', error);
    throw error;
  }
}
