import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { DrawingState, Layer, Stroke, Color, Brush, Point, BlendMode } from '../types';
import { dataManager } from '../engines/core/DataManager';
import { errorHandler } from '../engines/core/ErrorHandler';
import { performanceMonitor } from '../engines/core/PerformanceMonitor';

// FIXED: Added proper SavedDrawingState type definition
interface SavedDrawingState {
  layers: Layer[];
  activeLayerId: string;
  canvasSize: { width: number; height: number };
  backgroundColor: string;
  zoom: number;
  pan: { x: number; y: number };
}

interface DrawingAction {
  type: string;
  payload?: any;
  layerId?: string;
  stroke?: Stroke;
  color?: Color;
  brush?: Brush;
  layer?: Layer;
  point?: Point;
  tool?: DrawingState['currentTool']; // FIXED: Properly typed tool
  zoom?: number;
  pan?: { x: number; y: number };
  size?: { width: number; height: number };
  backgroundColor?: string;
}

interface DrawingContextType {
  state: DrawingState;
  dispatch: React.Dispatch<DrawingAction>;
  addStroke: (stroke: Stroke) => void;
  addLayer: (name?: string) => void;
  removeLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  setCurrentColor: (color: Color) => void;
  setCurrentBrush: (brush: Brush) => void;
  setCurrentTool: (tool: DrawingState['currentTool']) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  saveDrawing: (title: string) => Promise<void>;
  loadDrawing: (drawingId: string) => Promise<void>;
  exportCanvas: () => Promise<string>;
  setCanvasSize: (width: number, height: number) => void;
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setBackgroundColor: (color: string) => void;
}

const defaultBrush: Brush = {
  id: 'default-pencil',
  name: 'Pencil',
  category: 'pencil',
  icon: '✏️',
  settings: {
    size: 3,
    minSize: 1,
    maxSize: 50,
    opacity: 1,
    flow: 1,
    hardness: 0.8,
    spacing: 0.1,
    smoothing: 0.5,
    pressureSensitivity: 0.8,
  },
  pressureCurve: [0, 0.2, 0.8, 1],
  tiltSupport: true,
  customizable: true,
};

const defaultColor: Color = {
  hex: '#000000',
  rgb: { r: 0, g: 0, b: 0 },
  hsb: { h: 0, s: 0, b: 0 },
  alpha: 1,
};

// FIXED: Create default brushes array
const createDefaultBrushes = (): Brush[] => [
  defaultBrush,
  {
    id: 'ink-pen',
    name: 'Ink Pen',
    category: 'ink',
    icon: '🖊️',
    settings: {
      size: 2,
      minSize: 1,
      maxSize: 20,
      opacity: 1,
      flow: 1,
      hardness: 1,
      spacing: 0.05,
      smoothing: 0.3,
      pressureSensitivity: 0.6,
    },
    pressureCurve: [0, 0.3, 0.7, 1],
    tiltSupport: false,
    customizable: true,
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    category: 'watercolor',
    icon: '🎨',
    settings: {
      size: 8,
      minSize: 2,
      maxSize: 50,
      opacity: 0.6,
      flow: 0.8,
      hardness: 0.2,
      spacing: 0.2,
      smoothing: 0.7,
      pressureSensitivity: 0.9,
    },
    pressureCurve: [0, 0.1, 0.9, 1],
    tiltSupport: true,
    customizable: true,
  },
  {
    id: 'marker',
    name: 'Marker',
    category: 'marker',
    icon: '🖍️',
    settings: {
      size: 5,
      minSize: 2,
      maxSize: 30,
      opacity: 0.8,
      flow: 1,
      hardness: 0.6,
      spacing: 0.1,
      smoothing: 0.4,
      pressureSensitivity: 0.4,
    },
    pressureCurve: [0, 0.5, 0.5, 1],
    tiltSupport: true,
    customizable: true,
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    category: 'airbrush',
    icon: '💨',
    settings: {
      size: 12,
      minSize: 5,
      maxSize: 100,
      opacity: 0.3,
      flow: 0.5,
      hardness: 0.1,
      spacing: 0.3,
      smoothing: 0.8,
      pressureSensitivity: 0.8,
      scatter: 0.2,
    },
    pressureCurve: [0, 0.2, 0.8, 1],
    tiltSupport: true,
    customizable: true,
  }
];

// FIXED: Create default color palette
const createDefaultColorPalette = (): string[] => [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
  '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080',
  '#FFD700', '#C0C0C0', '#FF69B4', '#DC143C', '#4B0082'
];

const createDefaultLayer = (id: string = 'layer-1', name: string = 'Layer 1'): Layer => ({
  id,
  name,
  type: 'raster',
  visible: true,
  locked: false,
  opacity: 1,
  blendMode: 'normal',
  data: null,
  order: 0,
  strokes: [],
});

