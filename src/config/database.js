import mongoose from 'mongoose';
import Redis from 'redis';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('Database');

class DatabaseManager {
  constructor() {
    this.mongodb = null;
    this.redis = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // MongoDB Connection
      this.mongodb = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('MongoDB connected successfully');

      // Redis Connection
      this.redis = Redis.createClient({
        url: process.env.REDIS_URL,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            logger.error('Redis server refused connection');
            return new Error('Redis server refused connection');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Redis retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      await this.redis.connect();
      logger.info('Redis connected successfully');

      this.isConnected = true;
      return true;
    } catch (error) {
      logger.error('Database connection failed:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      if (this.mongodb) {
        await mongoose.disconnect();
        logger.info('MongoDB disconnected');
      }
      
      if (this.redis) {
        await this.redis.quit();
        logger.info('Redis disconnected');
      }
      
      this.isConnected = false;
    } catch (error) {
      logger.error('Database disconnection error:', error);
    }
  }

  getRedis() {
    if (!this.redis || !this.isConnected) {
      throw new Error('Redis not connected');
    }
    return this.redis;
  }

  getMongoDB() {
    if (!this.mongodb || !this.isConnected) {
      throw new Error('MongoDB not connected');
    }
    return this.mongodb;
  }
}

export default new DatabaseManager();