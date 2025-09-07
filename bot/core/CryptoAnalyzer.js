export class CryptoAnalyzer {
  constructor(database) {
    this.database = database;
    this.projectProfiles = new Map();
    this.cryptoTerms = {
      trading: ['dex', 'cex', 'swap', 'liquidity', 'volume', 'mcap', 'fdv', 'ath', 'atl', 'pump', 'dump', 'moon', 'rekt'],
      defi: ['yield', 'farming', 'staking', 'apy', 'apr', 'tvl', 'protocol', 'vault', 'pool', 'impermanent', 'slippage'],
      tokenomics: ['supply', 'burn', 'mint', 'emission', 'vesting', 'unlock', 'allocation', 'distribution', 'deflationary'],
      tech: ['blockchain', 'layer1', 'layer2', 'consensus', 'validator', 'node', 'smart contract', 'oracle', 'bridge'],
      market: ['bullish', 'bearish', 'fomo', 'fud', 'hodl', 'diamond hands', 'paper hands', 'whale', 'retail'],
      partnerships: ['collaboration', 'integration', 'listing', 'exchange', 'sponsor', 'advisor', 'investor']
    };
  }

  async analyzeServer(guild) {
    console.log(`🔍 Analyzing crypto project for server: ${guild.name}`);
    
    const projectProfile = {
      serverId: guild.id,
      serverName: guild.name,
      projectName: null,
      projectType: null,
      tokenSymbol: null,
      keyFeatures: [],
      teamMembers: new Set(),
      partnerships: [],
      roadmapItems: [],
      communitySize: guild.memberCount,
      activityLevel: 'unknown',
      lastAnalyzed: Date.now()
    };

    // Analyze announcement channels
    await this.analyzeAnnouncementChannels(guild, projectProfile);
    
    // Analyze pinned messages
    await this.analyzePinnedMessages(guild, projectProfile);
    
    // Identify team members
    await this.identifyTeamMembers(guild, projectProfile);
    
    // Store project profile
    this.projectProfiles.set(guild.id, projectProfile);
    await this.database.storeProjectProfile(guild.id, projectProfile);
    
    console.log(`✅ Project analysis complete for ${projectProfile.projectName || guild.name}`);
    return projectProfile;
  }

  async analyzeAnnouncementChannels(guild, projectProfile) {
    const announcementChannels = guild.channels.cache.filter(channel => 
      channel.type === 0 && // Text channel
      (channel.name.includes('announcement') || 
       channel.name.includes('news') || 
       channel.name.includes('updates') ||
       channel.name.includes('official'))
    );

    for (const channel of announcementChannels.values()) {
      try {
        const messages = await channel.messages.fetch({ limit: 50 });
        
        for (const message of messages.values()) {
          await this.extractProjectInfo(message.content, projectProfile);
        }
      } catch (error) {
        console.log(`⚠️ Could not access channel: ${channel.name}`);
      }
    }
  }

  async analyzePinnedMessages(guild, projectProfile) {
    for (const channel of guild.channels.cache.values()) {
      if (channel.type === 0) { // Text channel
        try {
          const pinnedMessages = await channel.messages.fetchPinned();
          
          for (const message of pinnedMessages.values()) {
            await this.extractProjectInfo(message.content, projectProfile);
          }
        } catch (error) {
          // Skip channels we can't access
        }
      }
    }
  }

  async extractProjectInfo(content, projectProfile) {
    const lowerContent = content.toLowerCase();
    
    // Extract project name patterns
    const projectPatterns = [
      /welcome to ([a-zA-Z0-9\s]+)/i,
      /official ([a-zA-Z0-9\s]+) server/i,
      /([a-zA-Z0-9]+) protocol/i,
      /([a-zA-Z0-9]+) token/i
    ];

    for (const pattern of projectPatterns) {
      const match = content.match(pattern);
      if (match && !projectProfile.projectName) {
        projectProfile.projectName = match[1].trim();
        break;
      }
    }

    // Extract token symbol
    const tokenMatch = content.match(/\$([A-Z]{2,10})/);
    if (tokenMatch && !projectProfile.tokenSymbol) {
      projectProfile.tokenSymbol = tokenMatch[1];
    }

    // Identify project type
    if (lowerContent.includes('defi') || lowerContent.includes('decentralized finance')) {
      projectProfile.projectType = 'defi';
    } else if (lowerContent.includes('nft') || lowerContent.includes('collectible')) {
      projectProfile.projectType = 'nft';
    } else if (lowerContent.includes('gaming') || lowerContent.includes('metaverse')) {
      projectProfile.projectType = 'gaming';
    } else if (lowerContent.includes('layer') || lowerContent.includes('blockchain')) {
      projectProfile.projectType = 'infrastructure';
    } else if (lowerContent.includes('exchange') || lowerContent.includes('trading')) {
      projectProfile.projectType = 'exchange';
    }

    // Extract key features
    const features = [
      'staking', 'yield farming', 'governance', 'dao', 'cross-chain', 
      'bridge', 'swap', 'lending', 'borrowing', 'liquidity mining'
    ];

    features.forEach(feature => {
      if (lowerContent.includes(feature) && !projectProfile.keyFeatures.includes(feature)) {
        projectProfile.keyFeatures.push(feature);
      }
    });

    // Extract partnerships
    const partnershipKeywords = ['partnership', 'collaboration', 'integration', 'listing'];
    partnershipKeywords.forEach(keyword => {
      if (lowerContent.includes(keyword)) {
        const sentences = content.split(/[.!?]/);
        sentences.forEach(sentence => {
          if (sentence.toLowerCase().includes(keyword)) {
            projectProfile.partnerships.push(sentence.trim());
          }
        });
      }
    });
  }

  async identifyTeamMembers(guild, projectProfile) {
    const teamRoles = ['founder', 'ceo', 'cto', 'dev', 'developer', 'team', 'admin', 'moderator', 'mod'];
    
    guild.members.cache.forEach(member => {
      const hasTeamRole = member.roles.cache.some(role => 
        teamRoles.some(teamRole => role.name.toLowerCase().includes(teamRole))
      );
      
      if (hasTeamRole) {
        projectProfile.teamMembers.add({
          id: member.id,
          username: member.user.username,
          roles: member.roles.cache.map(role => role.name)
        });
      }
    });
  }

  async analyzeMessage(message, projectProfile) {
    const content = message.content.toLowerCase();
    const analysis = {
      topics: [],
      sentiment: 'neutral',
      importance: 'low',
      cryptoRelevance: 0
    };

    // Analyze crypto topics
    for (const [category, terms] of Object.entries(this.cryptoTerms)) {
      const matchCount = terms.filter(term => content.includes(term)).length;
      if (matchCount > 0) {
        analysis.topics.push(category);
        analysis.cryptoRelevance += matchCount;
      }
    }

    // Sentiment analysis
    const positiveWords = ['bullish', 'moon', 'pump', 'good', 'great', 'amazing', 'excited'];
    const negativeWords = ['bearish', 'dump', 'rekt', 'bad', 'terrible', 'worried', 'concerned'];
    
    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    
    if (positiveCount > negativeCount) {
      analysis.sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      analysis.sentiment = 'negative';
    }

    // Importance scoring
    if (message.author.roles?.cache.some(role => 
      ['founder', 'team', 'admin', 'moderator'].some(teamRole => 
        role.name.toLowerCase().includes(teamRole)
      )
    )) {
      analysis.importance = 'high';
    } else if (analysis.cryptoRelevance > 2) {
      analysis.importance = 'medium';
    }

    return analysis;
  }

  async generateCryptoResponse(message, projectProfile, analysis) {
    const context = this.buildCryptoContext(projectProfile, analysis);
    
    // Project-specific knowledge
    let projectContext = '';
    if (projectProfile.projectName) {
      projectContext = `You're discussing ${projectProfile.projectName}`;
      if (projectProfile.tokenSymbol) {
        projectContext += ` ($${projectProfile.tokenSymbol})`;
      }
      projectContext += `. `;
    }

    // Topic-specific responses
    if (analysis.topics.includes('trading')) {
      projectContext += 'Focus on trading, charts, and market movements. ';
    } else if (analysis.topics.includes('defi')) {
      projectContext += 'Discuss DeFi protocols, yields, and farming strategies. ';
    } else if (analysis.topics.includes('tech')) {
      projectContext += 'Talk about blockchain technology and development. ';
    }

    return {
      context: projectContext,
      relevance: analysis.cryptoRelevance,
      shouldEngage: analysis.cryptoRelevance > 1 || analysis.importance === 'high'
    };
  }

  buildCryptoContext(projectProfile, analysis) {
    let context = `Project: ${projectProfile.projectName || 'Unknown'}\n`;
    context += `Type: ${projectProfile.projectType || 'General'}\n`;
    context += `Community: ${projectProfile.communitySize} members\n`;
    
    if (projectProfile.keyFeatures.length > 0) {
      context += `Features: ${projectProfile.keyFeatures.join(', ')}\n`;
    }
    
    context += `Topics: ${analysis.topics.join(', ')}\n`;
    context += `Sentiment: ${analysis.sentiment}\n`;
    
    return context;
  }

  getProjectProfile(serverId) {
    return this.projectProfiles.get(serverId);
  }

  async updateProjectProfile(serverId, updates) {
    const profile = this.projectProfiles.get(serverId);
    if (profile) {
      Object.assign(profile, updates);
      await this.database.storeProjectProfile(serverId, profile);
    }
  }

  async getCrossSectorInsights() {
    const insights = {
      totalProjects: this.projectProfiles.size,
      projectTypes: {},
      commonFeatures: {},
      trendingTopics: {},
      averageCommunitySize: 0
    };

    let totalMembers = 0;
    
    for (const profile of this.projectProfiles.values()) {
      // Count project types
      if (profile.projectType) {
        insights.projectTypes[profile.projectType] = 
          (insights.projectTypes[profile.projectType] || 0) + 1;
      }
      
      // Count features
      profile.keyFeatures.forEach(feature => {
        insights.commonFeatures[feature] = 
          (insights.commonFeatures[feature] || 0) + 1;
      });
      
      totalMembers += profile.communitySize;
    }

    insights.averageCommunitySize = Math.round(totalMembers / this.projectProfiles.size);
    
    return insights;
  }
}