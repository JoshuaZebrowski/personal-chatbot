// Abstract storage interface - this allows easy swapping of storage providers
export class StorageProvider {
    async saveSession(session) {
        throw new Error('saveSession method must be implemented');
    }

    async loadSession(sessionId) {
        throw new Error('loadSession method must be implemented');
    }

    async deleteSession(sessionId) {
        throw new Error('deleteSession method must be implemented');
    }

    async listSessions() {
        throw new Error('listSessions method must be implemented');
    }
}

// File system storage implementation for browser (using localStorage as a fallback)
export class LocalStorageProvider extends StorageProvider {
    constructor() {
        super();
        this.prefix = 'chatbot_session_';
    }

    async saveSession(session) {
        try {
            const key = this.prefix + session.sessionId;
            const data = JSON.stringify(session.toJSON());
            localStorage.setItem(key, data);
            
            // Also save to session list
            await this.addToSessionList(session.sessionId);
            
            return true;
        } catch (error) {
            console.error('Error saving session:', error);
            throw new Error('Failed to save chat session');
        }
    }

    async loadSession(sessionId) {
        try {
            const key = this.prefix + sessionId;
            const data = localStorage.getItem(key);
            
            if (!data) {
                return null;
            }

            const sessionData = JSON.parse(data);
            return sessionData;
        } catch (error) {
            console.error('Error loading session:', error);
            throw new Error('Failed to load chat session');
        }
    }

    async deleteSession(sessionId) {
        try {
            const key = this.prefix + sessionId;
            localStorage.removeItem(key);
            
            // Remove from session list
            await this.removeFromSessionList(sessionId);
            
            return true;
        } catch (error) {
            console.error('Error deleting session:', error);
            throw new Error('Failed to delete chat session');
        }
    }

    async listSessions() {
        try {
            const sessionListData = localStorage.getItem('chatbot_session_list');
            if (!sessionListData) {
                return [];
            }

            const sessionIds = JSON.parse(sessionListData);
            const sessions = [];

            for (const sessionId of sessionIds) {
                const sessionData = await this.loadSession(sessionId);
                if (sessionData) {
                    sessions.push({
                        sessionId: sessionData.sessionId,
                        name: sessionData.name,
                        createdAt: sessionData.createdAt,
                        updatedAt: sessionData.updatedAt,
                        messageCount: sessionData.messages.length
                    });
                }
            }

            return sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        } catch (error) {
            console.error('Error listing sessions:', error);
            return [];
        }
    }

    async addToSessionList(sessionId) {
        try {
            const sessionListData = localStorage.getItem('chatbot_session_list');
            let sessionIds = sessionListData ? JSON.parse(sessionListData) : [];
            
            if (!sessionIds.includes(sessionId)) {
                sessionIds.push(sessionId);
                localStorage.setItem('chatbot_session_list', JSON.stringify(sessionIds));
            }
        } catch (error) {
            console.error('Error adding to session list:', error);
        }
    }

    async removeFromSessionList(sessionId) {
        try {
            const sessionListData = localStorage.getItem('chatbot_session_list');
            let sessionIds = sessionListData ? JSON.parse(sessionListData) : [];
            
            sessionIds = sessionIds.filter(id => id !== sessionId);
            localStorage.setItem('chatbot_session_list', JSON.stringify(sessionIds));
        } catch (error) {
            console.error('Error removing from session list:', error);
        }
    }
}

// Future implementation placeholder for Cosmos DB
export class CosmosDBProvider extends StorageProvider {
    constructor(endpoint, key, databaseName, containerName) {
        super();
        this.endpoint = endpoint;
        this.key = key;
        this.databaseName = databaseName;
        this.containerName = containerName;
        // TODO: Initialize Cosmos DB client
    }

    async saveSession(session) {
        // TODO: Implement Cosmos DB save
        throw new Error('Cosmos DB implementation not yet available');
    }

    async loadSession(sessionId) {
        // TODO: Implement Cosmos DB load
        throw new Error('Cosmos DB implementation not yet available');
    }

    async deleteSession(sessionId) {
        // TODO: Implement Cosmos DB delete
        throw new Error('Cosmos DB implementation not yet available');
    }

    async listSessions() {
        // TODO: Implement Cosmos DB list
        throw new Error('Cosmos DB implementation not yet available');
    }
}