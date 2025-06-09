import { Brush, BrushCategory, Point, Color } from '../../types';
import { Skia, Paint, Path, BlendMode as SkiaBlendMode } from '@shopify/react-native-skia';
import { EventBus } from '../core/EventBus';
import { dataManager } from '../core/DataManager';

/**
 * Professional Brush Engine - Procreate-level brush dynamics and rendering
 * Manages 15+ professional brushes with realistic texture and behavior
 */
export class BrushEngine {
  private static instance: BrushEngine;
  private eventBus: EventBus = EventBus.getInstance();
  
  // Brush library
  private brushes: Map<string, Brush> = new Map();
  private customBrushes: Map<string, Brush> = new Map();
  private brushTextures: Map<string, any> = new Map();
  
  // Current brush state
  private currentBrush: Brush | null = null;
  private currentColor: Color = {
    hex: '#000000',
    rgb: { r: 0, g: 0, b: 0 },
    hsb: { h: 0, s: 0, b: 0 },
    alpha: 1,
  };
  
  // Brush dynamics cache
  private dynamicsCache: Map<string, BrushDynamics> = new Map();
  
  // Performance optimization
  private textureCache: Map<string, any> = new Map();
  private stampSpacing: number = 0.1;
  
  private constructor() {
    this.initializeDefaultBrushes();
    this.loadBrushTextures();
    this.loadCustomBrushes();
  }

  public static getInstance(): BrushEngine {
    if (!BrushEngine.instance) {
      BrushEngine.instance = new BrushEngine();
    }
    return BrushEngine.instance;
  }

  // ---- PUBLIC API ----

  public getBrush(brushId: string): Brush | null {
    return this.brushes.get(brushId) || this.customBrushes.get(brushId) || null;
  }

  public getAllBrushes(): Brush[] {
    return [
      ...Array.from(this.brushes.values()),
      ...Array.from(this.customBrushes.values()),
    ];
  }

  public getBrushesByCategory(category: BrushCategory): Brush[] {
    return this.getAllBrushes().filter(brush => brush.category === category);
  }

  public setCurrentBrush(brushId: string): boolean {
    const brush = this.getBrush(brushId);
    if (brush) {
      this.currentBrush = brush;
      this.updateDynamicsCache(brush);
      this.eventBus.emit('brush:selected', { brush });
      return true;
    }
    return false;
  }

  public getCurrentBrush(): Brush | null {
    return this.currentBrush;
  }

  public setColor(color: Color): void {
    this.currentColor = color;
    this.eventBus.emit('brush:colorChanged', { color });
  }

  public createCustomBrush(baseBrushId: string, customSettings: Partial<Brush>): string {
    const baseBrush = this.getBrush(baseBrushId);
    if (!baseBrush) {
      throw new Error(`Base brush ${baseBrushId} not found`);
    }

    const customId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const customBrush: Brush = {
      ...baseBrush,
      ...customSettings,
      id: customId,
      name: customSettings.name || `${baseBrush.name} (Custom)`,
      customizable: true,
    };

    this.customBrushes.set(customId, customBrush);
    this.saveCustomBrushes();
    
    this.eventBus.emit('brush:created', { brush: customBrush });
    return customId;
  }

  public updateBrushSettings(brushId: string, settings: Partial<Brush['settings']>): boolean {
    const brush = this.customBrushes.get(brushId);
    if (!brush || !brush.customizable) {
      return false;
    }

    brush.settings = { ...brush.settings, ...settings };
    this.saveCustomBrushes();
    
    if (this.currentBrush?.id === brushId) {
      this.updateDynamicsCache(brush);
    }
    
    this.eventBus.emit('brush:updated', { brush });
    return true;
  }

  public deletecustomBrush(brushId: string): boolean {
    if (this.customBrushes.delete(brushId)) {
      this.saveCustomBrushes();
      this.eventBus.emit('brush:deleted', { brushId });
      return true;
    }
    return false;
  }

  public createBrushPaint(brush: Brush, color: Color): Paint {
    const paint = Skia.Paint();
    
    // Basic settings
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeCap(Skia.StrokeCap.Round);
    paint.setStrokeJoin(Skia.StrokeJoin.Round);
    paint.setAntiAlias(true);
    
    // Color with alpha
    const alpha = Math.floor(color.alpha * brush.settings.opacity * 255);
    const colorWithAlpha = Skia.Color(
      color.rgb.r,
      color.rgb.g,
      color.rgb.b,
      alpha
    );
    paint.setColor(colorWithAlpha);
    
    // Blend mode
    paint.setBlendMode(this.getSkiaBlendMode(brush.blendMode || 'normal'));
    
    // Stroke width
    paint.setStrokeWidth(brush.settings.size);
    
    // Brush-specific effects
    this.applyBrushEffects(paint, brush);
    
    return paint;
  }

