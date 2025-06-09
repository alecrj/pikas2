import { Point, Stroke, Layer, Brush, BlendMode, Color } from '../../types';
import { performanceMonitor } from '../core/PerformanceMonitor';
import { errorHandler } from '../core/ErrorHandler';

/**
 * Professional Canvas Engine - 60fps Apple Pencil optimized drawing surface
 * Handles real-time stroke rendering with pressure sensitivity and advanced compositing
 */
export class ProfessionalCanvas {
  private canvas: HTMLCanvasElement | null = null;
  private context: CanvasRenderingContext2D | null = null;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenContext: CanvasRenderingContext2D | null = null;

  private currentStroke: Point[] = [];
  private isDrawing: boolean = false;
  private lastPoint: Point | null = null;
  private strokeId: string = '';

  // Performance optimization
  private frameId: number | null = null;
  private dirtyRegions: DOMRect[] = [];
  private lastRenderTime: number = 0;

  // Canvas state
  private layers: Layer[] = [{
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
  }];
  private activeLayerId: string = 'layer-1';
  private zoom: number = 1;
  private pan: { x: number; y: number } = { x: 0, y: 0 };

  // Brush state
  private currentBrush: Brush = this.getDefaultBrush();
  private currentColor: Color = this.getDefaultColor();

  // Event listeners
  private strokeListeners: Set<(stroke: Stroke) => void> = new Set();
  private layerListeners: Set<(layers: Layer[]) => void> = new Set();

  // Undo/redo stack
  private redoStack: Stroke[] = [];

  // Public constructor, NO parameters!
  constructor() {}

  // ---- PUBLIC API ----

