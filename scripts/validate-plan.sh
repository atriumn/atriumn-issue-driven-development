#!/bin/bash
# scripts/validate-plan.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments - if only one argument and it ends in .md, treat as plan doc
if [ $# -eq 1 ] && [[ "$1" == *.md ]]; then
    CONFIG_FILE=".github/development-pipeline-config.yml"
    PLAN_DOC="$1"
elif [ $# -eq 2 ]; then
    CONFIG_FILE="$1"
    PLAN_DOC="$2"
else
    CONFIG_FILE="${1:-.github/development-pipeline-config.yml}"
    PLAN_DOC="${2}"
fi

load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        CONFIG_SOURCE="$CONFIG_FILE"
    else
        CONFIG_SOURCE="$SCRIPT_DIR/../configs/default.yml"
    fi
    
    # Check if yq is available
    if ! command -v yq >/dev/null 2>&1; then
        echo "❌ yq is required but not installed. Please install yq to use this script."
        exit 1
    fi
    
    # Load required sections from config (using portable approach)
    REQUIRED_SECTIONS=()
    while IFS= read -r line; do
        REQUIRED_SECTIONS+=("$line")
    done < <(yq eval '.validation.plan_required_sections[]' "$CONFIG_SOURCE")
}

validate_file_exists() {
    if [ ! -f "$PLAN_DOC" ]; then
        echo "❌ Implementation plan not found: $PLAN_DOC"
        exit 1
    fi
    echo "✅ Implementation plan exists: $PLAN_DOC"
}

validate_yaml_frontmatter() {
    if ! head -20 "$PLAN_DOC" | grep -q "^---"; then
        echo "❌ Missing YAML frontmatter"
        exit 1
    fi
    
    local required_fields=("date" "researcher" "topic" "status")
    for field in "${required_fields[@]}"; do
        if ! grep -q "^$field:" "$PLAN_DOC"; then
            echo "❌ Missing required frontmatter field: $field"
            exit 1
        fi
    done
    echo "✅ YAML frontmatter valid"
}

validate_required_sections() {
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if ! grep -q "$section" "$PLAN_DOC"; then
            echo "❌ Missing required section: $section"
            exit 1
        fi
    done
    echo "✅ All required sections present"
}

validate_success_criteria() {
    # Check for both automated and manual verification sections
    if ! grep -A 10 "#### Automated Verification:" "$PLAN_DOC" | grep -q "make \|npm \|test"; then
        echo "❌ Automated verification section missing or invalid"
        echo "   Expected: Commands like 'make test', 'npm run lint', etc."
        exit 1
    fi
    
    if ! grep -q "#### Manual Verification:" "$PLAN_DOC"; then
        echo "❌ Manual verification section missing"
        exit 1
    fi
    
    echo "✅ Success criteria properly formatted"
}

validate_no_open_questions() {
    # Check for unresolved questions or TODOs (skip YAML frontmatter)
    local issues=("TODO" "FIXME" "XXX" "TBD")
    
    # Skip YAML frontmatter when checking for issues
    local content_without_frontmatter
    if head -20 "$PLAN_DOC" | grep -q "^---"; then
        # Find the end of frontmatter and get content after it
        content_without_frontmatter=$(awk '/^---$/{if(++c==2) f=1; next} f' "$PLAN_DOC")
    else
        content_without_frontmatter=$(cat "$PLAN_DOC")
    fi
    
    for issue in "${issues[@]}"; do
        if echo "$content_without_frontmatter" | grep -q "$issue"; then
            echo "❌ Found unresolved question or TODO: $issue"
            echo "   Implementation plan must resolve all questions before proceeding"
            exit 1
        fi
    done
    
    # Check for question marks pattern (???) - using simpler approach
    if echo "$content_without_frontmatter" | grep -q "???"; then
        echo "❌ Found unresolved question or TODO: ???"
        echo "   Implementation plan must resolve all questions before proceeding"
        exit 1
    fi
    
    echo "✅ No unresolved questions found"
}

validate_phase_structure() {
    # Count phases in the plan
    local phase_count=$(grep -c "^## Phase [0-9]" "$PLAN_DOC" || echo "0")
    
    if [ "$phase_count" -eq 0 ]; then
        echo "❌ No implementation phases found"
        echo "   Expected: ## Phase 1, ## Phase 2, etc."
        exit 1
    fi
    
    echo "✅ Implementation phases found ($phase_count phases)"
}

main() {
    echo "📋 Validating implementation plan: $PLAN_DOC"
    echo "📝 Using config: $CONFIG_SOURCE"
    
    load_config
    validate_file_exists
    validate_yaml_frontmatter
    validate_required_sections
    validate_success_criteria
    validate_no_open_questions
    validate_phase_structure
    
    echo ""
    echo "✅ Plan validation PASSED"
    echo "📊 Plan statistics:"
    echo "   - Phases: $(grep -c "^## Phase [0-9]" "$PLAN_DOC")"
    echo "   - Success criteria: $(grep -c "#### .*Verification:" "$PLAN_DOC")"
    echo "   - Word count: $(wc -w < "$PLAN_DOC")"
}

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [config_file] [plan_document]"
    echo ""
    echo "Examples:"
    echo "  $0 thoughts/shared/plans/my-implementation-plan.md"
    echo "  $0 .github/dev-config.yml thoughts/shared/plans/my-plan.md"
    exit 0
fi

main "$@"