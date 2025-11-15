/**
 * LangGraph Agent for GitHub & Linear Bot
 * Uses LangGraph's StateGraph for agentic workflow orchestration
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { GitHubService } from '../services/github';
import { LinearService } from '../services/linear';
import { LLMService, LLMIntent } from '../services/llm';
import { MemoryService, ConversationMessage } from '../services/memoryService';
import { UserContextService } from '../services/userContextService';

/**
 * Agent State Schema using LangGraph Annotation
 */
const AgentStateAnnotation = Annotation.Root({
  question: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
  }),
  originalQuestion: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
  }),
  searchMode: Annotation<'both' | 'linear' | 'github'>({
    reducer: (x: 'both' | 'linear' | 'github', y: 'both' | 'linear' | 'github') => y || x,
    default: () => 'both' as const,
  }),
  intent: Annotation<LLMIntent | undefined>({
    reducer: (x: LLMIntent | undefined, y: LLMIntent | undefined) => y || x,
  }),
  context: Annotation<{
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
  }>({
    reducer: (x: any, y: any) => ({ ...x, ...y }),
    default: () => ({}),
  }),
  response: Annotation<string | undefined>({
    reducer: (x: string | undefined, y: string | undefined) => y || x,
  }),
  error: Annotation<string | undefined>({
    reducer: (x: string | undefined, y: string | undefined) => y || x,
  }),
  step: Annotation<string>({
    reducer: (x: string, y: string) => y || x,
  }),
  toolsUsed: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => [...new Set([...x, ...y])],
    default: () => [],
  }),
});

type AgentState = typeof AgentStateAnnotation.State;

/**
 * LangGraph Agent
 */
export class LangGraphAgent {
  private graph: ReturnType<typeof this.buildGraph>;
  private githubService: GitHubService;
  private linearService: LinearService | null;
  private llmService: LLMService;
  private memoryService: MemoryService;
  private userContextService: UserContextService;

  constructor(
    githubService: GitHubService,
    linearService: LinearService | null,
    llmService: LLMService,
    memoryService?: MemoryService,
    userContextService?: UserContextService
  ) {
    this.githubService = githubService;
    this.linearService = linearService;
    this.llmService = llmService;
    this.memoryService = memoryService || new MemoryService();
    this.userContextService = userContextService || new UserContextService();
    this.graph = this.buildGraph();
  }

  /**
   * Build the LangGraph workflow
   */
  private buildGraph() {
    const workflow = new StateGraph(AgentStateAnnotation);

    // Add nodes
    workflow.addNode('parseQuestion', this.parseQuestion.bind(this));
    workflow.addNode('understandIntent', this.understandIntent.bind(this));
    workflow.addNode('gatherGitHubContext', this.gatherGitHubContext.bind(this));
    workflow.addNode('gatherLinearContext', this.gatherLinearContext.bind(this));
    workflow.addNode('handleLinearMutation', this.handleLinearMutation.bind(this));
    workflow.addNode('generateResponse', this.generateResponse.bind(this));

    // Define edges - use string literals for START and END
    workflow.addEdge('__start__' as any, 'parseQuestion' as any);
    workflow.addEdge('parseQuestion' as any, 'understandIntent' as any);
    
    // Conditional routing after understanding intent
    workflow.addConditionalEdges(
      'understandIntent' as any,
      this.shouldGatherContext.bind(this) as any,
      {
        'linear_mutation': 'handleLinearMutation',
        'github_only': 'gatherGitHubContext',
        'linear_only': 'gatherLinearContext',
        'both': 'gatherGitHubContext',
        'generate': 'generateResponse',
      } as any
    );

    // After GitHub context, check if we need Linear too
    workflow.addConditionalEdges(
      'gatherGitHubContext' as any,
      this.shouldGatherLinear.bind(this) as any,
      {
        'gather_linear': 'gatherLinearContext',
        'generate': 'generateResponse',
      } as any
    );

    // After Linear context, generate response
    workflow.addEdge('gatherLinearContext' as any, 'generateResponse' as any);
    workflow.addEdge('handleLinearMutation' as any, '__end__' as any);
    workflow.addEdge('generateResponse' as any, '__end__' as any);

    return workflow.compile();
  }

  /**
   * Parse question and extract search mode
   */
  private async parseQuestion(state: AgentState): Promise<Partial<AgentState>> {
    console.log('🔍 [LangGraph] Parsing question...');
    const lowerQuestion = state.question.toLowerCase().trim();
    
    let searchMode: 'both' | 'linear' | 'github' = 'both';
    let cleanQuestion = state.question;

    // Check for explicit prefixes first
    if (lowerQuestion.startsWith('/linear ')) {
      searchMode = 'linear';
      cleanQuestion = state.question.substring(8).trim();
    } else if (lowerQuestion.startsWith('/github ')) {
      searchMode = 'github';
      cleanQuestion = state.question.substring(8).trim();
    } else if (lowerQuestion === '/linear') {
      searchMode = 'linear';
      cleanQuestion = '';
    } else if (lowerQuestion === '/github') {
      searchMode = 'github';
      cleanQuestion = '';
    } else if (lowerQuestion.includes('linear')) {
      // If "linear" is mentioned anywhere in the question, prioritize Linear
      searchMode = 'linear';
      console.log('🔍 Detected "linear" keyword, setting searchMode to linear');
    }

    return {
      question: cleanQuestion || state.question,
      searchMode,
      step: 'parsed',
      toolsUsed: ['parseQuestion'],
    };
  }

