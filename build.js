import fs from 'fs';
import path from 'path';

// Function to load environment variables from .env file
function loadEnvFile() {
    try {
        const envContent = fs.readFileSync('.env', 'utf-8');
        const lines = envContent.split('\n');
        
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    let value = valueParts.join('=').trim();
                    // Remove surrounding quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) || 
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }
                    process.env[key.trim()] = value;
                }
            }
        });
    } catch (error) {
        console.error('Could not load .env file:', error.message);
        console.log('Make sure you have created a .env file with your configuration.');
        process.exit(1);
    }
}

// Build script to inject environment variables into the config
function buildConfig() {
    // Load environment variables from .env file first
    loadEnvFile();
    const apiKey = process.env.AZURE_API_KEY;
    const endpoint = process.env.AZURE_API_ENDPOINT;
    const model = process.env.AZURE_API_MODEL;
    const deployment = process.env.AZURE_API_DEPLOYMENT;
    const apiVersion = process.env.AZURE_API_VERSION;
    
    // Validate all required environment variables
    if (!apiKey) {
        console.error('Error: AZURE_API_KEY environment variable is not set');
        process.exit(1);
    }
    
    if (!endpoint) {
        console.error('Error: AZURE_API_ENDPOINT environment variable is not set');
        process.exit(1);
    }
    
    if (!model) {
        console.error('Error: AZURE_API_MODEL environment variable is not set');
        process.exit(1);
    }
    
    if (!deployment) {
        console.error('Error: AZURE_API_DEPLOYMENT environment variable is not set');
        process.exit(1);
    }
    
    if (!apiVersion) {
        console.error('Error: AZURE_API_VERSION environment variable is not set');
        process.exit(1);
    }

    const configContent = `// Configuration file for API settings
// This file is auto-generated from environment variables

export const CONFIG = {
    AZURE_API_KEY: "${apiKey}",
    AZURE_API_ENDPOINT: "${endpoint}",
    AZURE_API_MODEL: "${model}",
    AZURE_API_DEPLOYMENT: "${deployment}",
    AZURE_API_VERSION: "${apiVersion}"
};`;

    fs.writeFileSync('config.js', configContent);
    console.log('Configuration file generated successfully');
    console.log('config.js has been created with your configuration');
}

buildConfig();