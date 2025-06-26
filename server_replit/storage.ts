import {
  uploads,
  platformSettings,
  users,
  rssFeeds,
  rssEpisodes,
  type Upload,
  type InsertUpload,
  type PlatformSettings,
  type InsertPlatformSettings,
  type User,
  type UpsertUser,
  type RssFeed,
  type InsertRssFeed,
  type RssEpisode,
  type InsertRssEpisode,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Upload operations
  getUpload(id: number): Promise<Upload | undefined>;
  getAllUploads(): Promise<Upload[]>;
  getRecentUploads(limit?: number): Promise<Upload[]>;
  createUpload(upload: InsertUpload): Promise<Upload>;
  updateUpload(id: number, updates: Partial<Upload>): Promise<Upload | undefined>;
  deleteUpload(id: number): Promise<boolean>;
  
  // Platform settings operations
  getPlatformSettings(platform: string): Promise<PlatformSettings | undefined>;
  getAllPlatformSettings(): Promise<PlatformSettings[]>;
  createPlatformSettings(settings: InsertPlatformSettings): Promise<PlatformSettings>;
  updatePlatformSettings(platform: string, updates: Partial<PlatformSettings>): Promise<PlatformSettings | undefined>;
  
  // RSS Feed operations
  getRssFeed(id: number): Promise<RssFeed | undefined>;
  getAllRssFeeds(): Promise<RssFeed[]>;
  createRssFeed(feed: InsertRssFeed): Promise<RssFeed>;
  updateRssFeed(id: number, updates: Partial<RssFeed>): Promise<RssFeed | undefined>;
  deleteRssFeed(id: number): Promise<boolean>;
  
  // RSS Episode operations
  getRssEpisode(id: number): Promise<RssEpisode | undefined>;
  getRssEpisodesByFeed(feedId: number): Promise<RssEpisode[]>;
  getRssEpisodeGuids(feedId: number): Promise<string[]>;
  getDownloadedEpisodes(): Promise<RssEpisode[]>;
  createRssEpisode(episode: InsertRssEpisode): Promise<RssEpisode>;
  updateRssEpisode(id: number, updates: Partial<RssEpisode>): Promise<RssEpisode | undefined>;
  deleteRssEpisode(id: number): Promise<boolean>;

  // Statistics
  getUploadStats(): Promise<{
    monthlyUploads: number;
    successRate: number;
    processing: number;
    errors: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (required for auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUpload(id: number): Promise<Upload | undefined> {
    const [upload] = await db.select().from(uploads).where(eq(uploads.id, id));
    return upload;
  }

  async getAllUploads(): Promise<Upload[]> {
    return await db.select().from(uploads).orderBy(desc(uploads.createdAt));
  }

  async getRecentUploads(limit: number = 10): Promise<Upload[]> {
    return await db.select().from(uploads).orderBy(desc(uploads.createdAt)).limit(limit);
  }

  async createUpload(insertUpload: InsertUpload): Promise<Upload> {
    const [upload] = await db.insert(uploads).values(insertUpload).returning();
    return upload;
  }

  async updateUpload(id: number, updates: Partial<Upload>): Promise<Upload | undefined> {
    const [upload] = await db
      .update(uploads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(uploads.id, id))
      .returning();
    return upload;
  }

  async deleteUpload(id: number): Promise<boolean> {
    const result = await db.delete(uploads).where(eq(uploads.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getPlatformSettings(platform: string): Promise<PlatformSettings | undefined> {
    const [settings] = await db
      .select()
      .from(platformSettings)
      .where(eq(platformSettings.platform, platform));
    return settings;
  }

  async getAllPlatformSettings(): Promise<PlatformSettings[]> {
    return await db.select().from(platformSettings);
  }

  async createPlatformSettings(insertSettings: InsertPlatformSettings): Promise<PlatformSettings> {
    const [settings] = await db
      .insert(platformSettings)
      .values(insertSettings)
      .returning();
    return settings;
  }

  async updatePlatformSettings(platform: string, updates: Partial<PlatformSettings>): Promise<PlatformSettings | undefined> {
    const [settings] = await db
      .update(platformSettings)
      .set(updates)
      .where(eq(platformSettings.platform, platform))
      .returning();
    return settings;
  }

  async getUploadStats(): Promise<{
    monthlyUploads: number;
    successRate: number;
    processing: number;
    errors: number;
  }> {
    const allUploads = await this.getAllUploads();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthlyUploads = allUploads.filter(upload => 
      new Date(upload.createdAt) >= monthStart
    ).length;

    const completed = allUploads.filter(upload => upload.status === "completed").length;
    const failed = allUploads.filter(upload => upload.status === "failed").length;
    const processing = allUploads.filter(upload => upload.status === "processing").length;
    
    const successRate = allUploads.length > 0 ? (completed / allUploads.length) * 100 : 0;

    return {
      monthlyUploads,
      successRate: Number(successRate.toFixed(1)),
      processing,
      errors: failed,
    };
  }

  // RSS Feed operations
  async getRssFeed(id: number): Promise<RssFeed | undefined> {
    const [feed] = await db.select().from(rssFeeds).where(eq(rssFeeds.id, id));
    return feed;
  }

  async getAllRssFeeds(): Promise<RssFeed[]> {
    return await db.select().from(rssFeeds).orderBy(desc(rssFeeds.createdAt));
  }

  async createRssFeed(feedData: InsertRssFeed): Promise<RssFeed> {
    const [feed] = await db.insert(rssFeeds).values(feedData).returning();
    return feed;
  }

  async updateRssFeed(id: number, updates: Partial<RssFeed>): Promise<RssFeed | undefined> {
    const [feed] = await db
      .update(rssFeeds)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rssFeeds.id, id))
      .returning();
    return feed;
  }

  async deleteRssFeed(id: number): Promise<boolean> {
    const result = await db.delete(rssFeeds).where(eq(rssFeeds.id, id));
    return (result.rowCount || 0) > 0;
  }

  // RSS Episode operations
  async getRssEpisode(id: number): Promise<RssEpisode | undefined> {
    const [episode] = await db.select().from(rssEpisodes).where(eq(rssEpisodes.id, id));
    return episode;
  }

  async getRssEpisodesByFeed(feedId: number): Promise<RssEpisode[]> {
    return await db
      .select()
      .from(rssEpisodes)
      .where(eq(rssEpisodes.feedId, feedId))
      .orderBy(desc(rssEpisodes.pubDate));
  }

  async getRssEpisodeGuids(feedId: number): Promise<string[]> {
    const episodes = await db
      .select({ guid: rssEpisodes.guid })
      .from(rssEpisodes)
      .where(eq(rssEpisodes.feedId, feedId));
    return episodes.map(e => e.guid);
  }

  async getDownloadedEpisodes(): Promise<RssEpisode[]> {
    return await db
      .select()
      .from(rssEpisodes)
      .where(eq(rssEpisodes.downloadStatus, 'completed'))
      .orderBy(desc(rssEpisodes.pubDate));
  }

  async createRssEpisode(episodeData: InsertRssEpisode): Promise<RssEpisode> {
    const [episode] = await db.insert(rssEpisodes).values(episodeData).returning();
    return episode;
  }

  async updateRssEpisode(id: number, updates: Partial<RssEpisode>): Promise<RssEpisode | undefined> {
    const [episode] = await db
      .update(rssEpisodes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rssEpisodes.id, id))
      .returning();
    return episode;
  }

  async deleteRssEpisode(id: number): Promise<boolean> {
    const result = await db.delete(rssEpisodes).where(eq(rssEpisodes.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();