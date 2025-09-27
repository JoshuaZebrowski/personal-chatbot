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
            // Create a new session for this browser session
            await this.startNewSession();
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
        this.currentSession = new ChatSession();
        await this.saveCurrentSession();
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

        const chatMessage = this.currentSession.addMessage(message);
        await this.saveCurrentSession();
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
        if (this.currentSession) {
            await this.saveCurrentSession();
        }

        this.storageProvider = newProvider;
        
        // Could implement migration logic here if needed
        console.log('Storage provider switched');
    }
}