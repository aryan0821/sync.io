# Team Notifications Setup

The bot can now send notifications to a Slack channel when GitHub issues are created or updated!

## Quick Setup

1. **Get your Slack channel ID**:
   - In Slack, right-click on the channel → "View channel details"
   - Or use: `https://api.slack.com/methods/conversations.list` to list channels
   - Channel IDs look like: `C1234567890` (public) or `G1234567890` (private)

2. **Add to `.env` file**:
   ```env
   SLACK_CHANNEL_ID=C1234567890  # Your team channel ID
   ```

3. **Restart the bot**:
   ```bash
   npm run build
   npm start
   ```

## What Gets Notified

When `SLACK_CHANNEL_ID` is set, the bot will automatically post to the channel for:

- ✨ **New issues opened**
- ✅ **Issues closed**
- 🔄 **Issues reopened**
- 📌 **Issues assigned**
- 💬 **Comments** (if configured)

Each notification includes:
- Issue title and number
- Repository name
- Creator/assignee info
- Link to view on GitHub
- Issue description preview (first 300 chars)

## Example Notification

```
✨ New issue opened

Issue #123: Fix login bug
Repository: aryan0821/sync.io
By: aryan0821
https://github.com/aryan0821/sync.io/issues/123

Description:
The login button is not working on mobile devices...
```

## Personal vs Team Notifications

- **Team notifications**: Always sent to the channel when `SLACK_CHANNEL_ID` is set
- **Personal notifications**: Still sent to your DM (`SLACK_USER_ID`) if you're assigned/mentioned

## Testing

1. Create a new issue in your GitHub repo
2. Check your Slack channel - you should see the notification!
3. Check bot logs for: `✅ Sent team notification to channel C1234567890`

## Troubleshooting

**No notifications appearing?**
- Verify `SLACK_CHANNEL_ID` is correct
- Check bot has permission to post in the channel (invite the bot to the channel)
- Check bot logs for errors
- Verify webhook is receiving events (check ngrok dashboard)

**Bot can't post to channel?**
- Invite the bot to the channel: `/invite @your-bot-name`
- Or add the bot to the channel in Slack settings

