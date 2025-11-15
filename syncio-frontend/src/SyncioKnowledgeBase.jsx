import React, { useState } from 'react';
import { 
  Send, Github, Code, MessageSquare, BarChart2, Search, 
  Zap, Clock, Users, GitBranch, CheckCircle, AlertCircle,
  TrendingUp, Activity, Terminal, BookOpen, Sparkles
} from 'lucide-react';

const SyncioKnowledgeBase = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Welcome to **Sync.io** - Your AI-Powered DevOps Knowledge Base\n\nI unify GitHub, Linear, and your codebase so you never have to context switch again. Try asking:\n\n• *\"What is aryan0821 currently working on?\"*\n• *\"Show me the status of sync.io project\"*\n• *\"Search for webhook in the codebase\"*\n• *\"Who is working on issue #4?\"*",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Mock data for team activity
  const teamMembers = [
    { name: 'aryan0821', avatar: 'A', status: 'active', tasksCount: 3, color: 'from-blue-500 to-purple-600' },
    { name: 'sarah_dev', avatar: 'S', status: 'active', tasksCount: 5, color: 'from-pink-500 to-rose-600' },
    { name: 'mike_code', avatar: 'M', status: 'away', tasksCount: 2, color: 'from-green-500 to-emerald-600' },
  ];

  const recentActivity = [
    { type: 'commit', user: 'aryan0821', message: 'Add webhook integration', time: '1h ago', icon: Github },
    { type: 'issue', user: 'sarah_dev', message: 'Issue #4 moved to In Review', time: '2h ago', icon: AlertCircle },
    { type: 'pr', user: 'mike_code', message: 'PR #12 merged: Implement Linear API', time: '3h ago', icon: GitBranch },
    { type: 'task', user: 'aryan0821', message: 'SYNC-23 marked as complete', time: '4h ago', icon: CheckCircle },
  ];

  const projectStats = [
    { label: 'Open Issues', value: '12', change: '+3', icon: AlertCircle, color: 'text-orange-400' },
    { label: 'Active PRs', value: '5', change: '-2', icon: GitBranch, color: 'text-blue-400' },
    { label: 'Commits Today', value: '47', change: '+12', icon: Github, color: 'text-green-400' },
    { label: 'Sprint Progress', value: '75%', change: '+15%', icon: TrendingUp, color: 'text-purple-400' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate API response
    setTimeout(() => {
      const demoResponse = getDemoResponse(input);
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: demoResponse,
        timestamp: new Date()
      }]);
    }, 1500);
  };

  const getDemoResponse = (query) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('aryan') || lowerQuery.includes('working on')) {
      return `👤 **aryan0821's Current Work:**

**GitHub Issues:**
• Issue #4: Implement webhook notifications (In Progress)
• Issue #7: Add conversation memory (Open)

**Linear Tasks:**
• SYNC-23: Build Slack bot integration (In Progress - 75% complete)
• SYNC-45: Set up LangGraph workflow (Done ✅)

**Recent Commits:**
• "Add webhook integration" - 1 hour ago
• "Update Linear API client" - 3 hours ago
• "Implement intent classification" - 5 hours ago

**Time Saved Today:** 2.5 hours by using Sync.io instead of switching tools 🎯`;
    }

    if (lowerQuery.includes('status') || lowerQuery.includes('project')) {
      return `📊 **Sync.io Project Status**

**GitHub Repository:**
• 47 commits this week (+12 today)
• 12 open issues, 34 closed
• 5 active pull requests
• Last update: 1 hour ago

**Linear Sprint:**
• Sprint Progress: 75% complete
• 8 tasks in progress
• 15 tasks completed this sprint
• 4 tasks in backlog

**Team Velocity:**
• Average: 23 points/sprint
• Current sprint: 28 points (on track for +22% increase)

**Recent Highlights:**
✅ Webhook integration deployed
✅ Linear API fully integrated
🔄 Conversation memory in testing`;
    }

    if (lowerQuery.includes('search') || lowerQuery.includes('webhook') || lowerQuery.includes('codebase')) {
      return `🔍 **Code Search Results for "webhook":**

**src/services/webhooks/github.ts** (5 matches)
\`\`\`typescript
export const handleGithubWebhook = async (payload) => {
  const eventType = payload.action;
  await processGithubEvent(eventType, payload);
}
\`\`\`

**src/services/webhooks/linear.ts** (3 matches)
\`\`\`typescript
export const handleLinearWebhook = async (payload) => {
  await syncToGithub(payload.data);
}
\`\`\`

**src/routes/webhooks.ts** (7 matches)
Route handlers for webhook endpoints

💡 **Context:** These files handle bidirectional sync between GitHub and Linear`;
    }

    if (lowerQuery.includes('issue') && lowerQuery.includes('4')) {
      return `🎯 **Issue #4: Implement webhook notifications**

**Status:** In Progress 🔄
**Assignee:** aryan0821
**Priority:** High
**Linked Linear:** SYNC-23

**Description:**
Implement real-time webhook notifications for GitHub and Linear events in Slack.

**Recent Activity:**
• Status changed to "In Progress" (2h ago)
• aryan0821 commented: "Working on GitHub webhook handler" (1h ago)
• 3 commits related to this issue

**Blockers:** None
**ETA:** Tomorrow`;
    }

    return `I can help you query across **GitHub**, **Linear**, and your **codebase**! 

Here are some things you can ask:
• "What is [person] currently working on?"
• "Show me the status of [project]"
• "Search for [keyword] in the codebase"
• "Who is working on issue #X?"
• "Show me recent commits and Linear updates"

**Slash Commands:**
• \`/github\` - Search only GitHub
• \`/linear\` - Search only Linear
• \`/code\` - Search only codebase`;
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Sidebar */}
      <div className="w-80 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sync.io</h1>
              <p className="text-xs text-gray-400">DevOps Knowledge Base</p>
            </div>
          </div>
          <div className="flex items-center gap-1 px-3 py-2 bg-green-500/10 rounded-lg border border-green-500/20">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-400 font-medium">All Systems Online</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 mb-3">Project Overview</h3>
          <div className="grid grid-cols-2 gap-2">
            {projectStats.map((stat, idx) => {
              const Icon = stat.icon;
              return (
                <div key={idx} className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
                  <Icon className={`w-4 h-4 ${stat.color} mb-1`} />
                  <div className="text-lg font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-gray-400">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Members */}
        <div className="p-6 border-b border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Team Members
          </h3>
          <div className="space-y-2">
            {teamMembers.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center relative`}>
                    <span className="text-white text-sm font-semibold">{member.avatar}</span>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${member.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                  </div>
                  <div>
                    <div className="text-sm text-white font-medium">{member.name}</div>
                    <div className="text-xs text-gray-400">{member.tasksCount} active tasks</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="p-6 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.map((activity, idx) => {
              const Icon = activity.icon;
              return (
                <div key={idx} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-3 h-3 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-tight">
                      <span className="text-blue-400 font-medium">{activity.user}</span>
                      {' '}{activity.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Integration Status */}
        <div className="p-6 border-t border-gray-800">
          <h3 className="text-xs font-semibold text-gray-400 mb-3">Integrations</h3>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Github className="w-4 h-4 text-gray-400" />
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <Code className="w-4 h-4 text-gray-400" />
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
              <BarChart2 className="w-4 h-4 text-gray-400" />
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-900/30 border-b border-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-400" />
                Unified DevOps Knowledge Base
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Ask questions across GitHub, Linear, and your codebase - zero context switching
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <span className="text-xs text-blue-400 font-medium">⚡ 2.5hrs saved today</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-gray-600 to-gray-800'
                    : 'bg-gradient-to-br from-blue-500 to-purple-600'
                }`}>
                  {message.role === 'user' ? (
                    <span className="text-white text-sm font-semibold">U</span>
                  ) : (
                    <Zap className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                  <div className={`inline-block max-w-3xl rounded-2xl px-5 py-4 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
                      : 'bg-gray-800/80 border border-gray-700/50 text-gray-100'
                  }`}>
                    <div className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content.split('\n').map((line, i) => {
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          return (
                            <div key={i}>
                              {parts.map((part, j) =>
                                j % 2 === 1 ? <strong key={j} className="font-bold">{part}</strong> : part
                              )}
                            </div>
                          );
                        }
                        if (line.startsWith('```')) return null;
                        if (line.trim().startsWith('•')) {
                          return <div key={i} className="ml-2 my-0.5">{line}</div>;
                        }
                        if (line.trim().startsWith('✅') || line.trim().startsWith('🔄')) {
                          return <div key={i} className="my-0.5">{line}</div>;
                        }
                        return <div key={i}>{line || <br />}</div>;
                      })}
                    </div>
                  </div>
                  <div className={`text-xs text-gray-500 mt-1 px-1 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl px-5 py-4">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        {messages.filter(m => m.role === 'user').length === 0 && (
          <div className="px-6 pb-4">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-xs font-semibold text-gray-400 mb-3">Try these queries:</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  "What is aryan0821 currently working on?",
                  "Show me the status of sync.io project",
                  "Search for webhook in the codebase",
                  "Who is working on issue #4?"
                ].map((query, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(query)}
                    className="text-left p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl hover:border-blue-500/50 hover:bg-gray-800/80 transition-all text-sm text-gray-300 hover:text-white group"
                  >
                    <Search className="w-4 h-4 inline mr-2 text-gray-500 group-hover:text-blue-400" />
                    {query}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-gray-900/50 border-t border-gray-800 p-6">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit}>
              <div className="flex items-end gap-3 bg-gray-800/50 rounded-2xl border border-gray-700/50 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="Ask about your GitHub, Linear, or codebase... (e.g., 'What is aryan working on?')"
                  className="flex-1 bg-transparent px-5 py-4 outline-none resize-none min-h-[56px] max-h-[200px] text-gray-100 placeholder-gray-500"
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isTyping}
                  className={`mb-3 mr-3 p-3 rounded-xl transition-all ${
                    input.trim() && !isTyping
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
            <div className="flex items-center justify-between mt-3 px-2">
              <p className="text-xs text-gray-500">
                Use <span className="text-blue-400 font-mono">/github</span>, <span className="text-blue-400 font-mono">/linear</span>, or <span className="text-blue-400 font-mono">/code</span> to search specific sources
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Sparkles className="w-3 h-3" />
                <span>Powered by GPT-4 + LangGraph</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncioKnowledgeBase;

