import mongoose from 'mongoose';

const tokenomicsSchema = new mongoose.Schema({
  symbol: String,
  totalSupply: String,
  marketCap: String,
  exchanges: [String]
});

const technologySchema = new mongoose.Schema({
  blockchain: String,
  protocols: [String],
  smartContracts: [String]
});

const communityMetricsSchema = new mongoose.Schema({
  memberCount: { type: Number, default: 0 },
  activeUsers: { type: Number, default: 0 },
  messageVolume: { type: Number, default: 0 },
  engagementScore: { type: Number, default: 0 }
});

const moderatorPatternsSchema = new mongoose.Schema({
  verificationMethods: [String],
  botDetectionSignals: [String],
  communicationStyle: String
});

const serverProfileSchema = new mongoose.Schema({
  serverId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  projectType: {
    type: String,
    enum: ['defi', 'nft', 'gaming', 'infrastructure', 'meme', 'unknown'],
    default: 'unknown'
  },
  tokenomics: tokenomicsSchema,
  technology: technologySchema,
  partnerships: [String],
  roadmapStatus: {
    type: String,
    enum: ['pre-launch', 'mainnet', 'scaling', 'mature'],
    default: 'pre-launch'
  },
  communityMetrics: communityMetricsSchema,
  moderatorPatterns: moderatorPatternsSchema,
  analysisData: {
    announcementChannels: [String],
    pinnedMessages: [String],
    teamRoles: [String],
    officialLinks: [String]
  },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

serverProfileSchema.index({ serverId: 1 });
serverProfileSchema.index({ projectType: 1 });
serverProfileSchema.index({ lastUpdated: -1 });

export default mongoose.model('ServerProfile', serverProfileSchema);