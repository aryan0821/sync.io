# Complete .env Configuration Guide

## 🔴 REQUIRED - Bot Won't Work Without These

### Slack Bot (4 variables)
```env
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-secret-here
SLACK_APP_TOKEN=xapp-your-token-here
SLACK_BOT_USER_ID=U01234ABCDE
```

**Where to get:**
1. https://api.slack.com/apps → Create or select app
2. Enable Socket Mode → Create App-Level Token (connections:write)
3. OAuth & Permissions → Add scopes: `app_mentions:read`, `chat:write`, `channels:history`, `im:history`, `im:read`, `im:write`
4. Install to workspace
5. Copy: Bot User OAuth Token, Signing Secret, App-Level Token, Bot User ID

### GitHub (3 variables)
```env
GITHUB_TOKEN=ghp_your_token_here
GITHUB_OWNER=your-username
GITHUB_REPO=your-repo-name
```

**Where to get:**
1. https://github.com/settings/tokens → Generate new token (classic)
2. Select scope: `repo` (full control of private repositories)
3. Copy token
4. Owner = your GitHub username
5. Repo = repository name

---

## 🟡 OPTIONAL - Recommended for Better Experience

### OpenAI (1 variable)
```env
OPENAI_API_KEY=sk-proj-your-key-here
```

**What it does:** Makes question understanding smarter (e.g., "show me the config" → knows you mean package.json)

**Where to get:**
1. https://platform.openai.com/api-keys
2. Create new secret key

**Without it:** Bot uses basic keyword matching (still works, just less smart)

---

## 🟢 OPTIONAL - Email Forwarding Feature

### Azure AD / Outlook (4 variables)
```env
OUTLOOK_CLIENT_ID=12345678-1234-1234-1234-123456789abc
OUTLOOK_CLIENT_SECRET=abc~123DEF~456GHI
OUTLOOK_TENANT_ID=87654321-4321-4321-4321-cba987654321
OUTLOOK_USER_EMAIL=you@company.com
```

**What it does:** Allows bot to read your Outlook/Microsoft 365 emails

**Where to get:**
1. https://portal.azure.com
2. Azure Active Directory → App registrations → New registration
3. Name: "sync.io Email Forwarder"
4. Supported accounts: "Accounts in this organizational directory only"
5. Register → Copy Application (client) ID and Directory (tenant) ID
6. Certificates & secrets → New client secret → Copy value immediately
7. API permissions → Add permission → Microsoft Graph → Application permissions
8. Add: `Mail.Read` and `Mail.ReadWrite`
9. Click "Grant admin consent"

**Without it:** Email forwarding won't work (but Slack/GitHub features still work)

### Claude API (1 variable)
```env
CLAUDE_API_KEY=sk-ant-your-key-here
```

**What it does:** AI analyzes emails to determine if they're project management related

**Where to get:**
1. https://console.anthropic.com/
2. Sign up or log in
3. API Keys → Create Key

**Without it:** Uses basic keyword filtering (less accurate, may forward wrong emails)

### Slack Email Integration (1 variable)
```env
SLACK_EMAIL=all-syncio-aaaar72b57l3kjfecxyw2ypdoy@syncioworkspace.slack.com
```

**What it does:** The email address where forwarded emails are sent

