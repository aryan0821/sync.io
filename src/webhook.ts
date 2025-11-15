import express from 'express';
import { GitHubWebhookService } from './services/githubWebhook';
import { LinearWebhookService } from './services/linearWebhook';
import { GitHubService } from './services/github';
import { LinearService } from './services/linear';
import { SyncService } from './services/syncService';
import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';

dotenv.config();

export interface WebhookConfig {
  slackApp: App;
  githubService: GitHubService;
  linearService?: LinearService;
  syncService?: SyncService;
  slackUserId: string;
  githubUsername: string;
  linearUserEmail?: string;
  notifyOnAllGitHubEvents?: boolean;
}

export function setupWebhookServer(config: WebhookConfig): express.Application {
  const app = express();
  const slackChannelId = process.env.SLACK_CHANNEL_ID; // Optional channel for team notifications
  const githubWebhookService = new GitHubWebhookService(
    config.slackApp,
    config.githubService,
    config.slackUserId,
    slackChannelId
  );

  let linearWebhookService: LinearWebhookService | undefined;
  if (config.linearService && config.linearUserEmail) {
    linearWebhookService = new LinearWebhookService(
      config.slackApp,
      config.linearService,
      config.slackUserId,
      config.linearUserEmail
    );
  }

  // Middleware to parse JSON
  app.use(express.json());

  // GitHub webhook endpoint
  app.post('/webhook/github', async (req, res) => {
    try {
      const event = req.body;
      const eventType = req.headers['x-github-event'] as string;

      console.log(`📥 Received GitHub event: ${eventType} - ${event.action || 'unknown'}`);

      // Handle different event types
      if (eventType === 'issues') {
        // Always notify team for issue events, plus personal notifications if configured
        await githubWebhookService.handleWebhookEvent(
          event,
          config.githubUsername,
          config.notifyOnAllGitHubEvents || false
        );

        // Sync to Linear if sync service is configured
        if (config.syncService && event.action === 'opened' && event.issue) {
          const linearTeamKey = process.env.LINEAR_DEFAULT_TEAM_KEY || '';
          if (linearTeamKey) {
            await config.syncService.syncGitHubToLinear(event.issue.number, linearTeamKey);
          }
        } else if (config.syncService && event.action === 'closed' && event.issue) {
          // Update Linear when GitHub issue is closed
          await config.syncService.updateLinearFromGitHub(event.issue.number);
        }
      } else if (eventType === 'pull_request') {
        await githubWebhookService.handleWebhookEvent(
          event,
          config.githubUsername,
          config.notifyOnAllGitHubEvents || false
        );
      } else if (eventType === 'issue_comment') {
        await githubWebhookService.handleWebhookEvent(
          event,
          config.githubUsername,
          config.notifyOnAllGitHubEvents || false
        );
      } else if (eventType === 'pull_request_review_comment') {
        await githubWebhookService.handleWebhookEvent(
          event,
          config.githubUsername,
          config.notifyOnAllGitHubEvents || false
        );
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ GitHub webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  });

  // Linear webhook endpoint
  app.post('/webhook/linear', async (req, res) => {
    try {
      if (!linearWebhookService) {
        console.log('⚠️  Linear webhook received but Linear service not configured');
        res.status(200).send('OK');
        return;
      }

      const event = req.body;
      const eventType = req.headers['x-linear-event'] as string || event.type;

      console.log(`📥 Received Linear event: ${eventType} - ${event.action || 'unknown'}`);

      // Handle Linear webhook event
      await linearWebhookService.handleWebhookEvent(event);

      // Sync to GitHub if sync service is configured
      if (config.syncService && event.type === 'Issue' && event.data?.id) {
        if (event.action === 'create') {
          // Optionally sync new Linear issues to GitHub
          // await config.syncService.syncLinearToGitHub(event.data.id);
        } else if (event.action === 'update') {
          // Update GitHub when Linear issue changes
          await config.syncService.updateGitHubFromLinear(event.data.id);
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('❌ Linear webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      services: {
        github: 'active',
        linear: linearWebhookService ? 'active' : 'inactive',
        sync: config.syncService ? 'active' : 'inactive'
      }
    });
  });

  return app;
}

