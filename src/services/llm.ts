import OpenAI from 'openai';

export interface LLMIntent {
  action: 'info' | 'file' | 'search' | 'commits' | 'issues' | 'list' | 'general';
  parameters: {
    filePath?: string;
    searchTerm?: string;
    directoryPath?: string;
    question?: string;
  };
  confidence: number;
}

export class LLMService {
  private openai: OpenAI | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
    }
  }

  async understandQuestion(question: string): Promise<LLMIntent> {
    // If no API key, fall back to keyword matching
    if (!this.openai) {
      return this.fallbackUnderstanding(question);
    }

    try {
      // Test if API key is valid by checking if it's not empty and has correct format
      const apiKey = process.env.OPENAI_API_KEY || '';
      if (!apiKey || !apiKey.startsWith('sk-') || apiKey.length < 20) {
        console.log('⚠️  Invalid OpenAI API key format, using fallback');
        return this.fallbackUnderstanding(question);
      }
      const systemPrompt = `You are a helpful assistant that understands questions about GitHub repositories. 
Analyze the user's question and determine their intent. Return a JSON object with:
- action: one of "info", "file", "search", "commits", "issues", "list", or "general"
- parameters: object with relevant fields (filePath, searchTerm, directoryPath, question)
- confidence: number 0-1

Examples:
- "What is this repo about?" → {"action": "info", "parameters": {}, "confidence": 0.9}
- "Show me package.json" → {"action": "file", "parameters": {"filePath": "package.json"}, "confidence": 0.95}
- "Search for authentication" → {"action": "search", "parameters": {"searchTerm": "authentication"}, "confidence": 0.9}
- "Recent commits" → {"action": "commits", "parameters": {}, "confidence": 0.9}
- "Open issues" → {"action": "issues", "parameters": {}, "confidence": 0.9}
- "List files in src" → {"action": "list", "parameters": {"directoryPath": "src"}, "confidence": 0.9}
- "How does the authentication work?" → {"action": "general", "parameters": {"question": "How does the authentication work?"}, "confidence": 0.8}

Only return valid JSON, no other text.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0]?.message?.content;
      if (content) {
        const intent = JSON.parse(content) as LLMIntent;
        return intent;
      }
    } catch (error: any) {
      // Check if it's an authentication error
      if (error?.status === 401 || error?.code === 'invalid_api_key') {
        console.error('❌ Invalid OpenAI API key. Using fallback mode.');
        console.error('💡 Get a valid key from: https://platform.openai.com/api-keys');
        // Don't log the full error for auth failures
      } else {
        console.error('LLM error:', error.message || error);
      }
    }

    // Fallback if LLM fails
    return this.fallbackUnderstanding(question);
  }

  async answerQuestionWithContext(question: string, intent: LLMIntent, context: {
    repoInfo?: any;
    fileContents?: string;
    filePath?: string;
    searchResults?: any[];
    commits?: any[];
    issues?: any[];
    files?: string[];
    directoryPath?: string;
  }): Promise<string> {
    if (!this.openai) {
      // Fallback to basic responses without LLM
      return this.generateFallbackResponse(intent, context);
    }

    try {
      // Build comprehensive context text
      let contextText = '';

      // Repository information
      if (context.repoInfo) {
        contextText += `# Repository Information\n`;
        contextText += `Name: ${context.repoInfo.name}\n`;
        contextText += `Description: ${context.repoInfo.description || 'No description'}\n`;
        contextText += `Language: ${context.repoInfo.language || 'N/A'}\n`;
        contextText += `Stars: ${context.repoInfo.stars}\n`;
        contextText += `Forks: ${context.repoInfo.forks}\n`;
        contextText += `Open Issues: ${context.repoInfo.openIssues}\n`;
        contextText += `Default Branch: ${context.repoInfo.defaultBranch}\n`;
        contextText += `Created: ${new Date(context.repoInfo.createdAt).toLocaleDateString()}\n`;
        contextText += `Last Updated: ${new Date(context.repoInfo.updatedAt).toLocaleDateString()}\n\n`;
      }

      // File contents
      if (context.fileContents && context.filePath) {
        contextText += `# File: ${context.filePath}\n`;
        // Include full file if small, or first 3000 chars if large
        const filePreview = context.fileContents.length > 3000 
          ? context.fileContents.substring(0, 3000) + '\n... (file continues)'
          : context.fileContents;
        contextText += `${filePreview}\n\n`;
      }

      // Search results
      if (context.searchResults && context.searchResults.length > 0) {
        contextText += `# Code Search Results\n`;
        context.searchResults.forEach((result, idx) => {
          contextText += `${idx + 1}. ${result.path}\n`;
          if (result.matches && result.matches.length > 0) {
            contextText += `   Found at: ${result.matches.join(', ')}\n`;
          }
        });
        contextText += `\n`;
      }

      // Commits
      if (context.commits && context.commits.length > 0) {
        contextText += `# Recent Commits\n`;
        context.commits.forEach((commit, idx) => {
          contextText += `${idx + 1}. ${commit.sha} - ${commit.message}\n`;
          contextText += `   By: ${commit.author} on ${new Date(commit.date).toLocaleDateString()}\n`;
        });
        contextText += `\n`;
      }

      // Issues
      if (context.issues && context.issues.length > 0) {
        contextText += `# Open Issues\n`;
        context.issues.forEach((issue, idx) => {
          contextText += `${idx + 1}. #${issue.number} - ${issue.title}\n`;
          contextText += `   Opened by: ${issue.author} on ${new Date(issue.createdAt).toLocaleDateString()}\n`;
        });
        contextText += `\n`;
      }

      // Directory listing
      if (context.files && context.files.length > 0) {
        contextText += `# Files in ${context.directoryPath || 'root directory'}\n`;
        context.files.slice(0, 20).forEach((file, idx) => {
          contextText += `${idx + 1}. ${file}\n`;
        });
        if (context.files.length > 20) {
          contextText += `... and ${context.files.length - 20} more files\n`;
        }
        contextText += `\n`;
      }

      // Build system prompt based on intent
      let systemPrompt = 'You are a helpful GitHub repository assistant. Answer questions about the repository based on the provided context. ';
      
      switch (intent.action) {
        case 'info':
          systemPrompt += 'Provide a clear, informative summary of the repository.';
          break;
        case 'file':
          systemPrompt += 'Explain the file contents, its purpose, and key components.';
          break;
        case 'search':
          systemPrompt += 'Explain where the searched code is located and what it does.';
          break;
        case 'commits':
          systemPrompt += 'Summarize the recent commits and development activity.';
          break;
        case 'issues':
          systemPrompt += 'Summarize the open issues and their status.';
          break;
        case 'list':
          systemPrompt += 'Describe the directory structure and files.';
          break;
        default:
          systemPrompt += 'Answer the question comprehensively using all available context.';
      }

      systemPrompt += ' Be concise but thorough. Format your response nicely for Slack (use *bold* for emphasis).';

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Context from GitHub repository:\n\n${contextText}\n\nUser Question: ${question}\n\nProvide a helpful answer based on the context above.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      return response.choices[0]?.message?.content || "I couldn't generate an answer. Please try rephrasing your question.";
    } catch (error: any) {
      // Check if it's an authentication error
      if (error?.status === 401 || error?.code === 'invalid_api_key') {
        console.error('❌ Invalid OpenAI API key. Using fallback response.');
        // Don't spam the console with full error
      } else {
        console.error('LLM error:', error.message || error);
      }
      return this.generateFallbackResponse(intent, context);
    }
  }

  private generateFallbackResponse(intent: LLMIntent, context: any): string {
    // Fallback responses when LLM is not available
    switch (intent.action) {
      case 'info':
        if (context.repoInfo) {
          return `📦 *${context.repoInfo.name}*\n\n` +
            `*Description:* ${context.repoInfo.description || 'No description'}\n` +
            `*Language:* ${context.repoInfo.language || 'N/A'}\n` +
            `*Stars:* ⭐ ${context.repoInfo.stars} | *Forks:* 🍴 ${context.repoInfo.forks}\n` +
            `*Open Issues:* ${context.repoInfo.openIssues}\n\n` +
            `💡 *Tip:* Add OPENAI_API_KEY to your .env for more detailed answers!`;
        }
        break;
      case 'file':
        if (context.fileContents) {
          return `📄 *File: ${context.filePath}*\n\n\`\`\`\n${context.fileContents.substring(0, 500)}${context.fileContents.length > 500 ? '...' : ''}\n\`\`\``;
        }
        return "File not found. Please check the file path.";
      case 'search':
        if (context.searchResults && context.searchResults.length > 0) {
          let result = `🔍 *Search Results*\n\n`;
          context.searchResults.forEach((r: any, i: number) => {
            result += `${i + 1}. *${r.path}*\n`;
          });
          return result;
        }
        return "No results found.";
      case 'commits':
        if (context.commits && context.commits.length > 0) {
          let result = `📝 *Recent Commits*\n\n`;
          context.commits.slice(0, 5).forEach((c: any, i: number) => {
            result += `${i + 1}. ${c.sha} - ${c.message}\n`;
          });
          return result;
        }
        break;
      case 'issues':
        if (context.issues && context.issues.length > 0) {
          let result = `🐛 *Open Issues*\n\n`;
          context.issues.slice(0, 5).forEach((issue: any, idx: number) => {
            result += `${idx + 1}. #${issue.number} - ${issue.title}\n`;
          });
          return result;
        }
        return "✅ No open issues!";
    }

    return "I need an OpenAI API key for detailed answers. Please set OPENAI_API_KEY in your .env file.";
  }

  private fallbackUnderstanding(question: string): LLMIntent {
    const lowerQuestion = question.toLowerCase();

    // Remove bot mentions
    const cleanQuestion = question.replace(/<@\w+>/g, '').trim();

    if (lowerQuestion.includes('info') || lowerQuestion.includes('about') || lowerQuestion.includes('what is')) {
      return { action: 'info', parameters: {}, confidence: 0.7 };
    }

    if (lowerQuestion.includes('file') && (lowerQuestion.includes('read') || lowerQuestion.includes('show') || lowerQuestion.includes('get'))) {
      const filePath = this.extractFilePath(cleanQuestion);
      if (filePath) {
        return { action: 'file', parameters: { filePath }, confidence: 0.8 };
      }
    }

    if (lowerQuestion.includes('search') || lowerQuestion.includes('find') || lowerQuestion.includes('where')) {
      const searchTerm = this.extractSearchTerm(cleanQuestion);
      if (searchTerm) {
        return { action: 'search', parameters: { searchTerm }, confidence: 0.8 };
      }
    }

    if (lowerQuestion.includes('commit') || lowerQuestion.includes('recent')) {
      return { action: 'commits', parameters: {}, confidence: 0.8 };
    }

    if (lowerQuestion.includes('issue') || lowerQuestion.includes('bug') || lowerQuestion.includes('problem')) {
      return { action: 'issues', parameters: {}, confidence: 0.8 };
    }

    if (lowerQuestion.includes('list') || lowerQuestion.includes('files') || lowerQuestion.includes('directory')) {
      const dirPath = this.extractDirectoryPath(cleanQuestion);
      return { action: 'list', parameters: { directoryPath: dirPath }, confidence: 0.8 };
    }

    return { action: 'general', parameters: { question: cleanQuestion }, confidence: 0.5 };
  }

  private extractFilePath(question: string): string | null {
    const patterns = [
      /(?:file|read|show|get)\s+([^\s]+\.\w+)/i,
      /([^\s]+\.\w+)/,
    ];

    for (const pattern of patterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  private extractSearchTerm(question: string): string | null {
    const cleaned = question
      .replace(/(?:search|find|where).*?(?:for|is|are)\s*/gi, '')
      .trim();

    if (cleaned.length > 0 && cleaned.length < 100) {
      return cleaned;
    }

    return null;
  }

  private extractDirectoryPath(question: string): string | undefined {
    const match = question.match(/(?:in|from|directory|folder)\s+([^\s]+)/i);
    return match && match[1] ? match[1] : undefined;
  }
}

