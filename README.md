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

### Email Integration
- **Email Receiving**: Automatically monitor and forward relevant emails to Slack
- **AI-Powered Filtering**: Uses Claude AI to analyze email relevance and importance
- **Email Sending**: Send emails directly from Slack using natural language commands
- **Scheduled Checks**: Automatically checks for new emails on a configurable schedule
- **Smart Forwarding**: Only forwards emails that meet relevance and confidence thresholds

## 📋 Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Version 8 or higher
- **Slack Workspace**: Where you have permission to create apps
- **GitHub Account**: With access to the repository you want to query
- **OpenAI API Key**: For LLM-powered question understanding (recommended)
- **Linear API Token**: (Optional) For Linear integration
- **Microsoft Azure AD App**: (Optional) For Outlook/Email integration
- **Claude API Key**: (Optional) For email relevance analysis

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

### 6. Set Up Email Integration (Optional)

#### For Outlook/Microsoft 365:

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Click **"New registration"**
4. Name your app (e.g., "Slack Sync Email Bot")
5. Set redirect URI: `http://localhost:3000/auth/callback` (or your production URL)
6. Click **"Register"**
7. Copy the following values:
   - **Application (client) ID** → This is your `OUTLOOK_CLIENT_ID`
   - **Directory (tenant) ID** → This is your `OUTLOOK_TENANT_ID`
8. Navigate to **"Certificates & secrets"**
9. Click **"New client secret"**
10. Add description and set expiration
11. Copy the secret value → This is your `OUTLOOK_CLIENT_SECRET`
12. Navigate to **"API permissions"**
13. Click **"Add a permission"** → **Microsoft Graph** → **Delegated permissions**
14. Add the following permissions:
    - `Mail.Read` - Read user mail
    - `Mail.Send` - Send mail as user
    - `User.Read` - Sign in and read user profile
15. Click **"Grant admin consent"** (if you have admin rights)
16. Your email address → This is your `OUTLOOK_USER_EMAIL`

#### For Claude AI (Email Analysis):

**Claude AI is used exclusively for email relevance analysis** to prevent spam in Slack. It analyzes each unread email to determine if it's relevant to project management before forwarding.

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **"Create Key"**
5. Copy the key (starts with `sk-ant-`)
6. Add to `.env` as `CLAUDE_API_KEY`

**How Claude is used for emails:**
- **Purpose**: Analyzes email relevance to prevent spam in Slack
- **Input**: Email subject, sender, and content preview (first 500 chars)
- **Output**: Relevance score (0.0-1.0), reasoning, and category
- **Decision**: Only emails above confidence threshold (default: 0.6) are forwarded
- **Model**: Uses Claude Sonnet 4.5 for analysis
- **Fallback**: If Claude API is unavailable, uses keyword-based fallback analysis

**What Claude analyzes:**
- ✅ Relevant: Task assignments, bug reports, meetings, code reviews, project updates
- ❌ Not Relevant: Marketing emails, newsletters, spam, personal emails, social notifications

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

# Email Integration (Optional - Outlook/Microsoft 365)
OUTLOOK_CLIENT_ID=your-azure-app-client-id
OUTLOOK_CLIENT_SECRET=your-azure-app-client-secret
OUTLOOK_TENANT_ID=your-azure-tenant-id
OUTLOOK_USER_EMAIL=your-email@example.com
SLACK_CHANNEL=C1234567890  # Slack channel ID to post emails to
EMAIL_CHECK_INTERVAL=*/5 * * * *  # Cron expression (default: every 5 minutes)
CONFIDENCE_THRESHOLD=0.6  # Email relevance confidence threshold (0.0-1.0)
CLAUDE_API_KEY=sk-ant-your-claude-api-key  # For email relevance analysis
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

### Email Queries

#### Receiving Emails
- `"check emails"` - Manually check for unread emails
- The bot automatically checks for emails on a schedule (default: every 5 minutes)
- Relevant emails are automatically forwarded to the configured Slack channel
- Uses AI to analyze email relevance and only forwards important emails

