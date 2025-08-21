require('dotenv').config();
const { App } = require('@octokit/app');
const { createNodeMiddleware } = require('@octokit/webhooks');

// Track processed comments to prevent duplicate workflow runs
const processedComments = new Set();

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
  const commentId = payload.comment.id;
  
  const body = (comment || '').trim();

  // Handle /atriumn-* commands: create branch and post status, but don't dispatch workflows
  
  // Check if we already processed this comment (prevents duplicate webhook delivery)
  if (processedComments.has(commentId)) {
    console.log(`Ignoring duplicate webhook for comment ID ${commentId}`);
    return;
  }
  
  // Ignore comments from bot accounts or automated systems
  if (commentUser === 'github-actions[bot]' || commentUser === 'github-actions' || commentUser.includes('[bot]') || commentUser === 'atriumn-bot' || commentUser === 'atriumn-issue-driven-development[bot]') {
    console.log(`Ignoring comment from bot user: ${commentUser}`);
    return;
  }
  
  // Mark this comment as processed
  processedComments.add(commentId);
  console.log(`Processing comment from ${commentUser}: "${comment}" (ID: ${commentId})`);
  
  // Get installation octokit instance
  const installationId = payload.installation?.id;
  if (!installationId) {
    console.error('No installation ID found in payload');
    return;
  }
  const octokit = await app.getInstallationOctokit(installationId);
  
  // Check for task pack triggers (e.g., "/research description")
  for (const [trigger, taskPackId] of Object.entries(TASK_PACK_TRIGGERS)) {
    const pattern = new RegExp(`^\\s*${trigger.replace('/', '\\/')}(?:\\s+(.+))?\\s*$`, 'm');
    const match = comment.match(pattern);
    
    if (match) {
      // Use provided description or generate from issue context
      const taskDescription = match[1] || `${taskPackId.charAt(0).toUpperCase() + taskPackId.slice(1)} phase for: "${issue.title}"
      
Context from issue description:
${issue.body ? issue.body.substring(0, 500) + (issue.body.length > 500 ? '...' : '') : 'No additional context provided'}`;
      console.log(`Task pack trigger matched: ${trigger} -> ${taskPackId}`);
      console.log(`Task description: ${taskDescription}`);
      
      try {
        const featureRef = `feature/issue-${issue.number}`;
        
        // Create feature branch from develop if it doesn't exist
        try {
          // Check if branch exists
          await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
            owner: repo.owner.login,
            repo: repo.name,
            ref: `heads/${featureRef}`
          });
          console.log(`Branch ${featureRef} already exists`);
        } catch (error) {
          if (error.status === 404) {
            // Branch doesn't exist, create it
            console.log(`Creating branch ${featureRef} from develop`);
            
            // Get develop branch SHA
            const developRef = await octokit.request('GET /repos/{owner}/{repo}/git/ref/{ref}', {
              owner: repo.owner.login,
              repo: repo.name,
              ref: 'heads/develop'
            });
            
            // Create new branch
            await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
              owner: repo.owner.login,
              repo: repo.name,
              ref: `refs/heads/${featureRef}`,
              sha: developRef.data.object.sha
            });
            
            console.log(`Successfully created branch ${featureRef}`);
          } else {
            throw error;
          }
        }
        
        // DON'T trigger workflow_dispatch - let consumer workflow handle via issue_comment
        console.log(`Branch created and status posted for ${taskPackId} - workflow will be triggered by user's comment`);
        
        // Create PR after workflow creates commits (async, don't wait)
        createPRWhenReady(octokit, repo, issue, featureRef).catch(err => 
          console.error(`Failed to create PR for ${featureRef}:`, err.message)
        );
        
        // Comment on issue to acknowledge
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: issue.number,
          body: `🤖 **${taskPackId.charAt(0).toUpperCase() + taskPackId.slice(1)} task started**\n\nTriggered by: ${trigger}\nBranch: \`feature/issue-${issue.number}\`\n\nWatch progress in [Actions](https://github.com/${repo.owner.login}/${repo.name}/actions)`
        });
        
        return; // Only trigger once per comment
      } catch (error) {
        console.error(`Failed to dispatch ${taskPackId} task pack:`, error);
        
        // Comment on issue about error
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: issue.number,
          body: `❌ **Failed to start ${taskPackId} task**\n\nError: ${error.message}\n\nPlease check the GitHub App configuration.`
        });
      }
    }
  }
  
  // Check for approval triggers (same dispatch pattern as tasks)
  for (const [trigger, approvalType] of Object.entries(APPROVAL_TRIGGERS)) {
    const pattern = new RegExp(`^\\s*${trigger.replace('/', '\\/')}(?:\\s+(.+))?\\s*$`, 'm');
    const match = comment.match(pattern);
    
    if (match) {
      const phase = approvalType.replace('approve-', '').replace('revise-', '');
      console.log(`Approval trigger matched: ${trigger} -> ${approvalType}`);
      
      try {
        // Post next phase trigger comment (silent approval)
        const nextPhase = {
          'research': 'plan',
          'plan': 'implement', 
          'implement': 'validate',
          'validate': 'complete'
        }[phase] || 'complete';
        
        if (nextPhase !== 'complete') {
          await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
            owner: repo.owner.login,
            repo: repo.name,
            issue_number: issue.number,
            body: `/atriumn-${nextPhase}`
          });
        }
        
        console.log(`Approval complete: ${phase} -> ${nextPhase}`);
        return;
      } catch (error) {
        console.error(`Failed to process ${approvalType}:`, error);
        
        await octokit.request('POST /repos/{owner}/{repo}/issues/{issue_number}/comments', {
          owner: repo.owner.login,
          repo: repo.name,
          issue_number: issue.number,
          body: `❌ **Failed to process ${approvalType}**\n\nError: ${error.message}`
        });
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
  const port = process.env.PORT || 3002;
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