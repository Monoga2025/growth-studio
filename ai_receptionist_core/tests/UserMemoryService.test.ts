import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserMemoryService } from '../src/UserMemoryService.js';

describe('UserMemoryService', () => {
  let memory: UserMemoryService;

  beforeEach(() => {
    memory = new UserMemoryService(':memory:');
  });

  afterEach(() => {
    memory.close();
  });

  it('should initialize and retrieve a new user profile with defaults', () => {
    const profile = memory.getUserProfile('user_001');

    expect(profile.userId).toBe('user_001');
    expect(profile.totalSpend).toBe(0);
    expect(profile.buyingIntentScore).toBe(30);
    expect(profile.unlockedMediaIds).toEqual([]);
  });

  it('should update user buying intent score', () => {
    const newScore = memory.updateBuyingIntentScore('user_001', 85);
    expect(newScore).toBe(85);

    const profile = memory.getUserProfile('user_001');
    expect(profile.buyingIntentScore).toBe(85);
  });

  it('should store and fetch conversation history in order', () => {
    const userId = 'user_002';

    memory.addMessageToHistory({
      id: 'm1',
      userId,
      role: 'user',
      content: 'hey pretty girl',
      timestamp: 1000,
    });

    memory.addMessageToHistory({
      id: 'm2',
      userId,
      role: 'assistant',
      content: 'hey babe!',
      timestamp: 2000,
    });

    const history = memory.getHistory(userId);

    expect(history.length).toBe(2);
    expect(history[0].content).toBe('hey pretty girl');
    expect(history[1].content).toBe('hey babe!');
  });

  it('should record purchases and update total spend and intent score', () => {
    const userId = 'user_003';

    memory.recordPurchase(userId, 45, 'media_123');
    const profile = memory.getUserProfile(userId);

    expect(profile.totalSpend).toBe(45);
    expect(profile.unlockedMediaIds).toContain('media_123');
    expect(profile.buyingIntentScore).toBeGreaterThan(30);
  });
});
