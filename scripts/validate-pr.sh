#!/bin/bash
# scripts/validate-pr.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1:-.github/development-pipeline-config.yml}"
PR_NUMBER="${2}"

load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        CONFIG_SOURCE="$CONFIG_FILE"
    else
        CONFIG_SOURCE="$SCRIPT_DIR/../configs/default.yml"
    fi
    
    # Check if gh is available
    if ! command -v gh >/dev/null 2>&1; then
        echo "❌ GitHub CLI (gh) is required but not installed. Please install gh to use this script."
        exit 1
    fi
}

validate_pr_exists() {
    if ! gh pr view "$PR_NUMBER" >/dev/null 2>&1; then
        echo "❌ PR does not exist: #$PR_NUMBER"
        exit 1
    fi
    echo "✅ PR exists: #$PR_NUMBER"
}

validate_pr_description() {
    local pr_body=$(gh pr view "$PR_NUMBER" --json body --jq '.body')
    
    # Check for required sections in PR description
    local required_sections=("Summary" "Related Documents" "Testing" "Changes Made")
    
    for section in "${required_sections[@]}"; do
        if ! echo "$pr_body" | grep -q "$section"; then
            echo "❌ PR description missing section: $section"
            exit 1
        fi
    done
    
    echo "✅ PR description properly structured"
}

validate_document_links() {
    local pr_body=$(gh pr view "$PR_NUMBER" --json body --jq '.body')
    
    # Check for links to research and plan documents
    if ! echo "$pr_body" | grep -q "research.*\.md"; then
        echo "❌ PR description missing link to research document"
        exit 1
    fi
    
    if ! echo "$pr_body" | grep -q "plans.*\.md"; then
        echo "❌ PR description missing link to implementation plan"
        exit 1
    fi
    
    echo "✅ Document links present in PR description"
}

validate_reviewers_assigned() {
    local reviewers=$(gh pr view "$PR_NUMBER" --json reviewRequests --jq '.reviewRequests | length')
    
    if [ "$reviewers" -eq 0 ]; then
        echo "❌ No reviewers assigned to PR"
        exit 1
    fi
    
    echo "✅ Reviewers assigned ($reviewers reviewers)"
}

validate_status_checks() {
    # Check if all required status checks are passing
    local status_checks=$(gh pr view "$PR_NUMBER" --json statusCheckRollup --jq '.statusCheckRollup[]? | select(.conclusion == "FAILURE") | .name' 2>/dev/null || echo "")
    
    if [ -n "$status_checks" ]; then
        echo "❌ Failing status checks:"
        echo "$status_checks"
        exit 1
    fi
    
    echo "✅ All status checks passing"
}

validate_labels() {
    local labels=$(gh pr view "$PR_NUMBER" --json labels --jq '.labels | length')
    
    if [ "$labels" -eq 0 ]; then
        echo "⚠️  No labels assigned to PR (recommended but not required)"
    else
        echo "✅ Labels assigned ($labels labels)"
    fi
}

validate_branch_naming() {
    local head_branch=$(gh pr view "$PR_NUMBER" --json headRefName --jq '.headRefName')
    
    # Check if branch follows naming convention
    if ! echo "$head_branch" | grep -q "^feature/\|^hotfix/\|^bugfix/"; then
        echo "⚠️  Branch name doesn't follow convention: $head_branch"
        echo "   Expected: feature/, hotfix/, or bugfix/ prefix"
    else
        echo "✅ Branch naming follows convention: $head_branch"
    fi
}

main() {
    echo "🔄 Validating PR: #$PR_NUMBER"
    echo "📝 Using config: $CONFIG_SOURCE"
    
    load_config
    validate_pr_exists
    validate_pr_description
    validate_document_links
    validate_reviewers_assigned
    validate_status_checks
    validate_labels
    validate_branch_naming
    
    echo ""
    echo "✅ PR validation PASSED"
    echo "📊 PR statistics:"
    echo "   - Reviewers: $(gh pr view "$PR_NUMBER" --json reviewRequests --jq '.reviewRequests | length')"
    echo "   - Files changed: $(gh pr view "$PR_NUMBER" --json files --jq '.files | length')"
    echo "   - Labels: $(gh pr view "$PR_NUMBER" --json labels --jq '.labels | length')"
    echo "   - Status checks: $(gh pr view "$PR_NUMBER" --json statusCheckRollup --jq '.statusCheckRollup | length' 2>/dev/null || echo "0")"
}

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [config_file] [pr_number]"
    echo ""
    echo "Examples:"
    echo "  $0 123"
    echo "  $0 .github/dev-config.yml 123"
    exit 0
fi

main "$@"