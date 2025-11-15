# Slack GitHub Bot + Email Forwarder

A Slack bot that connects to GitHub to answer questions about your repository AND automatically forwards project management emails from Outlook to Slack. Ask questions about your codebase, files, commits, issues, and more directly from Slack, while keeping your team in sync with relevant emails!

## Features

### GitHub Integration
- 🤖 **LLM-Powered**: Uses OpenAI to understand natural language questions
- 📦 Get repository information (stars, forks, language, etc.)
- 📄 Read and display file contents
- 🔍 Search code in your repository
- 📝 View recent commits
- 🐛 List open issues
- 📁 List files in directories
- 💬 Answer general questions about your codebase

### Email Forwarding (Optional)
- 📧 **Auto-forward emails**: Reads Outlook/Microsoft 365 emails automatically
- 🧠 **AI-powered filtering**: Uses Claude to identify project management emails
- 🎯 **Smart categorization**: Identifies tasks, bugs, meetings, code reviews, etc.
- ⚙️ **Customizable**: Adjust check intervals and confidence thresholds
- 📨 **Slack integration**: Forwards directly to your Slack workspace

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

## Email Forwarding to Slack (Optional)

This bot can automatically read your Outlook emails, use Claude AI to determine if they're relevant to project management, and forward them to your Slack workspace.

### Features

- 🔍 Automatically reads unread emails from Outlook/Microsoft 365
- 🤖 Uses Claude AI to intelligently filter project management emails
- 📧 Forwards relevant emails to Slack via email integration
- ⏰ Configurable check intervals (default: every 5 minutes)
- 🎯 Adjustable confidence threshold for filtering

### Setup Instructions

#### 1. Create Azure AD App Registration

To access Outlook emails, you need to register an application in Azure AD:

1. Go to [Azure Portal](https://portal.azure.com) → Azure Active Directory → App registrations
2. Click "New registration"
   - Name: "sync.io Email Forwarder" (or any name)
   - Supported account types: "Accounts in this organizational directory only"
   - Click "Register"
3. Copy the **Application (client) ID** and **Directory (tenant) ID**
4. Go to "Certificates & secrets" → "New client secret"
   - Description: "sync.io secret"
   - Expires: Choose appropriate duration
   - Click "Add" and **copy the secret value immediately** (you won't see it again)
5. Go to "API permissions"
   - Click "Add a permission" → "Microsoft Graph" → "Application permissions"
   - Add these permissions:
     - `Mail.Read` - Read mail in all mailboxes
     - `Mail.ReadWrite` - Read and write mail in all mailboxes
   - Click "Grant admin consent for [Your Organization]"

#### 2. Get Claude API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign up or log in
3. Go to API Keys and create a new key
4. Copy the API key (starts with `sk-ant-`)

#### 3. Configure Slack Email Integration

1. In Slack, go to your workspace settings
2. Navigate to "Settings & administration" → "Manage apps"
3. Search for "Email" and add the Email app
4. Configure a channel (e.g., #project-management)
5. Get the unique email address for that channel (format: `name-xxxxx@workspace.slack.com`)

#### 4. Configure SMTP Settings

For Outlook/Microsoft 365:
- SMTP Host: `smtp.office365.com`
- SMTP Port: `587`
- Username: Your email address
- Password: Your email password or app password

**Note:** If you have 2FA enabled, you may need to create an app-specific password:
- Go to your Microsoft account security settings
- Create an app password for "Mail"
- Use this password in your configuration

#### 5. Update Environment Variables

Add these to your `.env` file:

```env
# Outlook Configuration
OUTLOOK_CLIENT_ID=your-azure-app-client-id
OUTLOOK_CLIENT_SECRET=your-azure-app-client-secret
OUTLOOK_TENANT_ID=your-azure-tenant-id
OUTLOOK_USER_EMAIL=your-email@company.com

# Claude API
CLAUDE_API_KEY=sk-ant-your-claude-api-key

# Slack Email
SLACK_EMAIL=all-syncio-aaaar72b57l3kjfecxyw2ypdoy@syncioworkspace.slack.com

# SMTP Configuration
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-email-password
FROM_EMAIL=your-email@company.com

# Optional: Adjust these settings
EMAIL_CHECK_INTERVAL=*/5 * * * *  # Every 5 minutes
CONFIDENCE_THRESHOLD=0.6  # 0.0-1.0, higher = stricter
```

#### 6. Run the Bot

Once configured, the bot will:
1. Check for unread emails at the specified interval
2. Analyze each email's subject and preview using Claude
3. Forward emails that are relevant to project management (above confidence threshold)
4. Mark processed emails as read in Outlook

### Email Categories

The AI will identify emails in these categories:
- **task_update** - Task assignments, updates, or completions
- **meeting** - Team meetings, stand-ups, or planning sessions
- **bug_report** - Bug reports or technical issues
- **code_review** - Pull requests or code review requests
- **feature_request** - Feature requests or requirements
- **status_update** - Project status or progress updates
- **other** - Other project management related emails

### Adjusting Sensitivity

Use the `CONFIDENCE_THRESHOLD` setting to control filtering:
- `0.5` - More permissive (may include some false positives)
- `0.6` - Balanced (default)
- `0.7` - Stricter (fewer false positives, may miss some relevant emails)
- `0.8+` - Very strict (only high-confidence matches)

### Troubleshooting

**Email forwarding not working:**
- Verify Azure AD app has correct permissions and admin consent
- Check that SMTP credentials are correct
- Ensure the Slack email address is correct
- Check logs for authentication errors

**Too many/few emails forwarded:**
- Adjust `CONFIDENCE_THRESHOLD` in .env
- Check the logs to see analysis reasoning for each email
- If using fallback (no Claude API key), consider adding one for better accuracy

**Authentication errors:**
- Verify client ID, secret, and tenant ID are correct
- Ensure admin consent was granted for API permissions
- Check that the user email matches your Outlook account

## License

MIT

