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