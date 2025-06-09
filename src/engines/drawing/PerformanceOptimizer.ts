// src/engines/drawing/PerformanceOptimizer.ts
export class PerformanceOptimizer {
    private static instance: PerformanceOptimizer;
    
    private constructor() {}
    
    public static getInstance(): PerformanceOptimizer {
      if (!PerformanceOptimizer.instance) {
        PerformanceOptimizer.instance = new PerformanceOptimizer();
      }
      return PerformanceOptimizer.instance;
    }
    
    public optimizeCanvas(canvas: HTMLCanvasElement): void {
      // Canvas optimization logic
    }
  }
  
  export const performanceOptimizer = PerformanceOptimizer.getInstance();