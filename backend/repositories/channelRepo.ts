import path from "path";
import fs from "fs";
import { BaseRepository } from "./baseRepository";

export interface ChannelPermissionOverride {
  roleId: string;
  allow: string[];
  deny: string[];
}

export interface Channel {
  id: string;
  serverId: string;
  categoryId: string;
  name: string;
  type: "text" | "study-tool" | "announcement";
  toolType?: "deep-dive" | "flashcards" | "mind-map" | "notes" | "quiz" | "sprint";
  lessonId?: string;
  lessonTitle?: string;
  permissionOverrides: ChannelPermissionOverride[];
  pinnedMessageIds: string[];
  lastMessageAt: string;
  createdAt: string;
}

const CHANNELS_DIR = path.join(__dirname, "..", "data", "channels");

class ChannelRepository {
  // Global index: channelId -> serverId for O(1) global lookups
  private globalIndex = new Map<string, string>();
  private indexBuilt = false;

  private getFilePath(serverId: string): string {
    return path.join(CHANNELS_DIR, `${serverId}.json`);
  }

  private getRepo(serverId: string): BaseRepository<Channel> {
    return new BaseRepository<Channel>(this.getFilePath(serverId));
  }

  /** Build the global channel->server index (lazy, one-time) */
  private buildGlobalIndex(): void {
    if (this.indexBuilt) return;
    if (!fs.existsSync(CHANNELS_DIR)) { this.indexBuilt = true; return; }
    const files = fs.readdirSync(CHANNELS_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const serverId = file.replace(".json", "");
      const repo = this.getRepo(serverId);
      const channels = (repo as any).readAll() as Channel[];
      for (const ch of channels) {
        this.globalIndex.set(ch.id, serverId);
      }
    }
    this.indexBuilt = true;
  }

  async findAllByServer(serverId: string): Promise<Channel[]> {
    return this.getRepo(serverId).findAll();
  }

  async findById(serverId: string, channelId: string): Promise<Channel | null> {
    return this.getRepo(serverId).findById(channelId);
  }

  async findByIdGlobal(channelId: string): Promise<Channel | null> {
    // O(1) lookup via global index
    this.buildGlobalIndex();
    const serverId = this.globalIndex.get(channelId);
    if (serverId) {
      const channel = await this.getRepo(serverId).findById(channelId);
      if (channel) return channel;
    }
    // Fallback: full scan if index is stale (shouldn't happen often)
    if (!fs.existsSync(CHANNELS_DIR)) return null;
    const files = fs.readdirSync(CHANNELS_DIR).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const sid = file.replace(".json", "");
      const channel = await this.getRepo(sid).findById(channelId);
      if (channel) {
        this.globalIndex.set(channelId, sid); // Update index
        return channel;
      }
    }
    return null;
  }

  async create(channel: Channel): Promise<Channel> {
    const result = await this.getRepo(channel.serverId).create(channel);
    this.globalIndex.set(channel.id, channel.serverId); // Update index
    return result;
  }

  async update(serverId: string, channelId: string, updates: Partial<Channel>): Promise<Channel | null> {
    return this.getRepo(serverId).update(channelId, updates);
  }

  async delete(serverId: string, channelId: string): Promise<boolean> {
    const result = await this.getRepo(serverId).delete(channelId);
    if (result) this.globalIndex.delete(channelId); // Update index
    return result;
  }

  async deleteAllByServer(serverId: string): Promise<void> {
    // Remove all channels for this server from global index
    for (const [chId, sId] of this.globalIndex) {
      if (sId === serverId) this.globalIndex.delete(chId);
    }
    const filePath = this.getFilePath(serverId);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async findByCategory(serverId: string, categoryId: string): Promise<Channel[]> {
    const repo = this.getRepo(serverId);
    return repo.findBy((c) => c.categoryId === categoryId);
  }
}

export const channelRepo = new ChannelRepository();
