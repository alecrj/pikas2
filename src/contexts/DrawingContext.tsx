import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { 
  DrawingState, 
  Brush, 
  Layer, 
  Color,
  Point,
  Stroke
} from '../types';
import { ProfessionalCanvas } from '../engines/drawing';
import { BrushEngine } from '../engines/drawing';
import { performanceMonitor } from '../engines/core/PerformanceMonitor';
import { errorHandler } from '../engines/core/ErrorHandler';
import * as Haptics from 'expo-haptics';

/**
 * Drawing Context - Manages professional drawing state and tools
 * Handles layers, brushes, colors, and drawing operations
 */

interface DrawingContextValue {
  // Canvas state
  canvas: ProfessionalCanvas | null;
  isReady: boolean;
  canvasSize: { width: number; height: number };
  zoom: number;
  pan: { x: number; y: number };
  
  // Drawing state
  currentTool: DrawingState['currentTool'];
  currentBrush: Brush;
  currentColor: Color;
  isDrawing: boolean;
  pressure: number;
  tilt: { x: number; y: number };
  
  // Layers
  layers: Layer[];
  activeLayerId: string;
  
  // Brushes
  availableBrushes: Brush[];
  
  // History
  canUndo: boolean;
  canRedo: boolean;
  
  // Actions
  initializeCanvas: (canvasElement: HTMLCanvasElement) => void;
  setTool: (tool: DrawingState['currentTool']) => void;
  setBrush: (brushId: string) => void;
  setColor: (color: Color) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  
  // Drawing operations
  startStroke: (point: Point) => void;
  addPoint: (point: Point) => void;
  endStroke: () => void;
  
  // Layer operations
  addLayer: (name?: string) => void;
  deleteLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  toggleLayerVisibility: (layerId: string) => void;
  setLayerOpacity: (layerId: string, opacity: number) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  mergeLayerDown: (layerId: string) => void;
  
  // Canvas operations
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  clear: () => void;
  
  // History operations
  undo: () => void;
  redo: () => void;
  
  // Export operations
  exportImage: (format?: 'png' | 'jpeg', quality?: number) => Promise<Blob>;
  saveDrawing: () => Promise<void>;
  loadDrawing: (drawingId: string) => Promise<void>;
}

const DrawingContext = createContext<DrawingContextValue | undefined>(undefined);

