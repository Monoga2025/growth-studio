import { FormatterConfig } from './types.js';

export class NaturalLanguageFormatter {
  private config: Required<FormatterConfig>;

  private static DEFAULT_FILLERS = [
    'omg',
    'haha',
    'wait',
    'lol',
    'uhh',
    'mhm',
    'hehe',
    'babe',
    'xx',
    'nvm',
  ];

  private static SLANG_MAP: Record<string, string> = {
    you: 'u',
    are: 'r',
    your: 'ur',
    youre: "u're",
    "you're": "u're",
    because: 'bc',
    really: 'rly',
    picture: 'pic',
    pictures: 'pics',
    tonight: '2night',
    tomorrow: '2moro',
    please: 'pls',
    thanks: 'thx',
    "want to": 'wanna',
    "going to": 'gonna',
    "don't know": "don't knw",
    cannot: "can't",
  };

  constructor(config: FormatterConfig = {}) {
    this.config = {
      fillerWords: config.fillerWords || NaturalLanguageFormatter.DEFAULT_FILLERS,
      injectFillerChance: config.injectFillerChance ?? 0.6,
      maxChunkWords: config.maxChunkWords || 12,
      casualTypoChance: config.casualTypoChance ?? 0.5,
    };
  }

  /**
   * Main entry point to format raw AI output string into an array of short natural chat bubbles
   */
  public formatResponse(rawText: string): string[] {
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    // Clean up corporate/formal artifact lines
    let cleaned = rawText.replace(/As an AI model,?\s*/gi, '')
      .replace(/Hello customer,?\s*/gi, '')
      .replace(/Dear subscriber,?\s*/gi, '');

    // 1. Split into base sentences/clauses
    const rawChunks = this.splitIntoChunks(cleaned);

    // 2. Format each chunk (casual spellings, fillers, lowercase)
    const formattedChunks = rawChunks.map((chunk, index) =>
      this.formatSingleChunk(chunk, index === 0, index === rawChunks.length - 1)
    );

    // Filter out empty chunks
    const result = formattedChunks.filter((c) => c.trim().length > 0);

    // Ensure at least one response exists
    return result.length > 0 ? result : [this.applyCasualSlang(cleaned)];
  }

  /**
   * Split raw text into natural chat bubble chunks
   */
  private splitIntoChunks(text: string): string[] {
    // First split by explicit line breaks or punctuation boundaries
    const rawSentences = text
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const resultChunks: string[] = [];

    for (const sentence of rawSentences) {
      const words = sentence.split(/\s+/);

      if (words.length <= this.config.maxChunkWords) {
        resultChunks.push(sentence);
      } else {
        // Split long sentences into smaller word chunks at natural clauses (comma, and, but, so)
        let current: string[] = [];
        for (const word of words) {
          current.push(word);
          if (
            current.length >= this.config.maxChunkWords ||
            (word.endsWith(',') && current.length >= 5)
          ) {
            resultChunks.push(current.join(' ').replace(/,$/, ''));
            current = [];
          }
        }
        if (current.length > 0) {
          resultChunks.push(current.join(' '));
        }
      }
    }

    return resultChunks;
  }

  /**
   * Format a single sentence chunk with casual slang, fillers, and 22yo girl tone
   */
  private formatSingleChunk(chunk: string, isFirst: boolean, isLast: boolean): string {
    let formatted = chunk.trim();

    // Remove trailing period for informal text vibe
    if (formatted.endsWith('.')) {
      formatted = formatted.slice(0, -1);
    }

    // Apply informal 22yo slang substitutions
    formatted = this.applyCasualSlang(formatted);

    // Optionally inject filler words ("omg", "haha", "wait", etc.)
    if (Math.random() < this.config.injectFillerChance || isFirst) {
      formatted = this.injectFillerWord(formatted, isFirst);
    }

    // Enforce casual lowercase or playful styling
    formatted = this.applyCasualTone(formatted);

    return formatted;
  }

  /**
   * Replace formal words with casual 22yo girl shorthand
   */
  private applyCasualSlang(text: string): string {
    let result = text;

    for (const [formal, casual] of Object.entries(NaturalLanguageFormatter.SLANG_MAP)) {
      const regex = new RegExp(`\\b${formal}\\b`, 'gi');
      result = result.replace(regex, casual);
    }

    return result;
  }

  /**
   * Inject human filler words naturally ("omg", "haha", "wait", "lol", "uhh", "mhm")
   */
  private injectFillerWord(text: string, isFirst: boolean): string {
    const fillers = this.config.fillerWords;
    const filler = fillers[Math.floor(Math.random() * fillers.length)];

    // If text already contains a filler, don't duplicate
    const lower = text.toLowerCase();
    if (fillers.some((f) => lower.includes(f))) {
      return text;
    }

    if (isFirst && Math.random() < 0.7) {
      // Prefix filler at start of message
      return `${filler} ${text}`;
    } else {
      // Append filler at end
      return `${text} ${filler}`;
    }
  }

  /**
   * Make text look casual (mostly lowercase, informal punctuation)
   */
  private applyCasualTone(text: string): string {
    // Mostly lowercase start of sentence for casual chat feel
    if (text.length > 0 && Math.random() < 0.8) {
      text = text.charAt(0).toLowerCase() + text.slice(1);
    }

    return text;
  }
}
