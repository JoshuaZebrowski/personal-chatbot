import dotenv from 'dotenv';
import { CosmosClient } from '@azure/cosmos';

// Load environment variables
dotenv.config();

const client = new CosmosClient({
    endpoint: process.env.COSMOS_DB_ENDPOINT,
    key: process.env.COSMOS_DB_KEY
});

async function setupCosmosDB() {
    try {
        console.log('🔍 Checking Cosmos DB setup...');
        console.log('Endpoint:', process.env.COSMOS_DB_ENDPOINT);
        console.log('Database:', process.env.COSMOS_DB_DATABASE);
        console.log('Container:', process.env.COSMOS_DB_CONTAINER);
        
        // Try to create database (will succeed if it doesn't exist, or return existing if it does)
        console.log('\n📦 Creating/checking database...');
        const { database } = await client.databases.createIfNotExists({
            id: process.env.COSMOS_DB_DATABASE
        });
        console.log('✅ Database ready:', database.id);

        // Try to create container (will succeed if it doesn't exist, or return existing if it does)
        console.log('\n📋 Creating/checking container...');
        const { container } = await database.containers.createIfNotExists({
            id: process.env.COSMOS_DB_CONTAINER,
            partitionKey: { paths: ['/userID'] }
            // No throughput setting for serverless accounts
        });
        console.log('✅ Container ready:', container.id);

        // Test a simple query
        console.log('\n🔍 Testing query...');
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.userID = @userID',
            parameters: [
                { name: '@userID', value: 'test-user' }
            ]
        };

        const { resources } = await container.items.query(querySpec).fetchAll();
        console.log('✅ Query successful! Found', resources.length, 'items');

        // Test creating a document
        console.log('\n💾 Testing document creation...');
        const testDoc = {
            id: 'test-session-' + Date.now(),
            userID: 'test-user',
            sessionId: 'test-session',
            name: 'Test Session',
            messages: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const { resource } = await container.items.upsert(testDoc);
        console.log('✅ Document created successfully:', resource.id);

        // Clean up test document
        await container.item(testDoc.id, testDoc.userID).delete();
        console.log('✅ Test document cleaned up');

        console.log('\n🎉 Cosmos DB setup completed successfully!');

    } catch (error) {
        console.error('❌ Error setting up Cosmos DB:', error);
        console.error('Error details:', error.message);
        
        if (error.code === 401) {
            console.error('💡 This might be an authentication issue. Check your COSMOS_DB_KEY');
        } else if (error.code === 403) {
            console.error('💡 This might be a permissions issue. Make sure your account has proper access');
        } else if (error.code === 404) {
            console.error('💡 This might be an endpoint issue. Check your COSMOS_DB_ENDPOINT');
        }
    }
}

setupCosmosDB();