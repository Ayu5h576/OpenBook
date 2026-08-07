import type { ChatMessage } from '../../types/ai';

interface Conversation {
  messages: ChatMessage[];
  updatedAt: number;
}

export class ConversationHistoryManager {
  private conversations = new Map<string, Conversation>();
  private readonly ttlMs = 24 * 60 * 60 * 1000;

  getConversationId(userId: string, bookId?: string, requestedId?: string) {
    return requestedId || `${userId}:${bookId ?? 'general'}`;
  }

  getMessages(conversationId: string): ChatMessage[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation || Date.now() - conversation.updatedAt > this.ttlMs) {
      this.conversations.delete(conversationId);
      return [];
    }
    return conversation.messages;
  }

  append(conversationId: string, message: Omit<ChatMessage, 'id' | 'createdAt'>) {
    const messages = this.getMessages(conversationId);
    messages.push({
      ...message,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    });
    this.conversations.set(conversationId, { messages: messages.slice(-12), updatedAt: Date.now() });
  }
}

export const conversationHistoryManager = new ConversationHistoryManager();
