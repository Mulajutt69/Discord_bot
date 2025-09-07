import sqlite3 from 'sqlite3';
import { promisify } from 'util';

export class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database('./bot_data.db', (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('📊 Database connected');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const queries = [
      `CREATE TABLE IF NOT EXISTS servers (
        id TEXT PRIMARY KEY,
        name TEXT,
        config TEXT,
        stats TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS user_profiles (
        server_id TEXT,
        user_id TEXT,
        profile_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (server_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT,
        user_id TEXT,
        user_message TEXT,
        bot_response TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS server_trends (
        server_id TEXT PRIMARY KEY,
        trends_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS project_profiles (
        server_id TEXT PRIMARY KEY,
        project_name TEXT,
        project_type TEXT,
        token_symbol TEXT,
        profile_data TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS crypto_insights (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        insight_type TEXT,
        data TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of queries) {
      await this.run(query);
    }

    console.log('📋 Database tables created/verified');
  }

  async run(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(query, params, function(err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }

  async get(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(query, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(query, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async getServerData(serverId) {
    const row = await this.get('SELECT stats FROM servers WHERE id = ?', [serverId]);
    return row ? JSON.parse(row.stats) : null;
  }

  async updateServerStats(serverId, stats) {
    await this.run(
      'INSERT OR REPLACE INTO servers (id, stats) VALUES (?, ?)',
      [serverId, JSON.stringify(stats)]
    );
  }

  async updateUserProfile(serverId, userId, profile) {
    const profileData = {
      ...profile,
      topics: Array.from(profile.topics) // Convert Set to Array for JSON
    };

    await this.run(
      'INSERT OR REPLACE INTO user_profiles (server_id, user_id, profile_data) VALUES (?, ?, ?)',
      [serverId, userId, JSON.stringify(profileData)]
    );
  }

  async getUserProfile(serverId, userId) {
    const row = await this.get(
      'SELECT profile_data FROM user_profiles WHERE server_id = ? AND user_id = ?',
      [serverId, userId]
    );
    
    if (row) {
      const profile = JSON.parse(row.profile_data);
      profile.topics = new Set(profile.topics); // Convert Array back to Set
      return profile;
    }
    
    return null;
  }

  async logInteraction(serverId, userId, userMessage, botResponse) {
    await this.run(
      'INSERT INTO interactions (server_id, user_id, user_message, bot_response) VALUES (?, ?, ?, ?)',
      [serverId, userId, userMessage, botResponse]
    );
  }

  async updateServerTrends(serverId, trends) {
    const trendsData = {
      activeTopics: Object.fromEntries(trends.activeTopics),
      commonPhrases: Object.fromEntries(trends.commonPhrases),
      activityLevel: trends.activityLevel
    };

    await this.run(
      'INSERT OR REPLACE INTO server_trends (server_id, trends_data) VALUES (?, ?)',
      [serverId, JSON.stringify(trendsData)]
    );
  }

  async getInteractionHistory(serverId, limit = 100) {
    return await this.all(
      'SELECT * FROM interactions WHERE server_id = ? ORDER BY timestamp DESC LIMIT ?',
      [serverId, limit]
    );
  }

  async getServerStats() {
    const servers = await this.all('SELECT * FROM servers');
    const interactions = await this.all('SELECT COUNT(*) as count FROM interactions');
    const users = await this.all('SELECT COUNT(DISTINCT user_id) as count FROM user_profiles');

    return {
      totalServers: servers.length,
      totalInteractions: interactions[0].count,
      totalUsers: users[0].count,
      servers: servers.map(s => ({
        id: s.id,
        name: s.name,
        stats: s.stats ? JSON.parse(s.stats) : {}
      }))
    };
  }

  async storeMessage(serverId, userId, content) {
    // Store recent messages for context (optional)
    await this.run(
      'INSERT INTO interactions (server_id, user_id, user_message, bot_response) VALUES (?, ?, ?, ?)',
      [serverId, userId, content, null]
    );
  }

  async storeProjectProfile(serverId, profile) {
    const profileData = {
      ...profile,
      teamMembers: Array.from(profile.teamMembers)
    };

    await this.run(
      'INSERT OR REPLACE INTO project_profiles (server_id, project_name, project_type, token_symbol, profile_data) VALUES (?, ?, ?, ?, ?)',
      [serverId, profile.projectName, profile.projectType, profile.tokenSymbol, JSON.stringify(profileData)]
    );
  }

  async getProjectProfile(serverId) {
    const row = await this.get(
      'SELECT profile_data FROM project_profiles WHERE server_id = ?',
      [serverId]
    );
    
    if (row) {
      const profile = JSON.parse(row.profile_data);
      profile.teamMembers = new Set(profile.teamMembers);
      return profile;
    }
    
    return null;
  }

  async storeCryptoInsight(insightType, data) {
    await this.run(
      'INSERT INTO crypto_insights (insight_type, data) VALUES (?, ?)',
      [insightType, JSON.stringify(data)]
    );
  }

  async getCryptoInsights(limit = 100) {
    return await this.all(
      'SELECT * FROM crypto_insights ORDER BY timestamp DESC LIMIT ?',
      [limit]
    );
  }
}