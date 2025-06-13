// src/engines/drawing/SkiaCompatibility.ts
/**
 * Skia Compatibility Layer - Commercial Grade
 * Handles React Native Skia API differences and provides consistent interface
 */

import {
    Skia,
    SkCanvas,
    SkPaint,
    SkPath,
    SkSurface,
    SkImage,
    BlendMode,
    PaintStyle,
    StrokeCap,
    StrokeJoin,
    SkMaskFilter,
    SkColorFilter,
    SkShader,
    Canvas,
    useCanvasRef,
    TouchHandler,
    useTouchHandler as useSkiaTouchHandler,
    SkRect,
    ClipOp,
  } from '@shopify/react-native-skia';
  
  // ===== TYPE DEFINITIONS =====
  
  export interface TouchInfo {
    x: number;
    y: number;
    id: number;
    timestamp: number;
  }
  
  export interface ExtendedTouchInfo extends TouchInfo {
    force?: number;
    tiltX?: number;
    tiltY?: number;
    pressure?: number;
  }
  
  export interface SkiaColorSpace {
    SRGB: any;
  }
  
  export interface SkiaColorType {
    RGBA_8888: any;
  }
  
  export interface SkiaAlphaType {
    Premul: any;
  }
  
  export interface SkiaTileMode {
    Repeat: any;
  }
  
  export interface SkiaBlurStyle {
    Normal: any;
  }
  
  // ===== COMPATIBILITY LAYER =====
  
  /**
   * Enhanced Skia object with compatibility methods
   */
  export const CompatSkia = {
    ...Skia,
    
    // Color space compatibility
    ColorSpace: {
      SRGB: 'srgb' as any, // React Native Skia uses string identifiers
    },
    
    // Color type compatibility  
    ColorType: {
      RGBA_8888: 'rgba8888' as any,
    },
    
    // Alpha type compatibility
    AlphaType: {
      Premul: 'premul' as any,
    },
    
    // Tile mode compatibility
    TileMode: {
      Repeat: 'repeat' as any,
    },
    
    // Blur style compatibility
    BlurStyle: {
      Normal: 'normal' as any,
    },
    
    // Blend mode compatibility
    BlendMode: {
      SrcOver: BlendMode.SrcOver,
    },
    
    // Enhanced Surface factory
    Surface: {
      ...Skia.Surface,
      Make: (width: number, height: number, colorType?: any, alphaType?: any, colorSpace?: any): SkSurface | null => {
        // React Native Skia Surface.Make only takes width and height
        return Skia.Surface.Make(width, height);
      },
    },
    
    // Enhanced MaskFilter with proper parameters
    MaskFilter: {
      ...Skia.MaskFilter,
      MakeBlur: (style: any, sigma: number, respectCTM: boolean = true): SkMaskFilter => {
        // React Native Skia MakeBlur requires all 3 parameters
        return Skia.MaskFilter.MakeBlur(style, sigma, respectCTM);
      },
    },
    
    // Enhanced Image factory
    Image: {
      ...Skia.Image,
      MakeFromEncoded: (data: any): SkImage | null => {
        // Use correct method name
        return Skia.Image.MakeImageFromEncoded(data);
      },
    },
  };
  
  // ===== TOUCH HANDLING COMPATIBILITY =====
  
  export interface TouchHandlerConfig {
    onStart: (touch: TouchInfo) => void;
    onActive: (touch: ExtendedTouchInfo) => void;
    onEnd: (touch: ExtendedTouchInfo) => void;
  }
  
  /**
   * Touch handler compatibility wrapper
   */
  export const useTouchHandler = (config: TouchHandlerConfig, deps: any[]) => {
    // React Native Skia touch handling - adapt to your needs
    const touchHandler = (event: any) => {
      'worklet';
      
      // Transform Skia touch events to our format
      const touches = event.changedTouches || [event];
      
      touches.forEach((touch: any) => {
        const touchInfo: ExtendedTouchInfo = {
          x: touch.locationX || touch.x || 0,
          y: touch.locationY || touch.y || 0,
          id: touch.identifier || touch.id || 0,
          timestamp: touch.timestamp || Date.now(),
          force: touch.force || 0.5,
          pressure: touch.force || 0.5,
          tiltX: touch.tiltX || 0,
          tiltY: touch.tiltY || 0,
        };
        
        // Route to appropriate handler based on event type
        if (event.type === 'start' || !event.type) {
          config.onStart(touchInfo);
        } else if (event.type === 'move' || event.type === 'active') {
          config.onActive(touchInfo);
        } else if (event.type === 'end') {
          config.onEnd(touchInfo);
        }
      });
    };
    
    return touchHandler;
  };
  
  // ===== DRAWING UTILITIES =====
  
  /**
   * Professional path creation utilities
   */
  export const PathUtils = {
    /**
     * Create smooth path from points using Catmull-Rom splines
     */
    createSmoothPath: (points: TouchInfo[]): SkPath => {
      const path = Skia.Path.Make();
      
      if (points.length === 0) return path;
      
      if (points.length === 1) {
        // Single point - create small circle
        path.addCircle(points[0].x, points[0].y, 1);
        return path;
      }
      
      path.moveTo(points[0].x, points[0].y);
      
      if (points.length === 2) {
        path.lineTo(points[1].x, points[1].y);
        return path;
      }
      
      // Use quadratic curves for smoothness
      for (let i = 1; i < points.length - 1; i++) {
        const current = points[i];
        const next = points[i + 1];
        
        // Control point is midway between current and next
        const cpX = (current.x + next.x) / 2;
        const cpY = (current.y + next.y) / 2;
        
        path.quadTo(current.x, current.y, cpX, cpY);
      }
      
      // Final point
      const lastPoint = points[points.length - 1];
      path.lineTo(lastPoint.x, lastPoint.y);
      
      return path;
    },
    
    /**
     * Calculate path bounds with padding
     */
    getPathBounds: (path: SkPath, padding: number = 0) => {
      const bounds = path.getBounds();
      return {
        x: bounds.x - padding,
        y: bounds.y - padding, 
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
      };
    },
  };
  
  // ===== PAINT UTILITIES =====
  
  /**
   * Professional paint creation utilities
   */
  export const PaintUtils = {
    /**
     * Create optimized stroke paint
     */
    createStrokePaint: (options: {
      color: string;
      strokeWidth: number;
      opacity?: number;
      blendMode?: BlendMode;
      cap?: StrokeCap;
      join?: StrokeJoin;
    }): SkPaint => {
      const paint = Skia.Paint();
      
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeWidth(options.strokeWidth);
      paint.setColor(Skia.Color(options.color));
      paint.setAntiAlias(true);
      
      if (options.opacity !== undefined) {
        paint.setAlphaf(options.opacity);
      }
      
      if (options.blendMode !== undefined) {
        paint.setBlendMode(options.blendMode);
      }
      
      if (options.cap !== undefined) {
        paint.setStrokeCap(options.cap);
      }
      
      if (options.join !== undefined) {
        paint.setStrokeJoin(options.join);
      }
      
      return paint;
    },
    
    /**
     * Create optimized fill paint
     */
    createFillPaint: (options: {
      color: string;
      opacity?: number;
      blendMode?: BlendMode;
    }): SkPaint => {
      const paint = Skia.Paint();
      
      paint.setStyle(PaintStyle.Fill);
      paint.setColor(Skia.Color(options.color));
      paint.setAntiAlias(true);
      
      if (options.opacity !== undefined) {
        paint.setAlphaf(options.opacity);
      }
      
      if (options.blendMode !== undefined) {
        paint.setBlendMode(options.blendMode);
      }
      
      return paint;
    },
  };
  
  // ===== PERFORMANCE UTILITIES =====
  
  /**
   * Canvas performance optimization utilities
   */
  export const PerformanceUtils = {
    /**
     * Efficient canvas clearing
     */
    clearCanvas: (canvas: SkCanvas, color: string = 'transparent') => {
      canvas.clear(Skia.Color(color));
    },
    
    /**
     * Efficient rect clipping with anti-aliasing
     */
    clipRect: (canvas: SkCanvas, rect: SkRect, antiAlias: boolean = true) => {
      canvas.clipRect(rect, ClipOp.Intersect, antiAlias);
    },
    
    /**
     * Memory-efficient image drawing
     */
    drawImage: (canvas: SkCanvas, image: SkImage, x: number, y: number, paint?: SkPaint) => {
      if (paint) {
        canvas.drawImage(image, x, y, paint);
      } else {
        canvas.drawImage(image, x, y);
      }
    },
  };
  
  // ===== EXPORTS =====
  
  export {
    Canvas,
    useCanvasRef,
    Skia,
    SkCanvas,
    SkPaint,
    SkPath,
    SkSurface,
    SkImage,
    BlendMode,
    PaintStyle,
    StrokeCap,
    StrokeJoin,
    SkMaskFilter,
    SkColorFilter,
    SkShader,
    SkRect,
    ClipOp,
  };
  
  export default CompatSkia;