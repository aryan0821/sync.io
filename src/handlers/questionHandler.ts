import { GitHubService } from '../services/github';
import { LinearService } from '../services/linear';
import { LLMService, LLMIntent } from '../services/llm';
import { LangGraphAgent } from '../agents/langgraph-agent';
import { MemoryService } from '../services/memoryService';
import { UserContextService } from '../services/userContextService';

export class QuestionHandler {
  private githubService: GitHubService;
  private linearService: LinearService | null;
  private llmService: LLMService;
  private agent: LangGraphAgent;
  private memoryService: MemoryService;
  private userContextService: UserContextService;

  constructor(
    githubService: GitHubService,
    llmService: LLMService,
    linearService?: LinearService,
    memoryService?: MemoryService,
    userContextService?: UserContextService
  ) {
    this.githubService = githubService;
    this.llmService = llmService;
    this.linearService = linearService || null;
    this.memoryService = memoryService || new MemoryService();
    this.userContextService = userContextService || new UserContextService();
    
    // Initialize LangGraph agent
    this.agent = new LangGraphAgent(githubService, linearService || null, llmService, this.memoryService, this.userContextService);
  }

  async handleQuestion(
    question: string,
    threadId?: string,
    metadata?: { channel?: string; user?: string }
  ): Promise<string> {
    let lowerQuestion = question.toLowerCase().trim();
    
    // Handle simple greetings with help
    if (lowerQuestion === 'hi' || lowerQuestion === 'hello' || lowerQuestion === 'hey') {
      return this.getHelpMessage();
    }

    // Get conversation history if threadId is provided
    let conversationHistory: any[] = [];
    if (threadId) {
      conversationHistory = this.memoryService.getConversationHistory(threadId, 10);
      console.log(`💾 [Memory] Retrieved ${conversationHistory.length} previous messages from conversation ${threadId}`);
    }

    // Use LangGraph agent for intelligent processing
    console.log('🤖 [LangGraph] Starting agentic workflow...');
    const response = await this.agent.run(question, conversationHistory);
    
    // Store conversation in memory
    if (threadId) {
      this.memoryService.addMessage(threadId, 'user', question, metadata);
      this.memoryService.addMessage(threadId, 'assistant', response, metadata);
    }
    
    return response;
  }

