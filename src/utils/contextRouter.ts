/**
 * Context Router
 * Intelligently routes questions to the appropriate context source:
 * - Document queries (document-queries.json)
 * - User context (beatriz-standup-notes.json, etc.)
 * - GitHub API
 * - Linear API
 * - Or combinations of the above
 */

import { DocumentQueryService } from '../services/documentQueryService';
import { UserContextService } from '../services/userContextService';

export interface RoutingDecision {
  source: 'document_query' | 'user_context' | 'github' | 'linear' | 'both' | 'hybrid';
  confidence: number;
  reason: string;
  contextData?: {
    documentQueries?: any[];
    userContext?: any;
  };
  shouldSkipGitHub?: boolean;
  shouldSkipLinear?: boolean;
}

export class ContextRouter {
  private documentQueryService: DocumentQueryService;
  private userContextService: UserContextService;

  constructor(
    documentQueryService: DocumentQueryService,
    userContextService: UserContextService
  ) {
    this.documentQueryService = documentQueryService;
    this.userContextService = userContextService;
  }

  /**
   * Route a question to the appropriate context source(s)
   */
  routeQuestion(question: string): RoutingDecision {
    const lowerQuestion = question.toLowerCase().trim();

    // Priority 1: Check for document queries
    const documentQueries = this.documentQueryService.findMatchingQueries(question);
    if (documentQueries.length > 0) {
      // Check if this is a pure document query (high confidence)
      const isPureDocumentQuery = this.isPureDocumentQuery(lowerQuestion, documentQueries);
      if (isPureDocumentQuery) {
        return {
          source: 'document_query',
          confidence: 0.95,
          reason: `Document query detected: "${documentQueries[0].pattern}"`,
          contextData: { documentQueries },
          shouldSkipGitHub: true,
          shouldSkipLinear: true,
        };
      }
    }

    // Priority 2: Check for user context (Beatriz, etc.)
    const userContext = this.findUserContext(question);
    if (userContext) {
      const isWorkStatus = this.isWorkStatusQuery(lowerQuestion);
      const isPureUserQuery = this.isPureUserQuery(lowerQuestion);
      
      // For work status queries, use hybrid (user context + GitHub/Linear)
      if (isWorkStatus) {
        return {
          source: 'hybrid',
          confidence: 0.85,
          reason: `User context found for ${userContext.name}, but work status query may benefit from GitHub/Linear issues`,
          contextData: { userContext },
          shouldSkipGitHub: false,
          shouldSkipLinear: false,
        };
      }
      
      // For pure user queries (implementation, approach), use only JSON
      if (isPureUserQuery) {
        return {
          source: 'user_context',
          confidence: 0.95,
          reason: `User context detected for: ${userContext.name}`,
          contextData: { userContext },
          shouldSkipGitHub: true,
          shouldSkipLinear: true,
        };
      }
      
      // Default: use user context but allow GitHub/Linear for additional info
      return {
        source: 'hybrid',
        confidence: 0.8,
        reason: `User context found for ${userContext.name}, allowing GitHub/Linear for additional context`,
        contextData: { userContext },
        shouldSkipGitHub: false,
        shouldSkipLinear: false,
      };
    }

    // Priority 3: Check for explicit GitHub/Linear mentions
    if (lowerQuestion.includes('github') || lowerQuestion.includes('repo') || lowerQuestion.includes('repository')) {
      if (lowerQuestion.includes('linear')) {
        return {
          source: 'both',
          confidence: 0.9,
          reason: 'Both GitHub and Linear explicitly mentioned',
          shouldSkipGitHub: false,
          shouldSkipLinear: false,
        };
      }
      return {
        source: 'github',
        confidence: 0.9,
        reason: 'GitHub/repository explicitly mentioned',
        shouldSkipGitHub: false,
        shouldSkipLinear: true,
      };
    }

    if (lowerQuestion.includes('linear')) {
      return {
        source: 'linear',
        confidence: 0.9,
        reason: 'Linear explicitly mentioned',
        shouldSkipGitHub: true,
        shouldSkipLinear: false,
      };
    }

    // Priority 4: Hybrid - document query + GitHub/Linear for additional context
    if (documentQueries.length > 0) {
      // If document query but question might benefit from GitHub/Linear context
      const needsAdditionalContext = this.needsAdditionalContext(lowerQuestion);
      if (needsAdditionalContext) {
        return {
          source: 'hybrid',
          confidence: 0.8,
          reason: `Document query found, but question may benefit from GitHub/Linear context`,
          contextData: { documentQueries },
          shouldSkipGitHub: false,
          shouldSkipLinear: false,
        };
      }
    }

    // Priority 5: Hybrid - user context + GitHub/Linear for work status
    if (userContext) {
      // If asking about user's work, might want GitHub/Linear issues too
      if (this.isWorkStatusQuery(lowerQuestion)) {
        return {
          source: 'hybrid',
          confidence: 0.8,
          reason: `User context found, but work status query may benefit from GitHub/Linear issues`,
          contextData: { userContext },
          shouldSkipGitHub: false,
          shouldSkipLinear: false,
        };
      }
    }

    // Default: Use both GitHub and Linear for general questions
    return {
      source: 'both',
      confidence: 0.5,
      reason: 'No specific context detected, defaulting to GitHub and Linear',
      shouldSkipGitHub: false,
      shouldSkipLinear: false,
    };
  }

