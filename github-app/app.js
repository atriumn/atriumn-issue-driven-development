const { App } = require('@octokit/app');
const { createNodeMiddleware } = require('@octokit/webhooks');

// GitHub App configuration
const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET
  }
});

// Trigger patterns for Atriumn Issue-Driven Development
const TRIGGERS = {
  '@atriumn start': 'pipeline-start',
  '🟣 ATRIUMN-RESEARCH-COMPLETE': 'research-complete', 
  '@atriumn approve-research': 'approve-research',
  '🟣 ATRIUMN-PLANNING-COMPLETE': 'planning-complete',
  '@atriumn approve-plan': 'approve-plan',
  '🟣 ATRIUMN-IMPLEMENTATION-COMPLETE': 'implementation-complete'
};

// Handle issue comments
app.webhooks.on('issue_comment.created', async ({ octokit, payload }) => {
  const comment = payload.comment.body;
  const repo = payload.repository;
  const issue = payload.issue;
  
  console.log(`Processing comment: "${comment}"`);
  
  // Check for trigger matches
  for (const [trigger, eventType] of Object.entries(TRIGGERS)) {
    if (comment.includes(trigger)) {
      console.log(`Trigger matched: ${trigger} -> ${eventType}`);
      
      try {
        // Dispatch repository event
        await octokit.rest.repos.createDispatchEvent({
          owner: repo.owner.login,
          repo: repo.name,
          event_type: eventType,
          client_payload: {
            issue_number: issue.number,
            issue_title: issue.title,
            comment_body: comment,
            comment_user: payload.comment.user.login,
            issue_user: issue.user.login,
            triggered_by: trigger,
            timestamp: new Date().toISOString()
          }
        });
        
        console.log(`Successfully dispatched ${eventType} for issue #${issue.number}`);
        
        // Only trigger once per comment
        break;
      } catch (error) {
        console.error(`Failed to dispatch ${eventType}:`, error);
      }
    }
  }
});

// Health check endpoint
app.webhooks.on('ping', async ({ payload }) => {
  console.log('Webhook ping received:', payload.zen);
});

// Error handling
app.webhooks.onError((error) => {
  console.error('Webhook error:', error);
});

// Export for deployment
module.exports = app;

// Local development server
if (require.main === module) {
  const port = process.env.PORT || 3000;
  const middleware = createNodeMiddleware(app.webhooks, { path: '/api/webhook' });
  
  require('http').createServer(middleware).listen(port, () => {
    console.log(`Atriumn Issue-Driven Development app listening on port ${port}`);
    console.log('Configured triggers:', Object.keys(TRIGGERS));
  });
}