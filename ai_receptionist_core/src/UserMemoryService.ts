import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { DatabaseSync } = require('node:sqlite');
import { UserProfile, ChatMessageRecord } from './types.js';

export class UserMemoryService {
  private db: any;

  constructor(dbPath: string = ':memory:') {
    this.db = new DatabaseSync(dbPath);
    this.initTables();
  }

  private initTables(): void {
    // Enable pragmas
    this.db.exec('PRAGMA foreign_keys = ON;');

    // Table: user_profiles
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        name TEXT,
        total_spend REAL DEFAULT 0,
        buying_intent_score INTEGER DEFAULT 30,
        sentiment TEXT DEFAULT 'neutral',
        preferences_json TEXT DEFAULT '[]',
        unlocked_media_ids_json TEXT DEFAULT '[]',
        last_active INTEGER
      );
    `);

    // Table: chat_history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        media_type TEXT,
        is_ppv_locked INTEGER DEFAULT 0,
        price REAL DEFAULT 0,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY(user_id) REFERENCES user_profiles(user_id)
      );
    `);

    // Index on user_id + timestamp
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_history_user_time ON chat_history(user_id, timestamp);
    `);
  }

  /**
   * Fetch or create user profile
   */
  public getUserProfile(userId: string): UserProfile {
    const stmt = this.db.prepare(`
      SELECT user_id, name, total_spend, buying_intent_score, sentiment, preferences_json, unlocked_media_ids_json, last_active
      FROM user_profiles WHERE user_id = ?
    `);

    const row = stmt.get(userId) as any;

    if (!row) {
      const newProfile: UserProfile = {
        userId,
        name: undefined,
        totalSpend: 0,
        buyingIntentScore: 30,
        sentiment: 'neutral',
        preferences: [],
        unlockedMediaIds: [],
        lastActive: Date.now(),
      };
      this.saveUserProfile(newProfile);
      return newProfile;
    }

    return {
      userId: row.user_id,
      name: row.name || undefined,
      totalSpend: row.total_spend || 0,
      buyingIntentScore: row.buying_intent_score ?? 30,
      sentiment: row.sentiment || 'neutral',
      preferences: JSON.parse(row.preferences_json || '[]'),
      unlockedMediaIds: JSON.parse(row.unlocked_media_ids_json || '[]'),
      lastActive: row.last_active || Date.now(),
    };
  }

  /**
   * Save or update full user profile
   */
  public saveUserProfile(profile: UserProfile): void {
    const stmt = this.db.prepare(`
      INSERT INTO user_profiles (user_id, name, total_spend, buying_intent_score, sentiment, preferences_json, unlocked_media_ids_json, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        name = excluded.name,
        total_spend = excluded.total_spend,
        buying_intent_score = excluded.buying_intent_score,
        sentiment = excluded.sentiment,
        preferences_json = excluded.preferences_json,
        unlocked_media_ids_json = excluded.unlocked_media_ids_json,
        last_active = excluded.last_active;
    `);

    stmt.run(
      profile.userId,
      profile.name || null,
      profile.totalSpend,
      profile.buyingIntentScore,
      profile.sentiment,
      JSON.stringify(profile.preferences),
      JSON.stringify(profile.unlockedMediaIds),
      profile.lastActive || Date.now()
    );
  }

  /**
   * Update user buying intent score dynamically
   */
  public updateBuyingIntentScore(userId: string, newScore: number): number {
    const clampedScore = Math.max(0, Math.min(100, Math.round(newScore)));
    const profile = this.getUserProfile(userId);
    profile.buyingIntentScore = clampedScore;
    profile.lastActive = Date.now();
    this.saveUserProfile(profile);
    return clampedScore;
  }

  /**
   * Add a chat message record to user history
   */
  public addMessageToHistory(record: ChatMessageRecord): void {
    // Ensure profile exists first
    this.getUserProfile(record.userId);

    const stmt = this.db.prepare(`
      INSERT INTO chat_history (id, user_id, role, content, media_type, is_ppv_locked, price, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      record.id,
      record.userId,
      record.role,
      record.content,
      record.mediaType || null,
      record.isPPVLocked ? 1 : 0,
      record.price || 0,
      record.timestamp || Date.now()
    );

    // Update last_active
    const updateStmt = this.db.prepare(`UPDATE user_profiles SET last_active = ? WHERE user_id = ?`);
    updateStmt.run(Date.now(), record.userId);
  }

  /**
   * Retrieve conversation history for a user
   */
  public getHistory(userId: string, limit: number = 20): ChatMessageRecord[] {
    const stmt = this.db.prepare(`
      SELECT id, user_id, role, content, media_type, is_ppv_locked, price, timestamp
      FROM chat_history
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const rows = stmt.all(userId, limit) as any[];

    const result: ChatMessageRecord[] = rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      role: r.role as 'user' | 'assistant',
      content: r.content,
      mediaType: r.media_type || undefined,
      isPPVLocked: Boolean(r.is_ppv_locked),
      price: r.price || 0,
      timestamp: r.timestamp,
    }));

    return result.reverse(); // Return in chronological order
  }

  /**
   * Record a purchase transaction (unlocking PPV content)
   */
  public recordPurchase(userId: string, amount: number, mediaId: string): void {
    const profile = this.getUserProfile(userId);
    profile.totalSpend += amount;
    if (!profile.unlockedMediaIds.includes(mediaId)) {
      profile.unlockedMediaIds.push(mediaId);
    }
    // Purchasing boosts buying intent score!
    profile.buyingIntentScore = Math.min(100, profile.buyingIntentScore + 25);
    profile.lastActive = Date.now();
    this.saveUserProfile(profile);
  }

  /**
   * Close SQLite connection
   */
  public close(): void {
    this.db.close();
  }
}
