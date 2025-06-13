// src/engines/drawing/index.ts

// Core engines
export { valkyrieEngine, ValkyrieEngine } from './ValkyrieEngine';
export { brushEngine, BrushEngine } from './BrushEngine';
export { layerManager, LayerManager } from './LayerManager';
export { colorManager, ColorManager } from './ColorManager';
export { gestureRecognizer, GestureRecognizer } from './GestureRecognizer';
export { transformManager, TransformManager } from './TransformManager';

// Main canvas component
export { ProfessionalCanvas } from './ProfessionalCanvas';
export type { ProfessionalCanvasProps } from './ProfessionalCanvas';

// Re-export all drawing types
export * from '../../types/drawing';