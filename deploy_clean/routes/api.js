import express from 'express';
const router = express.Router();

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import Cosmos DB client
import { CosmosClient } from '@azure/cosmos';

// Cosmos DB configuration
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Configuration endpoint - no longer needed since client doesn't need server config
// Keeping for backward compatibility but returns minimal info
router.get('/config', (req, res) => {
    res.json({ 
        status: 'Config loaded from environment variables',
        timestamp: new Date().toISOString()
    });
});

// AI Chat endpoint - proxy to Azure OpenAI (keeps API keys secure)
router.post('/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // All values come from Azure App Service environment variables
        const azureEndpoint = process.env.AZURE_API_ENDPOINT;
        const azureApiKey = process.env.AZURE_API_KEY;

        if (!azureEndpoint || !azureApiKey) {
            console.error('Missing Azure API configuration in environment variables');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        const response = await fetch(azureEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': azureApiKey
            },
            body: JSON.stringify({
                messages: messages,
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`Azure API error: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error calling Azure OpenAI:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

// Save session
router.post('/sessions', async (req, res) => {
    try {
        const { sessionId, sessionData, userID = 'anonymous' } = req.body;

        if (!sessionId || !sessionData) {
            return res.status(400).json({ error: 'sessionId and sessionData are required' });
        }

        const document = {
            id: sessionId,
            userID: userID,
            sessionId: sessionId,
            name: sessionData.name,
            messages: sessionData.messages,
            createdAt: sessionData.createdAt,
            updatedAt: sessionData.updatedAt,
            _ts: Math.floor(Date.now() / 1000)
        };

        const { resource } = await container.items.upsert(document);
        console.log('Session saved:', resource.id);
        
        res.json({ success: true, id: resource.id });
    } catch (error) {
        console.error('Error saving session:', error);
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// Load session
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userID = 'anonymous' } = req.query;

        const { resource } = await container.item(sessionId, userID).read();
        
        if (resource) {
            const sessionData = {
                sessionId: resource.sessionId,
                name: resource.name,
                messages: resource.messages,
                createdAt: resource.createdAt,
                updatedAt: resource.updatedAt
            };
            res.json({ sessionData });
        } else {
            res.status(404).json({ error: 'Session not found' });
        }
    } catch (error) {
        if (error.code === 404) {
            return res.status(404).json({ error: 'Session not found' });
        }
        console.error('Error loading session:', error);
        res.status(500).json({ error: 'Failed to load session' });
    }
});

// Delete session
router.delete('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { userID = 'anonymous' } = req.query;

        await container.item(sessionId, userID).delete();
        console.log('Session deleted:', sessionId);
        
        res.json({ success: true });
    } catch (error) {
        if (error.code === 404) {
            return res.json({ success: true }); // Already deleted
        }
        console.error('Error deleting session:', error);
        res.status(500).json({ error: 'Failed to delete session' });
    }
});

// List sessions
router.get('/sessions', async (req, res) => {
    try {
        const { userID = 'anonymous' } = req.query;

        const querySpec = {
            query: 'SELECT * FROM c WHERE c.userID = @userID ORDER BY c.updatedAt DESC',
            parameters: [
                { name: '@userID', value: userID }
            ]
        };

        const { resources } = await container.items.query(querySpec).fetchAll();
        
        const sessions = resources.map(resource => ({
            sessionId: resource.sessionId,
            name: resource.name,
            createdAt: resource.createdAt,
            updatedAt: resource.updatedAt,
            messageCount: resource.messages ? resource.messages.length : 0
        }));

        res.json(sessions);
    } catch (error) {
        console.error('Error listing sessions:', error);
        res.status(500).json({ error: 'Failed to list sessions' });
    }
});

export default router;