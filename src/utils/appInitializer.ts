// src/utils/appInitializer.ts - PRODUCTION GRADE APP INITIALIZATION
import { layerManager } from '../engines/drawing/LayerManager';
import { valkyrieEngine } from '../engines/drawing/ValkyrieEngine';
import { brushEngine } from '../engines/drawing/BrushEngine';
import { colorManager } from '../engines/drawing/ColorManager';
import { performanceOptimizer } from '../engines/drawing/PerformanceOptimizer';
import { skillTreeManager } from '../engines/learning/SkillTreeManager';
import { lessonEngine } from '../engines/learning/LessonEngine';
import { challengeSystem } from '../engines/community/ChallengeSystem';
import { errorHandler } from '../engines/core/ErrorHandler';
import { performanceMonitor } from '../engines/core/PerformanceMonitor';
import { Dimensions } from 'react-native';

interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Production-grade app initialization with proper error handling
 * Ensures all engines are initialized in the correct order
 */
export class AppInitializer {
  private static initializationPromise: Promise<InitializationResult> | null = null;
  
  /**
   * Initialize the entire app with proper sequencing and error handling
   */
  public static async initialize(): Promise<InitializationResult> {
    // Return existing promise if already initializing
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    // Create new initialization promise
    this.initializationPromise = this.performInitialization();
    
    try {
      return await this.initializationPromise;
    } finally {
      // Clear promise after completion
      this.initializationPromise = null;
    }
  }
  
  private static async performInitialization(): Promise<InitializationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let success = true;
    
    console.log('🚀 Starting Pikaso app initialization...');
    
    try {
      // Phase 1: Core Systems
      console.log('📱 Phase 1: Initializing core systems...');
      
      // Initialize error handler first
      errorHandler.initialize();
      
      // Start performance monitoring
      performanceMonitor.startMonitoring();
      
      // Phase 2: Drawing Engine
      console.log('🎨 Phase 2: Initializing drawing engine...');
      
      try {
        // Initialize Valkyrie rendering engine
        const { width, height } = Dimensions.get('window');
        valkyrieEngine.initialize(width, height, 3);
        
        // Initialize layer manager
        await layerManager.initialize(width, height);
        
        // Verify brush engine is ready
        const brushCount = brushEngine.getAllBrushes().length;
        if (brushCount === 0) {
          throw new Error('No brushes available');
        }
        console.log(`✅ Drawing engine ready with ${brushCount} brushes`);
        
        // Set default brush
        brushEngine.setCurrentBrush('procreate-pencil');
        
        // Initialize color manager
        colorManager.setColor({ hex: '#000000' });
        
        // Initialize performance optimizer
        performanceOptimizer.forceOptimizationLevel(0); // Start with no optimization
        
      } catch (error) {
        const message = `Drawing engine initialization failed: ${error}`;
        errors.push(message);
        console.error('❌', message);
        success = false;
      }
      
      // Phase 3: Learning System
      console.log('📚 Phase 3: Initializing learning system...');
      
      try {
        // Initialize skill tree manager
        await skillTreeManager.initialize();
        const skillTrees = skillTreeManager.getAllSkillTrees();
        console.log(`✅ Loaded ${skillTrees.length} skill trees`);
        
        // Initialize lesson engine
        await lessonEngine.initialize();
        const lessons = lessonEngine.getAllLessons();
        console.log(`✅ Loaded ${lessons.length} lessons`);
        
        if (lessons.length === 0) {
          warnings.push('No lessons found - sample content will be created');
        }
        
      } catch (error) {
        const message = `Learning system initialization failed: ${error}`;
        errors.push(message);
        console.error('❌', message);
        // Don't fail completely - app can work without lessons
        warnings.push('Learning features may be limited');
      }
      
      // Phase 4: Community Features
      console.log('🌟 Phase 4: Initializing community features...');
      
      try {
        // Challenge system initializes itself
        const challenges = challengeSystem.getAllActiveChallenges();
        console.log(`✅ Challenge system ready with ${challenges.length} active challenges`);
        
        if (challenges.length === 0) {
          // Create default challenges
          challengeSystem.createDailyChallenge();
          challengeSystem.createWeeklyChallenge();
          console.log('✅ Created default challenges');
        }
        
      } catch (error) {
        const message = `Community features initialization failed: ${error}`;
        warnings.push(message);
        console.warn('⚠️', message);
        // Non-critical - continue
      }
      
      // Phase 5: Performance Validation
      console.log('⚡ Phase 5: Validating performance...');
      
      const metrics = performanceMonitor.getMetrics();
      console.log('📊 Initial performance metrics:', {
        fps: metrics.fps,
        memoryUsage: `${metrics.memoryUsage}MB`,
      });
      
      if (metrics.fps < 50) {
        warnings.push(`Low initial FPS detected: ${metrics.fps}`);
        // Enable optimization if needed
        performanceOptimizer.forceOptimizationLevel(1);
      }
      
      // Phase 6: Final Setup
      console.log('🔧 Phase 6: Final setup...');
      
      // Ensure at least one layer exists
      const layers = layerManager.getAllLayers();
      if (layers.length === 0) {
        layerManager.createLayer('Background', 'raster');
        console.log('✅ Created default layer');
      }
      
      // Log initialization summary
      console.log('\n📊 Initialization Summary:');
      console.log(`✅ Success: ${success}`);
      console.log(`❌ Errors: ${errors.length}`);
      console.log(`⚠️  Warnings: ${warnings.length}`);
      
      if (errors.length > 0) {
        console.error('Initialization errors:', errors);
      }
      
      if (warnings.length > 0) {
        console.warn('Initialization warnings:', warnings);
      }
      
      console.log('\n🎉 Pikaso app initialization completed!');
      
    } catch (error) {
      const message = `Critical initialization error: ${error}`;
      errors.push(message);
      console.error('💥', message);
      success = false;
    }
    
    return {
      success,
      errors,
      warnings,
    };
  }
  
  /**
   * Cleanup all systems
   */
  public static async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up app resources...');
    
    try {
      // Stop performance monitoring
      performanceMonitor.stopMonitoring();
      
      // Cleanup drawing engine
      valkyrieEngine.destroy();
      layerManager.cleanup();
      performanceOptimizer.destroy();
      
      // Clear caches
      colorManager.clearColorHistory();
      
      console.log('✅ Cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup error:', error);
    }
  }
  
  /**
   * Reset app to initial state
   */
  public static async reset(): Promise<void> {
    console.log('🔄 Resetting app to initial state...');
    
    await this.cleanup();
    await this.initialize();
  }
}