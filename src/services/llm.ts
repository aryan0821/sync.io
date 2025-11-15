import OpenAI from 'openai';

export interface LLMIntent {
  action: 'info' | 'file' | 'search' | 'commits' | 'issues' | 'list' | 'team' | 'collaborators' | 'contributors' | 'linear_issues' | 'linear_create' | 'linear_update' | 'linear_assign' | 'linear_comment' | 'linear_teams' | 'linear_projects' | 'linear_search' | 'linear_state' | 'browse' | 'structure' | 'tree' | 'find_usage' | 'general' | 'github_issue' | 'user_work' | 'work_conflict_check';
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
    // GitHub issue parameters
    githubIssueNumber?: number;
    // Browsing parameters
    startLine?: number;
    endLine?: number;
    moduleName?: string;
    // User work parameters
    username?: string;
    // Work conflict check parameters
    proposedWork?: string;
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
- action: one of "info", "file", "search", "commits", "issues", "list", "team", "collaborators", "contributors", "linear_issues", "linear_create", "linear_update", "linear_assign", "linear_comment", "linear_teams", "linear_projects", "linear_search", "linear_state", "browse", "structure", "tree", "find_usage", "github_issue", "user_work", "work_conflict_check", or "general"
- parameters: object with relevant fields (filePath, searchTerm, directoryPath, question, linearTitle, linearTeam, linearDescription, linearIssueId, linearState, linearAssignee, linearComment, linearSearchTerm, startLine, endLine, moduleName, username, proposedWork)
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
- "Show me existing Linear issues" → {"action": "linear_issues", "parameters": {}, "confidence": 0.9}
- "List all Linear issues" → {"action": "linear_issues", "parameters": {}, "confidence": 0.9}
- "What Linear issues are there?" → {"action": "linear_issues", "parameters": {}, "confidence": 0.9}
- "Who are the issues assigned to?" → {"action": "linear_issues", "parameters": {}, "confidence": 0.9}
- "Who are issues assigned to?" → {"action": "linear_issues", "parameters": {}, "confidence": 0.9}
- "Show me recent Linear projects" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "List Linear projects" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "What are my Linear projects?" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "What is the current status of my Linear project?" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "Status of my Linear project" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "Create a Linear issue titled 'Fix login bug' in Frontend team" → {"action": "linear_create", "parameters": {"linearTitle": "Fix login bug", "linearTeam": "Frontend"}, "confidence": 0.9}
- "Update issue FE-123 to In Progress" → {"action": "linear_update", "parameters": {"linearIssueId": "FE-123", "linearState": "In Progress"}, "confidence": 0.9}
- "What is the status of SYN-2?" → {"action": "linear_update", "parameters": {"linearIssueId": "SYN-2"}, "confidence": 0.9}
- "Status of SYN-2" → {"action": "linear_update", "parameters": {"linearIssueId": "SYN-2"}, "confidence": 0.9}
- "Who is assigned to SYN-2?" → {"action": "linear_update", "parameters": {"linearIssueId": "SYN-2"}, "confidence": 0.9}
- "Who is SYN-2 assigned to?" → {"action": "linear_update", "parameters": {"linearIssueId": "SYN-2"}, "confidence": 0.9}
- "Who's working on SYN-2?" → {"action": "linear_update", "parameters": {"linearIssueId": "SYN-2"}, "confidence": 0.9}
- "Show me details of SYN-2" → {"action": "linear_update", "parameters": {"linearIssueId": "SYN-2"}, "confidence": 0.9}
- "Assign issue BE-456 to John" → {"action": "linear_assign", "parameters": {"linearIssueId": "BE-456", "linearAssignee": "John"}, "confidence": 0.9}
- "Add comment to issue UI-789: 'Needs review'" → {"action": "linear_comment", "parameters": {"linearIssueId": "UI-789", "linearComment": "Needs review"}, "confidence": 0.9}
- "Show Linear teams" → {"action": "linear_teams", "parameters": {}, "confidence": 0.9}
- "Who are my teammates on Linear?" → {"action": "linear_teams", "parameters": {}, "confidence": 0.9}
- "Show Linear projects" → {"action": "linear_projects", "parameters": {}, "confidence": 0.9}
- "Search Linear issues for 'bug'" → {"action": "linear_search", "parameters": {"linearSearchTerm": "bug"}, "confidence": 0.9}
- "Show issues in In Progress state" → {"action": "linear_state", "parameters": {"linearState": "In Progress"}, "confidence": 0.9}

GitHub Issue Examples:
- "Who is working on issue #123?" → {"action": "github_issue", "parameters": {"githubIssueNumber": 123}, "confidence": 0.9}
- "Who is assigned to issue #456?" → {"action": "github_issue", "parameters": {"githubIssueNumber": 456}, "confidence": 0.9}
- "Show me issue #789" → {"action": "github_issue", "parameters": {"githubIssueNumber": 789}, "confidence": 0.9}
- "What is the status of issue #42?" → {"action": "github_issue", "parameters": {"githubIssueNumber": 42}, "confidence": 0.9}

User Work Examples:
- "What is aryan0821 currently working on?" → {"action": "user_work", "parameters": {"username": "aryan0821"}, "confidence": 0.9}
- "What is john working on?" → {"action": "user_work", "parameters": {"username": "john"}, "confidence": 0.9}
- "Show me what user123 is working on" → {"action": "user_work", "parameters": {"username": "user123"}, "confidence": 0.9}
- "What are the current tasks for aryan0821?" → {"action": "user_work", "parameters": {"username": "aryan0821"}, "confidence": 0.9}

Work Conflict Check Examples:
- "Should I work on authentication?" → {"action": "work_conflict_check", "parameters": {"proposedWork": "authentication"}, "confidence": 0.9}
- "Should I work on the login feature?" → {"action": "work_conflict_check", "parameters": {"proposedWork": "login feature"}, "confidence": 0.9}
- "Is anyone working on webhooks?" → {"action": "work_conflict_check", "parameters": {"proposedWork": "webhooks"}, "confidence": 0.9}
- "Should I start working on issue #4?" → {"action": "work_conflict_check", "parameters": {"proposedWork": "issue #4"}, "confidence": 0.9}
- "Can I work on the sync feature?" → {"action": "work_conflict_check", "parameters": {"proposedWork": "sync feature"}, "confidence": 0.9}

User Implementation Questions:
- "How exactly is Beatriz implementing standup notes generation?" → {"action": "general", "parameters": {}, "confidence": 0.9}
- "How is Beatriz solving the standup notes issue?" → {"action": "general", "parameters": {}, "confidence": 0.9}
- "What is Beatriz's approach to standup notes?" → {"action": "general", "parameters": {}, "confidence": 0.9}
- "How is [name] implementing [feature]?" → {"action": "general", "parameters": {}, "confidence": 0.85}

IMPORTANT RULES:
1. Issue number patterns:
   - GitHub issues use #number format (e.g., #1, #123, #456) → use "github_issue" action with githubIssueNumber parameter
   - Linear issues use LETTERS-number format (e.g., SYN-1, FE-123, BE-456) → use "linear_update" action with linearIssueId parameter
   - If you see a pattern like #123 or "issue 123", it's ALWAYS a GitHub issue, NOT a Linear issue
2. If the question mentions "Linear" or asks about Linear projects, teams, issues, etc., you MUST use a linear_* action. Do NOT use "search" or "general" actions for Linear queries.

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
    question?: string;
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
    githubIssue?: any;
    conversationHistory?: Array<{ role: string; content: string }>;
    userWork?: {
      username: string;
      githubIssues?: any[];
      githubCommits?: any[];
      linearIssues?: any[];
    };
    userContext?: any;
    workConflicts?: {
      proposedWork: string;
      conflicts: Array<{
        user: string;
        githubIssues?: any[];
        linearIssues?: any[];
        commits?: any[];
        conflictReason: string;
      }>;
      allUsersWork?: Array<{
        username: string;
        githubIssues?: any[];
        linearIssues?: any[];
        commits?: any[];
      }>;
    };
  }): Promise<string> {
    if (!this.openai) {
      // Fallback to basic responses without LLM
      return this.generateFallbackResponse(intent, context);
    }

    try {
      // Build comprehensive context text
      let contextText = '';
      
      // Debug: Log what Linear context we have
      if (intent.action === 'general') {
        console.log('🔍 [LLM] Linear context check:', {
          hasProjects: !!context.linearProjects,
          projectsCount: context.linearProjects?.length || 0,
          hasTeams: !!context.linearTeams,
          teamsCount: context.linearTeams?.length || 0,
          hasIssues: !!context.linearIssues,
          issuesCount: context.linearIssues?.length || 0,
        });
      }

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
          if (issue.assignees && issue.assignees.length > 0) {
            contextText += `   Assignees: ${issue.assignees.join(', ')}\n`;
          }
        });
        contextText += `\n`;
      }

      // User Context (from JSON files)
      if (context.userContext) {
        const userCtx = context.userContext;
        contextText += `# User Context: ${userCtx.name}\n\n`;
        
        if (userCtx.issue) {
          contextText += `**Issue:** ${userCtx.issue}\n\n`;
        }
        
        if (userCtx.solution_approach) {
          const approach = userCtx.solution_approach;
          contextText += `## Solution Approach\n\n`;
          
          if (approach.problem) {
            contextText += `**Problem:** ${approach.problem}\n\n`;
          }
          
          if (approach.approach) {
            contextText += `**Approach:** ${approach.approach}\n\n`;
          }
          
          if (approach.implementation_steps && approach.implementation_steps.length > 0) {
            contextText += `**Implementation Steps:**\n`;
            approach.implementation_steps.forEach((step: string, idx: number) => {
              contextText += `${idx + 1}. ${step}\n`;
            });
            contextText += `\n`;
          }
          
          if (approach.features && approach.features.length > 0) {
            contextText += `**Features:**\n`;
            approach.features.forEach((feature: string, idx: number) => {
              contextText += `- ${feature}\n`;
            });
            contextText += `\n`;
          }
          
          if (approach.current_status) {
            contextText += `**Current Status:** ${approach.current_status}\n\n`;
          }
          
          if (approach.next_steps && approach.next_steps.length > 0) {
            contextText += `**Next Steps:**\n`;
            approach.next_steps.forEach((step: string, idx: number) => {
              contextText += `${idx + 1}. ${step}\n`;
            });
            contextText += `\n`;
          }
          
          if (approach.challenges && approach.challenges.length > 0) {
            contextText += `**Challenges:**\n`;
            approach.challenges.forEach((challenge: string, idx: number) => {
              contextText += `- ${challenge}\n`;
            });
            contextText += `\n`;
          }
          
          if (approach.notes_in_first_person && approach.notes_in_first_person.length > 0) {
            contextText += `**First-Person Notes:**\n`;
            approach.notes_in_first_person.forEach((note: string, idx: number) => {
              contextText += `${idx + 1}. ${note}\n`;
            });
            contextText += `\n`;
          }
        }
        
        if (userCtx.technologies_used && userCtx.technologies_used.length > 0) {
          contextText += `**Technologies Used:** ${userCtx.technologies_used.join(', ')}\n\n`;
        }
        
        if (userCtx.last_updated) {
          contextText += `**Last Updated:** ${userCtx.last_updated}\n\n`;
        }
      }

      // User Work
      if (context.userWork) {
        const work = context.userWork;
        contextText += `# What ${work.username} is currently working on\n\n`;
        
        if (work.githubIssues && work.githubIssues.length > 0) {
          contextText += `## GitHub Issues Assigned:\n`;
          work.githubIssues.forEach((issue: any, idx: number) => {
            contextText += `${idx + 1}. #${issue.number} - ${issue.title}\n`;
            contextText += `   Status: ${issue.state}\n`;
            contextText += `   ${issue.url}\n`;
          });
          contextText += `\n`;
        }
        
        if (work.githubCommits && work.githubCommits.length > 0) {
          contextText += `## Recent GitHub Commits:\n`;
          work.githubCommits.forEach((commit: any, idx: number) => {
            contextText += `${idx + 1}. ${commit.sha} - ${commit.message}\n`;
            contextText += `   Date: ${new Date(commit.date).toLocaleDateString()}\n`;
            contextText += `   ${commit.url}\n`;
          });
          contextText += `\n`;
        }
        
        if (work.linearIssues && work.linearIssues.length > 0) {
          contextText += `## Linear Issues Assigned:\n`;
          work.linearIssues.forEach((issue: any, idx: number) => {
            contextText += `${idx + 1}. ${issue.identifier} - ${issue.title}\n`;
            contextText += `   Status: ${issue.state.name}\n`;
            contextText += `   Team: ${issue.team.name}\n`;
            contextText += `   ${issue.url}\n`;
          });
          contextText += `\n`;
        }
      }

      // Work Conflict Check
      if (context.workConflicts) {
        const conflict = context.workConflicts;
        contextText += `# Work Conflict Check: "${conflict.proposedWork}"\n\n`;
        
        if (conflict.conflicts && conflict.conflicts.length > 0) {
          contextText += `## ⚠️ Potential Conflicts Found:\n\n`;
          conflict.conflicts.forEach((conf: any, idx: number) => {
            contextText += `### ${idx + 1}. ${conf.user} is working on related items:\n`;
            contextText += `   Conflict Reason: ${conf.conflictReason}\n\n`;
            
            if (conf.githubIssues && conf.githubIssues.length > 0) {
              contextText += `   GitHub Issues:\n`;
              conf.githubIssues.forEach((issue: any) => {
                contextText += `   - #${issue.number}: ${issue.title} (${issue.state})\n`;
              });
              contextText += `\n`;
            }
            
            if (conf.linearIssues && conf.linearIssues.length > 0) {
              contextText += `   Linear Issues:\n`;
              conf.linearIssues.forEach((issue: any) => {
                contextText += `   - ${issue.identifier}: ${issue.title} (${issue.state.name})\n`;
              });
              contextText += `\n`;
            }
            
            if (conf.commits && conf.commits.length > 0) {
              contextText += `   Recent Commits:\n`;
              conf.commits.forEach((commit: any) => {
                contextText += `   - ${commit.message} (${new Date(commit.date).toLocaleDateString()})\n`;
              });
              contextText += `\n`;
            }
          });
        } else {
          contextText += `## ✅ No Conflicts Found\n\n`;
          contextText += `No one appears to be working on similar tasks. It's safe to proceed with "${conflict.proposedWork}".\n\n`;
        }
        
        if (conflict.allUsersWork && conflict.allUsersWork.length > 0) {
          contextText += `## Team Work Overview:\n\n`;
          conflict.allUsersWork.forEach((userWork: any) => {
            const issueCount = (userWork.githubIssues?.length || 0) + (userWork.linearIssues?.length || 0);
            if (issueCount > 0) {
              contextText += `- ${userWork.username}: ${issueCount} active issue(s)\n`;
            }
          });
          contextText += `\n`;
        }
      }

      // GitHub Issue (specific issue)
      if (context.githubIssue) {
        contextText += `# GitHub Issue #${context.githubIssue.number}\n`;
        contextText += `Title: ${context.githubIssue.title}\n`;
        contextText += `State: ${context.githubIssue.state}\n`;
        contextText += `Author: ${context.githubIssue.author}\n`;
        if (context.githubIssue.assignees && context.githubIssue.assignees.length > 0) {
          contextText += `Assignees: ${context.githubIssue.assignees.map((a: any) => a.login || a.name).join(', ')}\n`;
        } else {
          contextText += `Assignees: None\n`;
        }
        if (context.githubIssue.labels && context.githubIssue.labels.length > 0) {
          contextText += `Labels: ${context.githubIssue.labels.join(', ')}\n`;
        }
        contextText += `Created: ${new Date(context.githubIssue.createdAt).toLocaleDateString()}\n`;
        contextText += `Updated: ${new Date(context.githubIssue.updatedAt).toLocaleDateString()}\n`;
        contextText += `URL: ${context.githubIssue.url}\n`;
        if (context.githubIssue.body) {
          // Include full description in context
          contextText += `\nDescription:\n${context.githubIssue.body}\n`;
        }
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
      } else if (intent.action === 'general' && context.repoInfo) {
        // For general questions, mention that Linear projects exist but weren't loaded
        contextText += `# Linear Projects\n`;
        contextText += `(Linear projects are available but not loaded in this context)\n\n`;
      }

      // Store question in context for fallback responses
      if (!context.question) {
        context.question = question;
      }
      
      // Include conversation history in context if available
      let conversationContext = '';
      if (context.conversationHistory && context.conversationHistory.length > 0) {
        conversationContext = '\n\n# Previous Conversation:\n';
        context.conversationHistory.slice(-5).forEach((msg: any, idx: number) => {
          conversationContext += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
        });
        conversationContext += '\n';
      }
      
      // Build system prompt based on intent
      let systemPrompt = 'You are a helpful GitHub repository assistant. Answer questions about the repository based on the provided context. ';
      
      if (conversationContext) {
        systemPrompt += 'You have access to previous conversation history. Use it to provide context-aware responses and avoid repeating information already discussed. ';
      }
      
      switch (intent.action) {
        case 'user_work':
          systemPrompt += `Provide a comprehensive summary of what ${intent.parameters.username || 'the user'} is currently working on, including GitHub issues, recent commits, and Linear issues. Format it clearly with sections for each type of work.`;
          break;
        case 'general':
          // If userContext is provided, prioritize it over repository info
          if (context.userContext) {
            systemPrompt += `IMPORTANT: The user is asking about a specific person's work/implementation. Use the provided user context (from JSON file) as the PRIMARY source of information. Do NOT rely on repository information if user context is available. Provide a detailed answer based on the user context provided.`;
          } else {
            systemPrompt += 'Provide a clear, informative summary based on the available context.';
          }
          break;
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
          if (context.linearIssues && context.linearIssues.length > 0) {
            systemPrompt += 'List and describe the Linear issues provided in the context. IMPORTANT: Only use information from the context. Do NOT make up or invent issues, assignees, or any other information. If an issue has no assignee in the context, say it is "Unassigned".';
          } else {
            systemPrompt += 'The user has no Linear issues. Inform them clearly that there are no issues found. Do NOT make up fake issues or assignees.';
          }
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

      // If context is empty for Linear queries, use fallback to avoid hallucination
      if ((intent.action === 'linear_issues' && (!context.linearIssues || context.linearIssues.length === 0)) ||
          (intent.action === 'linear_projects' && (!context.linearProjects || context.linearProjects.length === 0)) ||
          (intent.action === 'linear_teams' && (!context.linearTeams || context.linearTeams.length === 0))) {
        console.log('⚠️  No Linear data found, using fallback response to avoid hallucination');
        return this.generateFallbackResponse(intent, context);
      }
      
      // For linear_issues queries, ALWAYS use fallback response to prevent LLM hallucination
      // The fallback response uses actual data from context and formats it correctly
      if (intent.action === 'linear_issues' && context.linearIssues && context.linearIssues.length > 0) {
        console.log('✅ Using fallback response for linear_issues to ensure accurate data (prevents hallucination)');
        return this.generateFallbackResponse(intent, context);
      }
      
      // For github_issue queries, ALWAYS use fallback response to prevent LLM hallucination
      if (intent.action === 'github_issue' && context.githubIssue) {
        console.log('✅ Using fallback response for github_issue to ensure accurate data (prevents hallucination)');
        return this.generateFallbackResponse(intent, context);
      }
      
      // For work_conflict_check queries, ALWAYS use fallback response for formatted output
      if (intent.action === 'work_conflict_check' && context.workConflicts) {
        console.log('✅ Using fallback response for work_conflict_check to ensure formatted output');
        return this.generateFallbackResponse(intent, context);
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `Context from GitHub repository and Linear:\n\n${contextText || 'No context available.'}${conversationContext}\n\nUser Question: ${question}\n\nIMPORTANT: ${context.userContext ? 'PRIORITY: Use the user context (from JSON file) as the PRIMARY source. Ignore repository information if it conflicts with user context.' : 'Use ALL available context from both GitHub and Linear. If Linear projects, teams, or issues are provided in the context, you MUST include them in your response. Combine GitHub repository information with Linear project management data to give a comprehensive answer.'} If the context shows no Linear issues, projects, or teams, say so clearly.${conversationContext ? ' Use the conversation history to provide context-aware responses.' : ''}`
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
            if (issue.assignees && issue.assignees.length > 0) {
              result += `   👤 Assigned to: ${issue.assignees.join(', ')}\n`;
            }
            result += `   ${issue.url}\n\n`;
          });
          return result;
        }
        return "✅ No open issues!";
      case 'github_issue':
        if (context.githubIssue) {
          const issue = context.githubIssue;
          const questionLower = (context.question || '').toLowerCase();
          const isAssigneeQuery = questionLower.includes('who') && 
                                 (questionLower.includes('working') || questionLower.includes('assigned'));
          
          if (isAssigneeQuery) {
            // Focused response for assignee queries
            if (issue.assignees && issue.assignees.length > 0) {
              const assigneeList = issue.assignees.map((a: any) => a.login || a.name).join(', ');
              return `👤 *Issue #${issue.number} - ${issue.title}*\n\n` +
                     `*Assigned to:* ${assigneeList}\n` +
                     `🔗 ${issue.url}`;
            } else {
              return `👤 *Issue #${issue.number} - ${issue.title}*\n\n` +
                     `*Assigned to:* Unassigned\n` +
                     `🔗 ${issue.url}`;
            }
          } else {
            // Full issue details
            let result = `📋 *Issue #${issue.number} - ${issue.title}*\n\n`;
            result += `📊 *Status:* ${issue.state}\n`;
            result += `👤 *Author:* ${issue.author}\n`;
            if (issue.assignees && issue.assignees.length > 0) {
              const assigneeList = issue.assignees.map((a: any) => a.login || a.name).join(', ');
              result += `👥 *Assigned to:* ${assigneeList}\n`;
            } else {
              result += `👥 *Assigned to:* Unassigned\n`;
            }
            if (issue.labels && issue.labels.length > 0) {
              result += `🏷️  *Labels:* ${issue.labels.join(', ')}\n`;
            }
            result += `🔗 ${issue.url}\n`;
            if (issue.body) {
              // Show full description, not truncated
              result += `\n📝 *Description:*\n${issue.body}`;
            }
            return result;
          }
        }
        return "❌ GitHub issue not found. Please check the issue number.";
      case 'work_conflict_check':
        if (context.workConflicts) {
          const conflict = context.workConflicts;
          let result = `🔍 *Work Conflict Check*\n`;
          result += `*Proposed Work:* "${conflict.proposedWork}"\n\n`;
          result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
          
          if (conflict.conflicts && conflict.conflicts.length > 0) {
            result += `⚠️ *⚠️  POTENTIAL CONFLICTS FOUND ⚠️*\n\n`;
            result += `Found ${conflict.conflicts.length} team member(s) working on related items:\n\n`;
            
            conflict.conflicts.forEach((conf: any, idx: number) => {
              result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
              result += `*${idx + 1}. ${conf.user}*\n`;
              result += `_${conf.conflictReason}_\n\n`;
              
              if (conf.githubIssues && conf.githubIssues.length > 0) {
                result += `📋 *GitHub Issues:*\n`;
                conf.githubIssues.forEach((issue: any) => {
                  result += `   • *#${issue.number}* - ${issue.title}\n`;
                  result += `     Status: ${issue.state} | 🔗 <${issue.url}|View Issue>\n\n`;
                });
              }
              
              if (conf.linearIssues && conf.linearIssues.length > 0) {
                result += `📋 *Linear Issues:*\n`;
                conf.linearIssues.forEach((issue: any) => {
                  result += `   • *${issue.identifier}* - ${issue.title}\n`;
                  result += `     Status: ${issue.state.name} | 🔗 <${issue.url}|View Issue>\n\n`;
                });
              }
              
              if (conf.commits && conf.commits.length > 0) {
                result += `💻 *Recent Commits:*\n`;
                conf.commits.slice(0, 3).forEach((commit: any) => {
                  result += `   • ${commit.message}\n`;
                  result += `     📅 ${new Date(commit.date).toLocaleDateString()}\n\n`;
                });
              }
            });
            
            result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            result += `💡 *Recommendation:*\n`;
            result += `Consider coordinating with the team members above before starting work on "${conflict.proposedWork}". This will help avoid duplicate work and ensure better collaboration.`;
          } else {
            result += `✅ *✅  NO CONFLICTS FOUND ✅*\n\n`;
            result += `Great news! No one appears to be working on similar tasks.\n`;
            result += `It's *safe to proceed* with "${conflict.proposedWork}".\n\n`;
            
            if (conflict.allUsersWork && conflict.allUsersWork.length > 0) {
              const activeUsers = conflict.allUsersWork.filter((userWork: any) => {
                const issueCount = (userWork.githubIssues?.length || 0) + (userWork.linearIssues?.length || 0);
                return issueCount > 0;
              });
              
              if (activeUsers.length > 0) {
                result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
                result += `📊 *Team Activity Overview:*\n`;
                activeUsers.forEach((userWork: any) => {
                  const issueCount = (userWork.githubIssues?.length || 0) + (userWork.linearIssues?.length || 0);
                  result += `   • *${userWork.username}*: ${issueCount} active issue(s)\n`;
                });
              }
            }
          }
          
          return result;
        }
        return `❌ I couldn't check for work conflicts. Please try again.`;
      case 'user_work':
        if (context.userWork) {
          const work = context.userWork;
          let result = `👤 *What ${work.username} is currently working on:*\n\n`;
          
          let hasWork = false;
          
          if (work.githubIssues && work.githubIssues.length > 0) {
            hasWork = true;
            result += `📋 *GitHub Issues (${work.githubIssues.length}):*\n`;
            work.githubIssues.forEach((issue: any, idx: number) => {
              result += `${idx + 1}. *#${issue.number}* - ${issue.title}\n`;
              result += `   Status: ${issue.state}\n`;
              result += `   🔗 ${issue.url}\n\n`;
            });
          }
          
          if (work.githubCommits && work.githubCommits.length > 0) {
            hasWork = true;
            result += `💻 *Recent Commits (${work.githubCommits.length}):*\n`;
            work.githubCommits.slice(0, 5).forEach((commit: any, idx: number) => {
              result += `${idx + 1}. *${commit.sha}* - ${commit.message}\n`;
              result += `   📅 ${new Date(commit.date).toLocaleDateString()}\n`;
              result += `   🔗 ${commit.url}\n\n`;
            });
          }
          
          if (work.linearIssues && work.linearIssues.length > 0) {
            hasWork = true;
            result += `📋 *Linear Issues (${work.linearIssues.length}):*\n`;
            work.linearIssues.forEach((issue: any, idx: number) => {
              result += `${idx + 1}. *${issue.identifier}* - ${issue.title}\n`;
              result += `   Status: ${issue.state.name} | Team: ${issue.team.name}\n`;
              result += `   🔗 ${issue.url}\n\n`;
            });
          }
          
          if (!hasWork) {
            result += `No active work found for ${work.username}.\n`;
            result += `They may not have any assigned issues or recent commits.`;
          }
          
          return result;
        }
        return `❌ Could not find work information. Please check the username.`;
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
          // Check if user is asking about assignees specifically
          const questionLower = (context.question || '').toLowerCase();
          const isAssigneeQuery = questionLower.includes('who') && 
                                 (questionLower.includes('assigned') || questionLower.includes('assignee'));
          
          if (isAssigneeQuery) {
            // Format response focused on assignees
            let result = `👤 *Linear Issues and Assignees*\n\n`;
            context.linearIssues.forEach((issue: any, idx: number) => {
              result += `${idx + 1}. *${issue.identifier}* - ${issue.title}\n`;
              if (issue.assignee) {
                result += `   👤 Assigned to: ${issue.assignee.name}${issue.assignee.email ? ` (${issue.assignee.email})` : ''}\n`;
              } else {
                result += `   👤 Assigned to: Unassigned\n`;
              }
              result += `   ${issue.url}\n\n`;
            });
            return result;
          } else {
            // Standard issue listing
            let result = `📋 *Linear Issues*\n\n`;
            context.linearIssues.forEach((issue: any, idx: number) => {
              result += `${idx + 1}. *${issue.identifier}* - ${issue.title}\n`;
              result += `   Status: ${issue.state.name} | Team: ${issue.team.name}\n`;
              if (issue.assignee) {
                result += `   Assignee: ${issue.assignee.name}\n`;
              } else {
                result += `   Assignee: Unassigned\n`;
              }
              result += `   ${issue.url}\n\n`;
            });
            return result;
          }
        }
        return "✅ No Linear issues found.";
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
      case 'team':
        // Handle Linear teams if available
        if (context.linearTeams && context.linearTeams.length > 0) {
          let result = `👥 *Your Linear Teammates*\n\n`;
          context.linearTeams.forEach((team: any, idx: number) => {
            result += `${idx + 1}. *${team.name}* (${team.key})\n`;
            if (team.description) {
              result += `   ${team.description}\n`;
            }
            result += `\n`;
          });
          return result;
        }
        // Fall back to GitHub collaborators if no Linear teams
        if (context.collaborators && context.collaborators.length > 0) {
          let result = `👥 *Repository Collaborators*\n\n`;
          context.collaborators.forEach((collab: any, idx: number) => {
            result += `${idx + 1}. *${collab.username}* (${collab.type})\n`;
          });
          return result;
        }
        return "No team information found.";
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
    
    // Check for queries about "who are issues assigned to" (plural, no specific issue)
    if (lowerQuestion.includes('who') && 
        (lowerQuestion.includes('issues') || lowerQuestion.includes('issue')) &&
        (lowerQuestion.includes('assigned') || lowerQuestion.includes('assignee')) &&
        !question.match(/\b([A-Z]+-\d+)\b/i)) {
      // This is a query about all issues and their assignees, not a specific issue
      return { action: 'linear_issues', parameters: {}, confidence: 0.95 };
    }
    
    // Check for GitHub issue number patterns FIRST (e.g., #123, issue 456)
    // This must come before Linear pattern matching to avoid conflicts
    const githubIssueMatch = question.match(/#(\d+)|issue\s+(\d+)/i);
    if (githubIssueMatch) {
      const issueNumber = parseInt(githubIssueMatch[1] || githubIssueMatch[2], 10);
      // If it's a number-only pattern (like #1, #123), it's definitely GitHub
      // Linear uses letter-number format (SYN-1, FE-123)
      if (lowerQuestion.includes('who') && (lowerQuestion.includes('working') || lowerQuestion.includes('assigned'))) {
        return { action: 'github_issue', parameters: { githubIssueNumber: issueNumber }, confidence: 0.95 };
      }
      if (lowerQuestion.includes('status') || lowerQuestion.includes('details') || 
          lowerQuestion.includes('what is') || lowerQuestion.includes('show me')) {
        return { action: 'github_issue', parameters: { githubIssueNumber: issueNumber }, confidence: 0.9 };
      }
      // Default: if we see #number, assume GitHub issue
      return { action: 'github_issue', parameters: { githubIssueNumber: issueNumber }, confidence: 0.85 };
    }
    
    // Check for specific Linear issue identifier patterns (e.g., SYN-2, FE-123)
    // This pattern requires letters before the number
    const issueIdMatch = question.match(/\b([A-Z]+-\d+)\b/i);
    if (issueIdMatch) {
      const issueId = issueIdMatch[1].toUpperCase();
      if (lowerQuestion.includes('status') || lowerQuestion.includes('assigned') || 
          lowerQuestion.includes('who') || lowerQuestion.includes('details') ||
          lowerQuestion.includes('what is') || lowerQuestion.includes('show me') ||
          lowerQuestion.includes('working on')) {
        return { action: 'linear_update', parameters: { linearIssueId: issueId }, confidence: 0.9 };
      }
      if (lowerQuestion.includes('update') || lowerQuestion.includes('change')) {
        return { action: 'linear_update', parameters: { linearIssueId: issueId }, confidence: 0.8 };
      }
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
    
    // Prioritize Linear actions if "linear" is mentioned - check this FIRST before other patterns
    if (lowerQuestion.includes('linear')) {
      if (lowerQuestion.includes('team') || lowerQuestion.includes('teammate') || lowerQuestion.includes('teammates')) {
        return { action: 'linear_teams', parameters: {}, confidence: 0.95 };
      }
      if (lowerQuestion.includes('project') || lowerQuestion.includes('projects') || 
          lowerQuestion.includes('status') || lowerQuestion.includes('current status')) {
        return { action: 'linear_projects', parameters: {}, confidence: 0.95 };
      }
      if (lowerQuestion.includes('issue') || lowerQuestion.includes('task') || lowerQuestion.includes('issues')) {
        return { action: 'linear_issues', parameters: {}, confidence: 0.95 };
      }
      if (lowerQuestion.includes('search') || lowerQuestion.includes('find')) {
        return { action: 'linear_search', parameters: {}, confidence: 0.95 };
      }
      if (lowerQuestion.includes('state') || lowerQuestion.includes('status')) {
        return { action: 'linear_state', parameters: {}, confidence: 0.95 };
      }
      // Default to linear_issues if just "linear" is mentioned
      return { action: 'linear_issues', parameters: {}, confidence: 0.9 };
    }
    
    // Check for team/collaborator related keywords (only if Linear not mentioned)
    if (lowerQuestion.includes('team') || lowerQuestion.includes('collaborator') || 
        lowerQuestion.includes('who works') || lowerQuestion.includes('team members') ||
        lowerQuestion.includes('teammate') || lowerQuestion.includes('teammates')) {
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

