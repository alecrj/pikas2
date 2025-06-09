// src/engines/user/index.ts
export { ProfileSystem, profileSystem } from './ProfileSystem';
export { ProgressionSystem, progressionSystem } from './ProgressionSystem';
export { PortfolioManager, portfolioManager } from './PortfolioManager';

// Fixed: Use getInstance() instead of new
export const profileSystem = ProfileSystem.getInstance();
export const progressionSystem = ProgressionSystem.getInstance();
export const portfolioManager = PortfolioManager.getInstance();

export async function initializeUserEngine(): Promise<void> {
  try {
    // User engines are initialized via singletons
    console.log('User engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize user engine:', error);
    throw error;
  }
}