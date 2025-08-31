require('dotenv').config();
const { App } = require('@octokit/app');
const fs = require('fs').promises;
const path = require('path');

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET,
  },
});

// --- START: Onboarding and Template Logic ---

// Helper to recursively get all template files
async function getTemplateFiles(dir) {
  const dirents = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    const repoPath = path.relative(path.join(__dirname, '..', 'templates', 'pipeline'), res);
    return dirent.isDirectory() ? getTemplateFiles(res) : {
      path: repoPath,
      content: fs.readFile(res, 'utf-8')
    };
  }));
  return Array.prototype.concat(...files);
}

// The new onboarding function
async function createOnboardingPR(octokit, owner, repo) {
    const setupBranch = 'atriumn/setup';
    try {
        const defaultBranch = await octokit.repos.get({ owner, repo }).then(r => r.data.default_branch);
        const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
        await octokit.git.createRef({ owner, repo, ref: `refs/heads/${setupBranch}`, sha: ref.object.sha });
        
        const templateDir = path.join(__dirname, '..', 'templates', 'pipeline');
        const filesToAdd = await getTemplateFiles(templateDir);
        
        // Process files in parallel for better performance
        const filePromises = filesToAdd.map(async (file) => {
            const content = await file.content;
            return octokit.repos.createOrUpdateFileContents({
                owner, repo, path: file.path,
                message: `feat: Add Atriumn pipeline file - ${file.path}`,
                content: Buffer.from(content).toString('base64'),
                branch: setupBranch
            }).then(() => {
                console.log(`Added file: ${file.path}`);
            });
        });
        
        await Promise.all(filePromises);

        const prTitle = '🚀 Configure Atriumn Issue-Driven Development';
        const prBody = `Welcome to Atriumn! Merge this pull request to install the self-contained AI development pipeline.

**What this PR adds:**
*   **Workflows:** The complete GitHub Actions workflow in \`.github/workflows/\`.
*   **AI Prompts:** All necessary task packs for the AI agent in \`.atriumn/\`.

By merging this, your repository will be fully equipped to run the pipeline with no external dependencies.`;
        
        await octokit.pulls.create({ owner, repo, title: prTitle, head: setupBranch, base: defaultBranch, body: prBody });
        console.log(`Created onboarding PR for ${owner}/${repo}.`);
    } catch (error) {
        console.error(`Failed to create onboarding PR for ${owner}/${repo}:`, error);
    }
}

app.webhooks.on('installation.created', async ({ payload }) => {
  const octokit = await app.getInstallationOctokit(payload.installation.id);
  const owner = payload.installation.account.login;
  for (const repo of payload.repositories) {
    await createOnboardingPR(octokit, owner, repo.name);
  }
});

app.webhooks.on('installation_repositories.added', async ({ payload }) => {
  const octokit = await app.getInstallationOctokit(payload.installation.id);
  const owner = payload.installation.account.login;
  for (const repo of payload.repositories_added) {
    await createOnboardingPR(octokit, owner, repo.name);
  }
});

// --- END: Onboarding and Template Logic ---


// --- START: Core Pipeline Orchestration Logic ---

