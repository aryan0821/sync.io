import React, { useState } from 'react';
import { Home, Settings, MessageSquare, BarChart2, Mail, Bot, FileText, Share, Users, Sparkles, CreditCard, BarChart, Zap, User, Bell } from 'lucide-react';

const CircularProgress = ({ value, max, color, label, sublabel }) => {
  const percentage = (value / max) * 100;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-2xl font-bold text-white mb-1">
            {value} / {max}
          </div>
          <div className="text-sm text-gray-400">{label}</div>
        </div>
        <div className="relative">
          <svg width="100" height="100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#374151"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ activeSection, setActiveSection }) => {
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, shortcut: '⌘ M' },
    { id: 'settings', label: 'Settings', icon: Settings, shortcut: '⌘ S' },
  ];

  const activityItems = [
    { id: 'chats', label: 'Chats', icon: MessageSquare },
    { id: 'tickets', label: 'Tickets', icon: BarChart2 },
    { id: 'emails', label: 'Emails', icon: Mail },
  ];

  const setupItems = [
    { id: 'chatbots', label: 'Chatbots', icon: Bot },
    { id: 'ticket-forms', label: 'Ticket Forms', icon: FileText },
    { id: 'email-inboxes', label: 'Email Inboxes', icon: Mail },
  ];

  const connectionItems = [
    { id: 'webhooks', label: 'Webhooks', icon: Share },
    { id: 'integrations', label: 'Integrations', icon: BarChart },
  ];

  const helpItems = [
    { id: 'documentation', label: 'Documentation', icon: FileText },
    { id: 'discord', label: 'Discord', icon: MessageSquare },
    { id: 'support', label: 'Support', icon: Bell },
  ];

  const MenuSection = ({ title, items, showShortcuts = false }) => (
    <div className="mb-6">
      <div className="text-xs font-semibold text-gray-500 mb-2 px-3">{title}</div>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-1 transition-all ${
              activeSection === item.id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <Icon size={18} />
              <span className="text-sm font-medium">{item.label}</span>
            </div>
            {showShortcuts && item.shortcut && (
              <span className="text-xs text-gray-500">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="w-64 bg-gray-900/50 border-r border-gray-800 h-screen overflow-y-auto p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 px-2">
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
          <span className="text-lg">⚡</span>
        </div>
        <span className="text-xl font-bold text-white">Syncio.</span>
      </div>

      {/* Menu Sections */}
      <MenuSection title="Main menu" items={menuItems} showShortcuts />
      <MenuSection title="Activity" items={activityItems} />
      <MenuSection title="Set Up" items={setupItems} />
      <MenuSection title="Connection" items={connectionItems} />
      <MenuSection title="Get Help" items={helpItems} />

      {/* User Profile */}
      <div className="mt-auto pt-6 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white text-sm font-semibold">A</span>
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-white">Aryan Nair</div>
            <div className="text-xs text-gray-400">Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccountSettings = () => {
  const [activeTab, setActiveTab] = useState('account');

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'usage', label: 'Usage', icon: BarChart },
    { id: 'openai', label: 'OpenAI', icon: Sparkles },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
            <Sparkles size={16} />
            <span>Account Setting</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            Account Center
            <Settings size={32} className="text-gray-400" />
          </h1>
          <p className="text-gray-400">Let's get your account set up!</p>
        </div>

        {/* Main Content */}
        <div className="flex gap-6">
          {/* Left Panel - Tabs */}
          <div className="w-64 bg-gray-800/30 rounded-2xl p-4 border border-gray-700/50 h-fit">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-700/50">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-white font-semibold">A</span>
              </div>
              <div>
                <div className="text-white font-medium">Aryan Nair</div>
                <div className="text-sm text-gray-400">Admin</div>
              </div>
            </div>

            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 transition-all ${
                    activeTab === tab.id
                      ? 'bg-gray-700/50 text-white'
                      : 'text-gray-400 hover:bg-gray-700/30 hover:text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={18} />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </div>
                  {activeTab === tab.id && (
                    <span className="text-xs text-gray-500">⌘ M</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Panel - Usage Stats */}
          <div className="flex-1">
            <div className="bg-gray-800/20 rounded-2xl p-6 border border-gray-700/50 mb-6">
              <h2 className="text-xl font-bold text-white mb-2">Usage</h2>
              <p className="text-sm text-gray-400 mb-6">
                See your current usage here.
                <br />
                Chat message, smart suggestions and trainings reset every month on the 1st.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <CircularProgress value={35} max={50} color="#f59e0b" label="Chat message" />
                <CircularProgress value={23} max={25} color="#f59e0b" label="Smart suggestions" />
                <CircularProgress value={120} max={500} color="#10b981" label="Training characters" sublabel="K" />
                <CircularProgress value={1} max={2} color="#3b82f6" label="Chatbots" />
                <CircularProgress value={0} max={1} color="#10b981" label="Ticket forms" />
                <CircularProgress value={0} max={1} color="#10b981" label="Team member" />
                <CircularProgress value={0} max={1} color="#10b981" label="personas" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AccountCenter() {
  const [activeSection, setActiveSection] = useState('settings');

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <AccountSettings />
    </div>
  );
}

