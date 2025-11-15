import express from 'express';
import { GitHubWebhookService } from './services/githubWebhook';
import { GitHubService } from './services/github';
import { App } from '@slack/bolt';
import * as dotenv from 'dotenv';

dotenv.config();

export function setupWebhookServer(
  slackApp: App,
  githubService: GitHubService,
  slackUserId: string,
  githubUsername: string
): express.Application {
  const app = express();
  const webhookService = new GitHubWebhookService(slackApp, githubService, slackUserId);

  // Middleware to parse JSON
  app.use(express.json());

  // GitHub webhook endpoint
  app.post('/webhook/github', async (req, res) => {
    try {
      const event = req.body;
      const eventType = req.headers['x-github-event'] as string;

      console.log(`📥 Received GitHub event: ${eventType}`);

      // Handle different event types
      if (eventType === 'issues') {
        await webhookService.handleWebhookEvent(event, githubUsername);
      } else if (eventType === 'pull_request') {
        await webhookService.handleWebhookEvent(event, githubUsername);
      } else if (eventType === 'issue_comment') {
        await webhookService.handleWebhookEvent(event, githubUsername);
      } else if (eventType === 'pull_request_review_comment') {
        await webhookService.handleWebhookEvent(event, githubUsername);
      }

      res.status(200).send('OK');
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).send('Error processing webhook');
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
  });

  return app;
}

