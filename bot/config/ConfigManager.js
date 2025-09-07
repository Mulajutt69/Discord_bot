export class ConfigManager {
  constructor() {
    this.serverConfigs = new Map();
    this.globalConfig = {
      const groqApiKey = process.env.GROQ_API_KEY || 'your-groq-api-key-here',
      defaultEngagementRate: 0.3,
      defaultResponseDelay: { min: 70, max: 80 }
    };
  }

  async loadConfigs() {
    // Load default configurations for different server types
    await this.loadDefaultConfigs();
    console.log('⚙️ Configuration manager loaded');
  }

  async loadDefaultConfigs() {
    // Crypto trading server config
    this.serverConfigs.set('crypto-default', {
      serverType: 'crypto',
      targetChannels: ['all'], // or specific channel IDs
      engagementRate: 0.4,
      responseDelay: { min: 60, max: 90 },
      personality: {
        name: "Tayyab",
        age: 21,
        location: "Multan, Pakistan",
        interests: ["crypto", "trading", "defi", "nfts"],
        style: "crypto-enthusiast",
        level: 23,
        target: 27
      },
      mainTopics: ['trading', 'crypto', 'charts', 'market'],
      rewardSystem: {
        targetRoles: ['Trader', 'Diamond Hands', 'Whale'],
        requiredActivity: 50,
        helpfulnessThreshold: 10
      }
    });

    // Gaming server config
    this.serverConfigs.set('gaming-default', {
      serverType: 'gaming',
      targetChannels: ['all'],
      engagementRate: 0.35,
      responseDelay: { min: 45, max: 75 },
      personality: {
        name: "Tayyab",
        age: 21,
        location: "Multan, Pakistan",
        interests: ["gaming", "esports", "streaming"],
        style: "gamer",
        level: 23,
        target: 27
      },
      mainTopics: ['gaming', 'esports', 'strategies', 'tournaments'],
      rewardSystem: {
        targetRoles: ['Pro Gamer', 'Squad Leader', 'Champion'],
        requiredActivity: 40,
        helpfulnessThreshold: 8
      }
    });

    // Development server config
    this.serverConfigs.set('dev-default', {
      serverType: 'dev',
      targetChannels: ['all'],
      engagementRate: 0.25,
      responseDelay: { min: 80, max: 120 },
      personality: {
        name: "Tayyab",
        age: 21,
        location: "Multan, Pakistan",
        interests: ["coding", "web3", "blockchain", "ai"],
        style: "developer",
        level: 23,
        target: 27
      },
      mainTopics: ['programming', 'web3', 'blockchain', 'ai'],
      rewardSystem: {
        targetRoles: ['Developer', 'Code Reviewer', 'Mentor'],
        requiredActivity: 30,
        helpfulnessThreshold: 15
      }
    });
  }

  async getServerConfig(serverId) {
    // Try to get specific server config, fallback to default based on server analysis
    if (this.serverConfigs.has(serverId)) {
      return this.serverConfigs.get(serverId);
    }

    // Auto-detect server type and return appropriate default
    // For now, return crypto default - you can enhance this with server name analysis
    return this.serverConfigs.get('crypto-default');
  }

  async updateServerConfig(serverId, config) {
    this.serverConfigs.set(serverId, config);
    // In a real implementation, you'd save this to database
    console.log(`⚙️ Updated config for server ${serverId}`);
  }

  getGlobalConfig() {
    return this.globalConfig;
  }

  async setServerType(serverId, serverType) {
    const defaultConfig = this.serverConfigs.get(`${serverType}-default`);
    if (defaultConfig) {
      await this.updateServerConfig(serverId, { ...defaultConfig });
      return true;
    }
    return false;
  }

  async addTargetChannel(serverId, channelId) {
    const config = await this.getServerConfig(serverId);
    if (!config.targetChannels.includes(channelId) && !config.targetChannels.includes('all')) {
      config.targetChannels.push(channelId);
      await this.updateServerConfig(serverId, config);
    }
  }

  async removeTargetChannel(serverId, channelId) {
    const config = await this.getServerConfig(serverId);
    config.targetChannels = config.targetChannels.filter(id => id !== channelId);
    await this.updateServerConfig(serverId, config);
  }
}