import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { CosmosClient } from '@azure/cosmos';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3001;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Cosmos DB configuration
const cosmosClient = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY
});

const database = cosmosClient.database(process.env.COSMOS_DB_DATABASE);
const container = database.container(process.env.COSMOS_DB_CONTAINER);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Save session
app.post('/api/sessions', async (req, res) => {
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
app.get('/api/sessions/:sessionId', async (req, res) => {
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
app.delete('/api/sessions/:sessionId', async (req, res) => {
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
app.get('/api/sessions', async (req, res) => {
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

// Start server
app.listen(PORT, () => {
    console.log(`Cosmos DB API server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log('Cosmos DB Configuration:');
    console.log('- Endpoint:', process.env.COSMOS_DB_ENDPOINT);
    console.log('- Database:', process.env.COSMOS_DB_DATABASE);
    console.log('- Container:', process.env.COSMOS_DB_CONTAINER);
});