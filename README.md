# Slack GitHub Bot

A Slack bot that connects to GitHub to answer questions about your repository. Ask questions about your codebase, files, commits, issues, and more directly from Slack!

## Features

- 🤖 **LLM-Powered**: Uses OpenAI to understand natural language questions
- 📦 Get repository information (stars, forks, language, etc.)
- 📄 Read and display file contents
- 🔍 Search code in your repository
- 📝 View recent commits
- 🐛 List open issues
- 📁 List files in directories
- 💬 Answer general questions about your codebase

## Prerequisites

- Node.js 18+ and npm
- A Slack workspace where you can create apps
- A GitHub personal access token
- A GitHub repository you want to query

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a Slack App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name your app and select your workspace
4. Go to "OAuth & Permissions" and add these Bot Token Scopes:
   - `app_mentions:read`
   - `chat:write`
   - `channels:history`
   - `im:history`
   - `im:read`
   - `im:write`
5. Go to "Socket Mode" and enable it, then create an App-Level Token with `connections:write` scope
6. Install the app to your workspace
7. Copy the following tokens:
   - Bot User OAuth Token (starts with `xoxb-`)
   - Signing Secret (from "Basic Information")
   - App-Level Token (starts with `xapp-`)
   - Bot User ID (from "OAuth & Permissions", under "Bot User")

### 3. Create a GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate a new token with these scopes:
   - `repo` (full control of private repositories)
   - `read:org` (if querying organization repos)
3. Copy the token

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`:
   ```env
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_SIGNING_SECRET=your-signing-secret
   SLACK_APP_TOKEN=xapp-your-app-token
   SLACK_BOT_USER_ID=U1234567890
   
   GITHUB_TOKEN=ghp_your_github_token
   GITHUB_OWNER=your-username
   GITHUB_REPO=your-repo-name
   
   OPENAI_API_KEY=sk-your-openai-api-key  # Optional but recommended for better question understanding
   ```

## Running the Bot

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

## Usage

Once the bot is running, you can interact with it in Slack:

### Direct Messages
Send a DM to the bot with your questions.

### Mentions
Mention the bot in a channel: `@your-bot what is this repo about?`

### Example Questions

- "What is this repo about?" - Get repository information
- "Show me package.json" - Display file contents
- "Search for authentication" - Search code for a term
- "Recent commits" - Show recent commits
- "Open issues" - List open issues
- "List files in src" - List files in a directory

## Project Structure

```
slack-sync/
├── src/
│   ├── index.ts              # Main bot entry point
│   ├── services/
│   │   └── github.ts          # GitHub API service
│   └── handlers/
│       └── questionHandler.ts # Question processing logic
├── dist/                      # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Troubleshooting

- **Bot not responding**: Check that all tokens are correct and the bot is installed in your workspace
- **GitHub API errors**: Verify your GitHub token has the correct permissions and the repo name is correct
- **Socket Mode issues**: Ensure Socket Mode is enabled and the App-Level Token is correct

## License

MIT

