# Atriumn Issue-Driven Development

An AI-powered development pipeline that turns GitHub issues into complete, production-ready code using a robust, PR-centric workflow.

## How It Works

Atriumn transforms the software development lifecycle by leveraging an AI agent orchestrated through native GitHub features. The entire process is tracked in a single Pull Request, providing a clear, auditable history from issue creation to merged code.

1.  **Start with an Issue**: A developer creates a GitHub issue and triggers the pipeline with a simple comment: `/atriumn-research`.
2.  **Automated Setup**: The Atriumn GitHub App instantly creates a feature branch and a **Draft Pull Request**. This PR becomes the central hub for the entire task.
3.  **Phased Execution**: The AI agent executes the development process in four distinct, gated phases:
    *   **Research**: The AI analyzes the codebase and commits a detailed research document to the PR.
    *   **Plan**: After human approval, the AI generates and commits a complete implementation plan.
    *   **Implement**: With the plan approved, the AI writes the code, creates tests, and pushes commits to the PR.
    *   **Validate**: The AI runs final checks against the code to ensure it meets the plan's success criteria.
4.  **Gated Approvals**: Progress between phases is controlled by formal **GitHub PR Reviews**. A developer simply clicks "Approve" on the PR to advance the pipeline.
5.  **Real-Time Status**: Each phase is represented by a **GitHub Status Check** on the PR, giving everyone instant visibility into the AI's progress.

 <!-- It would be great to create a diagram for this -->

## Features

-   ✅ **PR-Centric Workflow**: All activity—code, artifacts, approvals, and status—is centralized in a single Pull Request.
-   🔒 **Native Approvals**: Uses GitHub's own secure and auditable PR Review system for human gates.
-   📊 **Live Status Checks**: Real-time visibility into the AI's progress directly on the PR.
-   🚀 **One-Click Onboarding**: Install the GitHub App, and it will automatically create a PR to set up your repository.
-   🔧 **Highly Configurable**: Customize validation rules, test commands, and more for each repository.

## Getting Started (One-Click Installation)

1.  **Install the GitHub App**: Install the "Atriumn Issue-Driven Development" app on your chosen repositories.
2.  **Merge the Onboarding PR**: The app will automatically create a Pull Request titled "🚀 Configure Atriumn Issue-Driven Development". Review and merge it.
3.  **Start Developing**: Create a GitHub issue and comment `/atriumn-research` to kick off your first AI-driven development cycle!

## Architecture

Atriumn is built on a robust, event-driven architecture that combines a GitHub App with reusable GitHub Actions workflows.

-   **The GitHub App**: Acts as the central orchestrator. It listens for installation events, initial triggers (`/atriumn-research`), and PR review approvals. It then dispatches the appropriate workflow.
-   **Reusable Workflow (`development-pipeline.yml`)**: This is the engine that executes each phase. It creates status checks, runs the Claude Code AI agent with the correct "task pack," and commits the results.
-   **Consumer Workflow**: A lightweight workflow in your repository (created by the onboarding PR) that simply receives the `workflow_dispatch` events from the app.

This design ensures logic is centralized and updated in one place, while consumer repositories remain clean and easy to manage.