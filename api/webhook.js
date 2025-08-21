// Vercel serverless function handler for GitHub webhooks
const crypto = require('crypto');

module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const signature = req.headers['x-hub-signature-256'];
    const body = JSON.stringify(req.body);
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    
    if (signature && secret) {
      const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const event = req.headers['x-github-event'];
    console.log('Webhook received:', event);

    // Handle installation.created event
    if (event === 'installation' && req.body.action === 'created') {
      const { installation, repositories } = req.body;
      
      // Import Octokit here to avoid module issues
      const { Octokit } = await import('@octokit/rest');
      const { createAppAuth } = await import('@octokit/auth-app');
      
      const octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: process.env.GITHUB_APP_ID,
          privateKey: process.env.GITHUB_PRIVATE_KEY,
          installationId: installation.id,
        },
      });

      // Process each repository
      for (const repo of repositories) {
        try {
          const owner = repo.owner?.login || installation.account.login;
          const repoName = repo.name;
          
          console.log(`Creating onboarding PR for ${owner}/${repoName}`);
          
          // Get default branch
          const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
          const defaultBranch = repoData.default_branch;
          
          // Get the base branch ref
          const { data: ref } = await octokit.git.getRef({ 
            owner, 
            repo: repoName, 
            ref: `heads/${defaultBranch}` 
          });
          
          // Create setup branch
          const setupBranch = 'atriumn/setup';
          await octokit.git.createRef({
            owner,
            repo: repoName,
            ref: `refs/heads/${setupBranch}`,
            sha: ref.object.sha
          });
          
          // Template files content
          const files = [
            {
              path: '.github/workflows/development-pipeline.yml',
              content: `name: Atriumn Development Pipeline

on:
  workflow_dispatch:
    inputs:
      phase:
        description: 'The pipeline phase to run (research, plan, implement, validate)'
        required: true
        type: string
      issue_number:
        description: 'The issue number'
        required: true
        type: string
      pr_number:
        description: 'The pull request number'
        required: true
        type: string
      head_sha:
        description: 'The SHA of the commit to run checks against'
        required: true
        type: string
      task_description:
        description: 'The task description for the AI'
        required: false
        type: string

permissions:
  contents: write
  issues: write
  pull-requests: write
  checks: write

jobs:
  run-phase:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4
        with:
          ref: feature/issue-\${{ inputs.issue_number }}
          token: \${{ secrets.GITHUB_TOKEN }}

      - name: Run Claude Code Agent
        uses: anthropics/claude-code-action@beta
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          github_token: \${{ secrets.GITHUB_TOKEN }}
          timeout_minutes: 40
          direct_prompt: |
            Task: \${{ inputs.task_description }}
            Phase: \${{ inputs.phase }}
            Issue: #\${{ inputs.issue_number }}
`
            },
            {
              path: '.atriumn/README.md',
              content: '# Atriumn Pipeline Configuration\n\nThis directory contains AI task configurations for the Atriumn development pipeline.'
            }
          ];
          
          // Create files
          for (const file of files) {
            await octokit.repos.createOrUpdateFileContents({
              owner,
              repo: repoName,
              path: file.path,
              message: `feat: Add ${file.path}`,
              content: Buffer.from(file.content).toString('base64'),
              branch: setupBranch
            });
          }
          
          // Create PR
          await octokit.pulls.create({
            owner,
            repo: repoName,
            title: '🚀 Configure Atriumn Issue-Driven Development',
            head: setupBranch,
            base: defaultBranch,
            body: `Welcome to Atriumn! Merge this PR to enable AI-powered development.

**What this adds:**
- GitHub Actions workflow for AI development phases
- Configuration directory for task definitions

**Next steps:**
1. Merge this PR
2. Create an issue describing what you want to build
3. Comment \`/atriumn-research\` to start!`
          });
          
          console.log(`Successfully created onboarding PR for ${owner}/${repoName}`);
        } catch (error) {
          console.error(`Failed to process ${repo.name}:`, error.message);
        }
      }
    }

    // Handle issue_comment.created event  
    if (event === 'issue_comment' && req.body.action === 'created') {
      const comment = req.body.comment.body || '';
      
      if (comment.includes('/atriumn-research')) {
        // This would trigger the research phase
        console.log('Research command received');
      }
    }

    return res.status(200).json({ 
      status: 'accepted',
      event: event,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(200).json({ 
      status: 'accepted',
      error: error.message
    });
  }
};