#### Sending Emails
- `"send email to user@example.com subject: Your Subject body: Your message"` - Send an email
- Format: `send email to <email> subject: <subject> body: <message>`
- Example: `"send email to john@example.com subject: Meeting Tomorrow body: Let's meet at 2pm"`

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
│   │   ├── questionHandler.ts      # Question processing and routing
│   │   └── emailHandler.ts         # Email receiving and sending logic
│   ├── services/
│   │   ├── github.ts               # GitHub API integration (Octokit)
│   │   ├── linear.ts               # Linear GraphQL API integration
│   │   ├── llm.ts                  # OpenAI LLM service for intent classification and response generation
│   │   ├── githubWebhook.ts        # GitHub webhook event handling
│   │   ├── outlook.ts              # Outlook/Microsoft Graph API integration
│   │   ├── claude.ts               # Claude AI service for email analysis
│   │   └── emailForwarderGraph.ts  # Email forwarding service
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
| `OUTLOOK_CLIENT_ID` | No | Azure AD App Client ID (for email) |
| `OUTLOOK_CLIENT_SECRET` | No | Azure AD App Client Secret (for email) |
| `OUTLOOK_TENANT_ID` | No | Azure AD Tenant ID (for email) |
| `OUTLOOK_USER_EMAIL` | No | Your Outlook/Office 365 email address |
| `SLACK_CHANNEL` | No | Slack channel ID to post emails to |
| `EMAIL_CHECK_INTERVAL` | No | Cron expression for email checks (default: `*/5 * * * *`) |
| `CONFIDENCE_THRESHOLD` | No | Email relevance threshold 0.0-1.0 (default: 0.6) |
| `CLAUDE_API_KEY` | No | Claude API key for email analysis |

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

### Email Integration Errors

**Symptoms**: Email checking fails or emails not forwarding

**Solutions**:
1. Verify all Outlook credentials are correct (`OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_TENANT_ID`, `OUTLOOK_USER_EMAIL`)
2. Check Azure AD app has correct permissions (`Mail.Read`, `Mail.Send`, `User.Read`)
3. Ensure admin consent is granted for API permissions
4. Verify `SLACK_CHANNEL` is a valid channel ID (starts with `C` for public or `G` for private)
5. Check bot has permission to post in the channel (invite bot to channel)
6. Verify `CLAUDE_API_KEY` is correct if using email analysis
7. Check `EMAIL_CHECK_INTERVAL` is a valid cron expression
8. Review terminal logs for detailed error messages

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

## 📧 Email Features

### How Email Receiving Works

1. **Automatic Monitoring**: The bot checks for unread emails on a schedule (default: every 5 minutes)
2. **AI Analysis**: Each email is analyzed by Claude AI to determine relevance
3. **Smart Filtering**: Only emails above the confidence threshold are forwarded
4. **Slack Notifications**: Relevant emails are posted to the configured Slack channel with:
   - Subject line
   - Sender information
   - Email body preview
   - Relevance score and reasoning

### Email Relevance Analysis

The bot uses **Claude AI** to analyze emails and determine if they should be forwarded to Slack. Claude analyzes each email's:
- **Subject line**: Extracts key topics and urgency indicators
- **Sender information**: Identifies important contacts and relationships
- **Content preview**: Analyzes first 500 characters for relevance
- **Context matching**: Matches against project/work-related keywords

**How it works:**
1. Bot receives unread email from Outlook/Microsoft Graph
2. Extracts subject, sender, and content preview (first 500 chars)
3. Sends to Claude AI with prompt asking for relevance analysis
4. Claude returns:
   - `isRelevant`: Boolean indicating if email should be forwarded
   - `confidence`: Score from 0.0 to 1.0
   - `reasoning`: Explanation of why it's relevant or not
   - `category`: Optional categorization (e.g., "urgent", "project-related")
5. Only emails above the confidence threshold are forwarded to Slack

**Claude API Integration:**
- Uses Anthropic's Claude API for email analysis
- Configurable confidence threshold (default: 0.6)
- Provides reasoning for transparency
- Handles API errors gracefully with fallback behavior

### Manual Email Check

You can manually trigger an email check:
```
check emails
```

