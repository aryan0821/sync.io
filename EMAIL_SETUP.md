# Email Forwarding Quick Setup Guide

This guide will help you set up automatic email forwarding from Outlook to Slack with AI-powered filtering.

## What You'll Need

- ☑️ Outlook/Microsoft 365 account
- ☑️ Azure AD access (to create app registration)
- ☑️ Claude API key from Anthropic
- ☑️ Slack workspace with email integration enabled
- ☑️ About 15-20 minutes

## Step-by-Step Setup

### Step 1: Azure AD App Registration (5 minutes)

1. Visit [Azure Portal](https://portal.azure.com)
2. Go to: **Azure Active Directory** → **App registrations** → **New registration**
3. Fill in:
   - **Name**: `sync.io Email Forwarder`
   - **Account types**: "Accounts in this organizational directory only"
4. Click **Register**
5. **Save these values** (you'll need them later):
   - Application (client) ID
   - Directory (tenant) ID

### Step 2: Create Client Secret

1. In your app, go to **Certificates & secrets**
2. Click **New client secret**
3. Add description: `sync.io secret`
4. Choose expiration (e.g., 24 months)
5. Click **Add**
6. **IMMEDIATELY COPY THE SECRET VALUE** (you can't see it again!)

### Step 3: Configure API Permissions

1. Go to **API permissions**
2. Click **Add a permission** → **Microsoft Graph** → **Application permissions**
3. Search and add:
   - `Mail.Read`
   - `Mail.ReadWrite`
4. Click **Add permissions**
5. **IMPORTANT**: Click **Grant admin consent for [Your Organization]**
6. Wait for the status to show green checkmarks

### Step 4: Get Claude API Key (2 minutes)

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up or log in
3. Navigate to **API Keys**
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

### Step 5: Configure Slack Email (3 minutes)

1. In Slack, click your workspace name → **Settings & administration** → **Manage apps**
2. Search for **Email** in the App Directory
3. Click **Add to Slack**
4. Choose a channel (e.g., `#project-management`)
5. **Copy the email address** shown (format: `something-xxxxx@workspace.slack.com`)

### Step 6: Update .env File

Add these lines to your `.env` file:

```env
# Outlook Configuration
OUTLOOK_CLIENT_ID=your-client-id-from-step-1
OUTLOOK_CLIENT_SECRET=your-secret-from-step-2
OUTLOOK_TENANT_ID=your-tenant-id-from-step-1
OUTLOOK_USER_EMAIL=yourname@company.com

# Claude API
CLAUDE_API_KEY=sk-ant-your-key-from-step-4

# Slack Email
SLACK_EMAIL=your-slack-email-from-step-5

# SMTP Settings (for Outlook/Office 365)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=yourname@company.com
SMTP_PASS=your-email-password
FROM_EMAIL=yourname@company.com

# Optional Settings
EMAIL_CHECK_INTERVAL=*/5 * * * *  # Check every 5 minutes
CONFIDENCE_THRESHOLD=0.6  # 0.0-1.0, higher = stricter
```

### Step 7: Install Dependencies

```bash
npm install
```

### Step 8: Test It!

```bash
npm run dev
```

You should see:
```
✅ SMTP connection verified
✅ Outlook connection verified
✅ Email services ready
🚀 Running initial email check...
```

## How It Works

1. **Every 5 minutes** (configurable), the bot checks for unread emails
2. **Claude AI analyzes** each email's subject and preview
3. **Relevant emails** (confidence ≥ 60%) are forwarded to Slack
4. **Emails are marked as read** after processing

## Relevant Email Types

The AI looks for:
- ✅ Task assignments and updates
- ✅ Meeting invitations and agendas
- ✅ Bug reports and issue notifications
- ✅ Code review requests
- ✅ Sprint planning and status updates
- ✅ Project blockers and dependencies
- ❌ Marketing emails, newsletters, spam

## Adjusting the Filter

### Too Many Emails Being Forwarded?

Increase the confidence threshold:
```env
CONFIDENCE_THRESHOLD=0.7  # or 0.8 for very strict
```

### Missing Important Emails?

Decrease the confidence threshold:
```env
CONFIDENCE_THRESHOLD=0.5  # more permissive
```

### Change Check Frequency

Check every 10 minutes:
```env
EMAIL_CHECK_INTERVAL=*/10 * * * *
```

Check hourly (9am-5pm, weekdays only):
```env
EMAIL_CHECK_INTERVAL=0 9-17 * * 1-5
```

## Troubleshooting

### "Authentication failed" error

- ✓ Verify Client ID, Secret, and Tenant ID are correct
- ✓ Ensure admin consent was granted in Azure AD
- ✓ Check that the user email matches your Outlook account

### "SMTP connection failed" error

- ✓ Verify SMTP_USER and SMTP_PASS are correct
- ✓ If using 2FA, create an app-specific password
- ✓ Check that your organization allows SMTP authentication

### Emails not being forwarded

- ✓ Check the bot logs to see analysis results
- ✓ Verify the Slack email address is correct
- ✓ Try lowering the CONFIDENCE_THRESHOLD temporarily
- ✓ Send yourself a test email with subject "Project update: Task #123"

## Security Notes

- 🔒 The bot only reads emails (doesn't modify content)
- 🔒 Client secrets should be kept confidential
- 🔒 Consider using app-specific passwords for SMTP
- 🔒 Regular rotation of secrets is recommended

## Need Help?

1. Check the logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test each component individually (Azure AD, SMTP, Slack email)
4. Consult the main README.md for detailed documentation

---

**Pro Tip**: Start with a higher confidence threshold (0.7) and lower it if needed. This prevents overwhelming your Slack channel initially.