  /**
   * Safely gather context for a given intent with validation and error handling
   */
  private async gatherContextForIntent(intent: LLMIntent, question: string, context: any, searchMode: 'both' | 'linear' | 'github' = 'both'): Promise<void> {
    // For general questions, search both Linear and GitHub by default
    if (intent.action === 'general' && searchMode === 'both') {
      // Try to gather both GitHub and Linear context
      await this.safeGetGeneralContext(question, context);
      if (this.linearService) {
        // Also search Linear issues for general questions
        await this.safeSearchLinearIssues(question, context);
      }
      return;
    }

    // For search queries, search both by default unless specified
    if (intent.action === 'search' && searchMode === 'both') {
      await this.safeSearchCode(intent.parameters.searchTerm || question, context);
      if (this.linearService) {
        await this.safeSearchLinearIssues(intent.parameters.searchTerm || question, context);
      }
      return;
    }

    switch (intent.action) {
      case 'file':
        if (searchMode !== 'linear') {
          await this.safeGetFile(intent.parameters.filePath, context);
        }
        break;

      case 'search':
        if (searchMode === 'linear' && this.linearService) {
          await this.safeSearchLinearIssues(intent.parameters.searchTerm, context);
        } else if (searchMode === 'github' || searchMode === 'both') {
          await this.safeSearchCode(intent.parameters.searchTerm, context);
          if (searchMode === 'both' && this.linearService) {
            await this.safeSearchLinearIssues(intent.parameters.searchTerm, context);
          }
        }
        break;

      case 'commits':
        if (searchMode !== 'linear') {
          await this.safeGetCommits(context);
        }
        break;

      case 'issues':
        if (searchMode === 'linear' && this.linearService) {
          await this.safeGetLinearIssues(context);
        } else if (searchMode === 'github' || searchMode === 'both') {
          await this.safeGetIssues(context);
          if (searchMode === 'both' && this.linearService) {
            await this.safeGetLinearIssues(context);
          }
        }
        break;

      case 'list':
        if (searchMode !== 'linear') {
          await this.safeListDirectory(intent.parameters.directoryPath, context);
        }
        break;

      case 'team':
      case 'collaborators':
        if (searchMode === 'linear' && this.linearService) {
          await this.safeGetLinearTeams(context);
        } else if (searchMode === 'github' || searchMode === 'both') {
          await this.safeGetCollaborators(context);
          if (searchMode === 'both' && this.linearService) {
            await this.safeGetLinearTeams(context);
          }
        }
        break;

      case 'contributors':
        if (searchMode !== 'linear') {
          await this.safeGetContributors(context);
        }
        break;

      case 'info':
        // Already have repoInfo (GitHub)
        if (searchMode === 'both' && this.linearService) {
          // Also get Linear teams/projects for info
          await this.safeGetLinearTeams(context);
          await this.safeGetLinearProjects(context);
        }
        break;

      case 'linear_issues':
        await this.safeGetLinearIssues(context);
        break;

      case 'linear_create':
        // Will be handled in response generation
        break;

      case 'linear_update':
        // Will be handled in response generation
        break;

      case 'linear_assign':
        // Will be handled in response generation
        break;

      case 'linear_comment':
        // Will be handled in response generation
        break;

      case 'linear_teams':
        await this.safeGetLinearTeams(context);
        break;

      case 'linear_projects':
        await this.safeGetLinearProjects(context);
        break;

      case 'linear_search':
        await this.safeSearchLinearIssues(intent.parameters.linearSearchTerm, context);
        break;

      case 'linear_state':
        await this.safeGetLinearIssuesByState(intent.parameters.linearState, intent.parameters.linearTeam, context);
        break;

      case 'browse':
        if (searchMode !== 'linear') {
          await this.safeBrowseFile(intent.parameters.filePath, intent.parameters.startLine, intent.parameters.endLine, context);
        }
        break;

      case 'structure':
        if (searchMode !== 'linear') {
          await this.safeGetCodeStructure(intent.parameters.filePath, context);
        }
        break;

      case 'tree':
        if (searchMode !== 'linear') {
          await this.safeGetDirectoryTree(intent.parameters.directoryPath, context);
        }
        break;

      case 'find_usage':
        if (searchMode !== 'linear') {
          await this.safeFindUsage(intent.parameters.moduleName, context);
        }
        break;
    }
  }

  /**
   * Safely get file content with validation
   */
  private async safeGetFile(filePath: string | undefined, context: any): Promise<void> {
    if (!filePath || filePath.trim().length === 0) {
      console.warn('⚠️  No file path provided for file intent');
      return;
    }

    // Sanitize file path
    const sanitizedPath = filePath.trim();
    
    // Basic validation - no path traversal attempts
    if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
      console.warn('⚠️  Invalid file path detected:', sanitizedPath);
      return;
    }