export const DrawingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const canvasRef = useRef<ProfessionalCanvas | null>(null);
  const brushEngineRef = useRef<BrushEngine>(new BrushEngine());
  
  const [isReady, setIsReady] = useState(false);
  const [drawingState, setDrawingState] = useState<DrawingState>({
    currentTool: 'brush',
    currentBrush: brushEngineRef.current.getActiveBrush(),
    currentColor: {
      hex: '#000000',
      rgb: { r: 0, g: 0, b: 0 },
      hsb: { h: 0, s: 0, b: 0 },
      alpha: 1,
    },
    layers: [],
    activeLayerId: '',
    history: [],
    historyIndex: -1,
    canvas: {
      width: 1024,
      height: 1024,
      zoom: 1,
      rotation: 0,
      offset: { x: 0, y: 0 },
      isDrawing: false,
      pressure: 1,
      tilt: { x: 0, y: 0 },
    },
  });
  
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize brush engine
  useEffect(() => {
    brushEngineRef.current.loadCustomBrushes();
  }, []);

  // Update undo/redo availability
  useEffect(() => {
    setCanUndo(drawingState.historyIndex >= 0);
    setCanRedo(drawingState.historyIndex < drawingState.history.length - 1);
  }, [drawingState.historyIndex, drawingState.history.length]);

  const initializeCanvas = (canvasElement: HTMLCanvasElement) => {
    try {
      const canvas = new ProfessionalCanvas();
      canvas.initialize(canvasElement);
      canvasRef.current = canvas;
      
      // Set initial drawing state
      const initialState = canvas.getState();
      setDrawingState(prev => ({
        ...prev,
        layers: initialState.layers,
        activeLayerId: initialState.activeLayerId,
        canvas: {
          ...prev.canvas,
          width: initialState.canvasSize.width,
          height: initialState.canvasSize.height,
          zoom: initialState.zoom,
          offset: initialState.pan,
        },
      }));
      
      setIsReady(true);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.drawingError('Failed to initialize canvas', error)
      );
    }
  };

  const setTool = (tool: DrawingState['currentTool']) => {
    setDrawingState(prev => ({ ...prev, currentTool: tool }));
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const setBrush = (brushId: string) => {
    const brush = brushEngineRef.current.getBrush(brushId);
    if (brush) {
      brushEngineRef.current.setActiveBrush(brushId);
      setDrawingState(prev => ({ ...prev, currentBrush: brush }));
      
      // Haptic feedback
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const setColor = (color: Color) => {
    setDrawingState(prev => ({ ...prev, currentColor: color }));
  };

  const setBrushSize = (size: number) => {
    const currentBrush = drawingState.currentBrush;
    brushEngineRef.current.updateBrushSettings(currentBrush.id, {
      size: { ...currentBrush.settings.size, current: size },
    });
    
    setDrawingState(prev => ({
      ...prev,
      currentBrush: {
        ...prev.currentBrush,
        settings: {
          ...prev.currentBrush.settings,
          size: { ...prev.currentBrush.settings.size, current: size },
        },
      },
    }));
  };

  const setBrushOpacity = (opacity: number) => {
    const currentBrush = drawingState.currentBrush;
    brushEngineRef.current.updateBrushSettings(currentBrush.id, {
      opacity: { ...currentBrush.settings.opacity, current: opacity },
    });
    
    setDrawingState(prev => ({
      ...prev,
      currentBrush: {
        ...prev.currentBrush,
        settings: {
          ...prev.currentBrush.settings,
          opacity: { ...prev.currentBrush.settings.opacity, current: opacity },
        },
      },
    }));
  };

  const startStroke = (point: Point) => {
    if (!canvasRef.current || drawingState.canvas.isDrawing) return;
    
    const brush = drawingState.currentBrush;
    const color = drawingState.currentColor.hex;
    
    canvasRef.current.startStroke(point, brush, color);
    
    setDrawingState(prev => ({
      ...prev,
      canvas: { ...prev.canvas, isDrawing: true, pressure: point.pressure || 1 },
    }));
    
    // Light haptic on stroke start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const addPoint = (point: Point) => {
    if (!canvasRef.current || !drawingState.canvas.isDrawing) return;
    
    canvasRef.current.addPoint(point);
    
    setDrawingState(prev => ({
      ...prev,
      canvas: { ...prev.canvas, pressure: point.pressure || 1 },
    }));
  };

  const endStroke = () => {
    if (!canvasRef.current || !drawingState.canvas.isDrawing) return;
    
    canvasRef.current.endStroke();
    
    setDrawingState(prev => ({
      ...prev,
      canvas: { ...prev.canvas, isDrawing: false },
    }));
    
    // Update history
    addToHistory();
  };

  const addToHistory = () => {
    if (!canvasRef.current) return;
    
    const currentState = canvasRef.current.getState();
    
    setDrawingState(prev => {
      // Remove any states after current index
      const newHistory = prev.history.slice(0, prev.historyIndex + 1);
      
      // Add new state
      newHistory.push({
        id: `history_${Date.now()}`,
        action: 'stroke',
        timestamp: new Date(),
        data: currentState,
      });
      
      // Limit history size
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...prev,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
    });
  };

  const addLayer = (name?: string) => {
    if (!canvasRef.current) return;
    
    const layer = canvasRef.current.addLayer(name);
    const state = canvasRef.current.getState();
    
    setDrawingState(prev => ({
      ...prev,
      layers: state.layers,
      activeLayerId: layer.id,
    }));
    
    addToHistory();
  };

  const deleteLayer = (layerId: string) => {
    if (!canvasRef.current || drawingState.layers.length <= 1) return;
    
    canvasRef.current.deleteLayer(layerId);
    const state = canvasRef.current.getState();
    
    setDrawingState(prev => ({
      ...prev,
      layers: state.layers,
      activeLayerId: state.activeLayerId,
    }));
    
    addToHistory();
  };

  const setActiveLayer = (layerId: string) => {
    if (!canvasRef.current) return;
    
    canvasRef.current.setState({ activeLayerId: layerId });
    
    setDrawingState(prev => ({
      ...prev,
      activeLayerId: layerId,
    }));
  };

  const toggleLayerVisibility = (layerId: string) => {
    if (!canvasRef.current) return;
    
    const state = canvasRef.current.getState();
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    layer.visible = !layer.visible;
    canvasRef.current.setState({ layers: state.layers });
    
    setDrawingState(prev => ({
      ...prev,
      layers: state.layers,
    }));
  };

  const setLayerOpacity = (layerId: string, opacity: number) => {
    if (!canvasRef.current) return;
    
    const state = canvasRef.current.getState();
    const layer = state.layers.find(l => l.id === layerId);
    if (!layer) return;
    
    layer.opacity = Math.max(0, Math.min(1, opacity));
    canvasRef.current.setState({ layers: state.layers });
    
    setDrawingState(prev => ({
      ...prev,
      layers: state.layers,
    }));
  };

  const reorderLayers = (fromIndex: number, toIndex: number) => {
    if (!canvasRef.current) return;
    
    const state = canvasRef.current.getState();
    const newLayers = [...state.layers];
    const [removed] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, removed);
    
    // Update order property
    newLayers.forEach((layer, index) => {
      layer.order = index;
    });
    
    canvasRef.current.setState({ layers: newLayers });
    
    setDrawingState(prev => ({
      ...prev,
      layers: newLayers,
    }));
    
    addToHistory();
  };

  const mergeLayerDown = (layerId: string) => {
    // Implementation would merge the layer with the one below
    // For MVP, this is a placeholder
    console.log('Merge layer down:', layerId);
  };

  const setZoom = (zoom: number) => {
    if (!canvasRef.current) return;
    
    canvasRef.current.setZoom(zoom);
    
    setDrawingState(prev => ({
      ...prev,
      canvas: { ...prev.canvas, zoom },
    }));
  };

  const setPan = (x: number, y: number) => {
    if (!canvasRef.current) return;
    
    canvasRef.current.setPan(x, y);
    
    setDrawingState(prev => ({
      ...prev,
      canvas: { ...prev.canvas, offset: { x, y } },
    }));
  };

  const resetView = () => {
    setZoom(1);
    setPan(0, 0);
  };

  const clear = () => {
    if (!canvasRef.current) return;
    
    canvasRef.current.clear();
    addToHistory();
    
    // Haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const undo = () => {
    if (!canvasRef.current || !canUndo) return;
    
    canvasRef.current.undo();
    
    setDrawingState(prev => ({
      ...prev,
      historyIndex: Math.max(-1, prev.historyIndex - 1),
    }));
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const redo = () => {
    if (!canvasRef.current || !canRedo) return;
    
    canvasRef.current.redo();
    
    setDrawingState(prev => ({
      ...prev,
      historyIndex: Math.min(prev.history.length - 1, prev.historyIndex + 1),
    }));
    
    // Haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const exportImage = async (format: 'png' | 'jpeg' = 'png', quality: number = 0.92): Promise<Blob> => {
    if (!canvasRef.current) {
      throw new Error('Canvas not initialized');
    }
    
    return canvasRef.current.exportImage(format, quality);
  };

  const saveDrawing = async () => {
    if (!canvasRef.current) return;
    
    const state = canvasRef.current.getState();
    // Save logic would go here
    console.log('Saving drawing:', state);
  };

  const loadDrawing = async (drawingId: string) => {
    // Load drawing logic would go here
    console.log('Loading drawing:', drawingId);
  };

  const value: DrawingContextValue = {
    // Canvas state
    canvas: canvasRef.current,
    isReady,
    canvasSize: drawingState.canvas,
    zoom: drawingState.canvas.zoom,
    pan: drawingState.canvas.offset,
    
    // Drawing state
    currentTool: drawingState.currentTool,
    currentBrush: drawingState.currentBrush,
    currentColor: drawingState.currentColor,
    isDrawing: drawingState.canvas.isDrawing,
    pressure: drawingState.canvas.pressure,
    tilt: drawingState.canvas.tilt,
    
    // Layers
    layers: drawingState.layers,
    activeLayerId: drawingState.activeLayerId,
    
    // Brushes
    availableBrushes: brushEngineRef.current.getAllBrushes(),
    
    // History
    canUndo,
    canRedo,
    
    // Actions
    initializeCanvas,
    setTool,
    setBrush,
    setColor,
    setBrushSize,
    setBrushOpacity,
    
    // Drawing operations
    startStroke,
    addPoint,
    endStroke,
    
    // Layer operations
    addLayer,
    deleteLayer,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    reorderLayers,
    mergeLayerDown,
    
    // Canvas operations
    setZoom,
    setPan,
    resetView,
    clear,
    
    // History operations
    undo,
    redo,
    
    // Export operations
    exportImage,
    saveDrawing,
    loadDrawing,
  };

  return (
    <DrawingContext.Provider value={value}>
      {children}
    </DrawingContext.Provider>
  );
};

export const useDrawing = (): DrawingContextValue => {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
};

// Specific hooks for drawing features
export const useCanvas = () => {
  const { canvas, isReady, canvasSize, zoom, pan } = useDrawing();
  return { canvas, isReady, canvasSize, zoom, pan };
};

export const useDrawingTools = () => {
  const { 
    currentTool, 
    currentBrush, 
    currentColor, 
    availableBrushes,
    setTool,
    setBrush,
    setColor,
    setBrushSize,
    setBrushOpacity,
  } = useDrawing();
  
  return {
    currentTool,
    currentBrush,
    currentColor,
    availableBrushes,
    setTool,
    setBrush,
    setColor,
    setBrushSize,
    setBrushOpacity,
  };
};

export const useLayers = () => {
  const {
    layers,
    activeLayerId,
    addLayer,
    deleteLayer,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    reorderLayers,
    mergeLayerDown,
  } = useDrawing();
  
  return {
    layers,
    activeLayerId,
    addLayer,
    deleteLayer,
    setActiveLayer,
    toggleLayerVisibility,
    setLayerOpacity,
    reorderLayers,
    mergeLayerDown,
  };
};

export const useHistory = () => {
  const { canUndo, canRedo, undo, redo } = useDrawing();
  return { canUndo, canRedo, undo, redo };
};