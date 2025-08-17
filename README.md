# Atriumn Shared Workflows

Centralized repository for shared workflows, validation scripts, and configuration templates used across Atriumn development projects.

## Overview

This repository provides a standardized development pipeline framework to ensure consistency, quality, and efficiency across all Atriumn projects. It includes validation scripts for different development phases, reusable configuration templates, and shared GitHub Actions workflows.

## Repository Structure

```
atriumn-shared-workflows/
├── README.md                           # This file
├── .gitignore                         # Git ignore patterns
├── scripts/                           # Validation scripts
│   ├── validate-research.sh           # Research phase validation
│   ├── validate-plan.sh              # Planning phase validation
│   ├── validate-implementation.sh    # Implementation validation
│   ├── validate-pr.sh                # Pull request validation
│   └── manage-decision-record.py     # Decision record management (Phase 3)
├── configs/                          # Configuration templates
│   ├── default.yml                   # Default configuration
│   ├── curatefor.me.yml              # CurateFor.me specific config
│   └── schema.yml                    # Configuration schema
├── templates/                        # Reusable templates
│   ├── decision-record-template.md   # Decision record template
│   ├── repo-workflow-template.yml    # Repository workflow template (Phase 1-2)
│   └── enhanced-repo-workflow-template.yml # Enhanced workflow (Phase 3)
├── docs/                            # Documentation
│   └── phase3-branch-safety-context-preservation.md # Phase 3 features
├── test/                             # Test suite
│   ├── test-validation-scripts.sh    # Validation script tests
│   └── test-data/                    # Test fixtures (auto-generated)
└── .github/workflows/                # GitHub Actions workflows
    ├── development-pipeline.yml      # Main development pipeline (Phase 2)
    └── test-pipeline.yml             # Pipeline testing workflow
```

## Phase 1: Validation Scripts (Current)

### Research Phase (`validate-research.sh`)
Validates research documents with the following checks:
- YAML frontmatter with required fields (date, researcher, topic, status)
- Required sections (Research Question, Summary, Detailed Findings, Code References, Architecture Insights)
- Minimum number of file references (configurable, default: 3)
- No placeholder text (TODO, FIXME, etc.)

### Planning Phase (`validate-plan.sh`)
Validates implementation plans ensuring:
- YAML frontmatter completeness
- Required sections (Implementation Approach, Phase structure)
- Proper success criteria with Automated and Manual verification sections
- No unresolved questions or TODOs
- Clear phase breakdown (Phase 1, Phase 2, etc.)

### Implementation Phase (`validate-implementation.sh`)
Validates implementation readiness:
- Branch exists and has commits ahead of base branch
- All configured test commands pass (make test, npm run lint, etc.)
- No merge conflicts with base branch
- Decision record updated with implementation details

### Pull Request Phase (`validate-pr.sh`)
Final PR validation:
- PR exists and has proper description structure
- Links to research and plan documents
- Reviewers assigned
- All status checks passing
- Proper branch naming convention

## Configuration Files

- **`default.yml`**: Base configuration template for new projects
- **`curatefor.me.yml`**: Environment-specific configuration for CurateFor.me
- **`schema.yml`**: JSON schema for validating configuration files

## Templates

- **`decision-record-template.md`**: Standardized template for documenting architectural and technical decisions

## Usage

### Prerequisites

Install required dependencies:
```bash
# Install yq for YAML processing
brew install yq  # macOS
# or
sudo apt-get install yq  # Ubuntu

# Install GitHub CLI for PR validation
brew install gh  # macOS
# or
sudo apt-get install gh  # Ubuntu
```

### Using Validation Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Validate research document
./scripts/validate-research.sh thoughts/shared/research/my-research.md

# Validate implementation plan  
./scripts/validate-plan.sh thoughts/shared/plans/my-plan.md

# Validate implementation on branch
./scripts/validate-implementation.sh feature/issue-123-my-feature

# Validate PR
./scripts/validate-pr.sh 123

# Use custom config file
./scripts/validate-research.sh .github/dev-config.yml thoughts/shared/research/my-research.md

# Get help for any script
./scripts/validate-research.sh --help
```

### Configuration Setup

Create `.github/development-pipeline-config.yml` in your repository:

```yaml
repo_name: "my-repo"
base_branch: "main"
thoughts_directory: "docs/"

validation:
  research_min_refs: 5
  plan_required_sections:
    - "## Implementation Approach"
    - "## Phase"
    - "#### Automated Verification:"
    - "#### Manual Verification:"
  implementation_test_commands:
    - "npm test"
    - "npm run lint"
    - "npm run typecheck"

team:
  default_reviewers: ["@team-lead"]
  
notifications:
  slack_channel: "#dev-team"
  escalation_hours: 2
