// src/engines/drawing/index.ts

// Core engines
export { valkyrieEngine, ValkyrieEngine } from './ValkyrieEngine';
export { brushEngine, BrushEngine } from './BrushEngine';
export { layerManager, LayerManager } from './LayerManager';
export { colorManager, ColorManager } from './ColorManager';
export { gestureRecognizer, GestureRecognizer } from './GestureRecognizer';
export { transformManager, TransformManager } from './TransformManager';
export { performanceOptimizer, PerformanceOptimizer } from './PerformanceOptimizer';

// Main canvas component
export { ProfessionalCanvas } from './ProfessionalCanvas';

// Define the props type here instead of importing it
export interface ProfessionalCanvasProps {
  width?: number;
  height?: number;
  onReady?: () => void;
  onStrokeStart?: (stroke: any) => void;
  onStrokeUpdate?: (stroke: any) => void;
  onStrokeEnd?: (stroke: any) => void;
  settings?: any;
}

// Re-export compatibility layer
export * from './SkiaCompatibility';

// Re-export all drawing types
export type * from '../../types/drawing';