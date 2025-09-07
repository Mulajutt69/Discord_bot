import { EventEmitter } from 'events';
import natural from 'natural';
import Sentiment from 'sentiment';
import { createLogger } from '../utils/logger.js';
import MessageContext from '../models/MessageContext.js';
import ServerProfile from '../models/ServerProfile.js';

const logger = createLogger('MessageProcessor');

class MessageProcessor extends EventEmitter {
  constructor() {
    super();
    this.sentiment = new Sentiment();
    this.tokenizer = new natural.WordTokenizer();
    this.stemmer = natural.PorterStemmer;
    this.tfidf = new natural.TfIdf();
    
    // Crypto-specific terms and patterns
    this.cryptoTerms = new Set([
      'defi', 'nft', 'dao', 'dex', 'cex', 'yield', 'farming', 'staking',
      'liquidity', 'pool', 'swap', 'bridge', 'airdrop', 'whitelist',
      'mint', 'burn', 'hodl', 'diamond', 'hands', 'moon', 'lambo',
      'bullish', 'bearish', 'pump', 'dump', 'rug', 'pull', 'fud',
      'fomo', 'ath', 'atl', 'mcap', 'tvl', 'apr', 'apy'
    ]);

    this.technicalTerms = new Set([
      'blockchain', 'smart', 'contract', 'consensus', 'validator',
      'node', 'hash', 'merkle', 'tree', 'proof', 'stake', 'work',
      'layer', 'scaling', 'sharding', 'rollup', 'sidechain',
      'interoperability', 'oracle', 'governance', 'tokenomics'
    ]);

    this.pricePatterns = [
      /\$[\d,]+\.?\d*/g,
      /\d+\.\d+\s*(usd|usdt|usdc|eth|btc)/gi,
      /price\s*(target|prediction|forecast)/gi,
      /\d+x\s*(gain|profit|return)/gi
    ];
  }

  async processMessage(messageData) {
    try {
      const context = await this.createMessageContext(messageData);
      const analysis = await this.analyzeMessage(context);
      
      // Save to database
      const messageDoc = new MessageContext({
        messageId: messageData.id,
        serverId: messageData.guild?.id || 'dm',
        channelId: messageData.channel.id,
        userId: messageData.author.id,
        content: messageData.content,
        timestamp: messageData.createdAt,
        isFromModerator: this.isFromModerator(messageData),
        isFromBot: messageData.author.bot,
        sentiment: analysis.sentiment.score,
        topics: analysis.topics,
        mentions: analysis.mentions,
        attachments: messageData.attachments.map(a => a.url),
        analysisResults: analysis.cryptoAnalysis,
        processed: true
      });

      await messageDoc.save();

      // Emit events for real-time processing
      this.emit('message_processed', {
        context,
        analysis,
        messageDoc
      });

      // Update server profile if needed
      if (analysis.cryptoAnalysis.projectUpdates.length > 0) {
        await this.updateServerProfile(messageData.guild?.id, analysis);
      }

      return { context, analysis };
    } catch (error) {
      logger.error('Message processing error:', error);
      throw error;
    }
  }

  async createMessageContext(messageData) {
    return {
      id: messageData.id,
      serverId: messageData.guild?.id || 'dm',
      channelId: messageData.channel.id,
      userId: messageData.author.id,
      username: messageData.author.username,
      content: messageData.content,
      timestamp: messageData.createdAt,
      isFromModerator: this.isFromModerator(messageData),
      isFromBot: messageData.author.bot,
      channelName: messageData.channel.name,
      serverName: messageData.guild?.name || 'DM'
    };
  }

  async analyzeMessage(context) {
    const content = context.content.toLowerCase();
    const tokens = this.tokenizer.tokenize(content);
    
    // Sentiment analysis
    const sentimentResult = this.sentiment.analyze(content);
    
    // Topic extraction
    const topics = this.extractTopics(tokens);
    
    // Mention extraction
    const mentions = this.extractMentions(context.content);
    
    // Crypto-specific analysis
    const cryptoAnalysis = this.analyzeCryptoContent(content, tokens);
    
    // Technical discussion detection
    const technicalLevel = this.assessTechnicalLevel(tokens);
    
    return {
      sentiment: {
        score: sentimentResult.score,
        comparative: sentimentResult.comparative,
        positive: sentimentResult.positive,
        negative: sentimentResult.negative
      },
      topics,
      mentions,
      cryptoAnalysis,
      technicalLevel,
      messageComplexity: this.assessMessageComplexity(tokens),
      urgencyLevel: this.assessUrgency(content)
    };
  }

