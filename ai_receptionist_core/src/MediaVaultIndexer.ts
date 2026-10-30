import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
import { MediaItem, TagCategory } from './types.js';

export class MediaVaultIndexer {
  private folderPath: string;
  private db: any;

  constructor(
    folderPath: string = 'C:\\Users\\Monoga\\Desktop\\only',
    dbPath: string = ':memory:'
  ) {
    this.folderPath = folderPath;
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  private initTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        file_path TEXT UNIQUE NOT NULL,
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        tags_json TEXT NOT NULL,
        is_ppv_locked INTEGER NOT NULL,
        price_tier INTEGER NOT NULL,
        price REAL NOT NULL,
        width INTEGER,
        height INTEGER,
        duration INTEGER,
        size_bytes INTEGER NOT NULL,
        scanned_at INTEGER NOT NULL
      );
    `);

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_media_ppv ON media_items(is_ppv_locked, price_tier);
    `);
  }

  /**
   * Scan folder and index all JPG, MP4, M4V files into media_vault.db
   */
  public scanAndIndex(): MediaItem[] {
    if (!fs.existsSync(this.folderPath)) {
      console.warn(`Media directory not found at: ${this.folderPath}`);
      return [];
    }

    const files = fs.readdirSync(this.folderPath);
    const mediaFiles = files.filter((f) =>
      /\.(jpg|jpeg|png|mp4|m4v|mov|webp)$/i.test(f)
    );

    const stmt = this.db.prepare(`
      INSERT INTO media_items (id, file_path, file_name, mime_type, tags_json, is_ppv_locked, price_tier, price, width, height, duration, size_bytes, scanned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(file_path) DO UPDATE SET
        tags_json = excluded.tags_json,
        is_ppv_locked = excluded.is_ppv_locked,
        price_tier = excluded.price_tier,
        price = excluded.price,
        size_bytes = excluded.size_bytes,
        scanned_at = excluded.scanned_at;
    `);

    const items: MediaItem[] = [];

    for (const fileName of mediaFiles) {
      const filePath = path.join(this.folderPath, fileName);
      const stats = fs.statSync(filePath);
      const ext = path.extname(fileName).toLowerCase();

      const mimeType = this.getMimeType(ext);
      const { tags, isPPVLocked, priceTier, price } = this.categorizeMedia(fileName, ext, stats.size);

      const id = `media_${crypto.createHash('md5').update(filePath).digest('hex').slice(0, 16)}`;
      const scannedAt = Date.now();

      stmt.run(
        id,
        filePath,
        fileName,
        mimeType,
        JSON.stringify(tags),
        isPPVLocked ? 1 : 0,
        priceTier,
        price,
        null, // width (can be extended with metadata parser)
        null, // height
        null, // duration
        stats.size,
        scannedAt
      );

      items.push({
        id,
        filePath,
        fileName,
        mimeType,
        tags,
        isPPVLocked,
        priceTier,
        price,
        sizeBytes: stats.size,
        scannedAt,
      });
    }

    return items;
  }

  /**
   * Determine MIME type based on file extension
   */
  private getMimeType(ext: string): string {
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.png':
        return 'image/png';
      case '.webp':
        return 'image/webp';
      case '.mp4':
        return 'video/mp4';
      case '.m4v':
        return 'video/x-m4v';
      case '.mov':
        return 'video/quicktime';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Categorize media by tags ('casual', 'spicy', 'bedroom', 'video_clip', 'ppv_locked', 'price_tier')
   */
  private categorizeMedia(
    fileName: string,
    ext: string,
    sizeBytes: number
  ): { tags: string[]; isPPVLocked: boolean; priceTier: 1 | 2 | 3; price: number } {
    const tags: string[] = [];
    const isVideo = ext === '.mp4' || ext === '.m4v' || ext === '.mov';

    // Extract index number from filename (e.g. "srpacks (5).mp4" -> 5)
    const numMatch = fileName.match(/\((\d+)\)/);
    const indexNum = numMatch ? parseInt(numMatch[1], 10) : 0;

    let isPPVLocked = false;
    let priceTier: 1 | 2 | 3 = 1;
    let price = 15;

    if (isVideo) {
      tags.push('video_clip', 'spicy', 'bedroom');
      isPPVLocked = true;

      if (sizeBytes > 20 * 1024 * 1024) {
        // High quality full video (>20MB)
        priceTier = 3;
        price = 55;
        tags.push('ppv_locked', 'exclusive');
      } else {
        priceTier = 2;
        price = 35;
        tags.push('ppv_locked');
      }
    } else {
      // Photo categorization
      tags.push('bedroom');

      if (indexNum % 3 === 0) {
        tags.push('spicy', 'ppv_locked', 'lingerie');
        isPPVLocked = true;
        priceTier = 2;
        price = 25;
      } else if (indexNum % 5 === 0) {
        tags.push('spicy', 'ppv_locked', 'tease');
        isPPVLocked = true;
        priceTier = 1;
        price = 15;
      } else {
        tags.push('casual', 'good_morning');
        isPPVLocked = false;
        priceTier = 1;
        price = 0;
      }
    }

    return { tags, isPPVLocked, priceTier, price };
  }

  /**
   * Get all indexed media items
   */
  public getAllMedia(): MediaItem[] {
    const stmt = this.db.prepare(`SELECT * FROM media_items ORDER BY price_tier DESC, file_name ASC`);
    const rows = stmt.all() as any[];

    return rows.map((r) => this.mapRowToMediaItem(r));
  }

  /**
   * Query media items by matching tags
   */
  public getMediaByTags(requiredTags: TagCategory[]): MediaItem[] {
    const all = this.getAllMedia();
    return all.filter((item) =>
      requiredTags.every((t) => item.tags.includes(t))
    );
  }

  /**
   * Select recommended PPV media based on user's buying intent score
   */
  public getRecommendedPPV(buyingScore: number, excludedIds: string[] = []): MediaItem | null {
    const all = this.getAllMedia();
    const availablePPV = all.filter(
      (item) => item.isPPVLocked && !excludedIds.includes(item.id)
    );

    if (availablePPV.length === 0) {
      return null;
    }

    // Match tier according to buying score
    let targetTier: 1 | 2 | 3 = 1;
    if (buyingScore >= 80) targetTier = 3; // High intent -> $55 video
    else if (buyingScore >= 60) targetTier = 2; // Mid intent -> $25-35 content
    else targetTier = 1; // Low intent -> $15 teaser

    const targetTierItems = availablePPV.filter((i) => i.priceTier === targetTier);

    if (targetTierItems.length > 0) {
      return targetTierItems[Math.floor(Math.random() * targetTierItems.length)];
    }

    // Fallback to any available PPV
    return availablePPV[Math.floor(Math.random() * availablePPV.length)];
  }

  /**
   * Get a free casual teaser image for rapport building
   */
  public getFreeCasualMedia(excludedIds: string[] = []): MediaItem | null {
    const all = this.getAllMedia();
    const casual = all.filter((item) => !item.isPPVLocked && !excludedIds.includes(item.id));
    if (casual.length === 0) return null;
    return casual[Math.floor(Math.random() * casual.length)];
  }

  private mapRowToMediaItem(r: any): MediaItem {
    return {
      id: r.id,
      filePath: r.file_path,
      fileName: r.file_name,
      mimeType: r.mime_type,
      tags: JSON.parse(r.tags_json || '[]'),
      isPPVLocked: Boolean(r.is_ppv_locked),
      priceTier: r.price_tier as 1 | 2 | 3,
      price: r.price,
      width: r.width || undefined,
      height: r.height || undefined,
      duration: r.duration || undefined,
      sizeBytes: r.size_bytes,
      scannedAt: r.scanned_at,
    };
  }

  public close(): void {
    this.db.close();
  }
}
