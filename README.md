# Slack Sync Bot

A powerful, agentic Slack bot that connects to GitHub and Linear to answer questions about your repository, manage issues, and interact with your codebase using natural language. Built with TypeScript, LangGraph, and OpenAI.

## 🚀 Features

### GitHub Integration
- **Repository Information**: Get stars, forks, language, description, and metadata
- **File Operations**: Read file contents, browse code line-by-line, view directory structures
- **Code Search**: Search across your entire codebase for functions, classes, or keywords
- **Commit History**: View recent commits with authors, messages, and dates
- **Issue Management**: List open issues, view issue details
- **Team & Collaboration**: View collaborators, contributors, and team information
- **Advanced Code Browsing**:
  - Directory tree visualization
  - Code structure analysis (exports, imports, functions, classes)
  - Find file usage across the codebase
  - File summaries and metadata
  - Search files by extension

### Linear Integration
- **Issue Management**: List, create, update, assign, and comment on Linear issues
- **Team Management**: View teams and their configurations
- **Project Tracking**: List and view project details
- **Search**: Search issues by keywords
- **State Management**: Filter issues by state (Backlog, In Progress, Done, etc.)
- **User Management**: Search and assign users to issues

### Agentic Workflow
- **LangGraph Orchestration**: Stateful, multi-step agent workflow
- **Intent Classification**: Intelligent understanding of user queries
- **Context Gathering**: Automatic collection of relevant data from GitHub and Linear
- **Natural Language Processing**: Powered by OpenAI GPT-4o-mini for understanding and response generation
- **Dual-Source Search**: Search both GitHub and Linear simultaneously, or restrict to one source

### Slack Features
- **Direct Messages**: Chat with the bot privately
- **Channel Mentions**: Mention the bot in channels
- **Slash Commands**: 
  - `/github <question>` - Search GitHub only
  - `/linear <question>` - Search Linear only
- **GitHub Webhooks**: Receive notifications for mentions and assignments (optional)

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Slack Workspace**: Where you have permission to create apps
- **GitHub Account**: With access to the repository you want to query
- **OpenAI API Key**: For LLM-powered question understanding (recommended)
- **Linear API Token**: (Optional) For Linear integration

## 🛠️ Installation

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd slack-sync
npm install
```

### 2. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "Slack Sync Bot") and select your workspace
4. Navigate to **"OAuth & Permissions"** in the sidebar
5. Scroll to **"Bot Token Scopes"** and add the following scopes:
   - `app_mentions:read` - Read mentions of your bot
   - `chat:write` - Send messages
   - `channels:history` - Read channel messages
   - `im:history` - Read direct messages
   - `im:read` - Read direct message metadata
   - `im:write` - Send direct messages
   - `commands` - Handle slash commands (if using slash commands)
6. Navigate to **"Socket Mode"** in the sidebar
7. Enable Socket Mode
8. Click **"Generate Token"** under "App-Level Tokens"
9. Create a token with the `connections:write` scope
10. Navigate back to **"OAuth & Permissions"**
11. Click **"Install to Workspace"** at the top
12. Authorize the app
13. Copy the following values:
    - **Bot User OAuth Token** (starts with `xoxb-`) - Found in "OAuth & Permissions"
    - **Signing Secret** - Found in "Basic Information" → "App Credentials"
    - **App-Level Token** (starts with `xapp-`) - Found in "Basic Information" → "App-Level Tokens"
    - **Bot User ID** (starts with `U`) - Found in "OAuth & Permissions" → "Bot User" section (appears after installation)

### 3. Create a GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → [Personal access tokens](https://github.com/settings/tokens) → Tokens (classic)
2. Click **"Generate new token"** → **"Generate new token (classic)"**
3. Give it a descriptive name (e.g., "Slack Sync Bot")
4. Set expiration (or "No expiration" for development)
5. Select the following scopes:
   - `repo` - Full control of private repositories (required for private repos)
   - `read:org` - Read org and team membership (if querying organization repos)
6. Click **"Generate token"**
7. **Copy the token immediately** (you won't be able to see it again)

### 4. Get OpenAI API Key (Recommended)

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up or log in
3. Navigate to [API Keys](https://platform.openai.com/api-keys)
4. Click **"Create new secret key"**
5. Copy the key (starts with `sk-`)

### 5. Get Linear API Token (Optional)

1. Go to [linear.app/settings/api](https://linear.app/settings/api)
2. Click **"Create API key"**
3. Give it a name (e.g., "Slack Sync Bot")
4. Copy the token (starts with `lin_api_`)

### 6. Configure Environment Variables

1. Create a `.env` file in the project root:

```bash
cp .env.example .env
```

2. Fill in your credentials:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_BOT_USER_ID=U1234567890  # Optional but recommended

# GitHub Configuration
GITHUB_TOKEN=ghp_your_github_token_here
GITHUB_OWNER=your-github-username
GITHUB_REPO=your-repository-name

# OpenAI Configuration (Recommended)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Linear Configuration (Optional)
LINEAR_API_TOKEN=lin_api_your_linear_token_here

# GitHub Webhooks (Optional)
SLACK_USER_ID=U1234567890  # Your Slack user ID for webhook notifications
GITHUB_USERNAME=your-github-username  # Your GitHub username for webhook matching
WEBHOOK_PORT=3000  # Port for webhook server (default: 3000)
```

