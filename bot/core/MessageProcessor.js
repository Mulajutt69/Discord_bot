import axios from 'axios';

export class MessageProcessor {
  constructor(learningEngine, config, cryptoAnalyzer) {
    this.learningEngine = learningEngine;
    this.config = config;
    this.cryptoAnalyzer = cryptoAnalyzer;
    this.const groqApiKey = process.env.GROQ_API_KEY || 'your-groq-api-key-here';
  }

  async shouldRespond(message, serverManager) {
    // Check if it's a reply to our bot
    if (message.reference) {
      try {
        const referencedMessage = await message.channel.fetch(message.reference.messageId);
        if (referencedMessage.author.id === message.client.user.id) {
          return true; // Always respond to replies
        }
      } catch (error) {
        // Ignore fetch errors
      }
    }

    // Check server-specific engagement rules
    return serverManager.shouldEngageWithUser(message.author.id, message.content);
  }

  async generateResponse(message, serverManager) {
    const personality = serverManager.getPersonality();
    const serverContext = serverManager.getServerContext();
    const userProfile = await this.learningEngine.getUserProfile(message.author.id, message.guild.id);
    
    // Get crypto project analysis
    const projectProfile = this.cryptoAnalyzer.getProjectProfile(message.guild.id);
    const messageAnalysis = await this.cryptoAnalyzer.analyzeMessage(message, projectProfile);
    const cryptoContext = await this.cryptoAnalyzer.generateCryptoResponse(message, projectProfile, messageAnalysis);

    // Build context-aware system prompt
    const systemPrompt = this.buildSystemPrompt(personality, serverContext, userProfile, projectProfile, cryptoContext);

    try {
      const response = await this.callGroqAPI(message.content, systemPrompt);
      
      // Learn from our response
      await this.learningEngine.recordBotResponse(
        message.guild.id, 
        message.author.id, 
        message.content, 
        response
      );

      return response;
    } catch (error) {
      console.error('❌ AI API Error:', error);
      return this.getFallbackResponse(message, serverContext);
    }
  }

  buildSystemPrompt(personality, serverContext, userProfile, projectProfile, cryptoContext) {
    let prompt = `You're ${personality.name}, a ${personality.age}-year-old from ${personality.location}. `;
    prompt += `Your level is ${personality.level}, targeting ${personality.target}. `;

    // Add crypto project context
    if (projectProfile && projectProfile.projectName) {
      prompt += `You're in the ${projectProfile.projectName} community`;
      if (projectProfile.tokenSymbol) {
        prompt += ` ($${projectProfile.tokenSymbol})`;
      }
      prompt += `. This is a ${projectProfile.projectType || 'crypto'} project. `;
      
      if (projectProfile.keyFeatures.length > 0) {
        prompt += `Key features: ${projectProfile.keyFeatures.join(', ')}. `;
      }
    }

    // Add crypto-specific context
    if (cryptoContext && cryptoContext.relevance > 0) {
      prompt += cryptoContext.context;
    }

    // Add server-specific context
    switch (serverContext.serverType) {
      case 'crypto':
        prompt += "Focus on crypto trading, DeFi, tokenomics, and market analysis. ";
        prompt += "Use crypto slang like 'gm', 'wagmi', 'ngmi', 'ape in', 'diamond hands'. ";
        break;
      case 'gaming':
        prompt += "You're in a gaming server. Discuss games, strategies, and gaming culture. ";
        break;
      case 'dev':
        prompt += "You're in a development server. Help with coding, tech discussions, and programming. ";
        break;
      default:
        prompt += "Adapt to the conversation topic naturally. ";
    }

    // Crypto-specific response style
    if (projectProfile && projectProfile.projectType) {
      prompt += "Keep replies crypto-focused, use relevant emojis like 🚀📈💎🔥⚡. ";
    }
    
    prompt += "Keep replies short (3-15 words), casual, and engaging. ";
    prompt += "Use slang like 'fr', 'deadass', 'ngl'. ";
    prompt += "Show excitement with 🚀 and 🔥. ";
    prompt += "If unsure, say 'idk man' or 'lol what?'. ";

    // Add user-specific context
    if (userProfile.communicationStyle !== 'neutral') {
      prompt += `The user tends to be ${userProfile.communicationStyle}. Match their energy. `;
    }
    
    // Add crypto engagement boost
    if (cryptoContext && cryptoContext.shouldEngage) {
      prompt += "This message is crypto-relevant, engage actively and show knowledge. ";
    }

    return prompt;
  }

  async callGroqAPI(content, systemPrompt) {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama3-70b-8192',
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    return response.data.choices[0].message.content.trim();
  }

  getFallbackResponse(message, serverContext) {
    const fallbacks = {
      crypto: ["charts looking wild rn 📈", "hodl strong 💎", "to the moon 🚀"],
      gaming: ["gg bro 🎮", "that's sick fr", "let's gooo 🔥"],
      dev: ["code looks clean 👨‍💻", "nice solution!", "debug time lol"],
      general: ["fr tho", "that's wild", "ngl that's cool", "deadass 💯"]
    };

    const responses = fallbacks[serverContext.serverType] || fallbacks.general;
    return responses[Math.floor(Math.random() * responses.length)];
  }
}