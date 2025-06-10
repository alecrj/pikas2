import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  DrawingState, 
  DrawingTool, 
  Stroke, 
  Layer, 
  Color, 
  Brush,
  DrawingMode,
  CanvasSettings,
  DrawingStats,
  HistoryEntry,
} from '../types';
import { brushEngine } from '../engines/drawing/BrushEngine';
import { dataManager } from '../engines/core/DataManager';
import { EventBus } from '../engines/core/EventBus';

// Action types for drawing state management
type DrawingAction =
  | { type: 'SET_TOOL'; tool: DrawingTool }
  | { type: 'SET_COLOR'; color: Color }
  | { type: 'SET_BRUSH'; brush: Brush }
  | { type: 'SET_BRUSH_SIZE'; size: number }
  | { type: 'SET_OPACITY'; opacity: number }
  | { type: 'ADD_STROKE'; stroke: Stroke }
  | { type: 'REMOVE_STROKE'; strokeId: string }
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'UPDATE_LAYER'; layerId: string; updates: Partial<Layer> }
  | { type: 'DELETE_LAYER'; layerId: string }
  | { type: 'SET_ACTIVE_LAYER'; layerId: string }
  | { type: 'REORDER_LAYERS'; layers: Layer[] }
  | { type: 'SET_CANVAS_SIZE'; width: number; height: number }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'SET_PAN'; pan: { x: number; y: number } }
  | { type: 'SET_ROTATION'; rotation: number }
  | { type: 'SET_GRID_VISIBLE'; visible: boolean }
  | { type: 'SET_GRID_SIZE'; size: number }
  | { type: 'SET_REFERENCE_IMAGE'; imageUri: string | null }
  | { type: 'SET_REFERENCE_OPACITY'; opacity: number }
  | { type: 'SET_DRAWING_MODE'; mode: DrawingMode }
  | { type: 'ADD_TO_HISTORY'; state: HistoryEntry }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'UPDATE_STATS'; stats: Partial<DrawingStats> }
  | { type: 'SET_PRESSURE_SENSITIVITY'; enabled: boolean }
  | { type: 'SET_TILT_SENSITIVITY'; enabled: boolean }
  | { type: 'SET_VELOCITY_SENSITIVITY'; enabled: boolean }
  | { type: 'ADD_RECENT_COLOR'; color: string }
  | { type: 'LOAD_STATE'; state: Partial<DrawingState> }
  | { type: 'RESET_STATE' };

// Initial drawing state
const initialState: DrawingState = {
  currentTool: 'brush',
  currentColor: {
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    hsb: { h: 0, s: 0, b: 0 },
    alpha: 1,
  },
  currentBrush: null, // Will be set when brush engine initializes
  brushSize: 3,
  opacity: 1,
  layers: [],
  activeLayerId: '',
  strokes: [],
  canvasWidth: 1024,
  canvasHeight: 768,
  zoom: 1,
  pan: { x: 0, y: 0 },
  rotation: 0,
  gridVisible: false,
  gridSize: 20,
  referenceImage: null,
  referenceOpacity: 0.5,
  drawingMode: 'normal',
  history: [],
  historyIndex: -1,
  stats: {
    totalStrokes: 0,
    totalTime: 0,
    layersUsed: 1,
    colorsUsed: 1,
    brushesUsed: 1,
    undoCount: 0,
    redoCount: 0,
  },
  settings: {
    pressureSensitivity: true,
    tiltSensitivity: true,
    velocitySensitivity: true,
    palmRejection: true,
    quickMenuEnabled: true,
    autoSave: true,
    autoSaveInterval: 300, // 5 minutes
  },
  recentColors: ['#000000'],
  customBrushes: [],
  savedPalettes: [],
};

