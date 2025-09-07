import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, MessageSquare, Users, Award } from 'lucide-react';

export function Analytics() {
  const [timeRange, setTimeRange] = useState('7d');

  const activityData = [
    { date: '2024-01-01', messages: 45, interactions: 23, helpfulReplies: 12 },
    { date: '2024-01-02', messages: 52, interactions: 28, helpfulReplies: 15 },
    { date: '2024-01-03', messages: 38, interactions: 19, helpfulReplies: 8 },
    { date: '2024-01-04', messages: 61, interactions: 34, helpfulReplies: 18 },
    { date: '2024-01-05', messages: 47, interactions: 25, helpfulReplies: 13 },
    { date: '2024-01-06', messages: 55, interactions: 31, helpfulReplies: 16 },
    { date: '2024-01-07', messages: 43, interactions: 22, helpfulReplies: 11 }
  ];

  const serverPerformance = [
    { name: 'Crypto Traders', messages: 234, engagement: 94, roles: 3 },
    { name: 'Dev Community', messages: 187, engagement: 87, roles: 2 },
    { name: 'Gaming Hub', messages: 156, engagement: 76, roles: 1 }
  ];

  const topicDistribution = [
    { name: 'DeFi/Yield Farming', value: 35, color: '#8B5CF6' },
    { name: 'Trading/Charts', value: 28, color: '#06B6D4' },
    { name: 'Tokenomics', value: 20, color: '#10B981' },
    { name: 'Partnerships', value: 17, color: '#F59E0B' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Analytics & Insights</h2>
        <div className="flex space-x-2">
          {['24h', '7d', '30d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded-md text-sm transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Crypto Intelligence', value: '97.8%', icon: TrendingUp, change: '+15%' },
          { title: 'Project Analysis', value: '12 Active', icon: Award, change: '+3' },
          { title: 'Daily Insights', value: '234', icon: MessageSquare, change: '+45%' },
          { title: 'Communities', value: '12', icon: Users, change: '+2' }
        ].map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-purple-400" />
                <span className={`text-xs font-medium ${
                  metric.change.startsWith('+') ? 'text-green-400' : 'text-red-400'
                }`}>
                  {metric.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
              <p className="text-slate-400 text-sm">{metric.title}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">📈 Crypto Activity Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={activityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Line type="monotone" dataKey="messages" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
              <Line type="monotone" dataKey="interactions" stroke="#06B6D4" strokeWidth={2} dot={{ fill: '#06B6D4' }} />
              <Line type="monotone" dataKey="helpfulReplies" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Server Performance */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">🚀 Project Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={serverPerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
              <YAxis stroke="#9CA3AF" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
              <Bar dataKey="engagement" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Topic Distribution */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">💬 Crypto Topic Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topicDistribution}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {topicDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#F9FAFB'
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Achievements */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">🏆 Crypto Intelligence Wins</h3>
          <div className="space-y-3">
            {[
              { achievement: 'Identified new DeFi protocol', server: 'DeFi Community', time: '2 hours ago', type: 'discovery' },
              { achievement: 'Earned "Liquidity Provider" role', server: 'Yield Farm', time: '1 day ago', type: 'role' },
              { achievement: 'Analyzed 50+ tokenomics', server: 'Multiple Projects', time: '3 days ago', type: 'milestone' },
              { achievement: 'Top crypto analyst this week', server: 'Trading Alpha', time: '5 days ago', type: 'recognition' }
            ].map((achievement, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700/30 rounded-lg">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  achievement.type === 'discovery' ? 'bg-purple-500/20 text-purple-400' :
                  achievement.type === 'role' ? 'bg-yellow-500/20 text-yellow-400' :
                  achievement.type === 'milestone' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  <Award className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">{achievement.achievement}</p>
                  <p className="text-slate-400 text-xs">{achievement.server} • {achievement.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}