// This file tests the app's orchestration logic in a controlled, offline environment.

// Mock environment variables before importing the app
process.env.GITHUB_APP_ID = '12345';
process.env.GITHUB_PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA1234567890ABCDEF\n-----END RSA PRIVATE KEY-----';
process.env.GITHUB_WEBHOOK_SECRET = 'test-webhook-secret';

const myApp = require('./app');

// Mock the entire octokit instance
const mockOctokit = {
  actions: { createWorkflowDispatch: jest.fn().mockResolvedValue({}) },
  checks: { listForRef: jest.fn().mockResolvedValue({ data: { check_runs: [] } }) },
  git: {
    createRef: jest.fn().mockResolvedValue({}),
    getRef: jest.fn().mockResolvedValue({ data: { object: { sha: 'abc123' } } }),
    getCommit: jest.fn().mockResolvedValue({ data: { tree: { sha: 'def456' } } }),
    createCommit: jest.fn().mockResolvedValue({ data: { sha: 'ghi789' } }),
    updateRef: jest.fn().mockResolvedValue({}),
  },
  issues: { createComment: jest.fn().mockResolvedValue({}) },
  pulls: { create: jest.fn().mockResolvedValue({ data: { number: 42 } }) },
  repos: { 
    get: jest.fn().mockResolvedValue({ data: { default_branch: 'main' } }),
    createOrUpdateFileContents: jest.fn().mockResolvedValue({})
  },
};

