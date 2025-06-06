/**
 * Professional Drawing Engine
 * Handles all drawing operations with 60fps performance and Apple Pencil optimization
 */

import { 
    Point, 
    Stroke, 
    Layer, 
    DrawingState, 
    Brush, 
    BlendMode 
  } from '../../types';
  import { performanceMonitor, eventBus, dataManager } from '../core';
  
  // Professional Canvas Engine
  export class ProfessionalCanvas {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private offscreenCanvas: HTMLCanvasElement | null = null;
    private offscreenCtx: CanvasRenderingContext2D | null = null;
    private state: DrawingState;
    private currentStroke: Point[] = [];
    private isDrawing = false;
    private lastPoint: Point | null = null;
    private undoStack: DrawingState[] = [];
    private redoStack: DrawingState[] = [];
    private strokeSmoothing = 0.5;
    private predictionPoints: Point[] = [];
    
    constructor(initialState?: Partial<DrawingState>) {
      this.state = {
        layers: [{
          id: 'layer-1',
          name: 'Layer 1',
          strokes: [],
          opacity: 1,
          blendMode: 'normal',
          visible: true,
          locked: false
        }],
        activeLayerId: 'layer-1',
        canvasSize: { width: 1024, height: 1024 },
        zoom: 1,
        pan: { x: 0, y: 0 },
        backgroundColor: '#FFFFFF',
        ...initialState
      };
    }
  
    initialize(canvas: HTMLCanvasElement): void {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true, // Better performance
        willReadFrequently: false
      });
  
      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }
  
      // Setup offscreen canvas for better performance
      this.offscreenCanvas = document.createElement('canvas');
      this.offscreenCanvas.width = this.state.canvasSize.width;
      this.offscreenCanvas.height = this.state.canvasSize.height;
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
        alpha: true,
        desynchronized: true
      });
  
      // Configure for high-quality rendering
      this.ctx.imageSmoothingEnabled = true;
      this.ctx.imageSmoothingQuality = 'high';
      
      // Set canvas size
      this.resizeCanvas();
      
      // Initial render
      this.render();
    }
  
    private resizeCanvas(): void {
      if (!this.canvas || !this.ctx) return;
  
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      
      this.ctx.scale(dpr, dpr);
      this.canvas.style.width = `${rect.width}px`;
      this.canvas.style.height = `${rect.height}px`;
    }
  
    startStroke(point: Point, brush: Brush, color: string): void {
      this.isDrawing = true;
      this.currentStroke = [point];
      this.lastPoint = point;
      
      // Save state for undo
      this.saveState();
      
      // Start performance monitoring for this stroke
      performanceMonitor.startMonitoring();
      
      // Emit event
      eventBus.emit('lesson_started', { 
        action: 'stroke_start',
        brush: brush.id,
        pressure: point.pressure || 1
      });
    }
  
    addPoint(point: Point): void {
      if (!this.isDrawing) return;
      
      // Apply smoothing and prediction
      const smoothedPoint = this.smoothPoint(point);
      this.currentStroke.push(smoothedPoint);
      
      // Predict next points for lower latency feel
      this.predictNextPoints(smoothedPoint);
      
      // Render the new segment
      this.renderCurrentStroke();
      
      this.lastPoint = smoothedPoint;
    }
  
    endStroke(): void {
      if (!this.isDrawing) return;
      
      this.isDrawing = false;
      
      // Create stroke object
      const activeLayer = this.getActiveLayer();
      if (activeLayer && this.currentStroke.length > 1) {
        const stroke: Stroke = {
          id: this.generateId(),
          points: this.currentStroke,
          color: this.getCurrentColor(),
          brushId: this.getCurrentBrush().id,
          size: this.getCurrentBrush().settings.minSize,
          opacity: this.getCurrentBrush().settings.opacity,
          blendMode: 'normal',
          smoothing: this.strokeSmoothing
        };
        
        activeLayer.strokes.push(stroke);
        
        // Clear redo stack
        this.redoStack = [];
        
        // Save to storage
        this.saveDrawing();
      }
      
      this.currentStroke = [];
      this.predictionPoints = [];
      
      // Full render to clean up
      this.render();
    }
  
    private smoothPoint(point: Point): Point {
      if (!this.lastPoint) return point;
      
      const smooth = this.strokeSmoothing;
      return {
        x: this.lastPoint.x + (point.x - this.lastPoint.x) * (1 - smooth),
        y: this.lastPoint.y + (point.y - this.lastPoint.y) * (1 - smooth),
        pressure: point.pressure,
        tiltX: point.tiltX,
        tiltY: point.tiltY,
        timestamp: point.timestamp
      };
    }
  
    private predictNextPoints(currentPoint: Point): void {
      if (this.currentStroke.length < 2) return;
      
      const prevPoint = this.currentStroke[this.currentStroke.length - 2];
      const velocity = {
        x: currentPoint.x - prevPoint.x,
        y: currentPoint.y - prevPoint.y
      };
      
      // Predict 2-3 points ahead
      this.predictionPoints = [];
      for (let i = 1; i <= 3; i++) {
        this.predictionPoints.push({
          x: currentPoint.x + velocity.x * i * 0.3,
          y: currentPoint.y + velocity.y * i * 0.3,
          pressure: currentPoint.pressure,
          timestamp: currentPoint.timestamp + i * 16 // ~60fps
        });
      }
    }
  
    private renderCurrentStroke(): void {
      if (!this.ctx || !this.offscreenCtx) return;
      
      const points = [...this.currentStroke, ...this.predictionPoints];
      if (points.length < 2) return;
      
      const brush = this.getCurrentBrush();
      const color = this.getCurrentColor();
      
      // Clear and setup context
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas!.width, this.offscreenCanvas!.height);
      this.offscreenCtx.globalCompositeOperation = 'source-over';
      this.offscreenCtx.globalAlpha = brush.settings.opacity;
      this.offscreenCtx.strokeStyle = color;
      this.offscreenCtx.lineCap = 'round';
      this.offscreenCtx.lineJoin = 'round';
      
      // Draw smooth curve through points
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        
        // Vary line width based on pressure
        const pressure = points[i].pressure || 1;
        this.offscreenCtx.lineWidth = brush.settings.minSize + 
          (brush.settings.maxSize - brush.settings.minSize) * pressure;
        
        this.offscreenCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      
      this.offscreenCtx.stroke();
      
      // Composite to main canvas
      this.ctx.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
      this.render();
    }
  
    render(): void {
      if (!this.ctx || !this.canvas) return;
  
      const startTime = performance.now();
      
      // Clear canvas
      this.ctx.fillStyle = this.state.backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Apply transformations
      this.ctx.save();
      this.ctx.translate(this.state.pan.x, this.state.pan.y);
      this.ctx.scale(this.state.zoom, this.state.zoom);
      
      // Render each layer
      for (const layer of this.state.layers) {
        if (!layer.visible) continue;
        
        this.ctx.globalAlpha = layer.opacity;
        this.ctx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
        
        // Render strokes
        for (const stroke of layer.strokes) {
          this.renderStroke(stroke);
        }
      }
      
      // Render current stroke if drawing
      if (this.isDrawing && this.currentStroke.length > 0) {
        this.ctx.drawImage(this.offscreenCanvas!, 0, 0);
      }
      
      this.ctx.restore();
      
      // Track performance
      const renderTime = performance.now() - startTime;
      if (renderTime > 16) { // More than 1 frame at 60fps
        console.warn(`Slow render: ${renderTime.toFixed(2)}ms`);
      }
    }
  
    private renderStroke(stroke: Stroke): void {
      if (!this.ctx || stroke.points.length < 2) return;
      
      this.ctx.save();
      this.ctx.globalAlpha = stroke.opacity;
      this.ctx.strokeStyle = stroke.color;
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      
      this.ctx.beginPath();
      this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        
        const pressure = stroke.points[i].pressure || 1;
        this.ctx.lineWidth = stroke.size * pressure;
        
        this.ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }
      
      // Draw last segment
      const lastPoint = stroke.points[stroke.points.length - 1];
      this.ctx.lineTo(lastPoint.x, lastPoint.y);
      this.ctx.stroke();
      
      this.ctx.restore();
    }
  
    private getBlendMode(mode: BlendMode): GlobalCompositeOperation {
      const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
        'normal': 'source-over',
        'multiply': 'multiply',
        'screen': 'screen',
        'overlay': 'overlay',
        'soft-light': 'soft-light',
        'hard-light': 'hard-light',
        'color-dodge': 'color-dodge',
        'color-burn': 'color-burn'
      };
      
      return blendModeMap[mode] || 'source-over';
    }
  
    // Layer management
    addLayer(name?: string): Layer {
      const layer: Layer = {
        id: this.generateId(),
        name: name || `Layer ${this.state.layers.length + 1}`,
        strokes: [],
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: false
      };
      
      this.state.layers.push(layer);
      this.state.activeLayerId = layer.id;
      this.render();
      
      return layer;
    }
  
    deleteLayer(layerId: string): void {
      if (this.state.layers.length === 1) return; // Keep at least one layer
      
      this.state.layers = this.state.layers.filter(l => l.id !== layerId);
      
      if (this.state.activeLayerId === layerId) {
        this.state.activeLayerId = this.state.layers[0].id;
      }
      
      this.render();
    }
  
    // Undo/Redo
    undo(): void {
      if (this.undoStack.length === 0) return;
      
      const previousState = this.undoStack.pop()!;
      this.redoStack.push(this.cloneState(this.state));
      this.state = previousState;
      this.render();
    }
  
    redo(): void {
      if (this.redoStack.length === 0) return;
      
      const nextState = this.redoStack.pop()!;
      this.undoStack.push(this.cloneState(this.state));
      this.state = nextState;
      this.render();
    }
  
    private saveState(): void {
      this.undoStack.push(this.cloneState(this.state));
      
      // Limit undo stack size
      if (this.undoStack.length > 50) {
        this.undoStack.shift();
      }
    }
  
    private cloneState(state: DrawingState): DrawingState {
      return JSON.parse(JSON.stringify(state));
    }
  
    // Export functionality
    async exportImage(format: 'png' | 'jpeg' = 'png', quality = 0.92): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (!this.canvas) {
          reject(new Error('Canvas not initialized'));
          return;
        }
        
        this.canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to export image'));
            }
          },
          `image/${format}`,
          quality
        );
      });
    }
  
    // Utility methods
    private getActiveLayer(): Layer | null {
      return this.state.layers.find(l => l.id === this.state.activeLayerId) || null;
    }
  
    private getCurrentBrush(): Brush {
      // Default brush - would be set by UI
      return {
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
          smoothing: 0.5
        }
      };
    }
  
    private getCurrentColor(): string {
      // Default color - would be set by UI
      return '#000000';
    }
  
    private generateId(): string {
      return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  
    private async saveDrawing(): Promise<void> {
      try {
        await dataManager.save('pikaso_drawing_state', this.state);
      } catch (error) {
        console.error('Failed to save drawing:', error);
      }
    }
  
    // Public API
    getState(): DrawingState {
      return this.cloneState(this.state);
    }
  
    setState(state: Partial<DrawingState>): void {
      this.state = { ...this.state, ...state };
      this.render();
    }
  
    clear(): void {
      this.saveState();
      const activeLayer = this.getActiveLayer();
      if (activeLayer) {
        activeLayer.strokes = [];
        this.render();
      }
    }
  
    setZoom(zoom: number): void {
      this.state.zoom = Math.max(0.1, Math.min(5, zoom));
      this.render();
    }
  
    setPan(x: number, y: number): void {
      this.state.pan = { x, y };
      this.render();
    }
  }
  
  // Brush Engine
  export class BrushEngine {
    private brushes: Map<string, Brush> = new Map();
    private customBrushes: Map<string, Brush> = new Map();
    private activeBrushId = 'pencil';
    
    constructor() {
      this.initializeDefaultBrushes();
    }
  
    private initializeDefaultBrushes(): void {
      const defaultBrushes: Brush[] = [
        {
          id: 'pencil',
          name: 'Pencil',
          icon: '✏️',
          type: 'pencil',
          settings: {
            minSize: 1,
            maxSize: 8,
            pressureSensitivity: 0.9,
            tiltSensitivity: 0.7,
            opacity: 0.9,
            flow: 0.95,
            smoothing: 0.3,
            texture: 'pencil'
          }
        },
        {
          id: 'ink',
          name: 'Ink Pen',
          icon: '🖊️',
          type: 'ink',
          settings: {
            minSize: 2,
            maxSize: 12,
            pressureSensitivity: 0.8,
            tiltSensitivity: 0.4,
            opacity: 1,
            flow: 1,
            smoothing: 0.5
          }
        },
        {
          id: 'watercolor',
          name: 'Watercolor',
          icon: '🎨',
          type: 'watercolor',
          settings: {
            minSize: 10,
            maxSize: 50,
            pressureSensitivity: 0.6,
            tiltSensitivity: 0.8,
            opacity: 0.3,
            flow: 0.7,
            smoothing: 0.8,
            texture: 'watercolor'
          }
        },
        {
          id: 'marker',
          name: 'Marker',
          icon: '🖍️',
          type: 'marker',
          settings: {
            minSize: 5,
            maxSize: 20,
            pressureSensitivity: 0.3,
            tiltSensitivity: 0.2,
            opacity: 0.8,
            flow: 0.9,
            smoothing: 0.2
          }
        },
        {
          id: 'airbrush',
          name: 'Airbrush',
          icon: '💨',
          type: 'airbrush',
          settings: {
            minSize: 20,
            maxSize: 100,
            pressureSensitivity: 0.7,
            tiltSensitivity: 0.5,
            opacity: 0.2,
            flow: 0.6,
            smoothing: 0.9
          }
        }
      ];
      
      defaultBrushes.forEach(brush => {
        this.brushes.set(brush.id, brush);
      });
    }
  
    getBrush(id: string): Brush | null {
      return this.brushes.get(id) || this.customBrushes.get(id) || null;
    }
  
    getAllBrushes(): Brush[] {
      return [...this.brushes.values(), ...this.customBrushes.values()];
    }
  
    getActiveBrush(): Brush {
      return this.getBrush(this.activeBrushId) || this.brushes.get('pencil')!;
    }
  
    setActiveBrush(id: string): void {
      if (this.getBrush(id)) {
        this.activeBrushId = id;
        eventBus.emit('lesson_started', { action: 'brush_changed', brushId: id });
      }
    }
  
    createCustomBrush(brush: Omit<Brush, 'id'>): Brush {
      const customBrush: Brush = {
        ...brush,
        id: `custom-${Date.now()}`
      };
      
      this.customBrushes.set(customBrush.id, customBrush);
      this.saveCustomBrushes();
      
      return customBrush;
    }
  
    updateBrushSettings(id: string, settings: Partial<Brush['settings']>): void {
      const brush = this.getBrush(id);
      if (brush) {
        brush.settings = { ...brush.settings, ...settings };
        
        if (this.customBrushes.has(id)) {
          this.saveCustomBrushes();
        }
      }
    }
  
    private async saveCustomBrushes(): Promise<void> {
      const brushArray = Array.from(this.customBrushes.values());
      await dataManager.save('pikaso_custom_brushes', brushArray);
    }
  
    async loadCustomBrushes(): Promise<void> {
      const brushArray = await dataManager.load<Brush[]>('pikaso_custom_brushes');
      if (brushArray) {
        brushArray.forEach(brush => {
          this.customBrushes.set(brush.id, brush);
        });
      }
    }
  }
  
  // Performance Optimizer
  export class PerformanceOptimizer {
    private canvas: ProfessionalCanvas;
    private targetFPS = 60;
    private adaptiveQuality = true;
    private currentQuality = 1;
    
    constructor(canvas: ProfessionalCanvas) {
      this.canvas = canvas;
      this.startOptimization();
    }
  
    private startOptimization(): void {
      // Monitor performance and adjust quality
      setInterval(() => {
        const avgFPS = performanceMonitor.getAverageFPS();
        
        if (avgFPS < this.targetFPS * 0.9 && this.adaptiveQuality) {
          this.decreaseQuality();
        } else if (avgFPS > this.targetFPS * 0.95 && this.currentQuality < 1) {
          this.increaseQuality();
        }
      }, 1000);
    }
  
    private decreaseQuality(): void {
      this.currentQuality = Math.max(0.5, this.currentQuality - 0.1);
      this.applyQuality();
    }
  
    private increaseQuality(): void {
      this.currentQuality = Math.min(1, this.currentQuality + 0.1);
      this.applyQuality();
    }
  
    private applyQuality(): void {
      const state = this.canvas.getState();
      
      // Adjust canvas resolution based on quality
      const baseSize = 1024;
      const newSize = Math.round(baseSize * this.currentQuality);
      
      if (state.canvasSize.width !== newSize) {
        this.canvas.setState({
          canvasSize: { width: newSize, height: newSize }
        });
      }
    }
  
    setAdaptiveQuality(enabled: boolean): void {
      this.adaptiveQuality = enabled;
      if (!enabled) {
        this.currentQuality = 1;
        this.applyQuality();
      }
    }
  
    setTargetFPS(fps: number): void {
      this.targetFPS = Math.max(30, Math.min(120, fps));
    }
  }
  
  // Export main classes
  export { ProfessionalCanvas, BrushEngine, PerformanceOptimizer };