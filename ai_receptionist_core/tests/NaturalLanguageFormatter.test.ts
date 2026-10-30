import { describe, it, expect } from 'vitest';
import { NaturalLanguageFormatter } from '../src/NaturalLanguageFormatter.js';

describe('NaturalLanguageFormatter', () => {
  const formatter = new NaturalLanguageFormatter({
    injectFillerChance: 1.0, // Force filler injection for test predictability
    maxChunkWords: 8,
  });

  it('should split long sentences into multiple short chat bubbles', () => {
    const rawInput =
      'Hello dear subscriber, I am currently lying in bed thinking about what we should do tonight and I really want to show you my new lingerie!';

    const chunks = formatter.formatResponse(rawInput);

    expect(chunks.length).toBeGreaterThan(1);
    expect(Array.isArray(chunks)).toBe(true);
  });

  it('should convert formal text to casual 22yo girl slang', () => {
    const rawInput = 'You are really beautiful because you make me happy tonight!';

    const chunks = formatter.formatResponse(rawInput);
    const combined = chunks.join(' ');

    expect(combined).toMatch(/\b(u|r|ur|bc|rly|2night)\b/i);
  });

  it('should inject human filler words naturally', () => {
    const rawInput = 'I miss you so much!';

    const chunks = formatter.formatResponse(rawInput);
    const hasFiller = chunks.some((c) =>
      /\b(omg|haha|wait|lol|uhh|mhm|hehe|babe|xx|nvm)\b/i.test(c)
    );

    expect(hasFiller).toBe(true);
  });

  it('should strip formal AI disclaimers', () => {
    const rawInput = 'As an AI model, I am lying in bed thinking of you.';

    const chunks = formatter.formatResponse(rawInput);
    const combined = chunks.join(' ');

    expect(combined).not.toContain('As an AI model');
  });
});
