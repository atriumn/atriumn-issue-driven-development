// Vercel serverless function handler for GitHub webhooks
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed - this endpoint only accepts POST requests from GitHub' });
  }

  try {
    // Load environment variables
    require('dotenv').config();
    
    // Load the GitHub App (it's in the parent directory)
    const app = require('../app');
    const { createNodeMiddleware } = require('@octokit/webhooks');
    
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