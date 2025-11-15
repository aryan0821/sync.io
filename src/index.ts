import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';
import * as cron from 'node-cron';
import { GitHubService } from './services/github';
import { LLMService } from './services/llm';
import { QuestionHandler } from './handlers/questionHandler';
import { EmailHandler } from './handlers/emailHandler';
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

const llmService = new LLMService(process.env.OPENAI_API_KEY);
const questionHandler = new QuestionHandler(githubService, llmService);

// Store email handler globally so we can access it from message handler
let globalEmailHandler: any = null;

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
    // Check for email commands
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('check emails') || lowerText.includes('check email')) {
      if (globalEmailHandler) {
        await say('🔍 Checking emails now...');
        const results = await globalEmailHandler.processUnreadEmails();
        
        if (results.total === 0) {
          await say('✅ No unread emails found.');
        } else {
          let message = `📧 *Found ${results.total} email(s)*\n`;
          message += `✅ Forwarded ${results.forwarded} to Slack\n\n`;
          
          // Show first 5 emails
          const emailsToShow = results.emails.slice(0, 5);
          emailsToShow.forEach((email: any, index: number) => {
            const icon = email.forwarded ? '✅' : (email.relevant ? '⚠️' : '⏭️');
            message += `${icon} *${email.subject}*\n`;
            message += `   From: ${email.from}\n`;
            message += `   ${email.reason}\n\n`;
          });
          
          if (results.emails.length > 5) {
            message += `... and ${results.emails.length - 5} more emails`;
          }
          
          await say(message);
        }
      } else {
        await say('⚠️ Email forwarding is not configured.');
      }
      return;
    }

    // Send email command
    if (lowerText.includes('send email to')) {
      if (!globalEmailHandler) {
        await say('⚠️ Email service is not configured.');
        return;
      }

      try {
        // Parse: "send email to user@example.com subject: Test body: Message"
        const emailMatch = text.match(/send email to\s+([^\s]+)(?:\s+subject:\s*([^]+?))?(?:\s+body:\s*([^]+))?$/i);
        
        if (!emailMatch) {
          await say('❌ Invalid format.\n\nUse: `send email to user@example.com subject: Your Subject body: Your message`');
          return;
        }

        const toEmail = emailMatch[1].replace(/<mailto:|>/g, '').split('|')[0]; // Clean Slack mailto links
        const subject = emailMatch[2]?.trim() || 'Message from Slack Bot';
        const body = emailMatch[3]?.trim() || '';

        if (!body) {
          await say('❌ Email body is required.\n\nUse: `send email to user@example.com subject: Your Subject body: Your message`');
          return;
        }

        await say(`📤 Sending email to ${toEmail}...`);
        
        const sent = await globalEmailHandler.sendEmail(toEmail, subject, body);
        
        if (sent) {
          await say(`✅ Email sent successfully!\n\n*To:* ${toEmail}\n*Subject:* ${subject}`);
        } else {
          await say(`❌ Failed to send email. Check bot logs for details.`);
        }
      } catch (error) {
        console.error('Error sending email:', error);
        await say(`❌ Error: ${error}`);
      }
      return;
    }

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

      // Setup email forwarding if configured (using Azure AD / Microsoft Graph)
      const outlookClientId = process.env.OUTLOOK_CLIENT_ID;
      const outlookClientSecret = process.env.OUTLOOK_CLIENT_SECRET;
      const outlookTenantId = process.env.OUTLOOK_TENANT_ID;
      const outlookUserEmail = process.env.OUTLOOK_USER_EMAIL;
      const slackChannel = process.env.SLACK_CHANNEL; // Channel to post emails to
      const emailCheckInterval = process.env.EMAIL_CHECK_INTERVAL || '*/5 * * * *'; // Default: every 5 minutes

      if (outlookClientId && outlookClientSecret && outlookTenantId && outlookUserEmail && slackChannel) {
        
        console.log('📧 Email monitoring is configured (Azure AD / Microsoft Graph)');
        console.log(`📬 Will post to Slack channel: ${slackChannel}`);
        
        const emailHandler = new EmailHandler(
          outlookClientId,
          outlookClientSecret,
          outlookTenantId,
          outlookUserEmail,
          process.env.CLAUDE_API_KEY,
          app,
          slackChannel,
          parseFloat(process.env.CONFIDENCE_THRESHOLD || '0.6')
        );

        // Store globally for command access
        globalEmailHandler = emailHandler;

        // Verify connections
        const connectionsOk = await emailHandler.verifyConnections();
        
        if (connectionsOk) {
          console.log('✅ Email services ready\n');
          
          // Schedule email checking
          console.log(`⏰ Email check scheduled: ${emailCheckInterval}`);
          cron.schedule(emailCheckInterval, async () => {
            console.log('\n⏰ Running scheduled email check...');
            await emailHandler.processUnreadEmails();
          });

          // Run initial check
          console.log('🚀 Running initial email check...');
          await emailHandler.processUnreadEmails();
        } else {
          console.log('❌ Email service connections failed. Email monitoring disabled.\n');
        }
      } else {
        console.log('⚠️  Email monitoring not configured. See README for setup instructions.\n');
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

