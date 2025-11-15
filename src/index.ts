import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github';
import { JiraService } from './services/jira';
import { LLMService } from './services/llm';
import { QuestionHandler } from './handlers/questionHandler';
import { setupWebhookServer } from './webhook';

// Load environment variables
dotenv.config();

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Initialize services
const githubService = new GitHubService(
  process.env.GITHUB_TOKEN || '',
  process.env.GITHUB_OWNER || '',
  process.env.GITHUB_REPO || ''
);

// Initialize Jira service
const jiraService = new JiraService(
  process.env.JIRA_HOST || '',
  process.env.JIRA_EMAIL || '',
  process.env.JIRA_API_TOKEN || '',
);

const llmService = new LLMService(process.env.OPENAI_API_KEY);
const questionHandler = new QuestionHandler(githubService, llmService);

// Listen for ALL messages (more permissive)
app.message(async ({ message, say }: any) => {
  // Debug logging - this should fire for ANY message
  console.log('📨 Message received:', {
    channel: message.channel,
    channel_type: message.channel_type,
    text: 'text' in message ? message.text : 'no text',
    subtype: 'subtype' in message ? message.subtype : 'none',
    user: 'user' in message ? message.user : 'no user',
    ts: message.ts
  });

  // Ignore bot messages
  if ('subtype' in message && message.subtype === 'bot_message') {
    console.log('⏭️  Skipping bot message');
    return;
  }

  // Only process messages that mention the bot or are in DMs
  const text = 'text' in message ? message.text : '';
  if (!text) {
    console.log('⏭️  Skipping message with no text');
    return;
  }

  // Check if message is a DM or mentions the bot
  const isDM = message.channel_type === 'im';
  const botUserId = process.env.SLACK_BOT_USER_ID;
  const mentionsBot = (botUserId && text.includes(`<@${botUserId}>`)) ||
    text.toLowerCase().includes('github') ||
    text.toLowerCase().includes('repo');

  console.log('🔍 Message analysis:', { isDM, mentionsBot, botUserId });

  // Accept ALL DMs, or messages that mention the bot or contain keywords
  if (!isDM && !mentionsBot) {
    console.log('⏭️  Skipping - not a DM and doesn\'t mention bot');
    return;
  }

  // For DMs, accept any message (not just ones with keywords)
  if (isDM) {
    console.log('💬 DM detected - processing any message');
  }

  console.log('✅ Processing message...');

  try {
    // Process the question
    console.log('🤔 Processing question:', text);
    const response = await questionHandler.handleQuestion(text);
    console.log('✅ Generated response:', response.substring(0, 100) + '...');

    // Send response (don't thread it, send as regular message)
    await say(response);
    console.log('📤 Response sent successfully');
  } catch (error) {
    console.error('❌ Error processing message:', error);
    try {
      await say('Sorry, I encountered an error processing your request. Please try again.');
    } catch (sendError) {
      console.error('❌ Failed to send error message:', sendError);
    }
  }
});

// Handle app mentions
app.event('app_mention', async ({ event, say }: any) => {
  console.log('📢 App mention received:', event.text);
  try {
    const response = await questionHandler.handleQuestion(event.text);
    await say(response);
    console.log('📤 Mention response sent');

    // Example usage:
    jiraService.getAllIssueIds().then(ids => {
      console.log('All Jira Issue IDs:', ids);
    });

  } catch (error) {
    console.error('❌ Error processing mention:', error);
    await say('Sorry, I encountered an error processing your request. Please try again.');
  }
});

// Also listen for message events directly
app.event('message', async ({ event, say }: any) => {
  console.log('📢 Message event received:', {
    type: event.type,
    channel: event.channel,
    user: event.user,
    text: event.text,
    subtype: event.subtype
  });
});

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack bot is running!');
    console.log('🔌 Waiting for messages...\n');

    // Get and display bot user ID
    try {
      const authResult = await app.client.auth.test();
      console.log(`🤖 Bot User ID: ${authResult.user_id}`);
      console.log(`📝 Bot Username: ${authResult.user}`);
      console.log(`\n💡 Add this to your .env file as SLACK_BOT_USER_ID=${authResult.user_id}\n`);

      // Verify bot can send messages
      console.log('✅ Bot is authenticated and ready to receive messages');
      console.log('📋 Listening for:');
      console.log('   - Direct messages (DMs)');
      console.log('   - App mentions');
      console.log('   - Messages with "github" or "repo"\n');
      console.log('💡 Send a test message in Slack and watch for "📨 Message received" above\n');

      // Setup GitHub webhook server if configured
      const slackUserId = process.env.SLACK_USER_ID;
      const githubUsername = process.env.GITHUB_USERNAME;
      const webhookPort = process.env.WEBHOOK_PORT || '3000';

      if (slackUserId && githubUsername) {
        const webhookApp = setupWebhookServer(app, githubService, slackUserId, githubUsername);
        webhookApp.listen(webhookPort, () => {
          console.log(`🔔 GitHub webhook server running on port ${webhookPort}`);
          console.log(`📡 Webhook URL: http://localhost:${webhookPort}/webhook/github`);
          console.log(`💡 Configure this URL in your GitHub repository webhook settings\n`);
        });
      } else {
        console.log('⚠️  GitHub webhooks not configured. Set SLACK_USER_ID and GITHUB_USERNAME in .env to enable.\n');
      }
    } catch (authError) {
      console.log('⚠️  Could not fetch bot user ID. Bot will still work without it.');
      console.error('Auth error:', authError);
    }
  } catch (error) {
    console.error('❌ Failed to start app:', error);
    process.exit(1);
  }
})();

