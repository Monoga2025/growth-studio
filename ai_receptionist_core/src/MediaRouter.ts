import { MediaType, IntentType, IntentAnalysis, UserMessage } from './types.js';

export class MediaRouter {
  private static FLIRTING_KEYWORDS = [
    'hot',
    'sexy',
    'gorgeous',
    'cute',
    'love',
    'beautiful',
    'hottie',
    'sweetie',
    'babe',
    'miss u',
    'miss you',
    'kiss',
    'pretty',
    'handsome',
    'hug',
    'cutie',
    'adore',
    'stunning',
  ];

  private static HIGH_INTENT_KEYWORDS = [
    'buy',
    'pay',
    'price',
    'how much',
    'send pic',
    'send photo',
    'send video',
    'video',
    'naked',
    'nude',
    'unlock',
    'show me',
    'take off',
    'custom',
    'want to see',
    'wanna see',
    'exclusive',
    'preview',
    'ppv',
    'send content',
    'tipping',
    'tip',
    '$',
    'dollar',
    'dollars',
    'cost',
  ];

  private static OBJECTION_KEYWORDS = [
    'expensive',
    'too much',
    'high price',
    "can't afford",
    'cannot afford',
    'no money',
    'broke',
    'cheap',
    'scam',
    'fake',
    'real?',
    'is it really you',
    'are you real',
    'discount',
    'free',
    'later',
    'not now',
    'nah',
    'waste',
  ];

  private static CASUAL_KEYWORDS = [
    'hi',
    'hello',
    'hey',
    'how are u',
    'how r u',
    'how are you',
    'what are u doing',
    'wyd',
    'hbu',
    'good morning',
    'good night',
    'gm',
    'gn',
    'day',
    'weekend',
    'work',
    'weather',
    'cool',
    'nice',
  ];

  /**
   * Detect media type from message object or file extension / mime type
   */
  public detectMediaType(input: string | UserMessage): MediaType {
    if (typeof input === 'object' && input.mediaType) {
      return input.mediaType;
    }

    const pathOrUrl = typeof input === 'string' ? input : input.fileUrl || '';
    const lower = pathOrUrl.toLowerCase();

    if (/\.(jpg|jpeg|png|gif|webp)$/.test(lower)) {
      return 'image';
    }
    if (/\.(mp4|m4v|mov|avi|webm|mkv)$/.test(lower)) {
      return 'video';
    }
    if (/\.(mp3|wav|ogg|m4a|aac|opus)$/.test(lower) || lower.includes('voice')) {
      return 'voice_note';
    }

    return 'text';
  }

  /**
   * Classify user intent and calculate intent score (0-100)
   */
  public classifyIntent(text: string, mediaType: MediaType = 'text'): IntentAnalysis {
    const cleanText = text.toLowerCase().trim();
    const matchedKeywords: string[] = [];

    // Check Objections first
    const objectionMatches = this.findMatches(cleanText, MediaRouter.OBJECTION_KEYWORDS);
    if (objectionMatches.length > 0) {
      return {
        intent: 'objection',
        score: Math.max(15, 40 - objectionMatches.length * 10),
        keywords: objectionMatches,
        mediaType,
        description: 'User expressed objection, price concern, or authenticity doubt',
      };
    }

    // Check High Intent / Purchase & Excitement
    const highIntentMatches = this.findMatches(cleanText, MediaRouter.HIGH_INTENT_KEYWORDS);
    if (highIntentMatches.length > 0 || mediaType === 'voice_note') {
      matchedKeywords.push(...highIntentMatches);
      let score = 70 + highIntentMatches.length * 10;

      if (mediaType === 'image' || mediaType === 'video') score += 15;
      if (mediaType === 'voice_note') score += 20;

      return {
        intent: 'high_intent',
        score: Math.min(100, score),
        keywords: matchedKeywords,
        mediaType,
        description: 'High buying intent / excitement detected - ready for PPV proposal',
      };
    }

    // Check Flirting / Coqueteo
    const flirtingMatches = this.findMatches(cleanText, MediaRouter.FLIRTING_KEYWORDS);
    if (flirtingMatches.length > 0) {
      matchedKeywords.push(...flirtingMatches);
      let score = 50 + flirtingMatches.length * 10;

      if (mediaType === 'image' || mediaType === 'video') score += 10;

      return {
        intent: 'flirting',
        score: Math.min(85, score),
        keywords: matchedKeywords,
        mediaType,
        description: 'Flirting / coqueteo detected - nurture intimacy towards purchase',
      };
    }

    // Fallback: Casual Chat
    const casualMatches = this.findMatches(cleanText, MediaRouter.CASUAL_KEYWORDS);
    return {
      intent: 'casual_chat',
      score: 30 + casualMatches.length * 5,
      keywords: casualMatches,
      mediaType,
      description: 'Casual conversation / rapport building',
    };
  }

  private findMatches(text: string, keywordList: string[]): string[] {
    const matches: string[] = [];
    for (const kw of keywordList) {
      if (kw.includes(' ') || kw.length <= 2) {
        if (text.includes(kw)) {
          matches.push(kw);
        }
      } else {
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        if (regex.test(text)) {
          matches.push(kw);
        }
      }
    }
    return matches;
  }
}
