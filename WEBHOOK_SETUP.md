# Webhook & Sync Setup Guide

This guide explains how to set up GitHub and Linear webhooks, and configure bidirectional sync between GitHub and Linear.

## Overview

The bot supports:
- **GitHub Webhooks**: Receive notifications when GitHub issues/PRs are created, updated, assigned, or commented on
- **Linear Webhooks**: Receive notifications when Linear issues are created, updated, or commented on
- **Bidirectional Sync**: Automatically sync issues between GitHub and Linear

## Prerequisites

1. Bot must be running and accessible via a public URL (for production) or using a tunnel service (for development)
2. All required environment variables configured (see below)

## Environment Variables

Add these to your `.env` file:

```env
# Webhook Configuration
SLACK_USER_ID=U1234567890              # Your Slack user ID (for receiving notifications)
GITHUB_USERNAME=your-github-username   # Your GitHub username (for filtering events)
LINEAR_USER_EMAIL=your@email.com      # Your Linear account email (for filtering events)
WEBHOOK_PORT=3000                      # Port for webhook server (default: 3000)

# Sync Configuration
LINEAR_DEFAULT_TEAM_KEY=FE            # Default Linear team key for syncing GitHub issues
GITHUB_NOTIFY_ALL_EVENTS=false        # Set to 'true' to notify on all GitHub events (not just mentions/assignments)
```

## Setting Up GitHub Webhooks

### 1. Get Your Webhook URL

When the bot starts, it will display:
```
📡 GitHub webhook URL: http://localhost:3000/webhook/github
```

**For Production**: Use a public URL (e.g., `https://your-domain.com/webhook/github`)

