import { GitHubService } from '../services/github';
import { LLMService } from '../services/llm';

export class QuestionHandler {
  private githubService: GitHubService;
  private llmService: LLMService;

  constructor(githubService: GitHubService, llmService: LLMService) {
    this.githubService = githubService;
    this.llmService = llmService;
  }

  async handleQuestion(question: string): Promise<string> {
    const lowerQuestion = question.toLowerCase().trim();
    
    // Handle simple greetings with help
    if (lowerQuestion === 'hi' || lowerQuestion === 'hello' || lowerQuestion === 'hey') {
      return this.getHelpMessage();
    }

    // Use LLM to understand the question and get intent
    const intent = await this.llmService.understandQuestion(question);

    // Gather GitHub context based on intent
    let context: any = {};

    try {
      // Always get repo info for context
      context.repoInfo = await this.githubService.getRepoInfo();

      // Get specific data based on intent
      switch (intent.action) {
        case 'file':
          if (intent.parameters.filePath) {
            const file = await this.githubService.getFileContent(intent.parameters.filePath);
            if (file) {
              context.fileContents = file.content;
              context.filePath = file.path;
            }
          }
          break;

        case 'search':
          if (intent.parameters.searchTerm) {
            context.searchResults = await this.githubService.searchCode(intent.parameters.searchTerm);
          }
          break;

        case 'commits':
          context.commits = await this.githubService.getRecentCommits(10);
          break;

        case 'issues':
          context.issues = await this.githubService.getOpenIssues(10);
          break;

        case 'list':
          context.files = await this.githubService.listDirectory(intent.parameters.directoryPath);
          context.directoryPath = intent.parameters.directoryPath || 'root';
          break;

        case 'info':
          // Already have repoInfo
          break;

        case 'general':
          // For general questions, try to get relevant context
          // Extract potential file names or search terms
          const fileMatch = question.match(/(?:file|code|function|class|module)\s+([^\s]+\.\w+)/i);
          if (fileMatch) {
            const file = await this.githubService.getFileContent(fileMatch[1]);
            if (file) {
              context.fileContents = file.content;
              context.filePath = file.path;
            }
          }
          
          // If no file found, try searching for keywords
          if (!context.fileContents) {
            const searchTerms = question.match(/\b(\w{4,})\b/g)?.slice(0, 3);
            if (searchTerms) {
              context.searchResults = await this.githubService.searchCode(searchTerms.join(' '));
            }
          }
          break;
      }

      // Use LLM to generate response with all context
      return await this.llmService.answerQuestionWithContext(question, intent, context);

    } catch (error) {
      console.error('Error gathering context:', error);
      // Fallback: try to answer with just repo info
      try {
        if (!context.repoInfo) {
          context.repoInfo = await this.githubService.getRepoInfo();
        }
        return await this.llmService.answerQuestionWithContext(question, intent, context);
      } catch (fallbackError) {
        return "Sorry, I encountered an error accessing GitHub. Please check your GitHub token and repository settings.";
      }
    }
  }


  private async handleInfoQuestion(): Promise<string> {
    try {
      const info = await this.githubService.getRepoInfo();
      return `📦 *Repository Information*\n\n` +
        `*Name:* ${info.name}\n` +
        `*Description:* ${info.description || 'No description'}\n` +
        `*Language:* ${info.language || 'N/A'}\n` +
        `*Stars:* ⭐ ${info.stars}\n` +
        `*Forks:* 🍴 ${info.forks}\n` +
        `*Open Issues:* ${info.openIssues}\n` +
        `*Default Branch:* ${info.defaultBranch}\n` +
        `*Created:* ${new Date(info.createdAt).toLocaleDateString()}\n` +
        `*Last Updated:* ${new Date(info.updatedAt).toLocaleDateString()}`;
    } catch (error) {
      return '❌ Sorry, I couldn\'t fetch repository information. Please check your GitHub token and repository settings.';
    }
  }

