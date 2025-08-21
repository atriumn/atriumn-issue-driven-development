// Vercel serverless function handler for GitHub webhooks
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Webhook received:', req.headers['x-github-event']);
  
  try {
    // Import dependencies
    const path = require('path');
    
    // Add github-app/node_modules to the module search path
    const Module = require('module');
    const originalResolveFilename = Module._resolveFilename;
    Module._resolveFilename = function (request, parent, isMain) {
      try {
        return originalResolveFilename(request, parent, isMain);
      } catch (e) {
        const githubAppModules = path.join(__dirname, '..', 'github-app', 'node_modules');
        return originalResolveFilename(request, {
          ...parent,
          paths: (parent.paths || []).concat([githubAppModules])
        }, isMain);
      }
    };
    
    // Load the main app
    const app = require('../github-app/app');
    const { createNodeMiddleware } = require('@octokit/webhooks');
    
    // Create and execute the middleware
    const middleware = createNodeMiddleware(app.webhooks);
    return await middleware(req, res);
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return success anyway to prevent GitHub from retrying
    return res.status(200).json({ 
      status: 'accepted',
      error: error.message,
      note: 'Error logged but returning 200 to prevent retries'
    });
  }
};