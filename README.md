# Personal AI Chatbot

A simple web interface for interacting with Azure Foundry deployed GPT-5 model.

## Features

- Clean, modern web interface
- Direct integration with Azure OpenAI service
- Environment variable-based API key management
- Responsive design for mobile and desktop
- Real-time chat interface

## Setup

1. Copy `.env.example` to `.env`:
   ```bash
   copy .env.example .env
   ```

2. Edit `.env` and add your actual configuration:
   ```
   AZURE_API_KEY=your-actual-azure-api-key
   AZURE_API_ENDPOINT=https://your-endpoint.cognitiveservices.azure.com/openai/deployments/your-deployment/chat/completions?api-version=your-api-version
   AZURE_API_MODEL=gpt-5-chat
   AZURE_API_DEPLOYMENT=your-deployment-name
   AZURE_API_VERSION=your-api-version
   ```

3. Build the configuration:
   ```bash
   npm run build
   ```

4. Serve the website:
   ```bash
   npm run serve
   ```

5. Open http://localhost:8000 in your browser

## Security Note

- The API key is now managed through environment variables for better security
- Never commit your `.env` file or `config.js` with real API keys to version control
- The generated `config.js` file is automatically ignored by git

## Usage

1. Set up your environment variables (see Setup section)
2. Build and serve the application

## Browser Compatibility

Works with all modern browsers that support ES6 modules and fetch API.