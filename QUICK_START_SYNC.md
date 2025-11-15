# Quick Start: Automatic Sync & Webhooks

The sync and webhook notifications are **already configured** to run automatically! You just need to:

1. **Start the bot**
2. **Make webhook URLs accessible** (public URL or tunnel)
3. **Configure webhooks in GitHub/Linear**

## Step 1: Configure Environment Variables

Add these to your `.env` file:

```env
# Required for webhooks
SLACK_USER_ID=U1234567890              # Your Slack user ID
GITHUB_USERNAME=your-github-username    # Your GitHub username
LINEAR_USER_EMAIL=your@email.com       # Your Linear account email

# Required for sync
LINEAR_DEFAULT_TEAM_KEY=FE             # Linear team key (e.g., "FE", "BE", "DEV")

# Optional
WEBHOOK_PORT=3000                      # Port for webhook server
GITHUB_NOTIFY_ALL_EVENTS=false         # Set to 'true' for all GitHub events
```

## Step 2: Start the Bot

```bash
npm run build
npm start
```

You should see:
```
🔔 Webhook server running on port 3000
📡 GitHub webhook URL: http://localhost:3000/webhook/github
📡 Linear webhook URL: http://localhost:3000/webhook/linear
🔄 Bidirectional sync enabled (GitHub ↔ Linear)
```

## Step 3: Make Webhook URLs Accessible

**For Development (Local Testing):**

Use a tunnel service to expose your local server:

### Option A: ngrok (Recommended)
```bash
# Install ngrok: https://ngrok.com/download
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok.io`

### Option B: localtunnel
```bash
npm install -g localtunnel
lt --port 3000
```

### Option C: Cloudflare Tunnel
```bash
# Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
cloudflared tunnel --url http://localhost:3000
```

**For Production:**

Deploy to a service with a public URL:
- Heroku
- Railway
- Render
- AWS/GCP/Azure
- Or use a reverse proxy with your domain

## Step 4: Configure GitHub Webhook

1. Go to your GitHub repository
2. **Settings** → **Webhooks** → **Add webhook**
3. Fill in:
   - **Payload URL**: `https://your-tunnel-url.ngrok.io/webhook/github` (or your production URL)
   - **Content type**: `application/json`
   - **Events**: Select:
     - ✅ Issues
     - ✅ Pull requests
     - ✅ Issue comments
   - **Active**: ✅ Checked
4. Click **Add webhook**

## Step 5: Configure Linear Webhook

1. Go to [Linear Settings → Integrations → Webhooks](https://linear.app/settings/integrations/webhooks)
2. Click **Create webhook**
3. Fill in:
   - **URL**: `https://your-tunnel-url.ngrok.io/webhook/linear` (or your production URL)
   - **Events**: Select:
     - ✅ Issue created
     - ✅ Issue updated
     - ✅ Issue removed
     - ✅ Issue comment created
4. Click **Create webhook**

## Step 6: Test It!

### Test GitHub → Linear Sync:
1. Create a new issue in GitHub
2. **Automatically happens:**
   - ✅ Slack notification sent to you
   - ✅ Linear issue created (if `LINEAR_DEFAULT_TEAM_KEY` is set)
   - ✅ Mapping stored between GitHub and Linear issues

### Test Linear → GitHub Update:
1. Update a synced Linear issue (change state, assign, etc.)
2. **Automatically happens:**
   - ✅ Slack notification sent to you
   - ✅ GitHub issue updated (if it was synced)

### Test Notifications:
1. Assign yourself to a GitHub issue
2. **Automatically happens:**
   - ✅ Slack notification in your DMs

## How It Works Automatically

The bot listens for webhook events and automatically:

### When GitHub Issue is Opened:
```
GitHub Webhook → Bot receives event → 
  → Sends Slack notification (if you're assigned/mentioned)
  → Creates Linear issue (if LINEAR_DEFAULT_TEAM_KEY is set)
  → Stores mapping (GitHub #123 ↔ Linear FE-456)
```

### When GitHub Issue is Closed:
```
GitHub Webhook → Bot receives event →
  → Sends Slack notification
  → Updates Linear issue state to "Done"
```

### When Linear Issue is Updated:
```
Linear Webhook → Bot receives event →
  → Sends Slack notification (if you're assigned)
  → Updates GitHub issue (if synced)
```

## Troubleshooting

### Webhooks Not Working?

1. **Check bot is running**: Look for `🔔 Webhook server running` in logs
2. **Check webhook URL is accessible**:
   ```bash
   curl https://your-tunnel-url.ngrok.io/health
   ```
   Should return: `{"status":"OK",...}`
3. **Check GitHub/Linear webhook delivery logs**:
   - GitHub: Repository → Settings → Webhooks → Click webhook → Recent Deliveries
   - Linear: Settings → Integrations → Webhooks → Click webhook → View logs
4. **Check bot logs**: Look for `📥 Received GitHub event:` or `📥 Received Linear event:`

### Sync Not Working?

1. **Check sync service initialized**: Look for `✅ Sync service initialized` in logs
2. **Verify `LINEAR_DEFAULT_TEAM_KEY`**: Must be a valid team key in Linear
3. **Check Linear API token**: Must have permissions to create/update issues
4. **Check bot logs**: Look for `✅ Synced GitHub issue #123 to Linear FE-456`

### Notifications Not Appearing?

1. **Verify `SLACK_USER_ID`**: Must be your Slack user ID (starts with `U`)
   - Find it: Slack → Your Profile → More → Copy member ID
2. **Check bot has permission**: Bot must be able to send DMs to you
3. **Check bot logs**: Look for `✅ Sent notification to...`

## What Happens Automatically

✅ **GitHub issue opened** → Linear issue created + Slack notification  
✅ **GitHub issue closed** → Linear issue updated to "Done" + Slack notification  
✅ **GitHub issue assigned to you** → Slack notification  
✅ **GitHub comment mentions you** → Slack notification  
✅ **Linear issue created** → Slack notification (if assigned to you)  
✅ **Linear issue updated** → GitHub issue updated (if synced) + Slack notification  

## No Manual Steps Required!

Once webhooks are configured, everything runs automatically. Just:
- Keep the bot running
- Keep the tunnel/public URL active
- That's it! 🎉

For more details, see [WEBHOOK_SETUP.md](./WEBHOOK_SETUP.md)

