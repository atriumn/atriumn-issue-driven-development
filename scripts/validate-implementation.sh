#!/bin/bash
# scripts/validate-implementation.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1:-.github/development-pipeline-config.yml}"
BRANCH_NAME="${2}"

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
    
    # Load test commands from config (using portable approach)
    TEST_COMMANDS=()
    while IFS= read -r line; do
        TEST_COMMANDS+=("$line")
    done < <(yq eval '.validation.implementation_test_commands[]' "$CONFIG_SOURCE")
}

validate_branch_exists() {
    if ! git rev-parse --verify "$BRANCH_NAME" >/dev/null 2>&1; then
        echo "❌ Branch does not exist: $BRANCH_NAME"
        exit 1
    fi
    echo "✅ Branch exists: $BRANCH_NAME"
}

validate_branch_state() {
    # Switch to the branch
    git checkout "$BRANCH_NAME" >/dev/null 2>&1
    
    # Get base branch from config
    local base_branch=$(yq eval '.base_branch' "$CONFIG_SOURCE")
    
    # Check if branch is ahead of base
    local commits_ahead=$(git rev-list --count HEAD ^"$base_branch" 2>/dev/null || echo "0")
    if [ "$commits_ahead" -eq 0 ]; then
        echo "❌ Branch has no commits ahead of base branch ($base_branch)"
        exit 1
    fi
    
    echo "✅ Branch state valid ($commits_ahead commits ahead of $base_branch)"
}

validate_test_commands() {
    echo "🧪 Running implementation validation tests..."
    
    for cmd in "${TEST_COMMANDS[@]}"; do
        echo "   Running: $cmd"
        if ! eval "$cmd" >/dev/null 2>&1; then
            echo "❌ Test command failed: $cmd"
            exit 1
        fi
        echo "   ✅ Passed: $cmd"
    done
    
    echo "✅ All test commands passed"
}

validate_no_merge_conflicts() {
    # Check if branch can merge cleanly with base
    local base_branch=$(yq eval '.base_branch' "$CONFIG_SOURCE")
    
    if ! git merge-tree "$(git merge-base HEAD "$base_branch")" HEAD "$base_branch" >/dev/null 2>&1; then
        echo "❌ Branch has merge conflicts with $base_branch"
        exit 1
    fi
    
    echo "✅ No merge conflicts detected"
}

validate_decision_record_updated() {
    local issue_number=$(echo "$BRANCH_NAME" | grep -o 'issue-[0-9]*' | cut -d'-' -f2 2>/dev/null || echo "")
    
    if [ -z "$issue_number" ]; then
        echo "⚠️  Could not extract issue number from branch name: $BRANCH_NAME"
        echo "   Expected format: feature/issue-123-description"
        return 0
    fi
    
    local decision_file="thoughts/shared/decisions/pipeline-issue-$issue_number.md"
    
    if [ ! -f "$decision_file" ]; then
        echo "❌ Decision record not found: $decision_file"
        exit 1
    fi
    
    # Check if decision record mentions implementation
    if ! grep -q "Implementation Phase" "$decision_file"; then
        echo "❌ Decision record not updated with implementation details"
        exit 1
    fi
    
    echo "✅ Decision record updated: $decision_file"
}

main() {
    echo "⚙️ Validating implementation on branch: $BRANCH_NAME"
    echo "📝 Using config: $CONFIG_SOURCE"
    
    load_config
    validate_branch_exists
    validate_branch_state
    validate_test_commands
    validate_no_merge_conflicts
    validate_decision_record_updated
    
    echo ""
    echo "✅ Implementation validation PASSED"
    echo "📊 Implementation statistics:"
    local base_branch=$(yq eval '.base_branch' "$CONFIG_SOURCE")
    echo "   - Commits: $(git rev-list --count HEAD ^"$base_branch" 2>/dev/null || echo "0")"
    echo "   - Files changed: $(git diff --name-only "$base_branch" 2>/dev/null | wc -l || echo "0")"
    echo "   - Test commands run: ${#TEST_COMMANDS[@]}"
}

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [config_file] [branch_name]"
    echo ""
    echo "Examples:"
    echo "  $0 feature/issue-123-my-feature"
    echo "  $0 .github/dev-config.yml feature/issue-123-my-feature"
    exit 0
fi

main "$@"