import { EventEmitter } from 'events';
import { createLogger } from '../utils/logger.js';
import BehaviorPattern from '../models/BehaviorPattern.js';
import MessageContext from '../models/MessageContext.js';

const logger = createLogger('BehaviorAnalyzer');

class BehaviorAnalyzer extends EventEmitter {
  constructor() {
    super();
    this.userProfiles = new Map();
    this.suspiciousPatterns = new Set([
      'rapid_messaging',
      'copy_paste_content',
      'unusual_timing',
      'generic_responses',
      'no_natural_conversation',
      'identical_message_structure'
    ]);
  }

  async analyzeUserBehavior(userId, serverId, messageHistory) {
    try {
      const profile = await this.getUserProfile(userId, serverId);
      const analysis = await this.performBehaviorAnalysis(profile, messageHistory);
      
      await this.updateBehaviorPattern(userId, serverId, analysis);
      
      if (analysis.suspicionScore > 7) {
        this.emit('suspicious_behavior_detected', {
          userId,
          serverId,
          suspicionScore: analysis.suspicionScore,
          riskFactors: analysis.riskFactors
        });
      }

      return analysis;
    } catch (error) {
      logger.error('Behavior analysis error:', error);
      throw error;
    }
  }

  async getUserProfile(userId, serverId) {
    const key = `${userId}_${serverId}`;
    let profile = this.userProfiles.get(key);

    if (!profile) {
      const behaviorDoc = await BehaviorPattern.findOne({ userId, serverId });
      if (behaviorDoc) {
        profile = behaviorDoc.toObject();
      } else {
        profile = await this.createNewUserProfile(userId, serverId);
      }
      this.userProfiles.set(key, profile);
    }

    return profile;
  }

  async createNewUserProfile(userId, serverId) {
    return {
      userId,
      serverId,
      messageFrequency: 0,
      averageMessageLength: 0,
      topicConsistency: 0,
      interactionPatterns: [],
      suspicionScore: 0,
      isVerified: false,
      activityWindows: new Array(24).fill(0).map((_, hour) => ({
        hour,
        messageCount: 0,
        avgSentiment: 0
      })),
      commonPhrases: [],
      responsePatterns: {
        averageResponseTime: 0,
        conversationInitiation: 0,
        reactionUsage: 0
      },
      riskFactors: [],
      lastAnalysis: new Date()
    };
  }

  async performBehaviorAnalysis(profile, messageHistory) {
    const analysis = {
      messageFrequency: this.analyzeMessageFrequency(messageHistory),
      averageMessageLength: this.calculateAverageMessageLength(messageHistory),
      topicConsistency: this.analyzeTopicConsistency(messageHistory),
      interactionPatterns: this.analyzeInteractionPatterns(messageHistory),
      suspicionScore: 0,
      riskFactors: [],
      activityPattern: this.analyzeActivityPattern(messageHistory),
      responsePatterns: this.analyzeResponsePatterns(messageHistory),
      contentAnalysis: this.analyzeContentPatterns(messageHistory)
    };

    // Calculate suspicion score
    analysis.suspicionScore = this.calculateSuspicionScore(analysis);
    analysis.riskFactors = this.identifyRiskFactors(analysis);

    return analysis;
  }

  analyzeMessageFrequency(messageHistory) {
    if (messageHistory.length === 0) return 0;

    const timeSpan = Date.now() - new Date(messageHistory[messageHistory.length - 1].timestamp).getTime();
    const hoursSpan = timeSpan / (1000 * 60 * 60);
    
    return messageHistory.length / Math.max(hoursSpan, 1);
  }

  calculateAverageMessageLength(messageHistory) {
    if (messageHistory.length === 0) return 0;

    const totalLength = messageHistory.reduce((sum, msg) => sum + msg.content.length, 0);
    return totalLength / messageHistory.length;
  }

  analyzeTopicConsistency(messageHistory) {
    if (messageHistory.length === 0) return 0;

    const allTopics = messageHistory.flatMap(msg => msg.topics || []);
    const uniqueTopics = new Set(allTopics);
    
    // Higher consistency means fewer unique topics relative to total messages
    return Math.max(0, 1 - (uniqueTopics.size / messageHistory.length));
  }

