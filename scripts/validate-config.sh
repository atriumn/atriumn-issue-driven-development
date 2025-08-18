#!/bin/bash
# scripts/validate-config.sh - Configuration validation script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1}"

if [ -z "$CONFIG_FILE" ]; then
    echo "Usage: $0 <config-file>"
    echo ""
    echo "Examples:"
    echo "  $0 .github/development-pipeline-config.yml"
    echo "  $0 configs/curatefor.me.yml"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

echo "🔍 Validating configuration: $CONFIG_FILE"

# Check if required tools are available
check_dependencies() {
    if ! command -v yq >/dev/null 2>&1; then
        echo "❌ yq is required but not installed."
        echo "   Install with: wget -qO /usr/local/bin/yq https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64"
        exit 1
    fi
    
    if ! command -v python3 >/dev/null 2>&1; then
        echo "❌ python3 is required but not installed."
        exit 1
    fi
}

# Basic YAML syntax check
validate_yaml_syntax() {
    if ! yq eval '.' "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "❌ Invalid YAML syntax in $CONFIG_FILE"
        exit 1
    fi
    echo "✅ YAML syntax valid"
}

# Validate against schema
validate_schema() {
    python3 << EOF
import yaml
import sys
import os

# Load schema
schema_file = os.path.join('$SCRIPT_DIR', '..', 'configs', 'schema.yml')
if not os.path.exists(schema_file):
    print("⚠️  Schema file not found, skipping schema validation")
    sys.exit(0)

with open(schema_file, 'r') as f:
    schema_doc = yaml.safe_load(f)

# Load config
with open('$CONFIG_FILE', 'r') as f:
    config = yaml.safe_load(f)

# Check required fields
required_fields = schema_doc['configuration_schema']['required_fields']
for field in required_fields:
    if field not in config:
        print(f"❌ Missing required field: {field}")
        sys.exit(1)

print("✅ All required fields present")

# Validate field types and constraints
field_definitions = schema_doc['field_definitions']
for field, value in config.items():
    if field in field_definitions:
        definition = field_definitions[field]
        
        # Check type
        expected_type = definition['type']
        if expected_type == 'string' and not isinstance(value, str):
            print(f"❌ Field '{field}' should be string, got {type(value).__name__}")
            sys.exit(1)
        elif expected_type == 'integer' and not isinstance(value, int):
            print(f"❌ Field '{field}' should be integer, got {type(value).__name__}")
            sys.exit(1)
        elif expected_type == 'boolean' and not isinstance(value, bool):
            print(f"❌ Field '{field}' should be boolean, got {type(value).__name__}")
            sys.exit(1)
        elif expected_type == 'array' and not isinstance(value, list):
            print(f"❌ Field '{field}' should be array, got {type(value).__name__}")
            sys.exit(1)
        elif expected_type == 'object' and not isinstance(value, dict):
            print(f"❌ Field '{field}' should be object, got {type(value).__name__}")
            sys.exit(1)
        
        # Check constraints
        if expected_type == 'integer':
            if 'minimum' in definition and value < definition['minimum']:
                print(f"❌ Field '{field}' value {value} below minimum {definition['minimum']}")
                sys.exit(1)
            if 'maximum' in definition and value > definition['maximum']:
                print(f"❌ Field '{field}' value {value} above maximum {definition['maximum']}")
                sys.exit(1)

print("✅ Schema validation passed")
EOF
}

