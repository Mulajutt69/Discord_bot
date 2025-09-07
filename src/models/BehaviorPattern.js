import mongoose from 'mongoose';

const behaviorPatternSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  serverId: { type: String, required: true },
  username: String,
  messageFrequency: { type: Number, default: 0 },
  averageMessageLength: { type: Number, default: 0 },
  topicConsistency: { type: Number, default: 0 },
  interactionPatterns: [String],
  suspicionScore: { type: Number, default: 0 },
  isVerified: { type: Boolean, default: false },
  activityWindows: [{
    hour: Number,
    messageCount: Number,
    avgSentiment: Number
  }],
  commonPhrases: [String],
  responsePatterns: {
    averageResponseTime: Number,
    conversationInitiation: Number,
    reactionUsage: Number
  },
  riskFactors: [String],
  lastAnalysis: { type: Date, default: Date.now }
}, {
  timestamps: true
});

behaviorPatternSchema.index({ userId: 1, serverId: 1 }, { unique: true });
behaviorPatternSchema.index({ suspicionScore: -1 });
behaviorPatternSchema.index({ lastAnalysis: -1 });

export default mongoose.model('BehaviorPattern', behaviorPatternSchema);