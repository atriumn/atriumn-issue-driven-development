require('dotenv').config();
const { App } = require('@octokit/app');

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
  webhooks: {
    secret: process.env.GITHUB_WEBHOOK_SECRET,
  },
});

// --- START: Onboarding and Template Logic ---

const WORKFLOW_TEMPLATE = `name: Atriumn Development Pipeline
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

jobs:
  run-atriumn-phase:
    uses: atriumn/atriumn-issue-driven-development/.github/workflows/development-pipeline.yml@main
    secrets: inherit
    with:
      repo_name: \${{ github.repository }}
      phase: \${{ inputs.phase }}
      issue_number: \${{ inputs.issue_number }}
      pr_number: \${{ inputs.pr_number }}
      head_sha: \${{ inputs.head_sha }}
      task_description: \${{ inputs.task_description }}
`;

async function createOnboardingPR(octokit, owner, repo) {
  const workflowPath = '.github/workflows/development-pipeline.yml';
  const setupBranch = 'atriumn/setup';

  try {
    const defaultBranch = await octokit.repos.get({ owner, repo }).then(r => r.data.default_branch);
    const { data: ref } = await octokit.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });

    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${setupBranch}`, sha: ref.object.sha });
    console.log(`Created setup branch '${setupBranch}' for ${owner}/${repo}.`);

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: workflowPath,
      message: 'feat: Add Atriumn development pipeline workflow',
      content: Buffer.from(WORKFLOW_TEMPLATE).toString('base64'),
      branch: setupBranch,
    });
    console.log(`Added workflow file to ${owner}/${repo}.`);

    const prTitle = '🚀 Configure Atriumn Issue-Driven Development';
    const prBody = `Welcome to Atriumn! To enable AI-powered development, please review and merge this pull request.

**What this PR adds:**
*   \`${workflowPath}\`: The workflow that runs the Atriumn AI development phases.

**Next Steps:**
1.  (Optional) Create a \`.github/development-pipeline-config.yml\` file to customize behavior.
2.  Merge this pull request.
3.  Create a new issue and comment \`/atriumn-research\` to start!`;

    await octokit.pulls.create({ owner, repo, title: prTitle, head: setupBranch, base: defaultBranch, body: prBody });
    console.log(`Created onboarding PR for ${owner}/${repo}.`);
  } catch (error) {
    console.error(`Failed to create onboarding PR for ${owner}/${repo}:`, error);
  }
}

app.webhooks.on('installation.created', async ({ payload }) => {
  const octokit = await app.getInstallationOctokit(payload.installation.id);
  for (const repo of payload.repositories) {
    await createOnboardingPR(octokit, repo.owner.login, repo.name);
  }
});

app.webhooks.on('installation_repositories.added', async ({ payload }) => {
  const octokit = await app.getInstallationOctokit(payload.installation.id);
  for (const repo of payload.repositories_added) {
    await createOnboardingPR(octokit, repo.owner.login, repo.name);
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