// Reducer function for drawing state
function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  const eventBus = EventBus.getInstance();
  
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, currentTool: action.tool };
      
    case 'SET_COLOR':
      const newRecentColors = [action.color.hex, ...state.recentColors.filter(c => c !== action.color.hex)].slice(0, 20);
      eventBus.emit('drawing:colorChanged', { color: action.color });
      return { 
        ...state, 
        currentColor: action.color,
        recentColors: newRecentColors,
        stats: {
          ...state.stats,
          colorsUsed: state.stats.colorsUsed + 1,
        }
      };
      
    case 'SET_BRUSH':
      eventBus.emit('drawing:brushChanged', { brush: action.brush });
      return { 
        ...state, 
        currentBrush: action.brush,
        brushSize: action.brush.settings.size,
        opacity: action.brush.settings.opacity,
        stats: {
          ...state.stats,
          brushesUsed: state.stats.brushesUsed + 1,
        }
      };
      
    case 'SET_BRUSH_SIZE':
      if (state.currentBrush) {
        const updatedBrush = {
          ...state.currentBrush,
          settings: { ...state.currentBrush.settings, size: action.size }
        };
        return { ...state, brushSize: action.size, currentBrush: updatedBrush };
      }
      return { ...state, brushSize: action.size };
      
    case 'SET_OPACITY':
      if (state.currentBrush) {
        const updatedBrush = {
          ...state.currentBrush,
          settings: { ...state.currentBrush.settings, opacity: action.opacity }
        };
        return { ...state, opacity: action.opacity, currentBrush: updatedBrush };
      }
      return { ...state, opacity: action.opacity };
      
    case 'ADD_STROKE':
      eventBus.emit('drawing:strokeAdded', { stroke: action.stroke });
      return { 
        ...state, 
        strokes: [...state.strokes, action.stroke],
        stats: {
          ...state.stats,
          totalStrokes: state.stats.totalStrokes + 1,
        }
      };
      
    case 'REMOVE_STROKE':
      return { 
        ...state, 
        strokes: state.strokes.filter(s => s.id !== action.strokeId) 
      };
      
    case 'ADD_LAYER':
      eventBus.emit('drawing:layerAdded', { layer: action.layer });
      return { 
        ...state, 
        layers: [...state.layers, action.layer],
        activeLayerId: action.layer.id,
        stats: {
          ...state.stats,
          layersUsed: state.stats.layersUsed + 1,
        }
      };
      
    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map(layer =>
          layer.id === action.layerId ? { ...layer, ...action.updates } : layer
        ),
      };
      
    case 'DELETE_LAYER':
      const filteredLayers = state.layers.filter(l => l.id !== action.layerId);
      const newActiveLayerId = state.activeLayerId === action.layerId 
        ? filteredLayers[filteredLayers.length - 1]?.id || ''
        : state.activeLayerId;
      
      eventBus.emit('drawing:layerDeleted', { layerId: action.layerId });
      return {
        ...state,
        layers: filteredLayers,
        activeLayerId: newActiveLayerId,
      };
      
    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.layerId };
      
    case 'REORDER_LAYERS':
      return { ...state, layers: action.layers };
      
    case 'SET_CANVAS_SIZE':
      return { 
        ...state, 
        canvasWidth: action.width, 
        canvasHeight: action.height 
      };
      
    case 'SET_ZOOM':
      return { ...state, zoom: action.zoom };
      
    case 'SET_PAN':
      return { ...state, pan: action.pan };
      
    case 'SET_ROTATION':
      return { ...state, rotation: action.rotation };
      
    case 'SET_GRID_VISIBLE':
      return { ...state, gridVisible: action.visible };
      
    case 'SET_GRID_SIZE':
      return { ...state, gridSize: action.size };
      
    case 'SET_REFERENCE_IMAGE':
      return { ...state, referenceImage: action.imageUri };
      
    case 'SET_REFERENCE_OPACITY':
      return { ...state, referenceOpacity: action.opacity };
      
    case 'SET_DRAWING_MODE':
      return { ...state, drawingMode: action.mode };
      
    case 'ADD_TO_HISTORY':
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push(action.state);
      
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...state,
        history: newHistory,
        historyIndex: newHistory.length - 1,
      };
      
    case 'UNDO':
      if (state.historyIndex > 0) {
        const previousEntry = state.history[state.historyIndex - 1];
        eventBus.emit('drawing:undo');
        return {
          ...state,
          // Apply the previous state data
          ...previousEntry.data,
          // Keep current history and decrement index
          history: state.history,
          historyIndex: state.historyIndex - 1,
          stats: {
            ...state.stats,
            undoCount: state.stats.undoCount + 1,
          }
        };
      }
      return state;
      
    case 'REDO':
      if (state.historyIndex < state.history.length - 1) {
        const nextEntry = state.history[state.historyIndex + 1];
        eventBus.emit('drawing:redo');
        return {
          ...state,
          // Apply the next state data
          ...nextEntry.data,
          // Keep current history and increment index
          history: state.history,
          historyIndex: state.historyIndex + 1,
          stats: {
            ...state.stats,
            redoCount: state.stats.redoCount + 1,
          }
        };
      }
      return state;
      
    case 'UPDATE_STATS':
      return {
        ...state,
        stats: { ...state.stats, ...action.stats },
      };
      
    case 'SET_PRESSURE_SENSITIVITY':
      return {
        ...state,
        settings: { ...state.settings, pressureSensitivity: action.enabled },
      };
      
    case 'SET_TILT_SENSITIVITY':
      return {
        ...state,
        settings: { ...state.settings, tiltSensitivity: action.enabled },
      };
      
    case 'SET_VELOCITY_SENSITIVITY':
      return {
        ...state,
        settings: { ...state.settings, velocitySensitivity: action.enabled },
      };
      
    case 'ADD_RECENT_COLOR':
      const updatedRecentColors = [action.color, ...state.recentColors.filter(c => c !== action.color)].slice(0, 20);
      return { ...state, recentColors: updatedRecentColors };
      
    case 'LOAD_STATE':
      return { ...state, ...action.state };
      
    case 'RESET_STATE':
      return initialState;
      
    default:
      return state;
  }
}

