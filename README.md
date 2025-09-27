# Personal AI Chatbot

A simple web interface for interacting with Azure Foundry deployed GPT-5 model.

## Features

- Clean, modern web interface
- Direct integration with Azure OpenAI service
- Environment variable-based API key management
- Responsive design for mobile and desktop
- Real-time chat interface

## Setup

### Option 1: Using Environment Variables (Recommended)

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

### Option 2: Manual Configuration

1. Edit `config.js` directly and replace `your-api-key-here` with your actual API key
2. Open `index.html` in your web browser

## Scripts

- `npm run build` - Generate config.js from environment variables
- `npm run dev` - Build and serve the application
- `npm run serve` - Serve the application on localhost:8000

## Configuration

The application requires configuration through environment variables:
- **AZURE_API_KEY**: Your Azure OpenAI API key
- **AZURE_API_ENDPOINT**: Complete endpoint URL including path and query parameters
- **AZURE_API_MODEL**: Model name (e.g., gpt-5-chat)
- **AZURE_API_DEPLOYMENT**: Your deployment name
- **AZURE_API_VERSION**: API version (e.g., 2025-01-01-preview)

## Security Note

- The API key is now managed through environment variables for better security
- Never commit your `.env` file or `config.js` with real API keys to version control
- The generated `config.js` file is automatically ignored by git

## Files

- `index.html` - Main HTML structure
- `styles.css` - CSS styling and responsive design
- `script.js` - JavaScript logic for API integration
- `config.js` - Configuration file (auto-generated)
- `build.js` - Build script for environment variable injection
- `.env.example` - Example environment variables file
- `README.md` - This documentation

## Usage

1. Set up your environment variables (see Setup section)
2. Build and serve the application
3. Open your browser to localhost:8000
4. Start chatting with your AI assistant!

## Browser Compatibility

Works with all modern browsers that support ES6 modules and fetch API.