  public calculateBrushDynamics(
    brush: Brush,
    point: Point,
    lastPoint: Point | null,
    velocity: number
  ): BrushDynamics {
    const dynamics = this.dynamicsCache.get(brush.id) || this.createDefaultDynamics();
    
    // Pressure dynamics
    const pressure = point.pressure || 0.5;
    const mappedPressure = this.applyPressureCurve(pressure, brush.pressureCurve);
    
    // Size calculation
    let size = brush.settings.size;
    if (brush.settings.pressureSensitivity > 0) {
      const pressureEffect = 1 - brush.settings.pressureSensitivity + 
        (brush.settings.pressureSensitivity * mappedPressure);
      size = brush.settings.minSize + (brush.settings.size - brush.settings.minSize) * pressureEffect;
    }
    
    // Tilt dynamics
    if (brush.tiltSupport && point.tiltX !== undefined && point.tiltY !== undefined) {
      const tiltMagnitude = Math.sqrt(point.tiltX * point.tiltX + point.tiltY * point.tiltY);
      const tiltAngle = Math.atan2(point.tiltY, point.tiltX);
      
      if (brush.settings.tiltSensitivity > 0) {
        const tiltEffect = 1 - (brush.settings.tiltSensitivity * tiltMagnitude * 0.5);
        size *= tiltEffect;
      }
      
      dynamics.tiltAngle = tiltAngle;
      dynamics.tiltMagnitude = tiltMagnitude;
    }
    
    // Velocity dynamics
    if (brush.velocitySupport && brush.settings.velocitySensitivity > 0) {
      const velocityEffect = 1 - (brush.settings.velocitySensitivity * Math.min(velocity / 200, 1));
      size *= velocityEffect;
    }
    
    // Opacity dynamics
    let opacity = brush.settings.opacity;
    if (brush.settings.flow < 1) {
      opacity *= brush.settings.flow * mappedPressure;
    }
    
    // Jitter
    let jitterX = 0, jitterY = 0;
    if (brush.settings.jitter > 0) {
      jitterX = (Math.random() - 0.5) * brush.settings.jitter * size;
      jitterY = (Math.random() - 0.5) * brush.settings.jitter * size;
    }
    
    // Scatter
    let scatterX = 0, scatterY = 0;
    if (brush.settings.scatter > 0) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * brush.settings.scatter * size;
      scatterX = Math.cos(angle) * distance;
      scatterY = Math.sin(angle) * distance;
    }
    
    // Update dynamics
    dynamics.size = Math.max(brush.settings.minSize, Math.min(brush.settings.maxSize, size));
    dynamics.opacity = opacity;
    dynamics.spacing = brush.settings.spacing * dynamics.size;
    dynamics.jitterOffset = { x: jitterX, y: jitterY };
    dynamics.scatterOffset = { x: scatterX, y: scatterY };
    dynamics.pressure = mappedPressure;
    dynamics.velocity = velocity;
    