  /**
   * Understand user intent using LLM
   */
  private async understandIntent(state: AgentState): Promise<Partial<AgentState>> {
    console.log('🧠 [LangGraph] Understanding intent...');
    try {
      const intent = await this.llmService.understandQuestion(state.question);
      return {
        intent,
        step: 'intent_understood',
        toolsUsed: ['understandIntent'],
      };
    } catch (error: any) {
      console.error('❌ Error understanding intent:', error);
      return {
        intent: { action: 'general' as const, parameters: {}, confidence: 0.5 },
        step: 'intent_understood',
        toolsUsed: ['understandIntent'],
      };
    }
  }

  /**
   * Conditional routing after understanding intent
   */
  private shouldGatherContext(state: AgentState): string {
    const action = state.intent?.action || 'general';
    const searchMode = state.searchMode;
    const question = state.question.toLowerCase();

    // Beatriz questions should skip GitHub context and go directly to response generation
    // This ensures we use the JSON file context instead of GitHub repo info
    const beatrizPatterns = [
      'beatriz',
      'how is beatriz solving',
      'how is beatriz solving her task',
      'beatriz solving',
      'beatriz task',
      'beatriz implementation',
      'beatriz approach'
    ];
    
    const isBeatrizQuestion = beatrizPatterns.some(pattern => question.includes(pattern));
    if (isBeatrizQuestion) {
      console.log('🎯 [LangGraph] Beatriz question detected - skipping GitHub context, using JSON file');
      // Load Beatriz context immediately and go to response generation
      return 'generate';
    }

    // GitHub issue, user work, and work conflict check queries go to GitHub context
    if (action === 'github_issue' || action === 'user_work' || action === 'work_conflict_check') {
      return 'github_only';
    }

    // If "linear" is in the question, prioritize Linear
    if (question.includes('linear') && searchMode !== 'github') {
      // For team-related queries with "linear", use linear_teams
      if ((action === 'team' || action === 'collaborators') && this.linearService) {
        return 'linear_only';
      }
      // For other Linear actions
      const linearOnlyActions = ['linear_issues', 'linear_teams', 'linear_projects', 'linear_search', 'linear_state'];
      if (linearOnlyActions.includes(action)) {
        return 'linear_only';
      }
      // If searchMode is linear, always use linear_only
      if (searchMode === 'linear') {
        return 'linear_only';
      }
    }

    // Linear mutations
    if (['linear_create', 'linear_update', 'linear_assign', 'linear_comment'].includes(action)) {
      return 'linear_mutation';
    }

    // Linear-only actions should skip GitHub context
    const linearOnlyActions = ['linear_issues', 'linear_teams', 'linear_projects', 'linear_search', 'linear_state'];
    if (linearOnlyActions.includes(action)) {
      return 'linear_only';
    }

    // If action is "general" or "search", intelligently route based on question content
    if (action === 'general' || action === 'search') {
      // If question explicitly mentions "linear", prioritize Linear
      if (question.includes('linear')) {
        console.log('🔄 Overriding general/search action to Linear because "linear" is mentioned');
        return 'linear_only';
      }
      // If question explicitly mentions "github" or "repo", prioritize GitHub
      if (question.includes('github') || question.includes('repo') || question.includes('repository')) {
        console.log('🔄 Overriding general/search action to GitHub because "github/repo" is mentioned');
        return 'github_only';
      }
      // For general questions without explicit mentions, gather both by default
      console.log('🔄 General question - will gather both GitHub and Linear context');
      return 'both';
    }

    // If no intent, go straight to generation
    if (!state.intent) {
      return 'generate';
    }

    // Based on search mode
    if (searchMode === 'github') {
      return 'github_only';
    } else if (searchMode === 'linear') {
      return 'linear_only';
    } else {
      // Default to both for unknown actions
      return 'both';
    }
  }

