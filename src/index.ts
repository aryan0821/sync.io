import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';
import { GitHubService } from './services/github';
import { LinearService } from './services/linear';
import { LLMService } from './services/llm';
import { QuestionHandler } from './handlers/questionHandler';
import { SyncService } from './services/syncService';
import { MemoryService } from './services/memoryService';
import { UserContextService } from './services/userContextService';
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

const llmService = new LLMService(process.env.OPENAI_API_KEY);
const memoryService = new MemoryService(20, 24 * 60 * 60 * 1000); // 20 messages, 24 hours
const userContextService = new UserContextService();
const questionHandler = new QuestionHandler(githubService, llmService, linearService, memoryService, userContextService);

// Initialize sync service if both GitHub and Linear are configured
let syncService: SyncService | undefined;
if (linearService) {
  try {
    syncService = new SyncService(githubService, linearService);
    console.log('✅ Sync service initialized (GitHub ↔ Linear)');
  } catch (error) {
    console.error('⚠️  Failed to initialize sync service:', error);
  }
}

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
    // Clean the text - remove bot mentions and extra whitespace
    let cleanText = text.trim();
    if (botUserId) {
      cleanText = cleanText.replace(new RegExp(`<@${botUserId}>`, 'g'), '').trim();
    }
    // Remove common prefixes
    cleanText = cleanText.replace(/^(github|linear|repo)\s+/i, '').trim();
    
    // Get thread ID for conversation memory (use thread_ts if in a thread, otherwise use channel+user)
    const threadId = message.thread_ts || `${message.channel}_${message.user}`;
    
    // Process the question with memory
    console.log('🤔 Processing question:', cleanText);
    console.log('📝 Original text:', text);
    console.log('💾 Thread ID for memory:', threadId);
    const response = await questionHandler.handleQuestion(cleanText, threadId, {
      channel: message.channel,
      user: message.user,
    });
    console.log('✅ Generated response length:', response.length);
    console.log('✅ Generated response preview:', response.substring(0, 200) + '...');
    
    // Send response (thread it if it's a reply, otherwise send as regular message)
    if (message.thread_ts) {
      // Reply in thread
      await say({ text: response, thread_ts: message.thread_ts });
    } else {
      // Send as regular message
      await say(response);
    }
    console.log('📤 Response sent successfully');
  } catch (error) {
    console.error('❌ Error processing message:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
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
    // Clean the text - remove bot mentions
    let cleanText = event.text.trim();
    const botUserId = process.env.SLACK_BOT_USER_ID;
    if (botUserId) {
      cleanText = cleanText.replace(new RegExp(`<@${botUserId}>`, 'g'), '').trim();
    }
    
    // Get thread ID for conversation memory
    const threadId = event.thread_ts || `${event.channel}_${event.user}`;
    
    console.log('🤔 Processing mention question:', cleanText);
    console.log('💾 Thread ID for memory:', threadId);
    const response = await questionHandler.handleQuestion(cleanText, threadId, {
      channel: event.channel,
      user: event.user,
    });
    console.log('✅ Generated response length:', response.length);
    
    // Reply in thread if it's a thread, otherwise send as regular message
    if (event.thread_ts) {
      await say({ text: response, thread_ts: event.thread_ts });
    } else {
      await say(response);
    }
    console.log('📤 Mention response sent');
  } catch (error) {
    console.error('❌ Error processing mention:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    await say('Sorry, I encountered an error processing your request. Please try again.');
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
    const threadId = `${command.channel_id}_${command.user_id}`;
    console.log('🤔 Processing /github question:', question);
    console.log('💾 Thread ID for memory:', threadId);
    const response = await questionHandler.handleQuestion(question, threadId, {
      channel: command.channel_id,
      user: command.user_id,
    });
    console.log('✅ Generated response length:', response.length);
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
    const threadId = `${command.channel_id}_${command.user_id}`;
    console.log('🤔 Processing /linear question:', question);
    console.log('💾 Thread ID for memory:', threadId);
    const response = await questionHandler.handleQuestion(question, threadId, {
      channel: command.channel_id,
      user: command.user_id,
    });
    console.log('✅ Generated response length:', response.length);
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

// Clean up old conversations periodically (every hour)
setInterval(() => {
  memoryService.cleanup();
}, 60 * 60 * 1000); // 1 hour

// Start the app
(async () => {
  try {
    await app.start();
    console.log('⚡️ Slack bot is running!');
    console.log('🔌 Waiting for messages...\n');
    console.log('💾 Memory enabled: Bot remembers conversation context in threads');
    
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

      // Setup webhook server if configured
      const slackUserId = process.env.SLACK_USER_ID;
      const githubUsername = process.env.GITHUB_USERNAME;
      const linearUserEmail = process.env.LINEAR_USER_EMAIL;
      const webhookPort = process.env.WEBHOOK_PORT || '3000';
      const notifyOnAllGitHubEvents = process.env.GITHUB_NOTIFY_ALL_EVENTS === 'true';

      if (slackUserId && githubUsername) {
        const webhookApp = setupWebhookServer({
          slackApp: app,
          githubService,
          linearService,
          syncService,
          slackUserId,
          githubUsername,
          linearUserEmail,
          notifyOnAllGitHubEvents,
        });

        webhookApp.listen(webhookPort, () => {
          console.log(`🔔 Webhook server running on port ${webhookPort}`);
          console.log(`📡 GitHub webhook URL: http://localhost:${webhookPort}/webhook/github`);
          if (linearService && linearUserEmail) {
            console.log(`📡 Linear webhook URL: http://localhost:${webhookPort}/webhook/linear`);
          }
          console.log(`💡 Configure these URLs in your GitHub/Linear webhook settings`);
          if (syncService) {
            console.log(`🔄 Bidirectional sync enabled (GitHub ↔ Linear)`);
          }
          console.log('');
        });
      } else {
        console.log('⚠️  Webhooks not configured. Set SLACK_USER_ID and GITHUB_USERNAME in .env to enable.\n');
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

