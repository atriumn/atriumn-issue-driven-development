# Repository Onboarding Guide

This guide walks through adding a new repository to the shared development pipeline system.

## Quick Start (5 minutes)

### 1. Add Shared Workflow
Create `.github/workflows/development-pipeline.yml` in your repository:

```yaml
name: Development Pipeline

on:
  issue_comment:
    types: [created]

jobs:
  check-trigger:
    if: |
      contains(github.event.comment.body, '@claude run development pipeline') ||
      contains(github.event.comment.body, '✅ Research Phase Complete') ||
      contains(github.event.comment.body, 'approve research') ||
      contains(github.event.comment.body, '✅ Planning Phase Complete') ||
      contains(github.event.comment.body, 'approve plan') ||
      contains(github.event.comment.body, '✅ Implementation Phase Complete') ||
      contains(github.event.comment.body, 'approve implementation')
    runs-on: ubuntu-latest
    steps:
      - run: echo "Triggering development pipeline"

  development-pipeline:
    needs: check-trigger
    uses: atriumn/atriumn-shared-workflows/.github/workflows/development-pipeline.yml@main
    with:
      repo_name: ${{ github.repository }}
      issue_number: ${{ github.event.issue.number }}
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 2. Add Repository Configuration
Create `.github/development-pipeline-config.yml`:

```yaml
repo_name: "your-repo-name"
base_branch: "main"  # or "develop"
thoughts_directory: "thoughts/"  # or "docs/" etc.

validation:
  research_min_refs: 3
  implementation_test_commands:
    - "make test"
    - "make lint"

team:
  default_reviewers: ["@your-username"]
  tech_lead: "@tech-lead"

notifications:
  slack_channel: "#your-team"
```

### 3. Test the Pipeline
1. Create a test issue
2. Comment: `@claude run development pipeline`
3. Verify the pipeline starts correctly

## Detailed Configuration

### Repository Types and Recommended Settings

#### Frontend Applications
```yaml
repo_name: "frontend-app"
base_branch: "main"
thoughts_directory: "docs/"

validation:
  research_min_refs: 3
  implementation_test_commands:
    - "npm test"
    - "npm run lint"
    - "npm run typecheck"
    - "npm run build"

workflow_customization:
  phase_timeouts:
    research_hours: 2
    planning_hours: 1
    implementation_hours: 8
```

#### Backend APIs
```yaml
repo_name: "api-service"
base_branch: "develop"
thoughts_directory: "thoughts/"

validation:
  research_min_refs: 5
  implementation_test_commands:
    - "make test"
    - "make lint"
    - "make security-scan"
    - "docker build -t test ."
  pr_required_sections:
    - "API Changes"
    - "Database Migrations"
    - "Security Review"

workflow_customization:
  phase_timeouts:
    research_hours: 4
    planning_hours: 2
    implementation_hours: 16
```

#### Infrastructure/Platform
```yaml
repo_name: "platform-infrastructure"
base_branch: "main"
thoughts_directory: "docs/decisions/"

validation:
  research_min_refs: 8
  implementation_test_commands:
    - "terraform plan"
    - "terraform validate"
    - "make security-scan"
    - "make compliance-check"

notifications:
  escalation_hours: 1  # Faster escalation for critical infrastructure

workflow_customization:
  auto_proceed_default: false  # Always require human approval
  parallel_pipelines: 1  # Limit concurrent infrastructure changes
```

### Team Configuration

#### Small Team
```yaml
team:
  default_reviewers: ["@team-lead"]
  tech_lead: "@team-lead"
```

#### Large Team with Specialists
```yaml
team:
  default_reviewers: ["@senior-dev1", "@senior-dev2"]
  domain_experts:
    frontend: "@frontend-specialist"
    backend: "@backend-specialist"
    infrastructure: "@devops-lead"
    security: "@security-engineer"
    design: "@ux-designer"
  tech_lead: "@architecture-lead"
```

### Validation Customization

#### Strict Validation (Critical Systems)
```yaml
validation:
  research_min_refs: 8
  implementation_test_commands:
    - "make test-unit"
    - "make test-integration"
    - "make test-e2e"
    - "make security-scan"
    - "make performance-test"
    - "make compliance-check"
  pr_required_sections:
    - "Security Impact"
    - "Performance Impact"
    - "Rollback Plan"
    - "Monitoring Plan"
```

#### Relaxed Validation (Internal Tools)
```yaml
validation:
  research_min_refs: 2
  implementation_test_commands:
    - "npm test"
  pr_required_sections:
    - "Summary"
    - "Testing"
```

## Testing Your Configuration

### 1. Validation Script Test
```bash
# Test your config locally
curl -O https://raw.githubusercontent.com/atriumn/atriumn-shared-workflows/main/scripts/validate-config.py
chmod +x validate-config.py
python3 validate-config.py .github/development-pipeline-config.yml --report
```

### 2. Dry Run Test
```bash
# Test pipeline without actually running it
gh workflow run multi-repo-test.yml \
  -f test_repos="your-repo-name" \
  -f test_scenarios="basic-validation"
```

### 3. Full Pipeline Test
1. Create test issue: "Test: Pipeline onboarding"
2. Comment: `@claude run development pipeline`
3. Monitor progress and validate each phase
4. Clean up test artifacts

## Common Configuration Patterns

### Monorepo Support
```yaml
file_patterns:
  research: "docs/research/"
  plans: "docs/plans/"
  decisions: "docs/decisions/"

validation:
  implementation_test_commands:
    - "make test-service-a"
    - "make test-service-b"
    - "make test-integration"
```

### Multi-Environment Deployment
```yaml
integration_settings:
  deployment_environments: ["dev", "staging", "prod-us", "prod-eu"]

