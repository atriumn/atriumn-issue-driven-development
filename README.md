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
│   └── validate-pr.sh                # Pull request validation
├── configs/                          # Configuration templates
│   ├── default.yml                   # Default configuration
│   ├── curatefor.me.yml              # CurateFor.me specific config
│   └── schema.yml                    # Configuration schema
├── templates/                        # Reusable templates
│   └── decision-record-template.md   # Decision record template
├── test/                             # Test suite
│   ├── test-validation-scripts.sh    # Validation script tests
│   └── test-data/                    # Test fixtures (auto-generated)
└── .github/workflows/                # GitHub Actions workflows
    └── development-pipeline.yml      # Main development pipeline
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

## Coming in Phase 2

- Complete GitHub Actions workflow automation
- Multi-repo support and synchronization
- Decision record automation and templates
- Integration with project management tools
- Advanced reporting and analytics

## Dependencies

- **yq**: YAML processing (required for all scripts)
- **gh**: GitHub CLI (required for PR validation)
- **git**: Version control (required for implementation validation)
- **bash**: Shell scripting environment

## License

Internal use only - Atriumn organization.