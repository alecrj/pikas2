import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  valkyrieEngine, 
  brushEngine, 
  layerManager, 
  colorManager,
  Tool,
  Brush,
  Color,
  Layer,
  Transform,
} from '../engines/drawing';
import { EventBus } from '../engines/core/EventBus';

interface DrawingContextValue {
  // Tools
  currentTool: Tool;
  setCurrentTool: (tool: Tool) => void;
  
  // Brushes
  currentBrush: Brush | null;
  setCurrentBrush: (brushId: string) => void;
  
  // Colors
  currentColor: Color;
  setCurrentColor: (color: Color) => void;
  
  // Layers
  layers: Layer[];
  currentLayer: Layer | null;
  createLayer: (name?: string) => Layer;
  deleteLayer: (layerId: string) => void;
  setCurrentLayer: (layerId: string) => void;
  
  // Transform
  canvasTransform: Transform;
  
  // Actions
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

const DrawingContext = createContext<DrawingContextValue | undefined>(undefined);

export function DrawingProvider({ children }: { children: ReactNode }) {
  const eventBus = EventBus.getInstance();
  
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [currentBrush, setCurrentBrush] = useState<Brush | null>(null);
  const [currentColor, setCurrentColor] = useState<Color>(colorManager.getCurrentColor());
  const [layers, setLayers] = useState<Layer[]>([]);
  const [currentLayer, setCurrentLayerState] = useState<Layer | null>(null);
  const [canvasTransform, setCanvasTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  useEffect(() => {
    // Initialize brush
    brushEngine.setCurrentBrush('procreate-pencil');
    setCurrentBrush(brushEngine.getCurrentBrush());
    
    // Subscribe to events
    const unsubscribers = [
      eventBus.on('brush:selected', ({ brush }) => setCurrentBrush(brush)),
      eventBus.on('color:changed', ({ color }) => setCurrentColor(color)),
      eventBus.on('layers:changed', () => {
        setLayers(layerManager.getAllLayers());
        setCurrentLayerState(layerManager.getCurrentLayer());
      }),
      eventBus.on('layer:created', () => {
        setLayers(layerManager.getAllLayers());
      }),
      eventBus.on('layer:deleted', () => {
        setLayers(layerManager.getAllLayers());
      }),
      eventBus.on('layer:selected', () => {
        setCurrentLayerState(layerManager.getCurrentLayer());
      }),
      eventBus.on('transform:changed', ({ transform }) => {
        setCanvasTransform(transform);
      }),
      eventBus.on('history:undo', () => {
        setCanUndo(layerManager.canUndo());
        setCanRedo(layerManager.canRedo());
      }),
      eventBus.on('history:redo', () => {
        setCanUndo(layerManager.canUndo());
        setCanRedo(layerManager.canRedo());
      }),
    ];
    
    // Initial layer setup
    setLayers(layerManager.getAllLayers());
    setCurrentLayerState(layerManager.getCurrentLayer());
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const handleSetCurrentTool = (tool: Tool) => {
    setCurrentTool(tool);
    eventBus.emit('tool:changed', { tool });
  };

  const handleSetCurrentBrush = (brushId: string) => {
    brushEngine.setCurrentBrush(brushId);
  };

  const handleSetCurrentColor = (color: Color) => {
    colorManager.setColor(color);
  };

  const handleCreateLayer = (name?: string) => {
    const layer = layerManager.createLayer(name);
    return layer;
  };

  const handleDeleteLayer = (layerId: string) => {
    layerManager.deleteLayer(layerId);
  };

  const handleSetCurrentLayer = (layerId: string) => {
    layerManager.setCurrentLayer(layerId);
  };

  const handleUndo = () => {
    layerManager.undo();
  };

  const handleRedo = () => {
    layerManager.redo();
  };

  const value: DrawingContextValue = {
    currentTool,
    setCurrentTool: handleSetCurrentTool,
    currentBrush,
    setCurrentBrush: handleSetCurrentBrush,
    currentColor,
    setCurrentColor: handleSetCurrentColor,
    layers,
    currentLayer,
    createLayer: handleCreateLayer,
    deleteLayer: handleDeleteLayer,
    setCurrentLayer: handleSetCurrentLayer,
    canvasTransform,
    undo: handleUndo,
    redo: handleRedo,
    canUndo,
    canRedo,
  };

  return <DrawingContext.Provider value={value}>{children}</DrawingContext.Provider>;
}

export function useDrawing() {
  const context = useContext(DrawingContext);
  if (!context) {
    throw new Error('useDrawing must be used within a DrawingProvider');
  }
  return context;
}