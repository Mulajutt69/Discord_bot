import Bull from 'bull';
import { createLogger } from '../utils/logger.js';
import DatabaseManager from '../config/database.js';

const logger = createLogger('QueueManager');

class QueueManager {
  constructor() {
    this.queues = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      const redis = DatabaseManager.getRedis();
      
      // Create different queues for different types of processing
      this.queues.set('message_analysis', new Bull('message analysis', {
        redis: { port: 6379, host: 'localhost' },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: 'exponential'
        }
      }));

      this.queues.set('server_profiling', new Bull('server profiling', {
        redis: { port: 6379, host: 'localhost' },
        defaultJobOptions: {
          removeOnComplete: 50,
          removeOnFail: 25,
          attempts: 2,
          backoff: 'fixed'
        }
      }));

      this.queues.set('behavior_analysis', new Bull('behavior analysis', {
        redis: { port: 6379, host: 'localhost' },
        defaultJobOptions: {
          removeOnComplete: 75,
          removeOnFail: 30,
          attempts: 3,
          backoff: 'exponential'
        }
      }));

      this.queues.set('real_time_processing', new Bull('real time processing', {
        redis: { port: 6379, host: 'localhost' },
        defaultJobOptions: {
          removeOnComplete: 200,
          removeOnFail: 100,
          attempts: 1, // Real-time processing shouldn't retry
          delay: 0
        }
      }));

      // Set up queue processors
      this.setupQueueProcessors();
      
      // Set up queue event listeners
      this.setupQueueEventListeners();

      this.isInitialized = true;
      logger.info('Queue manager initialized successfully');
      
    } catch (error) {
      logger.error('Queue manager initialization failed:', error);
      throw error;
    }
  }

  setupQueueProcessors() {
    // Message analysis processor
    this.queues.get('message_analysis').process('analyze_message', 10, async (job) => {
      const { messageData, serverId } = job.data;
      
      try {
        const MessageProcessor = (await import('./MessageProcessor.js')).default;
        const result = await MessageProcessor.processMessage(messageData);
        
        job.progress(100);
        return result;
      } catch (error) {
        logger.error('Message analysis job failed:', error);
        throw error;
      }
    });

    // Server profiling processor
    this.queues.get('server_profiling').process('profile_server', 5, async (job) => {
      const { guild } = job.data;
      
      try {
        const ServerIntelligence = (await import('./ServerIntelligence.js')).default;
        const result = await ServerIntelligence.discoverServer(guild);
        
        job.progress(100);
        return result;
      } catch (error) {
        logger.error('Server profiling job failed:', error);
        throw error;
      }
    });

    // Behavior analysis processor
    this.queues.get('behavior_analysis').process('analyze_behavior', 8, async (job) => {
      const { userId, serverId, messageHistory } = job.data;
      
      try {
        const BehaviorAnalyzer = (await import('./BehaviorAnalyzer.js')).default;
        const result = await BehaviorAnalyzer.analyzeUserBehavior(userId, serverId, messageHistory);
        
        job.progress(100);
        return result;
      } catch (error) {
        logger.error('Behavior analysis job failed:', error);
        throw error;
      }
    });

    // Real-time processing processor
    this.queues.get('real_time_processing').process('real_time_message', 20, async (job) => {
      const { messageData, priority } = job.data;
      
      try {
        // Fast processing for real-time responses
        const WebSocketManager = (await import('./WebSocketManager.js')).default;
        
        // Broadcast to relevant clients immediately
        WebSocketManager.broadcastToServer(messageData.guild?.id, {
          type: 'message_processed',
          data: messageData
        });
        
        job.progress(100);
        return { processed: true, timestamp: new Date() };
      } catch (error) {
        logger.error('Real-time processing job failed:', error);
        throw error;
      }
    });
  }

  setupQueueEventListeners() {
    this.queues.forEach((queue, queueName) => {
      queue.on('completed', (job, result) => {
        logger.debug(`Job ${job.id} in queue ${queueName} completed`);
      });

      queue.on('failed', (job, err) => {
        logger.error(`Job ${job.id} in queue ${queueName} failed:`, err);
      });

      queue.on('stalled', (job) => {
        logger.warn(`Job ${job.id} in queue ${queueName} stalled`);
      });

      queue.on('progress', (job, progress) => {
        logger.debug(`Job ${job.id} in queue ${queueName} progress: ${progress}%`);
      });
    });
  }

  async addJob(queueName, jobType, data, options = {}) {
    try {
      if (!this.isInitialized) {
        throw new Error('Queue manager not initialized');
      }

      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const job = await queue.add(jobType, data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        ...options
      });

      logger.debug(`Job ${job.id} added to queue ${queueName}`);
      return job;
      
    } catch (error) {
      logger.error(`Failed to add job to queue ${queueName}:`, error);
      throw error;
    }
  }

  async addMessageAnalysisJob(messageData, priority = 0) {
    return this.addJob('message_analysis', 'analyze_message', {
      messageData,
      serverId: messageData.guild?.id
    }, { priority });
  }

  async addServerProfilingJob(guild, priority = 0) {
    return this.addJob('server_profiling', 'profile_server', {
      guild
    }, { priority });
  }

  async addBehaviorAnalysisJob(userId, serverId, messageHistory, priority = 0) {
    return this.addJob('behavior_analysis', 'analyze_behavior', {
      userId,
      serverId,
      messageHistory
    }, { priority });
  }

  async addRealTimeProcessingJob(messageData, priority = 10) {
    return this.addJob('real_time_processing', 'real_time_message', {
      messageData,
      priority
    }, { priority, attempts: 1 });
  }

  async getQueueStats(queueName) {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} not found`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed(),
        queue.getDelayed()
      ]);

      return {
        queueName,
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length
      };
    } catch (error) {
      logger.error(`Failed to get stats for queue ${queueName}:`, error);
      return null;
    }
  }

  async getAllQueueStats() {
    const stats = {};
    
    for (const queueName of this.queues.keys()) {
      stats[queueName] = await this.getQueueStats(queueName);
    }
    
    return stats;
  }

  async pauseQueue(queueName) {
    try {
      const queue = this.queues.get(queueName);
      if (queue) {
        await queue.pause();
        logger.info(`Queue ${queueName} paused`);
      }
    } catch (error) {
      logger.error(`Failed to pause queue ${queueName}:`, error);
    }
  }

  async resumeQueue(queueName) {
    try {
      const queue = this.queues.get(queueName);
      if (queue) {
        await queue.resume();
        logger.info(`Queue ${queueName} resumed`);
      }
    } catch (error) {
      logger.error(`Failed to resume queue ${queueName}:`, error);
    }
  }

  async clearQueue(queueName) {
    try {
      const queue = this.queues.get(queueName);
      if (queue) {
        await queue.empty();
        logger.info(`Queue ${queueName} cleared`);
      }
    } catch (error) {
      logger.error(`Failed to clear queue ${queueName}:`, error);
    }
  }

  async shutdown() {
    try {
      logger.info('Shutting down queue manager...');
      
      const shutdownPromises = Array.from(this.queues.values()).map(queue => 
        queue.close()
      );
      
      await Promise.all(shutdownPromises);
      
      this.queues.clear();
      this.isInitialized = false;
      
      logger.info('Queue manager shutdown complete');
    } catch (error) {
      logger.error('Queue manager shutdown error:', error);
    }
  }
}

export default new QueueManager();