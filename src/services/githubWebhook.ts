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

  constructor(slackApp: App, githubService: GitHubService, slackUserId: string) {
    this.slackApp = slackApp;
    this.githubService = githubService;
    this.slackUserId = slackUserId;
  }

  async handleWebhookEvent(event: GitHubEvent, githubUsername: string): Promise<void> {
    try {
      // Check if user is mentioned or assigned
      const isMentioned = await this.checkIfMentioned(event, githubUsername);
      const isAssigned = await this.checkIfAssigned(event, githubUsername);

      if (isMentioned || isAssigned) {
        await this.sendSlackNotification(event, isMentioned, isAssigned);
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

  private async sendSlackNotification(
    event: GitHubEvent,
    isMentioned: boolean,
    isAssigned: boolean
  ): Promise<void> {
    const issue = event.issue || event.pull_request;
    const comment = event.comment;
    const repo = event.repository;
    
    let message = '';
    let emoji = '🔔';
    
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
          text: `${message}\n\n*${type}${number ? ` #${number}` : ''}:* ${title}\n*Repository:* ${repo?.full_name || 'Unknown'}\n${url ? `<${url}|View on GitHub>` : ''}`
        }
      }
    ];

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