    return dynamics;
  }

  public getTextureForBrush(brushId: string): any {
    const brush = this.getBrush(brushId);
    if (!brush || !brush.textureId) return null;
    
    return this.brushTextures.get(brush.textureId);
  }

  public shouldDrawStamp(
    currentPoint: Point,
    lastStampPoint: Point | null,
    spacing: number
  ): boolean {
    if (!lastStampPoint) return true;
    
    const distance = Math.sqrt(
      Math.pow(currentPoint.x - lastStampPoint.x, 2) +
      Math.pow(currentPoint.y - lastStampPoint.y, 2)
    );
    
    return distance >= spacing;
  }

  // ---- PRIVATE METHODS ----

  private initializeDefaultBrushes(): void {
    // Pencil brushes
    this.addBrush(this.createPencilBrush('pencil-hb', 'HB Pencil', 0.4, 0.9, 'pencil_texture_hb'));
    this.addBrush(this.createPencilBrush('pencil-2b', '2B Pencil', 0.6, 0.8, 'pencil_texture_2b'));
    this.addBrush(this.createPencilBrush('pencil-4b', '4B Pencil', 0.8, 0.7, 'pencil_texture_4b'));
    this.addBrush(this.createPencilBrush('pencil-6b', '6B Pencil', 1.0, 0.6, 'pencil_texture_6b'));
    
    // Ink brushes
    this.addBrush(this.createInkBrush('ink-pen', 'Ink Pen', 2, 1.0));
    this.addBrush(this.createInkBrush('technical-pen', 'Technical Pen', 1, 1.0));
    this.addBrush(this.createInkBrush('brush-pen', 'Brush Pen', 4, 0.9));
    
    // Paint brushes
    this.addBrush(this.createPaintBrush('watercolor', 'Watercolor', 15, 0.6, 'watercolor_texture'));
    this.addBrush(this.createPaintBrush('oil-paint', 'Oil Paint', 10, 0.9, 'oil_texture'));
    this.addBrush(this.createPaintBrush('acrylic', 'Acrylic', 8, 0.95, 'acrylic_texture'));
    
    // Special brushes
    this.addBrush(this.createAirbrush('airbrush', 'Airbrush', 20, 0.3));
    this.addBrush(this.createMarkerBrush('marker', 'Marker', 5, 0.8));
    this.addBrush(this.createChalkBrush('chalk', 'Chalk', 8, 0.7, 'chalk_texture'));
    this.addBrush(this.createCharcoalBrush('charcoal', 'Charcoal', 12, 0.6, 'charcoal_texture'));
    this.addBrush(this.createEraserBrush('eraser', 'Eraser', 10, 1.0));
    
    console.log(`Initialized ${this.brushes.size} professional brushes`);
  }

  private createPencilBrush(
    id: string,
    name: string,
    hardness: number,
    opacity: number,
    textureId: string
  ): Brush {
    return {
      id,
      name,
      category: 'pencil',
      icon: '✏️',
      settings: {
        size: 3,
        minSize: 0.5,
        maxSize: 20,
        opacity,
        flow: 1,
        hardness,
        spacing: 0.05,
        smoothing: 0.5,
        pressureSensitivity: 0.9,
        tiltSensitivity: 0.7,
        velocitySensitivity: 0.2,
        jitter: 0.02,
        scatter: 0,
        textureScale: 1,
        textureDepth: 0.8,
      },
      pressureCurve: [0, 0.1, 0.9, 1],
      tiltSupport: true,
      velocitySupport: true,
      blendMode: 'normal',
      customizable: true,
      textureId,
    };
  }

  private createInkBrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number
  ): Brush {
    return {
      id,
      name,
      category: 'ink',
      icon: '🖊️',
      settings: {
        size: defaultSize,
        minSize: 0.5,
        maxSize: 30,
        opacity,
        flow: 1,
        hardness: 1,
        spacing: 0.02,
        smoothing: 0.3,
        pressureSensitivity: 0.7,
        tiltSensitivity: 0,
        velocitySensitivity: 0.4,
        jitter: 0,
        scatter: 0,
      },
      pressureCurve: [0, 0.3, 0.7, 1],
      tiltSupport: false,
      velocitySupport: true,
      blendMode: 'normal',
      customizable: true,
    };
  }

  private createPaintBrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number,
    textureId: string
  ): Brush {
    return {
      id,
      name,
      category: id.includes('water') ? 'watercolor' : 'paint',
      icon: '🎨',
      settings: {
        size: defaultSize,
        minSize: 2,
        maxSize: 100,
        opacity,
        flow: 0.8,
        hardness: 0.3,
        spacing: 0.1,
        smoothing: 0.7,
        pressureSensitivity: 0.8,
        tiltSensitivity: 0.5,
        velocitySensitivity: 0.3,
        jitter: 0.05,
        scatter: 0.1,
        textureScale: 1.5,
        textureDepth: 0.6,
        wetness: id.includes('water') ? 0.8 : 0.3,
        mixing: 0.5,
      },
      pressureCurve: [0, 0.2, 0.8, 1],
      tiltSupport: true,
      velocitySupport: true,
      blendMode: id.includes('water') ? 'multiply' : 'normal',
      customizable: true,
      textureId,
    };
  }

  private createAirbrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number
  ): Brush {
    return {
      id,
      name,
      category: 'airbrush',
      icon: '💨',
      settings: {
        size: defaultSize,
        minSize: 5,
        maxSize: 200,
        opacity,
        flow: 0.5,
        hardness: 0.1,
        spacing: 0.05,
        smoothing: 0.9,
        pressureSensitivity: 0.9,
        tiltSensitivity: 0.3,
        velocitySensitivity: 0.1,
        jitter: 0.1,
        scatter: 0.2,
        falloff: 0.8,
      },
      pressureCurve: [0, 0.2, 0.8, 1],
      tiltSupport: true,
      velocitySupport: true,
      blendMode: 'normal',
      customizable: true,
    };
  }

  private createMarkerBrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number
  ): Brush {
    return {
      id,
      name,
      category: 'marker',
      icon: '🖍️',
      settings: {
        size: defaultSize,
        minSize: 2,
        maxSize: 50,
        opacity,
        flow: 1,
        hardness: 0.7,
        spacing: 0.03,
        smoothing: 0.4,
        pressureSensitivity: 0.4,
        tiltSensitivity: 0.6,
        velocitySensitivity: 0.2,
        jitter: 0.01,
        scatter: 0,
      },
      pressureCurve: [0, 0.5, 0.5, 1],
      tiltSupport: true,
      velocitySupport: true,
      blendMode: 'multiply',
      customizable: true,
    };
  }

  private createChalkBrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number,
    textureId: string
  ): Brush {
    return {
      id,
      name,
      category: 'texture',
      icon: '🖍️',
      settings: {
        size: defaultSize,
        minSize: 3,
        maxSize: 60,
        opacity,
        flow: 1,
        hardness: 0.2,
        spacing: 0.08,
        smoothing: 0.3,
        pressureSensitivity: 0.6,
        tiltSensitivity: 0.8,
        velocitySensitivity: 0.1,
        jitter: 0.1,
        scatter: 0.05,
        textureScale: 2,
        textureDepth: 1,
        rotation: 0.2,
      },
      pressureCurve: [0, 0.3, 0.7, 1],
      tiltSupport: true,
      velocitySupport: true,
      blendMode: 'normal',
      customizable: true,
      textureId,
    };
  }

  private createCharcoalBrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number,
    textureId: string
  ): Brush {
    return {
      id,
      name,
      category: 'texture',
      icon: '🎨',
      settings: {
        size: defaultSize,
        minSize: 4,
        maxSize: 80,
        opacity,
        flow: 0.9,
        hardness: 0.1,
        spacing: 0.06,
        smoothing: 0.4,
        pressureSensitivity: 0.8,
        tiltSensitivity: 0.9,
        velocitySensitivity: 0.2,
        jitter: 0.15,
        scatter: 0.08,
        textureScale: 2.5,
        textureDepth: 1,
        rotation: 0.3,
        graininess: 0.8,
      },
      pressureCurve: [0, 0.2, 0.8, 1],
      tiltSupport: true,
      velocitySupport: true,
      blendMode: 'multiply',
      customizable: true,
      textureId,
    };
  }

  private createEraserBrush(
    id: string,
    name: string,
    defaultSize: number,
    opacity: number
  ): Brush {
    return {
      id,
      name,
      category: 'eraser',
      icon: '🧹',
      settings: {
        size: defaultSize,
        minSize: 1,
        maxSize: 100,
        opacity,
        flow: 1,
        hardness: 0.8,
        spacing: 0.03,
        smoothing: 0.5,
        pressureSensitivity: 0.7,
        tiltSensitivity: 0,
        velocitySensitivity: 0.1,
        jitter: 0,
        scatter: 0,
      },
      pressureCurve: [0, 0.3, 0.7, 1],
      tiltSupport: false,
      velocitySupport: true,
      blendMode: 'normal',
      customizable: true,
      isEraser: true,
    };
  }

  private addBrush(brush: Brush): void {
    this.brushes.set(brush.id, brush);
  }

  private updateDynamicsCache(brush: Brush): void {
    const dynamics: BrushDynamics = {
      size: brush.settings.size,
      opacity: brush.settings.opacity,
      spacing: brush.settings.spacing * brush.settings.size,
      jitterOffset: { x: 0, y: 0 },
      scatterOffset: { x: 0, y: 0 },
      pressure: 0.5,
      velocity: 0,
      tiltAngle: 0,
      tiltMagnitude: 0,
    };
    
    this.dynamicsCache.set(brush.id, dynamics);
  }

  private createDefaultDynamics(): BrushDynamics {
    return {
      size: 3,
      opacity: 1,
      spacing: 0.1,
      jitterOffset: { x: 0, y: 0 },
      scatterOffset: { x: 0, y: 0 },
      pressure: 0.5,
      velocity: 0,
      tiltAngle: 0,
      tiltMagnitude: 0,
    };
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

  private getSkiaBlendMode(blendMode: string): number {
    const blendModeMap: Record<string, number> = {
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

  private applyBrushEffects(paint: Paint, brush: Brush): void {
    // Apply brush-specific effects
    
    // Texture effect
    if (brush.textureId && brush.settings.textureDepth > 0) {
      // Would apply texture shader here
      // paint.setShader(textureShader);
    }
    
    // Wet paint effects
    if (brush.settings.wetness && brush.settings.wetness > 0) {
      // Reduce opacity for wet effect
      const currentAlpha = paint.getAlphaf();
      paint.setAlphaf(currentAlpha * (1 - brush.settings.wetness * 0.3));
    }
    
    // Grain effect for textured brushes
    if (brush.settings.graininess && brush.settings.graininess > 0) {
      // Would apply grain shader
    }
  }

  private loadBrushTextures(): void {
    // In a real implementation, these would load actual texture images
    // For now, we'll create placeholder textures
    
    const textureIds = [
      'pencil_texture_hb',
      'pencil_texture_2b',
      'pencil_texture_4b',
      'pencil_texture_6b',
      'watercolor_texture',
      'oil_texture',
      'acrylic_texture',
      'chalk_texture',
      'charcoal_texture',
    ];
    
    textureIds.forEach(id => {
      // Placeholder - would load actual texture
      this.brushTextures.set(id, { id, loaded: true });
    });
  }

  private async loadCustomBrushes(): Promise<void> {
    try {
      const savedBrushes = await dataManager.get<Record<string, Brush>>('custom_brushes');
      if (savedBrushes) {
        Object.entries(savedBrushes).forEach(([id, brush]) => {
          this.customBrushes.set(id, brush);
        });
        console.log(`Loaded ${this.customBrushes.size} custom brushes`);
      }
    } catch (error) {
      console.warn('Failed to load custom brushes:', error);
    }
  }

  private async saveCustomBrushes(): Promise<void> {
    try {
      const brushesObject: Record<string, Brush> = {};
      this.customBrushes.forEach((brush, id) => {
        brushesObject[id] = brush;
      });
      
      await dataManager.set('custom_brushes', brushesObject);
    } catch (error) {
      console.error('Failed to save custom brushes:', error);
    }
  }

  // ---- PUBLIC UTILITIES ----

  public getBrushPreview(brush: Brush): Path {
    // Create a preview stroke path for brush
    const path = Skia.Path.Make();
    const points = 20;
    const width = 100;
    const height = 30;
    
    path.moveTo(10, height / 2);
    
    for (let i = 0; i <= points; i++) {
      const t = i / points;
      const x = 10 + (width - 20) * t;
      const y = height / 2 + Math.sin(t * Math.PI * 2) * height * 0.3;
      
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    
    return path;
  }

  public exportBrush(brushId: string): string | null {
    const brush = this.getBrush(brushId);
    if (!brush) return null;
    
    return JSON.stringify(brush, null, 2);
  }

  public importBrush(brushData: string): string | null {
    try {
      const brush = JSON.parse(brushData) as Brush;
      
      // Validate brush structure
      if (!brush.id || !brush.name || !brush.settings) {
        throw new Error('Invalid brush data');
      }
      
      // Generate new ID for imported brush
      const importedId = `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      brush.id = importedId;
      brush.name = `${brush.name} (Imported)`;
      
      this.customBrushes.set(importedId, brush);
      this.saveCustomBrushes();
      
      this.eventBus.emit('brush:imported', { brush });
      return importedId;
    } catch (error) {
      console.error('Failed to import brush:', error);
      return null;
    }
  }
}

// Type definitions for brush dynamics
interface BrushDynamics {
  size: number;
  opacity: number;
  spacing: number;
  jitterOffset: { x: number; y: number };
  scatterOffset: { x: number; y: number };
  pressure: number;
  velocity: number;
  tiltAngle: number;
  tiltMagnitude: number;
}

// Export singleton instance
export const brushEngine = BrushEngine.getInstance();