**For Development**: Use a tunnel service like:
- [ngrok](https://ngrok.com/): `ngrok http 3000`
- [localtunnel](https://localtunnel.github.io/www/): `lt --port 3000`
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

### 2. Configure GitHub Webhook

1. Go to your GitHub repository
2. Navigate to **Settings** → **Webhooks** → **Add webhook**
3. Fill in:
   - **Payload URL**: Your webhook URL (e.g., `https://your-domain.com/webhook/github`)
   - **Content type**: `application/json`
   - **Secret**: (Optional) Add a secret for webhook verification
   - **Which events**: Select:
     - ✅ Issues
     - ✅ Pull requests
     - ✅ Issue comments
     - ✅ Pull request review comments
   - **Active**: ✅ Checked
4. Click **Add webhook**

### 3. Test GitHub Webhook

1. Create a new issue in your GitHub repository
2. Assign it to yourself or mention yourself in the issue
3. Check your Slack DMs - you should receive a notification!

## Setting Up Linear Webhooks

### 1. Get Your Webhook URL

When the bot starts, it will display:
```
📡 Linear webhook URL: http://localhost:3000/webhook/linear
```

**For Production**: Use a public URL (e.g., `https://your-domain.com/webhook/linear`)

**For Development**: Use a tunnel service (see GitHub webhook setup above)

### 2. Configure Linear Webhook

1. Go to [Linear Settings → Integrations → Webhooks](https://linear.app/settings/integrations/webhooks)
2. Click **Create webhook**
3. Fill in:
   - **URL**: Your webhook URL (e.g., `https://your-domain.com/webhook/linear`)
   - **Events**: Select:
     - ✅ Issue created
     - ✅ Issue updated
     - ✅ Issue removed
     - ✅ Issue comment created
   - **Teams**: Select teams to monitor (or leave empty for all teams)
4. Click **Create webhook**

### 3. Test Linear Webhook

1. Create a new issue in Linear
2. Assign it to yourself
3. Check your Slack DMs - you should receive a notification!

## Bidirectional Sync Setup

The sync service automatically syncs issues between GitHub and Linear when webhooks are configured.

### How It Works

1. **GitHub → Linear**: When a GitHub issue is created, it's automatically synced to Linear
2. **Linear → GitHub**: When a Linear issue is updated, the corresponding GitHub issue is updated (if synced)
3. **State Mapping**: GitHub states map to Linear states:
   - `closed` → `Done`
   - `open` with "in-progress" label → `In Progress`
   - `open` with "review" label → `In Review`
   - `open` (default) → `Todo`

### Configuration

1. Set `LINEAR_DEFAULT_TEAM_KEY` in `.env` to the team key where synced issues should be created
   - Find your team key in Linear: Team Settings → Key (e.g., "FE", "BE", "DEV")

2. The sync service will automatically:
   - Create Linear issues when GitHub issues are opened
   - Update Linear issue states when GitHub issues are closed
   - Track mappings between GitHub and Linear issues

### Manual Sync

You can also manually sync issues via the bot:

```
Sync GitHub issue #123 to Linear team FE
```

(Note: This requires adding a command handler - currently sync happens automatically via webhooks)

## Notification Settings

### GitHub Notifications

By default, you'll only receive notifications for:
- Issues/PRs assigned to you
- Comments mentioning you

To receive notifications for **all** GitHub events, set:
```env
GITHUB_NOTIFY_ALL_EVENTS=true
```

This will notify you about:
- New issues/PRs opened
- Issues/PRs closed
- Labels added/removed
- PRs updated
- And more...

### Linear Notifications

You'll receive notifications for:
- Issues assigned to you
- Comments on your assigned issues
- Issues you're mentioned in

## Troubleshooting

### Webhook Not Receiving Events

1. **Check webhook URL is accessible**:
   ```bash
   curl https://your-domain.com/health
   ```
   Should return: `{"status":"OK",...}`

2. **Check bot logs**: Look for `📥 Received GitHub event:` or `📥 Received Linear event:` messages

3. **Verify webhook configuration**:
   - GitHub: Check webhook delivery logs in repository settings
   - Linear: Check webhook logs in Linear settings

4. **Check environment variables**:
   - `SLACK_USER_ID` must be set
   - `GITHUB_USERNAME` must match your GitHub username
   - `LINEAR_USER_EMAIL` must match your Linear account email

### Sync Not Working

1. **Check sync service is initialized**: Look for `✅ Sync service initialized` in bot logs

2. **Verify `LINEAR_DEFAULT_TEAM_KEY`**: Must be a valid team key in your Linear workspace

3. **Check Linear API token**: Must have permissions to create/update issues

4. **Check GitHub token**: Must have `repo` scope for private repositories

### Notifications Not Appearing in Slack

1. **Verify `SLACK_USER_ID`**: Must be your Slack user ID (starts with `U`)
   - Find it: Slack → Your Profile → More → Copy member ID

2. **Check bot has permission**: Bot must be able to send DMs to you

3. **Check Slack logs**: Look for `✅ Sent notification to...` messages

## Production Deployment

For production, you'll need:

1. **Public URL**: Use a service like:
   - Heroku
   - Railway
   - Render
   - AWS/GCP/Azure
   - Or use a reverse proxy (nginx, Caddy)

2. **HTTPS**: Webhooks require HTTPS (use Let's Encrypt or your hosting provider's SSL)

3. **Webhook Secret Verification**: (Optional but recommended)
   - Add secret verification in `src/webhook.ts`
   - Configure secrets in GitHub/Linear webhook settings

4. **Environment Variables**: Use secure secret management:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Your hosting provider's secrets

## Example Webhook Payloads

### GitHub Issue Opened
```json
{
  "action": "opened",
  "issue": {
    "number": 123,
    "title": "Fix login bug",
    "body": "Description here",
    "state": "open",
    "assignees": [...],
    "html_url": "https://github.com/owner/repo/issues/123"
  },
  "repository": {
    "full_name": "owner/repo"
  }
}
```

### Linear Issue Created
```json
{
  "type": "Issue",
  "action": "create",
  "data": {
    "id": "abc123",
    "identifier": "FE-456",
    "title": "Fix login bug",
    "state": {
      "name": "Todo",
      "type": "unstarted"
    },
    "assignee": {
      "email": "user@example.com"
    },
    "url": "https://linear.app/team/issue/FE-456"
  }
}
```

## Next Steps

1. Set up webhooks using the steps above
2. Test by creating issues in GitHub/Linear
3. Verify notifications appear in Slack
4. Check sync is working by creating a GitHub issue and seeing it appear in Linear
5. Customize notification settings as needed

For more help, check the main [README.md](./README.md) or open an issue on GitHub.

