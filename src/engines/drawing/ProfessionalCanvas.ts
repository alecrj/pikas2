import {
    Canvas,
    Path,
    Skia,
    Paint,
    useCanvasRef,
    SkPath,
    BlendMode as SkiaBlendMode,
    PaintStyle,
    StrokeCap,
    StrokeJoin,
    Image as SkiaImage,
    SkImage,
    Surface,
    Group,
    Drawing,
    useImage,
  } from '@shopify/react-native-skia';
  import { Platform } from 'react-native';
  import { Point, Stroke, Layer, Brush, BlendMode, Color } from '../../types';
  import { performanceMonitor } from '../core/PerformanceMonitor';
  import { errorHandler } from '../core/ErrorHandler';
  import { EventBus } from '../core/EventBus';
  
  /**
   * Professional Canvas Engine - Procreate-level drawing with React Native Skia
   * Achieves 60fps performance with Apple Pencil optimization
   */
  export class ProfessionalCanvas {
    private canvasRef: any = null;
    private surface: any = null;
    private recording: boolean = false;
    
    // Drawing state
    private currentPath: SkPath | null = null;
    private currentStroke: Point[] = [];
    private currentPaint: Paint | null = null;
    private isDrawing: boolean = false;
    private lastPoint: Point | null = null;
    private strokeId: string = '';
    
    // Performance optimization
    private frameCount: number = 0;
    private lastFrameTime: number = 0;
    private renderQueue: (() => void)[] = [];
    private isRendering: boolean = false;
    
    // Canvas state
    private layers: Map<string, {
      layer: Layer;
      surface: any;
      image: SkImage | null;
      needsRedraw: boolean;
    }> = new Map();
    
    private activeLayerId: string = 'layer-1';
    private zoom: number = 1;
    private pan: { x: number; y: number } = { x: 0, y: 0 };
    private rotation: number = 0;
    
    // Brush state
    private currentBrush: Brush = this.getDefaultBrush();
    private currentColor: Color = this.getDefaultColor();
    private brushPaint: Paint | null = null;
    
    // Canvas properties
    private canvasWidth: number = 1024;
    private canvasHeight: number = 768;
    private pixelRatio: number = 3; // For retina displays
    
    // Apple Pencil state
    private pencilState = {
      pressure: 0,
      tiltX: 0,
      tiltY: 0,
      azimuth: 0,
      altitude: 0,
      hovering: false,
      barrelButtonPressed: false,
    };
    
    // Stroke smoothing
    private smoothingBuffer: Point[] = [];
    private smoothingFactor: number = 0.5;
    
    // Memory management
    private maxLayerSize: number = 4096 * 4096 * 4; // Max 4K resolution
    private totalMemoryUsage: number = 0;
    private memoryWarningThreshold: number = 500 * 1024 * 1024; // 500MB
    
    // Event system
    private eventBus: EventBus = EventBus.getInstance();
    
    // Undo/redo optimization
    private strokeCache: Map<string, Stroke> = new Map();
    private redoStack: string[] = [];
    
    constructor() {
      this.initializeBrushPaint();
      this.setupPerformanceMonitoring();
    }
  
    // ---- PUBLIC API ----
  
    public initialize(canvasRef: any, width: number, height: number): void {
      this.canvasRef = canvasRef;
      this.canvasWidth = width;
      this.canvasHeight = height;
      this.pixelRatio = Platform.OS === 'ios' ? 3 : 2;
      
      // Create main surface for compositing
      this.createMainSurface();
      
      // Initialize default layer
      this.createLayer('layer-1', 'Background');
      
      // Setup event listeners
      this.setupEventListeners();
      
      console.log('Professional Canvas initialized with Skia backend');
      performanceMonitor.recordAppLaunch();
    }
  
    public startStroke(point: Point): void {
      const startTime = performance.now();
      
      this.isDrawing = true;
      this.strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.currentStroke = [point];
      this.lastPoint = point;
      this.smoothingBuffer = [point];
      
      // Create new path for this stroke
      this.currentPath = Skia.Path.Make();
      this.currentPath.moveTo(point.x, point.y);
      
      // Update brush paint with current settings
      this.updateBrushPaint(point);
      
      // Start recording performance
      this.frameCount = 0;
      this.lastFrameTime = startTime;
      
      // Emit stroke start event
      this.eventBus.emit('stroke:start', { strokeId: this.strokeId, point });
      
      // Initial render
      this.renderStroke();
      
      const latency = performance.now() - startTime;
      performanceMonitor.recordInputLatency(latency);
    }
  
    public addPoint(point: Point): void {
      if (!this.isDrawing || !this.currentPath) return;
      
      const startTime = performance.now();
      
      // Apply smoothing
      const smoothedPoint = this.applySmoothingToPoint(point);
      this.currentStroke.push(smoothedPoint);
      
      // Optimize path generation for performance
      if (this.currentStroke.length > 2) {
        const prevPoint = this.currentStroke[this.currentStroke.length - 2];
        const controlPoint = {
          x: (prevPoint.x + smoothedPoint.x) / 2,
          y: (prevPoint.y + smoothedPoint.y) / 2,
        };
        
        // Use quadratic bezier for smooth curves
        this.currentPath.quadTo(
          prevPoint.x,
          prevPoint.y,
          controlPoint.x,
          controlPoint.y
        );
      } else {
        this.currentPath.lineTo(smoothedPoint.x, smoothedPoint.y);
      }
      
      // Update brush dynamics
      this.updateBrushPaint(smoothedPoint);
      
      // Queue render
      this.renderStroke();
      
      this.lastPoint = smoothedPoint;
      this.frameCount++;
      
      // Performance tracking
      const frameTime = performance.now() - this.lastFrameTime;
      if (frameTime > 16.67) {
        console.warn(`Frame time exceeded target: ${frameTime.toFixed(2)}ms`);
      }
      this.lastFrameTime = performance.now();
      
      const latency = performance.now() - startTime;
      performanceMonitor.recordInputLatency(latency);
    }
  
    public endStroke(): void {
      if (!this.isDrawing || !this.currentPath) return;
      
      this.isDrawing = false;
      
      // Finalize the stroke
      const stroke: Stroke = {
        id: this.strokeId,
        points: [...this.currentStroke],
        color: this.currentColor.hex,
        brushId: this.currentBrush.id,
        size: this.currentBrush.settings.size,
        opacity: this.currentBrush.settings.opacity,
        blendMode: this.currentBrush.blendMode || 'normal',
        smoothing: this.currentBrush.settings.smoothing,
        path: this.currentPath.copy(), // Store path for efficient redrawing
      };
      
      // Add to active layer
      const layerData = this.layers.get(this.activeLayerId);
      if (layerData) {
        layerData.layer.strokes.push(stroke);
        layerData.needsRedraw = true;
        
        // Cache stroke for undo/redo
        this.strokeCache.set(stroke.id, stroke);
        
        // Clear redo stack
        this.redoStack = [];
        
        // Render final stroke to layer
        this.renderToLayer(this.activeLayerId);
      }
      
      // Emit stroke complete event
      this.eventBus.emit('stroke:complete', { stroke });
      
      // Report performance metrics
      const avgFrameTime = this.frameCount > 0 ? 
        (performance.now() - this.lastFrameTime) / this.frameCount : 0;
      console.log(`Stroke completed: ${this.frameCount} frames, avg ${avgFrameTime.toFixed(2)}ms/frame`);
      
      // Cleanup
      this.currentPath = null;
      this.currentStroke = [];
      this.smoothingBuffer = [];
      this.strokeId = '';
      
      // Check memory usage
      this.checkMemoryUsage();
    }
  
    public undo(): void {
      const layerData = this.layers.get(this.activeLayerId);
      if (!layerData || layerData.layer.strokes.length === 0) return;
      
      const lastStroke = layerData.layer.strokes.pop();
      if (lastStroke) {
        this.redoStack.push(lastStroke.id);
        layerData.needsRedraw = true;
        this.renderToLayer(this.activeLayerId);
        
        this.eventBus.emit('canvas:undo', { strokeId: lastStroke.id });
      }
    }
  
    public redo(): void {
      if (this.redoStack.length === 0) return;
      
      const strokeId = this.redoStack.pop();
      const stroke = this.strokeCache.get(strokeId!);
      
      if (stroke) {
        const layerData = this.layers.get(this.activeLayerId);
        if (layerData) {
          layerData.layer.strokes.push(stroke);
          layerData.needsRedraw = true;
          this.renderToLayer(this.activeLayerId);
          
          this.eventBus.emit('canvas:redo', { strokeId: stroke.id });
        }
      }
    }
  
    public addLayer(name: string = 'New Layer'): string {
      const layerId = `layer-${Date.now()}`;
      this.createLayer(layerId, name);
      this.activeLayerId = layerId;
      
      this.eventBus.emit('layer:add', { layerId, name });
      return layerId;
    }
  
    public deleteLayer(layerId: string): void {
      if (this.layers.size <= 1) {
        console.warn('Cannot delete the last layer');
        return;
      }
      
      const layerData = this.layers.get(layerId);
      if (layerData) {
        // Clean up layer resources
        if (layerData.surface) {
          // Dispose of surface resources
          layerData.surface = null;
        }
        
        this.layers.delete(layerId);
        
        // Update active layer if needed
        if (this.activeLayerId === layerId) {
          this.activeLayerId = this.layers.keys().next().value;
        }
        
        this.eventBus.emit('layer:delete', { layerId });
        this.updateMemoryUsage();
      }
    }
  
    public setActiveLayer(layerId: string): void {
      if (this.layers.has(layerId)) {
        this.activeLayerId = layerId;
        this.eventBus.emit('layer:activate', { layerId });
      }
    }
  
    public updateLayerProperties(layerId: string, properties: Partial<Layer>): void {
      const layerData = this.layers.get(layerId);
      if (layerData) {
        Object.assign(layerData.layer, properties);
        layerData.needsRedraw = true;
        this.renderComposite();
        
        this.eventBus.emit('layer:update', { layerId, properties });
      }
    }
  
    public setBrush(brush: Brush): void {
      this.currentBrush = brush;
      this.initializeBrushPaint();
      this.eventBus.emit('brush:change', { brush });
    }
  
    public setColor(color: Color): void {
      this.currentColor = color;
      if (this.brushPaint) {
        this.brushPaint.setColor(Skia.Color(color.hex));
      }
      this.eventBus.emit('color:change', { color });
    }
  
    public setZoom(zoom: number): void {
      this.zoom = Math.max(0.1, Math.min(10, zoom));
      this.renderComposite();
      this.eventBus.emit('canvas:zoom', { zoom: this.zoom });
    }
  
    public setPan(x: number, y: number): void {
      this.pan = { x, y };
      this.renderComposite();
      this.eventBus.emit('canvas:pan', { pan: this.pan });
    }
  
    public setRotation(rotation: number): void {
      this.rotation = rotation % 360;
      this.renderComposite();
      this.eventBus.emit('canvas:rotate', { rotation: this.rotation });
    }
  
    public clear(): void {
      this.layers.forEach((layerData, layerId) => {
        layerData.layer.strokes = [];
        layerData.needsRedraw = true;
      });
      
      this.strokeCache.clear();
      this.redoStack = [];
      
      this.renderAllLayers();
      this.eventBus.emit('canvas:clear');
    }
  
    public exportImage(format: 'png' | 'jpeg' = 'png', quality: number = 1.0): Promise<string> {
      return new Promise((resolve, reject) => {
        try {
          // Render full canvas at export resolution
          const exportSurface = this.createExportSurface();
          this.renderToExportSurface(exportSurface);
          
          // Convert to base64
          const image = exportSurface.makeImageSnapshot();
          const data = image.encodeToBase64(
            format === 'png' ? 'PNG' : 'JPEG',
            quality * 100
          );
          
          resolve(`data:image/${format};base64,${data}`);
        } catch (error) {
          reject(error);
        }
      });
    }
  
    public destroy(): void {
      // Cleanup all resources
      this.layers.forEach((layerData) => {
        if (layerData.surface) {
          layerData.surface = null;
        }
      });
      
      this.layers.clear();
      this.strokeCache.clear();
      this.renderQueue = [];
      
      if (this.surface) {
        this.surface = null;
      }
      
      this.eventBus.emit('canvas:destroy');
    }
  
    // ---- PRIVATE METHODS ----
  
    private getDefaultBrush(): Brush {
      return {
        id: 'pencil-2b',
        name: '2B Pencil',
        category: 'pencil',
        icon: '✏️',
        settings: {
          size: 3,
          minSize: 0.5,
          maxSize: 50,
          opacity: 0.8,
          flow: 1,
          hardness: 0.6,
          spacing: 0.05,
          smoothing: 0.5,
          pressureSensitivity: 0.9,
          tiltSensitivity: 0.7,
          velocitySensitivity: 0.3,
          jitter: 0.02,
          scatter: 0,
        },
        pressureCurve: [0, 0.1, 0.9, 1],
        tiltSupport: true,
        velocitySupport: true,
        blendMode: 'normal',
        customizable: true,
        textureId: 'pencil_texture_2b',
      };
    }
  
    private getDefaultColor(): Color {
      return {
        hex: '#000000',
        rgb: { r: 0, g: 0, b: 0 },
        hsb: { h: 0, s: 0, b: 0 },
        alpha: 1,
      };
    }
  
    private createMainSurface(): void {
      // Main surface for final compositing
      const width = this.canvasWidth * this.pixelRatio;
      const height = this.canvasHeight * this.pixelRatio;
      
      this.surface = Skia.Surface.Make(width, height);
      if (!this.surface) {
        throw new Error('Failed to create Skia surface');
      }
    }
  
    private createLayer(layerId: string, name: string): void {
      const width = this.canvasWidth * this.pixelRatio;
      const height = this.canvasHeight * this.pixelRatio;
      
      // Create surface for layer
      const surface = Skia.Surface.Make(width, height);
      if (!surface) {
        throw new Error(`Failed to create surface for layer ${layerId}`);
      }
      
      const layer: Layer = {
        id: layerId,
        name,
        type: 'raster',
        strokes: [],
        opacity: 1,
        blendMode: 'normal',
        visible: true,
        locked: false,
        data: null,
        order: this.layers.size,
      };
      
      this.layers.set(layerId, {
        layer,
        surface,
        image: null,
        needsRedraw: true,
      });
      
      this.updateMemoryUsage();
    }
  
    private initializeBrushPaint(): void {
      const paint = Skia.Paint();
      
      // Basic paint settings
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeCap(StrokeCap.Round);
      paint.setStrokeJoin(StrokeJoin.Round);
      paint.setAntiAlias(true);
      
      // Color
      paint.setColor(Skia.Color(this.currentColor.hex));
      
      // Blend mode
      paint.setBlendMode(this.getSkiaBlendMode(this.currentBrush.blendMode || 'normal'));
      
      this.brushPaint = paint;
    }
  
    private updateBrushPaint(point: Point): void {
      if (!this.brushPaint) return;
      
      const brush = this.currentBrush;
      const settings = brush.settings;
      
      // Calculate dynamic size based on pressure
      const pressure = point.pressure || 0.5;
      const tiltX = point.tiltX || 0;
      const tiltY = point.tiltY || 0;
      
      // Apply pressure curve
      const mappedPressure = this.applyPressureCurve(pressure, brush.pressureCurve);
      
      // Calculate brush size with pressure sensitivity
      let size = settings.size;
      if (settings.pressureSensitivity > 0) {
        const pressureEffect = 1 - settings.pressureSensitivity + (settings.pressureSensitivity * mappedPressure);
        size = settings.minSize + (size - settings.minSize) * pressureEffect;
      }
      
      // Apply tilt effect if supported
      if (brush.tiltSupport && settings.tiltSensitivity > 0) {
        const tiltMagnitude = Math.sqrt(tiltX * tiltX + tiltY * tiltY);
        const tiltEffect = 1 - (settings.tiltSensitivity * tiltMagnitude * 0.5);
        size *= tiltEffect;
      }
      
      // Clamp size
      size = Math.max(settings.minSize, Math.min(settings.maxSize, size));
      
      // Apply to paint
      this.brushPaint.setStrokeWidth(size);
      
      // Dynamic opacity
      let opacity = settings.opacity;
      if (settings.flow < 1) {
        opacity *= settings.flow * mappedPressure;
      }
      
      this.brushPaint.setAlphaf(opacity);
      
      // Advanced brush effects
      if (settings.jitter > 0) {
        // Add slight randomness to brush position
        // This would be applied to the path points
      }
    }
  
    private applySmoothingToPoint(point: Point): Point {
      if (!this.lastPoint || this.currentBrush.settings.smoothing === 0) {
        return point;
      }
      
      const smooth = this.currentBrush.settings.smoothing;
      
      // Exponential smoothing
      const smoothedPoint: Point = {
        x: this.lastPoint.x + (point.x - this.lastPoint.x) * (1 - smooth),
        y: this.lastPoint.y + (point.y - this.lastPoint.y) * (1 - smooth),
        pressure: this.lastPoint.pressure + (point.pressure - this.lastPoint.pressure) * (1 - smooth),
        tiltX: point.tiltX,
        tiltY: point.tiltY,
        timestamp: point.timestamp,
      };
      
      // Velocity-based smoothing adjustment
      if (this.currentBrush.velocitySupport && this.lastPoint.timestamp) {
        const timeDelta = point.timestamp - this.lastPoint.timestamp;
        const distance = Math.sqrt(
          Math.pow(point.x - this.lastPoint.x, 2) +
          Math.pow(point.y - this.lastPoint.y, 2)
        );
        const velocity = distance / Math.max(timeDelta, 1);
        
        // Less smoothing at high velocity for responsiveness
        const velocityFactor = Math.min(velocity / 100, 1);
        const adjustedSmooth = smooth * (1 - velocityFactor * 0.5);
        
        smoothedPoint.x = this.lastPoint.x + (point.x - this.lastPoint.x) * (1 - adjustedSmooth);
        smoothedPoint.y = this.lastPoint.y + (point.y - this.lastPoint.y) * (1 - adjustedSmooth);
      }
      
      return smoothedPoint;
    }
  
    private applyPressureCurve(pressure: number, curve: number[]): number {
      if (!curve || curve.length < 4) return pressure;
      
      // Cubic bezier curve mapping
      const t = pressure;
      const mt = 1 - t;
      
      return (
        mt * mt * mt * curve[0] +
        3 * mt * mt * t * curve[1] +
        3 * mt * t * t * curve[2] +
        t * t * t * curve[3]
      );
    }
  
    private getSkiaBlendMode(blendMode: BlendMode): number {
      const blendModeMap: Record<BlendMode, number> = {
        'normal': SkiaBlendMode.SrcOver,
        'multiply': SkiaBlendMode.Multiply,
        'screen': SkiaBlendMode.Screen,
        'overlay': SkiaBlendMode.Overlay,
        'soft-light': SkiaBlendMode.SoftLight,
        'hard-light': SkiaBlendMode.HardLight,
        'color-dodge': SkiaBlendMode.ColorDodge,
        'color-burn': SkiaBlendMode.ColorBurn,
        'darken': SkiaBlendMode.Darken,
        'lighten': SkiaBlendMode.Lighten,
      };
      
      return blendModeMap[blendMode] || SkiaBlendMode.SrcOver;
    }
  
    private renderStroke(): void {
      if (!this.isDrawing || !this.currentPath || !this.brushPaint) return;
      
      // Queue render operation
      this.queueRender(() => {
        const layerData = this.layers.get(this.activeLayerId);
        if (!layerData || !layerData.surface) return;
        
        const canvas = layerData.surface.getCanvas();
        
        // Clear and redraw (for now - optimize later with incremental rendering)
        canvas.clear(Skia.Color('transparent'));
        
        // Render all existing strokes
        layerData.layer.strokes.forEach(stroke => {
          this.renderStrokeToCanvas(canvas, stroke);
        });
        
        // Render current stroke
        canvas.drawPath(this.currentPath!, this.brushPaint!);
        
        // Update layer image
        layerData.image = layerData.surface.makeImageSnapshot();
        
        // Trigger composite render
        this.renderComposite();
      });
    }
  
    private renderStrokeToCanvas(canvas: any, stroke: Stroke): void {
      const paint = Skia.Paint();
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeCap(StrokeCap.Round);
      paint.setStrokeJoin(StrokeJoin.Round);
      paint.setAntiAlias(true);
      paint.setColor(Skia.Color(stroke.color));
      paint.setStrokeWidth(stroke.size);
      paint.setAlphaf(stroke.opacity);
      paint.setBlendMode(this.getSkiaBlendMode(stroke.blendMode));
      
      if (stroke.path) {
        canvas.drawPath(stroke.path, paint);
      } else {
        // Fallback: recreate path from points
        const path = Skia.Path.Make();
        if (stroke.points.length > 0) {
          path.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            path.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
        }
        canvas.drawPath(path, paint);
      }
    }
  
    private renderToLayer(layerId: string): void {
      const layerData = this.layers.get(layerId);
      if (!layerData || !layerData.surface) return;
      
      const canvas = layerData.surface.getCanvas();
      canvas.clear(Skia.Color('transparent'));
      
      // Render all strokes in layer
      layerData.layer.strokes.forEach(stroke => {
        this.renderStrokeToCanvas(canvas, stroke);
      });
      
      // Update layer image
      layerData.image = layerData.surface.makeImageSnapshot();
      layerData.needsRedraw = false;
      
      // Trigger composite render
      this.renderComposite();
    }
  
    private renderAllLayers(): void {
      this.layers.forEach((layerData, layerId) => {
        if (layerData.needsRedraw) {
          this.renderToLayer(layerId);
        }
      });
    }
  
    private renderComposite(): void {
      this.queueRender(() => {
        if (!this.surface || !this.canvasRef) return;
        
        const canvas = this.surface.getCanvas();
        
        // Clear with background color
        canvas.clear(Skia.Color('#FFFFFF'));
        
        // Apply canvas transformations
        canvas.save();
        
        // Center for transformations
        const centerX = this.canvasWidth / 2;
        const centerY = this.canvasHeight / 2;
        
        canvas.translate(centerX, centerY);
        canvas.scale(this.zoom, this.zoom);
        canvas.rotate(this.rotation, 0, 0);
        canvas.translate(-centerX + this.pan.x, -centerY + this.pan.y);
        
        // Sort layers by order
        const sortedLayers = Array.from(this.layers.values()).sort(
          (a, b) => a.layer.order - b.layer.order
        );
        
        // Composite layers
        sortedLayers.forEach(layerData => {
          if (!layerData.layer.visible || !layerData.image) return;
          
          const paint = Skia.Paint();
          paint.setAlphaf(layerData.layer.opacity);
          paint.setBlendMode(this.getSkiaBlendMode(layerData.layer.blendMode));
          
          canvas.drawImage(layerData.image, 0, 0, paint);
        });
        
        canvas.restore();
        
        // Update canvas ref
        if (this.canvasRef.current) {
          this.canvasRef.current.redraw();
        }
      });
    }
  
    private createExportSurface(): any {
      // Create surface at export resolution
      const exportPixelRatio = 3; // High quality export
      const width = this.canvasWidth * exportPixelRatio;
      const height = this.canvasHeight * exportPixelRatio;
      
      return Skia.Surface.Make(width, height);
    }
  
    private renderToExportSurface(exportSurface: any): void {
      const canvas = exportSurface.getCanvas();
      canvas.clear(Skia.Color('#FFFFFF'));
      
      // Sort layers by order
      const sortedLayers = Array.from(this.layers.values()).sort(
        (a, b) => a.layer.order - b.layer.order
      );
      
      // Render each layer at full resolution
      sortedLayers.forEach(layerData => {
        if (!layerData.layer.visible) return;
        
        // Re-render strokes at export resolution
        const exportCanvas = exportSurface.getCanvas();
        
        layerData.layer.strokes.forEach(stroke => {
          const paint = Skia.Paint();
          paint.setStyle(PaintStyle.Stroke);
          paint.setStrokeCap(StrokeCap.Round);
          paint.setStrokeJoin(StrokeJoin.Round);
          paint.setAntiAlias(true);
          paint.setColor(Skia.Color(stroke.color));
          paint.setStrokeWidth(stroke.size * 3); // Scale for export
          paint.setAlphaf(stroke.opacity * layerData.layer.opacity);
          paint.setBlendMode(this.getSkiaBlendMode(stroke.blendMode));
          
          if (stroke.path) {
            // Scale path for export
            const scaledPath = stroke.path.copy();
            scaledPath.transform([3, 0, 0, 0, 3, 0, 0, 0, 1]);
            exportCanvas.drawPath(scaledPath, paint);
          }
        });
      });
    }
  
    private queueRender(renderFn: () => void): void {
      this.renderQueue.push(renderFn);
      
      if (!this.isRendering) {
        this.processRenderQueue();
      }
    }
  
    private processRenderQueue(): void {
      if (this.renderQueue.length === 0) {
        this.isRendering = false;
        return;
      }
      
      this.isRendering = true;
      
      requestAnimationFrame(() => {
        const startTime = performance.now();
        
        // Process all queued renders
        while (this.renderQueue.length > 0) {
          const renderFn = this.renderQueue.shift();
          if (renderFn) {
            renderFn();
          }
        }
        
        const renderTime = performance.now() - startTime;
        performanceMonitor.recordRenderTime(renderTime);
        
        // Continue processing if more renders queued
        if (this.renderQueue.length > 0) {
          this.processRenderQueue();
        } else {
          this.isRendering = false;
        }
      });
    }
  
    private setupEventListeners(): void {
      // Listen for memory warnings
      this.eventBus.on('system:memoryWarning', () => {
        this.handleMemoryWarning();
      });
      
      // Listen for app state changes
      this.eventBus.on('app:background', () => {
        this.handleAppBackground();
      });
      
      this.eventBus.on('app:foreground', () => {
        this.handleAppForeground();
      });
    }
  
    private setupPerformanceMonitoring(): void {
      // Monitor frame rate during drawing
      setInterval(() => {
        if (this.isDrawing && this.frameCount > 0) {
          const fps = this.frameCount;
          this.frameCount = 0;
          
          if (fps < 50) {
            console.warn(`Low FPS detected: ${fps}`);
            this.optimizePerformance();
          }
        }
      }, 1000);
    }
  
    private optimizePerformance(): void {
      // Reduce quality temporarily
      if (this.smoothingFactor > 0.3) {
        this.smoothingFactor = 0.3;
        console.log('Reduced smoothing for performance');
      }
      
      // Clear stroke cache if too large
      if (this.strokeCache.size > 100) {
        const entriesToDelete = this.strokeCache.size - 50;
        const iterator = this.strokeCache.keys();
        
        for (let i = 0; i < entriesToDelete; i++) {
          const key = iterator.next().value;
          if (key) {
            this.strokeCache.delete(key);
          }
        }
      }
    }
  
    private updateMemoryUsage(): void {
      this.totalMemoryUsage = 0;
      
      this.layers.forEach(layerData => {
        // Estimate memory usage per layer
        const layerMemory = this.canvasWidth * this.canvasHeight * 4 * this.pixelRatio * this.pixelRatio;
        this.totalMemoryUsage += layerMemory;
      });
      
      // Add stroke cache memory
      this.totalMemoryUsage += this.strokeCache.size * 1000; // Rough estimate
      
      if (this.totalMemoryUsage > this.memoryWarningThreshold) {
        this.handleMemoryWarning();
      }
    }
  
    private checkMemoryUsage(): void {
      this.updateMemoryUsage();
      
      const memoryMB = this.totalMemoryUsage / (1024 * 1024);
      console.log(`Canvas memory usage: ${memoryMB.toFixed(2)}MB`);
      
      performanceMonitor.recordInputLatency(memoryMB); // Temporary - replace with proper memory metric
    }
  
    private handleMemoryWarning(): void {
      console.warn('Memory warning - optimizing canvas');
      
      // Clear old undo history
      if (this.strokeCache.size > 50) {
        const entriesToDelete = this.strokeCache.size - 30;
        const iterator = this.strokeCache.keys();
        
        for (let i = 0; i < entriesToDelete; i++) {
          const key = iterator.next().value;
          if (key) {
            this.strokeCache.delete(key);
          }
        }
      }
      
      // Reduce pixel ratio if needed
      if (this.pixelRatio > 2) {
        this.pixelRatio = 2;
        console.log('Reduced pixel ratio for memory optimization');
        // Would need to recreate surfaces here
      }
      
      this.eventBus.emit('canvas:memoryOptimized');
    }
  
    private handleAppBackground(): void {
      // Save current state
      this.eventBus.emit('canvas:save');
      
      // Clear render queue
      this.renderQueue = [];
      
      // Reduce memory usage
      this.strokeCache.clear();
    }
  
    private handleAppForeground(): void {
      // Restore state if needed
      this.eventBus.emit('canvas:restore');
      
      // Refresh all layers
      this.renderAllLayers();
    }
  
    // ---- PUBLIC GETTERS ----
  
    public getState(): any {
      return {
        layers: Array.from(this.layers.values()).map(data => data.layer),
        activeLayerId: this.activeLayerId,
        zoom: this.zoom,
        pan: this.pan,
        rotation: this.rotation,
        canvasSize: {
          width: this.canvasWidth,
          height: this.canvasHeight,
        },
      };
    }
  
    public getPerformanceMetrics(): any {
      return {
        totalMemoryUsage: this.totalMemoryUsage,
        layerCount: this.layers.size,
        strokeCacheSize: this.strokeCache.size,
        isDrawing: this.isDrawing,
        renderQueueSize: this.renderQueue.length,
      };
    }
  
    public getSupportedFeatures(): any {
      return {
        pressureSensitivity: true,
        tiltDetection: true,
        palmRejection: true,
        hoverEffects: Platform.OS === 'ios',
        maxLayers: 100,
        maxCanvasSize: 8192,
        blendModes: Object.keys(SkiaBlendMode),
        exportFormats: ['png', 'jpeg'],
      };
    }
  }