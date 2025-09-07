import { Client, GatewayIntentBits } from 'discord.js';
import { BotManager } from './core/BotManager.js';
import { DatabaseManager } from './database/DatabaseManager.js';
import { ConfigManager } from './config/ConfigManager.js';

const token = process.env.DISCORD_TOKEN || 'your-discord-bot-token-here';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

async function initializeBot() {
  try {
    console.log('🚀 Initializing Multi-Server Discord Bot...');
    
    // Initialize database
    const db = new DatabaseManager();
    await db.initialize();
    
    // Initialize configuration
    const config = new ConfigManager();
    await config.loadConfigs();
    
    // Initialize bot manager
    const botManager = new BotManager(client, db, config);
    await botManager.initialize();
    
    // Login to Discord
    await client.login(TOKEN);
    
    console.log('✅ Bot successfully initialized and logged in!');
  } catch (error) {
    console.error('❌ Failed to initialize bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down bot...');
  await client.destroy();
  process.exit(0);
});

initializeBot();