# Validate specific field values
validate_field_values() {
    # Check repo_name
    REPO_NAME=$(yq eval '.repo_name' "$CONFIG_FILE")
    if [ "$REPO_NAME" = "null" ] || [ -z "$REPO_NAME" ]; then
        echo "❌ repo_name is required"
        exit 1
    fi
    echo "✅ Repository name: $REPO_NAME"
    
    # Check base_branch
    BASE_BRANCH=$(yq eval '.base_branch' "$CONFIG_FILE")
    if [ "$BASE_BRANCH" = "null" ] || [ -z "$BASE_BRANCH" ]; then
        echo "❌ base_branch is required"
        exit 1
    fi
    
    ALLOWED_BRANCHES=("main" "master" "develop" "dev")
    if [[ ! " ${ALLOWED_BRANCHES[@]} " =~ " ${BASE_BRANCH} " ]]; then
        echo "⚠️  Base branch '$BASE_BRANCH' is not in recommended list: ${ALLOWED_BRANCHES[*]}"
    fi
    echo "✅ Base branch: $BASE_BRANCH"
    
    # Check thoughts_directory
    THOUGHTS_DIR=$(yq eval '.thoughts_directory' "$CONFIG_FILE")
    if [ "$THOUGHTS_DIR" = "null" ] || [ -z "$THOUGHTS_DIR" ]; then
        echo "❌ thoughts_directory is required"
        exit 1
    fi
    
    if [[ ! "$THOUGHTS_DIR" =~ /$ ]]; then
        echo "❌ thoughts_directory must end with '/'"
        exit 1
    fi
    echo "✅ Thoughts directory: $THOUGHTS_DIR"
    
    # Validate team configuration if present
    if yq eval '.team' "$CONFIG_FILE" >/dev/null 2>&1 && [ "$(yq eval '.team' "$CONFIG_FILE")" != "null" ]; then
        # Check reviewer format
        if yq eval '.team.default_reviewers[]?' "$CONFIG_FILE" >/dev/null 2>&1; then
            while IFS= read -r reviewer; do
                if [[ ! "$reviewer" =~ ^@[a-zA-Z0-9_-]+$ ]]; then
                    echo "❌ Invalid reviewer format: '$reviewer' (should be @username)"
                    exit 1
                fi
            done < <(yq eval '.team.default_reviewers[]' "$CONFIG_FILE")
            echo "✅ Team reviewer format valid"
        fi
    fi
    
    # Validate notification configuration if present
    if yq eval '.notifications.slack_channel' "$CONFIG_FILE" >/dev/null 2>&1 && [ "$(yq eval '.notifications.slack_channel' "$CONFIG_FILE")" != "null" ]; then
        SLACK_CHANNEL=$(yq eval '.notifications.slack_channel' "$CONFIG_FILE")
        if [[ ! "$SLACK_CHANNEL" =~ ^#[a-zA-Z0-9_-]+$ ]]; then
            echo "❌ Invalid slack channel format: '$SLACK_CHANNEL' (should be #channel-name)"
            exit 1
        fi
        echo "✅ Slack channel format valid"
    fi
}

# Check test commands are reasonable
validate_test_commands() {
    if yq eval '.validation.implementation_test_commands[]?' "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "📋 Test commands configured:"
        while IFS= read -r command; do
            echo "   - $command"
            # Basic sanity checks
            if [[ "$command" =~ rm.*-rf|sudo|curl.*\|.*sh ]]; then
                echo "⚠️  Potentially dangerous command detected: $command"
            fi
        done < <(yq eval '.validation.implementation_test_commands[]' "$CONFIG_FILE")
        echo "✅ Test commands validated"
    else
        echo "⚠️  No test commands configured - using defaults"
    fi
}

# Generate configuration summary
generate_summary() {
    echo ""
    echo "📋 Configuration Summary"
    echo "========================"
    echo "Repository: $(yq eval '.repo_name' "$CONFIG_FILE")"
    echo "Base branch: $(yq eval '.base_branch' "$CONFIG_FILE")"
    echo "Thoughts directory: $(yq eval '.thoughts_directory' "$CONFIG_FILE")"
    
    if yq eval '.validation.research_min_refs' "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "Min file references: $(yq eval '.validation.research_min_refs' "$CONFIG_FILE")"
    fi
    
    if yq eval '.team.default_reviewers[]?' "$CONFIG_FILE" >/dev/null 2>&1; then
        REVIEWER_COUNT=$(yq eval '.team.default_reviewers | length' "$CONFIG_FILE")
        echo "Default reviewers: $REVIEWER_COUNT configured"
    fi
    
    if yq eval '.workflow_customization.parallel_pipelines' "$CONFIG_FILE" >/dev/null 2>&1; then
        echo "Parallel pipelines: $(yq eval '.workflow_customization.parallel_pipelines' "$CONFIG_FILE")"
    fi
    
    echo ""
}

# Main validation flow
main() {
    check_dependencies
    validate_yaml_syntax
    validate_schema
    validate_field_values
    validate_test_commands
    generate_summary
    
    echo "✅ Configuration validation PASSED"
    echo ""
    echo "Next steps:"
    echo "1. Add this config to your repository: .github/development-pipeline-config.yml"
    echo "2. Create PIPELINE_TOKEN secret with GitHub Personal Access Token"
    echo "3. Test the pipeline with a test issue"
}

# Help text
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Configuration Validation Script"
    echo ""
    echo "Usage: $0 <config-file>"
    echo ""
    echo "Validates repository configuration against the pipeline schema."
    echo ""
    echo "Examples:"
    echo "  $0 .github/development-pipeline-config.yml"
    echo "  $0 configs/my-repo.yml"
    echo ""
    echo "Requirements:"
    echo "  - yq (YAML processor)"
    echo "  - python3 (for schema validation)"
    exit 0
fi

main