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
└── .github/workflows/                # GitHub Actions workflows
    └── development-pipeline.yml      # Main development pipeline
```

## Validation Scripts

### Research Phase (`validate-research.sh`)
Validates that proper research has been conducted before moving to planning phase.

### Planning Phase (`validate-plan.sh`)
Ensures comprehensive planning and architecture decisions are documented.

### Implementation Phase (`validate-implementation.sh`)
Validates code quality, testing, and implementation standards.

### Pull Request Phase (`validate-pr.sh`)
Final validation before code review and merge.

## Configuration Files

- **`default.yml`**: Base configuration template for new projects
- **`curatefor.me.yml`**: Environment-specific configuration for CurateFor.me
- **`schema.yml`**: JSON schema for validating configuration files

## Templates

- **`decision-record-template.md`**: Standardized template for documenting architectural and technical decisions

## Usage

### Using Validation Scripts

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Run validation for specific phase
./scripts/validate-research.sh
./scripts/validate-plan.sh
./scripts/validate-implementation.sh
./scripts/validate-pr.sh
```

### Using Configuration Templates

1. Copy the appropriate config file from `configs/`
2. Customize for your project needs
3. Validate against the schema using `configs/schema.yml`

### Using Templates

1. Copy templates from `templates/` directory
2. Fill in project-specific information
3. Follow the structured format provided

## Integration

This repository is designed to be integrated into Atriumn project workflows through:

- Git submodules
- GitHub Actions workflows
- Direct script execution in CI/CD pipelines
- Configuration inheritance in project setup

## Contributing

When contributing to this repository:

1. Follow the established patterns and conventions
2. Update documentation for any new scripts or templates
3. Ensure all scripts are executable and properly tested
4. Validate configuration changes against the schema

## License

Internal use only - Atriumn organization.