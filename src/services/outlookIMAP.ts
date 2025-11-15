import Imap from 'imap';
import { simpleParser } from 'mailparser';

export interface OutlookEmail {
  id: string;
  subject: string;
  from: string;
  body: string;
  receivedDateTime: string;
  toRecipients: string[];
  ccRecipients: string[];
  hasAttachments: boolean;
}

export class OutlookIMAPService {
  private imap: Imap;
  private isReady: boolean = false;

  constructor(
    private email: string,
    private password: string
  ) {
    this.imap = new Imap({
      user: email,
      password: password,
      host: 'outlook.office365.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    });
  }

  /**
   * Connect to IMAP server
   */
  private async connect(): Promise<void> {
    if (this.isReady) return;

    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        this.isReady = true;
        resolve();
      });

      this.imap.once('error', (err: Error) => {
        reject(err);
      });

      this.imap.connect();
    });
  }

  /**
   * Get unread emails from inbox
   */
  async getUnreadEmails(limit: number = 10): Promise<OutlookEmail[]> {
    try {
      await this.connect();

      return new Promise((resolve, reject) => {
        this.imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(err);
            return;
          }

          // Search for unread emails
          this.imap.search(['UNSEEN'], (err, results) => {
            if (err) {
              reject(err);
              return;
            }

            if (!results || results.length === 0) {
              resolve([]);
              return;
            }

            // Limit results
            const uids = results.slice(0, limit);
            const emails: OutlookEmail[] = [];

            const fetch = this.imap.fetch(uids, {
              bodies: '',
              struct: true
            });

            fetch.on('message', (msg, seqno) => {
              let buffer = '';

              msg.on('body', (stream) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
              });

              msg.once('end', async () => {
                try {
                  const parsed = await simpleParser(buffer);
                  
                  // Extract email addresses safely
                  const getEmailAddress = (addressObj: any): string => {
                    if (!addressObj) return 'Unknown';
                    if (Array.isArray(addressObj.value)) {
                      return addressObj.value[0]?.address || 'Unknown';
                    }
                    if (addressObj.value) {
                      return addressObj.value.address || 'Unknown';
                    }
                    return 'Unknown';
                  };
                  
                  const getEmailAddresses = (addressObj: any): string[] => {
                    if (!addressObj || !addressObj.value) return [];
                    if (Array.isArray(addressObj.value)) {
                      return addressObj.value.map((a: any) => a.address).filter(Boolean);
                    }
                    return [addressObj.value.address].filter(Boolean);
                  };
                  
                  emails.push({
                    id: `${seqno}`,
                    subject: parsed.subject || '(No Subject)',
                    from: getEmailAddress(parsed.from),
                    body: parsed.text || parsed.html || '',
                    receivedDateTime: parsed.date?.toISOString() || new Date().toISOString(),
                    toRecipients: getEmailAddresses(parsed.to),
                    ccRecipients: getEmailAddresses(parsed.cc),
                    hasAttachments: (parsed.attachments?.length || 0) > 0
                  });
                } catch (parseError) {
                  console.error('Error parsing email:', parseError);
                }
              });
            });

            fetch.once('error', (err) => {
              reject(err);
            });

            fetch.once('end', () => {
              resolve(emails);
            });
          });
        });
      });
    } catch (error) {
      console.error('Error fetching unread emails:', error);
      return [];
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(emailId: string): Promise<boolean> {
    try {
      await this.connect();

      return new Promise((resolve, reject) => {
        this.imap.openBox('INBOX', false, (err) => {
          if (err) {
            reject(err);
            return;
          }

          this.imap.addFlags([parseInt(emailId)], ['\\Seen'], (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(true);
          });
        });
      });
    } catch (error) {
      console.error(`Error marking email ${emailId} as read:`, error);
      return false;
    }
  }

  /**
   * Disconnect from IMAP server
   */
  disconnect(): void {
    if (this.imap) {
      this.imap.end();
      this.isReady = false;
    }
  }
}

