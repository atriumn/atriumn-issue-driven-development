require('dotenv').config();
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

// Special patterns that allow additional text
const FLEXIBLE_TRIGGERS = {
  '@atriumn start': 'pipeline-start'  // Allows "@atriumn start something"
};

// Workflow template
const WORKFLOW_TEMPLATE = `name: Development Pipeline

on:
  repository_dispatch:
    types: [pipeline-start, research-complete, approve-research, planning-complete, approve-plan, implementation-complete]

jobs:
  development-pipeline:
    uses: atriumn/atriumn-issue-driven-development/.github/workflows/development-pipeline.yml@main
    with:
      repo_name: \${{ github.repository }}
      issue_number: \${{ github.event.client_payload.issue_number }}
      trigger_comment: \${{ github.event.client_payload.triggered_by }}
    secrets:
      REPO_TOKEN: \${{ secrets.PIPELINE_TOKEN }}
`;

// Auto-setup workflow when app is installed
app.webhooks.on('installation.created', async ({ payload }) => {
  console.log('App installed on repositories:', payload.repositories?.map(r => r.full_name));
  
  const installationId = payload.installation.id;
  const octokit = await app.getInstallationOctokit(installationId);
  
  // Setup workflow for each repository
  for (const repo of payload.repositories || []) {
    try {
      await setupWorkflow(octokit, repo.owner.login, repo.name);
      console.log(`✅ Workflow setup complete for ${repo.full_name}`);
    } catch (error) {
      console.error(`❌ Failed to setup workflow for ${repo.full_name}:`, error.message);
    }
  }
});

// Auto-setup workflow when app is installed on additional repositories
app.webhooks.on('installation_repositories.added', async ({ payload }) => {
  console.log('App installed on additional repositories:', payload.repositories_added?.map(r => r.full_name));
  
  const installationId = payload.installation.id;
  const octokit = await app.getInstallationOctokit(installationId);
  
  // Setup workflow for each new repository
  for (const repo of payload.repositories_added || []) {
    try {
      await setupWorkflow(octokit, repo.owner.login, repo.name);
      console.log(`✅ Workflow setup complete for ${repo.full_name}`);
    } catch (error) {
      console.error(`❌ Failed to setup workflow for ${repo.full_name}:`, error.message);
    }
  }
});

// Setup workflow in a repository
async function setupWorkflow(octokit, owner, repo) {
  const workflowPath = '.github/workflows/development-pipeline.yml';
  
  try {
    // Check if workflow already exists
    await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: workflowPath
    });
    console.log(`Workflow already exists in ${owner}/${repo}`);
    return;
  } catch (error) {
    // File doesn't exist, create it
    if (error.status !== 404) {
      throw error;
    }
  }
  
  // Create the workflow file
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path: workflowPath,
    message: 'Add Atriumn Issue-Driven Development Pipeline',
    content: Buffer.from(WORKFLOW_TEMPLATE).toString('base64'),
    committer: {
      name: 'Atriumn Bot',
      email: 'bot@atriumn.com'
    }
  });
  
  console.log(`Created workflow file in ${owner}/${repo}`);
}

// Test version that creates the full workflow structure
async function setupWorkflowTest(octokit, owner, repo) {
  const workflowPath = '.github/workflows/atriumn-pipeline-test.yml';
  
  // First, try to create the .github directory
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: '.github/.gitkeep',
      message: 'Create .github directory',
      content: Buffer.from('').toString('base64'),
      committer: {
        name: 'Atriumn Bot',
        email: 'bot@atriumn.com'
      }
    });
    console.log(`Created .github directory in ${owner}/${repo}`);
  } catch (error) {
    if (error.status !== 422) { // 422 means file already exists
      console.log(`Directory creation failed: ${error.message}`);
    }
  }

  // Then try to create the workflows directory
  try {
    await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: '.github/workflows/.gitkeep', 
      message: 'Create workflows directory',
      content: Buffer.from('').toString('base64'),
      committer: {
        name: 'Atriumn Bot',
        email: 'bot@atriumn.com'
      }
    });
    console.log(`Created workflows directory in ${owner}/${repo}`);
  } catch (error) {
    if (error.status !== 422) {
      console.log(`Workflows directory creation failed: ${error.message}`);
    }
  }
  
  try {
    // Check if workflow already exists
    await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path: workflowPath
    });
    console.log(`Workflow already exists in ${owner}/${repo}`);
    return;
  } catch (error) {
    // File doesn't exist, create it
    if (error.status !== 404) {
      throw error;
    }
  }
  
  // Create the workflow file
  await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
    owner,
    repo,
    path: workflowPath,
    message: 'Add Atriumn Issue-Driven Development Pipeline',
    content: Buffer.from(WORKFLOW_TEMPLATE).toString('base64'),
    committer: {
      name: 'Atriumn Bot',
      email: 'bot@atriumn.com'
    }
  });
  
  console.log(`Created workflow file in ${owner}/${repo}`);
}

