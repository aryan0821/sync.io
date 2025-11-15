import { ConfidentialClientApplication } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

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

export class OutlookService {
  private msalClient: ConfidentialClientApplication;
  private graphClient: Client | null = null;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private tenantId: string,
    private userEmail: string
  ) {
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
   * Get unread emails from inbox
   */
  async getUnreadEmails(limit: number = 10): Promise<OutlookEmail[]> {
    try {
      await this.initializeGraphClient();

      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      const response = await this.graphClient
        .api(`/users/${this.userEmail}/mailFolders/inbox/messages`)
        .filter('isRead eq false')
        .top(limit)
        .select(['id', 'subject', 'from', 'body', 'receivedDateTime', 'toRecipients', 'ccRecipients', 'hasAttachments'])
        .orderby('receivedDateTime DESC')
        .get();

      const emails: OutlookEmail[] = response.value.map((email: any) => ({
        id: email.id,
        subject: email.subject || '(No Subject)',
        from: email.from?.emailAddress?.address || 'Unknown',
        body: email.body?.content || '',
        receivedDateTime: email.receivedDateTime,
        toRecipients: email.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
        ccRecipients: email.ccRecipients?.map((r: any) => r.emailAddress?.address) || [],
        hasAttachments: email.hasAttachments || false,
      }));

      return emails;
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
      await this.initializeGraphClient();

      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      await this.graphClient
        .api(`/users/${this.userEmail}/messages/${emailId}`)
        .patch({
          isRead: true,
        });

      return true;
    } catch (error) {
      console.error(`Error marking email ${emailId} as read:`, error);
      return false;
    }
  }

  /**
   * Get full email details including body
   */
  async getEmailDetails(emailId: string): Promise<OutlookEmail | null> {
    try {
      await this.initializeGraphClient();

      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      const email = await this.graphClient
        .api(`/users/${this.userEmail}/messages/${emailId}`)
        .select(['id', 'subject', 'from', 'body', 'receivedDateTime', 'toRecipients', 'ccRecipients', 'hasAttachments'])
        .get();

      return {
        id: email.id,
        subject: email.subject || '(No Subject)',
        from: email.from?.emailAddress?.address || 'Unknown',
        body: email.body?.content || '',
        receivedDateTime: email.receivedDateTime,
        toRecipients: email.toRecipients?.map((r: any) => r.emailAddress?.address) || [],
        ccRecipients: email.ccRecipients?.map((r: any) => r.emailAddress?.address) || [],
        hasAttachments: email.hasAttachments || false,
      };
    } catch (error) {
      console.error(`Error getting email details for ${emailId}:`, error);
      return null;
    }
  }

  /**
   * Move email to a folder (e.g., Archive)
   */
  async moveToFolder(emailId: string, folderName: string): Promise<boolean> {
    try {
      await this.initializeGraphClient();

      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      // Get folder ID by name
      const folders = await this.graphClient
        .api(`/users/${this.userEmail}/mailFolders`)
        .filter(`displayName eq '${folderName}'`)
        .get();

      if (folders.value.length === 0) {
        console.error(`Folder '${folderName}' not found`);
        return false;
      }

      const folderId = folders.value[0].id;

      await this.graphClient
        .api(`/users/${this.userEmail}/messages/${emailId}/move`)
        .post({
          destinationId: folderId,
        });

      return true;
    } catch (error) {
      console.error(`Error moving email ${emailId} to folder ${folderName}:`, error);
      return false;
    }
  }
}

