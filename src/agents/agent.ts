/**
 * Agentic Workflow for GitHub & Linear Bot
 * Implements an agentic pattern with state management and tool selection
 */

import { GitHubService } from '../services/github';
import { LinearService } from '../services/linear';
import { LLMService, LLMIntent } from '../services/llm';

/**
 * Agent State - tracks the conversation and context
 */
export interface AgentState {
  question: string;
  originalQuestion: string;
  searchMode: 'both' | 'linear' | 'github';
  intent?: LLMIntent;
  context: {
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
  };
  response?: string;
  error?: string;
  step: string;
  toolsUsed: string[];
}

/**
 * Agentic Workflow
 */
export class AgenticWorkflow {
  private githubService: GitHubService;
  private linearService: LinearService | null;
  private llmService: LLMService;

  constructor(
    githubService: GitHubService,
    linearService: LinearService | null,
    llmService: LLMService
  ) {
    this.githubService = githubService;
    this.linearService = linearService;
    this.llmService = llmService;
  }

  /**
   * Run the agentic workflow
   */
  async run(question: string): Promise<string> {
    const state: AgentState = {
      question,
      originalQuestion: question,
      searchMode: 'both',
      context: {},
      step: 'start',
      toolsUsed: [],
    };

    try {
      // Step 1: Parse question
      state.step = 'parsing';
      await this.parseQuestion(state);
      state.toolsUsed.push('parseQuestion');

      // Step 2: Understand intent
      state.step = 'understanding';
      await this.understandIntent(state);
      state.toolsUsed.push('understandIntent');

      // Step 3: Decide tools and gather context
      state.step = 'gathering_context';
      await this.gatherContext(state);
      state.toolsUsed.push('gatherContext');

      // Step 4: Handle mutations or generate response
      state.step = 'processing';
      if (this.isLinearMutation(state.intent?.action)) {
        await this.handleLinearMutation(state);
        state.toolsUsed.push('handleLinearMutation');
      } else {
        await this.generateResponse(state);
        state.toolsUsed.push('generateResponse');
      }

      console.log('✅ [Agent] Completed:', {
        step: state.step,
        toolsUsed: state.toolsUsed,
      });

      return state.response || 'I could not generate a response.';
    } catch (error: any) {
      console.error('❌ [Agent] Error:', error);
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }

  /**
   * Parse question and extract search mode
   */
  private async parseQuestion(state: AgentState): Promise<void> {
    console.log('🔍 [Agent] Parsing question...');
    const lowerQuestion = state.question.toLowerCase().trim();
    
    let searchMode: 'both' | 'linear' | 'github' = 'both';
    let cleanQuestion = state.question;

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
    }

    state.question = cleanQuestion || state.question;
    state.searchMode = searchMode;
  }

  /**
   * Understand user intent using LLM
   */
  private async understandIntent(state: AgentState): Promise<void> {
    console.log('🧠 [Agent] Understanding intent...');
    try {
      state.intent = await this.llmService.understandQuestion(state.question);
    } catch (error: any) {
      console.error('❌ Error understanding intent:', error);
      state.intent = { action: 'general' as const, parameters: {}, confidence: 0.5 };
    }
  }

  /**
   * Gather context from GitHub and/or Linear
   */
  private async gatherContext(state: AgentState): Promise<void> {
    console.log('📦 [Agent] Gathering context...', {
      action: state.intent?.action,
      searchMode: state.searchMode,
    });

    const action = state.intent?.action || 'general';
    const searchMode = state.searchMode;

    // Gather GitHub context if needed
    if (searchMode === 'both' || searchMode === 'github') {
      await this.gatherGitHubContext(state, action);
    }

    // Gather Linear context if needed
    if ((searchMode === 'both' || searchMode === 'linear') && this.linearService) {
      await this.gatherLinearContext(state, action);
    }
  }

