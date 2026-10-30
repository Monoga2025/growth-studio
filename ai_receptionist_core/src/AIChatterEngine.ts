import { MessageAggregator } from './MessageAggregator.js';
import { NaturalLanguageFormatter } from './NaturalLanguageFormatter.js';
import { MediaRouter } from './MediaRouter.js';
import { UserMemoryService } from './UserMemoryService.js';
import { MediaVaultIndexer } from './MediaVaultIndexer.js';
import {
  ChatterConfig,
  AggregatedBatch,
  ChatterResponse,
  MediaItem,
  ChatMessageRecord,
  UserMessage,
} from './types.js';

export class AIChatterEngine {
  public aggregator: MessageAggregator;
  public formatter: NaturalLanguageFormatter;
  public router: MediaRouter;
  public memory: UserMemoryService;
  public vault: MediaVaultIndexer;
  private config: Required<ChatterConfig>;

  constructor(config: ChatterConfig = {}) {
    this.config = {
      aggregatorWindowMs: config.aggregatorWindowMs ?? 3000,
      personaName: config.personaName || 'Chloe',
      age: config.age || 22,
      slangEnabled: config.slangEnabled ?? true,
      ppvThresholdScore: config.ppvThresholdScore ?? 60,
      mediaVaultPath: config.mediaVaultPath || 'C:\\Users\\Monoga\\Desktop\\only',
      memoryDbPath: config.memoryDbPath || ':memory:',
      vaultDbPath: config.vaultDbPath || ':memory:',
    };

    // Initialize sub-modules
    this.aggregator = new MessageAggregator(this.config.aggregatorWindowMs);
    this.formatter = new NaturalLanguageFormatter({
      injectFillerChance: 0.6,
      maxChunkWords: 10,
    });
    this.router = new MediaRouter();
    this.memory = new UserMemoryService(this.config.memoryDbPath);
    this.vault = new MediaVaultIndexer(this.config.mediaVaultPath, this.config.vaultDbPath);

    // Index vault on start
    this.vault.scanAndIndex();

    // Attach aggregator ready listener
    this.aggregator.onBatchReady(async (batch) => {
      await this.processBatch(batch);
    });
  }

  /**
   * Submit an incoming user message into the aggregator pipeline
   */
  public receiveUserMessage(
    userId: string,
    content: string,
    mediaType?: 'text' | 'image' | 'video' | 'voice_note',
    fileUrl?: string
  ): void {
    const userMsg: UserMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId,
      content,
      mediaType: mediaType || 'text',
      fileUrl,
      timestamp: Date.now(),
    };

    this.aggregator.addMessage(userMsg);
  }

  /**
   * Process an aggregated message batch end-to-end
   */
  public async processBatch(batch: AggregatedBatch): Promise<ChatterResponse> {
    const { userId, combinedText, primaryMediaType } = batch;

    // 1. Analyze Intent & Media type
    const intentAnalysis = this.router.classifyIntent(combinedText, primaryMediaType);

    // 2. Fetch User Profile & Memory
    const profile = this.memory.getUserProfile(userId);

    // 3. Dynamic Buying Intent Score Calculation
    let updatedScore = profile.buyingIntentScore;
    if (intentAnalysis.intent === 'high_intent') {
      updatedScore = Math.min(100, updatedScore + 20);
    } else if (intentAnalysis.intent === 'flirting') {
      updatedScore = Math.min(100, updatedScore + 10);
    } else if (intentAnalysis.intent === 'objection') {
      updatedScore = Math.max(10, updatedScore - 15);
    }
    this.memory.updateBuyingIntentScore(userId, updatedScore);

    // 4. Save User Batch to Memory History
    this.memory.addMessageToHistory({
      id: `user_batch_${Date.now()}`,
      userId,
      role: 'user',
      content: combinedText,
      mediaType: primaryMediaType,
      timestamp: batch.endTime,
    });

    // 5. Model Strategy & Response Generation
    let rawResponseText = '';
    let attachedMedia: MediaItem | undefined = undefined;
    let isPPVLocked = false;
    let price: number | undefined = undefined;

    if (intentAnalysis.intent === 'high_intent' || updatedScore >= this.config.ppvThresholdScore) {
      // High Intent / Excitación alta: Recommend PPV content from vault
      const recommendedMedia = this.vault.getRecommendedPPV(updatedScore, profile.unlockedMediaIds);
      if (recommendedMedia) {
        attachedMedia = recommendedMedia;
        isPPVLocked = recommendedMedia.isPPVLocked;
        price = recommendedMedia.price;

        if (recommendedMedia.mimeType.startsWith('video')) {
          rawResponseText = `omg you're gonna love this clip! i recorded it just for you in bed, unlock it to watch me babe...`;
        } else {
          rawResponseText = `wanna see what I'm wearing right now? unlock this spicy pic i just took babe ;)`;
        }
      } else {
        rawResponseText = `mhm you make me so hot babe... tell me what u wanna see next`;
      }
    } else if (intentAnalysis.intent === 'objection') {
      // Objection handling: Charm + soft offer
      rawResponseText = `aw don't be like that babe... i promise it's worth every penny! how about a special little preview?`;
      const teaserMedia = this.vault.getRecommendedPPV(40, profile.unlockedMediaIds);
      if (teaserMedia) {
        attachedMedia = teaserMedia;
        isPPVLocked = true;
        price = 15; // Discounted/teaser price for objection
      }
    } else if (intentAnalysis.intent === 'flirting') {
      // Flirting: Build intimacy
      rawResponseText = `haha u know exactly what to say to make me blush! you're so sweet babe...`;
      // 30% chance of attaching a free casual photo
      if (Math.random() < 0.4) {
        const casualMedia = this.vault.getFreeCasualMedia(profile.unlockedMediaIds);
        if (casualMedia) {
          attachedMedia = casualMedia;
          isPPVLocked = false;
        }
      }
    } else {
      // Casual chat
      rawResponseText = `hey babe! just relaxing in bed thinking about what to do today, how is your day going?`;
    }

    // 6. Format into natural 22yo girl chat bubbles (short separate messages)
    const formattedMessages = this.formatter.formatResponse(rawResponseText);

    // 7. Save Assistant Response to Memory History
    this.memory.addMessageToHistory({
      id: `ai_resp_${Date.now()}`,
      userId,
      role: 'assistant',
      content: formattedMessages.join(' | '),
      mediaType: attachedMedia ? (attachedMedia.mimeType.startsWith('video') ? 'video' : 'image') : 'text',
      isPPVLocked,
      price: price || 0,
      timestamp: Date.now(),
    });

    const response: ChatterResponse = {
      userId,
      messages: formattedMessages,
      attachedMedia,
      isPPVLocked,
      price,
      intent: intentAnalysis.intent,
      buyingIntentScore: updatedScore,
      timestamp: Date.now(),
    };

    return response;
  }

  /**
   * Process and flush immediately for a user (skips aggregation wait window)
   */
  public async forceFlushUser(userId: string): Promise<ChatterResponse | null> {
    const batch = await this.aggregator.flush(userId);
    if (!batch) return null;
    return await this.processBatch(batch);
  }

  /**
   * Simulate user unlocking/purchasing a PPV content item
   */
  public unlockPPV(userId: string, mediaId: string, price: number): void {
    this.memory.recordPurchase(userId, price, mediaId);
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    this.aggregator.stop();
    this.memory.close();
    this.vault.close();
  }
}
