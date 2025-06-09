// src/engines/drawing/BrushEngine.ts
import { Brush } from '../../types';

export class BrushEngine {
  private static instance: BrushEngine;
  
  private constructor() {}
  
  public static getInstance(): BrushEngine {
    if (!BrushEngine.instance) {
      BrushEngine.instance = new BrushEngine();
    }
    return BrushEngine.instance;
  }
  
  public getDefaultBrushes(): Brush[] {
    return [
      {
        id: 'pencil',
        name: 'Pencil',
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
      },
      // Add more brushes as needed
    ];
  }
}

export const brushEngine = BrushEngine.getInstance();