export * from './types.js';
export * from './MessageAggregator.js';
export * from './NaturalLanguageFormatter.js';
export * from './MediaRouter.js';
export * from './UserMemoryService.js';
export * from './MediaVaultIndexer.js';
export * from './AIChatterEngine.js';

import { AIChatterEngine } from './AIChatterEngine.js';

// Self-contained demo runner if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔥 Initializing 11_OFM_AI_CHATTER_ENGINE (chatter_core)...');
  const engine = new AIChatterEngine({
    aggregatorWindowMs: 2000,
    mediaVaultPath: 'C:\\Users\\Monoga\\Desktop\\only',
  });

  console.log('✅ Indexing media vault...');
  const mediaItems = engine.vault.getAllMedia();
  console.log(`📸 Indexed ${mediaItems.length} media items from real folder.`);

  const testUserId = 'user_demo_101';
  console.log(`\n💬 Simulating incoming user messages for user: ${testUserId}...`);

  engine.receiveUserMessage(testUserId, 'Hey cute girl!');
  engine.receiveUserMessage(testUserId, 'How are you doing today?');
  engine.receiveUserMessage(testUserId, 'I want to see your spicy video! How much?');

  console.log('⏳ Waiting for MessageAggregator window (2s)...');

  setTimeout(async () => {
    const response = await engine.forceFlushUser(testUserId);
    console.log('\n🤖 AI Response Output:');
    console.log(JSON.stringify(response, null, 2));

    engine.destroy();
    console.log('\n✨ Demo run complete!');
  }, 2200);
}