  /**
   * Gather GitHub context
   */
  private async gatherGitHubContext(state: AgentState): Promise<Partial<AgentState>> {
    console.log('📦 [LangGraph] Gathering GitHub context...');
    const context: any = { ...state.context };
    const intent = state.intent!;
    const action = intent.action;
    const question = state.question.toLowerCase();

    // Check if question is about Beatriz specifically (hardcoded)
    const questionLower = state.question.toLowerCase();
    const beatrizPatterns = [
      'beatriz',
      'how is beatriz solving',
      'how is beatriz solving her task',
      'beatriz solving',
      'beatriz task',
      'beatriz implementation',
      'beatriz approach'
    ];
    
    const isBeatrizQuestion = beatrizPatterns.some(pattern => questionLower.includes(pattern));
    
    if (isBeatrizQuestion) {
      const beatrizContext = this.userContextService.getUserContext('beatriz');
      if (beatrizContext) {
        console.log(`📋 [LangGraph] Found user context for: Beatriz (in gatherGitHubContext)`);
        context.userContext = beatrizContext;
      }
    } else {
      // Check if question is about a specific user's implementation/work
      // Look for patterns like "how is [name] implementing", "how is [name] solving", etc.
      const userImplementationPattern = /(?:how|what).*(?:is|are|does|did).*(\w+).*(?:implementing|solving|working|doing|building|creating|developing|approach)/i;
      const userMatch = state.question.match(userImplementationPattern);
      
      if (userMatch && userMatch[1]) {
        const userName = userMatch[1];
        const userContext = this.userContextService.getUserContext(userName);
        if (userContext) {
          console.log(`📋 [LangGraph] Found user context for: ${userName}`);
          context.userContext = userContext;
        }
      }
    }

    // Skip GitHub context for Linear-only actions
    const linearOnlyActions = ['linear_issues', 'linear_teams', 'linear_projects', 'linear_search', 'linear_state'];
    if (linearOnlyActions.includes(action)) {
      console.log('⏭️  Skipping GitHub context for Linear-only action');
      return {
        context,
        step: 'github_context_skipped',
        toolsUsed: ['gatherGitHubContext'],
      };
    }

    try {
      // Always get repo info (but don't fail if it errors)
      if (!context.repoInfo) {
        try {
          context.repoInfo = await this.githubService.getRepoInfo();
        } catch (error) {
          console.warn('⚠️  Could not get repo info (non-fatal)');
          // Don't throw - continue with other context gathering
        }
      }

      // Gather specific context based on intent
      switch (action) {
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

        case 'github_issue':
          if (intent.parameters.githubIssueNumber) {
            const issue = await this.githubService.getIssueByNumber(intent.parameters.githubIssueNumber);
            if (issue) {
              context.githubIssue = issue;
            }
          }
          break;

        case 'user_work':
          if (intent.parameters.username) {
            const username = intent.parameters.username;
            console.log(`👤 [LangGraph] Gathering work for user: ${username}`);
            
            // Get GitHub issues assigned to user
            const githubIssues = await this.githubService.getIssuesByAssignee(username, 10);
            console.log(`📋 Found ${githubIssues.length} GitHub issues for ${username}`);
            
            // Get recent commits by user
            const githubCommits = await this.githubService.getCommitsByAuthor(username, 10);
            console.log(`💻 Found ${githubCommits.length} recent commits by ${username}`);
            
            // Get Linear issues assigned to user (if Linear is available)
            let linearIssues: any[] = [];
            if (this.linearService) {
              try {
                // Get all issues and filter by assignee name/email
                const allIssues = await this.linearService.getIssues(undefined, 50);
                linearIssues = allIssues.filter((issue: any) => {
                  if (!issue.assignee) return false;
                  // Match by name (case-insensitive partial match) or email
                  const assigneeName = issue.assignee.name?.toLowerCase() || '';
                  const assigneeEmail = issue.assignee.email?.toLowerCase() || '';
                  const searchName = username.toLowerCase();
                  return assigneeName.includes(searchName) || 
                         assigneeEmail.includes(searchName) ||
                         assigneeEmail === `${username}@`.toLowerCase();
                });
                console.log(`📋 Found ${linearIssues.length} Linear issues for ${username}`);
              } catch (error) {
                console.error('Error getting Linear issues for user:', error);
              }
            }
            
            context.userWork = {
              username,
              githubIssues,
              githubCommits,
              linearIssues,
            };
          }
          break;

        case 'work_conflict_check':
          if (intent.parameters.proposedWork) {
            const proposedWork = intent.parameters.proposedWork.toLowerCase();
            console.log(`🔍 [LangGraph] Checking work conflicts for: "${proposedWork}"`);
            
            // Get all collaborators/contributors
            let allUsers: string[] = [];
            try {
              const collaborators = await this.githubService.getCollaborators();
              allUsers = collaborators.map((c: any) => c.username).filter(Boolean);
              console.log(`👥 Found ${allUsers.length} collaborators`);
            } catch (error) {
              console.warn('⚠️  Could not get collaborators, trying contributors');
              try {
                const contributors = await this.githubService.getContributors(20);
                allUsers = contributors.map((c: any) => c.username).filter(Boolean);
                console.log(`👥 Found ${allUsers.length} contributors`);
              } catch (err) {
                console.error('Error getting users:', err);
              }
            }
            
            // Get work for all users
            const allUsersWork: Array<{
              username: string;
              githubIssues?: any[];
              linearIssues?: any[];
              commits?: any[];
            }> = [];
            
            const conflicts: Array<{
              user: string;
              githubIssues?: any[];
              linearIssues?: any[];
              commits?: any[];
              conflictReason: string;
            }> = [];
            
            // Keywords to match for conflicts
            const proposedKeywords = proposedWork
              .split(/\s+/)
              .filter((word: string) => word.length > 3)
              .map((word: string) => word.toLowerCase());
            
            for (const username of allUsers) {
              try {
                // Get GitHub issues
                const githubIssues = await this.githubService.getIssuesByAssignee(username, 10);
                
                // Get recent commits
                const githubCommits = await this.githubService.getCommitsByAuthor(username, 10);
                
                // Get Linear issues
                let linearIssues: any[] = [];
                if (this.linearService) {
                  try {
                    const allIssues = await this.linearService.getIssues(undefined, 50);
                    linearIssues = allIssues.filter((issue: any) => {
                      if (!issue.assignee) return false;
                      const assigneeName = issue.assignee.name?.toLowerCase() || '';
                      const assigneeEmail = issue.assignee.email?.toLowerCase() || '';
                      const searchName = username.toLowerCase();
                      return assigneeName.includes(searchName) || 
                             assigneeEmail.includes(searchName) ||
                             assigneeEmail === `${username}@`.toLowerCase();
                    });
                  } catch (error) {
                    // Ignore Linear errors
                  }
                }
                
                allUsersWork.push({
                  username,
                  githubIssues,
                  linearIssues,
                  commits: githubCommits,
                });
                
                // Check for conflicts
                const userConflicts: {
                  githubIssues?: any[];
                  linearIssues?: any[];
                  commits?: any[];
                } = {};
                
                // Check GitHub issues for conflicts
                const conflictingIssues = githubIssues.filter((issue: any) => {
                  const issueText = `${issue.title} ${issue.body || ''}`.toLowerCase();
                  return proposedKeywords.some((keyword: string) => issueText.includes(keyword)) ||
                         issueText.includes(proposedWork);
                });
                
                if (conflictingIssues.length > 0) {
                  userConflicts.githubIssues = conflictingIssues;
                }
                
                // Check Linear issues for conflicts
                const conflictingLinearIssues = linearIssues.filter((issue: any) => {
                  const issueText = `${issue.title} ${issue.description || ''}`.toLowerCase();
                  return proposedKeywords.some((keyword: string) => issueText.includes(keyword)) ||
                         issueText.includes(proposedWork);
                });
                
                if (conflictingLinearIssues.length > 0) {
                  userConflicts.linearIssues = conflictingLinearIssues;
                }
                
                // Check commits for conflicts
                const conflictingCommits = githubCommits.filter((commit: any) => {
                  const commitText = commit.message.toLowerCase();
                  return proposedKeywords.some((keyword: string) => commitText.includes(keyword)) ||
                         commitText.includes(proposedWork);
                });
                
                if (conflictingCommits.length > 0) {
                  userConflicts.commits = conflictingCommits.slice(0, 3); // Limit to 3 most recent
                }
                
                // If any conflicts found, add to conflicts array
                if (userConflicts.githubIssues || userConflicts.linearIssues || userConflicts.commits) {
                  let conflictReason = '';
                  if (userConflicts.githubIssues) {
                    conflictReason += `${userConflicts.githubIssues.length} similar GitHub issue(s). `;
                  }
                  if (userConflicts.linearIssues) {
                    conflictReason += `${userConflicts.linearIssues.length} similar Linear issue(s). `;
                  }
                  if (userConflicts.commits) {
                    conflictReason += `Recent commits on related work.`;
                  }
                  
                  conflicts.push({
                    user: username,
                    ...userConflicts,
                    conflictReason: conflictReason.trim() || 'Related work found',
                  });
                }
              } catch (error) {
                console.warn(`⚠️  Error getting work for ${username}:`, error);
              }
            }
            
            context.workConflicts = {
              proposedWork: intent.parameters.proposedWork,
              conflicts,
              allUsersWork,
            };
            
            console.log(`✅ Found ${conflicts.length} potential conflict(s) for "${proposedWork}"`);
          }
          break;

        case 'list':
          context.files = await this.githubService.listDirectory(intent.parameters.directoryPath);
          context.directoryPath = intent.parameters.directoryPath || 'root';
          break;

        case 'browse':
          if (intent.parameters.filePath) {
            const chunk = await this.githubService.getFileWithLines(
              intent.parameters.filePath,
              intent.parameters.startLine,
              intent.parameters.endLine
            );
            if (chunk) {
              context.fileChunk = chunk;
            }
          }
          break;

        case 'structure':
          if (intent.parameters.filePath) {
            context.codeStructure = await this.githubService.getCodeStructure(intent.parameters.filePath);
          }
          break;

        case 'tree':
          context.directoryTree = await this.githubService.getDirectoryTree(intent.parameters.directoryPath, 3);
          context.directoryPath = intent.parameters.directoryPath || 'root';
          break;

        case 'find_usage':
          if (intent.parameters.moduleName) {
            context.usageFiles = await this.githubService.findFilesUsing(intent.parameters.moduleName);
            context.moduleName = intent.parameters.moduleName;
          }
          break;

        case 'team':
        case 'collaborators':
          context.collaborators = await this.githubService.getCollaborators();
          break;

        case 'contributors':
          context.contributors = await this.githubService.getContributors(10);
          break;

        case 'general':
          // For general questions, try to search GitHub
          if (state.question) {
            const searchTerms = state.question.match(/\b(\w{4,})\b/g)?.slice(0, 3);
            if (searchTerms && searchTerms.length > 0) {
              context.searchResults = await this.githubService.searchCode(searchTerms.join(' '));
            }
          }
          // Also get recent issues and commits for general questions
          try {
            context.issues = await this.githubService.getOpenIssues(5);
            context.commits = await this.githubService.getRecentCommits(5);
          } catch (error) {
            console.warn('⚠️  Could not get issues/commits for general question (non-fatal)');
          }
          break;
      }

      return {
        context,
        step: 'github_context_gathered',
        toolsUsed: ['gatherGitHubContext'],
      };
    } catch (error: any) {
      console.error('❌ Error gathering GitHub context:', error);
      // Don't propagate GitHub errors for Linear-only queries
      const question = state.question.toLowerCase();
      if (question.includes('linear') || state.searchMode === 'linear') {
        console.log('⚠️  GitHub error occurred but skipping for Linear query');
        return {
          context: state.context, // Keep existing context (Linear data)
          step: 'github_context_skipped',
          toolsUsed: ['gatherGitHubContext'],
        };
      }
      return {
        error: error.message,
        step: 'error',
        toolsUsed: ['gatherGitHubContext'],
      };
    }
  }

