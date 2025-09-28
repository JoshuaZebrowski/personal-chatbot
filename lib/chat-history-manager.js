import { ChatSession, ChatMessage } from './chat-models.js';
import { CosmosDBProvider } from './storage-providers.js';

export class ChatHistoryManager {
    constructor(storageProvider = null) {
        this.storageProvider = storageProvider || new CosmosDBProvider();
        this.currentSession = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        try {
            // Try to restore the last active session from browser storage
            const lastSessionId = sessionStorage.getItem('chatbot_current_session_id');
            
            if (lastSessionId) {
                console.log('Attempting to restore session:', lastSessionId);
                const restoredSession = await this.loadSession(lastSessionId);
                if (restoredSession) {
                    console.log('Successfully restored session:', lastSessionId, 'with', restoredSession.messages.length, 'messages');
                    this.initialized = true;
                    return;
                }
                console.log('Could not restore session:', lastSessionId, '- starting fresh');
            }
            
            // If no session to restore, create a new one (but don't save until first message)
            this.currentSession = new ChatSession();
            sessionStorage.setItem('chatbot_current_session_id', this.currentSession.sessionId);
            this.initialized = true;
            console.log('Chat history manager initialized with new session:', this.currentSession.sessionId);
        } catch (error) {
            console.error('Failed to initialize chat history manager:', error);
            // Continue without history if initialization fails
            this.currentSession = new ChatSession();
            sessionStorage.setItem('chatbot_current_session_id', this.currentSession.sessionId);
            this.initialized = true;
        }
    }

    async startNewSession() {
        // Don't cleanup the previous session - let user manage their own sessions
        // await this.cleanupEmptySession();
        
        // Create new session but don't save until first message
        this.currentSession = new ChatSession();
        // Remember this new session ID for page reloads
        sessionStorage.setItem('chatbot_current_session_id', this.currentSession.sessionId);
        console.log('Started new session (will save on first message):', this.currentSession.sessionId);
        return this.currentSession;
    }

    async loadSession(sessionId) {
        try {
            const sessionData = await this.storageProvider.loadSession(sessionId);
            if (sessionData) {
                this.currentSession = ChatSession.fromJSON(sessionData);
                // Remember this session ID for next page load
                sessionStorage.setItem('chatbot_current_session_id', sessionId);
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
            // Only attempt cleanup if this session was never actually saved with messages
            // Check if the session exists in storage first
            try {
                const existingSession = await this.storageProvider.loadSession(this.currentSession.sessionId);
                if (existingSession && existingSession.messages && existingSession.messages.length > 0) {
                    // Session has messages in storage, don't delete it!
                    console.log('Skipping cleanup - session has messages in storage:', this.currentSession.sessionId);
                    return;
                }
                
                // Session doesn't exist in storage or is truly empty, safe to clean up
                await this.storageProvider.deleteSession(this.currentSession.sessionId);
                console.log('Cleaned up empty session:', this.currentSession.sessionId);
            } catch (error) {
                // Session might not exist in storage yet, which is fine for cleanup
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
                // Clear from sessionStorage since we're deleting the current session
                sessionStorage.removeItem('chatbot_current_session_id');
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

    async updateCurrentSessionName(newName) {
        if (!this.currentSession) {
            console.error('No current session to update name for');
            return false;
        }

        try {
            this.currentSession.updateName(newName);
            await this.saveCurrentSession();
            console.log('Updated session name to:', newName);
            return true;
        } catch (error) {
            console.error('Failed to update session name:', error);
            return false;
        }
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