import nodemailer from 'nodemailer';
import { OutlookEmail } from './outlook';

export interface ForwardEmailOptions {
  email: OutlookEmail;
  slackEmail: string;
  fromEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
}

export class EmailForwarder {
  private transporter: nodemailer.Transporter;

  constructor(
    private smtpHost: string,
    private smtpPort: number,
    private smtpUser: string,
    private smtpPass: string,
    private fromEmail: string
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
      },
    });
  }

  /**
   * Forward an email to Slack workspace email
   */
  async forwardToSlack(
    email: OutlookEmail,
    slackEmail: string,
    reasoning?: string
  ): Promise<boolean> {
    try {
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

      const mailOptions = {
        from: this.fromEmail,
        to: slackEmail,
        subject: `[PM] ${email.subject}`,
        text: forwardedMessage,
        headers: {
          'X-Original-From': email.from,
          'X-Original-Date': email.receivedDateTime,
          'X-Forwarded-By': 'sync.io',
        },
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email forwarded to Slack: ${info.messageId}`);
      console.log(`   Subject: ${email.subject}`);
      console.log(`   From: ${email.from}`);
      
      return true;
    } catch (error) {
      console.error('Error forwarding email to Slack:', error);
      return false;
    }
  }

  /**
   * Verify SMTP connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error);
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

