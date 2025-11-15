import OpenAI from 'openai';

export interface LLMIntent {
  action: 'info' | 'file' | 'search' | 'commits' | 'issues' | 'list' | 'team' | 'collaborators' | 'contributors' | 'linear_issues' | 'linear_create' | 'linear_update' | 'linear_assign' | 'linear_comment' | 'linear_teams' | 'linear_projects' | 'linear_search' | 'linear_state' | 'browse' | 'structure' | 'tree' | 'find_usage' | 'general';
  parameters: {
    filePath?: string;
    searchTerm?: string;
    directoryPath?: string;
    question?: string;
    // Linear parameters
    linearTitle?: string;
    linearTeam?: string;
    linearDescription?: string;
    linearIssueId?: string;
    linearState?: string;
    linearAssignee?: string;
    linearComment?: string;
    linearSearchTerm?: string;
    // Browsing parameters
    startLine?: number;
    endLine?: number;
    moduleName?: string;
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
      const systemPrompt = `You are a helpful assistant that understands questions about GitHub repositories and Linear project management.
Analyze the user's question and determine their intent. Return a JSON object with:
- action: one of "info", "file", "search", "commits", "issues", "list", "team", "collaborators", "contributors", "linear_issues", "linear_create", "linear_update", "linear_assign", "linear_comment", "linear_teams", "linear_projects", "linear_search", "linear_state", "browse", "structure", "tree", "find_usage", or "general"
- parameters: object with relevant fields (filePath, searchTerm, directoryPath, question, linearTitle, linearTeam, linearDescription, linearIssueId, linearState, linearAssignee, linearComment, linearSearchTerm, startLine, endLine, moduleName)
- confidence: number 0-1

GitHub Examples:
- "What is this repo about?" → {"action": "info", "parameters": {}, "confidence": 0.9}
- "Show me package.json" → {"action": "file", "parameters": {"filePath": "package.json"}, "confidence": 0.95}
- "Search for authentication" → {"action": "search", "parameters": {"searchTerm": "authentication"}, "confidence": 0.9}
- "Recent commits" → {"action": "commits", "parameters": {}, "confidence": 0.9}
- "Open issues" → {"action": "issues", "parameters": {}, "confidence": 0.9}
- "Show directory tree" → {"action": "tree", "parameters": {}, "confidence": 0.9}
- "What's the structure of src/index.ts?" → {"action": "structure", "parameters": {"filePath": "src/index.ts"}, "confidence": 0.9}
- "Show me lines 10-50 of src/index.ts" → {"action": "browse", "parameters": {"filePath": "src/index.ts", "startLine": 10, "endLine": 50}, "confidence": 0.9}
- "Find files that use GitHubService" → {"action": "find_usage", "parameters": {"moduleName": "GitHubService"}, "confidence": 0.9}

Linear Examples:
- "Show me my Linear issues" → {"action": "linear_issues", "parameters": {}, "confidence": 0.9}
- "Create a Linear issue titled 'Fix login bug' in Frontend team" → {"action": "linear_create", "parameters": {"linearTitle": "Fix login bug", "linearTeam": "Frontend"}, "confidence": 0.9}
- "Update issue FE-123 to In Progress" → {"action": "linear_update", "parameters": {"linearIssueId": "FE-123", "linearState": "In Progress"}, "confidence": 0.9}
- "Assign issue BE-456 to John" → {"action": "linear_assign", "parameters": {"linearIssueId": "BE-456", "linearAssignee": "John"}, "confidence": 0.9}
- "Add comment to issue UI-789: 'Needs review'" → {"action": "linear_comment", "parameters": {"linearIssueId": "UI-789", "linearComment": "Needs review"}, "confidence": 0.9}
- "Show Linear teams" → {"action": "linear_teams", "parameters": {}, "confidence": 0.9}
- "Show Linear projects" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "Search Linear issues for 'bug'" → {"action": "linear_search", "parameters": {"linearSearchTerm": "bug"}, "confidence": 0.9}
- "Show issues in In Progress state" → {"action": "linear_state", "parameters": {"linearState": "In Progress"}, "confidence": 0.9}

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
    fileChunk?: any;
    codeStructure?: any;
    directoryTree?: any[];
    usageFiles?: string[];
    moduleName?: string;
    searchResults?: any[];
    commits?: any[];
    issues?: any[];
    files?: string[];
    directoryPath?: string;
    collaborators?: any[];
    contributors?: any[];
    linearIssues?: any[];
    linearTeams?: any[];
    linearProjects?: any[];
    linearSearchTerm?: string;
    linearState?: string;
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

      // File chunk (with line numbers)
      if (context.fileChunk) {
        contextText += `# File: ${context.fileChunk.path} (Lines ${context.fileChunk.startLine}-${context.fileChunk.endLine} of ${context.fileChunk.totalLines})\n`;
        contextText += `${context.fileChunk.content}\n\n`;
      }

