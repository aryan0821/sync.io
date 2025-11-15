/**
 * Slack formatting utilities
 * Provides helpers for formatting messages with Slack Block Kit and markdown
 */

export interface SlackBlocks {
  blocks?: any[];
  text?: string;
}

/**
 * Format work conflict check response using Slack Block Kit
 * Returns formatted blocks for professional Slack output
 */
export function formatWorkConflictCheck(conflict: {
  proposedWork: string;
  conflicts: Array<{
    user: string;
    githubIssues?: any[];
    linearIssues?: any[];
    commits?: any[];
    conflictReason: string;
  }>;
  allUsersWork?: Array<{
    username: string;
    githubIssues?: any[];
    linearIssues?: any[];
    commits?: any[];
  }>;
}): { blocks: any[]; text: string } {
  const blocks: any[] = [];
  
  // Header
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: '🔍 Work Conflict Check'
    }
  });
  
  // Proposed work section
  blocks.push({
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `*Proposed Work:*\n\`${conflict.proposedWork}\``
    }
  });
  
  blocks.push({ type: 'divider' });
  
  if (conflict.conflicts && conflict.conflicts.length > 0) {
    // Conflicts found
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:warning: *⚠️  POTENTIAL CONFLICTS FOUND ⚠️*\n\nFound *${conflict.conflicts.length}* team member(s) working on related items:`
      }
    });
    
    conflict.conflicts.forEach((conf: any, idx: number) => {
      blocks.push({ type: 'divider' });
      
      // User section
      let userText = `*${idx + 1}. ${conf.user}*\n_${conf.conflictReason}_\n`;
      
      if (conf.githubIssues && conf.githubIssues.length > 0) {
        userText += `\n*📋 GitHub Issues:*\n`;
        conf.githubIssues.forEach((issue: any) => {
          userText += `• *#${issue.number}* - ${issue.title}\n`;
          userText += `  Status: ${issue.state} | <${issue.url}|View Issue>\n`;
        });
      }
      
      if (conf.linearIssues && conf.linearIssues.length > 0) {
        userText += `\n*📋 Linear Issues:*\n`;
        conf.linearIssues.forEach((issue: any) => {
          userText += `• *${issue.identifier}* - ${issue.title}\n`;
          userText += `  Status: ${issue.state.name} | <${issue.url}|View Issue>\n`;
        });
      }
      
      if (conf.commits && conf.commits.length > 0) {
        userText += `\n*💻 Recent Commits:*\n`;
        conf.commits.slice(0, 3).forEach((commit: any) => {
          userText += `• ${commit.message}\n`;
          userText += `  📅 ${new Date(commit.date).toLocaleDateString()}\n`;
        });
      }
      
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: userText
        }
      });
    });
    
    blocks.push({ type: 'divider' });
    
    // Recommendation
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:bulb: *Recommendation:*\nConsider coordinating with the team members above before starting work on \`${conflict.proposedWork}\`. This will help avoid duplicate work and ensure better collaboration.`
      }
    });
  } else {
    // No conflicts
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `:white_check_mark: *✅ NO CONFLICTS FOUND ✅*\n\nGreat news! No one appears to be working on similar tasks.\nIt's *safe to proceed* with \`${conflict.proposedWork}\`.`
      }
    });
    
    if (conflict.allUsersWork && conflict.allUsersWork.length > 0) {
      const activeUsers = conflict.allUsersWork.filter((userWork: any) => {
        const issueCount = (userWork.githubIssues?.length || 0) + (userWork.linearIssues?.length || 0);
        return issueCount > 0;
      });
      
      if (activeUsers.length > 0) {
        blocks.push({ type: 'divider' });
        
        let teamText = `*📊 Team Activity Overview:*\n`;
        activeUsers.forEach((userWork: any) => {
          const issueCount = (userWork.githubIssues?.length || 0) + (userWork.linearIssues?.length || 0);
          teamText += `• *${userWork.username}*: ${issueCount} active issue(s)\n`;
        });
        
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: teamText
          }
        });
      }
    }
  }
  
  // Fallback text for notifications
  const text = conflict.conflicts && conflict.conflicts.length > 0
    ? `⚠️ Work Conflict Check: Found ${conflict.conflicts.length} potential conflict(s) for "${conflict.proposedWork}"`
    : `✅ Work Conflict Check: No conflicts found for "${conflict.proposedWork}"`;
  
  return { blocks, text };
}

