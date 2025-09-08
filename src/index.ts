import { Client, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger.js';
import DatabaseManager from './config/database.js';
import WebSocketManager from './core/WebSocketManager.js';
import MessageProcessor from './core/MessageProcessor.js';
import ServerIntelligence from './core/ServerIntelligence.js';
import BehaviorAnalyzer from './core/BehaviorAnalyzer.js';
import QueueManager from './core/QueueManager.js';
import ContextualEngine from './core/ContextualEngine.js';

// Load environment variables
dotenv.config();

const logger = createLogger('Main');

class DiscordBot {
  client: Client | null;
  isReady: boolean;
  connectedServers: Map<string, any>;
  processingThreads: Map<string, any>;

  constructor() {
    this.client = null;
    this.isReady = false;
    this.connectedServers = new Map();
    this.processingThreads = new Map();
  }

  async initialize() {
    try {
      logger.info('Initializing Discord Bot...');

      // Initialize database connections
      await DatabaseManager.connect();
      logger.info('Database connections established');

      // Initialize queue manager
      await QueueManager.initialize();
      logger.info('Queue manager initialized');

      // Initialize WebSocket manager
      WebSocketManager.initialize();
      logger.info('WebSocket manager initialized');

      // Create Discord client with comprehensive intents
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.GuildMembers,
          GatewayIntentBits.GuildPresences,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMessageReactions,
          GatewayIntentBits.DirectMessages,
          GatewayIntentBits.GuildVoiceStates
        ],
        partials: [
          Partials.Message,
          Partials.Channel,
          Partials.Reaction,
          Partials.User,
          Partials.GuildMember
        ]
      });

      // Set up event listeners
      this.setupEventListeners();

      // Login to Discord
      await this.client.login(process.env.DISCORD_TOKEN);
      
      logger.info('Discord Bot initialized successfully');
      
    } catch (error) {
      logger.error('Bot initialization failed:', error);
      throw error;
    }
  }

  setupEventListeners() {
    // Bot ready event
    this.client.once('ready', async () => {
      logger.info(`Bot logged in as ${this.client.user.tag}`);
      this.isReady = true;
      
      // Discover all connected servers
      await this.discoverAllServers();
      
      // Set up periodic tasks
      this.setupPeriodicTasks();
      
      logger.info(`Bot is ready and monitoring ${this.client.guilds.cache.size} servers`);
    });

    // New server joined
    this.client.on('guildCreate', async (guild) => {
      logger.info(`Joined new server: ${guild.name} (${guild.id})`);
      await this.handleNewServer(guild);
    });

    // Server left
    this.client.on('guildDelete', (guild) => {
      logger.info(`Left server: ${guild.name} (${guild.id})`);
      this.handleServerLeave(guild);
    });

    // Message received - main processing entry point
    this.client.on('messageCreate', async (message) => {
      if (!this.isReady) return;
      
      try {
        await this.handleMessage(message);
      } catch (error) {
        logger.error('Message handling error:', error);
      }
    });

    // Message updated
    this.client.on('messageUpdate', async (oldMessage, newMessage) => {
      if (!this.isReady || newMessage.author?.bot) return;
      
      try {
        await this.handleMessageUpdate(oldMessage, newMessage);
      } catch (error) {
        logger.error('Message update handling error:', error);
      }
    });

    // Member joined
    this.client.on('guildMemberAdd', async (member) => {
      try {
        await this.handleMemberJoin(member);
      } catch (error) {
        logger.error('Member join handling error:', error);
      }
    });

    // Member left
    this.client.on('guildMemberRemove', async (member) => {
      try {
        await this.handleMemberLeave(member);
      } catch (error) {
        logger.error('Member leave handling error:', error);
      }
    });

    // Error handling
    this.client.on('error', (error) => {
      logger.error('Discord client error:', error);
    });

    this.client.on('warn', (warning) => {
      logger.warn('Discord client warning:', warning);
    });

    // Set up component event listeners
    this.setupComponentEventListeners();
  }

  setupComponentEventListeners() {
    // Message processor events
    MessageProcessor.on('message_processed', (data) => {
      this.handleProcessedMessage(data);
    });

    // Server intelligence events
    ServerIntelligence.on('server_discovered', (data) => {
      logger.info(`Server profile created: ${data.guild.name}`);
      WebSocketManager.broadcastToServer(data.guild.id, {
        type: 'server_profiled',
        data: data.profile
      });
    });

    // Behavior analyzer events
    BehaviorAnalyzer.on('suspicious_behavior_detected', (data) => {
      logger.warn(`Suspicious behavior detected: User ${data.userId} in server ${data.serverId}`);
      this.handleSuspiciousBehavior(data);
    });

    // WebSocket manager events
    WebSocketManager.on('server_registered', (data) => {
      logger.info(`WebSocket client registered for server ${data.serverId}`);
    });
  }

  async discoverAllServers() {
    logger.info('Discovering all connected servers...');
    
    const discoveryPromises = this.client.guilds.cache.map(async (guild) => {
      try {
        await this.handleNewServer(guild);
      } catch (error) {
        logger.error(`Failed to discover server ${guild.name}:`, error);
      }
    });

    await Promise.all(discoveryPromises);
    logger.info('Server discovery completed');
  }

  async handleNewServer(guild) {
    try {
      // Create server processing thread
      this.createServerProcessingThread(guild.id);
      
      // Add server profiling job to queue
      await QueueManager.addServerProfilingJob(guild, 5);
      
      // Store server connection
      this.connectedServers.set(guild.id, {
        guild,
        joinedAt: new Date(),
        messageCount: 0,
        lastActivity: new Date()
      });

      // Broadcast server join event
      WebSocketManager.broadcastToAll({
        type: 'server_joined',
        serverId: guild.id,
        serverName: guild.name,
        memberCount: guild.memberCount
      });

    } catch (error) {
      logger.error(`New server handling error for ${guild.name}:`, error);
    }
  }

  handleServerLeave(guild) {
    // Clean up server processing thread
    this.removeServerProcessingThread(guild.id);
    
    // Remove from connected servers
    this.connectedServers.delete(guild.id);
    
    // Broadcast server leave event
    WebSocketManager.broadcastToAll({
      type: 'server_left',
      serverId: guild.id,
      serverName: guild.name
    });
  }

  async handleMessage(message) {
    // Skip bot messages for processing but still analyze for patterns
    if (message.author.bot && message.author.id !== this.client.user.id) {
      return;
    }

    const serverId = message.guild?.id;
    if (serverId) {
      // Update server activity
      const serverInfo = this.connectedServers.get(serverId);
      if (serverInfo) {
        serverInfo.messageCount++;
        serverInfo.lastActivity = new Date();
      }
    }

    // Add to real-time processing queue for immediate WebSocket broadcast
    await QueueManager.addRealTimeProcessingJob(message, 10);

    // Add to message analysis queue for detailed processing
    await QueueManager.addMessageAnalysisJob(message, 5);

    // Check if we should generate a contextual response
    if (!message.author.bot) {
      await this.considerContextualResponse(message);
    }
  }

  async handleMessageUpdate(oldMessage, newMessage) {
    // Process message edits for behavior analysis
    if (newMessage.content !== oldMessage.content) {
      logger.debug(`Message edited in ${newMessage.guild?.name}: ${oldMessage.content} -> ${newMessage.content}`);
      
      // This could indicate suspicious behavior if done frequently
      await this.analyzeMessageEdit(oldMessage, newMessage);
    }
  }

  async handleMemberJoin(member) {
    logger.info(`New member joined ${member.guild.name}: ${member.user.username}`);
    
    // Initialize behavior tracking for new member
    const profile = await BehaviorAnalyzer.getUserProfile(member.user.id, member.guild.id);
    
    // Broadcast member join event
    WebSocketManager.broadcastToServer(member.guild.id, {
      type: 'member_joined',
      userId: member.user.id,
      username: member.user.username,
      joinedAt: member.joinedAt
    });
  }

  async handleMemberLeave(member) {
    logger.info(`Member left ${member.guild.name}: ${member.user.username}`);
    
    // Analyze departure patterns (could indicate issues)
    await this.analyzeMemberDeparture(member);
  }

  async considerContextualResponse(message) {
    try {
      const serverProfile = await ServerIntelligence.getServerProfile(message.guild?.id);
      if (!serverProfile) return;

      const messageContext = {
        id: message.id,
        serverId: message.guild?.id,
        channelId: message.channel.id,
        userId: message.author.id,
        content: message.content,
        timestamp: message.createdAt,
        mentions: message.mentions.users.map(user => user.id),
        isFromModerator: message.member?.permissions.has('MANAGE_MESSAGES') || false
      };

      const responseData = await ContextualEngine.generateContextualResponse(messageContext, serverProfile);
      
      if (responseData && responseData.shouldRespond && responseData.confidence > 0.7) {
        // Send response with a slight delay to appear natural
        setTimeout(async () => {
          try {
            await message.channel.send(responseData.response);
            logger.debug(`Sent contextual response in ${message.guild.name}#${message.channel.name}`);
          } catch (error) {
            logger.error('Failed to send contextual response:', error);
          }
        }, Math.random() * 3000 + 1000); // 1-4 second delay
      }
    } catch (error) {
      logger.error('Contextual response consideration error:', error);
    }
  }

  async handleProcessedMessage(data) {
    const { context, analysis, messageDoc } = data;
    
    // Trigger behavior analysis if needed
    if (!context.isFromBot) {
      const messageHistory = await MessageProcessor.getMessageHistory(
        context.serverId,
        context.channelId,
        50
      );
      
      await QueueManager.addBehaviorAnalysisJob(
        context.userId,
        context.serverId,
        messageHistory,
        3
      );
    }

    // Broadcast analysis results
    WebSocketManager.broadcastToServer(context.serverId, {
      type: 'message_analyzed',
      data: {
        messageId: context.id,
        sentiment: analysis.sentiment.score,
        topics: analysis.topics,
        cryptoAnalysis: analysis.cryptoAnalysis
      }
    });
  }

  async handleSuspiciousBehavior(data) {
    const { userId, serverId, suspicionScore, riskFactors } = data;
    
    // Notify moderators if suspicion score is very high
    if (suspicionScore >= 9) {
      await this.notifyModerators(serverId, {
        type: 'high_risk_user',
        userId,
        suspicionScore,
        riskFactors
      });
    }

    // Broadcast suspicious behavior alert
    WebSocketManager.broadcastToServer(serverId, {
      type: 'suspicious_behavior',
      data: {
        userId,
        suspicionScore,
        riskFactors,
        timestamp: new Date()
      }
    });
  }

  async notifyModerators(serverId, alert) {
    try {
      const guild = this.client.guilds.cache.get(serverId);
      if (!guild) return;

      // Find moderator channels
      const modChannels = guild.channels.cache.filter(channel => 
        channel.name.includes('mod') || 
        channel.name.includes('admin') ||
        channel.name.includes('staff')
      );

      const alertMessage = `🚨 **Security Alert**\n` +
        `User: <@${alert.userId}>\n` +
        `Risk Score: ${alert.suspicionScore}/10\n` +
        `Risk Factors: ${alert.riskFactors.join(', ')}\n` +
        `Time: ${new Date().toISOString()}`;

      for (const channel of modChannels.values()) {
        if (channel.isTextBased()) {
          try {
            await channel.send(alertMessage);
          } catch (error) {
            logger.warn(`Could not send alert to ${channel.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      logger.error('Moderator notification error:', error);
    }
  }

  createServerProcessingThread(serverId) {
    // Create dedicated processing context for each server
    this.processingThreads.set(serverId, {
      serverId,
      createdAt: new Date(),
      messageQueue: [],
      isProcessing: false
    });
  }

  removeServerProcessingThread(serverId) {
    this.processingThreads.delete(serverId);
  }

  setupPeriodicTasks() {
    // Server relationship analysis (every hour)
    setInterval(async () => {
      try {
        const relationships = await ServerIntelligence.analyzeServerRelationships();
        logger.info(`Analyzed relationships between ${relationships.length} server pairs`);
      } catch (error) {
        logger.error('Server relationship analysis error:', error);
      }
    }, 60 * 60 * 1000);

    // Behavior pattern updates (every 30 minutes)
    setInterval(async () => {
      try {
        // Process behavior updates for active users
        logger.debug('Running periodic behavior analysis updates');
      } catch (error) {
        logger.error('Periodic behavior analysis error:', error);
      }
    }, 30 * 60 * 1000);

    // System health check (every 5 minutes)
    setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check error:', error);
      }
    }, 5 * 60 * 1000);
  }

  async performHealthCheck() {
    const stats = {
      connectedServers: this.connectedServers.size,
      queueStats: await QueueManager.getAllQueueStats(),
      websocketStats: WebSocketManager.getServerStats(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    logger.debug('System health check:', stats);

    // Broadcast health stats
    WebSocketManager.broadcastToAll({
      type: 'health_check',
      data: stats,
      timestamp: new Date()
    });
  }

  async analyzeMessageEdit(oldMessage, newMessage) {
    // Track message edits for behavior analysis
    const editData = {
      userId: newMessage.author.id,
      serverId: newMessage.guild?.id,
      originalContent: oldMessage.content,
      editedContent: newMessage.content,
      editTime: new Date(),
      timeSinceOriginal: new Date() - oldMessage.createdAt
    };

    // Frequent edits could indicate bot behavior or spam
    logger.debug('Message edit detected:', editData);
  }

  async analyzeMemberDeparture(member) {
    // Analyze member departure patterns
    const departureData = {
      userId: member.user.id,
      serverId: member.guild.id,
      joinedAt: member.joinedAt,
      leftAt: new Date(),
      timeInServer: new Date() - member.joinedAt
    };

    // Very short stays could indicate issues
    if (departureData.timeInServer < 60000) { // Less than 1 minute
      logger.warn(`Rapid departure detected: ${member.user.username} in ${member.guild.name}`);
    }
  }

  async shutdown() {
    logger.info('Shutting down Discord Bot...');
    
    try {
      // Close WebSocket connections
      WebSocketManager.shutdown();
      
      // Shutdown queue manager
      await QueueManager.shutdown();
      
      // Disconnect from databases
      await DatabaseManager.disconnect();
      
      // Logout from Discord
      if (this.client) {
        this.client.destroy();
      }
      
      logger.info('Discord Bot shutdown complete');
    } catch (error) {
      logger.error('Shutdown error:', error);
    }
  }

  getSystemStats() {
    return {
      isReady: this.isReady,
      connectedServers: this.connectedServers.size,
      processingThreads: this.processingThreads.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };
  }
}

// Initialize and start the bot
const bot = new DiscordBot();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await bot.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await bot.shutdown();
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the bot
bot.initialize().catch((error) => {
  logger.error('Failed to start bot:', error);
  process.exit(1);
});

export default bot;