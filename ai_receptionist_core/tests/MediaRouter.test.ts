import { describe, it, expect } from 'vitest';
import { MediaRouter } from '../src/MediaRouter.js';

describe('MediaRouter', () => {
  const router = new MediaRouter();

  it('should detect media types correctly based on extensions', () => {
    expect(router.detectMediaType('srpacks (1).jpg')).toBe('image');
    expect(router.detectMediaType('srpacks (1).mp4')).toBe('video');
    expect(router.detectMediaType('srpacks (1).m4v')).toBe('video');
    expect(router.detectMediaType('voice_clip.m4a')).toBe('voice_note');
    expect(router.detectMediaType('just a text message')).toBe('text');
  });

  it('should classify high intent / purchase requests with high score', () => {
    const analysis = router.classifyIntent('send me a nude video how much for custom ppv?');

    expect(analysis.intent).toBe('high_intent');
    expect(analysis.score).toBeGreaterThanOrEqual(70);
    expect(analysis.keywords).toContain('nude');
    expect(analysis.keywords).toContain('how much');
  });

  it('should classify flirting intent', () => {
    const analysis = router.classifyIntent('ur so hot babe i miss u sweetie');

    expect(analysis.intent).toBe('flirting');
    expect(analysis.score).toBeGreaterThanOrEqual(50);
    expect(analysis.keywords).toContain('hot');
    expect(analysis.keywords).toContain('babe');
  });

  it('should classify price/authenticity objections', () => {
    const analysis = router.classifyIntent('this is too expensive is it really u or a fake scam?');

    expect(analysis.intent).toBe('objection');
    expect(analysis.keywords).toContain('expensive');
    expect(analysis.keywords).toContain('scam');
  });

  it('should classify casual chat fallback', () => {
    const analysis = router.classifyIntent('good morning how was your weekend?');

    expect(analysis.intent).toBe('casual_chat');
    expect(analysis.score).toBeLessThan(60);
  });
});