  public initialize(canvasElement: HTMLCanvasElement): void {
    this.canvas = canvasElement;
    this.context = canvasElement.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false,
    });

    if (!this.context) throw new Error('Failed to get 2D context from canvas');

    this.createOffscreenCanvas();
    this.setupCanvas();
    this.setupEventListeners();
    this.render();
  }

  public startStroke(point: Point): void {
    performanceMonitor.recordDrawCall();
    this.isDrawing = true;
    this.strokeId = `stroke_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.currentStroke = [point];
    this.lastPoint = point;
    this.lastRenderTime = performance.now();
    this.drawPoint(point);
  }

  public addPoint(point: Point): void {
    this.continueStroke(point);
  }

  public endStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    const stroke: Stroke = {
      id: this.strokeId,
      points: [...this.currentStroke],
      color: this.currentColor.hex,
      brushId: this.currentBrush.id,
      size: this.currentBrush.settings.size,
      opacity: this.currentBrush.settings.opacity,
      blendMode: 'normal',
      smoothing: this.currentBrush.settings.smoothing,
    };
    const activeLayer = this.layers.find(layer => layer.id === this.activeLayerId);
    if (activeLayer) activeLayer.strokes.push(stroke);
    this.strokeListeners.forEach(listener => listener(stroke));
    this.layerListeners.forEach(listener => listener([...this.layers]));
    this.currentStroke = [];
    this.lastPoint = null;
    this.strokeId = '';
    this.redoStack = []; // Clear redo stack on new stroke
    this.scheduleRender();
  }

  public getState(): {
    layers: Layer[];
    activeLayerId: string;
    zoom: number;
    pan: { x: number; y: number };
  } {
    return {
      layers: [...this.layers],
      activeLayerId: this.activeLayerId,
      zoom: this.zoom,
      pan: { ...this.pan },
    };
  }

  public undo(): void {
    const activeLayer = this.layers.find(layer => layer.id === this.activeLayerId);
    if (activeLayer && activeLayer.strokes.length > 0) {
      const lastStroke = activeLayer.strokes.pop();
      if (lastStroke) this.redoStack.push(lastStroke);
      this.scheduleRender();
    }
  }

  public redo(): void {
    // Simple redo implementation
    const activeLayer = this.layers.find(layer => layer.id === this.activeLayerId);
    if (activeLayer && this.redoStack.length > 0) {
      const stroke = this.redoStack.pop();
      if (stroke) activeLayer.strokes.push(stroke);
      this.scheduleRender();
    }
  }

  public addLayer(name: string = 'New Layer'): Layer {
    const layer: Layer = {
      id: `layer-${Date.now()}`,
      name,
      type: 'raster',
      strokes: [],
      opacity: 1,
      blendMode: 'normal',
      visible: true,
      locked: false,
      data: null,
      order: this.layers.length,
    };
    this.layers.push(layer);
    this.layerListeners.forEach(listener => listener([...this.layers]));
    this.scheduleRender();
    return layer;
  }

  public deleteLayer(layerId: string): void {
    this.removeLayer(layerId);
  }

  public setActiveLayer(layerId: string): void {
    if (this.layers.find(layer => layer.id === layerId)) {
      this.activeLayerId = layerId;
    }
  }

  public setBrush(brush: Brush): void {
    this.currentBrush = brush;
  }

  public setColor(color: Color): void {
    this.currentColor = color;
  }

  public setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
    this.scheduleRender();
  }

  public setPan(x: number, y: number): void {
    this.pan = { x, y };
    this.scheduleRender();
  }

  public clear(): void {
    this.layers = [{
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
    }];
    this.activeLayerId = 'layer-1';
    this.scheduleRender();
  }

  public exportImage(): string {
    if (!this.canvas) return '';
    return this.canvas.toDataURL('image/png');
  }

  public render(): void {
    if (!this.context || !this.canvas) return;
    const startTime = performance.now();
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    for (const layer of this.layers.sort((a, b) => a.order - b.order)) {
      if (!layer.visible) continue;
      this.renderLayer(layer);
    }
    const renderTime = performance.now() - startTime;
    performanceMonitor.recordRenderTime(renderTime);
  }

  // Event subscription methods
  public onStroke(callback: (stroke: Stroke) => void): () => void {
    this.strokeListeners.add(callback);
    return () => this.strokeListeners.delete(callback);
  }

  public onLayersChange(callback: (layers: Layer[]) => void): () => void {
    this.layerListeners.add(callback);
    return () => this.layerListeners.delete(callback);
  }

  public destroy(): void {
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.strokeListeners.clear();
    this.layerListeners.clear();
  }

  // ---- PRIVATE METHODS ----

  private getDefaultBrush(): Brush {
    return {
      id: 'default-pencil',
      name: 'Default Pencil',
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
  }

  private getDefaultColor(): Color {
    return {
      hex: '#000000',
      rgb: { r: 0, g: 0, b: 0 },
      hsb: { h: 0, s: 0, b: 0 },
      alpha: 1,
    };
  }

  private createOffscreenCanvas(): void {
    if (!this.canvas) return;
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;
    this.offscreenContext = this.offscreenCanvas.getContext('2d');
  }

  private setupCanvas(): void {
    if (!this.context) return;
    const devicePixelRatio = window.devicePixelRatio || 1;
    const rect = this.canvas!.getBoundingClientRect();
    this.canvas!.width = rect.width * devicePixelRatio;
    this.canvas!.height = rect.height * devicePixelRatio;
    this.canvas!.style.width = rect.width + 'px';
    this.canvas!.style.height = rect.height + 'px';
    this.context.scale(devicePixelRatio, devicePixelRatio);
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.context.imageSmoothingEnabled = true;
    this.context.imageSmoothingQuality = 'high';
  }

  private setupEventListeners(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private handleTouchStart(event: TouchEvent): void {
    event.preventDefault();
    const touch = event.touches[0];
    const point = this.getTouchPoint(touch);
    this.startStroke(point);
  }
  private handleTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing) return;
    const touch = event.touches[0];
    const point = this.getTouchPoint(touch);
    this.continueStroke(point);
  }
  private handleTouchEnd(event: TouchEvent): void {
    event.preventDefault();
    this.endStroke();
  }
  private handleMouseDown(event: MouseEvent): void {
    const point = this.getMousePoint(event);
    this.startStroke(point);
  }
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDrawing) return;
    const point = this.getMousePoint(event);
    this.continueStroke(point);
  }
  private handleMouseUp(event: MouseEvent): void {
    this.endStroke();
  }

  private getTouchPoint(touch: Touch): Point {
    const rect = this.canvas!.getBoundingClientRect();
    const pressure = (touch as any).force || 0.5;
    const tiltX = (touch as any).tiltX || 0;
    const tiltY = (touch as any).tiltY || 0;
    return {
      x: (touch.clientX - rect.left) / this.zoom - this.pan.x,
      y: (touch.clientY - rect.top) / this.zoom - this.pan.y,
      pressure: pressure,
      tiltX: tiltX,
      tiltY: tiltY,
      timestamp: Date.now(),
    };
  }

  private getMousePoint(event: MouseEvent): Point {
    const rect = this.canvas!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / this.zoom - this.pan.x,
      y: (event.clientY - rect.top) / this.zoom - this.pan.y,
      pressure: (event as any).pressure || 0.5,
      timestamp: Date.now(),
    };
  }

  private continueStroke(point: Point): void {
    if (!this.isDrawing || !this.lastPoint) return;
    const smoothedPoint = this.applySmoothingToPoint(point);
    this.currentStroke.push(smoothedPoint);
    this.drawStrokeSegment(this.lastPoint, smoothedPoint);
    this.lastPoint = smoothedPoint;
    const now = performance.now();
    const frameTime = now - this.lastRenderTime;
    this.lastRenderTime = now;
    if (frameTime > 16.67) {
      console.warn('Frame time exceeded 16.67ms:', frameTime);
    }
  }

  private applySmoothingToPoint(point: Point): Point {
    if (!this.lastPoint) return point;
    const smooth = this.currentBrush.settings.smoothing;
    return {
      x: this.lastPoint.x + (point.x - this.lastPoint.x) * (1 - smooth),
      y: this.lastPoint.y + (point.y - this.lastPoint.y) * (1 - smooth),
      pressure: (this.lastPoint.pressure || 0.5) + ((point.pressure || 0.5) - (this.lastPoint.pressure || 0.5)) * (1 - smooth),
      tiltX: point.tiltX,
      tiltY: point.tiltY,
      timestamp: point.timestamp,
    };
  }

  private drawPoint(point: Point): void {
    if (!this.context) return;
    this.context.save();
    this.applyBrushSettings();
    const size = this.calculateBrushSize(point);
    this.context.beginPath();
    this.context.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
    this.context.fill();
    this.context.restore();
  }

  private drawStrokeSegment(from: Point, to: Point): void {
    if (!this.context) return;
    this.context.save();
    this.applyBrushSettings();
    const fromSize = this.calculateBrushSize(from);
    const toSize = this.calculateBrushSize(to);
    this.drawTaperedLine(from, to, fromSize, toSize);
    this.context.restore();
  }

  private calculateBrushSize(point: Point): number {
    const baseSize = this.currentBrush.settings.size;
    const minSize = this.currentBrush.settings.minSize;
    const maxSize = this.currentBrush.settings.maxSize;
    const sensitivity = this.currentBrush.settings.pressureSensitivity || 0.8;
    const pressure = point.pressure || 0.5;
    const pressureMultiplier = 1 - sensitivity + (sensitivity * pressure);
    let size = baseSize * pressureMultiplier;
    size = Math.max(minSize, Math.min(maxSize, size));
    return size;
  }

  private drawTaperedLine(from: Point, to: Point, fromSize: number, toSize: number): void {
    if (!this.context) return;
    const steps = Math.max(1, Math.floor(this.distance(from, to) / 2));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const size = fromSize + (toSize - fromSize) * t;
      const pressure = (from.pressure || 0.5) + ((to.pressure || 0.5) - (from.pressure || 0.5)) * t;
      this.context.beginPath();
      this.context.arc(x, y, size / 2, 0, Math.PI * 2);
      this.context.fill();
      if (this.currentBrush.category === 'pencil') {
        this.addPencilTexture(x, y, size, pressure * (1 - i * 0.2));
      }
    }
  }

  private addPencilTexture(x: number, y: number, size: number, pressure: number): void {
    if (!this.context) return;
    this.context.save();
    this.context.globalAlpha *= 0.3 * pressure;
    for (let i = 0; i < 3; i++) {
      const offsetX = (Math.random() - 0.5) * size * 0.5;
      const offsetY = (Math.random() - 0.5) * size * 0.5;
      this.context.beginPath();
      this.context.arc(x + offsetX, y + offsetY, 0.5, 0, Math.PI * 2);
      this.context.fill();
    }
    this.context.restore();
  }

  private distance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private applyBrushSettings(): void {
    if (!this.context) return;
    const color = this.currentColor;
    const opacity = this.currentBrush.settings.opacity;
    this.context.fillStyle = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${opacity})`;
    this.context.strokeStyle = `rgba(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b}, ${opacity})`;
    this.context.globalCompositeOperation = this.getCompositeOperation();
  }

  private getCompositeOperation(): GlobalCompositeOperation {
    const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'darken': 'darken',
      'lighten': 'lighten',
    };
    return blendModeMap['normal'];
  }

  private scheduleRender(): void {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.frameId = requestAnimationFrame(() => {
      this.render();
      this.frameId = null;
    });
  }

  private renderLayer(layer: Layer): void {
    if (!this.context) return;
    this.context.save();
    this.context.globalAlpha = layer.opacity;
    this.context.globalCompositeOperation = this.getLayerBlendMode(layer.blendMode);
    for (const stroke of layer.strokes) this.renderStroke(stroke);
    this.context.restore();
  }

  private getLayerBlendMode(blendMode: BlendMode): GlobalCompositeOperation {
    const blendModeMap: Record<BlendMode, GlobalCompositeOperation> = {
      'normal': 'source-over',
      'multiply': 'multiply',
      'screen': 'screen',
      'overlay': 'overlay',
      'soft-light': 'soft-light',
      'hard-light': 'hard-light',
      'color-dodge': 'color-dodge',
      'color-burn': 'color-burn',
      'darken': 'darken',
      'lighten': 'lighten',
    };
    return blendModeMap[blendMode] || 'source-over';
  }

  private renderStroke(stroke: Stroke): void {
    if (!this.context || stroke.points.length === 0) return;
    this.context.save();
    this.context.strokeStyle = stroke.color;
    this.context.fillStyle = stroke.color;
    this.context.globalAlpha = stroke.opacity;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    if (stroke.points.length === 1) {
      const point = stroke.points[0];
      this.context.beginPath();
      this.context.arc(point.x, point.y, stroke.size / 2, 0, Math.PI * 2);
      this.context.fill();
    } else {
      this.context.beginPath();
      this.context.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        this.context.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      this.context.lineWidth = stroke.size;
      this.context.stroke();
    }
    this.context.restore();
  }

  private removeLayer(layerId: string): void {
    if (this.layers.length <= 1) return;
    this.layers = this.layers.filter(layer => layer.id !== layerId);
    if (this.activeLayerId === layerId) {
      this.activeLayerId = this.layers[0]?.id || '';
    }
    this.layerListeners.forEach(listener => listener([...this.layers]));
    this.scheduleRender();
  }
}
