import React, { useState } from 'react';
import { Plus, Settings, Users, MessageCircle, Target, Crown } from 'lucide-react';

export function ServerConfig() {
  const [servers] = useState([
    {
      id: '1',
      name: 'DeFi Protocol Community',
      type: 'crypto',
      projectName: 'DeFi Protocol',
      tokenSymbol: 'DEFI',
      memberCount: 15420,
      targetChannels: ['#general', '#announcements', '#defi-discussion'],
      personality: 'crypto-enthusiast',
      engagementRate: 40,
      currentLevel: 23,
      targetLevel: 27,
      earnedRoles: ['DeFi Farmer', 'Liquidity Provider'],
      targetRoles: ['Protocol Contributor', 'Governance Member', 'Ambassador'],
      status: 'active'
    },
    {
      id: '2',
      name: 'Layer1 Blockchain',
      type: 'crypto',
      projectName: 'Layer1 Chain',
      tokenSymbol: 'L1',
      memberCount: 8930,
      targetChannels: ['#general', '#validators', '#development'],
      personality: 'crypto-tech',
      engagementRate: 25,
      currentLevel: 18,
      targetLevel: 25,
      earnedRoles: ['Node Operator'],
      targetRoles: ['Validator', 'Core Contributor', 'Technical Lead'],
      status: 'active'
    },
    {
      id: '3',
      name: 'Meme Coin Community',
      type: 'crypto',
      projectName: 'Meme Coin',
      tokenSymbol: 'MEME',
      memberCount: 12100,
      targetChannels: ['#general', '#memes', '#trading'],
      personality: 'meme-crypto',
      engagementRate: 35,
      currentLevel: 15,
      targetLevel: 20,
      earnedRoles: ['Diamond Hands'],
      targetRoles: ['Whale', 'Meme Lord', 'Community Leader'],
      status: 'paused'
    }
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'text-yellow-400 bg-yellow-500/10';
      case 'defi': return 'text-green-400 bg-green-500/10';
      case 'dev': return 'text-blue-400 bg-blue-500/10';
      case 'gaming': return 'text-green-400 bg-green-500/10';
      default: return 'text-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Server Configuration</h2>
        <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add Server</span>
        </button>
      </div>

      {/* Servers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {servers.map((server) => (
          <div key={server.id} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200">
            {/* Server Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)}`}></div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{server.name}</h3>
                  {server.projectName && (
                    <p className="text-sm text-slate-400">
                      {server.projectName} {server.tokenSymbol && `($${server.tokenSymbol})`}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded-md text-xs font-medium ${getTypeColor(server.type)}`}>
                  {server.type}
                </span>
              </div>
              <button className="text-slate-400 hover:text-white transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Server Stats */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-sm">{server.memberCount.toLocaleString()} members</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-slate-400" />
                <span className="text-slate-300 text-sm">{server.engagementRate}% engagement</span>
              </div>
            </div>

            {/* Level Progress */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 text-sm">Level Progress</span>
                <span className="text-white font-medium">{server.currentLevel}/{server.targetLevel}</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(server.currentLevel / server.targetLevel) * 100}%` }}
                ></div>
              </div>
            </div>

            {/* Target Channels */}
            <div className="mb-4">
              <p className="text-slate-400 text-sm mb-2">Target Channels</p>
              <div className="flex flex-wrap gap-2">
                {server.targetChannels.map((channel, index) => (
                  <span key={index} className="px-2 py-1 bg-slate-700/50 text-slate-300 text-xs rounded-md">
                    {channel}
                  </span>
                ))}
              </div>
            </div>

            {/* Roles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm mb-2 flex items-center">
                  <Crown className="w-3 h-3 mr-1" />
                  Earned Roles
                </p>
                <div className="space-y-1">
                  {server.earnedRoles.map((role, index) => (
                    <span key={index} className="block px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded border border-green-500/30">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm mb-2 flex items-center">
                  <Target className="w-3 h-3 mr-1" />
                  Target Roles
                </p>
                <div className="space-y-1">
                  {server.targetRoles.slice(0, 2).map((role, index) => (
                    <span key={index} className="block px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded border border-purple-500/30">
                      {role}
                    </span>
                  ))}
                  {server.targetRoles.length > 2 && (
                    <span className="block px-2 py-1 bg-slate-600/50 text-slate-400 text-xs rounded">
                      +{server.targetRoles.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-4 pt-4 border-t border-slate-700/50">
              <button className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                server.status === 'active' 
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}>
                {server.status === 'active' ? 'Pause' : 'Resume'}
              </button>
              <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors">
                Configure
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}