  /**
   * Check if this is a pure document query (should skip GitHub/Linear)
   */
  private isPureDocumentQuery(question: string, queries: any[]): boolean {
    // Document query patterns that should be pure
    const pureDocumentPatterns = [
      'roadmap',
      'handbook',
      'policy',
      'pto',
      'paid time off',
      'vacation',
      'documents about',
      'show me documents',
      'find documents',
      'what does the',
      'what is the',
    ];

    const hasPurePattern = pureDocumentPatterns.some(pattern => question.includes(pattern));
    
    // If question explicitly mentions GitHub/Linear, it's not pure
    const hasGitHubLinear = question.includes('github') || question.includes('linear') || question.includes('repo');
    
    return hasPurePattern && !hasGitHubLinear;
  }

  /**
   * Check if this is a pure user context query (should skip GitHub/Linear)
   */
  private isPureUserQuery(question: string): boolean {
    // User context patterns that should be pure (implementation/approach questions)
    const pureUserPatterns = [
      'how is',
      'how does',
      'how exactly',
      'implementation',
      'approach',
      'solving',
      'method',
      'strategy',
    ];

    const hasPurePattern = pureUserPatterns.some(pattern => question.includes(pattern));
    
    // If question explicitly mentions GitHub/Linear, it's not pure
    const hasGitHubLinear = question.includes('github') || question.includes('linear') || question.includes('repo');
    
    // If asking about work status ("what is X working on"), it's NOT pure - use hybrid
    const isWorkStatus = this.isWorkStatusQuery(question);
    
    // Pure queries are about HOW/WHAT (implementation), not WHERE (work status)
    return hasPurePattern && !hasGitHubLinear && !isWorkStatus;
  }

  /**
   * Check if this is a work status query (might benefit from GitHub/Linear)
   */
  private isWorkStatusQuery(question: string): boolean {
    const workStatusPatterns = [
      'what(?:\'s|s| is).*working on',
      'what.*working on',
      'current tasks',
      'assigned to',
      'issues assigned',
      'recent commits',
      'current work',
      '.*working on',
    ];

    return workStatusPatterns.some(pattern => {
      const regex = new RegExp(pattern, 'i');
      return regex.test(question);
    });
  }

  /**
   * Check if document query needs additional GitHub/Linear context
   */
  private needsAdditionalContext(question: string): boolean {
    // Questions that might benefit from additional context
    const needsContextPatterns = [
      'related to',
      'connected to',
      'associated with',
      'also',
      'and',
      'plus',
    ];

    return needsContextPatterns.some(pattern => question.includes(pattern));
  }

  /**
   * Find user context for a question
   */
  private findUserContext(question: string): any {
    const lowerQuestion = question.toLowerCase();
    
    // Check for Beatriz specifically - expanded patterns
    const beatrizPatterns = [
      'beatriz',
      'how is beatriz',
      'what is beatriz',
      'what\'s beatriz',
      'whats beatriz',
      'beatriz solving',
      'beatriz implementation',
      'beatriz approach',
      'beatriz working',
      'what.*beatriz.*working',
      'beatriz.*working on',
    ];

    const isBeatriz = beatrizPatterns.some(pattern => {
      if (pattern.includes('.*')) {
        // Regex pattern
        const regex = new RegExp(pattern, 'i');
        return regex.test(lowerQuestion);
      }
      return lowerQuestion.includes(pattern);
    });
    
    if (isBeatriz) {
      const context = this.userContextService.getUserContext('beatriz');
      if (context) {
        console.log(`✅ [ContextRouter] Found Beatriz context`);
        return context;
      }
    }

    // Try to extract user name from question patterns - expanded
    const userPatterns = [
      /(?:how|what|what's|whats).*(?:is|are|does|did).*(\w+).*(?:implementing|solving|working|doing|building|creating|developing|approach)/i,
      /(\w+).*(?:is|are|does|did).*(?:implementing|solving|working|doing|building|creating|developing)/i,
      /(?:how|what|what's|whats).*(\w+).*(?:implementation|solution|approach|method)/i,
      /what(?:'s|s| is) (\w+) working on/i,
      /what(?:'s|s| is) (\w+) doing/i,
      /(\w+).*working on/i,
    ];

    for (const pattern of userPatterns) {
      const match = question.match(pattern);
      if (match && match[1]) {
        const userName = match[1].toLowerCase();
        // Skip common words
        if (!['the', 'this', 'that', 'these', 'those', 'exactly', 'currently', 'github', 'linear', 'repo', 'what', 'whats', 'what\'s'].includes(userName)) {
          const context = this.userContextService.getUserContext(userName);
          if (context) {
            console.log(`✅ [ContextRouter] Found user context for: ${userName}`);
            return context;
          }
        }
      }
    }

    return null;
  }
}