app.webhooks.on('issue_comment.created', async ({ payload }) => {
  const octokit = await app.getInstallationOctokit(payload.installation.id);
  const commentBody = payload.comment.body || '';
  const issue = payload.issue;
  const repo = payload.repository;
  const owner = repo.owner.login;
  const featureRef = `feature/issue-${issue.number}`;

  if (!commentBody.includes('/atriumn-research') || payload.sender.type === 'Bot') {
    return;
  }
  
  console.log(`'/atriumn-research' triggered for issue #${issue.number}.`);

  try {
    const defaultBranch = await octokit.repos.get({ owner, repo: repo.name }).then(r => r.data.default_branch);
    const { data: ref } = await octokit.git.getRef({ owner, repo: repo.name, ref: `heads/${defaultBranch}` });
    await octokit.git.createRef({ owner, repo: repo.name, ref: `refs/heads/${featureRef}`, sha: ref.object.sha });
    console.log(`Created branch ${featureRef}.`);

    const { data: latestCommit } = await octokit.git.getCommit({ owner, repo: repo.name, commit_sha: ref.object.sha });
    const { data: newCommit } = await octokit.git.createCommit({
        owner, repo: repo.name, message: `feat: Initialize pipeline for issue #${issue.number}`,
        tree: latestCommit.tree.sha, parents: [latestCommit.sha]
    });
    await octokit.git.updateRef({ owner, repo: repo.name, ref: `heads/${featureRef}`, sha: newCommit.sha });
    console.log(`Created initial commit ${newCommit.sha}.`);
    
    const prTitle = `WIP: Implementation for Issue #${issue.number} - ${issue.title}`;
    const prBody = `This is a draft PR for issue #${issue.number}. It will be updated automatically by the Atriumn development pipeline.\n\n**Phases:**\n- [ ] Research\n- [ ] Plan\n- [ ] Implement\n- [ ] Validate\n\nCloses #${issue.number}`;
    const { data: pr } = await octokit.pulls.create({ owner, repo: repo.name, title: prTitle, head: featureRef, base: defaultBranch, body: prBody, draft: true });
    console.log(`Created Draft PR #${pr.number}.`);
    
    await octokit.actions.createWorkflowDispatch({
      owner, repo: repo.name, workflow_id: 'development-pipeline.yml', ref: featureRef,
      inputs: {
        phase: 'research', issue_number: issue.number.toString(), pr_number: pr.number.toString(),
        head_sha: newCommit.sha, task_description: issue.title
      },
    });
    
    await octokit.issues.createComment({
      owner, repo: repo.name, issue_number: issue.number,
      body: `🚀 **Pipeline Started!**\n\nA Draft PR has been created to track progress: **#${pr.number}**.\n\nThe **research** phase is now in progress. Watch for status updates on the PR.`
    });
  } catch (error) {
    console.error('Failed to start pipeline:', error);
    await octokit.issues.createComment({
      owner, repo: repo.name, issue_number: issue.number,
      body: `❌ **Error starting pipeline:**\n\`\`\`\n${error.message}\n\`\`\``
    });
  }
});

async function determineCurrentPhase(octokit, owner, repo, ref) {
  const { data: { check_runs } } = await octokit.checks.listForRef({ owner, repo, ref });
  
  const phaseOrder = ['validate', 'implement', 'plan', 'research'];
  for (const phase of phaseOrder) {
    const checkName = `Atriumn Phase: ${phase.charAt(0).toUpperCase() + phase.slice(1)}`;
    const check = check_runs.find(run => run.name === checkName && run.conclusion === 'success');
    if (check) {
      console.log(`Found last successful phase: ${phase}`);
      return phase;
    }
  }
  return null;
}

app.webhooks.on('pull_request_review.submitted', async ({ payload }) => {
  const octokit = await app.getInstallationOctokit(payload.installation.id);
  if (payload.review.state !== 'approved') return;

  const pr = payload.pull_request;
  const repo = payload.repository;
  const owner = repo.owner.login;

  console.log(`Received approval on PR #${pr.number}.`);

  try {
    const currentPhase = await determineCurrentPhase(octokit, owner, repo.name, pr.head.sha);
    const phaseProgression = { 'research': 'plan', 'plan': 'implement', 'implement': 'validate' };
    const nextPhase = phaseProgression[currentPhase];

    if (!nextPhase) {
      if (currentPhase === 'validate') {
        await octokit.issues.createComment({ owner, repo: repo.name, issue_number: pr.number, body: '✅ All phases are complete and approved. This PR is ready for final review and merge.' });
      }
      return;
    }

    const issueNumberMatch = pr.body.match(/Closes #(\d+)|Issue #(\d+)/);
    if (!issueNumberMatch) throw new Error("Could not find a linked issue number in the PR body.");
    const issueNumber = issueNumberMatch[1] || issueNumberMatch[2];

    await octokit.actions.createWorkflowDispatch({
      owner, repo: repo.name, workflow_id: 'development-pipeline.yml', ref: pr.head.ref,
      inputs: {
        phase: nextPhase, issue_number: issueNumber, pr_number: pr.number.toString(),
        head_sha: pr.head.sha, task_description: pr.title
      },
    });

    await octokit.issues.createComment({ owner, repo: repo.name, issue_number: pr.number, body: `🚀 Approval received! Kicking off the **${nextPhase}** phase.` });
  } catch (error) {
    console.error('Failed to process PR approval:', error);
    await octokit.issues.createComment({ owner, repo: repo.name, issue_number: pr.number, body: `❌ **Error processing approval:**\n\`\`\`\n${error.message}\n\`\`\`` });
  }
});

// --- END: Core Pipeline Orchestration Logic ---


// --- Boilerplate ---
app.webhooks.onError((error) => {
  console.error(`Error processing webhook!`, error);
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  const http = require('http');
  const { createNodeMiddleware } = require('@octokit/webhooks');
  http.createServer(createNodeMiddleware(app.webhooks)).listen(port, () => {
    console.log(`Server listening for events at http://localhost:${port}`);
  });
}