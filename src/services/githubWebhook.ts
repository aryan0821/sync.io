import { App } from '@slack/bolt';
import { GitHubService } from './github';

export interface GitHubEvent {
  action: string;
  issue?: any;
  pull_request?: any;
  comment?: any;
  repository?: any;
  sender?: any;
  assignee?: any;
  assignees?: any[];
}

export class GitHubWebhookService {
  private slackApp: App;
  private githubService: GitHubService;
  private slackUserId: string;
  private slackChannelId?: string; // Optional channel for team notifications

  constructor(slackApp: App, githubService: GitHubService, slackUserId: string, slackChannelId?: string) {
    this.slackApp = slackApp;
    this.githubService = githubService;
    this.slackUserId = slackUserId;
    this.slackChannelId = slackChannelId;
  }

  async handleWebhookEvent(event: GitHubEvent, githubUsername: string, notifyOnAllEvents: boolean = false): Promise<void> {
    try {
      // Check if user is mentioned or assigned
      const isMentioned = await this.checkIfMentioned(event, githubUsername);
      const isAssigned = await this.checkIfAssigned(event, githubUsername);
      const isRelevant = isMentioned || isAssigned;

      // Always send team notification if channel is configured (for issue/PR events)
      if (this.slackChannelId && (event.issue || event.pull_request)) {
        await this.sendTeamNotification(event);
      }

      // Send personal notification if user is mentioned/assigned or notifyOnAllEvents is true
      if (notifyOnAllEvents || isRelevant) {
        await this.sendSlackNotification(event, isMentioned, isAssigned, notifyOnAllEvents, false);
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
    }
  }

  private async checkIfMentioned(event: GitHubEvent, githubUsername: string): Promise<boolean> {
    // Check in issue/PR body
    const body = event.issue?.body || event.pull_request?.body || event.comment?.body || '';
    const mentions = [
      `@${githubUsername}`,
      `@${githubUsername.toLowerCase()}`,
    ];
    
    return mentions.some(mention => 
      body.toLowerCase().includes(mention.toLowerCase())
    );
  }

  private async checkIfAssigned(event: GitHubEvent, githubUsername: string): Promise<boolean> {
    // Check if assigned in issue/PR
    if (event.action === 'assigned' || event.action === 'opened') {
      // Check assignee
      if (event.assignee?.login?.toLowerCase() === githubUsername.toLowerCase()) {
        return true;
      }
      
      // Check assignees array
      if (event.assignees && Array.isArray(event.assignees)) {
        return event.assignees.some(
          (assignee: any) => assignee?.login?.toLowerCase() === githubUsername.toLowerCase()
        );
      }
      
      // Check in issue/PR assignees
      const issue = event.issue || event.pull_request;
      if (issue?.assignees && Array.isArray(issue.assignees)) {
        return issue.assignees.some(
          (assignee: any) => assignee?.login?.toLowerCase() === githubUsername.toLowerCase()
        );
      }
    }

    return false;
  }

  /**
   * Send notification to team channel
   */
  private async sendTeamNotification(event: GitHubEvent): Promise<void> {
    if (!this.slackChannelId) return;

    const issue = event.issue || event.pull_request;
    if (!issue) return;

    let message = '';
    let emoji = '🔔';

    switch (event.action) {
      case 'opened':
        emoji = '✨';
        message = `${emoji} *New ${issue ? 'issue' : 'pull request'} opened*`;
        break;
      case 'closed':
        emoji = '✅';
        message = `${emoji} *${issue ? 'Issue' : 'Pull request'} closed*`;
        break;
      case 'reopened':
        emoji = '🔄';
        message = `${emoji} *${issue ? 'Issue' : 'Pull request'} reopened*`;
        break;
      case 'assigned':
        emoji = '📌';
        message = `${emoji} *${issue ? 'Issue' : 'Pull request'} assigned*`;
        break;
      default:
        message = `${emoji} *${issue ? 'Issue' : 'Pull request'} ${event.action}*`;
    }

    const title = issue.title || 'Untitled';
    const url = issue.html_url || '';
    const number = issue.number || '';
    const type = issue ? 'Issue' : event.pull_request ? 'Pull Request' : 'Unknown';
    const repo = event.repository;
    const sender = event.sender;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${message}\n\n*${type}${number ? ` #${number}` : ''}:* ${title}\n*Repository:* ${repo?.full_name || 'Unknown'}${sender ? `\n*By:* ${sender.login}` : ''}${url ? `\n<${url}|View on GitHub>` : ''}`
        }
      }
    ];

    // Add issue body preview if available
    if (issue.body) {
      const bodyPreview = issue.body.substring(0, 300);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Description:*\n${bodyPreview}${issue.body.length > 300 ? '...' : ''}`
        }
      });
    }

    try {
      await this.slackApp.client.chat.postMessage({
        channel: this.slackChannelId,
        text: message,
        blocks: blocks,
      });
      console.log(`✅ Sent team notification to channel ${this.slackChannelId}`);
    } catch (error: any) {
      console.error('❌ Error sending team notification:', error);
    }
  }

  private async sendSlackNotification(
    event: GitHubEvent,
    isMentioned: boolean,
    isAssigned: boolean,
    notifyOnAllEvents: boolean = false,
    isPersonal: boolean = true
  ): Promise<void> {
    const issue = event.issue || event.pull_request;
    const comment = event.comment;
    const repo = event.repository;
    const sender = event.sender;
    
    let message = '';
    let emoji = '🔔';
    
    // Priority: assignments > mentions > general events
    if (isAssigned && event.action === 'assigned') {
      emoji = '📌';
      message = `${emoji} *You've been assigned* to ${issue ? 'an issue' : 'a pull request'}`;
    } else if (isAssigned && event.action === 'opened') {
      emoji = '📌';
      message = `${emoji} *You've been assigned* to a new ${issue ? 'issue' : 'pull request'}`;
    } else if (isMentioned && comment) {
      emoji = '💬';
      message = `${emoji} *You've been mentioned* in a comment`;
    } else if (isMentioned) {
      emoji = '👋';
      message = `${emoji} *You've been mentioned* in ${issue ? 'an issue' : 'a pull request'}`;
    } else if (notifyOnAllEvents) {
      // General event notifications
      switch (event.action) {
        case 'opened':
          emoji = '✨';
          message = `${emoji} *New ${issue ? 'issue' : 'pull request'} opened*`;
          break;
        case 'closed':
          emoji = '✅';
          message = `${emoji} *${issue ? 'Issue' : 'Pull request'} closed*`;
          break;
        case 'reopened':
          emoji = '🔄';
          message = `${emoji} *${issue ? 'Issue' : 'Pull request'} reopened*`;
          break;
        case 'labeled':
          emoji = '🏷️';
          message = `${emoji} *Label added* to ${issue ? 'issue' : 'pull request'}`;
          break;
        case 'unlabeled':
          emoji = '🏷️';
          message = `${emoji} *Label removed* from ${issue ? 'issue' : 'pull request'}`;
          break;
        case 'synchronize':
          emoji = '🔄';
          message = `${emoji} *Pull request updated*`;
          break;
        case 'ready_for_review':
          emoji = '👀';
          message = `${emoji} *Pull request ready for review*`;
          break;
        default:
          emoji = '🔔';
          message = `${emoji} *${issue ? 'Issue' : 'Pull request'} ${event.action}*`;
      }
    }

    if (!message) return;

    const title = issue?.title || comment?.body?.substring(0, 100) || 'Untitled';
    const url = issue?.html_url || comment?.html_url || repo?.html_url || '';
    const number = issue?.number || '';
    const type = issue ? 'Issue' : event.pull_request ? 'Pull Request' : 'Comment';

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${message}\n\n*${type}${number ? ` #${number}` : ''}:* ${title}\n*Repository:* ${repo?.full_name || 'Unknown'}${sender ? `\n*By:* ${sender.login}` : ''}\n${url ? `<${url}|View on GitHub>` : ''}`
        }
      }
    ];

    // Add comment preview if available
    if (comment?.body) {
      const commentPreview = comment.body.substring(0, 200);
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Comment by ${comment.user?.login || 'Unknown'}:*\n${commentPreview}${comment.body.length > 200 ? '...' : ''}`
        }
      });
    }

    try {
      await this.slackApp.client.chat.postMessage({
        channel: this.slackUserId,
        text: message,
        blocks: blocks,
      });
      console.log(`✅ Sent notification to ${this.slackUserId}`);
    } catch (error) {
      console.error('Error sending Slack notification:', error);
    }
  }
}

