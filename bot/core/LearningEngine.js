export class LearningEngine {
  constructor(database) {
    this.database = database;
    this.userProfiles = new Map();
    this.serverTrends = new Map();
  }

  async processMessage(message, serverConfig, projectProfile) {
    const userId = message.author.id;
    const serverId = message.guild.id;
    const content = message.content.toLowerCase();

    // Analyze user communication style
    await this.analyzeUserStyle(userId, serverId, content, projectProfile);
    
    // Track server trends
    await this.trackServerTrends(serverId, content, projectProfile);
    
    // Store message for context
    await this.database.storeMessage(serverId, userId, message.content);
  }

  async analyzeUserStyle(userId, serverId, content, projectProfile) {
    const profileKey = `${serverId}-${userId}`;
    
    if (!this.userProfiles.has(profileKey)) {
      this.userProfiles.set(profileKey, {
        communicationStyle: 'neutral',
        topics: new Set(),
        messageCount: 0,
        cryptoKnowledge: 'beginner',
        lastSeen: Date.now()
      });
    }

    const profile = this.userProfiles.get(profileKey);
    profile.messageCount++;
    profile.lastSeen = Date.now();

    // Analyze crypto knowledge level
    const cryptoTerms = ['defi', 'yield', 'staking', 'tokenomics', 'dex', 'cex', 'liquidity', 'mcap'];
    const cryptoCount = cryptoTerms.filter(term => content.includes(term)).length;
    
    if (cryptoCount >= 3) {
      profile.cryptoKnowledge = 'advanced';
    } else if (cryptoCount >= 1) {
      profile.cryptoKnowledge = 'intermediate';
    }

    // Analyze communication style
    if (content.includes('!') || content.includes('🚀') || content.includes('🔥')) {
      profile.communicationStyle = 'excited';
    } else if (content.includes('?') || content.includes('wonder') || content.includes('think')) {
      profile.communicationStyle = 'inquiring';
    } else if (content.includes('sad') || content.includes('angry')) {
      profile.communicationStyle = 'upset';
    }

    // Extract topics
    const topics = this.extractTopics(content, projectProfile);
    topics.forEach(topic => profile.topics.add(topic));

    // Save to database
    await this.database.updateUserProfile(serverId, userId, profile);
  }

  async trackServerTrends(serverId, content, projectProfile) {
    if (!this.serverTrends.has(serverId)) {
      this.serverTrends.set(serverId, {
        activeTopics: new Map(),
        commonPhrases: new Map(),
        activityLevel: 0
      });
    }

    const trends = this.serverTrends.get(serverId);
    trends.activityLevel++;

    // Track topics
    const topics = this.extractTopics(content, projectProfile);
    topics.forEach(topic => {
      const count = trends.activeTopics.get(topic) || 0;
      trends.activeTopics.set(topic, count + 1);
    });

    // Track common phrases
    const words = content.split(' ').filter(word => word.length > 3);
    words.forEach(word => {
      const count = trends.commonPhrases.get(word) || 0;
      trends.commonPhrases.set(word, count + 1);
    });

    await this.database.updateServerTrends(serverId, trends);
  }

  extractTopics(content, projectProfile) {
    const topicKeywords = {
      trading: ['volume', 'tier', 'price', 'chart', 'crypto', 'nft', 'bitcoin', 'eth', 'solana', 'pump', 'dump', 'moon', 'dip'],
      defi: ['defi', 'yield', 'farming', 'staking', 'apy', 'apr', 'tvl', 'protocol', 'liquidity', 'swap'],
      tokenomics: ['tokenomics', 'supply', 'burn', 'mint', 'emission', 'vesting', 'allocation', 'distribution'],
      market: ['bullish', 'bearish', 'fomo', 'fud', 'hodl', 'whale', 'retail', 'ath', 'atl'],
      gaming: ['game', 'play', 'level', 'boss', 'quest', 'pvp', 'raid', 'guild'],
      tech: ['code', 'bug', 'api', 'database', 'frontend', 'backend', 'deploy', 'git'],
      general: ['help', 'question', 'thanks', 'hello', 'hi', 'hey'],
      partnerships: ['partnership', 'collaboration', 'integration', 'listing'],
      community: ['community', 'discord', 'telegram', 'twitter', 'social'],
      development: ['roadmap', 'update', 'release', 'feature', 'bug', 'fix']
    };

    const foundTopics = [];
    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => content.includes(keyword))) {
        foundTopics.push(topic);
      }
    }

    // Add project-specific topics
    if (projectProfile && projectProfile.keyFeatures) {
      projectProfile.keyFeatures.forEach(feature => {
        if (content.includes(feature.toLowerCase())) {
          foundTopics.push(feature);
        }
      });
    }

    return foundTopics;
  }

  async getUserProfile(userId, serverId) {
    const profileKey = `${serverId}-${userId}`;
    return this.userProfiles.get(profileKey) || {
      communicationStyle: 'neutral',
      topics: new Set(),
      messageCount: 0,
      lastSeen: Date.now()
    };
  }

  async recordBotResponse(serverId, userId, userMessage, botResponse) {
    await this.database.logInteraction(serverId, userId, userMessage, botResponse);
  }
}