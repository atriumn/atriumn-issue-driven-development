#!/bin/bash
# scripts/validate-research.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${1:-.github/development-pipeline-config.yml}"
RESEARCH_DOC="${2}"

# Load configuration
load_config() {
    if [ -f "$CONFIG_FILE" ]; then
        # Use repo-specific config if it exists
        CONFIG_SOURCE="$CONFIG_FILE"
    else
        # Fall back to default config
        CONFIG_SOURCE="$SCRIPT_DIR/../configs/default.yml"
    fi
    
    # Check if yq is available
    if ! command -v yq >/dev/null 2>&1; then
        echo "❌ yq is required but not installed. Please install yq to use this script."
        exit 1
    fi
    
    MIN_REFS=$(yq eval '.validation.research_min_refs' "$CONFIG_SOURCE")
    THOUGHTS_DIR=$(yq eval '.thoughts_directory' "$CONFIG_SOURCE")
}

validate_file_exists() {
    if [ ! -f "$RESEARCH_DOC" ]; then
        echo "❌ Research document not found: $RESEARCH_DOC"
        exit 1
    fi
    echo "✅ Research document exists: $RESEARCH_DOC"
}

validate_yaml_frontmatter() {
    if ! head -20 "$RESEARCH_DOC" | grep -q "^---"; then
        echo "❌ Missing YAML frontmatter"
        exit 1
    fi
    
    # Check required frontmatter fields
    local required_fields=("date" "researcher" "topic" "status")
    for field in "${required_fields[@]}"; do
        if ! grep -q "^$field:" "$RESEARCH_DOC"; then
            echo "❌ Missing required frontmatter field: $field"
            exit 1
        fi
    done
    echo "✅ YAML frontmatter valid"
}

validate_required_sections() {
    local required_sections=(
        "## Research Question"
        "## Summary" 
        "## Detailed Findings"
        "## Code References"
        "## Architecture Insights"
    )
    
    for section in "${required_sections[@]}"; do
        if ! grep -q "$section" "$RESEARCH_DOC"; then
            echo "❌ Missing required section: $section"
            exit 1
        fi
    done
    echo "✅ All required sections present"
}

validate_file_references() {
    # Count file references with pattern: `filename.ext:line`
    local file_refs=$(grep -c '`[^`]*\.[a-z]*:' "$RESEARCH_DOC" || echo "0")
    
    if [ "$file_refs" -lt "$MIN_REFS" ]; then
        echo "❌ Insufficient file references ($file_refs found, need $MIN_REFS)"
        echo "   Pattern expected: \`filename.ext:line\`"
        exit 1
    fi
    echo "✅ File references sufficient ($file_refs found, need $MIN_REFS)"
}

validate_no_placeholders() {
    # Check for common placeholder text
    local placeholders=("TODO" "FIXME" "XXX" "\\[.*\\]" "\\.\\.\\.")
    
    for placeholder in "${placeholders[@]}"; do
        if grep -q "$placeholder" "$RESEARCH_DOC"; then
            echo "❌ Found placeholder text: $placeholder"
            echo "   Research document appears incomplete"
            exit 1
        fi
    done
    echo "✅ No placeholder text found"
}

main() {
    echo "🔍 Validating research document: $RESEARCH_DOC"
    echo "📝 Using config: $CONFIG_SOURCE"
    
    load_config
    validate_file_exists
    validate_yaml_frontmatter
    validate_required_sections
    validate_file_references
    validate_no_placeholders
    
    echo ""
    echo "✅ Research validation PASSED"
    echo "📊 Document statistics:"
    echo "   - File references: $(grep -c '`[^`]*\.[a-z]*:' "$RESEARCH_DOC")"
    echo "   - Word count: $(wc -w < "$RESEARCH_DOC")"
    echo "   - Line count: $(wc -l < "$RESEARCH_DOC")"
}

# Usage help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [config_file] [research_document]"
    echo ""
    echo "Examples:"
    echo "  $0 thoughts/shared/research/2025-08-17_my-research.md"
    echo "  $0 .github/dev-config.yml thoughts/shared/research/2025-08-17_my-research.md"
    exit 0
fi

main "$@"