## 🚀 Running the Bot

### Development Mode

```bash
npm run dev
```

This runs the bot with `ts-node` for faster iteration. Changes require a restart.

### Production Mode

```bash
npm run build
npm start
```

### Watch Mode (Development)

```bash
npm run watch
```

This watches for TypeScript changes and recompiles automatically. Run `npm start` in another terminal.

## 💬 Usage

### Direct Messages

Simply send a DM to the bot with your question:

```
What is this repo about?
Show me package.json
Search for authentication
Recent commits
```

### Channel Mentions

Mention the bot in any channel:

```
@your-bot what is this repo about?
@your-bot show me the code structure
```

### Slash Commands

Use slash commands to restrict searches to specific sources:

```
/github search for authentication
/github show recent commits
/github what is this repo about?

/linear show my issues
/linear search for bug
/linear create issue "Fix login bug" in Frontend team
```

## 📚 Example Queries

### GitHub Queries

#### Repository Information
- `"What is this repo about?"` - Get repository description and metadata
- `"Show me the repo stats"` - Display stars, forks, language, etc.
- `"What language is this repo?"` - Get primary programming language

#### File Operations
- `"Show me package.json"` - Display file contents
- `"Read src/index.ts"` - View any file
- `"Show me lines 10-50 of src/index.ts"` - Browse specific line ranges
- `"List files in src"` - List directory contents
- `"Show directory tree"` - Visualize repository structure
- `"What's the structure of src/index.ts?"` - Analyze code structure (exports, imports, functions, classes)

#### Code Search
- `"Search for authentication"` - Find code containing a term
- `"Where is the login function?"` - Locate specific functions
- `"Find files that use GitHubService"` - Find usage of a module/class
- `"Show me all .ts files"` - Find files by extension

#### Commits & Issues
- `"Recent commits"` - Show latest commits
- `"Open issues"` - List open issues
- `"Show collaborators"` - List repository collaborators
- `"Show contributors"` - List repository contributors

#### General Questions
- `"How does authentication work?"` - Ask about your codebase
- `"Explain the main function"` - Get code explanations
- `"What does this repo do?"` - General repository questions

### Linear Queries

#### Issue Management
- `"Show me my Linear issues"` - List your assigned issues
- `"Show Linear issues"` - List all issues
- `"Search Linear issues for 'bug'"` - Search issues by keyword
- `"Show issues in In Progress state"` - Filter by state
- `"Create a Linear issue titled 'Fix login bug' in Frontend team"` - Create new issue
- `"Update issue FE-123 to In Progress"` - Update issue state
- `"Assign issue BE-456 to John"` - Assign issue to user
- `"Add comment to issue UI-789: 'Needs review'"` - Add comment to issue

#### Teams & Projects
- `"Show Linear teams"` - List all teams
- `"Show Linear projects"` - List all projects

### Dual-Source Queries

By default, the bot searches both GitHub and Linear. You can restrict searches:

- `"/github search for bug"` - Search only GitHub
- `"/linear search for bug"` - Search only Linear
- `"search for bug"` - Search both GitHub and Linear

## 🏗️ Architecture

### Project Structure

