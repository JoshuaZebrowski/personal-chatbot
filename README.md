# Personal AI Chatbot

A full-featured web application for interacting with Azure Foundry deployed GPT-5 model, with persistent chat session storage using Azure Cosmos DB.

### Core Functionality
- **Clean, modern web interface** with responsive design
- **Direct integration with Azure OpenAI GPT-5 model**
- **Session-based conversations** with persistent history

### Data Persistence
- **Azure Cosmos DB integration** for cloud storage
- **Automatic session persistence** across page refreshes and browser restarts
- **Session management**: Create, rename, delete, and switch between chat sessions
- **Smart fallback** to localStorage if Cosmos DB is unavailable

### Technical Stack
- **Consistent Node.js architecture**
  - Frontend: Node.js static file server with ES6 modules
  - Backend: Express.js API server for Cosmos DB operations
- **Environment variable-based configuration management**
- **CORS-enabled API** for secure cross-origin requests

## Prerequisites

- Node.js (version 14 or higher)
- Azure OpenAI API access (GPT-5 model)
- Azure Cosmos DB account (Serverless mode supported)

## Setup

### 1. Environment Configuration

Copy the example environment file:
```bash
copy .env.example .env
```

Edit `.env` with your actual configuration:
```env
# Azure OpenAI Configuration
AZURE_API_KEY=your-actual-azure-api-key
AZURE_API_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/openai/deployments/gpt-5-chat/chat/completions?api-version=2025-01-01-preview
AZURE_API_MODEL=gpt-5-chat
AZURE_API_DEPLOYMENT=gpt-5-chat
AZURE_API_VERSION=2025-01-01-preview

# Cosmos DB Configuration
USE_COSMOS_DB=true
COSMOS_DB_ENDPOINT=https://your-cosmosdb-account.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=your-database-name
COSMOS_DB_CONTAINER=sessions
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Configuration

```bash
npm run build
```

## Running the Application

The application requires two servers to run:

### Option 1: Manual Start (Recommended for Development)

**Terminal 1 - Start Cosmos DB API Server:**
```bash
node cosmos-api-server.js
```

**Terminal 2 - Start Frontend Server:**
```bash
npm run serve
```

