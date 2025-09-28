## Personal Chatbot - Overview 

A secure web application for conversing with an OpenAI GPT-5 model deployed in Azure Foundry. The chatbot application features persistent chat session storage and history via Azure Cosmos DB, allowing the user to access past chats and manage them. Designed for deployment on Azure Web App Service.

The application uses a secure architecture where all API keys and database credentials are kept server-side. The frontend communicates with Azure services through a secure Express.js API proxy, ensuring no sensitive information is exposed to the browser.

## Key Features

- Web-based chat interface with real-time AI responses
- Persistent conversation history stored in Azure Cosmos DB
- Multiple chat session management (create, rename, delete, switch)
- Secure server-side API proxy protecting all credentials
- Responsive design that works on desktop and mobile
- Ready for production deployment on Azure App Service

## Architecture

- **Frontend**: Modern JavaScript with ES6 modules, EJS templating
- **Backend**: Express.js server with API routes and session management  
- **Database**: Azure Cosmos DB for chat session persistence
- **AI Service**: Azure OpenAI GPT-5 accessed via secure server proxy
- **Deployment**: GitHub Actions CI/CD pipeline to Azure App Service

## Prerequisites

- Node.js 22.x or higher
- Azure Foundry account containing an OpenAI GPT-5 model deployment
- Azure Cosmos DB account
- Azure Web App Service 

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/JoshuaZebrowski/personal-chatbot.git
cd personal-chatbot
```

### 2. Navigate to Deploy Directory

```bash
cd deploy_clean
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Create Environment Configuration

Create a `.env` file in the `deploy_clean` directory with your Azure credentials:

```env
# Azure OpenAI Configuration
AZURE_API_KEY=your-azure-foundry-api-key
AZURE_API_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/openai/deployments/gpt-5-chat/chat/completions?api-version=2025-01-01-preview
AZURE_API_MODEL=gpt-5-chat
AZURE_API_DEPLOYMENT=gpt-5-chat
AZURE_API_VERSION=2025-01-01-preview

# Azure Cosmos DB Configuration
COSMOS_DB_ENDPOINT=https://your-cosmosdb-account.documents.azure.com:443/
COSMOS_DB_KEY=your-cosmos-db-primary-key
COSMOS_DB_DATABASE=chatbot-database
COSMOS_DB_CONTAINER=sessions
```

### 5. Set Up Azure Resources

#### Azure Cosmos DB Setup
1. Create an Azure Cosmos DB account (Core SQL API)
2. Create a database named `chatbot-database`
3. Create a container named `sessions` with partition key `/userID`
4. Copy the endpoint and primary key to your `.env` file

#### Azure OpenAI Setup
1. Create an Azure OpenAI resource in Azure Foundry
2. Deploy a GPT-5 model with deployment name `gpt-5-chat`
3. Copy the API key and endpoint URL to your `.env` file
4. Ensure the endpoint URL includes the full path with API version

### 6. Run the Application Locally

```bash
npm start
```

The application will be available at `http://localhost:3000`

### 7. Test the Setup

1. Open your browser to `http://localhost:3000`
2. Click "New Chat" to create a session
3. Send a test message to verify AI responses
4. Check that sessions persist by refreshing the page

## Usage Guide

### Creating and Managing Chat Sessions
- **New Chat**: Click "New Chat" in the sidebar to start a new conversation
- **Rename Session**: Click the edit icon next to any session name
- **Delete Session**: Click the delete icon next to any session name
- **Switch Sessions**: Click on any session name to view that conversation

### Chatting with the AI
- Type your message in the input field at the bottom
- Press Enter or click Send to submit your message
- AI responses will appear in the chat area
- All messages are automatically saved to your session

## Deployment to Azure

### Automatic Deployment via GitHub Actions

1. **Fork this repository** to your GitHub account

2. **Create Azure Web App Service**:
   - Runtime: Node.js 22.x
   - Operating System: Linux or Windows

3. **Configure Environment Variables** in Azure App Service:
   - Go to Configuration > Application settings
   - Add all the environment variables from your `.env` file

4. **Set up GitHub Actions**:
   - The repository includes `.github/workflows/azure-web-app_josh-chatbot-web-app.yml`
   - Configure deployment credentials in your GitHub repository secrets
   - Push changes to the `azure-web-app` branch to trigger deployment

### Manual Deployment

1. **Prepare deployment package**:
   ```bash
   cd deploy_clean
   zip -r ../deployment.zip .
   ```

2. **Upload to Azure App Service**:
   - Use Azure CLI, VS Code extension, or Azure portal
   - Deploy the `deployment.zip` file
   - Ensure environment variables are configured

## API Endpoints

The application provides these REST API endpoints:

### Health and Status
- `GET /api/health` - Check API server status

### Chat Management  
- `POST /api/chat` - Send message to AI (proxies to Azure OpenAI)

### Session Management
- `GET /api/sessions` - List all chat sessions
- `GET /api/sessions/:id` - Get specific session details
- `POST /api/sessions` - Create or update a chat session
- `DELETE /api/sessions/:id` - Delete a specific session

## Project Structure

```
deploy_clean/
├── app.js                 # Express app configuration
├── bin/www               # Application entry point
├── package.json          # Dependencies and scripts
├── lib/                  # Shared libraries
│   ├── chat-history-manager.js
│   ├── chat-models.js
│   ├── config.js         # Client-side config
│   └── storage-providers.js
├── public/               # Static web assets
│   ├── javascripts/
│   │   └── script.js     # Client-side JavaScript
│   └── stylesheets/
│       └── styles.css    # Application styles
├── routes/               # API route handlers
│   ├── api.js           # API endpoints
│   └── index.js         # Web page routes
└── views/               # EJS templates
    ├── index.ejs        # Main chat interface
    └── error.ejs        # Error page template
```



