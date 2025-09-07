import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';
import ServerIntelligence from './ServerIntelligence.js';
import MessageProcessor from './MessageProcessor.js';

const logger = createLogger('ContextualEngine');

class ContextualEngine extends EventEmitter {
  constructor() {
    super();
    this.conversationContexts = new Map();
    this.serverContexts = new Map();
    this.responseTemplates = new Map();
    this.knowledgeBase = new Map();
    
    this.initializeResponseTemplates();
    this.initializeKnowledgeBase();
  }

  initializeResponseTemplates() {
    // DeFi project templates
    this.responseTemplates.set('defi', {
      greeting: [
        "Hey! Excited to see what's happening with the protocol today!",
        "GM! How are the yields looking?",
        "What's the latest on the liquidity pools?"
      ],
      technical: [
        "The smart contract architecture looks solid. Have you considered implementing {suggestion}?",
        "Interesting approach to {topic}. How does this compare to {comparison}?",
        "The tokenomics model seems well thought out. What's the emission schedule?"
      ],
      trading: [
        "That's a solid analysis. The {metric} is definitely worth watching.",
        "Have you factored in the {factor} when making that prediction?",
        "The market structure for {token} has been evolving. Good observation."
      ]
    });

    // NFT project templates
    this.responseTemplates.set('nft', {
      greeting: [
        "Love the art style! When's the next drop?",
        "The community here is amazing. Great project!",
        "Just checked out the roadmap - very ambitious!"
      ],
      technical: [
        "The metadata structure looks clean. Using IPFS for storage?",
        "Interesting utility mechanics. How will {feature} work exactly?",
        "The rarity distribution seems well balanced."
      ],
      community: [
        "The holder benefits keep getting better!",
        "Community voting on {topic} is a great idea.",
        "Love seeing the team so engaged with holders."
      ]
    });

    // Gaming project templates
    this.responseTemplates.set('gaming', {
      greeting: [
        "Ready to grind! What's the meta looking like?",
        "The gameplay mechanics are getting smoother each update.",
        "When's the next tournament?"
      ],
      technical: [
        "The blockchain integration is seamless. Great UX!",
        "How will the {feature} affect game balance?",
        "The tokenomics for in-game assets make sense."
      ],
      gameplay: [
        "That strategy worked well for me too!",
        "The {item} drop rates seem fair now.",
        "Looking forward to the new {content} release."
      ]
    });
  }

  initializeKnowledgeBase() {
    // DeFi knowledge
    this.knowledgeBase.set('defi', {
      concepts: [
        'liquidity mining', 'yield farming', 'impermanent loss', 'automated market maker',
        'total value locked', 'annual percentage yield', 'governance token', 'flash loans'
      ],
      protocols: [
        'Uniswap', 'Compound', 'Aave', 'Curve', 'Balancer', 'SushiSwap', 'PancakeSwap'
      ],
      metrics: [
        'TVL', 'APY', 'APR', 'volume', 'fees', 'slippage', 'price impact'
      ]
    });

    // NFT knowledge
    this.knowledgeBase.set('nft', {
      concepts: [
        'minting', 'reveal', 'rarity', 'floor price', 'volume', 'holders',
        'utility', 'roadmap', 'community', 'marketplace'
      ],
      marketplaces: [
        'OpenSea', 'Rarible', 'Foundation', 'SuperRare', 'LooksRare', 'X2Y2'
      ],
      metrics: [
        'floor price', 'volume', 'holders', 'listed percentage', 'average price'
      ]
    });

    // Gaming knowledge
    this.knowledgeBase.set('gaming', {
      concepts: [
        'play-to-earn', 'NFT assets', 'in-game economy', 'tournaments',
        'guilds', 'breeding', 'crafting', 'marketplace'
      ],
      mechanics: [
        'PvP', 'PvE', 'staking', 'rewards', 'leaderboards', 'seasons'
      ],
      metrics: [
        'daily active users', 'retention rate', 'average session time', 'revenue per user'
      ]
    });
  }

  async generateContextualResponse(messageContext, serverProfile) {
    try {
      const context = await this.buildConversationContext(messageContext, serverProfile);
      const responseStyle = this.determineResponseStyle(context);
      const response = await this.craftResponse(messageContext, context, responseStyle);
      
      return {
        response,
        context,
        confidence: this.calculateConfidence(context),
        shouldRespond: this.shouldRespond(messageContext, context)
      };
    } catch (error) {
      logger.error('Contextual response generation error:', error);
      return null;
    }
  }

  async buildConversationContext(messageContext, serverProfile) {
    const context = {
      server: serverProfile,
      message: messageContext,
      conversation: await this.getConversationHistory(messageContext),
      projectKnowledge: this.getProjectKnowledge(serverProfile),
      userHistory: await this.getUserContext(messageContext.userId, messageContext.serverId),
      currentTrends: await this.getCurrentTrends(serverProfile.projectType),
      communityMood: await this.assessCommunityMood(messageContext.serverId)
    };

    return context;
  }

