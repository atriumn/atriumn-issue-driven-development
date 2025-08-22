// Vercel serverless function handler for GitHub webhooks
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Read workflow template file only
async function getTemplateFiles() {
  const templateDir = path.join(__dirname, '..', 'templates', 'pipeline');
  const files = [];
  
  // Only read the thin workflow file - no task-packs
  const workflowContent = await fs.readFile(
    path.join(templateDir, '.github', 'workflows', 'development-pipeline.yml'), 
    'utf-8'
  );
  files.push({
    path: '.github/workflows/development-pipeline.yml',
    content: workflowContent
  });
  
  return files;
}

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
    const action = req.body.action;
    console.log(`Webhook received: event=${event}, action=${action}`);
    
    // Debug logging for ALL events
    if (event === 'pull_request_review') {
      console.log('PULL_REQUEST_REVIEW EVENT RECEIVED!');
      console.log('Full payload:', JSON.stringify(req.body, null, 2));
    }

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

      // Get template files
      const templateFiles = await getTemplateFiles();
      console.log(`Loaded ${templateFiles.length} template files`);

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
          try {
            await octokit.git.createRef({
              owner,
              repo: repoName,
              ref: `refs/heads/${setupBranch}`,
              sha: ref.object.sha
            });
          } catch (error) {
            if (error.status === 422) {
              // Branch already exists, delete and recreate
              await octokit.git.deleteRef({
                owner,
                repo: repoName,
                ref: `heads/${setupBranch}`
              });
              await octokit.git.createRef({
                owner,
                repo: repoName,
                ref: `refs/heads/${setupBranch}`,
                sha: ref.object.sha
              });
            } else {
              throw error;
            }
          }
          
          // Create all template files
          for (const file of templateFiles) {
            console.log(`Creating ${file.path}`);
            await octokit.repos.createOrUpdateFileContents({
              owner,
              repo: repoName,
              path: file.path,
              message: `feat: Add Atriumn pipeline file - ${file.path}`,
              content: Buffer.from(file.content).toString('base64'),
              branch: setupBranch
            });
          }
          
          // Create PR
          const prBody = `Welcome to Atriumn! This PR adds a lightweight workflow that connects your repository to the Atriumn AI development pipeline.

**What this PR adds:**
*   A single workflow file that triggers the Atriumn pipeline
*   Automatic updates when we improve the pipeline
*   No vendor lock-in - you can customize or remove at any time

**Next Steps:**
1. Merge this PR
2. Add the \`CLAUDE_CODE_OAUTH_TOKEN\` secret to your repository (get it from [Claude Code](https://github.com/apps/claude-code))
3. Create an issue describing what you want to build
4. Comment \`/atriumn-research\` to start the AI pipeline!

The pipeline will automatically fetch the latest AI prompts and logic from the Atriumn repository, ensuring you always have the most up-to-date version.`;

          await octokit.pulls.create({
            owner,
            repo: repoName,
            title: '🚀 Configure Atriumn Issue-Driven Development',
            head: setupBranch,
            base: defaultBranch,
            body: prBody
          });
          
          console.log(`Successfully created onboarding PR for ${owner}/${repoName}`);
        } catch (error) {
          console.error(`Failed to process ${repo.name}:`, error.message);
        }
      }
    }

    // Handle pull_request_review.submitted event for phase progression
    if (event === 'pull_request_review') {
      console.log(`Pull request review event: action=${req.body.action}, state=${req.body.review?.state}, PR=#${req.body.pull_request?.number}`);
      
      if (req.body.action !== 'submitted') {
        console.log('Review action is not submitted, ignoring');
        return res.status(200).json({ status: 'ignored', reason: 'not submitted action' });
      }
      
      if (req.body.review.state !== 'approved') {
        console.log('Review is not an approval, ignoring');
        return res.status(200).json({ status: 'ignored', reason: 'not an approval' });
      }
      
      // CRITICAL: Only process THIS specific approval event, not old ones
      const reviewId = req.body.review.id;
      const reviewSubmittedAt = req.body.review.submitted_at;
      
      const { pull_request: pr, repository } = req.body;
      const owner = repository.owner.login;
      const repoName = repository.name;
      
      console.log(`Processing NEW approval (review ${reviewId}) on PR #${pr.number} in ${owner}/${repoName}`);
      
      try {
        // Import Octokit
        const { Octokit } = await import('@octokit/rest');
        const { createAppAuth } = await import('@octokit/auth-app');
        
        const octokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_PRIVATE_KEY,
            installationId: req.body.installation.id,
          },
        });
        
        // Get all commits in the PR to check for phase completions
        const { data: commits } = await octokit.pulls.listCommits({
          owner,
          repo: repoName,
          pull_number: pr.number
        });
        
        // Check runs from all commits (phases create new commits)
        let check_runs = [];
        for (const commit of commits.slice(-5)) { // Check last 5 commits
          const { data: { check_runs: runs } } = await octokit.checks.listForRef({ 
            owner, 
            repo: repoName, 
            ref: commit.sha 
          });
          check_runs = check_runs.concat(runs);
        }
        
        const phaseOrder = ['validate', 'implement', 'plan', 'research'];
        let currentPhase = null;
        
        // Search in reverse order to find the most recent successful phase
        let lastPhaseCompletedAt = null;
        for (const phase of phaseOrder) {
          const checkName = `Atriumn Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`;
          const check = check_runs.find(run => run.name === checkName && run.conclusion === 'success');
          if (check) {
            currentPhase = phase;
            lastPhaseCompletedAt = check.completed_at;
            console.log(`Found last successful phase: ${phase} completed at ${lastPhaseCompletedAt}`);
            break;
          }
        }
        
        // CRITICAL: Check if this approval is AFTER the last phase completed
        if (lastPhaseCompletedAt && new Date(reviewSubmittedAt) < new Date(lastPhaseCompletedAt)) {
          console.log(`Approval (${reviewSubmittedAt}) is older than last phase completion (${lastPhaseCompletedAt}). Ignoring.`);
          await octokit.issues.createComment({ 
            owner, 
            repo: repoName, 
            issue_number: pr.number, 
            body: '⚠️ This approval was made before the last phase completed. Please approve again to trigger the next phase.' 
          });
          return res.status(200).json({ status: 'ignored', reason: 'approval predates phase completion' });
        }
        
        // Determine next phase
        const phaseProgression = { 
          'research': 'plan', 
          'plan': 'implement', 
          'implement': 'validate' 
        };
        
        // If no phase found, check if we should start from research
        if (!currentPhase) {
          console.log('No completed phases found, cannot determine next phase');
          await octokit.issues.createComment({ 
            owner, 
            repo: repoName, 
            issue_number: pr.number, 
            body: '⚠️ Could not determine the current phase from check runs. Please trigger the next phase manually or check the workflow status.' 
          });
          return res.status(200).json({ status: 'error', message: 'No completed phases found' });
        }
        
        const nextPhase = phaseProgression[currentPhase];
        
        if (!nextPhase) {
          if (currentPhase === 'validate') {
            await octokit.issues.createComment({ 
              owner, 
              repo: repoName, 
              issue_number: pr.number, 
              body: '✅ All phases are complete and approved. This PR is ready for final review and merge.' 
            });
          }
          return res.status(200).json({ status: 'complete', phase: currentPhase });
        }
        
        // Extract issue number from PR body
        const issueNumberMatch = pr.body.match(/Closes #(\d+)|Issue #(\d+)/);
        if (!issueNumberMatch) {
          throw new Error("Could not find a linked issue number in the PR body.");
        }
        const issueNumber = issueNumberMatch[1] || issueNumberMatch[2];
        
        // Trigger next phase
        await octokit.actions.createWorkflowDispatch({
          owner, 
          repo: repoName, 
          workflow_id: 'development-pipeline.yml', 
          ref: pr.head.ref,
          inputs: {
            phase: nextPhase, 
            issue_number: issueNumber, 
            pr_number: pr.number.toString(),
            head_sha: pr.head.sha, 
            task_description: pr.title
          },
        });
        
        await octokit.issues.createComment({ 
          owner, 
          repo: repoName, 
          issue_number: pr.number, 
          body: `🚀 Approval received! Kicking off the **${nextPhase}** phase.` 
        });
        
      } catch (error) {
        console.error('Failed to process PR approval:', error);
        
        const { Octokit } = await import('@octokit/rest');
        const { createAppAuth } = await import('@octokit/auth-app');
        
        const octokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_PRIVATE_KEY,
            installationId: req.body.installation.id,
          },
        });
        
        await octokit.issues.createComment({ 
          owner, 
          repo: repoName, 
          issue_number: pr.number, 
          body: `❌ **Error processing approval:**\n\`\`\`\n${error.message}\n\`\`\`` 
        });
      }
    }

    // Handle issue_comment.created event  
    if (event === 'issue_comment' && req.body.action === 'created') {
      const { issue, comment, repository } = req.body;
      const commentBody = comment.body || '';
      
      // Check for various trigger patterns
      const triggers = [
        '/atriumn-research',
        '/ai-build',
        '/claude-ship-it',
        '🚀🤖', // Rocket + Robot emoji combo
        '🧙‍♂️✨', // Wizard casting spell
        '⚡build', // Lightning build
      ];
      
      const isTriggered = triggers.some(trigger => commentBody.includes(trigger));
      
      if (isTriggered && req.body.sender.type !== 'Bot') {
        console.log(`Research command received for issue #${issue.number}`);
        
        // Import Octokit
        const { Octokit } = await import('@octokit/rest');
        const { createAppAuth } = await import('@octokit/auth-app');
        
        const octokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: process.env.GITHUB_APP_ID,
            privateKey: process.env.GITHUB_PRIVATE_KEY,
            installationId: req.body.installation.id,
          },
        });
        
        const owner = repository.owner.login;
        const repoName = repository.name;
        const featureRef = `feature/issue-${issue.number}`;
        
        try {
          // Get default branch
          const { data: repoData } = await octokit.repos.get({ owner, repo: repoName });
          const defaultBranch = repoData.default_branch;
          
          // Get ref
          const { data: ref } = await octokit.git.getRef({ 
            owner, 
            repo: repoName, 
            ref: `heads/${defaultBranch}` 
          });
          
          // Create feature branch
          await octokit.git.createRef({
            owner,
            repo: repoName,
            ref: `refs/heads/${featureRef}`,
            sha: ref.object.sha
          });
          
          // Create initial commit
          const { data: latestCommit } = await octokit.git.getCommit({ 
            owner, 
            repo: repoName, 
            commit_sha: ref.object.sha 
          });
          
          const { data: newCommit } = await octokit.git.createCommit({
            owner, 
            repo: repoName, 
            message: `feat: Initialize pipeline for issue #${issue.number}`,
            tree: latestCommit.tree.sha, 
            parents: [latestCommit.sha]
          });
          
          await octokit.git.updateRef({ 
            owner, 
            repo: repoName, 
            ref: `heads/${featureRef}`, 
            sha: newCommit.sha 
          });
          
          // Create Draft PR
          const prTitle = `WIP: Implementation for Issue #${issue.number} - ${issue.title}`;
          const prBody = `This is a draft PR for issue #${issue.number}. It will be updated automatically by the Atriumn development pipeline.

**Phases:**
- [ ] Research
- [ ] Plan
- [ ] Implement
- [ ] Validate

Closes #${issue.number}`;
          
          const { data: pr } = await octokit.pulls.create({ 
            owner, 
            repo: repoName, 
            title: prTitle, 
            head: featureRef, 
            base: defaultBranch, 
            body: prBody, 
            draft: true 
          });
          
          // Trigger the research phase
          await octokit.actions.createWorkflowDispatch({
            owner, 
            repo: repoName, 
            workflow_id: 'development-pipeline.yml', 
            ref: featureRef,
            inputs: {
              phase: 'research', 
              issue_number: issue.number.toString(), 
              pr_number: pr.number.toString(),
              head_sha: newCommit.sha, 
              task_description: issue.title
            },
          });
          
          // Post confirmation comment
          await octokit.issues.createComment({
            owner, 
            repo: repoName, 
            issue_number: issue.number,
            body: `🚀 **Pipeline Started!**

A Draft PR has been created to track progress: **#${pr.number}**.

The **research** phase is now in progress. Watch for status updates on the PR.`
          });
          
        } catch (error) {
          console.error('Failed to start pipeline:', error);
          
          await octokit.issues.createComment({
            owner, 
            repo: repoName, 
            issue_number: issue.number,
            body: `❌ **Error starting pipeline:**\n\`\`\`\n${error.message}\n\`\`\``
          });
        }
      }
    }

    console.log(`Unhandled event combination: event=${event}, action=${action}`);
    
    return res.status(200).json({ 
      status: 'accepted',
      event: event,
      action: action,
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