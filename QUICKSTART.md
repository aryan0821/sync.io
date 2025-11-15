# 🚀 Quick Start Guide

Get sync.io running in 3 steps!

## Step 1: Install npm and Dependencies (2 minutes)

Run the setup script:

```bash
cd /home/beatriz/sync.io
./SETUP.sh
```

Or manually:

```bash
sudo apt install npm
npm install
```

## Step 2: Configure Credentials (5-10 minutes)

Edit the `.env` file that was created:

```bash
nano .env
```

### Required Credentials:

#### A) Slack Bot (Required)
Get these from https://api.slack.com/apps

1. Create a new Slack app or use existing
2. Enable Socket Mode and create App-Level Token
3. Add Bot Token Scopes: `app_mentions:read`, `chat:write`, `channels:history`, `im:history`, `im:read`, `im:write`
4. Install app to workspace
5. Copy these values to `.env`:
   - `SLACK_BOT_TOKEN` (starts with `xoxb-`)
   - `SLACK_SIGNING_SECRET`
   - `SLACK_APP_TOKEN` (starts with `xapp-`)
   - `SLACK_BOT_USER_ID` (found in OAuth & Permissions)

#### B) GitHub (Required)
Get token from https://github.com/settings/tokens

1. Create a Personal Access Token (classic)
2. Give it `repo` scope
3. Copy to `.env`:
   - `GITHUB_TOKEN` (starts with `ghp_`)
   - `GITHUB_OWNER` (your username)
   - `GITHUB_REPO` (your repo name)

#### C) Email Forwarding (Optional)
See `EMAIL_SETUP.md` for detailed instructions.

**Quick version:**
- Azure AD app with Mail permissions → `OUTLOOK_*` variables
- Claude API key → `CLAUDE_API_KEY`
- Slack email address → `SLACK_EMAIL`
- SMTP credentials → `SMTP_*` variables

## Step 3: Run! (1 minute)

### Development Mode (recommended for testing)
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

## What You Should See

### Success ✅
```
⚡️ Slack bot is running!
🔌 Waiting for messages...
🤖 Bot User ID: U12345
✅ Bot is authenticated and ready
📋 Listening for:
   - Direct messages (DMs)
   - App mentions
   - Messages with "github" or "repo"
```

### With Email Forwarding:
```
📧 Email forwarding is configured
✅ SMTP connection verified
✅ Outlook connection verified
⏰ Email check scheduled: */5 * * * *
🚀 Running initial email check...
```

## Testing

### Test Slack Bot
1. Send a DM to your bot: "What is this repo about?"
2. Or mention it in a channel: "@bot show me package.json"

### Test Email Forwarding
Send yourself a test email with subject: "Project Update: Task #123"
Wait 5 minutes (or check interval) and it should appear in Slack.

## Troubleshooting

### "npm command not found"
```bash
sudo apt install npm
```

### "Invalid Slack token"
- Check tokens are copied correctly (no extra spaces)
- Verify bot is installed in workspace
- Ensure Socket Mode is enabled

### "GitHub API error"
- Verify GitHub token has correct permissions
- Check GITHUB_OWNER and GITHUB_REPO are correct

### Email forwarding not working
- It's optional! Bot works without it
- See `EMAIL_SETUP.md` for detailed setup
- Check all OUTLOOK_*, CLAUDE_*, SMTP_* variables are set

## File Structure

```
sync.io/
├── QUICKSTART.md        ← You are here
├── README.md            ← Full documentation
├── EMAIL_SETUP.md       ← Email forwarding guide
├── SETUP.sh             ← Automated setup script
├── .env                 ← Your credentials (created)
├── .env.example         ← Template
├── package.json
└── src/
    ├── index.ts         ← Main entry point
    ├── services/
    │   ├── github.ts    ← GitHub API
    │   ├── llm.ts       ← OpenAI
    │   ├── outlook.ts   ← Email reading
    │   ├── claude.ts    ← Email filtering
    │   └── emailForwarder.ts
    └── handlers/
        ├── questionHandler.ts
        └── emailHandler.ts
```

## Need More Help?

- 📖 **Full docs**: `README.md`
- 📧 **Email setup**: `EMAIL_SETUP.md`
- 🐛 **Logs**: Watch terminal output for errors
- 🔧 **Debug**: Set `EMAIL_CHECK_INTERVAL=*/1 * * * *` for faster testing

## Pro Tips

1. **Start simple**: Get Slack + GitHub working first, add email later
2. **Check logs**: Terminal output shows what's happening
3. **Test incrementally**: Test each feature separately
4. **Adjust threshold**: Start with `CONFIDENCE_THRESHOLD=0.7` for email filtering
5. **Use dev mode**: `npm run dev` auto-reloads on code changes

---

**Ready?** Run `./SETUP.sh` and let's go! 🚀

