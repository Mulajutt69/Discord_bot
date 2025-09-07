export class QueueManager {
  constructor() {
    this.replyQueue = [];
    this.newUserQueue = [];
    this.repliedUsers = new Set();
    this.lastMessageTimes = new Map(); // Per server
  }

  addToQueue(message, serverManager) {
    const userId = message.author.id;
    const serverId = message.guild.id;

    // Check if it's a reply to bot
    if (message.reference) {
      this.replyQueue.push({ message, serverManager, priority: 'high' });
      return;
    }

    // Check if new user
    if (!this.repliedUsers.has(`${serverId}-${userId}`)) {
      this.newUserQueue.push({ message, serverManager, priority: 'normal' });
    }
  }

  getNext() {
    // Prioritize replies first
    if (this.replyQueue.length > 0) {
      return this.replyQueue.shift();
    }

    // Then handle new users with some randomization
    if (this.newUserQueue.length > 0 && Math.random() < 0.7) {
      const randomIndex = Math.floor(Math.random() * this.newUserQueue.length);
      const item = this.newUserQueue[randomIndex];
      this.newUserQueue.splice(randomIndex, 1);
      
      // Mark user as replied to
      this.repliedUsers.add(`${item.message.guild.id}-${item.message.author.id}`);
      
      return item;
    }

    return null;
  }

  isEmpty() {
    return this.replyQueue.length === 0 && this.newUserQueue.length === 0;
  }

  getSize() {
    return {
      replies: this.replyQueue.length,
      newUsers: this.newUserQueue.length,
      total: this.replyQueue.length + this.newUserQueue.length
    };
  }

  canSendInServer(serverId) {
    const lastTime = this.lastMessageTimes.get(serverId) || 0;
    const now = Date.now();
    const minDelay = 60000; // 1 minute minimum between messages per server
    
    return (now - lastTime) >= minDelay;
  }

  recordMessageSent(serverId) {
    this.lastMessageTimes.set(serverId, Date.now());
  }
}