  async getConversationHistory(messageContext) {
    const key = `${messageContext.serverId}_${messageContext.channelId}`;
    let conversation = this.conversationContexts.get(key);

    if (!conversation) {
      // Fetch recent messages from the channel
      const recentMessages = await MessageProcessor.getMessageHistory(
        messageContext.serverId,
        messageContext.channelId,
        20
      );

      conversation = {
        channelId: messageContext.channelId,
        messages: recentMessages,
        participants: [...new Set(recentMessages.map(msg => msg.userId))],
        topics: this.extractConversationTopics(recentMessages),
        mood: this.assessConversationMood(recentMessages)
      };

      this.conversationContexts.set(key, conversation);
    }

    return conversation;
  }

  getProjectKnowledge(serverProfile) {
    const projectType = serverProfile.projectType;
    const knowledge = this.knowledgeBase.get(projectType) || {};
    
    return {
      ...knowledge,
      serverSpecific: {
        tokenomics: serverProfile.tokenomics,
        technology: serverProfile.technology,
        partnerships: serverProfile.partnerships,
        roadmapStatus: serverProfile.roadmapStatus
      }
    };
  }

  async getUserContext(userId, serverId) {
    // This would integrate with BehaviorAnalyzer
    return {
      isRegular: true, // Placeholder
      interests: [], // Derived from message history
      expertise: 'intermediate', // Assessed from technical discussions
      trustLevel: 'verified' // Based on behavior analysis
    };
  }

  async getCurrentTrends(projectType) {
    // This would integrate with external APIs or trend analysis
    return {
      marketTrends: [],
      technicalTrends: [],
      communityTrends: []
    };
  }

  async assessCommunityMood(serverId) {
    const recentAnalytics = await MessageProcessor.getServerAnalytics(serverId, '24h');
    
    if (!recentAnalytics) return 'neutral';

    const avgSentiment = recentAnalytics.averageSentiment;
    
    if (avgSentiment > 2) return 'bullish';
    if (avgSentiment > 0) return 'optimistic';
    if (avgSentiment > -2) return 'neutral';
    if (avgSentiment > -4) return 'cautious';
    return 'bearish';
  }

  determineResponseStyle(context) {
    const serverProfile = context.server;
    const communityMood = context.communityMood;
    const messageContent = context.message.content.toLowerCase();

    let style = {
      formality: 'casual',
      technicality: 'intermediate',
      enthusiasm: 'moderate',
      helpfulness: 'high'
    };

    // Adjust based on server type
    if (serverProfile.projectType === 'defi') {
      style.technicality = 'high';
      style.formality = 'semi-formal';
    } else if (serverProfile.projectType === 'meme') {
      style.enthusiasm = 'high';
      style.formality = 'very-casual';
    }

    // Adjust based on community mood
    if (communityMood === 'bullish') {
      style.enthusiasm = 'high';
    } else if (communityMood === 'bearish') {
      style.enthusiasm = 'low';
      style.helpfulness = 'very-high';
    }

    // Adjust based on message content
    if (this.containsTechnicalTerms(messageContent)) {
      style.technicality = 'high';
    }

    if (this.containsUrgentLanguage(messageContent)) {
      style.helpfulness = 'very-high';
      style.formality = 'semi-formal';
    }

    return style;
  }

  async craftResponse(messageContext, context, style) {
    const projectType = context.server.projectType;
    const templates = this.responseTemplates.get(projectType) || this.responseTemplates.get('defi');
    
    const messageContent = messageContext.content.toLowerCase();
    let responseType = 'general';

    // Determine response type
    if (this.isGreeting(messageContent)) {
      responseType = 'greeting';
    } else if (this.isTechnicalDiscussion(messageContent)) {
      responseType = 'technical';
    } else if (this.isTradingDiscussion(messageContent)) {
      responseType = 'trading';
    } else if (this.isCommunityDiscussion(messageContent)) {
      responseType = 'community';
    }

    // Select appropriate template
    const templateCategory = templates[responseType] || templates['greeting'];
    let baseResponse = templateCategory[Math.floor(Math.random() * templateCategory.length)];

    // Customize response with context
    baseResponse = this.customizeResponse(baseResponse, context);

    // Apply style adjustments
    baseResponse = this.applyStyleAdjustments(baseResponse, style);

    return baseResponse;
  }

  customizeResponse(response, context) {
    const projectKnowledge = context.projectKnowledge;
    
    // Replace placeholders with contextual information
    response = response.replace(/{suggestion}/g, this.getSuggestion(context));
    response = response.replace(/{topic}/g, this.getCurrentTopic(context));
    response = response.replace(/{comparison}/g, this.getComparison(context));
    response = response.replace(/{metric}/g, this.getRelevantMetric(context));
    response = response.replace(/{factor}/g, this.getRelevantFactor(context));
    response = response.replace(/{token}/g, projectKnowledge.serverSpecific.tokenomics.symbol || 'the token');
    response = response.replace(/{feature}/g, this.getRelevantFeature(context));
    response = response.replace(/{content}/g, this.getRelevantContent(context));
    response = response.replace(/{item}/g, this.getRelevantItem(context));

    return response;
  }