// Handle issue comments
app.webhooks.on('issue_comment.created', async ({ payload }) => {
  const comment = payload.comment.body;
  const repo = payload.repository;
  const issue = payload.issue;
  const commentUser = payload.comment.user.login;
  
  // Ignore comments from bot accounts or automated systems
  if (commentUser === 'github-actions[bot]' || commentUser === 'github-actions' || commentUser.includes('[bot]') || commentUser === 'atriumn-bot') {
    console.log(`Ignoring comment from bot user: ${commentUser}`);
    return;
  }
  
  console.log(`Processing comment from ${commentUser}: "${comment}"`);
  
  // Check for trigger matches (must be on its own line)
  for (const [trigger, eventType] of Object.entries(TRIGGERS)) {
    // Match trigger as standalone comment or on its own line
    const commentTrimmed = comment.trim();
    const triggerStandalone = commentTrimmed === trigger;
    
    // Check if trigger appears on its own line (start of line, trigger, optional whitespace, end of line)
    const escapedTrigger = trigger.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const triggerOnOwnLine = new RegExp(`^\\s*${escapedTrigger}\\s*$`, 'm');
    
    // Check flexible triggers (allow additional text after trigger)
    let flexibleMatch = false;
    if (FLEXIBLE_TRIGGERS[trigger]) {
      const flexiblePattern = new RegExp(`^\\s*${escapedTrigger}(\\s|$)`, 'm');
      flexibleMatch = flexiblePattern.test(comment);
    }
    
    if (triggerStandalone || triggerOnOwnLine.test(comment) || flexibleMatch) {
      console.log(`Trigger matched: ${trigger} -> ${eventType}`);
      
      try {
        // Get installation octokit instance
        console.log('Installation ID:', payload.installation?.id);
        const installationId = payload.installation?.id;
        if (!installationId) {
          console.error('No installation ID found in payload');
          return;
        }
        const octokit = await app.getInstallationOctokit(installationId);
        console.log('Octokit instance:', !!octokit, !!octokit?.rest, !!octokit?.repos, typeof octokit?.request);
        console.log('Dispatching event:', {
          owner: repo.owner.login,
          repo: repo.name,
          event_type: eventType,
          client_payload_keys: Object.keys({
            issue_number: issue.number,
            issue_title: issue.title,
            comment_body: comment,
            comment_user: payload.comment.user.login,
            issue_user: issue.user.login,
            triggered_by: trigger,
            timestamp: new Date().toISOString()
          })
        });
        
        // Special handling for research-complete: dispatch Claude workflow instead of repository event
        if (eventType === 'research-complete') {
          // Extract feature branch from the comment (should contain PIPELINE BRANCH: `branch-name`)
          const branchMatch = comment.match(/PIPELINE BRANCH.*?`([^`]+)`/);
          const featureBranch = branchMatch ? branchMatch[1] : 'develop';
          
          console.log(`Dispatching Claude workflow for feature branch: ${featureBranch}`);
          
          // Dispatch workflow_dispatch to Claude Code workflow
          await octokit.request('POST /repos/{owner}/{repo}/actions/workflows/{workflow_id}/dispatches', {
            owner: repo.owner.login,
            repo: repo.name,
            workflow_id: 'claude.yml',
            ref: 'develop', // The workflow file is on develop, but it will checkout the feature branch
            inputs: {
              feature_ref: featureBranch,
              issue_number: issue.number.toString(),
              task_description: 'Research phase for issue-driven development pipeline'
            }
          });
          
          console.log(`Successfully dispatched Claude workflow for issue #${issue.number} on branch ${featureBranch}`);
        } else {
          // Regular repository dispatch for other events
          await octokit.request('POST /repos/{owner}/{repo}/dispatches', {
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
        }
        
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
  
  // Add test endpoint for manual workflow creation
  const server = require('http').createServer(async (req, res) => {
    if (req.url === '/test-setup' && req.method === 'POST') {
      try {
        const installationId = 81630447; // Your installation ID
        const octokit = await app.getInstallationOctokit(installationId);
        await setupWorkflowTest(octokit, 'atriumn', 'curatefor.me');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Workflow setup completed' }));
      } catch (error) {
        console.error('Test setup error:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message, status: error.status }));
      }
    } else {
      // Pass to webhook middleware
      middleware(req, res);
    }
  });
  
  server.listen(port, () => {
    console.log(`Atriumn Issue-Driven Development app listening on port ${port}`);
    console.log('Configured triggers:', Object.keys(TRIGGERS));
    console.log('Test endpoint: POST http://localhost:' + port + '/test-setup');
  });
}