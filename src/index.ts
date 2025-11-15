import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github';
import { LinearService } from './services/linear';
import { JiraService } from './services/jira';
import { LLMService } from './services/llm';
import { QuestionHandler } from './handlers/questionHandler';
import { setupWebhookServer } from './webhook';

// Load environment variables
dotenv.config();

// Verify environment variables are loaded
if (!process.env.GITHUB_TOKEN) {
  console.error('⚠️  WARNING: GITHUB_TOKEN not found in environment');
}
if (!process.env.GITHUB_OWNER) {
  console.error('⚠️  WARNING: GITHUB_OWNER not found in environment');
}
if (!process.env.GITHUB_REPO) {
  console.error('⚠️  WARNING: GITHUB_REPO not found in environment');
}

// Initialize Slack app
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

// Initialize services
const githubToken = process.env.GITHUB_TOKEN || '';
const githubOwner = process.env.GITHUB_OWNER || '';
const githubRepo = process.env.GITHUB_REPO || '';

console.log('🔧 GitHub Config:', {
  owner: githubOwner,
  repo: githubRepo,
  tokenPresent: !!githubToken,
  tokenPrefix: githubToken.substring(0, 10) + '...'
});

const githubService = new GitHubService(githubToken, githubOwner, githubRepo);

// Initialize Linear service if token is provided
let linearService: LinearService | undefined;
if (process.env.LINEAR_API_TOKEN) {
  try {
    linearService = new LinearService(process.env.LINEAR_API_TOKEN);
    console.log('✅ Linear service initialized');
  } catch (error) {
    console.error('⚠️  Failed to initialize Linear service:', error);
  }
} else {
  console.log('ℹ️  Linear service not configured (LINEAR_API_TOKEN not set)');
}

// Initialize Jira service
const jiraService = new JiraService(
  process.env.JIRA_HOST || '',
  process.env.JIRA_EMAIL || '',
  process.env.JIRA_API_TOKEN || '',
);

const llmService = new LLMService(process.env.OPENAI_API_KEY);
const questionHandler = new QuestionHandler(githubService, llmService, linearService);

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

// Handle /jira slash command
app.command('/jira', async ({ command, ack, respond, client }: any) => {
  // Acknowledge immediately to prevent timeout
  try {
    await ack();
    console.log('✅ /jira command acknowledged');
  } catch (ackError: any) {
    console.error('❌ Failed to acknowledge /jira command:', ackError);
    return;
  }

  console.log('🔧 /jira command received:', {
    text: command.text,
    user: command.user_id,
    channel: command.channel_id
  });

  try {
    // If no text provided, show help
    if (!command.text || command.text.trim().length === 0) {
      await respond('📋 *Jira Search*\n\nUsage: `/jira <your question>`\n\nExamples:\n• `/jira show my issues`\n• `/jira search for bug`\n• `/jira list all issues`');
      return;
    }

    // Process the question with Jira-only mode
    const question = `/jira ${command.text}`;
    const response = await questionHandler.handleQuestion(question);
    await respond(response);
    console.log('✅ /jira command processed');
  } catch (error: any) {
    console.error('❌ Error processing /jira command:', error);
    console.error('Error stack:', error?.stack);
    try {
      await respond(`Sorry, I encountered an error processing your Jira request: ${error?.message || 'Unknown error'}`);
    } catch (respondError: any) {
      console.error('❌ Failed to send error response:', respondError);
    }
  }
});

// Handle /github slash command
app.command('/github', async ({ command, ack, respond, client }: any) => {
  // Acknowledge immediately to prevent timeout
  try {
    await ack();
    console.log('✅ /github command acknowledged');
  } catch (ackError: any) {
    console.error('❌ Failed to acknowledge /github command:', ackError);
    return;
  }

  console.log('🔧 /github command received:', {
    text: command.text,
    user: command.user_id,
    channel: command.channel_id
  });

  try {
    // If no text provided, show help
    if (!command.text || command.text.trim().length === 0) {
      await respond('🔍 *GitHub Search*\n\nUsage: `/github <your question>`\n\nExamples:\n• `/github search for authentication`\n• `/github show recent commits`\n• `/github what is this repo about?`');
      return;
    }

    // Process the question with GitHub-only mode
    const question = `/github ${command.text}`;
    const response = await questionHandler.handleQuestion(question);
    await respond(response);
    console.log('✅ /github command processed');
  } catch (error: any) {
    console.error('❌ Error processing /github command:', error);
    console.error('Error stack:', error?.stack);
    try {
      await respond(`Sorry, I encountered an error processing your GitHub request: ${error?.message || 'Unknown error'}`);
    } catch (respondError: any) {
      console.error('❌ Failed to send error response:', respondError);
    }
  }
});

// Handle /linear slash command
app.command('/linear', async ({ command, ack, respond, client }: any) => {
  // Acknowledge immediately to prevent timeout
  try {
    await ack();
    console.log('✅ /linear command acknowledged');
  } catch (ackError: any) {
    console.error('❌ Failed to acknowledge /linear command:', ackError);
    return;
  }

  console.log('🔧 /linear command received:', {
    text: command.text,
    user: command.user_id,
    channel: command.channel_id
  });

  try {
    // If no text provided, show help
    if (!command.text || command.text.trim().length === 0) {
      await respond('📋 *Linear Search*\n\nUsage: `/linear <your question>`\n\nExamples:\n• `/linear show my issues`\n• `/linear search for bug`\n• `/linear show teams`');
      return;
    }

    // Process the question with Linear-only mode
    const question = `/linear ${command.text}`;
    const response = await questionHandler.handleQuestion(question);
    await respond(response);
    console.log('✅ /linear command processed');
  } catch (error: any) {
    console.error('❌ Error processing /linear command:', error);
    console.error('Error stack:', error?.stack);
    try {
      await respond(`Sorry, I encountered an error processing your Linear request: ${error?.message || 'Unknown error'}`);
    } catch (respondError: any) {
      console.error('❌ Failed to send error response:', respondError);
    }
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
      console.log('   - Messages with "github" or "repo"');
      console.log('   - Slash commands: /github and /linear\n');
      console.log('💡 Try:');
      console.log('   - Send a DM to the bot');
      console.log('   - Use /github search for bug');
      console.log('   - Use /linear show my issues\n');

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

