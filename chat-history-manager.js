import { ChatSession, ChatMessage } from './chat-models.js';
import { LocalStorageProvider } from './storage-providers.js';

export class ChatHistoryManager {
    constructor(storageProvider = null) {
        this.storageProvider = storageProvider || new LocalStorageProvider();
        this.currentSession = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Create a new session for this browser session (but don't save until first message)
            this.currentSession = new ChatSession();
            this.initialized = true;
            console.log('Chat history manager initialized with session:', this.currentSession.sessionId);
        } catch (error) {
            console.error('Failed to initialize chat history manager:', error);
            // Continue without history if initialization fails
            this.currentSession = new ChatSession();
            this.initialized = true;
        }
    }

    async startNewSession() {
        // Clean up current session if it's empty
        await this.cleanupEmptySession();
        
        // Create new session but don't save until first message
        this.currentSession = new ChatSession();
        console.log('Started new session (will save on first message):', this.currentSession.sessionId);
        return this.currentSession;
    }

    async loadSession(sessionId) {
        try {
            const sessionData = await this.storageProvider.loadSession(sessionId);
            if (sessionData) {
                this.currentSession = ChatSession.fromJSON(sessionData);
                return this.currentSession;
            }
            return null;
        } catch (error) {
            console.error('Failed to load session:', error);
            return null;
        }
    }

    async cleanupEmptySession() {
        if (this.currentSession && this.currentSession.messages.length === 0) {
            // Try to delete the empty session from storage
            try {
                await this.storageProvider.deleteSession(this.currentSession.sessionId);
                console.log('Cleaned up empty session:', this.currentSession.sessionId);
            } catch (error) {
                // Session might not exist in storage yet, which is fine
                console.log('Empty session cleanup (session not in storage):', this.currentSession.sessionId);
            }
        }
    }

    async saveCurrentSession() {
        if (!this.currentSession) return false;

        try {
            await this.storageProvider.saveSession(this.currentSession);
            return true;
        } catch (error) {
            console.error('Failed to save current session:', error);
            return false;
        }
    }

    async addUserMessage(message) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.currentSession) {
            this.currentSession = new ChatSession();
        }

        const isFirstMessage = this.currentSession.messages.length === 0;
        const chatMessage = this.currentSession.addMessage(message);
        
        // Save the session (this is the first time we save if it's the first message)
        await this.saveCurrentSession();
        
        if (isFirstMessage) {
            console.log('Saved session on first user message:', this.currentSession.sessionId);
        }
        
        return chatMessage;
    }

    async addSystemResponse(response) {
        if (!this.currentSession || this.currentSession.messages.length === 0) {
            console.error('Cannot add system response without a user message');
            return null;
        }

        const updatedMessage = this.currentSession.updateLastMessage(response);
        await this.saveCurrentSession();
        return updatedMessage;
    }

    getConversationHistory() {
        if (!this.currentSession) {
            return [
                {
                    role: "system",
                    content: "You are a helpful assistant."
                }
            ];
        }

        return this.currentSession.getConversationHistory();
    }

    async listAllSessions() {
        try {
            return await this.storageProvider.listSessions();
        } catch (error) {
            console.error('Failed to list sessions:', error);
            return [];
        }
    }

    async deleteSession(sessionId) {
        try {
            await this.storageProvider.deleteSession(sessionId);
            
            // If we deleted the current session, start a new one
            if (this.currentSession && this.currentSession.sessionId === sessionId) {
                await this.startNewSession();
            }
            
            return true;
        } catch (error) {
            console.error('Failed to delete session:', error);
            return false;
        }
    }

    getCurrentSession() {
        return this.currentSession;
    }

    // Method to switch storage providers (for future Cosmos DB integration)
    async switchStorageProvider(newProvider) {
        // Save current session with old provider before switching
        if (this.currentSession && this.currentSession.messages.length > 0) {
            await this.saveCurrentSession();
        }

        this.storageProvider = newProvider;
        
        // Could implement migration logic here if needed
        console.log('Storage provider switched');
    }
}