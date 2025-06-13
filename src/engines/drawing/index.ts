// src/engines/drawing/index.ts - FIXED EXPORTS

// Core engines
export { valkyrieEngine, ValkyrieEngine } from './ValkyrieEngine';
export { brushEngine, BrushEngine } from './BrushEngine';
export { layerManager, LayerManager } from './LayerManager';
export { colorManager, ColorManager } from './ColorManager';
export { gestureRecognizer, GestureRecognizer } from './GestureRecognizer';
export { transformManager, TransformManager } from './TransformManager';

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

// Re-export all drawing types
export * from '../../types/drawing';