  applyStyleAdjustments(response, style) {
    // Adjust formality
    if (style.formality === 'very-casual') {
      response = response.replace(/\./g, '!');
      response = response.toLowerCase();
    } else if (style.formality === 'formal') {
      response = response.replace(/!/g, '.');
    }

    // Adjust enthusiasm
    if (style.enthusiasm === 'high') {
      response += ' 🚀';
    } else if (style.enthusiasm === 'low') {
      response = response.replace(/!/g, '.');
    }

    return response;
  }

  shouldRespond(messageContext, context) {
    // Don't respond to bots
    if (messageContext.isFromBot) return false;

    // Don't respond too frequently
    const recentResponses = this.getRecentBotResponses(messageContext.channelId);
    if (recentResponses.length > 3) return false;

    // Respond to direct mentions
    if (messageContext.mentions.some(mention => mention.includes('bot'))) return true;

    // Respond to questions
    if (messageContext.content.includes('?')) return Math.random() < 0.7;

    // Respond to technical discussions
    if (this.isTechnicalDiscussion(messageContext.content)) return Math.random() < 0.4;

    // Random engagement
    return Math.random() < 0.1;
  }

  calculateConfidence(context) {
    let confidence = 0.5;

    // Higher confidence for known project types
    if (context.server.projectType !== 'unknown') confidence += 0.2;

    // Higher confidence with more conversation context
    if (context.conversation.messages.length > 10) confidence += 0.1;

    // Higher confidence for technical discussions in our knowledge base
    if (this.hasRelevantKnowledge(context)) confidence += 0.2;

    return Math.min(confidence, 1.0);
  }

  // Helper methods
  extractConversationTopics(messages) {
    const allTopics = messages.flatMap(msg => msg.topics || []);
    const topicCounts = {};
    
    allTopics.forEach(topic => {
      topicCounts[topic] = (topicCounts[topic] || 0) + 1;
    });

    return Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  assessConversationMood(messages) {
    const avgSentiment = messages.reduce((sum, msg) => sum + (msg.sentiment || 0), 0) / messages.length;
    
    if (avgSentiment > 1) return 'positive';
    if (avgSentiment < -1) return 'negative';
    return 'neutral';
  }

  containsTechnicalTerms(content) {
    const technicalTerms = ['smart contract', 'blockchain', 'defi', 'yield', 'liquidity', 'tokenomics'];
    return technicalTerms.some(term => content.includes(term));
  }

  containsUrgentLanguage(content) {
    const urgentTerms = ['urgent', 'help', 'problem', 'issue', 'bug', 'error'];
    return urgentTerms.some(term => content.includes(term));
  }

  isGreeting(content) {
    const greetings = ['hello', 'hi', 'hey', 'gm', 'good morning', 'good evening'];
    return greetings.some(greeting => content.includes(greeting));
  }

  isTechnicalDiscussion(content) {
    return this.containsTechnicalTerms(content);
  }

  isTradingDiscussion(content) {
    const tradingTerms = ['price', 'buy', 'sell', 'pump', 'dump', 'moon', 'target'];
    return tradingTerms.some(term => content.includes(term));
  }

  isCommunityDiscussion(content) {
    const communityTerms = ['community', 'holders', 'team', 'roadmap', 'announcement'];
    return communityTerms.some(term => content.includes(term));
  }

  getSuggestion(context) {
    const suggestions = ['multi-sig implementation', 'governance voting', 'yield optimization'];
    return suggestions[Math.floor(Math.random() * suggestions.length)];
  }

  getCurrentTopic(context) {
    return context.conversation.topics[0] || 'the protocol';
  }

  getComparison(context) {
    const comparisons = ['Compound', 'Aave', 'Uniswap V3'];
    return comparisons[Math.floor(Math.random() * comparisons.length)];
  }

  getRelevantMetric(context) {
    const metrics = ['TVL', 'volume', 'price action', 'yield'];
    return metrics[Math.floor(Math.random() * metrics.length)];
  }

  getRelevantFactor(context) {
    const factors = ['market volatility', 'gas fees', 'liquidity depth'];
    return factors[Math.floor(Math.random() * factors.length)];
  }

  getRelevantFeature(context) {
    const features = ['staking mechanism', 'governance system', 'reward distribution'];
    return features[Math.floor(Math.random() * features.length)];
  }

  getRelevantContent(context) {
    const content = ['dungeon', 'quest', 'PvP mode', 'tournament'];
    return content[Math.floor(Math.random() * content.length)];
  }

  getRelevantItem(context) {
    const items = ['legendary sword', 'rare armor', 'crafting materials'];
    return items[Math.floor(Math.random() * items.length)];
  }

  getRecentBotResponses(channelId) {
    // This would track recent bot responses to avoid spam
    return [];
  }

  hasRelevantKnowledge(context) {
    const projectType = context.server.projectType;
    return this.knowledgeBase.has(projectType);
  }
}

export default new ContextualEngine();