import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { ServerConfig } from './components/ServerConfig';
import { Analytics } from './components/Analytics';
import { BotStatus } from './components/BotStatus';
import { Settings, BarChart3, Server, Activity } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [botStats, setBotStats] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Simulate bot connection status
    const checkBotStatus = () => {
      // In real implementation, this would check if bot process is running
      setIsConnected(true);
      setBotStats({
        totalServers: 3,
        activeServers: 2,
        queueSize: 5,
        messagesProcessed: 1247,
        usersHelped: 89,
        uptime: '2h 34m'
      });
    };

    checkBotStatus();
    const interval = setInterval(checkBotStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'servers', label: 'Servers', icon: Server },
    { id: 'analytics', label: 'Analytics', icon: Activity },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Multi-Server Discord Bot
              </h1>
              <p className="text-slate-300">
                Intelligent automation across Discord communities
              </p>
            </div>
            <BotStatus isConnected={isConnected} stats={botStats} />
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-slate-800/50 p-1 rounded-lg backdrop-blur-sm">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'dashboard' && <Dashboard stats={botStats} />}
          {activeTab === 'servers' && <ServerConfig />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'settings' && (
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Settings</h2>
              <p className="text-slate-300">Bot configuration and global settings will be available here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;