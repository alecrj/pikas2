// src/engines/drawing/ProfessionalCanvas.ts
import React, { useRef, useCallback, useEffect, useState, forwardRef } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  PanResponder,
  PanResponderInstance,
  GestureResponderEvent,
  PanResponderGestureState,
  Platform,
  Text,
} from 'react-native';
import {
  Canvas as SkiaCanvas,
  useCanvasRef,
  useTouchHandler,
  TouchInfo,
  ExtendedTouchInfo,
  SkiaDomView,
  useValue,
  useComputedValue,
  Skia,
  SkCanvas,
  SkPaint,
  SkPath,
  SkSurface,
  SkImage,
  BlendMode,
} from '@shopify/react-native-skia';
import { runOnJS, useSharedValue, withSpring } from 'react-native-reanimated';
import { valkyrieEngine } from './ValkyrieEngine';
import { brushEngine } from './BrushEngine';
import { layerManager } from './LayerManager';
import { colorManager } from './ColorManager';
import { gestureRecognizer } from './GestureRecognizer';
import { transformManager } from './TransformManager';
import { EventBus } from '../core/EventBus';
import { performanceOptimizer } from './PerformanceOptimizer';
import {
  Point,
  Stroke,
  Layer,
  Tool,
  CanvasState,
  Transform,
  Color,
  Brush,
  GestureType,
  CanvasSettings,
} from '../../types/drawing';

interface ProfessionalCanvasProps {
  width?: number;
  height?: number;
  onReady?: () => void;
  onStrokeStart?: (stroke: Stroke) => void;
  onStrokeUpdate?: (stroke: Stroke) => void;
  onStrokeEnd?: (stroke: Stroke) => void;
  settings?: Partial<CanvasSettings>;
}

/**
 * Professional Canvas Component - Procreate-level drawing surface
 * Supports Apple Pencil, gestures, layers, and professional tools
 */
