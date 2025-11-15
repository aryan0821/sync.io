import { OutlookService } from '../services/outlook';
import { ClaudeService } from '../services/claude';
import { EmailForwarderGraph } from '../services/emailForwarderGraph';

export class EmailHandler {
  private outlookService: OutlookService;
  private claudeService: ClaudeService;
  private emailSender: EmailForwarderGraph;
  private slackApp: any;
  private slackChannel: string;
  private confidenceThreshold: number;
  private processedEmails: Set<string> = new Set();

  constructor(
    outlookClientId: string,
    outlookClientSecret: string,
    outlookTenantId: string,
    outlookUserEmail: string,
    claudeApiKey: string | undefined,
    slackApp: any,
    slackChannel: string,
    confidenceThreshold: number = 0.6
  ) {
    this.outlookService = new OutlookService(
      outlookClientId,
      outlookClientSecret,
      outlookTenantId,
      outlookUserEmail
    );
    this.claudeService = new ClaudeService(claudeApiKey);
    this.emailSender = new EmailForwarderGraph(
      outlookClientId,
      outlookClientSecret,
      outlookTenantId,
      outlookUserEmail
    );
    this.slackApp = slackApp;
    this.slackChannel = slackChannel;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Process unread emails: analyze and forward relevant ones
   */
  async processUnreadEmails(): Promise<{ total: number, forwarded: number, emails: any[] }> {
    const results: any[] = [];
    let forwardedCount = 0;
    
    try {
      console.log('🔍 Checking for unread emails...');
      
      const emails = await this.outlookService.getUnreadEmails(20);
      
      if (emails.length === 0) {
        console.log('   No unread emails found');
        return { total: 0, forwarded: 0, emails: [] };
      }

      console.log(`   Found ${emails.length} unread email(s)`);

      for (const email of emails) {
        // Skip if already processed in this session
        if (this.processedEmails.has(email.id)) {
          continue;
        }

        // Mark as processed
        this.processedEmails.add(email.id);

        console.log(`\n📧 Processing: "${email.subject}" from ${email.from}`);

        // Get body preview (first 500 chars for analysis)
        const bodyPreview = email.body.substring(0, 500);

        // Analyze relevance with Claude
        const analysis = await this.claudeService.analyzeEmailRelevance(
          email.subject,
          email.from,
          bodyPreview
        );

        console.log(`   🤖 Analysis:`);
        console.log(`      Relevant: ${analysis.isRelevant}`);
        console.log(`      Confidence: ${(analysis.confidence * 100).toFixed(1)}%`);
        console.log(`      Reasoning: ${analysis.reasoning}`);
        if (analysis.category) {
          console.log(`      Category: ${analysis.category}`);
        }

        // Store result
        const result = {
          subject: email.subject,
          from: email.from,
          relevant: analysis.isRelevant,
          confidence: analysis.confidence,
          forwarded: false,
          reason: ''
        };

        // Forward if relevant and confidence is above threshold
        if (analysis.isRelevant && analysis.confidence >= this.confidenceThreshold) {
          console.log(`   📤 Posting to Slack...`);
          
          try {
            // Format email for Slack
            const bodyPreview = email.body.substring(0, 500).replace(/<[^>]*>/g, '').trim();
            
            await this.slackApp.client.chat.postMessage({
              channel: this.slackChannel,
              text: `📧 New Project Email: ${email.subject}`,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: '📧 Project Management Email',
                    emoji: true
                  }
                },
                {
                  type: 'section',
                  fields: [
                    {
                      type: 'mrkdwn',
                      text: `*Subject:*\n${email.subject}`
                    },
                    {
                      type: 'mrkdwn',
                      text: `*From:*\n${email.from}`
                    }
                  ]
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*🤖 AI Analysis:*\n${analysis.reasoning}\n*Category:* ${analysis.category || 'general'} | *Confidence:* ${(analysis.confidence * 100).toFixed(0)}%`
                  }
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*Preview:*\n${bodyPreview}${email.body.length > 500 ? '...' : ''}`
                  }
                },
                {
                  type: 'context',
                  elements: [
                    {
                      type: 'mrkdwn',
                      text: `Received: ${new Date(email.receivedDateTime).toLocaleString()}`
                    }
                  ]
                }
              ]
            });

            console.log(`   ✅ Successfully posted to Slack`);
            result.forwarded = true;
            result.reason = 'Posted to Slack';
            forwardedCount++;
            // Mark as read in Outlook
            await this.outlookService.markAsRead(email.id);
          } catch (slackError) {
            console.error(`   ❌ Failed to post to Slack:`, slackError);
            result.reason = 'Failed to post to Slack';
          }
        } else if (analysis.isRelevant) {
          console.log(`   ⚠️  Relevant but confidence too low (${(analysis.confidence * 100).toFixed(1)}% < ${(this.confidenceThreshold * 100)}%)`);
          result.reason = `Low confidence (${(analysis.confidence * 100).toFixed(0)}%)`;
          // Mark as read anyway to avoid reprocessing
          await this.outlookService.markAsRead(email.id);
        } else {
          console.log(`   ⏭️  Not relevant - skipping`);
          result.reason = 'Not project-related';
          // Mark as read to avoid reprocessing
          await this.outlookService.markAsRead(email.id);
        }

        results.push(result);
      }

      console.log('\n✅ Email processing complete\n');
      return { total: emails.length, forwarded: forwardedCount, emails: results };
    } catch (error) {
      console.error('Error processing emails:', error);
      return { total: 0, forwarded: 0, emails: [] };
    }
  }

  /**
   * Verify all connections (Outlook, Slack)
   */
  async verifyConnections(): Promise<boolean> {
    console.log('🔧 Verifying connections...');
    
    // Test Slack
    try {
      await this.slackApp.client.auth.test();
      console.log('✅ Slack connection verified');
    } catch (error) {
      console.error('❌ Slack connection failed:', error);
      return false;
    }
    
    // Test Outlook (try to fetch 1 email)
    try {
      await this.outlookService.getUnreadEmails(1);
      console.log('✅ Outlook connection verified (for reading)');
      return true;
    } catch (error) {
      console.error('❌ Outlook connection failed:', error);
      return false;
    }
  }

  /**
   * Send an email
   */
  async sendEmail(toEmail: string, subject: string, body: string): Promise<boolean> {
    return await this.emailSender.sendEmail(toEmail, subject, body);
  }

  /**
   * Clear processed emails cache (useful for testing)
   */
  clearCache(): void {
    this.processedEmails.clear();
    console.log('🗑️  Processed emails cache cleared');
  }
}

