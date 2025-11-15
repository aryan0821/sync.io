/**
 * Sync Service - Bidirectional sync between GitHub and Linear
 * Maps GitHub issues to Linear issues and vice versa
 */

import { GitHubService } from './github';
import { LinearService, LinearIssue } from './linear';

export interface SyncMapping {
  githubIssueNumber: number;
  linearIssueId: string;
  linearIssueIdentifier: string;
  syncedAt: string;
}

export class SyncService {
  private githubService: GitHubService;
  private linearService: LinearService;
  private syncMappings: Map<number, SyncMapping> = new Map(); // GitHub issue number -> Linear mapping
  private reverseMappings: Map<string, number> = new Map(); // Linear issue ID -> GitHub issue number

  constructor(githubService: GitHubService, linearService: LinearService) {
    this.githubService = githubService;
    this.linearService = linearService;
    console.log('✅ SyncService initialized');
  }

  /**
   * Sync a GitHub issue to Linear
   */
  async syncGitHubToLinear(githubIssueNumber: number, linearTeamKey: string): Promise<LinearIssue | null> {
    try {
      // Check if already synced
      const existingMapping = this.syncMappings.get(githubIssueNumber);
      if (existingMapping) {
        console.log(`ℹ️  Issue #${githubIssueNumber} already synced to ${existingMapping.linearIssueIdentifier}`);
        const existingIssue = await this.linearService.getIssueByIdentifier(existingMapping.linearIssueIdentifier);
        return existingIssue || null;
      }

      // Get GitHub issue details
      const githubIssues = await this.githubService.getOpenIssues(100);
      const githubIssue = githubIssues.find((issue: any) => issue.number === githubIssueNumber);

      if (!githubIssue) {
        console.error(`❌ GitHub issue #${githubIssueNumber} not found`);
        return null;
      }

      // Create Linear issue
      const linearIssue = await this.linearService.createIssue(
        (githubIssue as any).title,
        linearTeamKey,
        this.formatGitHubIssueBody(githubIssue),
        undefined, // assigneeId - can be enhanced to map GitHub assignees
        this.mapGitHubLabelsToPriority((githubIssue as any).labels || [])
      );

      if (!linearIssue) {
        console.error(`❌ Failed to create Linear issue for GitHub issue #${githubIssueNumber}`);
        return null;
      }

      // Store mapping
      const mapping: SyncMapping = {
        githubIssueNumber,
        linearIssueId: linearIssue.id,
        linearIssueIdentifier: linearIssue.identifier,
        syncedAt: new Date().toISOString(),
      };
      this.syncMappings.set(githubIssueNumber, mapping);
      this.reverseMappings.set(linearIssue.id, githubIssueNumber);

      console.log(`✅ Synced GitHub issue #${githubIssueNumber} to Linear ${linearIssue.identifier}`);
      return linearIssue;
    } catch (error: any) {
      console.error(`❌ Error syncing GitHub issue #${githubIssueNumber} to Linear:`, error);
      return null;
    }
  }

  /**
   * Sync a Linear issue to GitHub
   */
  async syncLinearToGitHub(linearIssueId: string): Promise<any | null> {
    try {
      // Check if already synced
      const githubIssueNumber = this.reverseMappings.get(linearIssueId);
      if (githubIssueNumber) {
        console.log(`ℹ️  Linear issue ${linearIssueId} already synced to GitHub #${githubIssueNumber}`);
        // Could update the GitHub issue here if needed
        return null;
      }

      // Get Linear issue details
      const linearIssue = await this.linearService.getIssueDetails(linearIssueId);
      if (!linearIssue) {
        console.error(`❌ Linear issue ${linearIssueId} not found`);
        return null;
      }

      // Note: GitHub API requires creating issues through their API
      // This is a simplified version - you may need to use GitHub's API directly
      // For now, we'll just log that sync would happen
      console.log(`ℹ️  Would sync Linear issue ${linearIssue.identifier} to GitHub`);
      console.log(`   Title: ${linearIssue.title}`);
      console.log(`   Description: ${linearIssue.description?.substring(0, 100)}...`);

      // TODO: Implement GitHub issue creation via Octokit
      // This requires additional GitHub API permissions and implementation

      return null;
    } catch (error: any) {
      console.error(`❌ Error syncing Linear issue ${linearIssueId} to GitHub:`, error);
      return null;
    }
  }

