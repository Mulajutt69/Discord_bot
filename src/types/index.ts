export interface ServerProfile {
  id: string;
  name: string;
  projectType: 'defi' | 'nft' | 'gaming' | 'infrastructure' | 'meme' | 'unknown';
  tokenomics?: {
    symbol?: string;
    totalSupply?: string;
    marketCap?: string;
    exchanges?: string[];
  };
  technology: {
    blockchain?: string;
    protocols?: string[];
    smartContracts?: string[];
  };
  partnerships: string[];
  roadmapStatus: 'pre-launch' | 'mainnet' | 'scaling' | 'mature';
  communityMetrics: {
    memberCount: number;
    activeUsers: number;
    messageVolume: number;
    engagementScore: number;
  };
  moderatorPatterns: {
    verificationMethods: string[];
    botDetectionSignals: string[];
    communicationStyle: string;
  };
  lastUpdated: Date;
}

export interface MessageContext {
  id: string;
  serverId: string;
  channelId: string;
  userId: string;
  content: string;
  timestamp: Date;
  isFromModerator: boolean;
  isFromBot: boolean;
  sentiment: number;
  topics: string[];
  mentions: string[];
  attachments: string[];
}

export interface ConversationThread {
  id: string;
  serverId: string;
  channelId: string;
  participants: string[];
  messages: MessageContext[];
  topic: string;
  startTime: Date;
  lastActivity: Date;
  isActive: boolean;
}

export interface BehaviorPattern {
  userId: string;
  serverId: string;
  messageFrequency: number;
  averageMessageLength: number;
  topicConsistency: number;
  interactionPatterns: string[];
  suspicionScore: number;
  isVerified: boolean;
}

export interface WebSocketMessage {
  type: 'message' | 'server_join' | 'server_leave' | 'analysis_result';
  serverId: string;
  data: any;
  timestamp: Date;
}

export interface AnalysisJob {
  id: string;
  type: 'message_analysis' | 'server_profiling' | 'behavior_analysis';
  serverId: string;
  data: any;
  priority: number;
  createdAt: Date;
}