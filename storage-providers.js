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

// Cosmos DB storage implementation
export class CosmosDBProvider extends StorageProvider {
    constructor() {
        super();
        this.apiBaseUrl = 'http://localhost:3001/api';
        this.userID = 'anonymous'; // You can make this dynamic later for multi-user support
        this.initialized = false;
    }

    async initializeClient() {
        try {
            // Test if the API server is running
            const response = await fetch(`${this.apiBaseUrl}/health`);
            if (!response.ok) {
                throw new Error('Cosmos DB API server is not responding');
            }
            this.initialized = true;
            console.log('Cosmos DB API client initialized successfully');
        } catch (error) {
            console.error('Failed to connect to Cosmos DB API server:', error);
            throw error;
        }
    }

    async ensureClientReady() {
        if (!this.initialized) {
            await this.initializeClient();
        }
    }

    async saveSession(session) {
        try {
            await this.ensureClientReady();
            
            const response = await fetch(`${this.apiBaseUrl}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: session.sessionId,
                    sessionData: {
                        sessionId: session.sessionId,
                        name: session.name,
                        messages: session.messages,
                        createdAt: session.createdAt,
                        updatedAt: session.updatedAt
                    },
                    userID: this.userID
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('Session saved to Cosmos DB:', session.sessionId);
            return true;
        } catch (error) {
            console.error('Error saving session to Cosmos DB:', error);
            throw new Error('Failed to save chat session to Cosmos DB');
        }
    }

    async loadSession(sessionId) {
        try {
            await this.ensureClientReady();
            
            const response = await fetch(`${this.apiBaseUrl}/sessions/${sessionId}?userID=${encodeURIComponent(this.userID)}`);
            
            if (response.status === 404) {
                return null; // Session not found
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Session loaded from Cosmos DB:', sessionId);
            return data.sessionData;
        } catch (error) {
            console.error('Error loading session from Cosmos DB:', error);
            throw new Error('Failed to load chat session from Cosmos DB');
        }
    }

    async deleteSession(sessionId) {
        try {
            await this.ensureClientReady();
            
            const response = await fetch(`${this.apiBaseUrl}/sessions/${sessionId}?userID=${encodeURIComponent(this.userID)}`, {
                method: 'DELETE'
            });

            if (response.status === 404) {
                return true; // Session already doesn't exist
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            console.log('Session deleted from Cosmos DB:', sessionId);
            return true;
        } catch (error) {
            console.error('Error deleting session from Cosmos DB:', error);
            throw new Error('Failed to delete chat session from Cosmos DB');
        }
    }

    async listSessions() {
        try {
            await this.ensureClientReady();
            
            const response = await fetch(`${this.apiBaseUrl}/sessions?userID=${encodeURIComponent(this.userID)}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const sessions = await response.json();
            console.log('Sessions listed from Cosmos DB:', sessions.length);
            
            return sessions.map(session => ({
                sessionId: session.sessionId,
                name: session.name,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                messageCount: session.messages ? session.messages.length : 0
            }));
        } catch (error) {
            console.error('Error listing sessions from Cosmos DB:', error);
            return [];
        }
    }
}