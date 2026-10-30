import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageAggregator } from '../src/MessageAggregator.js';
import { UserMessage } from '../src/types.js';

describe('MessageAggregator', () => {
  let aggregator: MessageAggregator;

  beforeEach(() => {
    aggregator = new MessageAggregator(100); // 100ms window for fast testing
  });

  afterEach(() => {
    aggregator.stop();
  });

  it('should aggregate multiple messages from the same user into a single batch', async () => {
    const userId = 'usr_123';

    aggregator.addMessage({
      id: 'm1',
      userId,
      content: 'hey babe',
      timestamp: Date.now(),
    });

    aggregator.addMessage({
      id: 'm2',
      userId,
      content: 'what r u up to?',
      timestamp: Date.now() + 10,
    });

    expect(aggregator.getPendingCount(userId)).toBe(2);

    const batch = await aggregator.flush(userId);

    expect(batch).not.toBeNull();
    expect(batch?.userId).toBe(userId);
    expect(batch?.messages.length).toBe(2);
    expect(batch?.combinedText).toBe('hey babe what r u up to?');
    expect(aggregator.getPendingCount(userId)).toBe(0);
  });

  it('should trigger callback automatically when window expires', async () => {
    const userId = 'usr_456';
    const callbackFn = vi.fn();

    aggregator.onBatchReady(callbackFn);

    aggregator.addMessage({
      id: 'm1',
      userId,
      content: 'wanna see u',
      timestamp: Date.now(),
    });

    // Wait for timer to fire
    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(callbackFn).toHaveBeenCalledTimes(1);
    const emittedBatch = callbackFn.mock.calls[0][0];
    expect(emittedBatch.userId).toBe(userId);
    expect(emittedBatch.combinedText).toBe('wanna see u');
  });

  it('should identify non-text primary media type when attached', async () => {
    const userId = 'usr_789';

    aggregator.addMessage({
      id: 'm1',
      userId,
      content: 'look at this',
      mediaType: 'image',
      fileUrl: 'pic.jpg',
      timestamp: Date.now(),
    });

    const batch = await aggregator.flush(userId);
    expect(batch?.primaryMediaType).toBe('image');
  });
});
