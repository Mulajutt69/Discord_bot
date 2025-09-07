import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';
import ServerProfile from '../models/ServerProfile.js';
import MessageContext from '../models/MessageContext.js';

const logger = createLogger('ServerIntelligence');

class ServerIntelligence extends EventEmitter {
  constructor() {
    super();
    this.serverProfiles = new Map();
    this.analysisQueue = [];
    this.isProcessing = false;
  }

  async discoverServer(guild) {
    try {
      logger.info(`Discovering server: ${guild.name} (${guild.id})`);
      
      const profile = await this.createServerProfile(guild);
      await this.analyzeServerStructure(guild, profile);
      await this.categorizeProject(guild, profile);
      
      this.serverProfiles.set(guild.id, profile);
      
      // Save to database
      const serverDoc = new ServerProfile({
        serverId: guild.id,
        name: guild.name,
        projectType: profile.projectType,
        tokenomics: profile.tokenomics,
        technology: profile.technology,
        partnerships: profile.partnerships,
        roadmapStatus: profile.roadmapStatus,
        communityMetrics: profile.communityMetrics,
        moderatorPatterns: profile.moderatorPatterns,
        analysisData: profile.analysisData
      });

      await serverDoc.save();
      
      this.emit('server_discovered', { guild, profile });
      
      return profile;
    } catch (error) {
      logger.error(`Server discovery error for ${guild.name}:`, error);
      throw error;
    }
  }

  async createServerProfile(guild) {
    const profile = {
      id: guild.id,
      name: guild.name,
      projectType: 'unknown',
      tokenomics: {},
      technology: {
        blockchain: null,
        protocols: [],
        smartContracts: []
      },
      partnerships: [],
      roadmapStatus: 'pre-launch',
      communityMetrics: {
        memberCount: guild.memberCount,
        activeUsers: 0,
        messageVolume: 0,
        engagementScore: 0
      },
      moderatorPatterns: {
        verificationMethods: [],
        botDetectionSignals: [],
        communicationStyle: 'formal'
      },
      analysisData: {
        announcementChannels: [],
        pinnedMessages: [],
        teamRoles: [],
        officialLinks: []
      },
      lastUpdated: new Date()
    };

    return profile;
  }

  async analyzeServerStructure(guild, profile) {
    try {
      // Analyze channels
      const channels = guild.channels.cache;
      
      // Find announcement channels
      const announcementChannels = channels.filter(channel => 
        channel.name.includes('announce') || 
        channel.name.includes('news') ||
        channel.name.includes('update')
      );
      
      profile.analysisData.announcementChannels = announcementChannels.map(c => c.id);

      // Analyze roles for team identification
      const roles = guild.roles.cache;
      const teamRoles = roles.filter(role => 
        role.name.toLowerCase().includes('team') ||
        role.name.toLowerCase().includes('dev') ||
        role.name.toLowerCase().includes('founder') ||
        role.name.toLowerCase().includes('admin')
      );
      
      profile.analysisData.teamRoles = teamRoles.map(r => r.name);

      // Analyze pinned messages for project info
      for (const channel of announcementChannels.values()) {
        if (channel.isTextBased()) {
          try {
            const pinnedMessages = await channel.messages.fetchPinned();
            profile.analysisData.pinnedMessages.push(
              ...pinnedMessages.map(msg => ({
                channelId: channel.id,
                content: msg.content,
                timestamp: msg.createdAt
              }))
            );
          } catch (error) {
            logger.warn(`Could not fetch pinned messages from ${channel.name}`);
          }
        }
      }

      // Extract official links from server description and channels
      await this.extractOfficialLinks(guild, profile);

    } catch (error) {
      logger.error('Server structure analysis error:', error);
    }
  }

  async extractOfficialLinks(guild, profile) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const links = [];

    // Check server description
    if (guild.description) {
      const descriptionLinks = guild.description.match(urlRegex) || [];
      links.push(...descriptionLinks);
    }

    // Check channel topics
    guild.channels.cache.forEach(channel => {
      if (channel.topic) {
        const topicLinks = channel.topic.match(urlRegex) || [];
        links.push(...topicLinks);
      }
    });

