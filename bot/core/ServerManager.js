export class ServerManager {
  constructor(guild, config, database) {
    this.guild = guild;
    this.config = config;
    this.database = database;
    this.activityStats = {
      messagesSent: 0,
      usersHelped: 0,
      rolesEarned: 0,
      lastActivity: Date.now()
    };
  }

  async initialize() {
    await this.loadServerData();
    console.log(`🔧 ServerManager initialized for ${this.guild.name}`);
  }

  async loadServerData() {
    // Load server-specific data from database
    const data = await this.database.getServerData(this.guild.id);
    if (data) {
      this.activityStats = { ...this.activityStats, ...data };
    }
  }

  isTargetChannel(channelId) {
    return this.config.targetChannels.includes(channelId) || 
           this.config.targetChannels.includes('all');
  }

  getResponseDelay() {
    const baseDelay = this.config.responseDelay || { min: 70, max: 80 };
    return Math.random() * (baseDelay.max - baseDelay.min) + baseDelay.min;
  }

  getPersonality() {
    return this.config.personality || {
      name: "Tayyab",
      age: 21,
      location: "Multan, Pakistan",
      interests: ["crypto", "trading", "tech"],
      style: "casual",
      level: 23,
      target: 27
    };
  }

  getServerContext() {
    return {
      serverType: this.config.serverType || 'general',
      mainTopics: this.config.mainTopics || ['general'],
      rules: this.config.rules || [],
      rewardSystem: this.config.rewardSystem || {}
    };
  }

  async recordActivity(type) {
    this.activityStats.lastActivity = Date.now();
    
    switch (type) {
      case 'message_sent':
        this.activityStats.messagesSent++;
        break;
      case 'user_helped':
        this.activityStats.usersHelped++;
        break;
      case 'role_earned':
        this.activityStats.rolesEarned++;
        break;
    }

    await this.database.updateServerStats(this.guild.id, this.activityStats);
  }

  getActivityStats() {
    return {
      ...this.activityStats,
      serverName: this.guild.name,
      memberCount: this.guild.memberCount
    };
  }

  shouldEngageWithUser(userId, messageContent) {
    // Server-specific engagement logic
    const engagementRate = this.config.engagementRate || 0.3;
    
    // Higher engagement for questions or help requests
    if (messageContent.includes('?') || 
        messageContent.toLowerCase().includes('help') ||
        messageContent.toLowerCase().includes('how')) {
      return Math.random() < (engagementRate * 2);
    }

    return Math.random() < engagementRate;
  }
}