describe('Atriumn GitHub App Logic', () => {
  beforeEach(() => {
    // Mock the getInstallationOctokit method
    myApp.getInstallationOctokit = jest.fn().mockResolvedValue(mockOctokit);
    jest.clearAllMocks();
  });

  describe('pull_request_review handler', () => {
    it('should dispatch "plan" phase after "research" is approved', async () => {
      // Mock the check runs to indicate research phase completed successfully
      mockOctokit.checks.listForRef.mockResolvedValue({
        data: { check_runs: [{ name: 'Atriumn Phase: Research', conclusion: 'success' }] },
      });

      const payload = {
        review: { state: 'approved' },
        pull_request: { 
          number: 42, 
          head: { sha: 'abc123sha', ref: 'feature/issue-123' }, 
          body: 'This is a test PR\n\nCloses #123' 
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
      };

      // Trigger the pull_request_review.submitted event
      await myApp.webhooks.receive({
        id: '123',
        name: 'pull_request_review.submitted',
        payload: payload,
      });

      // Verify workflow dispatch was called with correct parameters
      expect(mockOctokit.actions.createWorkflowDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          workflow_id: 'development-pipeline.yml',
          ref: 'feature/issue-123',
          inputs: expect.objectContaining({
            phase: 'plan',
            issue_number: '123',
            pr_number: '42',
            head_sha: 'abc123sha',
          }),
        })
      );
    });

    it('should not dispatch workflow when review is not approved', async () => {
      const payload = {
        review: { state: 'changes_requested' },
        pull_request: { 
          number: 42, 
          head: { sha: 'abc123sha', ref: 'feature/issue-123' }, 
          body: 'Closes #123' 
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
      };

      await myApp.webhooks.receive({
        id: '124',
        name: 'pull_request_review.submitted',
        payload: payload,
      });

      // Should not dispatch workflow for non-approved reviews
      expect(mockOctokit.actions.createWorkflowDispatch).not.toHaveBeenCalled();
    });
  });

  describe('issue_comment handler', () => {
    it('should create branch and PR when /atriumn-research is commented', async () => {
      const payload = {
        comment: { body: '/atriumn-research' },
        issue: { number: 123, title: 'Test Issue' },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
        sender: { type: 'User' },
      };

      await myApp.webhooks.receive({
        id: '125',
        name: 'issue_comment.created',
        payload: payload,
      });

      // Verify branch creation
      expect(mockOctokit.git.createRef).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          ref: 'refs/heads/feature/issue-123',
        })
      );

      // Verify PR creation
      expect(mockOctokit.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          title: expect.stringContaining('Issue #123'),
          head: 'feature/issue-123',
          draft: true,
        })
      );

      // Verify workflow dispatch
      expect(mockOctokit.actions.createWorkflowDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          inputs: expect.objectContaining({
            phase: 'research',
            issue_number: '123',
          }),
        })
      );
    });

    it('should ignore bot comments', async () => {
      const payload = {
        comment: { body: '/atriumn-research' },
        issue: { number: 123, title: 'Test Issue' },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
        sender: { type: 'Bot' },
      };

      await myApp.webhooks.receive({
        id: '126',
        name: 'issue_comment.created',
        payload: payload,
      });

      // Should not create branch/PR for bot comments
      expect(mockOctokit.git.createRef).not.toHaveBeenCalled();
      expect(mockOctokit.pulls.create).not.toHaveBeenCalled();
    });
  });

  describe('installation handlers', () => {
    it('should create onboarding PR when app is installed', async () => {
      const payload = {
        installation: { 
          id: 12345,
          account: { login: 'test-owner' }
        },
        repositories: [
          { name: 'test-repo' }
        ]
      };

      await myApp.webhooks.receive({
        id: '127',
        name: 'installation.created',
        payload: payload,
      });

      // Verify onboarding PR creation flow
      expect(mockOctokit.repos.get).toHaveBeenCalledWith({ owner: 'test-owner', repo: 'test-repo' });
      expect(mockOctokit.git.getRef).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'test-owner', repo: 'test-repo', ref: 'heads/main' })
      );
      expect(mockOctokit.git.createRef).toHaveBeenCalledWith(
        expect.objectContaining({ owner: 'test-owner', repo: 'test-repo', ref: 'refs/heads/atriumn/setup' })
      );
      
      // Should create multiple files (workflow + task packs)
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          path: '.github/workflows/development-pipeline.yml',
          branch: 'atriumn/setup'
        })
      );
      
      // Should also create task pack files
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          path: '.atriumn/task-packs/research.md',
          branch: 'atriumn/setup'
        })
      );
      
      expect(mockOctokit.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'test-repo',
          title: '🚀 Configure Atriumn Issue-Driven Development',
          head: 'atriumn/setup'
        })
      );
    });

    it('should create onboarding PR when repositories are added', async () => {
      const payload = {
        installation: { 
          id: 12345,
          account: { login: 'test-owner' }
        },
        repositories_added: [
          { name: 'new-repo' }
        ]
      };

      await myApp.webhooks.receive({
        id: '128',
        name: 'installation_repositories.added',
        payload: payload,
      });

      expect(mockOctokit.pulls.create).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'test-owner',
          repo: 'new-repo',
          title: '🚀 Configure Atriumn Issue-Driven Development'
        })
      );
    });

    it('should handle onboarding errors gracefully', async () => {
      // Mock an error in the repos.get call
      mockOctokit.repos.get.mockRejectedValueOnce(new Error('API Error'));
      
      const payload = {
        installation: { 
          id: 12345,
          account: { login: 'test-owner' }
        },
        repositories: [
          { name: 'failing-repo' }
        ]
      };

      // Should not throw - errors are caught and logged
      await expect(myApp.webhooks.receive({
        id: '129',
        name: 'installation.created',
        payload: payload,
      })).resolves.not.toThrow();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle PR with no issue number in body', async () => {
      mockOctokit.checks.listForRef.mockResolvedValue({
        data: { check_runs: [{ name: 'Atriumn Phase: Research', conclusion: 'success' }] },
      });

      const payload = {
        review: { state: 'approved' },
        pull_request: { 
          number: 42, 
          head: { sha: 'abc123sha', ref: 'feature/issue-123' }, 
          body: 'This PR has no issue reference'
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
      };

      await myApp.webhooks.receive({
        id: '130',
        name: 'pull_request_review.submitted',
        payload: payload,
      });

      // Should create an error comment
      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Error processing approval')
        })
      );
      expect(mockOctokit.actions.createWorkflowDispatch).not.toHaveBeenCalled();
    });

    it('should handle validate phase completion', async () => {
      mockOctokit.checks.listForRef.mockResolvedValue({
        data: { check_runs: [{ name: 'Atriumn Phase: Validate', conclusion: 'success' }] },
      });

      const payload = {
        review: { state: 'approved' },
        pull_request: { 
          number: 42, 
          head: { sha: 'abc123sha', ref: 'feature/issue-123' }, 
          body: 'Closes #123'
        },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
      };

      await myApp.webhooks.receive({
        id: '131',
        name: 'pull_request_review.submitted',
        payload: payload,
      });

      // Should post completion comment
      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('All phases are complete')
        })
      );
      expect(mockOctokit.actions.createWorkflowDispatch).not.toHaveBeenCalled();
    });

    it('should handle issue_comment errors gracefully', async () => {
      // Mock git.createRef to fail
      mockOctokit.git.createRef.mockRejectedValueOnce(new Error('Git API Error'));

      const payload = {
        comment: { body: '/atriumn-research' },
        issue: { number: 123, title: 'Test Issue' },
        repository: { name: 'test-repo', owner: { login: 'test-owner' } },
        installation: { id: 12345 },
        sender: { type: 'User' },
      };

      await myApp.webhooks.receive({
        id: '132',
        name: 'issue_comment.created',
        payload: payload,
      });

      // Should post error comment
      expect(mockOctokit.issues.createComment).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Error starting pipeline')
        })
      );
    });
  });
});