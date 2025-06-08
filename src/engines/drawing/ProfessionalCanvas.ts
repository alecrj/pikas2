import { 
    Point, 
    Stroke, 
    Layer, 
    DrawingState, 
    Brush, 
    BlendMode,
    Dimensions,
    Color
  } from '../../types';
  import { performanceMonitor } from '../core/PerformanceMonitor';
  import { eventBus } from '../core';
  import { dataManager } from '../core/DataManager';
  
  /**
   * Professional Canvas Engine - 60fps drawing with Apple Pencil support
   * Handles all drawing operations with production-ready performance
   */
  export class ProfessionalCanvas {
    private canvas: HTMLCanvasElement | null = null;
    private ctx: CanvasRenderingContext2D | null = null;
    private offscreenCanvas: HTMLCanvasElement | null = null;
    private offscreenCtx: CanvasRenderingContext2D | null = null;
    private layerCanvases: Map<string, HTMLCanvasElement> = new Map();
    
    private state: DrawingState;
    private currentStroke: Point[] = [];
    private strokeBuffer: Point[] = [];
    private isDrawing = false;
    private lastPoint: Point | null = null;
    private undoStack: DrawingState[] = [];
    private redoStack: DrawingState[] = [];
    private strokeSmoothing = 0.5;
    private predictionPoints: Point[] = [];
    private animationFrameId: number | null = null;
    private lastRenderTime = 0;
    
    // Performance optimization
    private renderQueued = false;
    private dirtyRegion: DOMRect | null = null;
    
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
  
    public initialize(canvas: HTMLCanvasElement): void {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d', {
        alpha: true,
        desynchronized: true,
        willReadFrequently: false
      });
  
      if (!this.ctx) {
        throw new Error('Failed to get canvas context');
      }
  
      // Setup offscreen canvas for smoother rendering
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
      
      // Start render loop
      this.startRenderLoop();
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
  
    private startRenderLoop(): void {
      const renderFrame = (timestamp: number) => {
        const deltaTime = timestamp - this.lastRenderTime;
        
        // Target 60fps (16.67ms per frame)
        if (deltaTime >= 16) {
          if (this.renderQueued) {
            this.performRender();
            this.renderQueued = false;
          }
          
          this.lastRenderTime = timestamp;
          
          // Update performance metrics
          const fps = 1000 / deltaTime;
          performanceMonitor.recordDrawCall();
        }
        
        this.animationFrameId = requestAnimationFrame(renderFrame);
      };
      
      this.animationFrameId = requestAnimationFrame(renderFrame);
    }
  
    public startStroke(point: Point, brush: Brush, color: string): void {
      this.isDrawing = true;
      this.currentStroke = [point];
      this.lastPoint = point;
      
      // Save state for undo
      this.saveState();
      
      // Start performance monitoring for this stroke
      performanceMonitor.recordInputLatency(0);
      
      // Emit event
      eventBus.emit('drawing_started', { 
        action: 'stroke_start',
        brush: brush.id,
        pressure: point.pressure || 1
      });
    }
  
    public addPoint(point: Point): void {
      if (!this.isDrawing) return;
      
      // Record input latency
      const latency = point.timestamp - (this.lastPoint?.timestamp || 0);
      performanceMonitor.recordInputLatency(latency);
      
      // Apply smoothing
      const smoothedPoint = this.smoothPoint(point);
      
      // Add to stroke buffer for batch processing
      this.strokeBuffer.push(smoothedPoint);
      
      // Predict next points for lower latency feel
      this.predictNextPoints(smoothedPoint);
      
      // Process buffer if it gets too large
      if (this.strokeBuffer.length >= 3) {
        this.processStrokeBuffer();
      }
      
      this.lastPoint = smoothedPoint;
      
      // Queue render
      this.queueRender();
    }
  
    private processStrokeBuffer(): void {
      if (this.strokeBuffer.length === 0) return;
      
      // Add all buffered points to current stroke
      this.currentStroke.push(...this.strokeBuffer);
      
      // Clear buffer
      this.strokeBuffer = [];
      
      // Render the new segments
      this.renderCurrentStroke();
    }
  
    public endStroke(): void {
      if (!this.isDrawing) return;
      
      this.isDrawing = false;
      
      // Process any remaining buffered points
      this.processStrokeBuffer();
      
      // Create stroke object
      const activeLayer = this.getActiveLayer();
      if (activeLayer && this.currentStroke.length > 1) {
        const stroke: Stroke = {
          id: this.generateId(),
          points: this.optimizeStroke(this.currentStroke),
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
      
      // Record performance
      eventBus.emit('drawing_ended', {
        strokeLength: this.currentStroke.length,
        duration: Date.now() - (this.currentStroke[0]?.timestamp || Date.now())
      });
    }
  
    private smoothPoint(point: Point): Point {
      if (!this.lastPoint) return point;
      
      const smooth = this.strokeSmoothing;
      return {
        x: this.lastPoint.x + (point.x - this.lastPoint.x) * (1 - smooth),
        y: this.lastPoint.y + (point.y - this.lastPoint.y) * (1 - smooth),
        pressure: this.lastPoint.pressure + (point.pressure - this.lastPoint.pressure) * (1 - smooth),
        tiltX: point.tiltX,
        tiltY: point.tiltY,
        timestamp: point.timestamp
      };
    }
  
    private predictNextPoints(currentPoint: Point): void {
      if (this.currentStroke.length < 2) return;
      
      const prevPoint = this.currentStroke[this.currentStroke.length - 1];
      const velocity = {
        x: currentPoint.x - prevPoint.x,
        y: currentPoint.y - prevPoint.y
      };
      
      // Predict 2-3 points ahead for lower perceived latency
      this.predictionPoints = [];
      for (let i = 1; i <= 2; i++) {
        this.predictionPoints.push({
          x: currentPoint.x + velocity.x * i * 0.5,
          y: currentPoint.y + velocity.y * i * 0.5,
          pressure: currentPoint.pressure * (1 - i * 0.2),
          timestamp: currentPoint.timestamp + i * 16
        });
      }
    }
  
    private optimizeStroke(points: Point[]): Point[] {
      // Douglas-Peucker algorithm for point reduction
      if (points.length <= 2) return points;
      
      const tolerance = 0.5; // Adjust based on zoom level
      return this.douglasPeucker(points, tolerance);
    }
  
    private douglasPeucker(points: Point[], tolerance: number): Point[] {
      if (points.length <= 2) return points;
      
      let maxDistance = 0;
      let maxIndex = 0;
      
      // Find point with maximum distance from line
      for (let i = 1; i < points.length - 1; i++) {
        const distance = this.perpendicularDistance(
          points[i], 
          points[0], 
          points[points.length - 1]
        );
        
        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndex = i;
        }
      }
      
      // If max distance is greater than tolerance, recursively simplify
      if (maxDistance > tolerance) {
        const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
        const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
        
        return [...left.slice(0, -1), ...right];
      } else {
        return [points[0], points[points.length - 1]];
      }
    }
  
    private perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
      const dx = lineEnd.x - lineStart.x;
      const dy = lineEnd.y - lineStart.y;
      
      if (dx === 0 && dy === 0) {
        return Math.sqrt(
          Math.pow(point.x - lineStart.x, 2) + 
          Math.pow(point.y - lineStart.y, 2)
        );
      }
      
      const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / 
                (dx * dx + dy * dy);
      
      const projection = {
        x: lineStart.x + t * dx,
        y: lineStart.y + t * dy
      };
      
      return Math.sqrt(
        Math.pow(point.x - projection.x, 2) + 
        Math.pow(point.y - projection.y, 2)
      );
    }
  
    private renderCurrentStroke(): void {
      if (!this.offscreenCtx || this.currentStroke.length < 2) return;
      
      const points = [...this.currentStroke, ...this.predictionPoints];
      const brush = this.getCurrentBrush();
      const color = this.getCurrentColor();
      
      // Clear offscreen canvas
      this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas!.width, this.offscreenCanvas!.height);
      
      // Setup context
      this.offscreenCtx.globalCompositeOperation = 'source-over';
      this.offscreenCtx.globalAlpha = brush.settings.opacity;
      this.offscreenCtx.strokeStyle = color;
      this.offscreenCtx.lineCap = 'round';
      this.offscreenCtx.lineJoin = 'round';
      
      // Draw smooth curve through points
      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(points[0].x, points[0].y);
      
      // Use quadratic bezier curves for smoothness
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        
        // Vary line width based on pressure and speed
        const pressure = points[i].pressure || 1;
        const speed = this.calculateSpeed(points[i-1], points[i]);
        const speedFactor = Math.max(0.5, 1 - speed / 500);
        
        this.offscreenCtx.lineWidth = 
          (brush.settings.minSize + (brush.settings.maxSize - brush.settings.minSize) * pressure) * speedFactor;
        
        this.offscreenCtx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }
      
      // Draw last segment
      const lastPoint = points[points.length - 1];
      this.offscreenCtx.lineTo(lastPoint.x, lastPoint.y);
      this.offscreenCtx.stroke();
      
      // Apply brush texture if available
      if (brush.settings.texture) {
        this.applyBrushTexture(brush);
      }
    }
  
    private calculateSpeed(p1: Point, p2: Point): number {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dt = p2.timestamp - p1.timestamp || 16;
      
      return Math.sqrt(dx * dx + dy * dy) / dt * 1000; // pixels per second
    }
  
    private applyBrushTexture(brush: Brush): void {
      // Placeholder for texture application
      // In production, this would apply texture patterns
    }
  
    private queueRender(): void {
      this.renderQueued = true;
    }
  
    private performRender(): void {
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
        
        this.renderLayer(layer);
      }
      
      // Render current stroke if drawing
      if (this.isDrawing && this.currentStroke.length > 0) {
        this.ctx.drawImage(this.offscreenCanvas!, 0, 0);
      }
      
      this.ctx.restore();
      
      // Track performance
      const renderTime = performance.now() - startTime;
      performanceMonitor.recordRenderTime(renderTime);
      
      if (renderTime > 16.67) { // More than 1 frame at 60fps
        console.warn(`Slow render: ${renderTime.toFixed(2)}ms`);
      }
    }
  
    private renderLayer(layer: Layer): void {
      if (!this.ctx) return;
      
      // Get or create layer canvas
      let layerCanvas = this.layerCanvases.get(layer.id);
      if (!layerCanvas) {
        layerCanvas = document.createElement('canvas');
        layerCanvas.width = this.state.canvasSize.width;
        layerCanvas.height = this.state.canvasSize.height;
        this.layerCanvases.set(layer.id, layerCanvas);
      }
      
      const layerCtx = layerCanvas.getContext('2d');
      if (!layerCtx) return;
      
      // Clear layer canvas
      layerCtx.clearRect(0, 0, layerCanvas.width, layerCanvas.height);
      
      // Render strokes to layer canvas
      for (const stroke of layer.strokes) {
        this.renderStroke(layerCtx, stroke);
      }
      
      // Composite layer to main canvas
      this.ctx.globalAlpha = layer.opacity;
      this.ctx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
      this.ctx.drawImage(layerCanvas, 0, 0);
    }
  
    private renderStroke(ctx: CanvasRenderingContext2D, stroke: Stroke): void {
      if (stroke.points.length < 2) return;
      
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = this.getBlendMode(stroke.blendMode || 'normal');
      
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      // Draw smooth curve through points
      for (let i = 1; i < stroke.points.length - 1; i++) {
        const xc = (stroke.points[i].x + stroke.points[i + 1].x) / 2;
        const yc = (stroke.points[i].y + stroke.points[i + 1].y) / 2;
        
        const pressure = stroke.points[i].pressure || 1;
        ctx.lineWidth = stroke.size * pressure;
        
        ctx.quadraticCurveTo(stroke.points[i].x, stroke.points[i].y, xc, yc);
      }
      
      // Draw last segment
      const lastPoint = stroke.points[stroke.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
      ctx.stroke();
      
      ctx.restore();
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
  
    public render(): void {
      this.queueRender();
    }
  
    // Layer management
    public addLayer(name?: string): Layer {
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
  
    public deleteLayer(layerId: string): void {
      if (this.state.layers.length === 1) return; // Keep at least one layer
      
      this.state.layers = this.state.layers.filter(l => l.id !== layerId);
      
      if (this.state.activeLayerId === layerId) {
        this.state.activeLayerId = this.state.layers[0].id;
      }
      
      // Remove layer canvas
      this.layerCanvases.delete(layerId);
      
      this.render();
    }
  
    // Undo/Redo
    public undo(): void {
      if (this.undoStack.length === 0) return;
      
      const previousState = this.undoStack.pop()!;
      this.redoStack.push(this.cloneState(this.state));
      this.state = previousState;
      this.render();
    }
  
    public redo(): void {
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
    public async exportImage(format: 'png' | 'jpeg' = 'png', quality = 0.92): Promise<Blob> {
      return new Promise((resolve, reject) => {
        if (!this.canvas) {
          reject(new Error('Canvas not initialized'));
          return;
        }
        
        // Create export canvas
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = this.state.canvasSize.width;
        exportCanvas.height = this.state.canvasSize.height;
        
        const exportCtx = exportCanvas.getContext('2d');
        if (!exportCtx) {
          reject(new Error('Failed to create export context'));
          return;
        }
        
        // Fill background
        exportCtx.fillStyle = this.state.backgroundColor;
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        
        // Render all layers
        for (const layer of this.state.layers) {
          if (!layer.visible) continue;
          
          const layerCanvas = this.layerCanvases.get(layer.id);
          if (layerCanvas) {
            exportCtx.globalAlpha = layer.opacity;
            exportCtx.globalCompositeOperation = this.getBlendMode(layer.blendMode);
            exportCtx.drawImage(layerCanvas, 0, 0);
          }
        }
        
        exportCanvas.toBlob(
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
    public getState(): DrawingState {
      return this.cloneState(this.state);
    }
  
    public setState(state: Partial<DrawingState>): void {
      this.state = { ...this.state, ...state };
      this.render();
    }
  
    public clear(): void {
      this.saveState();
      const activeLayer = this.getActiveLayer();
      if (activeLayer) {
        activeLayer.strokes = [];
        this.render();
      }
    }
  
    public setZoom(zoom: number): void {
      this.state.zoom = Math.max(0.1, Math.min(5, zoom));
      this.render();
    }
  
    public setPan(x: number, y: number): void {
      this.state.pan = { x, y };
      this.render();
    }
  
    public destroy(): void {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
      }
      
      this.layerCanvases.clear();
      performanceMonitor.resetDrawCalls();
    }
  }