      // Code structure
      if (context.codeStructure) {
        contextText += `# Code Structure: ${context.codeStructure.path}\n`;
        contextText += `Summary: ${context.codeStructure.summary}\n`;
        if (context.codeStructure.exports.length > 0) {
          contextText += `Exports: ${context.codeStructure.exports.join(', ')}\n`;
        }
        if (context.codeStructure.imports.length > 0) {
          contextText += `Imports: ${context.codeStructure.imports.slice(0, 10).join(', ')}${context.codeStructure.imports.length > 10 ? '...' : ''}\n`;
        }
        if (context.codeStructure.classes.length > 0) {
          contextText += `Classes:\n`;
          context.codeStructure.classes.forEach((cls: any) => {
            contextText += `  - ${cls.name} (line ${cls.line})\n`;
          });
        }
        if (context.codeStructure.functions.length > 0) {
          contextText += `Functions:\n`;
          context.codeStructure.functions.slice(0, 20).forEach((fn: any) => {
            contextText += `  - ${fn.name} (line ${fn.line})\n`;
          });
          if (context.codeStructure.functions.length > 20) {
            contextText += `  ... and ${context.codeStructure.functions.length - 20} more\n`;
          }
        }
        contextText += `\n`;
      }

      // Directory tree
      if (context.directoryTree && context.directoryTree.length > 0) {
        contextText += `# Directory Tree: ${context.directoryPath || 'root'}\n`;
        const formatTree = (items: any[], indent: string = ''): string => {
          let result = '';
          items.forEach((item) => {
            const icon = item.type === 'directory' ? '📁' : '📄';
            result += `${indent}${icon} ${item.name}`;
            if (item.type === 'file' && item.size) {
              result += ` (${item.size} bytes)`;
            }
            result += '\n';
            if (item.children && item.children.length > 0) {
              result += formatTree(item.children, indent + '  ');
            }
          });
          return result;
        };
        contextText += formatTree(context.directoryTree);
        contextText += `\n`;
      }