  /**
   * Update Linear issue when GitHub issue changes
   */
  async updateLinearFromGitHub(githubIssueNumber: number): Promise<void> {
    try {
      const mapping = this.syncMappings.get(githubIssueNumber);
      if (!mapping) {
        console.log(`ℹ️  Issue #${githubIssueNumber} not synced, skipping update`);
        return;
      }

      // Get updated GitHub issue
      const githubIssues = await this.githubService.getOpenIssues(100); // Get more issues to find the one we need
      const githubIssue = githubIssues.find((issue: any) => issue.number === githubIssueNumber);
      if (!githubIssue) {
        console.log(`⚠️  GitHub issue #${githubIssueNumber} not found`);
        return;
      }

      // Get current Linear issue
      const linearIssue = await this.linearService.getIssueDetails(mapping.linearIssueId);
      if (!linearIssue) {
        console.log(`⚠️  Linear issue ${mapping.linearIssueId} not found`);
        return;
      }

      // Map GitHub state to Linear state
      const linearState = this.mapGitHubStateToLinear((githubIssue as any).state, (githubIssue as any).labels || []);

      // Update Linear issue if needed
      if (linearState && linearState !== linearIssue.state.name) {
        await this.linearService.updateIssueStatus(mapping.linearIssueId, linearState);
        console.log(`✅ Updated Linear issue ${mapping.linearIssueIdentifier} state to ${linearState}`);
      }

      // TODO: Update title, description, assignee if changed
    } catch (error: any) {
      console.error(`❌ Error updating Linear from GitHub issue #${githubIssueNumber}:`, error);
    }
  }

  /**
   * Update GitHub issue when Linear issue changes
   */
  async updateGitHubFromLinear(linearIssueId: string): Promise<void> {
    try {
      const githubIssueNumber = this.reverseMappings.get(linearIssueId);
      if (!githubIssueNumber) {
        console.log(`ℹ️  Linear issue ${linearIssueId} not synced, skipping update`);
        return;
      }

      // Get updated Linear issue
      const linearIssue = await this.linearService.getIssueDetails(linearIssueId);
      if (!linearIssue) return;

      // TODO: Update GitHub issue via Octokit
      // This requires additional GitHub API permissions
      console.log(`ℹ️  Would update GitHub issue #${githubIssueNumber} from Linear ${linearIssue.identifier}`);
    } catch (error: any) {
      console.error(`❌ Error updating GitHub from Linear issue ${linearIssueId}:`, error);
    }
  }

  /**
   * Get sync mapping for a GitHub issue
   */
  getMappingForGitHubIssue(issueNumber: number): SyncMapping | undefined {
    return this.syncMappings.get(issueNumber);
  }

  /**
   * Get sync mapping for a Linear issue
   */
  getMappingForLinearIssue(linearIssueId: string): number | undefined {
    return this.reverseMappings.get(linearIssueId);
  }

  /**
   * Format GitHub issue body for Linear
   */
  private formatGitHubIssueBody(githubIssue: any): string {
    let body = githubIssue.body || '';
    if (githubIssue.html_url) {
      body += `\n\n---\n*Synced from GitHub: ${githubIssue.html_url}*`;
    }
    return body;
  }

  /**
   * Map GitHub labels to Linear priority
   */
  private mapGitHubLabelsToPriority(labels: any[]): number {
    // Linear priority: 0 = No priority, 1 = Urgent, 2 = High, 3 = Medium, 4 = Low
    const labelNames = labels.map(l => (typeof l === 'string' ? l : l.name).toLowerCase());
    
    if (labelNames.some(l => l.includes('urgent') || l.includes('critical'))) return 1;
    if (labelNames.some(l => l.includes('high') || l.includes('important'))) return 2;
    if (labelNames.some(l => l.includes('low') || l.includes('nice-to-have'))) return 4;
    return 3; // Default to medium
  }

  /**
   * Map GitHub issue state to Linear state
   */
  private mapGitHubStateToLinear(githubState: string, labels: any[]): string | null {
    // GitHub states: "open", "closed"
    // Linear states vary by team, common ones: "Backlog", "Todo", "In Progress", "In Review", "Done"
    
    if (githubState === 'closed') {
      return 'Done';
    }

    const labelNames = labels.map(l => (typeof l === 'string' ? l : l.name).toLowerCase());
    if (labelNames.some(l => l.includes('in-progress') || l.includes('wip'))) {
      return 'In Progress';
    }
    if (labelNames.some(l => l.includes('review'))) {
      return 'In Review';
    }

    return 'Todo'; // Default for open issues
  }
}

