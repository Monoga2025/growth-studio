export type MediaType = 'text' | 'image' | 'video' | 'voice_note';

export type IntentType = 'flirting' | 'casual_chat' | 'high_intent' | 'objection';

export interface UserMessage {
  id: string;
  userId: string;
  content: string;
  mediaType?: MediaType;
  fileUrl?: string;
  timestamp: number;
}

export interface AggregatedBatch {
  userId: string;
  messages: UserMessage[];
  combinedText: string;
  primaryMediaType: MediaType;
  startTime: number;
  endTime: number;
}

export interface IntentAnalysis {
  intent: IntentType;
  score: number; // 0 to 100
  keywords: string[];
  mediaType: MediaType;
  description: string;
}

export interface UserProfile {
  userId: string;
  name?: string;
  totalSpend: number;
  buyingIntentScore: number; // 0 to 100
  sentiment: string;
  preferences: string[];
  unlockedMediaIds: string[];
  lastActive: number;
}

export interface ChatMessageRecord {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  mediaType?: MediaType;
  isPPVLocked?: boolean;
  price?: number;
  timestamp: number;
}

export type TagCategory = 'casual' | 'spicy' | 'bedroom' | 'video_clip' | 'ppv_locked' | 'good_morning' | 'lingerie' | 'tease';

export interface MediaItem {
  id: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  tags: string[];
  isPPVLocked: boolean;
  priceTier: 1 | 2 | 3; // Tier 1: $10-20, Tier 2: $25-45, Tier 3: $50+
  price: number;
  width?: number;
  height?: number;
  duration?: number;
  sizeBytes: number;
  scannedAt: number;
}

export interface FormatterConfig {
  fillerWords?: string[];
  injectFillerChance?: number; // 0.0 to 1.0
  maxChunkWords?: number;
  casualTypoChance?: number;
}

export interface ChatterConfig {
  aggregatorWindowMs?: number; // Default: 3000ms (2-4s)
  personaName?: string; // Default: "Chloe"
  age?: number; // Default: 22
  slangEnabled?: boolean;
  ppvThresholdScore?: number; // Default: 60
  mediaVaultPath?: string; // Default: 'C:\\Users\\Monoga\\Desktop\\only'
  memoryDbPath?: string; // Default: SQLite in-memory or chatter_memory.db
  vaultDbPath?: string; // Default: media_vault.db
}

export interface ChatterResponse {
  userId: string;
  messages: string[];
  attachedMedia?: MediaItem;
  isPPVLocked: boolean;
  price?: number;
  intent: IntentType;
  buyingIntentScore: number;
  timestamp: number;
}
