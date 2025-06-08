import React, { createContext, useContext, useReducer, ReactNode, useEffect } from 'react';
import { Brush, Layer, DrawingState, Color } from '../types';
import { dataManager } from '../engines/core/DataManager';

interface DrawingContextState {
  currentBrush: Brush;
  currentColor: string;
  availableBrushes: Brush[];
  colorPalette: string[];
  recentColors: string[];
  layers: Layer[];
  activeLayerId: string;
  undoStack: DrawingState[];
  redoStack: DrawingState[];
  isDrawing: boolean;
}

type DrawingAction =
  | { type: 'SET_BRUSH'; brush: Brush }
  | { type: 'SET_COLOR'; color: string }
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'DELETE_LAYER'; layerId: string }
  | { type: 'SET_ACTIVE_LAYER'; layerId: string }
  | { type: 'UPDATE_LAYER'; layer: Layer }
  | { type: 'ADD_RECENT_COLOR'; color: string }
  | { type: 'SET_DRAWING'; isDrawing: boolean }
  | { type: 'PUSH_UNDO'; state: DrawingState }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

const defaultBrushes: Brush[] = [
  {
    id: 'pencil',
    name: 'Pencil',
    icon: '✏️',
    type: 'pencil',
    settings: {
      minSize: 2,
      maxSize: 10,
      pressureSensitivity: 0.8,
      tiltSensitivity: 0.5,
      opacity: 1,
      flow: 0.9,
      smoothing: 0.5,
    },
  },
  {
    id: 'pen',
    name: 'Ink Pen',
    icon: '🖊️',
    type: 'pen',
    settings: {
      minSize: 3,
      maxSize: 8,
      pressureSensitivity: 0.6,
      tiltSensitivity: 0.3,
      opacity: 1,
      flow: 1,
      smoothing: 0.3,
    },
  },
  {
    id: 'marker',
    name: 'Marker',
    icon: '🖍️',
    type: 'marker',
    settings: {
      minSize: 8,
      maxSize: 20,
      pressureSensitivity: 0.4,
      tiltSensitivity: 0.2,
      opacity: 0.8,
      flow: 0.8,
      smoothing: 0.6,
    },
  },
  {
    id: 'watercolor',
    name: 'Watercolor',
    icon: '🎨',
    type: 'watercolor',
    settings: {
      minSize: 10,
      maxSize: 30,
      pressureSensitivity: 0.9,
      tiltSensitivity: 0.6,
      opacity: 0.5,
      flow: 0.6,
      smoothing: 0.7,
      wetness: 0.8,
      bleed: 0.4,
    },
  },
  {
    id: 'airbrush',
    name: 'Airbrush',
    icon: '💨',
    type: 'airbrush',
    settings: {
      minSize: 20,
      maxSize: 50,
      pressureSensitivity: 0.7,
      tiltSensitivity: 0.4,
      opacity: 0.3,
      flow: 0.5,
      smoothing: 0.8,
      scatter: 0.3,
    },
  },
];

const defaultColorPalette: string[] = [
  '#000000', '#FFFFFF', '#E53E3E', '#DD6B20', '#D69E2E', '#38A169',
  '#3182CE', '#5A67D8', '#805AD5', '#D53F8C', '#718096', '#A0AEC0',
  '#F56565', '#ED8936', '#ECC94B', '#48BB78', '#4299E1', '#667EEA',
  '#9F7AEA', '#ED64A6', '#CBD5E0', '#E2E8F0',
];

const initialState: DrawingContextState = {
  currentBrush: defaultBrushes[0],
  currentColor: '#000000',
  availableBrushes: defaultBrushes,
  colorPalette: defaultColorPalette,
  recentColors: [],
  layers: [{
    id: 'layer-1',
    name: 'Layer 1',
    strokes: [],
    opacity: 1,
    blendMode: 'normal',
    visible: true,
    locked: false,
  }],
  activeLayerId: 'layer-1',
  undoStack: [],
  redoStack: [],
  isDrawing: false,
};

function drawingReducer(state: DrawingContextState, action: DrawingAction): DrawingContextState {
  switch (action.type) {
    case 'SET_BRUSH':
      return { ...state, currentBrush: action.brush };
    
    case 'SET_COLOR':
      return { 
        ...state, 
        currentColor: action.color,
        recentColors: [action.color, ...state.recentColors.filter(c => c !== action.color)].slice(0, 10),
      };
    
    case 'ADD_LAYER':
      return {
        ...state,
        layers: [...state.layers, action.layer],
        activeLayerId: action.layer.id,
      };
    
    case 'DELETE_LAYER':
      if (state.layers.length === 1) return state;
      const newLayers = state.layers.filter(l => l.id !== action.layerId);
      const newActiveId = state.activeLayerId === action.layerId 
        ? newLayers[0].id 
        : state.activeLayerId;
      return {
        ...state,
        layers: newLayers,
        activeLayerId: newActiveId,
      };
    
    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.layerId };
    
    case 'UPDATE_LAYER':
      return {
        ...state,
        layers: state.layers.map(l => l.id === action.layer.id ? action.layer : l),
      };
    
    case 'ADD_RECENT_COLOR':
      return {
        ...state,
        recentColors: [action.color, ...state.recentColors.filter(c => c !== action.color)].slice(0, 10),
      };
    
    case 'SET_DRAWING':
      return { ...state, isDrawing: action.isDrawing };
    
    case 'PUSH_UNDO':
      return {
        ...state,
        undoStack: [...state.undoStack, action.state].slice(-50), // Keep last 50 states
        redoStack: [], // Clear redo stack on new action
      };
    
    case 'UNDO':
      if (state.undoStack.length === 0) return state;
      const previousState = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, getCurrentDrawingState(state)],
        layers: previousState.layers,
        activeLayerId: previousState.activeLayerId,
      };
    
    case 'REDO':
      if (state.redoStack.length === 0) return state;
      const nextState = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, getCurrentDrawingState(state)],
        layers: nextState.layers,
        activeLayerId: nextState.activeLayerId,
      };
    
    case 'RESET':
      return initialState;
    
    default:
      return state;
  }
}