```

If no config file is found, scripts will use `configs/default.yml`.

### Using Templates

1. Copy templates from `templates/` directory
2. Fill in project-specific information
3. Follow the structured format provided

### Testing

```bash
# Run all validation script tests
./test/test-validation-scripts.sh

# Run specific tests
./test/test-validation-scripts.sh research
./test/test-validation-scripts.sh plan
./test/test-validation-scripts.sh help
./test/test-validation-scripts.sh deps
```

## Integration

This repository is designed to be integrated into Atriumn project workflows through:

- **Git submodules**: Add as submodule to access scripts directly
- **GitHub Actions workflows**: Reference scripts in CI/CD pipelines  
- **Direct script execution**: Run validation scripts locally or in CI
- **Configuration inheritance**: Use config templates for consistent setup

### Example GitHub Actions Integration

```yaml
name: Validate Development Pipeline
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Checkout shared workflows
      uses: actions/checkout@v4
      with:
        repository: atriumn/atriumn-shared-workflows
        path: .github/shared-workflows
    - name: Validate research
      run: .github/shared-workflows/scripts/validate-research.sh docs/research/latest.md
```

## Contributing

When contributing to this repository:

1. Follow the established patterns and conventions
2. Update documentation for any new scripts or templates
3. Ensure all scripts are executable and properly tested
4. Validate configuration changes against the schema

## Phase 2: GitHub Actions Workflow (Current)

### Complete Automated Pipeline

The shared workflow provides full automation from issue creation to PR merge:

- **Automated branch creation** and lifecycle management
- **Real-time validation** at each phase with detailed feedback
- **Decision record tracking** throughout the entire process
- **Human approval gates** (configurable) for quality control
- **Automatic PR creation** and validation
- **Pipeline completion** with metrics and cleanup

### Workflow Features

#### 🚀 **Pipeline Triggers**
```bash
# Start development pipeline
@claude run development pipeline

# With options
@claude run development pipeline
- Base branch: develop
- Human validation: false
```

#### 🔄 **Phase Transitions**
- **Research Complete**: `✅ Research Phase Complete` (Claude comment)
- **Planning Complete**: `✅ Planning Phase Complete` (Claude comment)  
- **Implementation Complete**: `✅ Implementation Phase Complete` (Claude comment)
- **Human Approvals**: `approve research`, `approve plan`, `approve implementation`

#### 📊 **Automated Validation**
- Research document structure and content validation
- Implementation plan completeness and success criteria
- Code quality checks (tests, linting, type checking)
- PR description and reviewer validation

#### 🎯 **Decision Record Management**
- Automatic creation and updates throughout pipeline
- Phase completion tracking with timestamps
- Implementation metrics and statistics
- Final completion summary with duration and changes

### Integration Setup

#### 1. Repository Workflow Setup

Copy the template workflow to your repository:

```bash
# Copy template to your repo
cp templates/repo-workflow-template.yml .github/workflows/development-pipeline.yml
```

#### 2. Repository Configuration

Create `.github/development-pipeline-config.yml`:

```yaml
# Repository-specific configuration
repo_name: "my-project"
base_branch: "main"
thoughts_directory: "thoughts/"

validation:
  research_min_refs: 5
  plan_required_sections:
    - "## Implementation Approach"
    - "## Phase"
    - "#### Automated Verification:"
    - "#### Manual Verification:"
  implementation_test_commands:
    - "npm test"
    - "npm run lint"
    - "npm run typecheck"

team:
  default_reviewers: ["@tech-lead"]
  domain_experts:
    frontend: "@frontend-expert"
    backend: "@backend-expert"

notifications:
  slack_channel: "#engineering"
  escalation_hours: 4

branches:
  prefix: "feature/"
  naming: "issue-{number}-{title-slug}"
```

#### 3. Workflow Events

The workflow responds to these GitHub events:

- **`issue_comment`**: Pipeline triggers and phase completions
- **`pull_request`**: PR validation and completion
- **`workflow_dispatch`**: Manual testing

### Pipeline Modes

#### 🤖 **Fully Automated Mode**
```bash
@claude run development pipeline
- Human validation: false
```
- Proceeds automatically through all phases
- No human approval required
- Uses validation scripts for quality gates

#### 👥 **Human Approval Mode** (Default)
```bash
@claude run development pipeline
- Human validation: true
```
- Pauses for human review at each phase
- Requires explicit approval to proceed
- Provides validation reports for review

### Testing the Pipeline

#### Manual Testing

Use the test workflow for validation:

```bash
# In GitHub Actions
- Workflow: "Test Development Pipeline"
- Scenarios: 
  * full-pipeline-automated
  * full-pipeline-manual  
  * research-only
  * validation-failure