  /**
   * Gather Linear context
   */
  private async gatherLinearContext(state: AgentState): Promise<Partial<AgentState>> {
    console.log('📋 [LangGraph] Gathering Linear context...');
    
    if (!this.linearService) {
      console.log('⚠️  Linear service not available, skipping Linear context');
      return {
        step: 'linear_context_gathered',
        toolsUsed: ['gatherLinearContext'],
      };
    }

    // IMPORTANT: Merge with existing context to preserve GitHub data
    const context: any = { ...state.context };
    console.log('🔍 [LangGraph] Existing context keys:', Object.keys(context));
    const intent = state.intent!;
    const action = intent.action;
    const question = state.question.toLowerCase();

    try {
      // Handle team-related queries - if "linear" is mentioned or action is team/collaborators with linear searchMode
      if ((action === 'team' || action === 'collaborators') && (question.includes('linear') || state.searchMode === 'linear')) {
        context.linearTeams = await this.linearService.getTeams();
        console.log('✅ Retrieved Linear teams for team query');
      }
      
      switch (action) {
        case 'linear_issues':
          // Check if user wants "my issues" vs "all issues" or "existing issues"
          const questionLower = state.question.toLowerCase();
          if (questionLower.includes('my') || questionLower.includes('assigned to me')) {
            // User specifically asked for their issues
            context.linearIssues = await this.linearService.getMyIssues(10);
          } else {
            // User asked for "existing issues" or "all issues" - get all issues
            context.linearIssues = await this.linearService.getIssues(undefined, 50);
            console.log(`✅ Retrieved ${context.linearIssues?.length || 0} Linear issues (all issues)`);
          }
          break;

        case 'linear_teams':
          context.linearTeams = await this.linearService.getTeams();
          break;

        case 'linear_projects':
          context.linearProjects = await this.linearService.getProjects();
          break;

        case 'linear_search':
          if (intent.parameters.linearSearchTerm) {
            const allIssues = await this.linearService.getIssues(undefined, 50);
            context.linearIssues = allIssues.filter(issue =>
              issue.title.toLowerCase().includes(intent.parameters.linearSearchTerm!.toLowerCase()) ||
              (issue.description && issue.description.toLowerCase().includes(intent.parameters.linearSearchTerm!.toLowerCase()))
            );
            context.linearSearchTerm = intent.parameters.linearSearchTerm;
          }
          break;

        case 'linear_state':
          if (intent.parameters.linearState) {
            context.linearIssues = await this.linearService.getIssuesByState(
              intent.parameters.linearState,
              intent.parameters.linearTeam,
              20
            );
            context.linearState = intent.parameters.linearState;
          }
          break;

        case 'search':
        case 'general':
          // For general questions, always gather Linear context (projects, teams, issues)
          const lowerQuestion = state.question.toLowerCase();
          
          // Get Linear projects
          try {
            context.linearProjects = await this.linearService.getProjects();
            console.log('✅ Retrieved Linear projects for general query');
          } catch (error) {
            console.warn('⚠️  Could not get Linear projects (non-fatal)');
          }
          
          // Get Linear teams
          try {
            context.linearTeams = await this.linearService.getTeams();
            console.log('✅ Retrieved Linear teams for general query');
          } catch (error) {
            console.warn('⚠️  Could not get Linear teams (non-fatal)');
          }
          
          // Get Linear issues (recent/active ones)
          try {
            context.linearIssues = await this.linearService.getIssues(undefined, 10);
            console.log('✅ Retrieved Linear issues for general query');
          } catch (error) {
            console.warn('⚠️  Could not get Linear issues (non-fatal)');
          }
          
          break;

        case 'issues':
          // For general issues query, also get Linear issues
          context.linearIssues = await this.linearService.getMyIssues(10);
          break;
      }

      // Debug: Log what Linear data we gathered
      console.log('✅ [LangGraph] Linear context gathered:', {
        projects: context.linearProjects?.length || 0,
        teams: context.linearTeams?.length || 0,
        issues: context.linearIssues?.length || 0,
      });
      
      return {
        context,
        step: 'linear_context_gathered',
        toolsUsed: ['gatherLinearContext'],
      };
    } catch (error: any) {
      console.error('❌ Error gathering Linear context:', error);
      // Don't fail completely - return existing context
      return {
        context: state.context, // Preserve existing context (GitHub data)
        step: 'linear_context_gathered',
        toolsUsed: ['gatherLinearContext'],
      };
    }
  }