// FIXED: Added all missing properties to initialState
const initialState: DrawingState = {
  currentTool: 'brush',
  currentBrush: defaultBrush,
  currentColor: defaultColor,
  layers: [createDefaultLayer()],
  activeLayerId: 'layer-1',
  history: [],
  historyIndex: -1,
  canvas: {
    width: 800,
    height: 600,
    zoom: 1,
    rotation: 0,
    offset: { x: 0, y: 0 },
    isDrawing: false,
    pressure: 0,
    tilt: { x: 0, y: 0 },
  },
  canvasSize: { width: 800, height: 600 },
  pan: { x: 0, y: 0 },
  zoom: 1,
  backgroundColor: '#ffffff',
  // FIXED: Added the missing properties
  availableBrushes: createDefaultBrushes(),
  colorPalette: createDefaultColorPalette(),
  recentColors: ['#000000', '#FFFFFF', '#FF0000'], // Start with basic colors
};

function drawingReducer(state: DrawingState, action: DrawingAction): DrawingState {
  switch (action.type) {
    case 'ADD_STROKE':
      if (!action.stroke) return state;
      
      const layers = state.layers.map(layer => {
        if (layer.id === state.activeLayerId) {
          return {
            ...layer,
            strokes: [...layer.strokes, action.stroke!],
          };
        }
        return layer;
      });

      return {
        ...state,
        layers,
        history: [...state.history.slice(0, state.historyIndex + 1), {
          id: Date.now().toString(),
          action: 'ADD_STROKE',
          timestamp: new Date(),
          data: { stroke: action.stroke, layerId: state.activeLayerId },
        }],
        historyIndex: state.historyIndex + 1,
      };

    case 'ADD_LAYER':
      const newLayerId = `layer-${Date.now()}`;
      const newLayer = createDefaultLayer(
        newLayerId,
        action.payload?.name || `Layer ${state.layers.length + 1}`
      );
      newLayer.order = state.layers.length;

      return {
        ...state,
        layers: [...state.layers, newLayer],
        activeLayerId: newLayerId,
        history: [...state.history.slice(0, state.historyIndex + 1), {
          id: Date.now().toString(),
          action: 'ADD_LAYER',
          timestamp: new Date(),
          data: { layer: newLayer },
        }],
        historyIndex: state.historyIndex + 1,
      };

    case 'REMOVE_LAYER':
      if (!action.layerId || state.layers.length <= 1) return state;
      
      const filteredLayers = state.layers.filter(layer => layer.id !== action.layerId);
      const newActiveLayerId = state.activeLayerId === action.layerId 
        ? filteredLayers[0]?.id || 'layer-1'
        : state.activeLayerId;

      return {
        ...state,
        layers: filteredLayers,
        activeLayerId: newActiveLayerId,
        history: [...state.history.slice(0, state.historyIndex + 1), {
          id: Date.now().toString(),
          action: 'REMOVE_LAYER',
          timestamp: new Date(),
          data: { layerId: action.layerId },
        }],
        historyIndex: state.historyIndex + 1,
      };

    case 'SET_ACTIVE_LAYER':
      if (!action.layerId) return state;
      return {
        ...state,
        activeLayerId: action.layerId,
      };

    case 'SET_COLOR': // FIXED: Changed from SET_CURRENT_COLOR to match draw.tsx usage
      if (!action.color) return state;
      
      // FIXED: Update recent colors when setting a new color
      const colorHex = action.color.hex;
      const updatedRecentColors = [
        colorHex,
        ...state.recentColors.filter(c => c !== colorHex)
      ].slice(0, 10); // Keep last 10 colors

      return {
        ...state,
        currentColor: action.color,
        recentColors: updatedRecentColors,
      };

    case 'SET_CURRENT_COLOR':
      if (!action.color) return state;
      return {
        ...state,
        currentColor: action.color,
      };

    case 'SET_BRUSH': // FIXED: Changed from SET_CURRENT_BRUSH to match draw.tsx usage
      if (!action.brush) return state;
      return {
        ...state,
        currentBrush: action.brush,
      };

    case 'SET_CURRENT_BRUSH':
      if (!action.brush) return state;
      return {
        ...state,
        currentBrush: action.brush,
      };

    case 'SET_CURRENT_TOOL':
      if (!action.tool) return state;
      return {
        ...state,
        currentTool: action.tool, // FIXED: Now properly typed
      };

    case 'SET_CANVAS_SIZE':
      if (!action.size) return state;
      return {
        ...state,
        canvas: {
          ...state.canvas,
          width: action.size.width,
          height: action.size.height,
        },
        canvasSize: action.size,
      };

    case 'SET_ZOOM':
      if (typeof action.zoom !== 'number') return state;
      return {
        ...state,
        canvas: {
          ...state.canvas,
          zoom: action.zoom,
        },
        zoom: action.zoom,
      };

    case 'SET_PAN':
      if (!action.pan) return state;
      return {
        ...state,
        canvas: {
          ...state.canvas,
          offset: action.pan,
        },
        pan: action.pan,
      };

    case 'SET_BACKGROUND_COLOR':
      if (!action.backgroundColor) return state;
      return {
        ...state,
        backgroundColor: action.backgroundColor,
      };

    case 'UNDO':
      if (state.historyIndex <= 0) return state;
      
      const undoEntry = state.history[state.historyIndex];
      let undoState = { ...state, historyIndex: state.historyIndex - 1 };

      // Apply undo logic based on action type
      switch (undoEntry.action) {
        case 'ADD_STROKE':
          const strokeData = undoEntry.data;
          undoState.layers = state.layers.map(layer => {
            if (layer.id === strokeData.layerId) {
              return {
                ...layer,
                strokes: layer.strokes.filter(s => s.id !== strokeData.stroke.id),
              };
            }
            return layer;
          });
          break;
        case 'ADD_LAYER':
          const layerData = undoEntry.data;
          undoState.layers = state.layers.filter(layer => layer.id !== layerData.layer.id);
          if (undoState.activeLayerId === layerData.layer.id) {
            undoState.activeLayerId = undoState.layers[0]?.id || 'layer-1';
          }
          break;
      }

      return undoState;

    case 'REDO':
      if (state.historyIndex >= state.history.length - 1) return state;
      
      const redoEntry = state.history[state.historyIndex + 1];
      let redoState = { ...state, historyIndex: state.historyIndex + 1 };

      // Apply redo logic based on action type
      switch (redoEntry.action) {
        case 'ADD_STROKE':
          const strokeData = redoEntry.data;
          redoState.layers = state.layers.map(layer => {
            if (layer.id === strokeData.layerId) {
              return {
                ...layer,
                strokes: [...layer.strokes, strokeData.stroke],
              };
            }
            return layer;
          });
          break;
        case 'ADD_LAYER':
          const layerData = redoEntry.data;
          redoState.layers = [...state.layers, layerData.layer];
          redoState.activeLayerId = layerData.layer.id;
          break;
      }

      return redoState;

    case 'CLEAR_CANVAS':
      return {
        ...state,
        layers: [createDefaultLayer()],
        activeLayerId: 'layer-1',
        history: [...state.history.slice(0, state.historyIndex + 1), {
          id: Date.now().toString(),
          action: 'CLEAR_CANVAS',
          timestamp: new Date(),
          data: { previousLayers: state.layers },
        }],
        historyIndex: state.historyIndex + 1,
      };

    case 'LOAD_DRAWING':
      // FIXED: Properly type the payload as SavedDrawingState
      const savedDrawing = action.payload as SavedDrawingState;
      if (!savedDrawing) return state;

      return {
        ...state,
        layers: savedDrawing.layers || [createDefaultLayer()],
        activeLayerId: savedDrawing.activeLayerId || state.layers[0]?.id || 'layer-1',
        canvasSize: savedDrawing.canvasSize || state.canvasSize,
        backgroundColor: savedDrawing.backgroundColor || state.backgroundColor,
        zoom: savedDrawing.zoom || 1,
        pan: savedDrawing.pan || { x: 0, y: 0 },
        canvas: {
          ...state.canvas,
          width: savedDrawing.canvasSize?.width || state.canvas.width,
          height: savedDrawing.canvasSize?.height || state.canvas.height,
          zoom: savedDrawing.zoom || state.canvas.zoom,
          offset: savedDrawing.pan || state.canvas.offset,
        },
      };

    default:
      return state;
  }
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export function DrawingProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(drawingReducer, initialState);

  // Auto-save functionality
  useEffect(() => {
    const autoSave = async () => {
      try {
        const drawingState: SavedDrawingState = {
          layers: state.layers,
          activeLayerId: state.activeLayerId,
          canvasSize: state.canvasSize,
          backgroundColor: state.backgroundColor,
          zoom: state.zoom,
          pan: state.pan,
        };
        await dataManager.set('current_drawing', drawingState);
      } catch (error) {
        console.warn('Auto-save failed:', error);
      }
    };

    const debounceTimeout = setTimeout(autoSave, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [state.layers, state.activeLayerId, state.canvasSize, state.backgroundColor, state.zoom, state.pan]);

  // Load saved state on mount
  useEffect(() => {
    const loadSavedState = async () => {
      try {
        // FIXED: Properly type the savedState
        const savedState = await dataManager.get<SavedDrawingState>('current_drawing');
        if (savedState && savedState.layers && Array.isArray(savedState.layers)) {
          // Ensure all layers have required properties
          savedState.layers.forEach((layer: Layer) => {
            if (!layer.strokes) layer.strokes = [];
            if (!layer.type) layer.type = 'raster';
            if (!layer.data) layer.data = null;
            if (typeof layer.order !== 'number') layer.order = 0;
          });

          if (savedState.activeLayerId) {
            dispatch({ type: 'LOAD_DRAWING', payload: savedState });
          }
        }
      } catch (error) {
        errorHandler.handleError(
          errorHandler.createError('DRAWING_LOAD_ERROR', 'Failed to load saved drawing', 'low', error)
        );
      }
    };

    loadSavedState();
  }, []);

  const addStroke = (stroke: Stroke) => {
    performanceMonitor.recordDrawCall();
    dispatch({ type: 'ADD_STROKE', stroke });
  };

  const addLayer = (name?: string) => {
    dispatch({ type: 'ADD_LAYER', payload: { name } });
  };

  const removeLayer = (layerId: string) => {
    dispatch({ type: 'REMOVE_LAYER', layerId });
  };

  const setActiveLayer = (layerId: string) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', layerId });
  };

  const setCurrentColor = (color: Color) => {
    dispatch({ type: 'SET_CURRENT_COLOR', color });
  };

  const setCurrentBrush = (brush: Brush) => {
    dispatch({ type: 'SET_CURRENT_BRUSH', brush });
  };

  const setCurrentTool = (tool: DrawingState['currentTool']) => {
    dispatch({ type: 'SET_CURRENT_TOOL', tool });
  };

  const undo = () => {
    dispatch({ type: 'UNDO' });
  };

  const redo = () => {
    dispatch({ type: 'REDO' });
  };

  const clearCanvas = () => {
    dispatch({ type: 'CLEAR_CANVAS' });
  };

  const saveDrawing = async (title: string) => {
    try {
      const drawingData: SavedDrawingState = {
        layers: state.layers,
        activeLayerId: state.activeLayerId,
        canvasSize: state.canvasSize,
        backgroundColor: state.backgroundColor,
        zoom: state.zoom,
        pan: state.pan,
      };

      const drawingId = `drawing_${Date.now()}`;
      await dataManager.set(`saved_drawing_${drawingId}`, {
        id: drawingId,
        title,
        data: drawingData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log('Drawing saved successfully:', title);
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('DRAWING_SAVE_ERROR', 'Failed to save drawing', 'medium', error)
      );
      throw error;
    }
  };

  const loadDrawing = async (drawingId: string) => {
    try {
      // FIXED: Properly type the savedDrawing
      const savedDrawing = await dataManager.get<{
        id: string;
        title: string;
        data: SavedDrawingState;
        createdAt: Date;
        updatedAt: Date;
      }>(`saved_drawing_${drawingId}`);

      if (savedDrawing && savedDrawing.data && savedDrawing.data.layers && Array.isArray(savedDrawing.data.layers)) {
        // Ensure all layers have required properties
        savedDrawing.data.layers.forEach((layer: Layer) => {
          if (!layer.strokes) layer.strokes = [];
          if (!layer.type) layer.type = 'raster';
          if (!layer.data) layer.data = null;
          if (typeof layer.order !== 'number') layer.order = 0;
        });

        if (savedDrawing.data.activeLayerId) {
          dispatch({ type: 'LOAD_DRAWING', payload: savedDrawing.data });
        }
      }
    } catch (error) {
      errorHandler.handleError(
        errorHandler.createError('DRAWING_LOAD_ERROR', 'Failed to load drawing', 'medium', error)
      );
      throw error;
    }
  };

  const exportCanvas = async (): Promise<string> => {
    // This would integrate with the canvas rendering system
    // For now, return a placeholder
    return 'data:image/png;base64,placeholder';
  };

  const setCanvasSize = (width: number, height: number) => {
    dispatch({ type: 'SET_CANVAS_SIZE', size: { width, height } });
  };

  const setZoom = (zoom: number) => {
    dispatch({ type: 'SET_ZOOM', zoom });
  };

  const setPan = (x: number, y: number) => {
    dispatch({ type: 'SET_PAN', pan: { x, y } });
  };

  const setBackgroundColor = (color: string) => {
    dispatch({ type: 'SET_BACKGROUND_COLOR', backgroundColor: color });
  };

  const contextValue: DrawingContextType = {
    state,
    dispatch,
    addStroke,
    addLayer,
    removeLayer,
    setActiveLayer,
    setCurrentColor,
    setCurrentBrush,
    setCurrentTool,
    undo,
    redo,
    clearCanvas,
    saveDrawing,
    loadDrawing,
    exportCanvas,
    setCanvasSize,
    setZoom,
    setPan,
    setBackgroundColor,
  };

  return (
    <DrawingContext.Provider value={contextValue}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawing() {
  const context = useContext(DrawingContext);
  if (context === undefined) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
}

export { DrawingContext };