```

#### Expected Workflow

1. **Issue Comment**: `@claude run development pipeline`
2. **Branch Creation**: `feature/issue-123-description`
3. **Research Phase**: Document creation and validation
4. **Planning Phase**: Implementation plan and approval
5. **Implementation Phase**: Code changes and testing
6. **PR Creation**: Automated PR with full context
7. **PR Validation**: Review and merge process
8. **Completion**: Issue closure and cleanup

### Monitoring and Observability

#### Decision Records

Each pipeline run creates a comprehensive decision record:

```
thoughts/shared/decisions/pipeline-issue-123.md
```

Contains:
- Issue context and branch information
- Phase completion timestamps
- Validation results and metrics  
- Implementation statistics
- Final completion summary

#### GitHub Integration

- **Issue Labels**: `branch:feature/issue-123-description`
- **PR Links**: Automatic linking to research/plan documents
- **Status Comments**: Real-time progress updates
- **Metrics**: Commit counts, file changes, duration

### Troubleshooting

#### Common Issues

1. **Branch Creation Fails**
   - Check repository permissions
   - Verify base branch exists
   - Ensure GITHUB_TOKEN has write access

2. **Validation Script Errors**
   - Verify yq and gh CLI are available
   - Check document structure and content
   - Review validation script output

3. **Human Approval Stalled**
   - Use exact approval phrases: `approve research`
   - Check notification settings
   - Review decision record for context

#### Debug Commands

```bash
# Check pipeline branch
gh issue view 123 --json labels

# Validate documents manually  
./scripts/validate-research.sh thoughts/shared/research/doc.md
./scripts/validate-plan.sh thoughts/shared/plans/plan.md

# Test PR validation
./scripts/validate-pr.sh 456
```

## Phase 3: Branch Safety & Context Preservation

Phase 3 introduces enterprise-grade reliability features for the development pipeline:

### Enhanced Branch Management
- **Branch Safety Checks**: Validates pipeline branches exist and are properly tracked
- **State Validation**: Ensures branch state consistency with pipeline expectations
- **Automatic Recovery**: Handles branch deletions and corruption

### Context Preservation
- **Decision Records**: Comprehensive tracking of pipeline state and decisions
- **Phase Context Validation**: Ensures each phase has proper prerequisites
- **Document Integrity**: Validates required documents exist and are well-formed

### Error Recovery
- **Automatic Failure Detection**: Analyzes failures and provides recovery guidance
- **Retry Mechanisms**: Phase-specific retry commands for common failure scenarios
- **Complete Pipeline Restart**: Clean restart capability with context preservation

### Partial Completion Handling
- **Completion Analysis**: Detects 75%-25% scenarios and other partial implementations
- **Human Decision Points**: Clear options for proceeding with partial work
- **Intelligent Continuation**: Preserves completed work while finishing remaining items

### Enhanced Commands

```bash
# Enhanced pipeline with all Phase 3 features
@claude run development pipeline

# Error recovery commands
@claude retry research        # Retry research phase after failure
@claude retry planning        # Retry planning phase
@claude retry implementation  # Retry implementation phase
@claude restart pipeline     # Complete pipeline restart

# Partial completion decisions
continue implementing remaining items  # Continue with remaining work
accept current implementation         # Create PR with current state
modify implementation: [changes]      # Modify scope and continue
```

### Decision Record Management

```bash
# Analyze decision record size and health
python scripts/manage-decision-record.py thoughts/shared/decisions/pipeline-issue-123.md --action analyze

# Automatic size management
python scripts/manage-decision-record.py thoughts/shared/decisions/pipeline-issue-123.md --auto

# Manual compression for readability
python scripts/manage-decision-record.py thoughts/shared/decisions/pipeline-issue-123.md --action compress

# Create summary version with archived details
python scripts/manage-decision-record.py thoughts/shared/decisions/pipeline-issue-123.md --action summarize
```

### Using Enhanced Workflows

1. **Copy the enhanced template:**
   ```bash
   cp templates/enhanced-repo-workflow-template.yml .github/workflows/development-pipeline-enhanced.yml
   ```

2. **Start enhanced pipeline:**
   ```bash
   # Comment on GitHub issue
   @claude run development pipeline
   ```

3. **Enhanced features automatically provide:**
   - Branch safety validation on every operation
   - Context preservation across all phases
   - Error recovery mechanisms with clear guidance
   - Partial completion detection and human decision points
   - Decision record size management and archiving

### Phase 3 Documentation

For complete Phase 3 feature documentation, see: [`docs/phase3-branch-safety-context-preservation.md`](docs/phase3-branch-safety-context-preservation.md)

## Dependencies

- **yq**: YAML processing (required for all scripts)
- **gh**: GitHub CLI (required for PR validation)
- **git**: Version control (required for implementation validation)
- **bash**: Shell scripting environment

## License

Internal use only - Atriumn organization.