This will:
- Check for unread emails
- Analyze their relevance
- Forward relevant ones to Slack
- Show a summary of found emails

### Sending Emails

Send emails directly from Slack using natural language:

```
send email to user@example.com subject: Meeting Tomorrow body: Let's meet at 2pm to discuss the project
```

**Format**: `send email to <email> subject: <subject> body: <message>`

**Requirements**:
- Valid Outlook/Microsoft 365 account configured
- Azure AD app with `Mail.Send` permission
- Proper authentication

### Email Configuration

**Cron Expression Format** (`EMAIL_CHECK_INTERVAL`):
- `*/5 * * * *` - Every 5 minutes (default)
- `*/10 * * * *` - Every 10 minutes
- `0 * * * *` - Every hour
- `0 9 * * *` - Daily at 9 AM

**Confidence Threshold** (`CONFIDENCE_THRESHOLD`):
- Range: 0.0 to 1.0
- Default: 0.6 (60%)
- Higher = more selective (only very relevant emails)
- Lower = less selective (more emails forwarded)

## 🛠️ Tech Stack

### Core Technologies

- **TypeScript**: Type-safe, maintainable codebase
- **Node.js**: Runtime environment
- **Slack Bolt Framework**: Real-time Slack integration and event handling
- **LangGraph**: Agentic workflow orchestration with stateful multi-step reasoning
- **MCP (Model Context Protocol) Tools**: Seamless integration across platforms

### AI & LLM Services

- **OpenAI GPT-4o-mini**: Intent classification and natural language response generation
- **Claude AI**: Email relevance analysis and intelligent filtering
  - Analyzes email subject, sender, and content to determine relevance
  - Returns confidence scores and reasoning for email forwarding decisions
  - Prevents email spam in Slack by only forwarding important emails
  - Configurable confidence threshold for filtering sensitivity

### API Integrations

- **Octokit**: GitHub REST API client for repository operations
- **Linear GraphQL API**: Project management and issue tracking
- **Microsoft Graph API**: Outlook/Email integration (read and send)
- **Express.js**: Webhook server for GitHub and Linear events

### Data & Storage

- **In-Memory Storage**: Conversation history and context management
- **JSON Files**: User context and document query mappings
- **Environment Variables**: Configuration and secrets management

### Development Tools

- **ts-node**: TypeScript execution in development
- **TypeScript Compiler**: Type checking and compilation
- **node-cron**: Scheduled tasks (email checking)

### Architecture Patterns

- **Service Layer**: Abstracted API integrations (GitHubService, LinearService, etc.)
- **Agent Pattern**: LangGraph-based intelligent workflow orchestration
- **Handler Pattern**: Question processing and routing
- **Memory Pattern**: Thread-based conversation history

## 🚧 Challenges & Solutions

### Challenge 1: Context Switching Between Sources

**Problem**: Determining when to query GitHub vs Linear vs documents vs user context was complex and error-prone.

**Solution**: Built an intelligent context router that analyzes queries and automatically routes to the appropriate source(s). The router uses keyword detection, intent classification, and hybrid mode for complex queries needing multiple sources.

**Implementation**: `ContextRouter` class in `src/utils/contextRouter.ts` that prioritizes document queries, user context, and then GitHub/Linear based on query patterns.

### Challenge 2: Maintaining Conversation Memory

**Problem**: Keeping context across multiple interactions without losing information or accumulating too much data.

**Solution**: Implemented thread-based memory service with automatic cleanup. Memory is stored per Slack thread, preserving context within conversations while automatically cleaning up old threads.

**Implementation**: `MemoryService` class in `src/services/memoryService.ts` with configurable retention policies and periodic cleanup.

### Challenge 3: Email Relevance Filtering

**Problem**: Forwarding every email to Slack would create spam and noise, but manually filtering is time-consuming.

**Solution**: Integrated Claude AI to analyze email relevance with configurable confidence thresholds. Only emails above the threshold are forwarded, with reasoning provided.

