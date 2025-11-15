import React, { useState, useRef, useEffect } from 'react';
import { Send, Github, Zap, Code, MessageSquare } from 'lucide-react';
import IssueTransitionAnimation from './IssueTransitionAnimation.jsx'

export default function SyncioChat() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm Syncio, your AI-powered DevOps assistant. I can help you with:\n\n• GitHub issues, PRs, and commits\n• Linear project status and tasks\n• Code search across your repositories\n• Team member activity\n\nTry asking me: *\"What is the current status of the sync.io project?\"* or *\"Search for webhook in the codebase\"*",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

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

    // Simulate API call to your backend
    try {
      // Replace this URL with your actual backend endpoint
      const response = await fetch('YOUR_BACKEND_API_URL', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input })
      });

      const data = await response.json();

      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response || data.message || 'Sorry, I encountered an error.',
        timestamp: new Date()
      }]);
    } catch (error) {
      // Fallback demo responses for testing without backend
      setIsTyping(false);
      const demoResponse = getDemoResponse(input);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: demoResponse,
        timestamp: new Date()
      }]);
    }
  };

  const getDemoResponse = (query) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('status') || lowerQuery.includes('project')) {
      return `📊 **Syncio Project Status**

**GitHub Repository:**
• 47 commits in the last week
• 3 open issues, 12 closed
• 2 open pull requests
• Last update: 2 hours ago

**Linear Project:**
• Sprint Progress: 75% complete
• 8 tasks in progress
• 15 tasks completed this sprint
• 4 tasks in backlog

**Recent Activity:**
• aryan0821 committed "Add webhook integration" (1h ago)
• Issue #4 moved to "In Review"
• PR #12 merged: "Implement Linear API"`;
    }

    if (lowerQuery.includes('working on') || lowerQuery.includes('aryan')) {
      return `👤 **aryan0821's Current Work:**

**GitHub Issues:**
• Issue #4: Implement webhook notifications (In Progress)
• Issue #7: Add conversation memory (Open)

**Linear Tasks:**
• SYNC-23: Build Slack bot integration (In Progress)
• SYNC-45: Set up LangGraph workflow (Done)

**Recent Commits:**
• "Add webhook integration" - 1 hour ago
• "Update Linear API client" - 3 hours ago
• "Implement intent classification" - 5 hours ago`;
    }

    if (lowerQuery.includes('issue') && lowerQuery.includes('#4')) {
      return `🎯 **Issue #4: Implement webhook notifications**

**Status:** In Progress
**Assignee:** aryan0821
**Priority:** High
**Labels:** enhancement, integration

**Description:**
Implement real-time webhook notifications for GitHub and Linear events in Slack.

**Linked Linear Issue:** SYNC-23

**Recent Activity:**
• Status changed to "In Progress" (2h ago)
• aryan0821 commented: "Working on GitHub webhook handler" (1h ago)
• 3 commits related to this issue`;
    }

    if (lowerQuery.includes('search') || lowerQuery.includes('webhook') || lowerQuery.includes('codebase')) {
      return `🔍 **Code Search Results for "webhook":**

**src/services/webhooks/github.ts** (5 matches)
\`\`\`typescript
export const handleGithubWebhook = async (payload) => {
  // Process GitHub webhook events
  const eventType = payload.action;
  ...
}
\`\`\`

**src/services/webhooks/linear.ts** (3 matches)
\`\`\`typescript
export const handleLinearWebhook = async (payload) => {
  // Process Linear webhook events
  ...
}
\`\`\`

**src/routes/webhooks.ts** (7 matches)
Route handlers for webhook endpoints`;
    }

    if (lowerQuery.includes('commits') || lowerQuery.includes('recent')) {
      return `📝 **Recent Activity:**

**Latest Commits:**
1. aryan0821 - "Add webhook integration" (1h ago)
2. aryan0821 - "Update Linear API client" (3h ago)
3. sarah_dev - "Implement conversation memory" (5h ago)
4. mike_code - "Add error handling" (7h ago)

**Linear Updates:**
• SYNC-23: Moved to "In Review"
• SYNC-45: Completed
• SYNC-56: Created - "Add slash commands"
• SYNC-34: Updated priority to High`;
    }

    return `I can help you with that! Here are some things you can ask me:

• "What is [person] currently working on?"
• "Who is working on issue #[number]?"
• "Show me recent commits and Linear issues"
• "Search for [keyword] in the codebase"
• "What's the status of the project?"

You can also use slash commands:
• /github - Search only GitHub
• /linear - Search only Linear`;
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const exampleQueries = [
    "What is aryan0821 currently working on?",
    "Show me recent commits and Linear issues",
    "Search for webhook in the codebase",
    "Who is working on issue #4?"
  ];

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Syncio</h1>
              <p className="text-xs text-gray-500">AI-Powered DevOps Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-50 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-700 font-medium">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user'
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
                <div className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div className={`rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800 shadow-sm'
                    }`}>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                      {message.content.split('\n').map((line, i) => {
                        // Handle bold text with **
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          return (
                            <div key={i}>
                              {parts.map((part, j) =>
                                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                              )}
                            </div>
                          );
                        }
                        // Handle code blocks
                        if (line.startsWith('```')) {
                          return null;
                        }
                        if (line.trim().startsWith('•')) {
                          return <div key={i} className="ml-2">{line}</div>;
                        }
                        return <div key={i}>{line || <br />}</div>;
                      })}
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 mt-1 px-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="mb-6 flex justify-start">
              <div className="flex gap-3 max-w-3xl">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Example Queries (shown when no user messages) */}
      {messages.filter(m => m.role === 'user').length === 0 && (
        <div className="max-w-4xl mx-auto px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {exampleQueries.map((query, index) => (
              <button
                key={index}
                onClick={() => setInput(query)}
                className="text-left p-3 bg-white border border-pink-300 rounded-lg hover:border-blue-400 hover:shadow-md transition-all text-sm text-gray-600 hover:text-gray-800"
              >
                <MessageSquare className="w-4 h-4 inline mr-2 text-gray-500" />
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="flex items-end gap-2 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me about your GitHub, Linear, or codebase..."
                className="flex-1 bg-transparent px-4 py-3 outline-none resize-none min-h-[52px] max-h-[200px] text-gray-800 placeholder-gray-400"
                rows={1}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className={`mb-2 mr-2 p-2.5 rounded-xl transition-all ${input.trim() && !isTyping
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-lg'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>
          <div className="flex items-center justify-between mt-2 px-2">
            <p className="text-xs text-gray-400">
              Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-600">Shift + Enter</kbd> for new line
            </p>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Github className="w-3 h-3" />
              <Code className="w-3 h-3" />
              <span>Powered by OpenAI GPT-4</span>
            </div>
          </div>
        </div>
      </div>

      <IssueTransitionAnimation />
    </div>
  );
}