  analyzeInteractionPatterns(messageHistory) {
    const patterns = [];
    
    // Check for reply patterns
    const replyCount = messageHistory.filter(msg => 
      msg.content.includes('@') || msg.mentions.length > 0
    ).length;
    
    if (replyCount / messageHistory.length > 0.8) {
      patterns.push('high_reply_rate');
    }

    // Check for reaction patterns
    const reactionCount = messageHistory.filter(msg => 
      msg.content.includes('👍') || msg.content.includes('❤️')
    ).length;
    
    if (reactionCount / messageHistory.length > 0.5) {
      patterns.push('high_reaction_usage');
    }

    // Check for conversation initiation
    const initiationCount = messageHistory.filter((msg, index) => {
      if (index === 0) return true;
      const prevMsg = messageHistory[index - 1];
      const timeDiff = new Date(msg.timestamp) - new Date(prevMsg.timestamp);
      return timeDiff > 300000; // 5 minutes gap
    }).length;

    if (initiationCount / messageHistory.length > 0.3) {
      patterns.push('frequent_conversation_starter');
    }

    return patterns;
  }

  analyzeActivityPattern(messageHistory) {
    const hourlyActivity = new Array(24).fill(0);
    
    messageHistory.forEach(msg => {
      const hour = new Date(msg.timestamp).getHours();
      hourlyActivity[hour]++;
    });

    // Detect unusual patterns
    const maxActivity = Math.max(...hourlyActivity);
    const avgActivity = hourlyActivity.reduce((a, b) => a + b, 0) / 24;
    
    return {
      hourlyDistribution: hourlyActivity,
      peakHour: hourlyActivity.indexOf(maxActivity),
      activitySpread: hourlyActivity.filter(count => count > 0).length,
      isUnusualPattern: maxActivity > avgActivity * 5 // Very concentrated activity
    };
  }

  analyzeResponsePatterns(messageHistory) {
    const responseTimes = [];
    const conversationStarts = [];
    
    for (let i = 1; i < messageHistory.length; i++) {
      const currentMsg = messageHistory[i];
      const prevMsg = messageHistory[i - 1];
      
      if (currentMsg.userId === prevMsg.userId) continue;
      
      const responseTime = new Date(currentMsg.timestamp) - new Date(prevMsg.timestamp);
      if (responseTime < 300000) { // Within 5 minutes
        responseTimes.push(responseTime);
      }
    }

    const avgResponseTime = responseTimes.length > 0 ? 
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;

    return {
      averageResponseTime: avgResponseTime,
      totalResponses: responseTimes.length,
      fastResponses: responseTimes.filter(time => time < 10000).length, // Under 10 seconds
      conversationInitiation: conversationStarts.length
    };
  }

  analyzeContentPatterns(messageHistory) {
    const contents = messageHistory.map(msg => msg.content.toLowerCase());
    
    // Check for repetitive content
    const uniqueContents = new Set(contents);
    const repetitionRate = 1 - (uniqueContents.size / contents.length);
    
    // Check for common phrases
    const phrases = contents.flatMap(content => 
      content.split(/[.!?]+/).map(phrase => phrase.trim())
    ).filter(phrase => phrase.length > 10);
    
    const phraseFrequency = {};
    phrases.forEach(phrase => {
      phraseFrequency[phrase] = (phraseFrequency[phrase] || 0) + 1;
    });

    const commonPhrases = Object.entries(phraseFrequency)
      .filter(([phrase, count]) => count > 2)
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Check for generic responses
    const genericPatterns = [
      /^(yes|no|ok|sure|thanks|thank you)$/i,
      /^(lol|haha|nice|cool|awesome)$/i,
      /^(good|great|amazing|perfect)$/i
    ];

    const genericCount = contents.filter(content =>
      genericPatterns.some(pattern => pattern.test(content.trim()))
    ).length;

    return {
      repetitionRate,
      commonPhrases,
      genericResponseRate: genericCount / contents.length,
      averageWordsPerMessage: contents.reduce((sum, content) => 
        sum + content.split(' ').length, 0) / contents.length
    };
  }

  calculateSuspicionScore(analysis) {
    let score = 0;

    // High message frequency (potential spam)
    if (analysis.messageFrequency > 10) score += 2;
    if (analysis.messageFrequency > 20) score += 3;

    // Very short or very long messages consistently
    if (analysis.averageMessageLength < 10 || analysis.averageMessageLength > 500) {
      score += 1;
    }

    // High repetition rate
    if (analysis.contentAnalysis.repetitionRate > 0.7) score += 3;
    if (analysis.contentAnalysis.repetitionRate > 0.9) score += 5;

    // High generic response rate
    if (analysis.contentAnalysis.genericResponseRate > 0.8) score += 2;

    // Unusual activity patterns
    if (analysis.activityPattern.isUnusualPattern) score += 2;

    // Very fast response times (potential bot)
    if (analysis.responsePatterns.fastResponses > analysis.responsePatterns.totalResponses * 0.8) {
      score += 3;
    }

    // Low topic consistency (jumping between unrelated topics)
    if (analysis.topicConsistency < 0.2) score += 1;

    return Math.min(score, 10); // Cap at 10
  }

