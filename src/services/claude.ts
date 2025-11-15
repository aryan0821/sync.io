import Anthropic from '@anthropic-ai/sdk';

export interface EmailRelevanceResult {
  isRelevant: boolean;
  confidence: number;
  reasoning: string;
  category?: string;
}

export class ClaudeService {
  private anthropic: Anthropic | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Clean text for API safety (remove invalid Unicode, control characters)
   */
  private cleanText(text: string): string {
    if (!text) return '';
    
    return text
      // Remove null bytes and other control characters except newlines/tabs
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
      // Remove unpaired surrogates and other problematic Unicode
      .replace(/[\uD800-\uDFFF]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
      // Limit length
      .substring(0, 1000);
  }

  /**
   * Analyze if an email is relevant to project management
   */
  async analyzeEmailRelevance(
    subject: string,
    from: string,
    bodyPreview?: string
  ): Promise<EmailRelevanceResult> {
    if (!this.anthropic) {
      console.log('⚠️  No Claude API key provided, using fallback analysis');
      return this.fallbackAnalysis(subject, from, bodyPreview);
    }

    try {
      // Clean all inputs
      const cleanSubject = this.cleanText(subject);
      const cleanFrom = this.cleanText(from);
      const cleanBody = bodyPreview ? this.cleanText(bodyPreview) : '';

      const prompt = `You are an email filter for project management communications. Analyze the following email and determine if it's relevant to project management.

Email Details:
- Subject: ${cleanSubject}
- From: ${cleanFrom}
${cleanBody ? `- Body Preview: ${cleanBody}` : ''}

Project management relevant emails include:
- Task assignments, updates, or completions
- Sprint/milestone planning and reviews
- Team meetings and stand-ups
- Project status updates
- Bug reports and technical issues requiring action
- Feature requests and requirements
- Deployment notifications
- Code review requests
- Design reviews
- Resource allocation
- Timeline discussions
- Blockers and dependencies

NOT relevant emails include:
- Marketing emails
- Newsletters
- Automated system notifications (unless actionable)
- Personal emails
- Social media notifications
- Sales pitches
- General company announcements (unless project-specific)
- Spam

Respond in JSON format with:
{
  "isRelevant": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "category": "task_update" | "meeting" | "bug_report" | "feature_request" | "code_review" | "status_update" | "other" | null
}`;

      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
      });

      const content = message.content[0];
      if (content.type === 'text') {
        // Extract JSON from the response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]) as EmailRelevanceResult;
          return result;
        }
      }

      // Fallback if parsing fails
      return this.fallbackAnalysis(subject, from, bodyPreview);
    } catch (error: any) {
      if (error?.status === 401 || error?.error?.type === 'authentication_error') {
        console.error('❌ Invalid Claude API key. Using fallback analysis.');
        console.error('💡 Get a valid key from: https://console.anthropic.com/');
      } else {
        console.error('Claude API error:', error.message || error);
      }
      return this.fallbackAnalysis(subject, from, bodyPreview);
    }
  }

  /**
   * Fallback analysis using keyword matching when Claude is not available
   */
  private fallbackAnalysis(
    subject: string,
    from: string,
    bodyPreview?: string
  ): EmailRelevanceResult {
    const text = `${subject} ${from} ${bodyPreview || ''}`.toLowerCase();

    // Project management keywords
    const relevantKeywords = [
      'task', 'ticket', 'jira', 'asana', 'trello',
      'sprint', 'milestone', 'deadline',
      'meeting', 'standup', 'stand-up', 'scrum',
      'review', 'pull request', 'pr', 'merge',
      'bug', 'issue', 'error', 'fix',
      'feature', 'requirement', 'spec',
      'deploy', 'deployment', 'release',
      'blocker', 'blocked', 'dependency',
      'assigned', 'mention', '@',
      'update', 'status', 'progress',
      'github', 'gitlab', 'bitbucket',
      'project', 'epic', 'story',
    ];

    // Irrelevant keywords
    const irrelevantKeywords = [
      'unsubscribe', 'marketing', 'newsletter',
      'spam', 'advertisement', 'promotion',
      'sale', 'discount', 'offer',
      'social', 'facebook', 'twitter', 'linkedin',
      'notification', 'alert', 'reminder',
    ];

    let relevantScore = 0;
    let irrelevantScore = 0;

    for (const keyword of relevantKeywords) {
      if (text.includes(keyword)) {
        relevantScore++;
      }
    }

    for (const keyword of irrelevantKeywords) {
      if (text.includes(keyword)) {
        irrelevantScore++;
      }
    }

    const isRelevant = relevantScore > irrelevantScore && relevantScore > 0;
    const confidence = isRelevant 
      ? Math.min(0.7, 0.3 + (relevantScore * 0.1))
      : 0.3;

    // Determine category based on keywords
    let category: string | undefined;
    if (isRelevant) {
      if (text.includes('meeting') || text.includes('standup')) {
        category = 'meeting';
      } else if (text.includes('bug') || text.includes('error')) {
        category = 'bug_report';
      } else if (text.includes('review') || text.includes('pull request')) {
        category = 'code_review';
      } else if (text.includes('task') || text.includes('assigned')) {
        category = 'task_update';
      } else if (text.includes('feature') || text.includes('requirement')) {
        category = 'feature_request';
      } else {
        category = 'other';
      }
    }

    return {
      isRelevant,
      confidence,
      reasoning: isRelevant
        ? `Found ${relevantScore} project management keyword(s)`
        : 'No strong project management indicators found',
      category,
    };
  }
}