  private async handleFileQuestion(filePath: string): Promise<string> {
    try {
      const file = await this.githubService.getFileContent(filePath);
      if (!file) {
        return `❌ File not found: ${filePath}`;
      }

      if (file.size > 10000) {
        return `📄 *File: ${file.path}*\n\n` +
          `⚠️ File is too large (${file.size} bytes). Showing first 500 characters:\n\n` +
          `\`\`\`\n${file.content.substring(0, 500)}...\n\`\`\``;
      }

      return `📄 *File: ${file.path}*\n\n\`\`\`\n${file.content}\n\`\`\``;
    } catch (error) {
      return `❌ Error reading file ${filePath}: ${error}`;
    }
  }

  private async handleSearchQuestion(searchTerm: string): Promise<string> {
    try {
      const results = await this.githubService.searchCode(searchTerm);
      if (results.length === 0) {
        return `🔍 No results found for: "${searchTerm}"`;
      }

      let response = `🔍 *Search results for: "${searchTerm}"*\n\n`;
      results.forEach((result, index) => {
        response += `${index + 1}. *${result.path}*\n`;
        if (result.matches.length > 0) {
          response += `   Found at: ${result.matches.join(', ')}\n`;
        }
        response += `\n`;
      });

      return response;
    } catch (error) {
      return `❌ Error searching code: ${error}`;
    }
  }

  private async handleCommitsQuestion(): Promise<string> {
    try {
      const commits = await this.githubService.getRecentCommits(5);
      if (commits.length === 0) {
        return '📝 No recent commits found.';
      }

      let response = '📝 *Recent Commits*\n\n';
      commits.forEach((commit, index) => {
        response += `${index + 1}. *${commit.sha}* - ${commit.message}\n`;
        response += `   By: ${commit.author} on ${new Date(commit.date).toLocaleDateString()}\n`;
        response += `   ${commit.url}\n\n`;
      });

      return response;
    } catch (error) {
      return `❌ Error fetching commits: ${error}`;
    }
  }

  private async handleIssuesQuestion(): Promise<string> {
    try {
      const issues = await this.githubService.getOpenIssues(5);
      if (issues.length === 0) {
        return '✅ No open issues!';
      }

      let response = `🐛 *Open Issues (${issues.length})*\n\n`;
      issues.forEach((issue, index) => {
        response += `${index + 1}. *#${issue.number}* - ${issue.title}\n`;
        response += `   Opened by: ${issue.author} on ${new Date(issue.createdAt).toLocaleDateString()}\n`;
        response += `   ${issue.url}\n\n`;
      });

      return response;
    } catch (error) {
      return `❌ Error fetching issues: ${error}`;
    }
  }

  private async handleListQuestion(dirPath?: string): Promise<string> {
    try {
      const files = await this.githubService.listDirectory(dirPath);
      if (files.length === 0) {
        return `📁 Directory is empty: ${dirPath || 'root'}`;
      }

      let response = `📁 *Files in ${dirPath || 'root directory'}*\n\n`;
      files.slice(0, 20).forEach((file, index) => {
        response += `${index + 1}. ${file}\n`;
      });

      if (files.length > 20) {
        response += `\n... and ${files.length - 20} more files`;
      }

      return response;
    } catch (error) {
      return `❌ Error listing directory: ${error}`;
    }
  }

  private extractFilePath(question: string): string | null {
    // Try to extract file path from question
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
    // Remove common search words
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

  private getHelpMessage(): string {
    return `🤖 *I'm a GitHub bot! Here's what I can help you with:*\n\n` +
      `📦 *Repository Info*\n` +
      `• "What is this repo about?" - Get repository information\n` +
      `• "Show me the repo stats" - See stars, forks, language, etc.\n\n` +
      `📄 *Files*\n` +
      `• "Show me package.json" - Display file contents\n` +
      `• "Read src/index.ts" - View any file\n\n` +
      `🔍 *Search*\n` +
      `• "Search for authentication" - Find code in the repo\n` +
      `• "Where is the login function?" - Locate specific code\n\n` +
      `📝 *Commits & Issues*\n` +
      `• "Recent commits" - Show latest commits\n` +
      `• "Open issues" - List open issues\n\n` +
      `📁 *Directories*\n` +
      `• "List files in src" - Show directory contents\n\n` +
      `💬 *General Questions*\n` +
      `• "How does authentication work?" - Ask about your codebase\n` +
      `• "Explain the main function" - Get code explanations\n\n` +
      `*Just ask me anything about your repository!*`;
  }
}