  /**
   * Gather GitHub context
   */
  private async gatherGitHubContext(state: AgentState, action: string): Promise<void> {
    console.log('📦 [Agent] Gathering GitHub context...');
    const intent = state.intent!;

    try {
      // Always get repo info
      if (!state.context.repoInfo) {
        try {
          state.context.repoInfo = await this.githubService.getRepoInfo();
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
              state.context.fileContents = file.content;
              state.context.filePath = file.path;
            }
          }
          break;

        case 'search':
          if (intent.parameters.searchTerm) {
            state.context.searchResults = await this.githubService.searchCode(intent.parameters.searchTerm);
          }
          break;

        case 'commits':
          state.context.commits = await this.githubService.getRecentCommits(10);
          break;

        case 'issues':
          state.context.issues = await this.githubService.getOpenIssues(10);
          break;

        case 'list':
          state.context.files = await this.githubService.listDirectory(intent.parameters.directoryPath);
          state.context.directoryPath = intent.parameters.directoryPath || 'root';
          break;

        case 'browse':
          if (intent.parameters.filePath) {
            const chunk = await this.githubService.getFileWithLines(
              intent.parameters.filePath,
              intent.parameters.startLine,
              intent.parameters.endLine
            );
            if (chunk) {
              state.context.fileChunk = chunk;
            }
          }
          break;

        case 'structure':
          if (intent.parameters.filePath) {
            state.context.codeStructure = await this.githubService.getCodeStructure(intent.parameters.filePath);
          }
          break;

        case 'tree':
          state.context.directoryTree = await this.githubService.getDirectoryTree(intent.parameters.directoryPath, 3);
          state.context.directoryPath = intent.parameters.directoryPath || 'root';
          break;

        case 'find_usage':
          if (intent.parameters.moduleName) {
            state.context.usageFiles = await this.githubService.findFilesUsing(intent.parameters.moduleName);
            state.context.moduleName = intent.parameters.moduleName;
          }
          break;

        case 'team':
        case 'collaborators':
          state.context.collaborators = await this.githubService.getCollaborators();
          break;

        case 'contributors':
          state.context.contributors = await this.githubService.getContributors(10);
          break;

        case 'general':
          // For general questions, try to search
          if (state.question) {
            const searchTerms = state.question.match(/\b(\w{4,})\b/g)?.slice(0, 3);
            if (searchTerms && searchTerms.length > 0) {
              state.context.searchResults = await this.githubService.searchCode(searchTerms.join(' '));
            }
          }
          break;
      }
    } catch (error: any) {
      console.error('❌ Error gathering GitHub context:', error);
      state.error = error.message;
    }
  }

  /**
   * Gather Linear context
   */
  private async gatherLinearContext(state: AgentState, action: string): Promise<void> {
    console.log('📋 [Agent] Gathering Linear context...');
    
    if (!this.linearService) {
      return;
    }

    const intent = state.intent!;

    try {
      switch (action) {
        case 'linear_issues':
          state.context.linearIssues = await this.linearService.getMyIssues(10);
          break;

        case 'linear_teams':
          state.context.linearTeams = await this.linearService.getTeams();
          break;

        case 'linear_projects':
          state.context.linearProjects = await this.linearService.getProjects();
          break;

        case 'linear_search':
          if (intent.parameters.linearSearchTerm) {
            const allIssues = await this.linearService.getIssues(undefined, 50);
            state.context.linearIssues = allIssues.filter(issue =>
              issue.title.toLowerCase().includes(intent.parameters.linearSearchTerm!.toLowerCase()) ||
              (issue.description && issue.description.toLowerCase().includes(intent.parameters.linearSearchTerm!.toLowerCase()))
            );
            state.context.linearSearchTerm = intent.parameters.linearSearchTerm;
          }
          break;

        case 'linear_state':
          if (intent.parameters.linearState) {
            state.context.linearIssues = await this.linearService.getIssuesByState(
              intent.parameters.linearState,
              intent.parameters.linearTeam,
              20
            );
            state.context.linearState = intent.parameters.linearState;
          }
          break;

        case 'search':
        case 'general':
          // For general searches, also search Linear
          if (state.question) {
            const allIssues = await this.linearService.getIssues(undefined, 50);
            state.context.linearIssues = allIssues.filter(issue =>
              issue.title.toLowerCase().includes(state.question.toLowerCase()) ||
              (issue.description && issue.description.toLowerCase().includes(state.question.toLowerCase()))
            );
          }
          break;

        case 'issues':
          // For general issues query, also get Linear issues
          state.context.linearIssues = await this.linearService.getMyIssues(10);
          break;
      }
    } catch (error: any) {
      console.error('❌ Error gathering Linear context:', error);
    }
  }

  /**
   * Check if action is a Linear mutation
   */
  private isLinearMutation(action?: string): boolean {
    return ['linear_create', 'linear_update', 'linear_assign', 'linear_comment'].includes(action || '');
  }

  /**
   * Handle Linear mutations
   */
  private async handleLinearMutation(state: AgentState): Promise<void> {
    console.log('✏️  [Agent] Handling Linear mutation...');
    
    if (!this.linearService) {
      state.response = '❌ Linear service is not configured.';
      return;
    }

    const intent = state.intent!;
    const action = intent.action;

    try {
      switch (action) {
        case 'linear_create':
          const title = intent.parameters.linearTitle;
          const teamName = intent.parameters.linearTeam;
          const description = intent.parameters.linearDescription;

          if (!title) {
            state.response = '❌ Please provide a title for the issue.';
            return;
          }

          let teamId: string | null = null;
          if (teamName) {
            const team = await this.linearService.findTeamByNameOrKey(teamName);
            if (team) {
              teamId = team.id;
            } else {
              state.response = `❌ Team "${teamName}" not found.`;
              return;
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
              state.response = `✅ Created Linear issue *${issue.identifier}*: ${issue.title}\n${issue.url}`;
            }
          }
          break;

        case 'linear_update':
          const issueId = intent.parameters.linearIssueId;
          const stateName = intent.parameters.linearState;

          if (!issueId) {
            state.response = '❌ Please provide an issue identifier.';
            return;
          }

          const issue = await this.linearService.getIssueByIdentifier(issueId);
          if (!issue) {
            state.response = `❌ Issue ${issueId} not found.`;
            return;
          }

          if (stateName) {
            const team = await this.linearService.findTeamByNameOrKey(issue.team.key);
            if (team) {
              const stateId = await this.linearService.findStateByName(team.id, stateName);
              if (stateId) {
                const success = await this.linearService.updateIssueStatus(issue.id, stateId);
                if (success) {
                  state.response = `✅ Updated issue ${issueId} status to "${stateName}"\n${issue.url}`;
                }
              } else {
                state.response = `❌ State "${stateName}" not found.`;
              }
            }
          }
          break;

        case 'linear_assign':
          const assignIssueId = intent.parameters.linearIssueId;
          const assigneeName = intent.parameters.linearAssignee;

          if (!assignIssueId || !assigneeName) {
            state.response = '❌ Please provide issue ID and assignee name.';
            return;
          }

          const assignIssue = await this.linearService.getIssueByIdentifier(assignIssueId);
          if (!assignIssue) {
            state.response = `❌ Issue ${assignIssueId} not found.`;
            return;
          }

          const users = await this.linearService.searchUsers(assigneeName);
          if (users.length === 1) {
            const success = await this.linearService.assignIssue(assignIssue.id, users[0].id);
            if (success) {
              state.response = `✅ Assigned issue ${assignIssueId} to ${users[0].name}\n${assignIssue.url}`;
            }
          } else {
            state.response = `❌ Could not find unique user matching "${assigneeName}".`;
          }
          break;

        case 'linear_comment':
          const commentIssueId = intent.parameters.linearIssueId;
          const comment = intent.parameters.linearComment;

          if (!commentIssueId || !comment) {
            state.response = '❌ Please provide issue ID and comment.';
            return;
          }

          const commentIssue = await this.linearService.getIssueByIdentifier(commentIssueId);
          if (!commentIssue) {
            state.response = `❌ Issue ${commentIssueId} not found.`;
            return;
          }

          const commentSuccess = await this.linearService.addComment(commentIssue.id, comment);
          if (commentSuccess) {
            state.response = `✅ Added comment to issue ${commentIssueId}: "${comment}"\n${commentIssue.url}`;
          }
          break;
      }

      if (!state.response) {
        state.response = '❌ Failed to process Linear mutation.';
      }
    } catch (error: any) {
      console.error('❌ Error handling Linear mutation:', error);
      state.response = `❌ Error: ${error.message}`;
    }
  }

  /**
   * Generate final response
   */
  private async generateResponse(state: AgentState): Promise<void> {
    console.log('💬 [Agent] Generating response...');
    
    try {
      if (!state.intent) {
        state.response = 'I could not understand your question. Please try rephrasing it.';
        return;
      }

      state.response = await this.llmService.answerQuestionWithContext(
        state.question,
        state.intent,
        state.context
      );

      if (!state.response || state.response.trim().length === 0) {
        state.response = 'I could not generate a response. Please try again.';
      }
    } catch (error: any) {
      console.error('❌ Error generating response:', error);
      state.response = 'Sorry, I encountered an error generating a response. Please try again.';
    }
  }
}