**Implementation**: `ClaudeService` in `src/services/claude.ts` uses Anthropic's Claude API (Claude Sonnet 4.5) to analyze email subject, sender, and content preview. The service:
- Sends email metadata to Claude with a prompt asking for relevance analysis
- Receives JSON response with `isRelevant`, `confidence`, `reasoning`, and `category`
- Only forwards emails above the configurable confidence threshold
- Falls back to keyword-based analysis if Claude API is unavailable

### Challenge 4: Work Conflict Detection

**Problem**: Detecting overlapping work across multiple platforms (GitHub, Linear) with different data formats and structures.

**Solution**: Built keyword-based matching system that analyzes issues, commits, and tasks across all sources. Normalizes data formats and uses semantic matching to identify potential conflicts.

**Implementation**: Conflict detection logic in `gatherGitHubContext` method of `LangGraphAgent`, comparing proposed work keywords against team members' active work items.

### Challenge 5: Standup Note Generation

**Problem**: Gathering work information from multiple sources and formatting it professionally requires significant time and manual effort.

**Solution**: Created automated pipeline that fetches GitHub issues, Linear tasks, commits, and user context, then formats using Slack Block Kit for professional presentation. Prioritizes user context from JSON files when available.

**Implementation**: `standup_notes` action in `LangGraphAgent` that gathers data for all team members and formats using Slack's Block Kit API.

### Challenge 6: TypeScript Module Resolution

**Problem**: `ts-node` had issues resolving modules like `node-cron` in development mode.

**Solution**: Added `ts-node` configuration to `tsconfig.json` with explicit module resolution settings and compiler options.

**Implementation**: Added `ts-node` section to `tsconfig.json` with `esm: false` and explicit `module: "commonjs"` settings.

### Challenge 7: Intent Classification Accuracy

**Problem**: LLM sometimes misclassified queries, especially for GitHub vs Linear issues (e.g., `#123` vs `SYN-123`).

**Solution**: Enhanced fallback understanding with explicit pattern matching for GitHub issue numbers (`#number`) vs Linear identifiers (`LETTERS-number`). Added priority rules in system prompt.

**Implementation**: Updated `fallbackUnderstanding` in `LLMService` to prioritize GitHub patterns before Linear patterns, and added `IMPORTANT RULES` section to system prompt.

### Challenge 8: Dual-Source Search Default Behavior

**Problem**: General questions should search both GitHub and Linear by default, but the agent was sometimes defaulting to one source.

**Solution**: Modified routing logic to default to `both` for general queries unless explicitly specified. Added keyword detection for "linear" or "github" to override defaults.

**Implementation**: Updated `shouldGatherContext` and `shouldGatherLinear` in `LangGraphAgent` to intelligently route based on keywords and search mode.

### Challenge 9: LLM Hallucination Prevention

**Problem**: When no data was found (e.g., no Linear issues), the LLM would sometimes generate fake information.

**Solution**: Implemented explicit checks to use fallback responses when context is empty for specific actions. Added validation to prevent LLM from generating data when none exists.

**Implementation**: Added checks in `answerQuestionWithContext` to call `generateFallbackResponse` when context is empty for `linear_issues`, `linear_projects`, etc.

### Challenge 10: User Context Prioritization

**Problem**: When asking about specific users (e.g., "What is Beatriz working on?"), the bot would use generic repository info instead of user-specific JSON context.

**Solution**: Built `ContextRouter` to detect user context queries and prioritize JSON files. Added explicit routing to skip GitHub/Linear when pure user context queries are detected.

**Implementation**: `ContextRouter.isPureUserQuery()` and `findUserContext()` methods that detect user names and load JSON context, with routing logic to prioritize JSON over API calls.

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
- [Claude AI](https://www.anthropic.com/) - Email relevance analysis
- [Microsoft Graph API](https://learn.microsoft.com/en-us/graph/) - Outlook/Email integration
- [LangGraph](https://github.com/langchain-ai/langgraph) - Agentic workflow orchestration
- [Linear](https://linear.app/) - Project management platform

## 📞 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check the troubleshooting section above
- Review terminal logs for detailed error messages

---

**Made with ❤️ for developers who want to interact with their codebase through Slack**
