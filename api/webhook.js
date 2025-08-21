// Vercel serverless function handler for GitHub webhooks
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Load the app (with proper path resolution)
    const path = require('path');
    const appPath = path.join(__dirname, '..', 'github-app', 'app.js');
    
    // Set NODE_PATH to find dependencies
    process.env.NODE_PATH = path.join(__dirname, '..', 'github-app', 'node_modules');
    require('module').Module._initPaths();
    
    // Load environment variables
    require('dotenv').config({ path: path.join(__dirname, '..', 'github-app', '.env') });
    
    // Load the GitHub App
    const app = require(appPath);
    const { createNodeMiddleware } = require(path.join(__dirname, '..', 'github-app', 'node_modules', '@octokit', 'webhooks'));
    
    // Create the middleware
    const middleware = createNodeMiddleware(app.webhooks);
    
    // Handle the request
    return middleware(req, res);
  } catch (error) {
    console.error('Webhook handler error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
};