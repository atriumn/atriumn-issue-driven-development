// Vercel serverless function handler for GitHub webhooks
const path = require('path');

// Load environment variables from github-app directory
require('dotenv').config({ path: path.join(__dirname, '../github-app/.env') });

// Set up module resolution to find dependencies in github-app
const Module = require('module');
const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain) {
  try {
    return originalResolveFilename(request, parent, isMain);
  } catch (e) {
    // Try to resolve from github-app/node_modules
    return originalResolveFilename(request, {
      ...parent,
      paths: (parent.paths || []).concat([
        path.join(__dirname, '../github-app/node_modules')
      ])
    }, isMain);
  }
};

// Now load the app
const { createNodeMiddleware } = require('@octokit/webhooks');
const app = require('../github-app/app');

// Export the handler for Vercel
module.exports = createNodeMiddleware(app.webhooks);