    try {
      console.log('📄 Getting file:', sanitizedPath);
      const file = await this.githubService.getFileContent(sanitizedPath);
      if (file) {
        context.fileContents = file.content;
        context.filePath = file.path;
        console.log('✅ File retrieved:', file.path);
      } else {
        console.log('ℹ️  File not found or is a directory:', sanitizedPath);
      }
    } catch (error: any) {
      console.error('❌ Error getting file:', error?.message);
      // Don't throw - continue without file content
    }
  }

  /**
   * Safely search code with validation
   */
  private async safeSearchCode(searchTerm: string | undefined, context: any): Promise<void> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      console.warn('⚠️  No search term provided for search intent');
      return;
    }

    // Sanitize search term
    const sanitizedTerm = searchTerm.trim();
    
    // Limit search term length
    if (sanitizedTerm.length > 100) {
      console.warn('⚠️  Search term too long, truncating');
      const truncated = sanitizedTerm.substring(0, 100);
      context.searchResults = await this.githubService.searchCode(truncated);
      return;
    }

    try {
      console.log('🔍 Searching code for:', sanitizedTerm);
      context.searchResults = await this.githubService.searchCode(sanitizedTerm);
      console.log('✅ Search completed, found', context.searchResults?.length || 0, 'results');
    } catch (error: any) {
      console.error('❌ Error searching code:', error?.message);
      context.searchResults = [];
    }
  }

  /**
   * Safely get commits
   */
  private async safeGetCommits(context: any): Promise<void> {
    try {
      console.log('📝 Getting recent commits...');
      context.commits = await this.githubService.getRecentCommits(10);
      console.log('✅ Retrieved', context.commits?.length || 0, 'commits');
    } catch (error: any) {
      console.error('❌ Error getting commits:', error?.message);
      context.commits = [];
    }
  }

  /**
   * Safely get issues
   */
  private async safeGetIssues(context: any): Promise<void> {
    try {
      console.log('🐛 Getting open issues...');
      context.issues = await this.githubService.getOpenIssues(10);
      console.log('✅ Retrieved', context.issues?.length || 0, 'issues');
    } catch (error: any) {
      console.error('❌ Error getting issues:', error?.message);
      context.issues = [];
    }
  }

  /**
   * Safely list directory
   */
  private async safeListDirectory(directoryPath: string | undefined, context: any): Promise<void> {
    const path = directoryPath?.trim() || '';
    
    // Basic validation
    if (path.includes('..')) {
      console.warn('⚠️  Invalid directory path detected:', path);
      context.files = [];
      context.directoryPath = 'root';
      return;
    }

    try {
      console.log('📁 Listing directory:', path || 'root');
      context.files = await this.githubService.listDirectory(path);
      context.directoryPath = path || 'root';
      console.log('✅ Listed', context.files?.length || 0, 'files');
    } catch (error: any) {
      console.error('❌ Error listing directory:', error?.message);
      context.files = [];
      context.directoryPath = path || 'root';
    }
  }

  /**
   * Safely get collaborators
   */
  private async safeGetCollaborators(context: any): Promise<void> {
    try {
      console.log('👥 Getting collaborators...');
      context.collaborators = await this.githubService.getCollaborators();
      console.log('✅ Retrieved', context.collaborators?.length || 0, 'collaborators');
    } catch (error: any) {
      console.error('❌ Error getting collaborators:', error?.message);
      context.collaborators = [];
    }
  }

  /**
   * Safely get contributors
   */
  private async safeGetContributors(context: any): Promise<void> {
    try {
      console.log('👤 Getting contributors...');
      context.contributors = await this.githubService.getContributors(10);
      console.log('✅ Retrieved', context.contributors?.length || 0, 'contributors');
    } catch (error: any) {
      console.error('❌ Error getting contributors:', error?.message);
      context.contributors = [];
    }
  }

  /**
   * Safely get Linear issues
   */
  private async safeGetLinearIssues(context: any): Promise<void> {
    if (!this.linearService) {
      console.warn('⚠️  Linear service not available');
      context.linearIssues = [];
      return;
    }

    try {
      console.log('📋 Getting Linear issues...');
      context.linearIssues = await this.linearService.getMyIssues(10);
      console.log('✅ Retrieved', context.linearIssues?.length || 0, 'Linear issues');
    } catch (error: any) {
      console.error('❌ Error getting Linear issues:', error?.message);
      context.linearIssues = [];
    }
  }

  /**
   * Safely get Linear teams
   */
  private async safeGetLinearTeams(context: any): Promise<void> {
    if (!this.linearService) {
      console.warn('⚠️  Linear service not available');
      context.linearTeams = [];
      return;
    }

    try {
      console.log('👥 Getting Linear teams...');
      context.linearTeams = await this.linearService.getTeams();
      console.log('✅ Retrieved', context.linearTeams?.length || 0, 'Linear teams');
    } catch (error: any) {
      console.error('❌ Error getting Linear teams:', error?.message);
      context.linearTeams = [];
    }
  }

  /**
   * Safely get Linear projects
   */
  private async safeGetLinearProjects(context: any): Promise<void> {
    if (!this.linearService) {
      console.warn('⚠️  Linear service not available');
      context.linearProjects = [];
      return;
    }

    try {
      console.log('📊 Getting Linear projects...');
      context.linearProjects = await this.linearService.getProjects();
      console.log('✅ Retrieved', context.linearProjects?.length || 0, 'Linear projects');
    } catch (error: any) {
      console.error('❌ Error getting Linear projects:', error?.message);
      context.linearProjects = [];
    }
  }

  /**
   * Safely search Linear issues
   */
  private async safeSearchLinearIssues(searchTerm: string | undefined, context: any): Promise<void> {
    if (!this.linearService) {
      console.warn('⚠️  Linear service not available');
      context.linearIssues = [];
      return;
    }

    if (!searchTerm || searchTerm.trim().length === 0) {
      console.warn('⚠️  No search term provided');
      context.linearIssues = [];
      return;
    }

    try {
      console.log('🔍 Searching Linear issues for:', searchTerm);
      // Search through issues by title/description
      const allIssues = await this.linearService.getIssues(undefined, 50);
      const filtered = allIssues.filter(issue => 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (issue.description && issue.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      context.linearIssues = filtered;
      context.linearSearchTerm = searchTerm;
      console.log('✅ Found', filtered.length, 'matching issues');
    } catch (error: any) {
      console.error('❌ Error searching Linear issues:', error?.message);
      context.linearIssues = [];
    }
  }

  /**
   * Safely get Linear issues by state
   */
  private async safeGetLinearIssuesByState(stateName: string | undefined, teamKey: string | undefined, context: any): Promise<void> {
    if (!this.linearService) {
      console.warn('⚠️  Linear service not available');
      context.linearIssues = [];
      return;
    }

    if (!stateName || stateName.trim().length === 0) {
      console.warn('⚠️  No state name provided');
      context.linearIssues = [];
      return;
    }

    try {
      console.log('📋 Getting Linear issues in state:', stateName, teamKey ? `(team: ${teamKey})` : '');
      context.linearIssues = await this.linearService.getIssuesByState(stateName, teamKey, 20);
      context.linearState = stateName;
      console.log('✅ Retrieved', context.linearIssues?.length || 0, 'issues');
    } catch (error: any) {
      console.error('❌ Error getting Linear issues by state:', error?.message);
      context.linearIssues = [];
    }
  }

  /**
   * Safely browse file with line numbers
   */
  private async safeBrowseFile(filePath: string | undefined, startLine: number | undefined, endLine: number | undefined, context: any): Promise<void> {
    if (!filePath || filePath.trim().length === 0) {
      console.warn('⚠️  No file path provided for browse intent');
      return;
    }

    const sanitizedPath = filePath.trim();
    
    if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
      console.warn('⚠️  Invalid file path detected:', sanitizedPath);
      return;
    }

    try {
      console.log('📖 Browsing file:', sanitizedPath, `lines ${startLine || 'start'}-${endLine || 'end'}`);
      const chunk = await this.githubService.getFileWithLines(sanitizedPath, startLine, endLine);
      if (chunk) {
        context.fileChunk = chunk;
        context.filePath = chunk.path;
        console.log('✅ File chunk retrieved:', chunk.path, `(${chunk.startLine}-${chunk.endLine} of ${chunk.totalLines})`);
      } else {
        console.log('ℹ️  File not found:', sanitizedPath);
      }
    } catch (error: any) {
      console.error('❌ Error browsing file:', error?.message);
    }
  }

  /**
   * Safely get code structure
   */
  private async safeGetCodeStructure(filePath: string | undefined, context: any): Promise<void> {
    if (!filePath || filePath.trim().length === 0) {
      console.warn('⚠️  No file path provided for structure intent');
      return;
    }

    const sanitizedPath = filePath.trim();
    
    if (sanitizedPath.includes('..') || sanitizedPath.startsWith('/')) {
      console.warn('⚠️  Invalid file path detected:', sanitizedPath);
      return;
    }

    try {
      console.log('🔍 Analyzing code structure:', sanitizedPath);
      const structure = await this.githubService.getCodeStructure(sanitizedPath);
      if (structure) {
        context.codeStructure = structure;
        context.filePath = structure.path;
        console.log('✅ Code structure analyzed:', structure.path);
      } else {
        console.log('ℹ️  Could not analyze structure:', sanitizedPath);
      }
    } catch (error: any) {
      console.error('❌ Error analyzing code structure:', error?.message);
    }
  }

  /**
   * Safely get directory tree
   */
  private async safeGetDirectoryTree(directoryPath: string | undefined, context: any): Promise<void> {
    const path = (directoryPath || '').trim();
    
    if (path.includes('..') || path.startsWith('/')) {
      console.warn('⚠️  Invalid directory path detected:', path);
      context.directoryTree = [];
      return;
    }

    try {
      console.log('🌳 Getting directory tree:', path || 'root');
      const tree = await this.githubService.getDirectoryTree(path, 3);
      context.directoryTree = tree;
      context.directoryPath = path || 'root';
      console.log('✅ Directory tree retrieved');
    } catch (error: any) {
      console.error('❌ Error getting directory tree:', error?.message);
      context.directoryTree = [];
    }
  }

  /**
   * Safely find files using a module/function
   */
  private async safeFindUsage(moduleName: string | undefined, context: any): Promise<void> {
    if (!moduleName || moduleName.trim().length === 0) {
      console.warn('⚠️  No module name provided for find_usage intent');
      return;
    }

    const sanitized = moduleName.trim();

    try {
      console.log('🔎 Finding files using:', sanitized);
      const files = await this.githubService.findFilesUsing(sanitized);
      context.usageFiles = files;
      context.moduleName = sanitized;
      console.log('✅ Found', files.length, 'files using', sanitized);
    } catch (error: any) {
      console.error('❌ Error finding usage:', error?.message);
      context.usageFiles = [];
    }
  }

  /**
   * Safely get context for general questions
   */
  private async safeGetGeneralContext(question: string, context: any): Promise<void> {
    // Try to extract file names
    const fileMatch = question.match(/(?:file|code|function|class|module|show|read|get)\s+([^\s]+\.\w+)/i);
    if (fileMatch && fileMatch[1]) {
      await this.safeGetFile(fileMatch[1], context);
    }
    
    // If no file found, try searching for keywords
    if (!context.fileContents) {
      const searchTerms = question.match(/\b(\w{4,})\b/g)?.slice(0, 3);
      if (searchTerms && searchTerms.length > 0) {
        await this.safeSearchCode(searchTerms.join(' '), context);
      }
    }
  }

  /**
   * Generate a safe fallback response when LLM fails
   */
  private generateSafeFallbackResponse(intent: LLMIntent, context: any): string {
    // Try to use the LLM's fallback response generator
    try {
      return this.llmService['generateFallbackResponse'](intent, context);
    } catch (error) {
      // Ultimate fallback
      if (context.repoInfo) {
        return `I found information about ${context.repoInfo.name}, but had trouble generating a detailed response. Please try rephrasing your question.`;
      }
      return "I encountered an issue processing your request. Please try again or rephrase your question.";
    }
  }

  /**
   * Handle Linear issue creation
   */
  private async handleLinearCreate(intent: LLMIntent, context: any): Promise<string> {
    if (!this.linearService) {
      return '❌ Linear service is not configured. Please set LINEAR_API_TOKEN in your .env file.';
    }

    const title = intent.parameters.linearTitle;
    const teamName = intent.parameters.linearTeam;
    const description = intent.parameters.linearDescription;

    if (!title) {
      return '❌ Please provide a title for the issue. Example: "Create a Linear issue titled \'Fix login bug\' in Frontend team"';
    }

    try {
      // Find team
      let teamId: string | null = null;
      if (teamName) {
        const team = await this.linearService.findTeamByNameOrKey(teamName);
        if (team) {
          teamId = team.id;
        } else {
          return `❌ Team "${teamName}" not found. Please check the team name.`;
        }
      } else {
        // Get first team as default
        const teams = await this.linearService.getTeams();
        if (teams.length > 0) {
          teamId = teams[0].id;
        } else {
          return '❌ No teams found in Linear.';
        }
      }

      const issue = await this.linearService.createIssue(title, teamId, description);
      if (issue) {
        return `✅ Created Linear issue *${issue.identifier}*: ${issue.title}\n${issue.url}`;
      } else {
        return '❌ Failed to create issue. Please check your Linear API token and permissions.';
      }
    } catch (error: any) {
      console.error('Error creating Linear issue:', error);
      return `❌ Error creating issue: ${error?.message || 'Unknown error'}`;
    }
  }

  /**
   * Handle Linear issue update
   */
  private async handleLinearUpdate(intent: LLMIntent, context: any): Promise<string> {
    if (!this.linearService) {
      return '❌ Linear service is not configured.';
    }

    const issueId = intent.parameters.linearIssueId;
    const state = intent.parameters.linearState;

    if (!issueId) {
      return '❌ Please provide an issue identifier (e.g., "FE-123").';
    }

    try {
      // Find issue by identifier
      const issue = await this.linearService.getIssueByIdentifier(issueId);
      if (!issue) {
        return `❌ Issue ${issueId} not found.`;
      }

      // Get team to find state
      const team = await this.linearService.findTeamByNameOrKey(issue.team.key);
      if (!team) {
        return `❌ Could not find team for issue ${issueId}.`;
      }

      if (state) {
        // Find state ID by name
        const stateId = await this.linearService.findStateByName(team.id, state);
        if (!stateId) {
          // Get available states to show user
          const states = await this.linearService.getTeamStates(team.id);
          const stateNames = states.map(s => s.name).join(', ');
          return `❌ State "${state}" not found. Available states: ${stateNames}`;
        }

        const success = await this.linearService.updateIssueStatus(issue.id, stateId);
        if (success) {
          return `✅ Updated issue ${issueId} status to "${state}"\n${issue.url}`;
        } else {
          return `❌ Failed to update issue ${issueId}.`;
        }
      }

      return `ℹ️  Issue ${issueId}: ${issue.title}\nStatus: ${issue.state.name}\nTeam: ${issue.team.name}\n${issue.url}`;
    } catch (error: any) {
      console.error('Error updating Linear issue:', error);
      return `❌ Error updating issue: ${error?.message || 'Unknown error'}`;
    }
  }

  /**
   * Handle Linear issue assignment
   */
  private async handleLinearAssign(intent: LLMIntent, context: any): Promise<string> {
    if (!this.linearService) {
      return '❌ Linear service is not configured.';
    }

    const issueId = intent.parameters.linearIssueId;
    const assigneeName = intent.parameters.linearAssignee;

    if (!issueId) {
      return '❌ Please provide an issue identifier (e.g., "FE-123").';
    }

    if (!assigneeName) {
      return '❌ Please provide an assignee name.';
    }

    try {
      const issue = await this.linearService.getIssueByIdentifier(issueId);
      if (!issue) {
        return `❌ Issue ${issueId} not found.`;
      }

      // Search for user by name
      const users = await this.linearService.searchUsers(assigneeName);
      if (users.length === 0) {
        return `❌ No user found matching "${assigneeName}". Please check the name.`;
      }

      if (users.length > 1) {
        const userList = users.map((u, i) => `${i + 1}. ${u.name} (${u.email})`).join('\n');
        return `❌ Multiple users found. Please be more specific:\n${userList}`;
      }

      const user = users[0];
      const success = await this.linearService.assignIssue(issue.id, user.id);
      if (success) {
        return `✅ Assigned issue ${issueId} to ${user.name}\n${issue.url}`;
      } else {
        return `❌ Failed to assign issue ${issueId}.`;
      }
    } catch (error: any) {
      console.error('Error assigning Linear issue:', error);
      return `❌ Error: ${error?.message || 'Unknown error'}`;
    }
  }

  /**
   * Handle Linear comment addition
   */
  private async handleLinearComment(intent: LLMIntent, context: any): Promise<string> {
    if (!this.linearService) {
      return '❌ Linear service is not configured.';
    }

    const issueId = intent.parameters.linearIssueId;
    const comment = intent.parameters.linearComment;

    if (!issueId) {
      return '❌ Please provide an issue identifier (e.g., "FE-123").';
    }

    if (!comment) {
      return '❌ Please provide a comment.';
    }

    try {
      const issue = await this.linearService.getIssueByIdentifier(issueId);
      if (!issue) {
        return `❌ Issue ${issueId} not found.`;
      }

      const success = await this.linearService.addComment(issue.id, comment);
      if (success) {
        return `✅ Added comment to issue ${issueId}: "${comment}"`;
      } else {
        return `❌ Failed to add comment to issue ${issueId}.`;
      }
    } catch (error: any) {
      console.error('Error adding Linear comment:', error);
      return `❌ Error: ${error?.message || 'Unknown error'}`;
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
    let help = `🤖 *I'm a GitHub & Linear bot! Here's what I can help you with:*\n\n`;
    
    if (this.linearService) {
      help += `✅ *Linear integration is active*\n\n`;
    } else {
      help += `ℹ️  *Linear integration available* (set LINEAR_API_TOKEN to enable)\n\n`;
    }
    
    help += `📦 *GitHub - Repository Info*\n`;
    help += `• "What is this repo about?" - Get repository information\n`;
    help += `• "Show me the repo stats" - See stars, forks, language, etc.\n\n`;
    
    help += `📄 *GitHub - Files*\n`;
    help += `• "Show me package.json" - Display file contents\n`;
    help += `• "Read src/index.ts" - View any file\n\n`;
    
    help += `🔍 *GitHub - Search*\n`;
    help += `• "Search for authentication" - Find code in the repo\n`;
    help += `• "Where is the login function?" - Locate specific code\n\n`;
    
    help += `📝 *GitHub - Commits & Issues*\n`;
    help += `• "Recent commits" - Show latest commits\n`;
    help += `• "Open issues" - List open issues\n\n`;
    
    help += `📁 *GitHub - Directories*\n`;
    help += `• "List files in src" - Show directory contents\n`;
    help += `• "Show directory tree" - Get full directory structure\n\n`;
    
    help += `🔍 *GitHub - Code Browsing*\n`;
    help += `• "What's the structure of src/index.ts?" - Analyze code structure\n`;
    help += `• "Show me lines 10-50 of src/index.ts" - Browse specific lines\n`;
    help += `• "Find files that use GitHubService" - Find where code is used\n\n`;
    
    if (this.linearService) {
      help += `📋 *Linear - Issues*\n`;
      help += `• "Show me my Linear issues" - List your assigned issues\n`;
      help += `• "Create a Linear issue titled 'Fix bug' in Frontend team" - Create new issue\n`;
      help += `• "Update issue FE-123 to In Progress" - Update issue status\n`;
      help += `• "Assign issue BE-456 to John" - Assign issue to user\n`;
      help += `• "Add comment to issue UI-789: 'Needs review'" - Add comment\n\n`;
      
      help += `👥 *Linear - Teams*\n`;
      help += `• "Show Linear teams" - List all teams\n\n`;
      
      help += `📊 *Linear - Projects*\n`;
      help += `• "Show Linear projects" - List all projects\n\n`;
      
      help += `🔍 *Linear - Search & Filter*\n`;
      help += `• "Search Linear issues for 'bug'" - Search issues\n`;
      help += `• "Show issues in In Progress state" - Filter by state\n\n`;
    }
    
    help += `💬 *General Questions*\n`;
    help += `• "How does authentication work?" - Ask about your codebase\n`;
    help += `• "Explain the main function" - Get code explanations\n\n`;
    
    help += `🔍 *Search Commands*\n`;
    help += `• "Search for bug" - Searches both GitHub and Linear by default\n`;
    help += `• "/github search for bug" - Search only GitHub\n`;
    help += `• "/linear search for bug" - Search only Linear\n\n`;
    
    help += `*Just ask me anything about your repository or Linear!*\n`;
    help += `*Tip: Use /github or /linear prefix to search specific sources.*`;
    
    return help;
  }
}