export const ProfessionalCanvas = React.forwardRef<any, ProfessionalCanvasProps>(
  (
    {
      width: propWidth,
      height: propHeight,
      onReady,
      onStrokeStart,
      onStrokeUpdate,
      onStrokeEnd,
      settings = {},
      // ...any other props you need
    },
    ref
  ) => {
  // Dimensions
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const canvasWidth = propWidth || screenWidth;
  const canvasHeight = propHeight || screenHeight - 200; // Leave room for UI
  
  // Refs
  const canvasRef = useCanvasRef();
  const eventBus = EventBus.getInstance();
  
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentTool, setCurrentTool] = useState<Tool>('brush');
  const [currentColor, setCurrentColor] = useState<Color>(colorManager.getCurrentColor());
  const [currentBrush, setCurrentBrush] = useState<Brush | null>(brushEngine.getCurrentBrush());
  const [canvasTransform, setCanvasTransform] = useState<Transform>({
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
  });
  
  // Stroke state
  const currentStroke = useRef<Stroke | null>(null);
  const strokePath = useRef<SkPath | null>(null);
  const lastPoint = useRef<Point | null>(null);
  const strokeStartTime = useRef<number>(0);
  const velocityHistory = useRef<number[]>([]);
  
  // Touch handling
  const activeTouches = useRef<Map<number, ExtendedTouchInfo>>(new Map());
  const touchCount = useRef<number>(0);
  const lastTouchDistance = useRef<number>(0);
  const lastTouchAngle = useRef<number>(0);
  
  // Gesture state
  const currentGesture = useRef<GestureType>('none');
  const gestureStartTransform = useRef<Transform | null>(null);
  const gestureStartTouches = useRef<TouchInfo[]>([]);
  
  // Performance tracking
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);
  const fps = useSharedValue<number>(0);
  
  // Canvas settings
  const mergedSettings: CanvasSettings = {
    pressureSensitivity: 1.0,
    tiltSensitivity: 1.0,
    velocitySensitivity: 1.0,
    smoothing: 0.5,
    predictiveStroke: true,
    palmRejection: true,
    snapToShapes: true,
    gridEnabled: false,
    gridSize: 50,
    symmetryEnabled: false,
    symmetryType: 'vertical',
    referenceEnabled: false,
    ...settings,
  };

  // Initialize canvas
  useEffect(() => {
    if (!isInitialized) {
      initializeCanvas();
    }
    
    return () => {
      cleanup();
    };
  }, []);

  // Subscribe to events
  useEffect(() => {
    const subscriptions = [
      eventBus.on('tool:changed', handleToolChange),
      eventBus.on('color:changed', handleColorChange),
      eventBus.on('brush:selected', handleBrushChange),
      eventBus.on('layer:changed', handleLayerChange),
      eventBus.on('transform:changed', handleTransformChange),
      eventBus.on('undo:requested', handleUndo),
      eventBus.on('redo:requested', handleRedo),
    ];
    
    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, []);

  // Initialize canvas systems
  const initializeCanvas = async () => {
    console.log('🎨 Initializing Professional Canvas...');
    
    try {
      // Initialize Valkyrie engine
      valkyrieEngine.initialize(canvasWidth, canvasHeight, 3);
      
      // Initialize layer manager
      await layerManager.initialize(canvasWidth, canvasHeight);
      
      // Initialize transform manager
      transformManager.initialize(canvasWidth, canvasHeight);
      
      // Initialize gesture recognizer
      gestureRecognizer.initialize();
      
      // Set up default brush
      if (!currentBrush) {
        brushEngine.setCurrentBrush('procreate-pencil');
        setCurrentBrush(brushEngine.getCurrentBrush());
      }
      
      setIsInitialized(true);
      onReady?.();
      
      console.log('✅ Canvas initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize canvas:', error);
    }
  };

  // Touch handler for Skia canvas
  const touchHandler = useTouchHandler({
    onStart: (touch: TouchInfo) => {
      'worklet';
      runOnJS(handleTouchStart)(touch);
    },
    onActive: (touch: ExtendedTouchInfo) => {
      'worklet';
      runOnJS(handleTouchMove)(touch);
    },
    onEnd: (touch: ExtendedTouchInfo) => {
      'worklet';
      runOnJS(handleTouchEnd)(touch);
    },
  }, [currentTool, currentBrush, currentColor]);

  // Handle touch start
  const handleTouchStart = useCallback((touch: TouchInfo) => {
    activeTouches.current.set(touch.id, touch as ExtendedTouchInfo);
    touchCount.current = activeTouches.current.size;
    
    // Gesture detection
    const touches = Array.from(activeTouches.current.values());
    const gesture = gestureRecognizer.detectGesture(touches, currentGesture.current);
    
    if (gesture !== currentGesture.current) {
      handleGestureChange(currentGesture.current, gesture);
      currentGesture.current = gesture;
    }
    
    // Handle based on gesture type
    if (gesture === 'draw' && touchCount.current === 1) {
      startStroke(touch);
    } else if (gesture === 'pan' && touchCount.current === 2) {
      startPan(touches);
    } else if (gesture === 'pinch' && touchCount.current === 2) {
      startPinch(touches);
    } else if (gesture === 'rotate' && touchCount.current === 2) {
      startRotate(touches);
    }
  }, [currentTool, currentBrush, currentColor]);

  // Handle touch move
  const handleTouchMove = useCallback((touch: ExtendedTouchInfo) => {
    activeTouches.current.set(touch.id, touch);
    
    const touches = Array.from(activeTouches.current.values());
    const gesture = currentGesture.current;
    
    // Update based on current gesture
    if (gesture === 'draw' && currentStroke.current) {
      updateStroke(touch);
    } else if (gesture === 'pan') {
      updatePan(touches);
    } else if (gesture === 'pinch') {
      updatePinch(touches);
    } else if (gesture === 'rotate') {
      updateRotate(touches);
    }
    
    // Update FPS
    updatePerformanceStats();
  }, []);

  // Handle touch end
  const handleTouchEnd = useCallback((touch: ExtendedTouchInfo) => {
    activeTouches.current.delete(touch.id);
    touchCount.current = activeTouches.current.size;
    
    // End stroke if drawing
    if (currentGesture.current === 'draw' && currentStroke.current) {
      endStroke();
    }
    
    // Reset gesture if no more touches
    if (touchCount.current === 0) {
      currentGesture.current = 'none';
      gestureStartTransform.current = null;
      gestureStartTouches.current = [];
    }
  }, []);

  // Start drawing stroke
  const startStroke = (touch: TouchInfo) => {
    if (!currentBrush || !canvasRef.current) return;
    
    const point: Point = {
      x: touch.x,
      y: touch.y,
      pressure: (touch as ExtendedTouchInfo).force || 0.5,
      tiltX: (touch as ExtendedTouchInfo).tiltX,
      tiltY: (touch as ExtendedTouchInfo).tiltY,
      timestamp: Date.now(),
    };
    
    // Apply transform
    const transformedPoint = transformManager.screenToCanvas(point, canvasTransform);
    
    // Create new stroke
    currentStroke.current = {
      id: `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tool: currentTool,
      brushId: currentBrush.id,
      color: { ...currentColor },
      points: [transformedPoint],
      layerId: layerManager.getCurrentLayerId(),
      timestamp: Date.now(),
    };
    
    // Initialize stroke path
    strokePath.current = Skia.Path.Make();
    strokePath.current.moveTo(transformedPoint.x, transformedPoint.y);
    
    // Track stroke start
    lastPoint.current = transformedPoint;
    strokeStartTime.current = Date.now();
    velocityHistory.current = [];
    
    // Notify listeners
    onStrokeStart?.(currentStroke.current);
    eventBus.emit('stroke:start', { stroke: currentStroke.current });
  };

  // Update drawing stroke
  const updateStroke = (touch: ExtendedTouchInfo) => {
    if (!currentStroke.current || !currentBrush || !strokePath.current) return;
    
    const point: Point = {
      x: touch.x,
      y: touch.y,
      pressure: touch.force || 0.5,
      tiltX: touch.tiltX,
      tiltY: touch.tiltY,
      timestamp: Date.now(),
    };
    
    // Apply transform
    const transformedPoint = transformManager.screenToCanvas(point, canvasTransform);
    
    // Calculate velocity
    const velocity = lastPoint.current
      ? calculateVelocity(transformedPoint, lastPoint.current)
      : 0;
    
    velocityHistory.current.push(velocity);
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift();
    }
    
    // Apply smoothing if enabled
    const smoothedPoint = mergedSettings.smoothing > 0
      ? applySmoothingToPoint(transformedPoint, lastPoint.current, mergedSettings.smoothing)
      : transformedPoint;
    
    // Add point to stroke
    currentStroke.current.points.push(smoothedPoint);
    
    // Update path
    if (lastPoint.current) {
      strokePath.current.lineTo(smoothedPoint.x, smoothedPoint.y);
    }
    
    // Render stroke segment
    renderStrokeSegment(lastPoint.current || smoothedPoint, smoothedPoint, velocity);
    
    // Update state
    lastPoint.current = smoothedPoint;
    
    // Notify listeners
    onStrokeUpdate?.(currentStroke.current);
    eventBus.emit('stroke:update', { stroke: currentStroke.current });
  };

  // End drawing stroke
  const endStroke = () => {
    if (!currentStroke.current) return;
    
    // Finalize stroke
    const finalStroke = { ...currentStroke.current };
    
    // Add to layer
    layerManager.addStroke(finalStroke);
    
    // Notify listeners
    onStrokeEnd?.(finalStroke);
    eventBus.emit('stroke:end', { stroke: finalStroke });
    
    // Reset stroke state
    currentStroke.current = null;
    strokePath.current = null;
    lastPoint.current = null;
    velocityHistory.current = [];
  };

  // Render stroke segment
  const renderStrokeSegment = (from: Point, to: Point, velocity: number) => {
    if (!currentBrush || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const surface = layerManager.getCurrentLayerSurface();
    if (!surface) return;
    
    // Get average velocity for smoothing
    const avgVelocity = velocityHistory.current.length > 0
      ? velocityHistory.current.reduce((a, b) => a + b) / velocityHistory.current.length
      : velocity;
    
    // Create paint for this segment
    const paint = brushEngine.createBrushPaint(
      currentBrush,
      currentColor,
      to,
      from,
      avgVelocity
    );
    
    // Create path for segment
    const segmentPath = Skia.Path.Make();
    segmentPath.moveTo(from.x, from.y);
    
    // Use quadratic bezier for smoothness
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    segmentPath.quadTo(from.x, from.y, midX, midY);
    segmentPath.quadTo(midX, midY, to.x, to.y);
    
    // Render with Valkyrie engine
    valkyrieEngine.renderPath(segmentPath, surface, paint, {
      predictive: mergedSettings.predictiveStroke,
      priority: 3, // High priority for active strokes
    });
    
    // Add dirty region for efficient rendering
    const bounds = segmentPath.computeTightBounds();
    valkyrieEngine.addDirtyRegion(
      bounds.x - paint.getStrokeWidth(),
      bounds.y - paint.getStrokeWidth(),
      bounds.width + paint.getStrokeWidth() * 2,
      bounds.height + paint.getStrokeWidth() * 2
    );
  };

  // Pan gesture handlers
  const startPan = (touches: ExtendedTouchInfo[]) => {
    gestureStartTransform.current = { ...canvasTransform };
    gestureStartTouches.current = touches.map(t => ({
      x: t.x,
      y: t.y,
      id: t.id,
      timestamp: t.timestamp,
    }));
  };

  const updatePan = (touches: ExtendedTouchInfo[]) => {
    if (!gestureStartTransform.current || gestureStartTouches.current.length < 2) return;
    
    // Calculate average movement
    let deltaX = 0;
    let deltaY = 0;
    let count = 0;
    
    touches.forEach(touch => {
      const startTouch = gestureStartTouches.current.find(t => t.id === touch.id);
      if (startTouch) {
        deltaX += touch.x - startTouch.x;
        deltaY += touch.y - startTouch.y;
        count++;
      }
    });
    
    if (count > 0) {
      deltaX /= count;
      deltaY /= count;
      
      const newTransform: Transform = {
        ...gestureStartTransform.current,
        x: gestureStartTransform.current.x + deltaX,
        y: gestureStartTransform.current.y + deltaY,
      };
      
      transformManager.setTransform(newTransform);
      setCanvasTransform(newTransform);
    }
  };

  // Pinch gesture handlers
  const startPinch = (touches: ExtendedTouchInfo[]) => {
    if (touches.length < 2) return;
    
    gestureStartTransform.current = { ...canvasTransform };
    
    const distance = calculateDistance(touches[0], touches[1]);
    lastTouchDistance.current = distance;
  };

  const updatePinch = (touches: ExtendedTouchInfo[]) => {
    if (!gestureStartTransform.current || touches.length < 2) return;
    
    const distance = calculateDistance(touches[0], touches[1]);
    const scale = distance / lastTouchDistance.current;
    
    // Calculate pinch center
    const centerX = (touches[0].x + touches[1].x) / 2;
    const centerY = (touches[0].y + touches[1].y) / 2;
    
    const newTransform: Transform = transformManager.applyPinch(
      gestureStartTransform.current,
      scale,
      { x: centerX, y: centerY }
    );
    
    transformManager.setTransform(newTransform);
    setCanvasTransform(newTransform);
  };

  // Rotate gesture handlers
  const startRotate = (touches: ExtendedTouchInfo[]) => {
    if (touches.length < 2) return;
    
    gestureStartTransform.current = { ...canvasTransform };
    
    const angle = calculateAngle(touches[0], touches[1]);
    lastTouchAngle.current = angle;
  };

  const updateRotate = (touches: ExtendedTouchInfo[]) => {
    if (!gestureStartTransform.current || touches.length < 2) return;
    
    const angle = calculateAngle(touches[0], touches[1]);
    const deltaAngle = angle - lastTouchAngle.current;
    
    // Calculate rotation center
    const centerX = (touches[0].x + touches[1].x) / 2;
    const centerY = (touches[0].y + touches[1].y) / 2;
    
    const newTransform: Transform = transformManager.applyRotation(
      gestureStartTransform.current,
      deltaAngle,
      { x: centerX, y: centerY }
    );
    
    transformManager.setTransform(newTransform);
    setCanvasTransform(newTransform);
  };

  // Event handlers
  const handleToolChange = ({ tool }: { tool: Tool }) => {
    setCurrentTool(tool);
  };

  const handleColorChange = ({ color }: { color: Color }) => {
    setCurrentColor(color);
  };

  const handleBrushChange = ({ brush }: { brush: Brush }) => {
    setCurrentBrush(brush);
  };

  const handleLayerChange = () => {
    // Re-render canvas when layer changes
    if (canvasRef.current) {
      renderCanvas();
    }
  };

  const handleTransformChange = ({ transform }: { transform: Transform }) => {
    setCanvasTransform(transform);
  };

  const handleUndo = () => {
    layerManager.undo();
    renderCanvas();
  };

  const handleRedo = () => {
    layerManager.redo();
    renderCanvas();
  };

  const handleGestureChange = (oldGesture: GestureType, newGesture: GestureType) => {
    eventBus.emit('gesture:changed', { from: oldGesture, to: newGesture });
    
    // Visual feedback for gesture change
    if (Platform.OS === 'ios' && newGesture !== 'draw' && newGesture !== 'none') {
      // Haptic feedback
      // Would use react-native-haptic-feedback here
    }
  };

  // Render full canvas
  const renderCanvas = () => {
    if (!canvasRef.current || !isInitialized) return;
    
    const mainSurface = valkyrieEngine.getMainSurface();
    if (!mainSurface) return;
    
    // Get all visible layers
    const layers = layerManager.getAllLayers().filter(layer => layer.visible);
    
    // Composite layers
    valkyrieEngine.composite(layers, mainSurface);
  };

  // Utility functions
  const calculateVelocity = (current: Point, last: Point): number => {
    const dx = current.x - last.x;
    const dy = current.y - last.y;
    const dt = current.timestamp - last.timestamp;
    
    if (dt === 0) return 0;
    
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance / dt;
  };

  const applySmoothingToPoint = (current: Point, last: Point | null, amount: number): Point => {
    if (!last) return current;
    
    return {
      ...current,
      x: last.x + (current.x - last.x) * (1 - amount),
      y: last.y + (current.y - last.y) * (1 - amount),
      pressure: last.pressure + (current.pressure - last.pressure) * (1 - amount),
    };
  };

  const calculateDistance = (p1: TouchInfo, p2: TouchInfo): number => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calculateAngle = (p1: TouchInfo, p2: TouchInfo): number => {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x) * (180 / Math.PI);
  };

  const updatePerformanceStats = () => {
    frameCount.current++;
    const now = Date.now();
    
    if (now - lastFrameTime.current >= 1000) {
      fps.value = frameCount.current;
      frameCount.current = 0;
      lastFrameTime.current = now;
      
      const stats = valkyrieEngine.getStats();
      eventBus.emit('performance:stats', {
        fps: fps.value,
        ...stats,
      });
    }
  };

  const cleanup = () => {
    console.log('🧹 Cleaning up canvas...');
    
    // Clean up engine resources
    valkyrieEngine.destroy();
    layerManager.cleanup();
    transformManager.cleanup();
    
    // Clear refs
    currentStroke.current = null;
    strokePath.current = null;
    activeTouches.current.clear();
  };

  // Debug info overlay
  const renderDebugInfo = () => {
    if (!__DEV__) return null;
    
    return (
      <View style={styles.debugOverlay}>
        <Text style={styles.debugText}>FPS: {fps.value}</Text>
        <Text style={styles.debugText}>Tool: {currentTool}</Text>
        <Text style={styles.debugText}>Gesture: {currentGesture.current}</Text>
        <Text style={styles.debugText}>Touches: {touchCount.current}</Text>
        <Text style={styles.debugText}>
          Transform: {`${canvasTransform.scale.toFixed(2)}x`}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { width: canvasWidth, height: canvasHeight }]}>
      <SkiaCanvas
        ref={canvasRef}
        style={styles.canvas}
        onTouch={touchHandler}
      />
      {renderDebugInfo()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
  },
  debugOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'monospace',
  },
});

export default ProfessionalCanvas;