  extractTopics(tokens) {
    const topics = [];
    const stemmedTokens = tokens.map(token => this.stemmer.stem(token));
    
    // Use TF-IDF for topic extraction
    this.tfidf.addDocument(stemmedTokens);
    
    // Extract significant terms
    const measures = [];
    this.tfidf.listTerms(0).forEach(item => {
      if (item.tfidf > 0.1) {
        measures.push(item.term);
      }
    });
    
    return measures.slice(0, 5); // Top 5 topics
  }

  extractMentions(content) {
    const mentions = [];
    
    // User mentions
    const userMentions = content.match(/<@!?\d+>/g) || [];
    mentions.push(...userMentions);
    
    // Channel mentions
    const channelMentions = content.match(/<#\d+>/g) || [];
    mentions.push(...channelMentions);
    
    // Role mentions
    const roleMentions = content.match(/<@&\d+>/g) || [];
    mentions.push(...roleMentions);
    
    return mentions;
  }

  analyzeCryptoContent(content, tokens) {
    const analysis = {
      cryptoMentions: [],
      technicalTerms: [],
      priceDiscussion: false,
      tradingSignals: [],
      projectUpdates: []
    };

    // Find crypto terms
    tokens.forEach(token => {
      if (this.cryptoTerms.has(token)) {
        analysis.cryptoMentions.push(token);
      }
      if (this.technicalTerms.has(token)) {
        analysis.technicalTerms.push(token);
      }
    });

    // Check for price discussion
    analysis.priceDiscussion = this.pricePatterns.some(pattern => 
      pattern.test(content)
    );

    // Detect trading signals
    const tradingKeywords = ['buy', 'sell', 'long', 'short', 'entry', 'exit', 'target', 'stop', 'loss'];
    analysis.tradingSignals = tokens.filter(token => 
      tradingKeywords.includes(token)
    );

    // Detect project updates
    const updateKeywords = ['announcement', 'update', 'release', 'launch', 'partnership', 'integration'];
    analysis.projectUpdates = tokens.filter(token => 
      updateKeywords.includes(token)
    );

    return analysis;
  }

  assessTechnicalLevel(tokens) {
    const technicalCount = tokens.filter(token => 
      this.technicalTerms.has(token)
    ).length;
    
    return Math.min(technicalCount / tokens.length * 10, 10);
  }

  assessMessageComplexity(tokens) {
    const uniqueTokens = new Set(tokens);
    const lexicalDiversity = uniqueTokens.size / tokens.length;
    const avgWordLength = tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length;
    
    return {
      lexicalDiversity,
      avgWordLength,
      totalTokens: tokens.length,
      uniqueTokens: uniqueTokens.size
    };
  }

  assessUrgency(content) {
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'breaking', 'alert', 'warning'];
    const urgentCount = urgentKeywords.filter(keyword => 
      content.includes(keyword)
    ).length;
    
    return Math.min(urgentCount * 2, 10);
  }

  isFromModerator(messageData) {
    if (!messageData.member) return false;
    
    const modRoles = ['admin', 'administrator', 'mod', 'moderator', 'staff'];
    return messageData.member.roles.cache.some(role => 
      modRoles.some(modRole => 
        role.name.toLowerCase().includes(modRole)
      )
    );
  }

  async updateServerProfile(serverId, analysis) {
    if (!serverId) return;

    try {
      const profile = await ServerProfile.findOne({ serverId });
      if (!profile) return;

      // Update based on analysis results
      if (analysis.cryptoAnalysis.projectUpdates.length > 0) {
        profile.lastUpdated = new Date();
        await profile.save();
      }
    } catch (error) {
      logger.error('Server profile update error:', error);
    }
  }

  async getMessageHistory(serverId, channelId, limit = 100) {
    try {
      return await MessageContext.find({
        serverId,
        channelId
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    } catch (error) {
      logger.error('Message history retrieval error:', error);
      return [];
    }
  }

  async getServerAnalytics(serverId, timeframe = '24h') {
    try {
      const timeAgo = new Date();
      timeAgo.setHours(timeAgo.getHours() - (timeframe === '24h' ? 24 : 168));

      const messages = await MessageContext.find({
        serverId,
        timestamp: { $gte: timeAgo }
      }).lean();

      return {
        totalMessages: messages.length,
        averageSentiment: messages.reduce((sum, msg) => sum + msg.sentiment, 0) / messages.length,
        topTopics: this.getTopTopics(messages),
        activityPattern: this.getActivityPattern(messages),
        moderatorActivity: messages.filter(msg => msg.isFromModerator).length
      };
    } catch (error) {
      logger.error('Server analytics error:', error);
      return null;
    }
  }

  getTopTopics(messages) {
    const topicCounts = {};
    messages.forEach(msg => {
      msg.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
      });
    });

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }));
  }

  getActivityPattern(messages) {
    const hourlyActivity = new Array(24).fill(0);
    messages.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours();
      hourlyActivity[hour]++;
    });
    return hourlyActivity;
  }
}

export default new MessageProcessor();