  /**
   * Handle Linear mutations
   */
  private async handleLinearMutation(state: AgentState): Promise<Partial<AgentState>> {
    // Skip if this is a GitHub issue query
    if (state.intent?.action === 'github_issue') {
      return {
        step: 'linear_mutation_skipped',
        toolsUsed: ['handleLinearMutation'],
      };
    }
    console.log('✏️  [LangGraph] Handling Linear mutation...');
    
    if (!this.linearService) {
      return {
        response: '❌ Linear service is not configured.',
        step: 'completed',
        toolsUsed: ['handleLinearMutation'],
      };
    }

    const intent = state.intent!;
    const action = intent.action;

    try {
      let response = '';

      switch (action) {
        case 'linear_create':
          const title = intent.parameters.linearTitle;
          const teamName = intent.parameters.linearTeam;
          const description = intent.parameters.linearDescription;

          if (!title) {
            response = '❌ Please provide a title for the issue.';
            break;
          }

          let teamId: string | null = null;
          if (teamName) {
            const team = await this.linearService.findTeamByNameOrKey(teamName);
            if (team) {
              teamId = team.id;
            } else {
              response = `❌ Team "${teamName}" not found.`;
              break;
            }
          } else {
            const teams = await this.linearService.getTeams();
            if (teams.length > 0) {
              teamId = teams[0].id;
            }
          }

          if (teamId) {
            const issue = await this.linearService.createIssue(title, teamId, description);
            if (issue) {
              response = `✅ Created Linear issue *${issue.identifier}*: ${issue.title}\n${issue.url}`;
            }
          }
          break;

        case 'linear_update':
          const issueId = intent.parameters.linearIssueId;
          const stateName = intent.parameters.linearState;

          // If no issue ID provided, try to extract from question
          let extractedIssueId = issueId;
          if (!extractedIssueId) {
            // Try to extract issue identifier from question (e.g., SYN-2, FE-123)
            const issueIdMatch = state.question.match(/\b([A-Z]+-\d+)\b/i);
            if (issueIdMatch) {
              extractedIssueId = issueIdMatch[1].toUpperCase();
              console.log(`📌 Extracted issue ID from question: ${extractedIssueId}`);
            }
          }

          if (!extractedIssueId) {
            response = '❌ Please provide an issue identifier (e.g., SYN-2, FE-123).';
            break;
          }

          const issue = await this.linearService.getIssueByIdentifier(extractedIssueId);
          if (!issue) {
            response = `❌ Issue ${extractedIssueId} not found.`;
            break;
          }

          // If state name is provided, update the issue status
          if (stateName) {
            const team = await this.linearService.findTeamByNameOrKey(issue.team.key);
            if (team) {
              const stateId = await this.linearService.findStateByName(team.id, stateName);
              if (stateId) {
                const success = await this.linearService.updateIssueStatus(issue.id, stateId);
                if (success) {
                  response = `✅ Updated issue ${extractedIssueId} status to "${stateName}"\n${issue.url}`;
                } else {
                  response = `❌ Failed to update issue ${extractedIssueId}.`;
                }
              } else {
                response = `❌ State "${stateName}" not found.`;
              }
            } else {
              response = `❌ Could not find team for issue ${extractedIssueId}.`;
            }
          } else {
            // No state provided - check if user is asking specifically about assignee
            const questionLower = state.question.toLowerCase();
            const isAssigneeQuery = questionLower.includes('who') && 
                                   (questionLower.includes('assigned') || questionLower.includes('assignee'));
            
            if (isAssigneeQuery) {
              // Focused response for assignee queries
              if (issue.assignee) {
                response = `👤 *${issue.identifier} - ${issue.title}*\n\n` +
                          `*Assigned to:* ${issue.assignee.name}${issue.assignee.email ? ` (${issue.assignee.email})` : ''}\n` +
                          `🔗 ${issue.url}`;
              } else {
                response = `👤 *${issue.identifier} - ${issue.title}*\n\n` +
                          `*Assigned to:* Unassigned\n` +
                          `🔗 ${issue.url}`;
              }
            } else {
              // Full issue details for general status queries
              const assigneeInfo = issue.assignee 
                ? `👤 *Assigned to:* ${issue.assignee.name}${issue.assignee.email ? ` (${issue.assignee.email})` : ''}`
                : '👤 *Assigned to:* Unassigned';
              
              const priorityInfo = issue.priority ? `\n⚡ *Priority:* ${issue.priority}` : '';
              
              response = `📋 *${issue.identifier} - ${issue.title}*\n\n` +
                        `📊 *Status:* ${issue.state.name} (${issue.state.type})\n` +
                        `${assigneeInfo}${priorityInfo}\n` +
                        `👥 *Team:* ${issue.team.name}\n` +
                        `🔗 ${issue.url}`;
              
              if (issue.description) {
                const descPreview = issue.description.length > 200 
                  ? issue.description.substring(0, 200) + '...'
                  : issue.description;
                response += `\n\n📝 *Description:*\n${descPreview}`;
              }
            }
          }
          break;

        case 'linear_assign':
          const assignIssueId = intent.parameters.linearIssueId;
          const assigneeName = intent.parameters.linearAssignee;

          if (!assignIssueId || !assigneeName) {
            response = '❌ Please provide issue ID and assignee name.';
            break;
          }

          const assignIssue = await this.linearService.getIssueByIdentifier(assignIssueId);
          if (!assignIssue) {
            response = `❌ Issue ${assignIssueId} not found.`;
            break;
          }

          const users = await this.linearService.searchUsers(assigneeName);
          if (users.length === 1) {
            const success = await this.linearService.assignIssue(assignIssue.id, users[0].id);
            if (success) {
              response = `✅ Assigned issue ${assignIssueId} to ${users[0].name}\n${assignIssue.url}`;
            }
          } else {
            response = `❌ Could not find unique user matching "${assigneeName}".`;
          }
          break;

        case 'linear_comment':
          const commentIssueId = intent.parameters.linearIssueId;
          const comment = intent.parameters.linearComment;

          if (!commentIssueId || !comment) {
            response = '❌ Please provide issue ID and comment.';
            break;
          }

          const commentIssue = await this.linearService.getIssueByIdentifier(commentIssueId);
          if (!commentIssue) {
            response = `❌ Issue ${commentIssueId} not found.`;
            break;
          }

          const commentSuccess = await this.linearService.addComment(commentIssue.id, comment);
          if (commentSuccess) {
            response = `✅ Added comment to issue ${commentIssueId}: "${comment}"\n${commentIssue.url}`;
          }
          break;
      }

      return {
        response: response || '❌ Failed to process Linear mutation.',
        step: 'completed',
        toolsUsed: ['handleLinearMutation'],
      };
    } catch (error: any) {
      console.error('❌ Error handling Linear mutation:', error);
      return {
        response: `❌ Error: ${error.message}`,
        step: 'completed',
        toolsUsed: ['handleLinearMutation'],
      };
    }
  }