  identifyRiskFactors(analysis) {
    const riskFactors = [];

    if (analysis.messageFrequency > 15) {
      riskFactors.push('excessive_messaging_frequency');
    }

    if (analysis.contentAnalysis.repetitionRate > 0.8) {
      riskFactors.push('high_content_repetition');
    }

    if (analysis.contentAnalysis.genericResponseRate > 0.7) {
      riskFactors.push('generic_responses');
    }

    if (analysis.activityPattern.isUnusualPattern) {
      riskFactors.push('unusual_activity_timing');
    }

    if (analysis.responsePatterns.fastResponses > analysis.responsePatterns.totalResponses * 0.7) {
      riskFactors.push('suspiciously_fast_responses');
    }

    if (analysis.averageMessageLength < 5) {
      riskFactors.push('extremely_short_messages');
    }

    return riskFactors;
  }

  async updateBehaviorPattern(userId, serverId, analysis) {
    try {
      const updateData = {
        messageFrequency: analysis.messageFrequency,
        averageMessageLength: analysis.averageMessageLength,
        topicConsistency: analysis.topicConsistency,
        interactionPatterns: analysis.interactionPatterns,
        suspicionScore: analysis.suspicionScore,
        activityWindows: analysis.activityPattern.hourlyDistribution.map((count, hour) => ({
          hour,
          messageCount: count,
          avgSentiment: 0 // This would be calculated from message sentiment
        })),
        commonPhrases: analysis.contentAnalysis.commonPhrases.map(p => p.phrase),
        responsePatterns: analysis.responsePatterns,
        riskFactors: analysis.riskFactors,
        lastAnalysis: new Date()
      };

      await BehaviorPattern.findOneAndUpdate(
        { userId, serverId },
        updateData,
        { upsert: true, new: true }
      );

      // Update in-memory cache
      const key = `${userId}_${serverId}`;
      this.userProfiles.set(key, { ...this.userProfiles.get(key), ...updateData });

    } catch (error) {
      logger.error('Behavior pattern update error:', error);
    }
  }

  async getSuspiciousUsers(serverId, threshold = 7) {
    try {
      return await BehaviorPattern.find({
        serverId,
        suspicionScore: { $gte: threshold }
      }).sort({ suspicionScore: -1 }).lean();
    } catch (error) {
      logger.error('Suspicious users query error:', error);
      return [];
    }
  }

  async getServerBehaviorStats(serverId) {
    try {
      const patterns = await BehaviorPattern.find({ serverId }).lean();
      
      return {
        totalUsers: patterns.length,
        suspiciousUsers: patterns.filter(p => p.suspicionScore >= 7).length,
        verifiedUsers: patterns.filter(p => p.isVerified).length,
        averageSuspicionScore: patterns.reduce((sum, p) => sum + p.suspicionScore, 0) / patterns.length,
        riskFactorDistribution: this.getRiskFactorDistribution(patterns)
      };
    } catch (error) {
      logger.error('Server behavior stats error:', error);
      return null;
    }
  }

  getRiskFactorDistribution(patterns) {
    const distribution = {};
    
    patterns.forEach(pattern => {
      pattern.riskFactors.forEach(factor => {
        distribution[factor] = (distribution[factor] || 0) + 1;
      });
    });

    return Object.entries(distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);
  }

  async learnFromModeratorActions(moderatorId, serverId, actionType, targetUserId, reason) {
    try {
      // Learn from moderator decisions to improve detection
      const targetProfile = await this.getUserProfile(targetUserId, serverId);
      
      if (actionType === 'ban' || actionType === 'kick') {
        // This user was deemed problematic, learn from their patterns
        this.updateSuspiciousPatterns(targetProfile);
      } else if (actionType === 'verify') {
        // This user was verified as legitimate
        await this.updateBehaviorPattern(targetUserId, serverId, {
          ...targetProfile,
          isVerified: true,
          suspicionScore: Math.max(0, targetProfile.suspicionScore - 2)
        });
      }

      this.emit('moderator_action_learned', {
        moderatorId,
        serverId,
        actionType,
        targetUserId,
        reason
      });

    } catch (error) {
      logger.error('Moderator action learning error:', error);
    }
  }

  updateSuspiciousPatterns(profile) {
    // Add patterns from banned users to suspicious pattern detection
    if (profile.riskFactors.length > 0) {
      profile.riskFactors.forEach(factor => {
        this.suspiciousPatterns.add(factor);
      });
    }
  }
}

export default new BehaviorAnalyzer();