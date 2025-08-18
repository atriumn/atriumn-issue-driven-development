# Atriumn Shared Workflows

Centralized GitHub Actions workflows for consistent development processes across all Atriumn repositories.

## Available Workflows

### Development Pipeline (`development-pipeline.yml`)

A comprehensive workflow that automates the research, planning, and implementation phases for GitHub issues.

**Features:**
- ✅ Automated issue research and analysis
- ✅ Human validation checkpoints
- ✅ Decision record generation
- ✅ Cross-repository compatibility
- ✅ Scalable architecture

## Quick Start

### 1. Prerequisites

Your repository needs:
- A GitHub Personal Access Token (PAT) with repository permissions
- The PAT stored as a repository secret named `PIPELINE_TOKEN`

### 2. Copy the Template

1. Copy `template-development-pipeline.yml` from this repository
2. Save it to your repo at `.github/workflows/development-pipeline.yml`
3. Customize the `repo_name` field (line ~50) to match your repository

### 3. Configure Secrets

Add a repository secret:
- **Name:** `PIPELINE_TOKEN`
- **Value:** Your GitHub Personal Access Token

### 4. Usage

Trigger the pipeline by:
- **Comment on an issue:** `@claude run development pipeline`
- **Manual trigger:** Use the "Actions" tab and run "Development Pipeline"

## Architecture

### Separation of Concerns

The architecture separates **orchestration** (shared workflows) from **file operations** (local workflows):

```
┌─────────────────────────────────────┐
│        Shared Workflow              │
│  (atriumn-shared-workflows)         │
│                                     │
│  • Issue research & analysis        │
│  • Planning & validation            │
│  • Human approval workflow          │
│  • Generate structured outputs      │
│                                     │
│  ❌ NO direct file writes           │
└─────────────────────────────────────┘
                    │
                    │ outputs
                    ▼
┌─────────────────────────────────────┐
│        Local Workflow               │
│    (your repository)                │
│                                     │
│  • Branch creation                  │
│  • Decision record files            │
│  • Git commits & pushes             │
│  • Repository-specific operations   │
│                                     │
│  ✅ All file writes happen here     │
└─────────────────────────────────────┘
```

### Why This Design?

GitHub's security model prevents shared workflows from writing to external repositories. This architecture:
- ✅ Centralizes business logic in shared workflows
- ✅ Respects GitHub's security boundaries
- ✅ Scales to any number of repositories
- ✅ Maintains consistency across projects

## Workflow Outputs

The shared workflow provides these outputs for local processing:

| Output | Description |
|--------|-------------|
| `pipeline_status` | `success` or `failed` |
| `branch_name` | Generated feature branch name |
| `pipeline_id` | Unique pipeline identifier |
| `issue_title` | GitHub issue title |
| `research_summary` | Detailed research findings |
| `next_actions` | Recommended implementation steps |
| `decision_record_content` | Complete decision record in Markdown |

## Customization

### Directory Structure

The template assumes your decision records go in:
```
thoughts/shared/decisions/pipeline-issue-{number}.md
```

To customize, edit the `mkdir -p` and file paths in your local workflow.

### Branch Naming

Default branch naming: `feature/issue-{number}-pipeline`

Customize by passing `branch_name` input or modifying the generation logic.

### Human Validation

Set `human_validation: false` to skip approval steps, or leave as `true` for human oversight.

## Advanced Configuration

### Multiple Workflows

You can create multiple specialized workflows:
- `development-pipeline.yml` - Full feature development
- `hotfix-pipeline.yml` - Emergency fixes
- `documentation-pipeline.yml` - Documentation updates

Each can use the same shared workflow with different parameters.

### Custom Issue Triggers

Extend the trigger conditions in your local workflow:
```yaml
if: |
  contains(github.event.comment.body, '@claude run development pipeline') ||
  contains(github.event.comment.body, 'your-custom-trigger') ||
  github.event_name == 'workflow_dispatch'
```

## Troubleshooting

### Common Issues

**"Bad credentials" errors:**
- Verify `PIPELINE_TOKEN` is correctly set
- Ensure the PAT has repository permissions
- Check token expiration

**"Repository not found" errors:**
- Update `repo_name` in your local workflow
- Use format: `organization/repository`

**"Workflow is not reusable" errors:**
- Ensure you're referencing the correct branch (`@main`)
- Verify the shared workflow has `workflow_call` trigger

### Debug Mode

Enable debug output by setting workflow inputs:
```yaml
with:
  test_mode: true
```

## Contributing

1. Fork this repository
2. Create a feature branch
3. Test changes across multiple repositories
4. Submit a pull request

## Support

For issues or questions:
1. Check existing GitHub issues
2. Create a new issue with:
   - Repository details
   - Workflow logs
   - Steps to reproduce

---

## Legacy Documentation

The sections below contain documentation for the previous implementation phases and validation scripts that are still available in this repository.

### Phase 1: Validation Scripts

Standalone scripts for validating development pipeline phases:
- `validate-research.sh` - Research document validation
- `validate-plan.sh` - Implementation plan validation  
- `validate-implementation.sh` - Code quality and testing
- `validate-pr.sh` - Pull request validation

### Phase 2: GitHub Actions Integration ✅ COMPLETE

Full GitHub Actions workflow implementation with automated validation gates and human approval modes.

**Key Features:**
- Complete research → planning → implementation → PR workflow
- Automated validation using Phase 1 scripts
- Human approval checkpoints with configurable bypass
- Cross-repository compatibility with shared workflow architecture
- Decision record management throughout pipeline
- Branch creation and management
- Comprehensive error handling and retry mechanisms

**Components:**
- `.github/workflows/development-pipeline.yml` - Main shared workflow
- `templates/repo-workflow-template.yml` - Repository adoption template
- `.github/workflows/test-development-pipeline.yml` - Testing framework

**Usage:**
1. Copy `templates/repo-workflow-template.yml` to your repo
2. Configure `PIPELINE_TOKEN` secret with repository access
3. Comment `@claude run development pipeline` on any issue
4. Pipeline automatically guides Claude through the complete process

### Phase 3: Branch Safety & Context Preservation

Enhanced error handling and recovery mechanisms.

### Phase 4: Multi-Repo Configuration & Testing

Advanced configuration management and testing framework.

For complete legacy documentation, see the git history of this README.