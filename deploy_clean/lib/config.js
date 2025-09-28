// Configuration file for client-side settings
// All sensitive data comes from Azure App Service environment variables
// This file only contains safe, client-side configuration

export const CONFIG = {
    // API endpoints (internal, no keys exposed)
    API_BASE_URL: window.location.origin + '/api'
};