// Context types
interface DrawingContextValue {
  state: DrawingState;
  dispatch: React.Dispatch<DrawingAction>;
  
  // Helper functions
  setTool: (tool: DrawingTool) => void;
  setColor: (color: Color) => void;
  setBrush: (brush: Brush) => void;
  setBrushSize: (size: number) => void;
  setOpacity: (opacity: number) => void;
  addStroke: (stroke: Stroke) => void;
  addLayer: (name?: string) => Layer;
  deleteLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  setCanvasTransform: (zoom: number, pan: { x: number; y: number }, rotation: number) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  saveDrawing: () => Promise<void>;
  loadDrawing: (drawingId: string) => Promise<void>;
  exportImage: (format: 'png' | 'jpeg', quality?: number) => Promise<string | null>;
  toggleGrid: () => void;
  setReferenceImage: (imageUri: string | null) => void;
  getDrawingStats: () => DrawingStats;
}

// Create the context
const DrawingContext = createContext<DrawingContextValue | null>(null);

// Provider component
interface DrawingProviderProps {
  children: ReactNode;
}

export function DrawingProvider({ children }: DrawingProviderProps) {
  const [state, dispatch] = useReducer(drawingReducer, initialState);
  const eventBus = EventBus.getInstance();
  
  // Initialize default brush on mount
  useEffect(() => {
    const defaultBrush = brushEngine.getBrush('pencil-2b');
    if (defaultBrush) {
      dispatch({ type: 'SET_BRUSH', brush: defaultBrush });
    }
    
    // Load saved drawing state if exists
    loadSavedState();
    
    // Setup auto-save
    const autoSaveInterval = setInterval(() => {
      if (state.settings.autoSave) {
        saveState();
      }
    }, state.settings.autoSaveInterval * 1000);
    
    return () => clearInterval(autoSaveInterval);
  }, []);
  
  // Track drawing time
  useEffect(() => {
    const startTime = Date.now();
    
    return () => {
      const sessionTime = Math.floor((Date.now() - startTime) / 1000);
      dispatch({ 
        type: 'UPDATE_STATS', 
        stats: { totalTime: state.stats.totalTime + sessionTime } 
      });
    };
  }, []);
  
  // Helper functions
  const setTool = (tool: DrawingTool) => dispatch({ type: 'SET_TOOL', tool });
  
  const setColor = (color: Color) => dispatch({ type: 'SET_COLOR', color });
  
  const setBrush = (brush: Brush) => dispatch({ type: 'SET_BRUSH', brush });
  
  const setBrushSize = (size: number) => dispatch({ type: 'SET_BRUSH_SIZE', size });
  
  const setOpacity = (opacity: number) => dispatch({ type: 'SET_OPACITY', opacity });
  
  const addStroke = (stroke: Stroke) => dispatch({ type: 'ADD_STROKE', stroke });
  
  const addLayer = (name?: string): Layer => {
    const layer: Layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name || `Layer ${state.layers.length + 1}`,
      type: 'raster',
      strokes: [],
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      data: null,
      order: state.layers.length,
    };
    
    dispatch({ type: 'ADD_LAYER', layer });
    return layer;
  };
  
  const deleteLayer = (layerId: string) => {
    if (state.layers.length > 1) {
      dispatch({ type: 'DELETE_LAYER', layerId });
    }
  };
  
  const setActiveLayer = (layerId: string) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', layerId });
  };
  
  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    dispatch({ type: 'UPDATE_LAYER', layerId, updates });
  };
  
  const setCanvasTransform = (zoom: number, pan: { x: number; y: number }, rotation: number) => {
    dispatch({ type: 'SET_ZOOM', zoom });
    dispatch({ type: 'SET_PAN', pan });
    dispatch({ type: 'SET_ROTATION', rotation });
  };
  
  const undo = () => dispatch({ type: 'UNDO' });
  
  const redo = () => dispatch({ type: 'REDO' });
  
  const clearCanvas = () => {
    // Save current state to history before clearing
    const historyEntry: HistoryEntry = {
      id: `clear_${Date.now()}`,
      action: 'clear_canvas',
      timestamp: Date.now(),
      data: {
        strokes: state.strokes,
        layers: state.layers,
        activeLayerId: state.activeLayerId,
      }
    };
    
    dispatch({ type: 'ADD_TO_HISTORY', state: historyEntry });
    
    // Reset drawing state but keep settings
    const clearedState: Partial<DrawingState> = {
      strokes: [],
      layers: [{
        id: 'layer-1',
        name: 'Background',
        type: 'raster',
        strokes: [],
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: false,
        data: null,
        order: 0,
      }],
      activeLayerId: 'layer-1',
    };
    
    dispatch({ type: 'LOAD_STATE', state: clearedState });
    eventBus.emit('drawing:cleared');
  };
  
  const saveState = async () => {
    try {
      const stateToSave = {
        ...state,
        history: [], // Don't save history to reduce size
        stats: state.stats,
      };
      
      await dataManager.set('drawing_state', stateToSave);
      eventBus.emit('drawing:saved');
    } catch (error) {
      console.error('Failed to save drawing state:', error);
    }
  };
  
  const loadSavedState = async () => {
    try {
      const savedState = await dataManager.get<Partial<DrawingState>>('drawing_state');
      if (savedState) {
        dispatch({ type: 'LOAD_STATE', state: savedState });
        eventBus.emit('drawing:loaded');
      }
    } catch (error) {
      console.error('Failed to load drawing state:', error);
    }
  };
  
  const saveDrawing = async () => {
    try {
      const drawingId = `drawing_${Date.now()}`;
      const drawingData = {
        id: drawingId,
        state: state,
        createdAt: Date.now(),
        thumbnail: null, // Would generate thumbnail here
      };
      
      await dataManager.set(`drawing_${drawingId}`, drawingData);
      
      // Update drawings list
      const drawings = await dataManager.get<string[]>('saved_drawings') || [];
      drawings.push(drawingId);
      await dataManager.set('saved_drawings', drawings);
      
      eventBus.emit('drawing:saved', { drawingId });
    } catch (error) {
      console.error('Failed to save drawing:', error);
      throw error;
    }
  };
  
  const loadDrawing = async (drawingId: string) => {
    try {
      const drawingData = await dataManager.get<any>(`drawing_${drawingId}`);
      if (drawingData && drawingData.state) {
        dispatch({ type: 'LOAD_STATE', state: drawingData.state });
        eventBus.emit('drawing:loaded', { drawingId });
      }
    } catch (error) {
      console.error('Failed to load drawing:', error);
      throw error;
    }
  };
  
  const exportImage = async (format: 'png' | 'jpeg' = 'png', quality: number = 1.0): Promise<string | null> => {
    try {
      // This would integrate with the ProfessionalCanvas export
      eventBus.emit('drawing:export', { format, quality });
      return null; // Canvas will handle actual export
    } catch (error) {
      console.error('Export error:', error);
      return null;
    }
  };
  
  const toggleGrid = () => {
    dispatch({ type: 'SET_GRID_VISIBLE', visible: !state.gridVisible });
  };
  
  const setReferenceImage = (imageUri: string | null) => {
    dispatch({ type: 'SET_REFERENCE_IMAGE', imageUri });
  };
  
  const getDrawingStats = (): DrawingStats => state.stats;
  
  const contextValue: DrawingContextValue = {
    state,
    dispatch,
    setTool,
    setColor,
    setBrush,
    setBrushSize,
    setOpacity,
    addStroke,
    addLayer,
    deleteLayer,
    setActiveLayer,
    updateLayer,
    setCanvasTransform,
    undo,
    redo,
    clearCanvas,
    saveDrawing,
    loadDrawing,
    exportImage,
    toggleGrid,
    setReferenceImage,
    getDrawingStats,
  };
  
  return (
    <DrawingContext.Provider value={contextValue}>
      {children}
    </DrawingContext.Provider>
  );
}

// Custom hook to use the drawing context
export function useDrawing() {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
}