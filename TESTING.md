# Integration Test Plan

This document outlines the steps for performing an end-to-end integration test of the Atriumn Issue-Driven Development pipeline.

### Prerequisites

1.  A dedicated GitHub repository for testing.
2.  The Atriumn GitHub App installed on the test repository.
3.  The app's webhook pointing to a development or staging deployment.
4.  A `CLAUDE_CODE_OAUTH_TOKEN` secret configured in the test repository's Actions secrets.

### Test Case 1: Full End-to-End Workflow

**Objective:** Verify that the pipeline can be triggered and progresses through all phases based on PR approvals.

**Steps:**

1.  **Onboarding:**
    *   Uninstall and then reinstall the GitHub App on the test repository.
    *   **Expected:** The app should automatically create a new PR titled "🚀 Configure Atriumn Issue-Driven Development".
    *   Merge this PR.

2.  **Trigger Research:**
    *   Create a new issue in the test repository. Title: `E2E Test: Full Pipeline`.
    *   Comment on the issue: `/atriumn-research`.
    *   **Expected:**
        *   The app comments on the issue, confirming the pipeline has started and links to a new Draft PR.
        *   A new branch `feature/issue-<number>` is created.
        *   A Draft PR is opened.
        *   A status check `Atriumn Phase: Research` appears on the PR in a "pending" state.

3.  **Complete Research Phase:**
    *   Wait for the research workflow to complete.
    *   **Expected:**
        *   The `Atriumn Phase: Research` check turns green (success).
        *   The PR is updated with a new commit containing the research and decision record artifacts in the `thoughts/` directory.

4.  **Approve Research to Trigger Plan:**
    *   Go to the "Files Changed" tab on the PR and review the generated artifacts.
    *   Submit a formal PR Review with the "Approve" option.
    *   **Expected:**
        *   The app comments on the PR, confirming receipt of the approval and the start of the "plan" phase.
        *   A new status check `Atriumn Phase: Plan` appears in a "pending" state.

5.  **Complete and Approve Plan:**
    *   Wait for the plan workflow to complete.
    *   **Expected:** The `Atriumn Phase: Plan` check turns green, and a new commit with the plan artifact is added to the PR.
    *   Submit another "Approve" review on the PR.

6.  **Complete and Approve Implement & Validate:**
    *   Repeat the wait-and-approve cycle for the `implement` and `validate` phases.
    *   **Expected:** The PR is updated with code commits. The `implement` and `validate` checks turn green.

7.  **Final State:**
    *   **Expected:** The PR should have four successful status checks. The app should post a final comment indicating the PR is ready for final review and merge. The PR should no longer be a draft.

### Test Case 2: Workflow Failure

**Objective:** Verify that a phase failure is correctly reported in the status check.

**Steps:**

1.  Trigger the `research` phase as in Test Case 1.
2.  Manually cause the workflow to fail (e.g., by providing an invalid tool name in `development-pipeline.yml` temporarily).
3.  **Expected:** The `Atriumn Phase: Research` status check on the PR should turn red (failure) and provide a link to the failed workflow run.