  /**
   * Generate final response
   */
  private async generateResponse(state: AgentState): Promise<Partial<AgentState>> {
    console.log('💬 [LangGraph] Generating response...');
    
    try {
      if (!state.intent) {
        return {
          response: 'I could not understand your question. Please try rephrasing it.',
          step: 'completed',
          toolsUsed: ['generateResponse'],
        };
      }

      // Check for user context if not already loaded (for general questions)
      let context = { ...state.context };
      const questionLower = state.question.toLowerCase();
      
      // Hardcoded check for Beatriz - ALWAYS prioritize JSON file over GitHub
      const beatrizPatterns = [
        'beatriz',
        'how is beatriz solving',
        'how is beatriz solving her task',
        'beatriz solving',
        'beatriz task',
        'beatriz implementation',
        'beatriz approach'
      ];
      
      const isBeatrizQuestion = beatrizPatterns.some(pattern => questionLower.includes(pattern));
      
      if (isBeatrizQuestion) {
        const beatrizContext = this.userContextService.getUserContext('beatriz');
        if (beatrizContext) {
          console.log(`📋 [LangGraph] Found user context for: Beatriz (hardcoded for question: "${state.question}")`);
          // Override context with ONLY Beatriz context - don't use GitHub repo info
          context = {
            userContext: beatrizContext
          };
        } else {
          console.log(`⚠️  Beatriz question detected but context not found`);
        }
      } else if (!context.userContext) {
        // Try multiple patterns to catch different question formats for other users
        const patterns = [
          /(?:how|what).*(?:is|are|does|did).*(\w+).*(?:implementing|solving|working|doing|building|creating|developing|approach)/i,
          /(\w+).*(?:is|are|does|did).*(?:implementing|solving|working|doing|building|creating|developing)/i,
          /(?:how|what).*(\w+).*(?:implementation|solution|approach|method)/i,
        ];
        
        for (const pattern of patterns) {
          const userMatch = state.question.match(pattern);
          if (userMatch && userMatch[1]) {
            const userName = userMatch[1];
            // Skip common words
            if (!['the', 'this', 'that', 'these', 'those', 'exactly', 'currently'].includes(userName.toLowerCase())) {
              const userContext = this.userContextService.getUserContext(userName);
              if (userContext) {
                console.log(`📋 [LangGraph] Found user context for: ${userName} (in generateResponse)`);
                context.userContext = userContext;
                break; // Found a match, stop trying other patterns
              }
            }
          }
        }
      }

      // If there's an error but we have Linear context, still try to generate response
      if (state.error && (state.question.toLowerCase().includes('linear') || state.searchMode === 'linear')) {
        console.log('⚠️  Error occurred but continuing with Linear context');
        // Clear the error so we can still generate a response
        const cleanState = { ...state, error: undefined, context };
        const response = await this.llmService.answerQuestionWithContext(
          cleanState.question,
          cleanState.intent!,
          cleanState.context
        );
        return {
          response: response || 'I could not generate a response. Please try again.',
          step: 'completed',
          toolsUsed: ['generateResponse'],
        };
      }

      // Debug: Log context before sending to LLM
      if (state.intent?.action === 'general') {
        console.log('🔍 [LangGraph] Context being sent to LLM:', {
          hasRepoInfo: !!context.repoInfo,
          hasLinearProjects: !!context.linearProjects,
          linearProjectsCount: context.linearProjects?.length || 0,
          hasLinearTeams: !!context.linearTeams,
          linearTeamsCount: context.linearTeams?.length || 0,
          hasLinearIssues: !!context.linearIssues,
          linearIssuesCount: context.linearIssues?.length || 0,
        });
      }
      
      const response = await this.llmService.answerQuestionWithContext(
        state.question,
        state.intent,
        context // Use updated context with userContext if found
      );

      // Check if response contains GitHub error and we're doing a Linear query
      if (response && (state.question.toLowerCase().includes('linear') || state.searchMode === 'linear')) {
        if (response.toLowerCase().includes('github') && response.toLowerCase().includes('error')) {
          console.log('⚠️  Response contains GitHub error, using fallback');
          const fallbackResponse = this.llmService.generateFallbackResponse(state.intent, state.context);
          if (fallbackResponse && !fallbackResponse.toLowerCase().includes('github')) {
            return {
              response: fallbackResponse,
              step: 'completed',
              toolsUsed: ['generateResponse'],
            };
          }
        }
      }

      return {
        response: response || 'I could not generate a response. Please try again.',
        step: 'completed',
        toolsUsed: ['generateResponse'],
      };
    } catch (error: any) {
      console.error('❌ Error generating response:', error);
      // For Linear queries, try fallback response
      if (state.question.toLowerCase().includes('linear') || state.searchMode === 'linear') {
        const fallbackResponse = this.llmService.generateFallbackResponse(state.intent!, state.context);
        if (fallbackResponse && !fallbackResponse.toLowerCase().includes('github')) {
          return {
            response: fallbackResponse,
            step: 'completed',
            toolsUsed: ['generateResponse'],
          };
        }
      }
      return {
        response: 'Sorry, I encountered an error generating a response. Please try again.',
        step: 'completed',
        toolsUsed: ['generateResponse'],
      };
    }
  }