function getCurrentDrawingState(state: DrawingContextState): DrawingState {
  return {
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    canvasSize: { width: 1024, height: 1024 },
    zoom: 1,
    pan: { x: 0, y: 0 },
    backgroundColor: '#FFFFFF',
  };
}

interface DrawingContextType {
  state: DrawingContextState;
  dispatch: React.Dispatch<DrawingAction>;
  setBrush: (brush: Brush) => void;
  setColor: (color: string) => void;
  addLayer: (name?: string) => void;
  deleteLayer: (layerId: string) => void;
  setActiveLayer: (layerId: string) => void;
  undo: () => void;
  redo: () => void;
  clearCanvas: () => void;
  saveDrawing: () => Promise<void>;
  loadDrawing: (id: string) => Promise<void>;
}

const DrawingContext = createContext<DrawingContextType | undefined>(undefined);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(drawingReducer, initialState);

  useEffect(() => {
    // Load saved drawing state
    loadSavedState();
  }, []);

  const loadSavedState = async () => {
    try {
      const savedState = await dataManager.load('drawing_state');
      if (savedState && savedState.layers) {
        dispatch({ type: 'RESET' });
        savedState.layers.forEach((layer: Layer) => {
          dispatch({ type: 'ADD_LAYER', layer });
        });
        if (savedState.activeLayerId) {
          dispatch({ type: 'SET_ACTIVE_LAYER', layerId: savedState.activeLayerId });
        }
      }
    } catch (error) {
      console.error('Failed to load saved drawing state:', error);
    }
  };

  const setBrush = (brush: Brush) => {
    dispatch({ type: 'SET_BRUSH', brush });
  };

  const setColor = (color: string) => {
    dispatch({ type: 'SET_COLOR', color });
  };

  const addLayer = (name?: string) => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: name || `Layer ${state.layers.length + 1}`,
      strokes: [],
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
    };
    dispatch({ type: 'ADD_LAYER', layer: newLayer });
  };

  const deleteLayer = (layerId: string) => {
    dispatch({ type: 'DELETE_LAYER', layerId });
  };

  const setActiveLayer = (layerId: string) => {
    dispatch({ type: 'SET_ACTIVE_LAYER', layerId });
  };

  const undo = () => {
    dispatch({ type: 'UNDO' });
  };

  const redo = () => {
    dispatch({ type: 'REDO' });
  };

  const clearCanvas = () => {
    const currentState = getCurrentDrawingState(state);
    dispatch({ type: 'PUSH_UNDO', state: currentState });
    
    // Clear all strokes from all layers
    state.layers.forEach(layer => {
      const clearedLayer = { ...layer, strokes: [] };
      dispatch({ type: 'UPDATE_LAYER', layer: clearedLayer });
    });
  };

  const saveDrawing = async () => {
    try {
      const drawingState = getCurrentDrawingState(state);
      await dataManager.save('drawing_state', drawingState);
      
      // Also save to portfolio
      const portfolio = await dataManager.getPortfolio();
      const newArtwork = {
        id: `artwork-${Date.now()}`,
        title: `Drawing ${new Date().toLocaleDateString()}`,
        imageUrl: '', // Would be set by canvas export
        createdAt: new Date(),
        lessonId: null,
        tags: ['freeform'],
        likes: 0,
        views: 0,
        shared: false,
      };
      
      await dataManager.savePortfolio({
        ...portfolio,
        artworks: [...portfolio.artworks, newArtwork],
      });
    } catch (error) {
      console.error('Failed to save drawing:', error);
      throw error;
    }
  };

  const loadDrawing = async (id: string) => {
    try {
      const savedDrawing = await dataManager.load(`drawing_${id}`);
      if (savedDrawing && savedDrawing.layers) {
        dispatch({ type: 'RESET' });
        savedDrawing.layers.forEach((layer: Layer) => {
          dispatch({ type: 'ADD_LAYER', layer });
        });
        if (savedDrawing.activeLayerId) {
          dispatch({ type: 'SET_ACTIVE_LAYER', layerId: savedDrawing.activeLayerId });
        }
      }
    } catch (error) {
      console.error('Failed to load drawing:', error);
      throw error;
    }
  };

  const value: DrawingContextType = {
    state,
    dispatch,
    setBrush,
    setColor,
    addLayer,
    deleteLayer,
    setActiveLayer,
    undo,
    redo,
    clearCanvas,
    saveDrawing,
    loadDrawing,
  };

  return (
    <DrawingContext.Provider value={value}>
      {children}
    </DrawingContext.Provider>
  );
}

export function useDrawing() {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
}