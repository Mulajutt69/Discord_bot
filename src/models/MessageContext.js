import mongoose from 'mongoose';

const messageContextSchema = new mongoose.Schema({
  messageId: { type: String, required: true, unique: true },
  serverId: { type: String, required: true },
  channelId: { type: String, required: true },
  userId: { type: String, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, required: true },
  isFromModerator: { type: Boolean, default: false },
  isFromBot: { type: Boolean, default: false },
  sentiment: { type: Number, default: 0 },
  topics: [String],
  mentions: [String],
  attachments: [String],
  analysisResults: {
    cryptoMentions: [String],
    technicalTerms: [String],
    priceDiscussion: Boolean,
    tradingSignals: [String],
    projectUpdates: [String]
  },
  processed: { type: Boolean, default: false }
}, {
  timestamps: true
});

messageContextSchema.index({ serverId: 1, timestamp: -1 });
messageContextSchema.index({ userId: 1, timestamp: -1 });
messageContextSchema.index({ channelId: 1, timestamp: -1 });
messageContextSchema.index({ processed: 1 });

export default mongoose.model('MessageContext', messageContextSchema);