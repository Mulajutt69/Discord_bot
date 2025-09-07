import React from 'react';
import { Wifi, WifiOff, Bot } from 'lucide-react';

interface BotStatusProps {
  isConnected: boolean;
  stats: any;
}

export function BotStatus({ isConnected, stats }: BotStatusProps) {
  return (
    <div className="flex items-center space-x-4">
      {/* Connection Status */}
      <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
        isConnected 
          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
          : 'bg-red-500/20 text-red-400 border border-red-500/30'
      }`}>
        {isConnected ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>

      {/* Bot Avatar */}
      <div className="flex items-center space-x-3 bg-slate-800/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-slate-700/50">
        <div className="relative">
          <Bot className="w-8 h-8 text-purple-400" />
          {isConnected && (
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-900"></div>
          )}
        </div>
        <div>
          <p className="text-white font-medium text-sm">Tayyab Bot</p>
          <p className="text-slate-400 text-xs">
            {stats ? `Level ${stats.level || 23}` : 'Initializing...'}
          </p>
        </div>
      </div>
    </div>
  );
}