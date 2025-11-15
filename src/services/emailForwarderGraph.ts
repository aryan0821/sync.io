import { Client } from '@microsoft/microsoft-graph-client';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { OutlookEmail } from './outlook';

export class EmailForwarderGraph {
  private msalClient: ConfidentialClientApplication;
  private graphClient: Client | null = null;
  private fromEmail: string;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private tenantId: string,
    fromEmail: string
  ) {
    this.fromEmail = fromEmail;
    this.msalClient = new ConfidentialClientApplication({
      auth: {
        clientId,
        clientSecret,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  /**
   * Initialize the Graph client with authentication
   */
  private async initializeGraphClient(): Promise<void> {
    if (this.graphClient) return;

    try {
      const authResult = await this.msalClient.acquireTokenByClientCredential({
        scopes: ['https://graph.microsoft.com/.default'],
      });

      if (!authResult?.accessToken) {
        throw new Error('Failed to acquire access token');
      }

      this.graphClient = Client.init({
        authProvider: (done) => {
          done(null, authResult.accessToken);
        },
      });
    } catch (error) {
      console.error('Error initializing Graph client:', error);
      throw error;
    }
  }

  /**
   * Forward an email to Slack workspace email using Microsoft Graph
   */
  async forwardToSlack(
    email: OutlookEmail,
    slackEmail: string,
    reasoning?: string
  ): Promise<boolean> {
    try {
      await this.initializeGraphClient();

      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      // Strip HTML tags for plain text version
      const plainBody = this.stripHtml(email.body);

      // Create a formatted message
      const forwardedMessage = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 FORWARDED EMAIL - PROJECT MANAGEMENT RELEVANT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Original From: ${email.from}
Original Subject: ${email.subject}
Received: ${new Date(email.receivedDateTime).toLocaleString()}
${reasoning ? `\n🤖 AI Analysis: ${reasoning}\n` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${plainBody}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This email was automatically forwarded by sync.io
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

      const message = {
        subject: `[PM] ${email.subject}`,
        body: {
          contentType: 'Text',
          content: forwardedMessage
        },
        toRecipients: [
          {
            emailAddress: {
              address: slackEmail
            }
          }
        ]
      };

      // Send email using Microsoft Graph API
      console.log(`🔧 DEBUG: Sending email via Graph API...`);
      console.log(`   From mailbox: ${this.fromEmail}`);
      console.log(`   To: ${slackEmail}`);
      console.log(`   Subject: ${message.subject}`);
      
      await this.graphClient
        .api(`/users/${this.fromEmail}/sendMail`)
        .post({
          message: message,
          saveToSentItems: false
        });

      console.log(`✅ Email forwarded to Slack via Graph API`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   From: ${email.from}`);
      console.log(`   ⚠️  NOTE: Check Slack channel configured for: ${slackEmail}`);
      
      return true;
    } catch (error) {
      console.error('Error forwarding email to Slack:', error);
      return false;
    }
  }

  /**
   * Send a new email (not forwarding)
   */
  async sendEmail(
    toEmail: string,
    subject: string,
    body: string
  ): Promise<boolean> {
    try {
      await this.initializeGraphClient();

      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      const message = {
        subject: subject,
        body: {
          contentType: 'Text',
          content: body
        },
        toRecipients: [
          {
            emailAddress: {
              address: toEmail
            }
          }
        ]
      };

      // Send email using Microsoft Graph API
      await this.graphClient
        .api(`/users/${this.fromEmail}/sendMail`)
        .post({
          message: message,
          saveToSentItems: true
        });

      console.log(`✅ Email sent to ${toEmail}`);
      console.log(`   Subject: ${subject}`);
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }

  /**
   * Verify connection by testing Graph API access
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.initializeGraphClient();
      
      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      // Test by getting user info
      await this.graphClient.api(`/users/${this.fromEmail}`).get();
      console.log('✅ Microsoft Graph connection verified (for sending)');
      return true;
    } catch (error) {
      console.error('❌ Microsoft Graph connection failed:', error);
      return false;
    }
  }

  /**
   * Strip HTML tags from content
   */
  private stripHtml(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    
    // Remove excessive whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n');
    text = text.trim();
    
    return text;
  }
}