      // Usage files
      if (context.usageFiles && context.usageFiles.length > 0) {
        contextText += `# Files using "${context.moduleName}":\n`;
        context.usageFiles.forEach((file: string, idx: number) => {
          contextText += `${idx + 1}. ${file}\n`;
        });
        contextText += `\n`;
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

      // Collaborators
      if (context.collaborators && context.collaborators.length > 0) {
        contextText += `# Repository Collaborators\n`;
        context.collaborators.forEach((collab, idx) => {
          const perms = [];
          if (collab.permissions?.admin) perms.push('Admin');
          if (collab.permissions?.maintain) perms.push('Maintain');
          if (collab.permissions?.push) perms.push('Push');
          if (collab.permissions?.triage) perms.push('Triage');
          if (collab.permissions?.pull) perms.push('Pull');
          contextText += `${idx + 1}. ${collab.username} (${collab.type}) - Permissions: ${perms.join(', ')}\n`;
        });
        contextText += `\n`;
      }

      // Contributors
      if (context.contributors && context.contributors.length > 0) {
        contextText += `# Repository Contributors\n`;
        context.contributors.forEach((contrib, idx) => {
          contextText += `${idx + 1}. ${contrib.username} - ${contrib.contributions} contribution${contrib.contributions !== 1 ? 's' : ''}\n`;
        });
        contextText += `\n`;
      }

      // Linear Issues
      if (context.linearIssues && context.linearIssues.length > 0) {
        contextText += `# Linear Issues\n`;
        context.linearIssues.forEach((issue: any, idx: number) => {
          contextText += `${idx + 1}. ${issue.identifier} - ${issue.title}\n`;
          contextText += `   Status: ${issue.state.name}\n`;
          contextText += `   Team: ${issue.team.name}\n`;
          if (issue.assignee) {
            contextText += `   Assignee: ${issue.assignee.name}\n`;
          }
          contextText += `   ${issue.url}\n`;
        });
        contextText += `\n`;
      }

      // Linear Teams
      if (context.linearTeams && context.linearTeams.length > 0) {
        contextText += `# Linear Teams\n`;
        context.linearTeams.forEach((team: any, idx: number) => {
          contextText += `${idx + 1}. ${team.name} (${team.key})\n`;
          if (team.description) {
            contextText += `   ${team.description}\n`;
          }
        });
        contextText += `\n`;
      }

      // Linear Projects
      if (context.linearProjects && context.linearProjects.length > 0) {
        contextText += `# Linear Projects\n`;
        context.linearProjects.forEach((project: any, idx: number) => {
          contextText += `${idx + 1}. ${project.name} - ${project.state} (${project.progress}%)\n`;
          if (project.description) {
            contextText += `   ${project.description}\n`;
          }
        });
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
        case 'team':
        case 'collaborators':
        case 'contributors':
          systemPrompt += 'List and describe the team members, collaborators, or contributors.';
          break;
        case 'linear_issues':
          systemPrompt += 'List and describe the Linear issues.';
          break;
        case 'linear_teams':
          systemPrompt += 'List and describe the Linear teams.';
          break;
        case 'linear_projects':
          systemPrompt += 'List and describe the Linear projects.';
          break;
        case 'linear_search':
          systemPrompt += 'List Linear issues matching the search term.';
          break;
        case 'linear_state':
          systemPrompt += 'List Linear issues in the specified state.';
          break;
        case 'browse':
          systemPrompt += 'Show the specific file lines requested, with line numbers and context.';
          break;
        case 'structure':
          systemPrompt += 'Explain the code structure, including exports, imports, functions, and classes.';
          break;
        case 'tree':
          systemPrompt += 'Describe the directory structure and file organization.';
          break;
        case 'find_usage':
          systemPrompt += 'List and explain where the module or function is used.';
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

  generateFallbackResponse(intent: LLMIntent, context: any): string {
    // Fallback responses when LLM is not available
    // Validate intent
    if (!intent || !intent.action) {
      return "I couldn't understand your question. Please try rephrasing it.";
    }

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
      case 'team':
      case 'collaborators':
        if (context.collaborators && context.collaborators.length > 0) {
          let result = `👥 *Repository Collaborators*\n\n`;
          context.collaborators.forEach((collab: any, idx: number) => {
            const perms = [];
            if (collab.permissions?.admin) perms.push('Admin');
            if (collab.permissions?.push) perms.push('Push');
            if (collab.permissions?.triage) perms.push('Triage');
            result += `${idx + 1}. *${collab.username}* (${collab.type})\n`;
            result += `   Permissions: ${perms.join(', ') || 'Pull only'}\n\n`;
          });
          return result;
        }
        return "No collaborators found.";
      case 'contributors':
        if (context.contributors && context.contributors.length > 0) {
          let result = `👤 *Repository Contributors*\n\n`;
          context.contributors.slice(0, 10).forEach((contrib: any, idx: number) => {
            result += `${idx + 1}. *${contrib.username}* - ${contrib.contributions} contribution${contrib.contributions !== 1 ? 's' : ''}\n`;
          });
          return result;
        }
        return "No contributors found.";
      case 'linear_issues':
        if (context.linearIssues && context.linearIssues.length > 0) {
          let result = `📋 *My Linear Issues*\n\n`;
          context.linearIssues.forEach((issue: any, idx: number) => {
            result += `${idx + 1}. *${issue.identifier}* - ${issue.title}\n`;
            result += `   Status: ${issue.state.name} | Team: ${issue.team.name}\n`;
            if (issue.assignee) {
              result += `   Assignee: ${issue.assignee.name}\n`;
            }
            result += `   ${issue.url}\n\n`;
          });
          return result;
        }
        return "✅ No Linear issues assigned to you!";
      case 'linear_teams':
        if (context.linearTeams && context.linearTeams.length > 0) {
          let result = `👥 *Linear Teams*\n\n`;
          context.linearTeams.forEach((team: any, idx: number) => {
            result += `${idx + 1}. *${team.name}* (${team.key})\n`;
            if (team.description) {
              result += `   ${team.description}\n`;
            }
            result += `\n`;
          });
          return result;
        }
        return "No Linear teams found.";
      case 'linear_projects':
        if (context.linearProjects && context.linearProjects.length > 0) {
          let result = `📊 *Linear Projects*\n\n`;
          context.linearProjects.forEach((project: any, idx: number) => {
            result += `${idx + 1}. *${project.name}*\n`;
            result += `   State: ${project.state} | Progress: ${project.progress}%\n`;
            if (project.description) {
              result += `   ${project.description}\n`;
            }
            result += `   ${project.url}\n\n`;
          });
          return result;
        }
        return "No Linear projects found.";
      case 'linear_search':
        if (context.linearIssues && context.linearIssues.length > 0) {
          let result = `🔍 *Linear Issues matching "${context.linearSearchTerm}"*\n\n`;
          context.linearIssues.forEach((issue: any, idx: number) => {
            result += `${idx + 1}. *${issue.identifier}* - ${issue.title}\n`;
            result += `   Status: ${issue.state.name} | Team: ${issue.team.name}\n`;
            result += `   ${issue.url}\n\n`;
          });
          return result;
        }
        return `No Linear issues found matching "${context.linearSearchTerm}".`;
      case 'linear_state':
        if (context.linearIssues && context.linearIssues.length > 0) {
          let result = `📋 *Linear Issues in "${context.linearState}" state*\n\n`;
          context.linearIssues.forEach((issue: any, idx: number) => {
            result += `${idx + 1}. *${issue.identifier}* - ${issue.title}\n`;
            result += `   Team: ${issue.team.name}\n`;
            if (issue.assignee) {
              result += `   Assignee: ${issue.assignee.name}\n`;
            }
            result += `   ${issue.url}\n\n`;
          });
          return result;
        }
        return `No Linear issues found in "${context.linearState}" state.`;
      case 'browse':
        if (context.fileChunk) {
          let result = `📖 *${context.fileChunk.path}* (Lines ${context.fileChunk.startLine}-${context.fileChunk.endLine} of ${context.fileChunk.totalLines})\n\n`;
          result += `\`\`\`\n${context.fileChunk.content}\n\`\`\``;
          return result;
        }
        return "File not found or could not be read.";
      case 'structure':
        if (context.codeStructure) {
          const s = context.codeStructure;
          let result = `🔍 *Code Structure: ${s.path}*\n\n`;
          result += `*Summary:* ${s.summary}\n\n`;
          if (s.exports.length > 0) {
            result += `*Exports:* ${s.exports.join(', ')}\n`;
          }
          if (s.imports.length > 0) {
            result += `*Imports:* ${s.imports.slice(0, 5).join(', ')}${s.imports.length > 5 ? ` (+${s.imports.length - 5} more)` : ''}\n`;
          }
          if (s.classes.length > 0) {
            result += `\n*Classes:*\n`;
            s.classes.forEach((cls: any) => {
              result += `  • ${cls.name} (line ${cls.line})\n`;
            });
          }
          if (s.functions.length > 0) {
            result += `\n*Functions:*\n`;
            s.functions.slice(0, 10).forEach((fn: any) => {
              result += `  • ${fn.name} (line ${fn.line})\n`;
            });
            if (s.functions.length > 10) {
              result += `  ... and ${s.functions.length - 10} more\n`;
            }
          }
          return result;
        }
        return "Could not analyze code structure.";
      case 'tree':
        if (context.directoryTree && context.directoryTree.length > 0) {
          const formatTree = (items: any[], indent: string = ''): string => {
            let result = '';
            items.forEach((item) => {
              const icon = item.type === 'directory' ? '📁' : '📄';
              result += `${indent}${icon} *${item.name}*`;
              if (item.type === 'file' && item.size) {
                result += ` (${item.size} bytes)`;
              }
              result += '\n';
              if (item.children && item.children.length > 0) {
                result += formatTree(item.children, indent + '  ');
              }
            });
            return result;
          };
          return `🌳 *Directory Tree: ${context.directoryPath || 'root'}*\n\n${formatTree(context.directoryTree)}`;
        }
        return "Directory not found or is empty.";
      case 'find_usage':
        if (context.usageFiles && context.usageFiles.length > 0) {
          let result = `🔎 *Files using "${context.moduleName}":*\n\n`;
          context.usageFiles.forEach((file: string, idx: number) => {
            result += `${idx + 1}. ${file}\n`;
          });
          return result;
        }
        return `No files found using "${context.moduleName}".`;
    }

    return "I need an OpenAI API key for detailed answers. Please set OPENAI_API_KEY in your .env file.";
  }

  private fallbackUnderstanding(question: string): LLMIntent {
    const lowerQuestion = question.toLowerCase();
    
    // Check for code browsing keywords
    if (lowerQuestion.includes('structure') || lowerQuestion.includes('analyze') || lowerQuestion.includes('what exports') || lowerQuestion.includes('what imports')) {
      return { action: 'structure', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('tree') || lowerQuestion.includes('directory structure') || lowerQuestion.includes('file structure')) {
      return { action: 'tree', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('find') && (lowerQuestion.includes('usage') || lowerQuestion.includes('uses') || lowerQuestion.includes('import'))) {
      return { action: 'find_usage', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('line') && (lowerQuestion.includes('show') || lowerQuestion.includes('read') || lowerQuestion.match(/\d+-\d+/))) {
      return { action: 'browse', parameters: {}, confidence: 0.7 };
    }
    
    // Check for Linear keywords
    if (lowerQuestion.includes('linear') && lowerQuestion.includes('issue')) {
      if (lowerQuestion.includes('create') || lowerQuestion.includes('new')) {
        return { action: 'linear_create', parameters: {}, confidence: 0.7 };
      }
      if (lowerQuestion.includes('update') || lowerQuestion.includes('change') || lowerQuestion.includes('status')) {
        return { action: 'linear_update', parameters: {}, confidence: 0.7 };
      }
      if (lowerQuestion.includes('assign')) {
        return { action: 'linear_assign', parameters: {}, confidence: 0.7 };
      }
      if (lowerQuestion.includes('comment')) {
        return { action: 'linear_comment', parameters: {}, confidence: 0.7 };
      }
      return { action: 'linear_issues', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('linear') && lowerQuestion.includes('team')) {
      return { action: 'linear_teams', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('linear') && lowerQuestion.includes('project')) {
      return { action: 'linear_projects', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('linear') && (lowerQuestion.includes('search') || lowerQuestion.includes('find'))) {
      return { action: 'linear_search', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('linear') && (lowerQuestion.includes('state') || lowerQuestion.includes('status'))) {
      return { action: 'linear_state', parameters: {}, confidence: 0.7 };
    }
    
    // Check for team/collaborator related keywords
    if (lowerQuestion.includes('team') || lowerQuestion.includes('collaborator') || 
        lowerQuestion.includes('who works') || lowerQuestion.includes('team members')) {
      return { action: 'team', parameters: {}, confidence: 0.7 };
    }
    
    if (lowerQuestion.includes('contributor') || lowerQuestion.includes('who contributed')) {
      return { action: 'contributors', parameters: {}, confidence: 0.7 };
    }

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

