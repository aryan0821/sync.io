/**
 * LangGraph Agent for GitHub & Linear Bot
 * Uses LangGraph's StateGraph for agentic workflow orchestration
 */

import { StateGraph, Annotation } from '@langchain/langgraph';
import { GitHubService } from '../services/github';
import { LinearService } from '../services/linear';
import { JiraService } from '../services/jira';
import { LLMService, LLMIntent } from '../services/llm';

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
  searchMode: Annotation<'both' | 'linear' | 'github' | 'jira'>({
    reducer: (x: 'both' | 'linear' | 'github' | 'jira', y: 'both' | 'linear' | 'github' | 'jira') => y || x,
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
    jiraIssues?: any[];
    jiraProjects?: any[];
    jiraSearchTerm?: any[];
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
  private jiraService: JiraService | null;
  private llmService: LLMService;

  constructor(
    githubService: GitHubService,
    linearService: LinearService | null,
    llmService: LLMService,
    jiraService: JiraService | null
  ) {
    this.githubService = githubService;
    this.linearService = linearService;
    this.llmService = llmService;
    this.jiraService = jiraService;
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
    workflow.addNode('gatherJiraContext', this.gatherJiraContext.bind(this));
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
        'jira_only': 'gatherJiraContext',
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
    workflow.addEdge('gatherJiraContext' as any, 'generateResponse' as any);
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

    let searchMode: 'both' | 'linear' | 'github' | 'jira' = 'both';
    let cleanQuestion = state.question;

    if (lowerQuestion.startsWith('/linear ')) {
      searchMode = 'linear';
      cleanQuestion = state.question.substring(8).trim();
    } else if (lowerQuestion.startsWith('/github ')) {
      searchMode = 'github';
      cleanQuestion = state.question.substring(8).trim();
    }

    else if (lowerQuestion.startsWith('/jira ')) {
      searchMode = 'jira';
      cleanQuestion = state.question.substring(6).trim();
    }

    else if (lowerQuestion === '/linear') {
      searchMode = 'linear';
      cleanQuestion = '';
    } else if (lowerQuestion === '/github') {
      searchMode = 'github';
      cleanQuestion = '';
    } else if (lowerQuestion === "/jira") {
      searchMode = 'jira';
      cleanQuestion = '';
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

    // Linear mutations
    if (['linear_create', 'linear_update', 'linear_assign', 'linear_comment'].includes(action)) {
      return 'linear_mutation';
    }

    // If no intent or general, go straight to generation
    if (!state.intent || action === 'general') {
      return 'generate';
    }

    // Based on search mode
    if (searchMode === 'github') {
      return 'github_only';
    } else if (searchMode === 'linear') {
      return 'linear_only';
    } else if (searchMode === 'jira') {
      return 'jira_only';
    } else {
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

    try {
      // Always get repo info
      if (!context.repoInfo) {
        try {
          context.repoInfo = await this.githubService.getRepoInfo();
        } catch (error) {
          console.warn('⚠️  Could not get repo info');
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
          // For general questions, try to search
          if (state.question) {
            const searchTerms = state.question.match(/\b(\w{4,})\b/g)?.slice(0, 3);
            if (searchTerms && searchTerms.length > 0) {
              context.searchResults = await this.githubService.searchCode(searchTerms.join(' '));
            }
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
      return {
        step: 'linear_context_gathered',
        toolsUsed: ['gatherLinearContext'],
      };
    }

    const context: any = { ...state.context };
    const intent = state.intent!;
    const action = intent.action;

    try {
      switch (action) {
        case 'linear_issues':
          context.linearIssues = await this.linearService.getMyIssues(10);
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
          // For general searches, also search Linear
          if (state.question) {
            const allIssues = await this.linearService.getIssues(undefined, 50);
            context.linearIssues = allIssues.filter(issue =>
              issue.title.toLowerCase().includes(state.question.toLowerCase()) ||
              (issue.description && issue.description.toLowerCase().includes(state.question.toLowerCase()))
            );
          }
          break;

        case 'issues':
          // For general issues query, also get Linear issues
          context.linearIssues = await this.linearService.getMyIssues(10);
          break;
      }

      return {
        context,
        step: 'linear_context_gathered',
        toolsUsed: ['gatherLinearContext'],
      };
    } catch (error: any) {
      console.error('❌ Error gathering Linear context:', error);
      return {
        error: error.message,
        step: 'error',
        toolsUsed: ['gatherLinearContext'],
      };
    }
  }

  /**
 * Gather Jira context
 */
  private async gatherJiraContext(state: AgentState): Promise<Partial<AgentState>> {
    console.log('📋 [LangGraph] Gathering Jira context...');

    if (!this.jiraService) {
      return {
        step: 'jira_context_gathered',
        toolsUsed: ['gatherJiraContext'],
      };
    }

    const context: any = { ...state.context };
    const intent = state.intent!;
    const action = intent.action;

    try {
      switch (action) {
        case 'jira_issues':
          // Get all recent Jira issues
          context.jiraIssues = await this.jiraService.getIssues(20);
          break;

        case 'jira_my_issues':
          // Get issues assigned to current user
          context.jiraIssues = await this.jiraService.getMyIssues(10);
          break;

        case 'jira_projects':
          // Get all Jira projects
          context.jiraProjects = await this.jiraService.getProjects();
          break;

        case 'jira_search':
          // Search Jira issues by text
          if (intent.parameters.jiraSearchTerm) {
            context.jiraIssues = await this.jiraService.searchIssuesByText(
              intent.parameters.jiraSearchTerm,
              20
            );
            context.jiraSearchTerm = intent.parameters.jiraSearchTerm;
          }
          break;

        case 'jira_status':
          // Get issues by status
          if (intent.parameters.jiraStatus) {
            context.jiraIssues = await this.jiraService.getIssuesByStatus(
              intent.parameters.jiraStatus,
              20
            );
            context.jiraStatus = intent.parameters.jiraStatus;
          }
          break;

        case 'search':
          // For general searches, also search Jira
          if (state.question) {
            context.jiraIssues = await this.jiraService.searchIssuesByText(
              state.question,
              20
            );
          }
          break;

        case 'general':
          // For general questions, try to fetch recent issues
          if (state.question.toLowerCase().includes('issue') ||
            state.question.toLowerCase().includes('ticket') ||
            state.question.toLowerCase().includes('jira')) {
            context.jiraIssues = await this.jiraService.getIssues(15);
          }
          break;

        case 'issues':
          // For general issues query, also get Jira issues
          context.jiraIssues = await this.jiraService.getMyIssues(10);
          break;

        default:
          // Check if question mentions a specific issue key (e.g., PROJ-123)
          const issueKeyMatch = state.question.match(/([A-Z]+-\d+)/);
          if (issueKeyMatch) {
            console.log(`🔍 Fetching specific Jira issue: ${issueKeyMatch[0]}`);
            const issue = await this.jiraService.getIssueDetails(issueKeyMatch[0]);
            if (issue) {
              context.jiraIssues = [issue];
            }
          } else {
            // Default: get recent issues
            context.jiraIssues = await this.jiraService.getIssues(15);
          }
          break;
      }

      return {
        context,
        step: 'jira_context_gathered',
        toolsUsed: ['gatherJiraContext'],
      };
    } catch (error: any) {
      console.error('❌ Error gathering Jira context:', error);
      return {
        error: error.message,
        step: 'error',
        toolsUsed: ['gatherJiraContext'],
      };
    }
  }

  /**
   * Handle Linear mutations
   */
  private async handleLinearMutation(state: AgentState): Promise<Partial<AgentState>> {
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

          if (!issueId) {
            response = '❌ Please provide an issue identifier.';
            break;
          }

          const issue = await this.linearService.getIssueByIdentifier(issueId);
          if (!issue) {
            response = `❌ Issue ${issueId} not found.`;
            break;
          }

          if (stateName) {
            const team = await this.linearService.findTeamByNameOrKey(issue.team.key);
            if (team) {
              const stateId = await this.linearService.findStateByName(team.id, stateName);
              if (stateId) {
                const success = await this.linearService.updateIssueStatus(issue.id, stateId);
                if (success) {
                  response = `✅ Updated issue ${issueId} status to "${stateName}"\n${issue.url}`;
                }
              } else {
                response = `❌ State "${stateName}" not found.`;
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

      const response = await this.llmService.answerQuestionWithContext(
        state.question,
        state.intent,
        state.context
      );

      return {
        response: response || 'I could not generate a response. Please try again.',
        step: 'completed',
        toolsUsed: ['generateResponse'],
      };
    } catch (error: any) {
      console.error('❌ Error generating response:', error);
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

    // If search mode is 'both' and we have Linear service, gather Linear context too
    if (searchMode === 'both' && this.linearService) {
      // For certain actions, also gather Linear context
      if (['search', 'general', 'issues'].includes(action)) {
        return 'gather_linear';
      }
    }

    return 'generate';
  }

  /**
   * Run the agent with a question
   */
  async run(question: string): Promise<string> {
    const initialState: any = {
      question,
      originalQuestion: question,
      searchMode: 'both',
      context: {},
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

