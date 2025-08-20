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

// New task pack system triggers
const TASK_PACK_TRIGGERS = {
  '/atriumn-research': 'research',
  '/atriumn-plan': 'plan', 
  '/atriumn-implement': 'implement',
  '/atriumn-validate': 'validate'
};

// Approval triggers (handled by phase-approvals.yml)
const APPROVAL_TRIGGERS = {
  '/atriumn-approve-research': 'approve-research',
  '/atriumn-revise-research': 'revise-research',
  '/atriumn-approve-plan': 'approve-plan', 
  '/atriumn-revise-plan': 'revise-plan',
  '/atriumn-approve-implement': 'approve-implement',
  '/atriumn-revise-implement': 'revise-implement',
  '/atriumn-approve-validate': 'approve-validate',
  '/atriumn-revise-validate': 'revise-validate'
};

// GitHub App now dispatches directly to task pack workflows
// No static workflow template needed - repos use their own claude.yml dispatcher

// Function to create PR after workflow creates commits
async function createPRWhenReady(octokit, repo, issue, featureRef, maxRetries = 6) {
  const prTitle = `Feature: Issue #${issue.number} – multi-phase development`;
  const prBody = `Tracking PR for Issue #${issue.number}.

## Development Phases:
- [ ] Research
- [ ] Plan  
- [ ] Implement
- [ ] Validate

**Issue:** ${issue.title}
**Branch:** \`${featureRef}\`

This PR will be updated automatically as each phase completes.`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Check if PR already exists
      const existingPRs = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
        owner: repo.owner.login,
        repo: repo.name,
        head: `${repo.owner.login}:${featureRef}`,
        state: 'open'
      });

      if (existingPRs.data.length > 0) {
        console.log(`Draft PR already exists for ${featureRef}: #${existingPRs.data[0].number}`);
        return;
      }

      // Try to create PR
      const newPR = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
        owner: repo.owner.login,
        repo: repo.name,
        title: prTitle,
        head: featureRef,
        base: 'develop',
        body: prBody,
        draft: true
      });
      
      console.log(`Created draft PR #${newPR.data.number} for ${featureRef}`);
      return;
      
    } catch (error) {
      if (error.message.includes('No commits between') && attempt < maxRetries) {
        console.log(`Attempt ${attempt}: No commits yet, waiting 30s before retry...`);
        await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        continue;
      }
      
      throw error; // Re-throw if it's not a "no commits" error or we've exhausted retries
    }
  }
  
  throw new Error(`Failed to create PR after ${maxRetries} attempts - workflow may not have created commits`);
}

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
  
  // Get installation octokit instance
  const installationId = payload.installation?.id;
  if (!installationId) {
    console.error('No installation ID found in payload');
    return;
  }
  const octokit = await app.getInstallationOctokit(installationId);
  
  // Check for Atriumn commands and provide neutral acknowledgement only
  const isAtriumnCommand = /^\/atriumn-(research|plan|implement|validate|approve-(research|plan|implement|validate))/.test(comment.trim());
  
  if (isAtriumnCommand) {
    try {
      // DO NOT dispatch, DO NOT re-post a slash command
      // Just a neutral acknowledgement so users "see" the App
      await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
        owner: repo.owner.login,
        repo: repo.name,
        issue_number: issue.number,
        body: '✅ Atriumn: command received. The pipeline will run shortly.'
      });
      
      console.log(`Atriumn command acknowledged for issue #${issue.number}: ${comment.trim()}`);
      
      // IMPORTANT: stop here.
      // Do NOT call repository_dispatch.
      // Do NOT post another slash command.
      return;
    } catch (error) {
      console.error(`Failed to acknowledge Atriumn command:`, error);
    }
  }
  
  // All Atriumn commands are now handled above with neutral acknowledgement only
  // No additional approval logic needed - the consumer workflow handles all phases
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
        
        // Test PR creation directly - try without draft first
        const testPR = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
          owner: 'atriumn',
          repo: 'curatefor.me',
          title: 'Test PR from GitHub App',
          head: 'atriumn:feature/issue-97',
          base: 'develop',
          body: 'Testing GitHub App PR creation'
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'PR created', pr: testPR.data.number }));
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
    console.log('Configured task pack triggers:', Object.keys(TASK_PACK_TRIGGERS));
    console.log('Configured approval triggers:', Object.keys(APPROVAL_TRIGGERS));
    console.log('Test endpoint: POST http://localhost:' + port + '/test-setup');
  });
}