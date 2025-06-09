// src/engines/community/index.ts
export { SocialEngine, socialEngine } from './SocialEngine';
export { ChallengeSystem, challengeSystem } from './ChallengeSystem';

// Fixed: Use getInstance() instead of new
export const socialEngine = SocialEngine.getInstance();
export const challengeSystem = ChallengeSystem.getInstance();

export async function initializeCommunityEngine(): Promise<void> {
  try {
    // Community engines are initialized via singletons
    console.log('Community engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize community engine:', error);
    throw error;
  }
}