  /**
   * Conditional routing after GitHub context
   */
  private shouldGatherLinear(state: AgentState): string {
    const searchMode = state.searchMode;
    const action = state.intent?.action || 'general';
    const question = state.question.toLowerCase();

    // Skip Linear for Beatriz questions (they use JSON file only)
    const beatrizPatterns = [
      'beatriz',
      'how is beatriz solving',
      'how is beatriz solving her task',
      'beatriz solving',
      'beatriz task',
      'beatriz implementation',
      'beatriz approach'
    ];
    
    const isBeatrizQuestion = beatrizPatterns.some(pattern => question.includes(pattern));
    if (isBeatrizQuestion) {
      return 'generate'; // Skip Linear for Beatriz
    }

    // If we have Linear service, intelligently decide when to gather Linear context
    if (this.linearService) {
      // If searchMode is explicitly 'linear', always gather Linear
      if (searchMode === 'linear') {
        console.log('🔄 Gathering Linear context (searchMode is linear)');
        return 'gather_linear';
      }
      
      // If searchMode is explicitly 'github', skip Linear
      if (searchMode === 'github') {
        return 'generate';
      }
      
      // For general/search actions, gather Linear context (unless question explicitly mentions only GitHub/repo)
      if ((action === 'general' || action === 'search') && !question.includes('github') && !question.includes('repo') && !question.includes('repository')) {
        console.log('🔄 Gathering Linear context for general/search question');
        return 'gather_linear';
      }
      
      // For issues action, also gather Linear issues
      if (action === 'issues') {
        console.log('🔄 Gathering Linear context for issues action');
        return 'gather_linear';
      }
      
      // If searchMode is 'both', always gather Linear (check this before other conditions)
      if (searchMode === 'both') {
        console.log('🔄 Gathering Linear context (searchMode is both)');
        return 'gather_linear';
      }
      
      // For Linear-specific actions, gather Linear context
      const linearOnlyActions = ['linear_issues', 'linear_teams', 'linear_projects', 'linear_search', 'linear_state'];
      if (linearOnlyActions.includes(action)) {
        console.log('🔄 Gathering Linear context for Linear-specific action');
        return 'gather_linear';
      }
    }

    return 'generate';
  }

  /**
   * Run the agent with a question
   */
  async run(question: string, conversationHistory: ConversationMessage[] = []): Promise<string> {
    const initialState: any = {
      question,
      originalQuestion: question,
      searchMode: 'both',
      context: {
        conversationHistory: conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      },
      step: 'start',
      toolsUsed: [],
      intent: undefined,
      response: undefined,
      error: undefined,
    };

    try {
      const result = await this.graph.invoke(initialState);
      console.log('✅ [LangGraph] Completed:', {
        step: result.step,
        toolsUsed: result.toolsUsed,
      });

      return result.response || 'I could not generate a response.';
    } catch (error: any) {
      console.error('❌ [LangGraph] Error:', error);
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }
}

