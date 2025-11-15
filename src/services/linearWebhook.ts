/**
 * Linear Webhook Service - Handles Linear webhook events and sends Slack notifications
 */

import { App } from '@slack/bolt';
import { LinearService } from './linear';

export interface LinearWebhookEvent {
  action: string;
  type: string;
  createdAt: string;
  data: {
    id?: string;
    identifier?: string;
    title?: string;
    description?: string;
    state?: {
      name: string;
      type: string;
    };
    assignee?: {
      name: string;
      email: string;
    };
    team?: {
      name: string;
      key: string;
    };
    url?: string;
    comment?: {
      body: string;
      user?: {
        name: string;
        email: string;
      };
    };
    user?: {
      name: string;
      email: string;
    };
  };
  url?: string;
}

export class LinearWebhookService {
  private slackApp: App;
  private linearService: LinearService;
  private slackUserId: string;
  private linearUserEmail: string;

  constructor(
    slackApp: App,
    linearService: LinearService,
    slackUserId: string,
    linearUserEmail: string
  ) {
    this.slackApp = slackApp;
    this.linearService = linearService;
    this.slackUserId = slackUserId;
    this.linearUserEmail = linearUserEmail;
  }

  /**
   * Handle Linear webhook event
   */
  async handleWebhookEvent(event: LinearWebhookEvent): Promise<void> {
    try {
      console.log(`📥 Processing Linear webhook: ${event.type} - ${event.action}`);

      // Check if event is relevant to the user
      const isRelevant = await this.checkIfRelevant(event);
      if (!isRelevant) {
        console.log('⏭️  Event not relevant to user, skipping');
        return;
      }

      // Send notification
      await this.sendSlackNotification(event);
    } catch (error: any) {
      console.error('❌ Error handling Linear webhook event:', error);
    }
  }

  /**
   * Check if the event is relevant to the user
   */
  private async checkIfRelevant(event: LinearWebhookEvent): Promise<boolean> {
    const data = event.data;

    // Check if user is assigned
    if (data.assignee?.email?.toLowerCase() === this.linearUserEmail.toLowerCase()) {
      return true;
    }

    // Check if user is mentioned in comment
    if (event.type === 'Issue' && event.action === 'comment') {
      const commentBody = data.comment?.body || '';
      // Simple mention detection (could be enhanced)
      if (commentBody.toLowerCase().includes(this.linearUserEmail.split('@')[0].toLowerCase())) {
        return true;
      }
    }

    // Check if user created the event (optional - you might want to skip your own actions)
    if (data.user?.email?.toLowerCase() === this.linearUserEmail.toLowerCase()) {
      // Skip notifications for own actions (optional)
      return false;
    }

    // For now, notify on all issue updates (can be made more selective)
    if (event.type === 'Issue' && ['create', 'update', 'remove'].includes(event.action)) {
      return true;
    }

    return false;
  }

  /**
   * Send Slack notification for Linear event
   */
  private async sendSlackNotification(event: LinearWebhookEvent): Promise<void> {
    const data = event.data;
    let message = '';
    let emoji = '🔔';

    // Determine message based on event type and action
    switch (event.type) {
      case 'Issue':
        switch (event.action) {
          case 'create':
            emoji = '✨';
            message = `${emoji} *New Linear issue created*`;
            if (data.assignee?.email?.toLowerCase() === this.linearUserEmail.toLowerCase()) {
              message = `${emoji} *You've been assigned* to a new Linear issue`;
            }
            break;
          case 'update':
            emoji = '📝';
            message = `${emoji} *Linear issue updated*`;
            if (data.assignee?.email?.toLowerCase() === this.linearUserEmail.toLowerCase()) {
              message = `${emoji} *Your assigned Linear issue was updated*`;
            }
            break;
          case 'remove':
            emoji = '🗑️';
            message = `${emoji} *Linear issue removed*`;
            break;
          case 'comment':
            emoji = '💬';
            message = `${emoji} *New comment* on Linear issue`;
            break;
          default:
            message = `${emoji} *Linear issue ${event.action}*`;
        }
        break;
      case 'Project':
        emoji = '📊';
        message = `${emoji} *Linear project ${event.action}*`;
        break;
      default:
        message = `${emoji} *Linear ${event.type} ${event.action}*`;
    }

    if (!message) return;

    const title = data.title || data.identifier || 'Untitled';
    const url = data.url || event.url || '';
    const identifier = data.identifier || '';
    const state = data.state?.name || '';
    const team = data.team?.name || '';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${message}\n\n*Issue${identifier ? ` ${identifier}` : ''}:* ${title}\n${team ? `*Team:* ${team}\n` : ''}${state ? `*State:* ${state}\n` : ''}${url ? `<${url}|View in Linear>` : ''}`
        }
      }
    ];

    // Add comment preview if available
    if (data.comment?.body) {
      const commentPreview = data.comment.body.substring(0, 200);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Comment:*\n${commentPreview}${data.comment.body.length > 200 ? '...' : ''}`
        }
      });
    }

    try {
      await this.slackApp.client.chat.postMessage({
        channel: this.slackUserId,
        text: message,
        blocks: blocks,
      });
      console.log(`✅ Sent Linear notification to ${this.slackUserId}`);
    } catch (error: any) {
      console.error('❌ Error sending Slack notification:', error);
    }
  }
}

