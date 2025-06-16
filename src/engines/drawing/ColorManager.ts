// src/engines/drawing/ColorManager.ts
import { 
    Color, 
    ColorPalette, 
    ColorPickerMode, 
    ColorHarmony 
  } from '../../types/drawing';
  import { EventBus } from '../core/EventBus';
  import { dataManager } from '../core/DataManager';
  
  /**
   * Color Manager - Professional color management system
   * Handles color selection, palettes, history, and harmonies
   */
  export class ColorManager {
    private static instance: ColorManager;
    private eventBus = EventBus.getInstance();
    
    // Current color state
    private currentColor: Color = {
      hex: '#000000',
      rgb: { r: 0, g: 0, b: 0 },
      hsb: { h: 0, s: 0, b: 0 },
      alpha: 1,
    };
    
    // Color history
    private colorHistory: Color[] = [];
    private readonly MAX_HISTORY = 50;
    
    // Recent colors
    private recentColors: Color[] = [];
    private readonly MAX_RECENT = 20;
    
    // Color palettes
    private palettes: Map<string, ColorPalette> = new Map();
    private currentPaletteId: string | null = null;
    
    // Picker settings
    private pickerMode: ColorPickerMode = {
      type: 'wheel',
      showAlpha: true,
      showHistory: true,
      showEyedropper: true,
    };
    
    // Default palettes
    private readonly DEFAULT_PALETTES = [
      {
        id: 'default',
        name: 'Default',
        colors: [
          '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
          '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#800000',
        ],
      },
      {
        id: 'grayscale',
        name: 'Grayscale',
        colors: [
          '#000000', '#1A1A1A', '#333333', '#4D4D4D', '#666666',
          '#808080', '#999999', '#B3B3B3', '#CCCCCC', '#E6E6E6',
        ],
      },
      {
        id: 'pastel',
        name: 'Pastel',
        colors: [
          '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
          '#C9BAFF', '#FFBAF3', '#FFE4E1', '#E1F5FE', '#F3E5F5',
        ],
      },
      {
        id: 'vibrant',
        name: 'Vibrant',
        colors: [
          '#FF006E', '#FB5607', '#FFBE0B', '#8338EC', '#3A86FF',
          '#06FFB4', '#FF4365', '#00D9FF', '#7209B7', '#F72585',
        ],
      },
    ];
    
    private constructor() {
      this.initializeDefaultPalettes();
      this.loadSavedData();
    }
  
    public static getInstance(): ColorManager {
      if (!ColorManager.instance) {
        ColorManager.instance = new ColorManager();
      }
      return ColorManager.instance;
    }
  
    // ===== PUBLIC API =====
  
    public getCurrentColor(): Color {
      return { ...this.currentColor };
    }
  
    public setCurrentColor(color: Color | string): void {
      let newColor: Color;
      
      if (typeof color === 'string') {
        newColor = this.hexToColor(color);
      } else {
        newColor = { ...color };
      }
      
      // Add to history if different
      if (newColor.hex !== this.currentColor.hex) {
        this.addToHistory(this.currentColor);
        this.addToRecent(newColor);
      }
      
      this.currentColor = newColor;
      this.eventBus.emit('color:changed', { color: newColor });
      this.saveData();
    }
  
    public setColorFromRGB(r: number, g: number, b: number, alpha: number = 1): void {
      const color = this.rgbToColor(r, g, b, alpha);
      this.setCurrentColor(color);
    }
  
    public setColorFromHSB(h: number, s: number, b: number, alpha: number = 1): void {
      const color = this.hsbToColor(h, s, b, alpha);
      this.setCurrentColor(color);
    }
  
    public setAlpha(alpha: number): void {
      this.currentColor.alpha = Math.max(0, Math.min(1, alpha));
      this.eventBus.emit('color:changed', { color: this.currentColor });
    }
  
    public getColorHistory(): Color[] {
      return [...this.colorHistory];
    }
  
    public getRecentColors(): Color[] {
      return [...this.recentColors];
    }
  
    public clearHistory(): void {
      this.colorHistory = [];
      this.saveData();
    }
  
    public clearRecent(): void {
      this.recentColors = [];
      this.saveData();
    }
  
    // Palette management
    public createPalette(name: string, colors: Color[] = []): ColorPalette {
      const paletteId = `palette_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const palette: ColorPalette = {
        id: paletteId,
        name,
        colors: colors.map(c => ({ ...c })),
        locked: false,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };
      
      this.palettes.set(paletteId, palette);
      this.saveData();
      
      this.eventBus.emit('palette:created', { palette });
      return palette;
    }
  
    public deletePalette(paletteId: string): boolean {
      const palette = this.palettes.get(paletteId);
      if (!palette || palette.locked) return false;
      
      this.palettes.delete(paletteId);
      
      if (this.currentPaletteId === paletteId) {
        this.currentPaletteId = null;
      }
      
      this.saveData();
      this.eventBus.emit('palette:deleted', { paletteId });
      return true;
    }
  
    public updatePalette(paletteId: string, updates: Partial<ColorPalette>): boolean {
      const palette = this.palettes.get(paletteId);
      if (!palette || palette.locked) return false;
      
      Object.assign(palette, updates);
      palette.modifiedAt = new Date();
      
      this.saveData();
      this.eventBus.emit('palette:updated', { palette });
      return true;
    }
  
    public addColorToPalette(paletteId: string, color: Color): boolean {
      const palette = this.palettes.get(paletteId);
      if (!palette || palette.locked) return false;
      
      palette.colors.push({ ...color });
      palette.modifiedAt = new Date();
      
      this.saveData();
      this.eventBus.emit('palette:updated', { palette });
      return true;
    }
  
    public removeColorFromPalette(paletteId: string, index: number): boolean {
      const palette = this.palettes.get(paletteId);
      if (!palette || palette.locked || index < 0 || index >= palette.colors.length) {
        return false;
      }
      
      palette.colors.splice(index, 1);
      palette.modifiedAt = new Date();
      
      this.saveData();
      this.eventBus.emit('palette:updated', { palette });
      return true;
    }
  
    public getPalette(paletteId: string): ColorPalette | null {
      return this.palettes.get(paletteId) || null;
    }
  
    public getAllPalettes(): ColorPalette[] {
      return Array.from(this.palettes.values());
    }
  
    public setCurrentPalette(paletteId: string | null): void {
      if (paletteId && !this.palettes.has(paletteId)) return;
      
      this.currentPaletteId = paletteId;
      this.eventBus.emit('palette:selected', { paletteId });
    }
  
    public getCurrentPalette(): ColorPalette | null {
      return this.currentPaletteId ? this.palettes.get(this.currentPaletteId) || null : null;
    }
  
    // Color harmony
    public getColorHarmony(type: ColorHarmony['type'], baseColor?: Color): ColorHarmony {
      const base = baseColor || this.currentColor;
      const harmonicColors: Color[] = [];
      
      switch (type) {
        case 'complementary':
          harmonicColors.push(this.getComplementaryColor(base));
          break;
          
        case 'analogous':
          harmonicColors.push(
            this.rotateHue(base, -30),
            this.rotateHue(base, 30)
          );
          break;
          
        case 'triadic':
          harmonicColors.push(
            this.rotateHue(base, 120),
            this.rotateHue(base, 240)
          );
          break;
          
        case 'tetradic':
          harmonicColors.push(
            this.rotateHue(base, 90),
            this.rotateHue(base, 180),
            this.rotateHue(base, 270)
          );
          break;
          
        case 'split-complementary':
          harmonicColors.push(
            this.rotateHue(base, 150),
            this.rotateHue(base, 210)
          );
          break;
      }
      
      return {
        type,
        baseColor: base,
        harmonicColors,
      };
    }
  
    // Picker mode
    public setPickerMode(mode: Partial<ColorPickerMode>): void {
      this.pickerMode = { ...this.pickerMode, ...mode };
      this.eventBus.emit('picker:modeChanged', { mode: this.pickerMode });
    }
  
    public getPickerMode(): ColorPickerMode {
      return { ...this.pickerMode };
    }
  
    // Eyedropper
    public async pickColorFromCanvas(x: number, y: number): Promise<Color | null> {
      // This would be implemented by sampling the canvas at the given coordinates
      // For now, emit an event for the canvas to handle
      this.eventBus.emit('eyedropper:requested', { x, y });
      
      // In a real implementation, this would return the sampled color
      return null;
    }
  
    // ===== UTILITY METHODS =====
  
    public hexToColor(hex: string): Color {
      // Ensure hex starts with #
      if (!hex.startsWith('#')) {
        hex = '#' + hex;
      }
      
      // Handle 3-digit hex
      if (hex.length === 4) {
        hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      }
      
      const r = parseInt(hex.substr(1, 2), 16);
      const g = parseInt(hex.substr(3, 2), 16);
      const b = parseInt(hex.substr(5, 2), 16);
      
      return this.rgbToColor(r, g, b, 1);
    }
  
    public rgbToColor(r: number, g: number, b: number, alpha: number): Color {
      // Clamp values
      r = Math.max(0, Math.min(255, Math.round(r)));
      g = Math.max(0, Math.min(255, Math.round(g)));
      b = Math.max(0, Math.min(255, Math.round(b)));
      alpha = Math.max(0, Math.min(1, alpha));
      
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      const hsb = this.rgbToHsb(r, g, b);
      
      return {
        hex,
        rgb: { r, g, b },
        hsb,
        alpha,
      };
    }
  
    public hsbToColor(h: number, s: number, b: number, alpha: number): Color {
      // Clamp values
      h = ((h % 360) + 360) % 360;
      s = Math.max(0, Math.min(1, s));
      b = Math.max(0, Math.min(1, b));
      alpha = Math.max(0, Math.min(1, alpha));
      
      const rgb = this.hsbToRgb(h, s, b);
      const hex = `#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`;
      
      return {
        hex,
        rgb,
        hsb: { h, s, b },
        alpha,
      };
    }
  
    // ===== PRIVATE METHODS =====
  
    private initializeDefaultPalettes(): void {
      this.DEFAULT_PALETTES.forEach(paletteData => {
        const palette: ColorPalette = {
          id: paletteData.id,
          name: paletteData.name,
          colors: paletteData.colors.map(hex => this.hexToColor(hex)),
          locked: true,
          createdAt: new Date(),
          modifiedAt: new Date(),
        };
        
        this.palettes.set(palette.id, palette);
      });
    }
  
    private addToHistory(color: Color): void {
      // Remove duplicates
      this.colorHistory = this.colorHistory.filter(c => c.hex !== color.hex);
      
      // Add to beginning
      this.colorHistory.unshift({ ...color });
      
      // Limit size
      if (this.colorHistory.length > this.MAX_HISTORY) {
        this.colorHistory.pop();
      }
    }
  
    private addToRecent(color: Color): void {
      // Remove duplicates
      this.recentColors = this.recentColors.filter(c => c.hex !== color.hex);
      
      // Add to beginning
      this.recentColors.unshift({ ...color });
      
      // Limit size
      if (this.recentColors.length > this.MAX_RECENT) {
        this.recentColors.pop();
      }
    }
  
    private rgbToHsb(r: number, g: number, b: number): { h: number; s: number; b: number } {
      r /= 255;
      g /= 255;
      b /= 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      
      let h = 0;
      let s = max === 0 ? 0 : delta / max;
      let brightness = max;
      
      if (delta !== 0) {
        if (max === r) {
          h = ((g - b) / delta + (g < b ? 6 : 0)) / 6;
        } else if (max === g) {
          h = ((b - r) / delta + 2) / 6;
        } else {
          h = ((r - g) / delta + 4) / 6;
        }
      }
      
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100) / 100,
        b: Math.round(brightness * 100) / 100,
      };
    }
  
    private hsbToRgb(h: number, s: number, b: number): { r: number; g: number; b: number } {
      h /= 360;
      
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = b * (1 - s);
      const q = b * (1 - f * s);
      const t = b * (1 - (1 - f) * s);
      
      let r: number, g: number, blue: number;
      
      switch (i % 6) {
        case 0: r = b; g = t; blue = p; break;
        case 1: r = q; g = b; blue = p; break;
        case 2: r = p; g = b; blue = t; break;
        case 3: r = p; g = q; blue = b; break;
        case 4: r = t; g = p; blue = b; break;
        case 5: r = b; g = p; blue = q; break;
        default: r = 0; g = 0; blue = 0;
      }
      
      return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(blue * 255),
      };
    }
  
    private getComplementaryColor(color: Color): Color {
      return this.rotateHue(color, 180);
    }
  
    private rotateHue(color: Color, degrees: number): Color {
      const newHue = (color.hsb.h + degrees + 360) % 360;
      return this.hsbToColor(newHue, color.hsb.s, color.hsb.b, color.alpha);
    }
  
    private async loadSavedData(): Promise<void> {
      try {
        const savedData = await dataManager.get<ColorManagerSaveData>('colorManager');
        if (savedData) {
          // Restore current color
          if (savedData.currentColor) {
            this.currentColor = savedData.currentColor;
          }
          
          // Restore history
          if (savedData.colorHistory) {
            this.colorHistory = savedData.colorHistory;
          }
          
          // Restore recent colors
          if (savedData.recentColors) {
            this.recentColors = savedData.recentColors;
          }
          
          // Restore custom palettes
          if (savedData.customPalettes) {
            savedData.customPalettes.forEach(palette => {
              if (!palette.locked) { // Don't overwrite default palettes
                this.palettes.set(palette.id, palette);
              }
            });
          }
          
          // Restore current palette
          if (savedData.currentPaletteId && this.palettes.has(savedData.currentPaletteId)) {
            this.currentPaletteId = savedData.currentPaletteId;
          }
          
          console.log('✅ Color Manager data loaded');
        }
      } catch (error) {
        console.error('Failed to load color manager data:', error);
      }
    }
  
    private async saveData(): Promise<void> {
      try {
        const saveData: ColorManagerSaveData = {
          currentColor: this.currentColor,
          colorHistory: this.colorHistory,
          recentColors: this.recentColors,
          customPalettes: Array.from(this.palettes.values()).filter(p => !p.locked),
          currentPaletteId: this.currentPaletteId,
        };
        
        await dataManager.set('colorManager', saveData);
      } catch (error) {
        console.error('Failed to save color manager data:', error);
      }
    }
  }
  
  // ===== TYPES =====
  
  interface ColorManagerSaveData {
    currentColor: Color;
    colorHistory: Color[];
    recentColors: Color[];
    customPalettes: ColorPalette[];
    currentPaletteId: string | null;
  }
  
  // Export singleton
  export const colorManager = ColorManager.getInstance();