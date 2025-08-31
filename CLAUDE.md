# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

Atriumn Issue-Driven Development is an AI-powered GitHub App that orchestrates development pipelines using Claude Code. It transforms GitHub issues into complete, production-ready code through a gated, phased workflow tracked in Pull Requests.

## Key Commands

### Testing & Validation
```bash
# Run full validation test suite
make test

# Test individual validation scripts
make test-research DOC=thoughts/shared/research/my-research.md
make test-plan DOC=thoughts/shared/plans/my-plan.md
make test-implementation BRANCH=feature/issue-123
make test-pr PR=456

# Validate configuration files
make validate-config

# Run GitHub App tests
cd github-app && npm test
```

### Development
```bash
# Start GitHub App locally
cd github-app && npm start

# Development mode with auto-reload
cd github-app && npm run dev

# Check dependencies
make check-deps

# Create PR with proper formatting (CRITICAL for this repo)
./scripts/create-pr.sh ISSUE_NUM ISSUE_TITLE BRANCH_NAME BASE_BRANCH REPO_NAME VALIDATION_RESULTS RESEARCH_DOC PLAN_DOC DECISION_DOC
```

## Architecture & Flow

### Core Components

1. **GitHub App** (`github-app/app.js`)
   - Orchestrates the entire pipeline
   - Handles webhook events (installation, issues, PR reviews)
   - Dispatches workflows to consumer repositories
   - Creates onboarding PRs for new installations

2. **Reusable Workflow** (`.github/workflows/development-pipeline.yml`)
   - Executes the four phases: research, plan, implement, validate
   - Creates GitHub status checks
   - Runs Claude Code with phase-specific task packs
   - Commits results back to PR

3. **Action Definition** (`action.yml`)
   - Composite action for pipeline execution
   - Manages status checks and Claude Code invocations
   - Handles artifact storage and PR updates

### Pipeline Phases

Each phase is gated by PR approvals and represented by GitHub status checks:

1. **Research Phase**: Analyzes codebase, creates research document
2. **Plan Phase**: Generates implementation plan based on research
3. **Implementation Phase**: Writes code, tests, and documentation
4. **Validation Phase**: Runs final checks against success criteria

### Validation Scripts

Located in `scripts/`, these validate phase outputs:
- `validate-research.sh`: Checks research document structure
- `validate-plan.sh`: Validates implementation plan completeness
- `validate-implementation.sh`: Verifies code changes
- `validate-pr.sh`: Ensures PR meets all requirements

### Configuration System

- `configs/default.yml`: Default pipeline configuration
- `configs/schema.yml`: Configuration schema definition
- Consumer repos can override via `.atriumn/config.yml`

### Workflow Safety

New workflows created by Claude are automatically:
1. Detected during implementation
2. Moved to `.atriumn/suggested-workflows/`
3. Tracked in GitHub issues for human review
4. Only activated manually by developers

## Important Patterns

### PR Creation (CRITICAL)
ALWAYS use `scripts/create-pr.sh` for PRs in this repository. Never create PRs with simple bodies - they must include:
- Change Summary
- Risk & Impact Assessment with risk level
- Test Plan
- Manual Verification Steps

### Status Check Management
Status checks are created/updated via GitHub API:
- Name format: `Atriumn Phase: {Phase}`
- States: in_progress, completed (success/failure)
- Include detailed output and summary

### Phase Approval Flow
1. PR starts as draft with research phase
2. Each approval triggers next phase via webhook
3. Only approvals made AFTER phase completion count
4. Old approvals are auto-dismissed when phase completes

### Error Handling
- All scripts use `set -e` for fail-fast behavior
- Validation scripts return specific exit codes
- Pipeline captures and reports all errors in status checks

## Testing Requirements

Before pushing changes:
1. Run `make test` to validate all scripts
2. Run `cd github-app && npm test` for app tests
3. Ensure validation scripts pass for sample documents
4. Test webhook handling with ngrok if modifying app.js

## Security Considerations

- Never commit secrets or tokens
- GitHub App private keys stored as secrets
- Claude Code OAuth tokens passed securely via secrets
- Workflow permissions strictly scoped per phase