```
slack-sync/
├── src/
│   ├── index.ts                    # Main bot entry point, Slack app initialization
│   ├── agents/
│   │   ├── langgraph-agent.ts      # LangGraph-based agentic workflow orchestration
│   │   └── agent.ts                # Legacy agent implementation (deprecated)
│   ├── handlers/
│   │   └── questionHandler.ts      # Question processing and routing
│   ├── services/
│   │   ├── github.ts               # GitHub API integration (Octokit)
│   │   ├── linear.ts               # Linear GraphQL API integration
│   │   ├── llm.ts                  # OpenAI LLM service for intent classification and response generation
│   │   └── githubWebhook.ts        # GitHub webhook event handling
│   └── webhook.ts                  # Express server for GitHub webhooks
├── dist/                           # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

### Architecture Overview

The bot uses a **LangGraph-based agentic workflow** for intelligent question processing:

1. **Parse Question** (`parseQuestion` node)
   - Extracts clean question text
   - Determines search mode (`github`, `linear`, or `both`)

2. **Understand Intent** (`understandIntent` node)
   - Uses OpenAI to classify user intent
   - Determines required actions (info, file, search, linear operations, etc.)

3. **Gather Context** (`gatherGitHubContext`, `gatherLinearContext` nodes)
   - Conditionally gathers data from GitHub and/or Linear
   - Based on intent and search mode

4. **Handle Mutations** (`handleLinearMutation` node)
   - Executes Linear API mutations (create, update, assign, comment)
   - Only runs for Linear mutation intents

5. **Generate Response** (`generateResponse` node)
   - Uses OpenAI to generate natural language response
   - Formats context data into readable output

### Service Layer

#### GitHubService (`src/services/github.ts`)
- Wraps Octokit REST API client
- Methods for repository info, file operations, code search, commits, issues
- Advanced code browsing features (tree, structure, usage tracking)

#### LinearService (`src/services/linear.ts`)
- Direct GraphQL API integration
- Methods for issues, teams, projects, users
- CRUD operations for Linear entities

#### LLMService (`src/services/llm.ts`)
- Intent classification using OpenAI
- Response generation with context
- Fallback mechanisms for error handling

### State Management

The agent uses LangGraph's `StateGraph` with a shared state object:

```typescript
{
  question: string;              // Original user question
  originalQuestion: string;       // Cleaned question
  searchMode: 'github' | 'linear' | 'both';
  intent: LLMIntent;             // Classified intent
  context: any;                   // Gathered context data
  response: string;               // Final response
  error: string | null;           // Error message if any
  step: string;                   // Current workflow step
  toolsUsed: string[];            // Tools used in processing
}
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_BOT_TOKEN` | Yes | Bot User OAuth Token from Slack |
| `SLACK_SIGNING_SECRET` | Yes | Signing Secret from Slack |
| `SLACK_APP_TOKEN` | Yes | App-Level Token for Socket Mode |
| `SLACK_BOT_USER_ID` | No | Bot User ID (for mentions) |
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token |
| `GITHUB_OWNER` | Yes | GitHub username or organization |
| `GITHUB_REPO` | Yes | Repository name |
| `OPENAI_API_KEY` | Recommended | OpenAI API key for LLM features |
| `LINEAR_API_TOKEN` | No | Linear API token for Linear integration |
| `SLACK_USER_ID` | No | Your Slack user ID (for webhooks) |
| `GITHUB_USERNAME` | No | Your GitHub username (for webhooks) |
| `WEBHOOK_PORT` | No | Port for webhook server (default: 3000) |

### GitHub Token Permissions

Your GitHub token needs the following scopes:
- `repo` - Required for private repositories and full access
- `read:org` - Optional, for organization repositories

### Linear API Token

Linear API tokens start with `lin_api_` and can be created at [linear.app/settings/api](https://linear.app/settings/api).

## 🐛 Troubleshooting

### Bot Not Responding

**Symptoms**: Bot doesn't respond to messages or commands

**Solutions**:
1. Check that all tokens in `.env` are correct
2. Verify the bot is installed in your workspace
3. Check terminal logs for errors
4. Ensure Socket Mode is enabled in Slack app settings
5. Verify `SLACK_APP_TOKEN` has `connections:write` scope

### "dispatch_failed" Error on Slash Commands

**Symptoms**: Slash commands fail with "dispatch_failed"

**Solutions**:
1. Ensure the command is registered in Slack App settings → Slash Commands
2. Check that the bot is installed in the workspace
3. Verify the command handler acknowledges within 3 seconds
4. Check terminal logs for detailed error messages

### GitHub API Errors

**Symptoms**: "Sorry, I encountered an error accessing GitHub"

**Solutions**:
1. Verify `GITHUB_TOKEN` is valid and not expired
2. Check `GITHUB_OWNER` and `GITHUB_REPO` are correct
3. Ensure token has `repo` scope for private repositories
4. Verify you have access to the repository
5. Check terminal logs for specific error messages

### OpenAI API Errors

**Symptoms**: "LLM error: AuthenticationError" or "Incorrect API key provided"

**Solutions**:
1. Verify `OPENAI_API_KEY` is correct and starts with `sk-`
2. Check your OpenAI account has credits/quota
3. Ensure the API key hasn't been revoked
4. Try regenerating the API key

### Linear API Errors

**Symptoms**: Linear operations fail

**Solutions**:
1. Verify `LINEAR_API_TOKEN` starts with `lin_api_`
2. Check the token hasn't expired
3. Ensure the token has necessary permissions
4. Verify you have access to the Linear workspace

### TypeScript Compilation Errors

**Symptoms**: `npm run build` fails

**Solutions**:
1. Run `npm install` to ensure all dependencies are installed
2. Check `tsconfig.json` is valid
3. Verify Node.js version is 18+
4. Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Socket Mode Connection Issues

**Symptoms**: Bot can't connect to Slack

**Solutions**:
1. Verify Socket Mode is enabled in Slack app settings
2. Check `SLACK_APP_TOKEN` is correct
3. Ensure token has `connections:write` scope
4. Check network/firewall settings
5. Restart the bot

## 🔐 Security Best Practices

1. **Never commit `.env` file**: Add it to `.gitignore`
2. **Use environment-specific tokens**: Different tokens for dev/prod
3. **Rotate tokens regularly**: Especially if exposed
4. **Limit token scopes**: Only grant necessary permissions
5. **Use secrets management**: In production, use services like AWS Secrets Manager, HashiCorp Vault, etc.
6. **Monitor API usage**: Set up alerts for unusual activity

## 🧪 Development

### Adding New Features

1. **GitHub Features**: Add methods to `GitHubService` in `src/services/github.ts`
2. **Linear Features**: Add methods to `LinearService` in `src/services/linear.ts`
3. **Intent Types**: Update `LLMIntent` interface in `src/services/llm.ts`
4. **Handlers**: Add handling logic in `src/handlers/questionHandler.ts`
5. **Agent Nodes**: Add new nodes to `LangGraphAgent` in `src/agents/langgraph-agent.ts`

### Testing

Currently, testing is manual. To test:

1. Start the bot: `npm run dev`
2. Send messages in Slack
3. Check terminal logs for debugging
4. Verify responses are correct

### Debugging

Enable verbose logging by checking terminal output. All services log their operations with emoji prefixes:
- ✅ Success
- ❌ Error
- ⚠️ Warning
- 🔧 Configuration
- 📨 Messages
- 🔍 Analysis

## 📖 API Reference

### GitHubService Methods

```typescript
getRepoInfo(): Promise<RepoInfo>
getFileContent(filePath: string): Promise<FileContent>
searchCode(query: string): Promise<SearchResult[]>
getRecentCommits(limit?: number): Promise<Commit[]>
getOpenIssues(): Promise<Issue[]>
listDirectory(path: string): Promise<string[]>
getCollaborators(): Promise<Collaborator[]>
getContributors(): Promise<Contributor[]>
getDirectoryTree(path?: string): Promise<DirectoryTree>
getFileWithLines(filePath: string, startLine: number, endLine: number): Promise<FileChunk>
getCodeStructure(filePath: string): Promise<CodeStructure>
findFilesUsing(moduleName: string): Promise<string[]>
getFileSummary(filePath: string): Promise<string>
getFilesByExtension(extension: string): Promise<string[]>
```

### LinearService Methods

```typescript
getIssues(limit?: number): Promise<LinearIssue[]>
getIssueByIdentifier(identifier: string): Promise<LinearIssue | null>
createIssue(title: string, teamKey: string, description?: string, assigneeId?: string, priority?: number): Promise<LinearIssue>
updateIssueStatus(issueId: string, stateName: string): Promise<LinearIssue>
assignIssue(issueId: string, userId: string): Promise<LinearIssue>
addComment(issueId: string, comment: string): Promise<void>
getTeams(): Promise<LinearTeam[]>
getProjects(): Promise<LinearProject[]>
searchIssues(query: string, limit?: number): Promise<LinearIssue[]>
getIssuesByState(stateName: string, limit?: number): Promise<LinearIssue[]>
getTeamStates(teamKey: string): Promise<any[]>
searchUsers(query: string): Promise<LinearUser[]>
getIssueDetails(issueId: string): Promise<LinearIssue | null>
```

### LLMService Methods

```typescript
understandQuestion(question: string): Promise<LLMIntent>
answerQuestionWithContext(question: string, intent: LLMIntent, context: any): Promise<string>
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT

## 🙏 Acknowledgments

- [Slack Bolt Framework](https://slack.dev/bolt-js/)
- [Octokit](https://github.com/octokit/rest.js) - GitHub API client
- [OpenAI](https://openai.com/) - LLM capabilities
- [LangGraph](https://github.com/langchain-ai/langgraph) - Agentic workflow orchestration
- [Linear](https://linear.app/) - Project management platform

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review terminal logs for detailed error messages

---

**Made with ❤️ for developers who want to interact with their codebase through Slack**