workflow_customization:
  phase_timeouts:
    implementation_hours: 48  # More time for multi-env testing
```

### Compliance Requirements
```yaml
validation:
  pr_required_sections:
    - "Compliance Impact"
    - "Data Privacy Review"
    - "Security Assessment"
    - "Change Control Reference"

notifications:
  email_list: ["compliance@company.com"]
```

## Advanced Configuration

### Custom Validation Rules
```yaml
validation:
  custom_rules:
    - name: "Database Migration Check"
      pattern: "migration|schema|database"
      required_sections: ["Database Impact", "Rollback Plan"]
    - name: "API Breaking Change Check"
      pattern: "breaking.*change|api.*version"
      additional_reviewers: ["@api-team-lead"]
```

### Integration Settings
```yaml
integration_settings:
  linear_workspace: "ACME-123"
  jira_project: "PROJ"
  slack_webhook: "https://hooks.slack.com/..."
  deployment_environments: ["staging", "production"]
  
  # Custom webhook endpoints
  webhooks:
    pipeline_start: "https://api.company.com/webhooks/pipeline-start"
    phase_complete: "https://api.company.com/webhooks/phase-complete"
```

### Branch Strategy Configuration
```yaml
branches:
  prefix: "feature/"
  naming: "issue-{number}-{title-slug}"
  cleanup_merged: true
  
  # Advanced branch rules
  protection_rules:
    require_pr_reviews: true
    required_reviewers: 2
    dismiss_stale_reviews: true
    require_code_owner_reviews: true
```

## Troubleshooting

### Common Issues

#### Pipeline Not Triggering
- Check workflow file is in `.github/workflows/`
- Verify issue comment patterns match exactly
- Check repository has necessary permissions

#### Configuration Validation Errors
- Use schema validation: `python3 validate-config.py your-config.yml`
- Check YAML syntax: `yq eval '.' your-config.yml`
- Verify all required fields are present

#### Validation Scripts Failing
- Check test commands work locally
- Verify file paths in configuration
- Test with minimal configuration first

### Getting Help

1. **Check the logs**: GitHub Actions logs show detailed error messages
2. **Test minimal config**: Start with minimal configuration and add complexity
3. **Review examples**: Check working configurations in `configs/` directory
4. **Ask for help**: Create issue in atriumn-shared-workflows repository

## Migration from Existing Systems

### From Manual Processes
1. Document current workflow steps
2. Map steps to pipeline phases (research → planning → implementation → PR)
3. Configure validation rules to match current quality gates
4. Test with non-critical changes first

### From Other CI/CD Systems
1. Keep existing CI/CD for builds and deployments
2. Use pipeline for development workflow only
3. Gradually migrate validation rules
4. Consider integration points for deployment triggers

## Best Practices

### Configuration Management
- Start with default configuration and customize gradually
- Use version control for configuration changes
- Test configuration changes in non-production repositories first
- Document repository-specific validation rules

### Team Adoption
- Start with volunteer early adopters
- Provide training on pipeline commands and workflow
- Monitor pipeline usage and iterate based on feedback
- Create team-specific documentation and examples

### Maintenance
- Regularly review and update configuration
- Monitor pipeline performance and timeout settings
- Keep validation rules up to date with technology changes
- Archive completed pipeline artifacts periodically

## Configuration Examples by Use Case

### High-Security Environment
```yaml
repo_name: "secure-app"
base_branch: "main"
thoughts_directory: "security-docs/"

validation:
  research_min_refs: 10
  implementation_test_commands:
    - "make security-scan"
    - "make vulnerability-test"
    - "make compliance-check"
    - "make penetration-test"
  pr_required_sections:
    - "Security Impact Analysis"
    - "Threat Model Review"
    - "Compliance Verification"
    - "Security Testing Results"

notifications:
  escalation_hours: 0.5  # 30 minutes
  email_list: ["security-team@company.com", "compliance@company.com"]

workflow_customization:
  auto_proceed_default: false
  parallel_pipelines: 1
  phase_timeouts:
    research_hours: 16
    planning_hours: 8
    implementation_hours: 72

team:
  default_reviewers: ["@security-lead", "@compliance-officer"]
  domain_experts:
    security: "@security-architect"
    compliance: "@compliance-lead"
```

### Rapid Development Environment
```yaml
repo_name: "prototype-app"
base_branch: "develop"
thoughts_directory: "docs/"

validation:
  research_min_refs: 2
  implementation_test_commands:
    - "npm test"
  pr_required_sections:
    - "Summary"
    - "Testing"

workflow_customization:
  auto_proceed_default: true  # Skip human validation for speed
  parallel_pipelines: 5
  phase_timeouts:
    research_hours: 1
    planning_hours: 1
    implementation_hours: 4

team:
  default_reviewers: ["@dev-lead"]
```

### Open Source Project
```yaml
repo_name: "open-source-lib"
base_branch: "main"
thoughts_directory: "docs/development/"

validation:
  research_min_refs: 4
  implementation_test_commands:
    - "npm test"
    - "npm run lint"
    - "npm run docs"
    - "npm run compatibility-test"
  pr_required_sections:
    - "Summary"
    - "Breaking Changes"
    - "Documentation Updates"
    - "Backward Compatibility"

notifications:
  slack_channel: "#contributors"

workflow_customization:
  parallel_pipelines: 10  # Many contributors
  phase_timeouts:
    research_hours: 8
    planning_hours: 4
    implementation_hours: 24

team:
  default_reviewers: ["@maintainer1", "@maintainer2"]
  domain_experts:
    architecture: "@core-maintainer"
    documentation: "@docs-maintainer"
```

---

*This guide provides comprehensive instructions for onboarding repositories to the multi-repository development pipeline system. For additional support, refer to the main documentation or create an issue in the shared workflows repository.*