    // Categorize links
    profile.analysisData.officialLinks = links.map(link => ({
      url: link,
      type: this.categorizeLink(link)
    }));
  }

  categorizeLink(url) {
    const domain = url.toLowerCase();
    
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'twitter';
    if (domain.includes('telegram.org') || domain.includes('t.me')) return 'telegram';
    if (domain.includes('discord.gg') || domain.includes('discord.com')) return 'discord';
    if (domain.includes('github.com')) return 'github';
    if (domain.includes('medium.com')) return 'medium';
    if (domain.includes('docs.')) return 'documentation';
    if (domain.includes('whitepaper')) return 'whitepaper';
    if (domain.includes('coingecko.com') || domain.includes('coinmarketcap.com')) return 'price_tracker';
    if (domain.includes('etherscan.io') || domain.includes('bscscan.com')) return 'blockchain_explorer';
    
    return 'website';
  }

  async categorizeProject(guild, profile) {
    try {
      const indicators = {
        defi: ['defi', 'swap', 'dex', 'yield', 'farming', 'liquidity', 'staking'],
        nft: ['nft', 'collectible', 'art', 'mint', 'opensea', 'marketplace'],
        gaming: ['game', 'gaming', 'play', 'earn', 'metaverse', 'avatar'],
        infrastructure: ['blockchain', 'protocol', 'network', 'validator', 'node'],
        meme: ['meme', 'doge', 'shib', 'moon', 'diamond', 'hands']
      };

      const serverText = `${guild.name} ${guild.description || ''}`.toLowerCase();
      const channelNames = guild.channels.cache.map(c => c.name).join(' ').toLowerCase();
      const combinedText = `${serverText} ${channelNames}`;

      let maxScore = 0;
      let detectedType = 'unknown';

      Object.entries(indicators).forEach(([type, keywords]) => {
        const score = keywords.reduce((acc, keyword) => {
          return acc + (combinedText.split(keyword).length - 1);
        }, 0);

        if (score > maxScore) {
          maxScore = score;
          detectedType = type;
        }
      });

      profile.projectType = detectedType;

      // Additional analysis based on project type
      await this.analyzeProjectSpecifics(guild, profile);

    } catch (error) {
      logger.error('Project categorization error:', error);
    }
  }

  async analyzeProjectSpecifics(guild, profile) {
    switch (profile.projectType) {
      case 'defi':
        await this.analyzeDeFiProject(guild, profile);
        break;
      case 'nft':
        await this.analyzeNFTProject(guild, profile);
        break;
      case 'gaming':
        await this.analyzeGamingProject(guild, profile);
        break;
      default:
        break;
    }
  }

  async analyzeDeFiProject(guild, profile) {
    // Look for tokenomics information
    const tokenChannels = guild.channels.cache.filter(channel =>
      channel.name.includes('token') || 
      channel.name.includes('economics') ||
      channel.name.includes('supply')
    );

    // Analyze for common DeFi protocols
    const protocolIndicators = ['uniswap', 'pancakeswap', 'compound', 'aave', 'curve'];
    const serverText = guild.name.toLowerCase();
    
    profile.technology.protocols = protocolIndicators.filter(protocol =>
      serverText.includes(protocol)
    );

    profile.roadmapStatus = this.determineRoadmapStatus(guild);
  }

  async analyzeNFTProject(guild, profile) {
    // Look for collection information
    const collectionChannels = guild.channels.cache.filter(channel =>
      channel.name.includes('collection') || 
      channel.name.includes('mint') ||
      channel.name.includes('reveal')
    );

    // Check for marketplace integrations
    const marketplaceIndicators = ['opensea', 'rarible', 'foundation', 'superrare'];
    profile.partnerships = marketplaceIndicators.filter(marketplace =>
      guild.name.toLowerCase().includes(marketplace)
    );
  }

  async analyzeGamingProject(guild, profile) {
    // Look for gaming-specific channels
    const gamingChannels = guild.channels.cache.filter(channel =>
      channel.name.includes('gameplay') || 
      channel.name.includes('leaderboard') ||
      channel.name.includes('tournament')
    );

    profile.technology.blockchain = this.detectBlockchain(guild);
  }

  detectBlockchain(guild) {
    const blockchainIndicators = {
      'ethereum': ['eth', 'ethereum', 'erc20', 'erc721'],
      'binance': ['bsc', 'binance', 'bnb', 'bep20'],
      'polygon': ['polygon', 'matic', 'poly'],
      'solana': ['solana', 'sol', 'spl'],
      'avalanche': ['avax', 'avalanche', 'c-chain']
    };

    const serverText = guild.name.toLowerCase();
    
    for (const [blockchain, indicators] of Object.entries(blockchainIndicators)) {
      if (indicators.some(indicator => serverText.includes(indicator))) {
        return blockchain;
      }
    }

    return null;
  }

  determineRoadmapStatus(guild) {
    const statusIndicators = {
      'pre-launch': ['coming soon', 'pre-launch', 'testnet', 'beta'],
      'mainnet': ['mainnet', 'live', 'launched', 'active'],
      'scaling': ['scaling', 'v2', 'upgrade', 'expansion'],
      'mature': ['established', 'mature', 'stable', 'enterprise']
    };

    const serverText = `${guild.name} ${guild.description || ''}`.toLowerCase();
    
    for (const [status, indicators] of Object.entries(statusIndicators)) {
      if (indicators.some(indicator => serverText.includes(indicator))) {
        return status;
      }
    }

    return 'pre-launch';
  }

  async updateServerProfile(serverId, updates) {
    try {
      const profile = this.serverProfiles.get(serverId);
      if (profile) {
        Object.assign(profile, updates);
        profile.lastUpdated = new Date();
        
        await ServerProfile.findOneAndUpdate(
          { serverId },
          updates,
          { upsert: true }
        );
        
        this.emit('profile_updated', { serverId, updates });
      }
    } catch (error) {
      logger.error('Profile update error:', error);
    }
  }

  async getServerProfile(serverId) {
    let profile = this.serverProfiles.get(serverId);
    
    if (!profile) {
      const serverDoc = await ServerProfile.findOne({ serverId });
      if (serverDoc) {
        profile = serverDoc.toObject();
        this.serverProfiles.set(serverId, profile);
      }
    }
    
    return profile;
  }

  async analyzeServerRelationships() {
    try {
      const profiles = Array.from(this.serverProfiles.values());
      const relationships = [];

      for (let i = 0; i < profiles.length; i++) {
        for (let j = i + 1; j < profiles.length; j++) {
          const similarity = this.calculateServerSimilarity(profiles[i], profiles[j]);
          
          if (similarity > 0.7) {
            relationships.push({
              server1: profiles[i].id,
              server2: profiles[j].id,
              similarity,
              commonElements: this.findCommonElements(profiles[i], profiles[j])
            });
          }
        }
      }

      return relationships;
    } catch (error) {
      logger.error('Server relationship analysis error:', error);
      return [];
    }
  }

  calculateServerSimilarity(profile1, profile2) {
    let score = 0;
    let factors = 0;

    // Project type similarity
    if (profile1.projectType === profile2.projectType) {
      score += 0.3;
    }
    factors++;

    // Technology similarity
    const commonProtocols = profile1.technology.protocols.filter(p =>
      profile2.technology.protocols.includes(p)
    );
    score += (commonProtocols.length / Math.max(profile1.technology.protocols.length, 1)) * 0.2;
    factors++;

    // Partnership similarity
    const commonPartners = profile1.partnerships.filter(p =>
      profile2.partnerships.includes(p)
    );
    score += (commonPartners.length / Math.max(profile1.partnerships.length, 1)) * 0.2;
    factors++;

    // Blockchain similarity
    if (profile1.technology.blockchain === profile2.technology.blockchain) {
      score += 0.3;
    }
    factors++;

    return score / factors;
  }

  findCommonElements(profile1, profile2) {
    return {
      protocols: profile1.technology.protocols.filter(p =>
        profile2.technology.protocols.includes(p)
      ),
      partnerships: profile1.partnerships.filter(p =>
        profile2.partnerships.includes(p)
      ),
      blockchain: profile1.technology.blockchain === profile2.technology.blockchain ?
        profile1.technology.blockchain : null
    };
  }

  getIntelligenceStats() {
    return {
      totalServers: this.serverProfiles.size,
      projectTypes: this.getProjectTypeDistribution(),
      blockchainDistribution: this.getBlockchainDistribution(),
      roadmapStatusDistribution: this.getRoadmapStatusDistribution()
    };
  }

  getProjectTypeDistribution() {
    const distribution = {};
    this.serverProfiles.forEach(profile => {
      distribution[profile.projectType] = (distribution[profile.projectType] || 0) + 1;
    });
    return distribution;
  }

  getBlockchainDistribution() {
    const distribution = {};
    this.serverProfiles.forEach(profile => {
      const blockchain = profile.technology.blockchain;
      if (blockchain) {
        distribution[blockchain] = (distribution[blockchain] || 0) + 1;
      }
    });
    return distribution;
  }

  getRoadmapStatusDistribution() {
    const distribution = {};
    this.serverProfiles.forEach(profile => {
      distribution[profile.roadmapStatus] = (distribution[profile.roadmapStatus] || 0) + 1;
    });
    return distribution;
  }
}

export default new ServerIntelligence();