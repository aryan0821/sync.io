/**
 * Memory Service for Conversation History
 * Stores and retrieves conversation context for better continuity
 */

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  threadId: string; // Slack thread_ts or channel+user combo
  messages: ConversationMessage[];
  lastUpdated: number;
  metadata?: {
    channel?: string;
    user?: string;
    context?: any; // Store relevant context (issues discussed, etc.)
  };
}

export class MemoryService {
  private conversations: Map<string, Conversation>;
  private maxMessagesPerConversation: number;
  private maxConversationAge: number; // in milliseconds (default: 24 hours)

  constructor(
    maxMessagesPerConversation: number = 20,
    maxConversationAge: number = 24 * 60 * 60 * 1000 // 24 hours
  ) {
    this.conversations = new Map();
    this.maxMessagesPerConversation = maxMessagesPerConversation;
    this.maxConversationAge = maxConversationAge;
  }

  /**
   * Get or create a conversation thread
   */
  private getOrCreateConversation(threadId: string): Conversation {
    const existing = this.conversations.get(threadId);
    
    // Check if conversation is too old
    if (existing && Date.now() - existing.lastUpdated > this.maxConversationAge) {
      this.conversations.delete(threadId);
    }
    
    if (!this.conversations.has(threadId)) {
      this.conversations.set(threadId, {
        threadId,
        messages: [],
        lastUpdated: Date.now(),
      });
    }
    
    return this.conversations.get(threadId)!;
  }

  /**
   * Add a message to conversation history
   */
  addMessage(
    threadId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: { channel?: string; user?: string; context?: any }
  ): void {
    const conversation = this.getOrCreateConversation(threadId);
    
    // Update metadata if provided
    if (metadata) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
    }
    
    // Add message
    conversation.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });
    
    // Keep only the most recent messages
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
    }
    
    conversation.lastUpdated = Date.now();
    
    console.log(`💾 [Memory] Added ${role} message to conversation ${threadId} (${conversation.messages.length} messages)`);
  }

  /**
   * Get conversation history
   */
  getConversationHistory(threadId: string, maxMessages: number = 10): ConversationMessage[] {
    const conversation = this.conversations.get(threadId);
    if (!conversation) {
      return [];
    }
    
    // Return the most recent messages
    return conversation.messages.slice(-maxMessages);
  }

  /**
   * Get conversation context (metadata)
   */
  getConversationContext(threadId: string): any {
    const conversation = this.conversations.get(threadId);
    return conversation?.metadata?.context || {};
  }

  /**
   * Update conversation context
   */
  updateConversationContext(threadId: string, context: any): void {
    const conversation = this.getOrCreateConversation(threadId);
    if (!conversation.metadata) {
      conversation.metadata = {};
    }
    conversation.metadata.context = { ...conversation.metadata.context, ...context };
    conversation.lastUpdated = Date.now();
  }

  /**
   * Clear conversation history
   */
  clearConversation(threadId: string): void {
    this.conversations.delete(threadId);
    console.log(`🗑️  [Memory] Cleared conversation ${threadId}`);
  }

  /**
   * Get all active conversations (for debugging)
   */
  getActiveConversations(): string[] {
    const now = Date.now();
    return Array.from(this.conversations.entries())
      .filter(([_, conv]) => now - conv.lastUpdated < this.maxConversationAge)
      .map(([threadId, _]) => threadId);
  }

  /**
   * Clean up old conversations
   */
  cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [threadId, conversation] of this.conversations.entries()) {
      if (now - conversation.lastUpdated > this.maxConversationAge) {
        this.conversations.delete(threadId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [Memory] Cleaned up ${cleaned} old conversations`);
    }
  }
}

