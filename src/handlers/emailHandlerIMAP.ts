import { OutlookIMAPService } from '../services/outlookIMAP';
import { ClaudeService } from '../services/claude';
import { EmailForwarder } from '../services/emailForwarder';

export class EmailHandlerIMAP {
  private outlookService: OutlookIMAPService;
  private claudeService: ClaudeService;
  private emailForwarder: EmailForwarder;
  private slackEmail: string;
  private confidenceThreshold: number;
  private processedEmails: Set<string> = new Set();

  constructor(
    outlookEmail: string,
    outlookPassword: string,
    claudeApiKey: string | undefined,
    smtpHost: string,
    smtpPort: number,
    smtpUser: string,
    smtpPass: string,
    fromEmail: string,
    slackEmail: string,
    confidenceThreshold: number = 0.6
  ) {
    this.outlookService = new OutlookIMAPService(outlookEmail, outlookPassword);
    this.claudeService = new ClaudeService(claudeApiKey);
    this.emailForwarder = new EmailForwarder(
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      fromEmail
    );
    this.slackEmail = slackEmail;
    this.confidenceThreshold = confidenceThreshold;
  }

  /**
   * Process unread emails: analyze and forward relevant ones
   */
  async processUnreadEmails(): Promise<void> {
    try {
      console.log('🔍 Checking for unread emails...');
      
      const emails = await this.outlookService.getUnreadEmails(20);
      
      if (emails.length === 0) {
        console.log('   No unread emails found');
        return;
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

        // Forward if relevant and confidence is above threshold
        if (analysis.isRelevant && analysis.confidence >= this.confidenceThreshold) {
          console.log(`   📤 Forwarding to Slack...`);
          
          const forwarded = await this.emailForwarder.forwardToSlack(
            email,
            this.slackEmail,
            analysis.reasoning
          );

          if (forwarded) {
            console.log(`   ✅ Successfully forwarded`);
            // Mark as read in Outlook
            await this.outlookService.markAsRead(email.id);
          } else {
            console.log(`   ❌ Failed to forward`);
          }
        } else if (analysis.isRelevant) {
          console.log(`   ⚠️  Relevant but confidence too low (${(analysis.confidence * 100).toFixed(1)}% < ${(this.confidenceThreshold * 100)}%)`);
          // Mark as read anyway to avoid reprocessing
          await this.outlookService.markAsRead(email.id);
        } else {
          console.log(`   ⏭️  Not relevant - skipping`);
          // Mark as read to avoid reprocessing
          await this.outlookService.markAsRead(email.id);
        }
      }

      console.log('\n✅ Email processing complete\n');
    } catch (error) {
      console.error('Error processing emails:', error);
    }
  }

  /**
   * Verify all connections (SMTP)
   */
  async verifyConnections(): Promise<boolean> {
    console.log('🔧 Verifying connections...');
    
    // Test SMTP
    const smtpOk = await this.emailForwarder.verifyConnection();
    
    // Test IMAP (try to fetch 1 email)
    try {
      await this.outlookService.getUnreadEmails(1);
      console.log('✅ Outlook IMAP connection verified');
      return smtpOk;
    } catch (error) {
      console.error('❌ Outlook IMAP connection failed:', error);
      console.error('💡 Make sure IMAP is enabled in your Outlook settings');
      return false;
    }
  }

  /**
   * Clear processed emails cache (useful for testing)
   */
  clearCache(): void {
    this.processedEmails.clear();
    console.log('🗑️  Processed emails cache cleared');
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    this.outlookService.disconnect();
  }
}

