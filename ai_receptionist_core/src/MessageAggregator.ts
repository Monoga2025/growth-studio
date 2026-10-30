import { UserMessage, AggregatedBatch, MediaType } from './types.js';

export type BatchCallback = (batch: AggregatedBatch) => Promise<void> | void;

export class MessageAggregator {
  private windowMs: number;
  private buffers: Map<string, UserMessage[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private callbacks: BatchCallback[] = [];

  constructor(windowMs: number = 3000) {
    // Ensure window is within 2-4 seconds range unless specified otherwise for unit tests
    this.windowMs = windowMs;
  }

  /**
   * Register a callback listener when a message batch is ready
   */
  public onBatchReady(callback: BatchCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Add a message to the aggregation window for a user
   */
  public addMessage(message: UserMessage): void {
    const { userId } = message;

    if (!this.buffers.has(userId)) {
      this.buffers.set(userId, []);
    }

    this.buffers.get(userId)!.push(message);

    // Reset timer if already running for this user (debounce behavior)
    if (this.timers.has(userId)) {
      clearTimeout(this.timers.get(userId)!);
    }

    const timer = setTimeout(() => {
      this.flush(userId);
    }, this.windowMs);

    this.timers.set(userId, timer);
  }

  /**
   * Immediately flush and emit the aggregated batch for a user
   */
  public async flush(userId: string): Promise<AggregatedBatch | null> {
    if (this.timers.has(userId)) {
      clearTimeout(this.timers.get(userId)!);
      this.timers.delete(userId);
    }

    const messages = this.buffers.get(userId) || [];
    if (messages.length === 0) {
      return null;
    }

    // Clear buffer for this user
    this.buffers.delete(userId);

    // Sort by timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);

    const combinedText = messages.map((m) => m.content.trim()).join(' ');

    // Determine primary media type (prefer non-text if any media attached)
    const mediaMessages = messages.filter((m) => m.mediaType && m.mediaType !== 'text');
    const primaryMediaType: MediaType = mediaMessages.length > 0 ? mediaMessages[0].mediaType! : 'text';

    const batch: AggregatedBatch = {
      userId,
      messages,
      combinedText,
      primaryMediaType,
      startTime: messages[0].timestamp,
      endTime: messages[messages.length - 1].timestamp,
    };

    // Notify all registered callbacks
    for (const cb of this.callbacks) {
      await cb(batch);
    }

    return batch;
  }

  /**
   * Get pending messages count for a user
   */
  public getPendingCount(userId: string): number {
    return this.buffers.get(userId)?.length || 0;
  }

  /**
   * Stop all pending timers and clear buffers
   */
  public stop(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    this.buffers.clear();
  }
}
