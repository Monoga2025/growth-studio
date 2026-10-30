import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MediaVaultIndexer } from '../src/MediaVaultIndexer.js';

describe('MediaVaultIndexer', () => {
  let vault: MediaVaultIndexer;

  beforeEach(() => {
    // Index real folder at C:\Users\Monoga\Desktop\only
    vault = new MediaVaultIndexer('C:\\Users\\Monoga\\Desktop\\only', ':memory:');
  });

  afterEach(() => {
    vault.close();
  });

  it('should scan real folder and index ~50 media items', () => {
    const items = vault.scanAndIndex();

    expect(items.length).toBeGreaterThanOrEqual(40);
    expect(items.some((i) => i.mimeType === 'image/jpeg')).toBe(true);
    expect(items.some((i) => i.mimeType === 'video/mp4' || i.mimeType === 'video/x-m4v')).toBe(true);
  });

  it('should categorize videos with spicy, video_clip, ppv_locked tags', () => {
    vault.scanAndIndex();
    const all = vault.getAllMedia();

    const videoItem = all.find((i) => i.mimeType.startsWith('video/'));
    expect(videoItem).toBeDefined();
    expect(videoItem?.isPPVLocked).toBe(true);
    expect(videoItem?.tags).toContain('video_clip');
    expect(videoItem?.tags).toContain('spicy');
  });

  it('should return recommended PPV media based on intent score', () => {
    vault.scanAndIndex();

    const highTierPPV = vault.getRecommendedPPV(90); // High score -> tier 3 ($50+)
    expect(highTierPPV).not.toBeNull();
    expect(highTierPPV?.isPPVLocked).toBe(true);

    const lowTierPPV = vault.getRecommendedPPV(30); // Low score -> tier 1
    expect(lowTierPPV).not.toBeNull();
    expect(lowTierPPV?.isPPVLocked).toBe(true);
  });
});