**Where to get:**
1. In Slack: Settings & administration → Manage apps
2. Search "Email" → Add to Slack
3. Choose channel (e.g., #project-management)
4. Copy the unique email address shown

**Without it:** Can't forward emails to Slack

### SMTP Settings (5 variables)
```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=you@company.com
SMTP_PASS=your-password
FROM_EMAIL=you@company.com
```

**What it does:** Allows bot to send emails (forward to Slack)

**For Outlook/Microsoft 365:**
- Host: `smtp.office365.com`
- Port: `587`
- User: Your email address
- Pass: Your email password (or app-specific password if using 2FA)
- From: Your email address

**For Gmail:**
- Host: `smtp.gmail.com`
- Port: `587`
- User: Your Gmail address
- Pass: App-specific password (required)
- From: Your Gmail address

**Without it:** Can't send forwarded emails

### Email Processing Settings (2 variables)
```env
EMAIL_CHECK_INTERVAL=*/5 * * * *
CONFIDENCE_THRESHOLD=0.6
```

**EMAIL_CHECK_INTERVAL:** How often to check for new emails (cron format)
- `*/5 * * * *` = Every 5 minutes (default)
- `*/10 * * * *` = Every 10 minutes
- `0 * * * *` = Every hour
- `0 9-17 * * 1-5` = Every hour, 9am-5pm, Monday-Friday

**CONFIDENCE_THRESHOLD:** How confident AI must be to forward (0.0 to 1.0)
- `0.5` = More permissive (may include false positives)
- `0.6` = Balanced (default, recommended)
- `0.7` = Stricter (fewer false positives)
- `0.8+` = Very strict (only high-confidence matches)

---

## 🔵 OPTIONAL - GitHub Webhooks

### Webhook Configuration (3 variables)
```env
SLACK_USER_ID=U01234ABCDE
GITHUB_USERNAME=your-github-username
WEBHOOK_PORT=3000
```

**What it does:** Get instant Slack notifications when someone mentions you in GitHub

**Where to get:**
- SLACK_USER_ID: Your personal Slack user ID (not the bot's)
- GITHUB_USERNAME: Your GitHub username
- WEBHOOK_PORT: Port for webhook server (default: 3000)

**Setup:**
1. Add these to .env
2. Run bot
3. Configure GitHub webhook: Settings → Webhooks → Add webhook
4. Payload URL: `http://your-server:3000/webhook/github`

**Without it:** No GitHub mention notifications (but everything else works)

---

## 📝 Summary: What Do I Actually Need?

### Minimum to start (GitHub bot only):
✅ SLACK_BOT_TOKEN
✅ SLACK_SIGNING_SECRET
✅ SLACK_APP_TOKEN
✅ SLACK_BOT_USER_ID
✅ GITHUB_TOKEN
✅ GITHUB_OWNER
✅ GITHUB_REPO

**Total: 7 variables = Basic working bot**

### Add for smarter responses:
➕ OPENAI_API_KEY

**Total: 8 variables = Smart bot**

### Add for email forwarding:
➕ OUTLOOK_CLIENT_ID
➕ OUTLOOK_CLIENT_SECRET
➕ OUTLOOK_TENANT_ID
➕ OUTLOOK_USER_EMAIL
➕ CLAUDE_API_KEY
➕ SLACK_EMAIL
➕ SMTP_HOST
➕ SMTP_PORT
➕ SMTP_USER
➕ SMTP_PASS
➕ FROM_EMAIL
➕ EMAIL_CHECK_INTERVAL (optional, has default)
➕ CONFIDENCE_THRESHOLD (optional, has default)

**Total: 19-21 variables = Full-featured bot with email forwarding**

---

## 🚀 Recommended Setup Path

### Phase 1: Get it working (10 minutes)
1. Set up 7 required Slack/GitHub variables
2. Test: `npm run dev`
3. Send DM to bot: "What is this repo about?"

### Phase 2: Make it smarter (2 minutes)
1. Add OPENAI_API_KEY
2. Restart bot
3. Ask: "How does authentication work?"

### Phase 3: Add email forwarding (20 minutes)
1. Follow EMAIL_SETUP.md
2. Add 11 email variables
3. Restart bot
4. Send test email with subject "Project Update: Task #123"
5. Wait 5 minutes, check Slack

---

## 💡 Quick Tips

1. **Start simple**: Just get Slack + GitHub working first
2. **Use quotes**: If values have spaces, wrap in quotes: `GITHUB_OWNER="my name"`
3. **No spaces**: Don't add spaces around `=` sign
4. **Check format**: Token formats matter (xoxb-, ghp-, sk-ant-, etc.)
5. **Test incrementally**: Add variables, test, add more
6. **Read logs**: Terminal shows what's missing or wrong

---

## ⚠️ Security Notes

- Never commit .env to git (it's in .gitignore)
- Keep tokens secret
- Rotate tokens periodically
- Use app-specific passwords when possible
- Don't share .env file

---

**Need help?** Check EMAIL_SETUP.md for detailed email setup guide!

