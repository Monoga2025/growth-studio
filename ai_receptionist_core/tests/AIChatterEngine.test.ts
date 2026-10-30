import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AIChatterEngine } from '../src/AIChatterEngine.js';

describe('AIChatterEngine Integration Test', () => {
  let engine: AIChatterEngine;

  beforeEach(() => {
    engine = new AIChatterEngine({
      aggregatorWindowMs: 50, // Fast window for tests
      mediaVaultPath: 'C:\\Users\\Monoga\\Desktop\\only',
      memoryDbPath: ':memory:',
      vaultDbPath: ':memory:',
    });
  });

  afterEach(() => {
    engine.destroy();
  });

  it('should process full cycle from user input to formatted response & media proposal', async () => {
    const userId = 'buyer_999';

    // 1. User sends flirting & purchase intent messages
    engine.receiveUserMessage(userId, 'hey sexy girl');
    engine.receiveUserMessage(userId, 'i want to see your custom video, how much for ppv?');

    // 2. Force flush batch
    const response = await engine.forceFlushUser(userId);

    expect(response).not.toBeNull();
    expect(response?.userId).toBe(userId);
    expect(response?.intent).toBe('high_intent');
    expect(response?.buyingIntentScore).toBeGreaterThanOrEqual(50);
    expect(response?.messages.length).toBeGreaterThan(0);

    // Should include PPV attachment because intent is high_intent
    expect(response?.attachedMedia).toBeDefined();
    expect(response?.isPPVLocked).toBe(true);
    expect(response?.price).toBeGreaterThan(0);

    // Check memory history recorded user & assistant messages
    const history = engine.memory.getHistory(userId);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.some((h) => h.role === 'user')).toBe(true);
    expect(history.some((h) => h.role === 'assistant')).toBe(true);
  });

  it('should handle user objection with price discount or charming teaser', async () => {
    const userId = 'objector_101';

    engine.receiveUserMessage(userId, 'that is way too expensive, not paying that');

    const response = await engine.forceFlushUser(userId);

    expect(response?.intent).toBe('objection');
    expect(response?.messages.some((m) => /worth|preview|penny|babe/i.test(m))).toBe(true);
  });
});
