# Azure Web App Deployment Instructions

## Prerequisites
1. Azure Web App created with Node.js runtime
2. Azure OpenAI service configured
3. Azure Cosmos DB configured

## Deployment Steps

### 1. Configure Application Settings in Azure Portal
Navigate to your Azure Web App → Configuration → Application settings and add:

```
NODE_ENV=production
AZURE_API_KEY=your_azure_openai_api_key
AZURE_API_ENDPOINT=your_azure_openai_endpoint
AZURE_API_MODEL=gpt-5-chat
AZURE_API_DEPLOYMENT=gpt-5-chat
AZURE_API_VERSION=2025-01-01-preview
COSMOS_DB_ENDPOINT=your_cosmos_db_endpoint
COSMOS_DB_KEY=your_cosmos_db_key
COSMOS_DB_DATABASE=josh-chatbot-cosmos-db
COSMOS_DB_CONTAINER=sessions
```

### 2. Deploy the Application
Use one of these methods:

**Method A: VS Code Azure Extension**
1. Install Azure App Service extension
2. Right-click on your project
3. Select "Deploy to Web App"
4. Choose your Azure Web App

**Method B: Azure CLI**
```bash
az webapp deployment source config-zip --resource-group your-rg --name your-webapp --src deployment.zip
```

**Method C: GitHub Actions**
Set up continuous deployment from your GitHub repository.

### 3. Files Included in Deployment
The following files are included (others are ignored via `.deployignore`):
- `/bin/` - Server startup files
- `/routes/` - Express routes
- `/views/` - EJS templates  
- `/public/` - Static assets
- `/lib/` - JavaScript modules
- `package.json` - Dependencies
- `web.config` - IIS configuration
- `app.js` - Main Express app

### 4. Files Excluded from Deployment
- `node_modules/` - Will be installed on server
- `.env` - Contains sensitive local credentials
- `api/` - Large development files
- Original files before restructuring

### 5. Troubleshooting

**Large deployment package:**
- Ensure `.deployignore` is working
- Remove unnecessary files before deployment

**Environment variables not loading:**
- Check Application Settings in Azure Portal
- Verify NODE_ENV is set to "production"

**Module not found errors:**
- Check that all dependencies are in `package.json`
- Ensure Azure Web App has Node.js runtime configured

**CORS errors:**
- Verify your domain is allowed in CORS configuration
- Check that API endpoints are accessible

### 6. Testing Deployment
1. Visit your Azure Web App URL
2. Test chat functionality
3. Verify session persistence
4. Check browser developer console for errors

## Support
If you encounter issues, check:
1. Azure Web App logs in the portal
2. Application Insights (if configured)
3. Browser developer console
4. This application's GitHub repository