import React from 'react';
import { MessageSquare, Users, Trophy, Clock, TrendingUp, Zap, Activity } from 'lucide-react';

interface DashboardProps {
  stats: any;
}

export function Dashboard({ stats }: DashboardProps) {
  if (!stats) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-700 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-slate-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Servers',
      value: `${stats.activeServers}/${stats.totalServers}`,
      icon: MessageSquare,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      title: 'Crypto Projects',
      value: stats.cryptoProjects || 0,
      icon: TrendingUp,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10'
    },
    {
      title: 'Queue Size',
      value: stats.queueSize,
      icon: Clock,
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    },
    {
      title: 'Messages Sent',
      value: stats.messagesProcessed.toLocaleString(),
      icon: TrendingUp,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10'
    },
    {
      title: 'Users Helped',
      value: stats.usersHelped,
      icon: Users,
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      title: 'Efficiency',
      value: '94%',
      icon: Trophy,
      color: 'text-pink-400',
      bgColor: 'bg-pink-500/10'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50 hover:border-slate-600/50 transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">{stat.title}</p>
                  <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crypto Intelligence Panel */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4">🔍 Crypto Intelligence</h3>
        <p className="text-slate-300">Real-time analysis of {stats.cryptoProjects || 0} crypto projects across multiple Discord communities.</p>
      </div>

      {/* Recent Activity */}
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-purple-400" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[
            { action: 'Analyzed $PEPE tokenomics discussion', server: 'Meme Coin Hub', time: '2 min ago', type: 'analysis' },
            { action: 'Engaged in DeFi yield farming chat', server: 'DeFi Protocol', time: '5 min ago', type: 'engage' },
            { action: 'Identified new partnership announcement', server: 'Layer1 Chain', time: '12 min ago', type: 'intel' },
            { action: 'Tracked whale wallet movements', server: 'Trading Alpha', time: '18 min ago', type: 'tracking' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'analysis' ? 'bg-purple-400' :
                  activity.type === 'intel' ? 'bg-yellow-400' :
                  activity.type === 'tracking' ? 'bg-red-400' :
                  activity.type === 'help' ? 'bg-green-400' :
                  'bg-blue-400'
                }`}></div>
                <div>
                  <p className="text-white text-sm">{activity.action}</p>
                  <p className="text-slate-400 text-xs">{activity.server}</p>
                </div>
              </div>
              <span className="text-slate-400 text-xs">{activity.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors">
              🔍 Deep Scan Projects
            </button>
            <button className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg transition-colors">
              📈 Boost Crypto Engagement
            </button>
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors">
              📊 Generate Crypto Report
            </button>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Server Performance</h3>
          <div className="space-y-3">
            {[
              { name: 'DeFi Protocol ($DEFI)', score: 94, color: 'bg-green-500' },
              { name: 'Layer1 Chain ($L1)', score: 87, color: 'bg-blue-500' },
              { name: 'Meme Coin Hub ($MEME)', score: 76, color: 'bg-yellow-500' }
            ].map((server, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-slate-300 text-sm">{server.name}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-slate-700 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${server.color}`}
                      style={{ width: `${server.score}%` }}
                    ></div>
                  </div>
                  <span className="text-white text-sm font-medium">{server.score}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}