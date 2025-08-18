#!/bin/bash
# scripts/validate-research.sh - Multi-repo aware version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Parse arguments - supports both JSON config and file config
if [ $# -eq 2 ] && [[ "$1" == *"{"* ]]; then
    # New JSON format from workflow
    CONFIG_JSON="${1}"
    RESEARCH_DOC="${2}"
    CONFIG_MODE="json"
elif [ $# -eq 1 ] && [[ "$1" == *.md ]]; then
    # Single argument - research doc only
    CONFIG_FILE=".github/development-pipeline-config.yml"
    RESEARCH_DOC="$1"
    CONFIG_MODE="file"
elif [ $# -eq 2 ]; then
    # Two arguments - config file and research doc
    CONFIG_FILE="$1"
    RESEARCH_DOC="$2"
    CONFIG_MODE="file"
else
    CONFIG_FILE="${1:-.github/development-pipeline-config.yml}"
    RESEARCH_DOC="${2}"
    CONFIG_MODE="file"
fi

# Parse configuration from JSON or file
parse_config() {
    if [ "$CONFIG_MODE" = "json" ]; then
        if [ -z "$CONFIG_JSON" ]; then
            echo "❌ No configuration provided"
            exit 1
        fi
        
        # Extract validation settings from JSON
        MIN_REFS=$(echo "$CONFIG_JSON" | jq -r '.validation.research_min_refs // 3')
        THOUGHTS_DIR=$(echo "$CONFIG_JSON" | jq -r '.thoughts_directory // "thoughts/"')
        REPO_NAME=$(echo "$CONFIG_JSON" | jq -r '.repo_name // "unknown"')
        
        # Extract required sections array
        REQUIRED_SECTIONS_JSON=$(echo "$CONFIG_JSON" | jq -r '.validation.plan_required_sections[]? // empty')
        REQUIRED_SECTIONS=()
        while IFS= read -r line; do
            [ -n "$line" ] && REQUIRED_SECTIONS+=("$line")
        done <<< "$REQUIRED_SECTIONS_JSON"
        
    else
        # File-based configuration (legacy mode)
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
        
        MIN_REFS=$(yq eval '.validation.research_min_refs // 3' "$CONFIG_SOURCE")
        THOUGHTS_DIR=$(yq eval '.thoughts_directory // "thoughts/"' "$CONFIG_SOURCE")
        REPO_NAME=$(yq eval '.repo_name // "unknown"' "$CONFIG_SOURCE")
        
        # Get required sections array
        REQUIRED_SECTIONS=()
        while IFS= read -r line; do
            REQUIRED_SECTIONS+=("$line")
        done < <(yq eval '.validation.plan_required_sections[]? // empty' "$CONFIG_SOURCE")
    fi
    
    # If no custom required sections, use defaults for research
    if [ ${#REQUIRED_SECTIONS[@]} -eq 0 ]; then
        REQUIRED_SECTIONS=(
            "## Research Question"
            "## Summary"
            "## Detailed Findings"
            "## Code References"
            "## Architecture Insights"
        )
    fi
    
    echo "📝 Using configuration:"
    echo "   Repository: $REPO_NAME"
    echo "   Min file references: $MIN_REFS"
    echo "   Thoughts directory: $THOUGHTS_DIR"
    echo "   Required sections: ${#REQUIRED_SECTIONS[@]} sections"
    echo "   Config mode: $CONFIG_MODE"
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
    local file_refs
    file_refs=$(grep -c '`[^`]*\.[a-z]*:' "$RESEARCH_DOC" 2>/dev/null || echo "0")
    file_refs=$(echo "$file_refs" | head -1 | tr -d '\n\r ')  # Get first line, remove whitespace
    
    if [ "$file_refs" -lt "$MIN_REFS" ]; then
        echo "❌ Insufficient file references ($file_refs found, need $MIN_REFS)"
        echo "   Pattern expected: \`filename.ext:line\`"
        exit 1
    fi
    echo "✅ File references sufficient ($file_refs found, need $MIN_REFS)"
}

validate_repo_specific_patterns() {
    local doc="$1"
    
    case "$REPO_NAME" in
        "platform-api")
            echo "🔍 Applying platform-api specific validations..."
            # Platform API specific validations
            if ! grep -q "API" "$doc"; then
                echo "⚠️  Platform API research should mention API considerations"
            fi
            
            if ! grep -q -i "security\|auth\|permission" "$doc"; then
                echo "⚠️  Platform API research should consider security implications"
            fi
            
            if ! grep -q -i "performance\|scalability" "$doc"; then
                echo "⚠️  Platform API research should consider performance impact"
            fi
            ;;
            
        "curatefor.me")
            echo "🔍 Applying curatefor.me specific validations..."
            # curatefor.me specific validations
            if grep -q "hld\|daemon" "$doc" && ! grep -q "humanlayer" "$doc"; then
                echo "⚠️  HLD-related research should mention humanlayer context"
            fi
            
            if grep -q -i "user.*interface\|frontend" "$doc" && ! grep -q -i "ux\|user.*experience" "$doc"; then
                echo "⚠️  Frontend research should consider user experience"
            fi
            ;;
            
        *)
            echo "ℹ️  Using generic validation rules for $REPO_NAME"
            ;;
    esac
}

validate_thoughts_directory_structure() {
    local doc="$1"
    
    # Ensure document is in correct thoughts directory structure
    EXPECTED_PATH_PREFIX="$THOUGHTS_DIR"
    
    if [[ ! "$doc" =~ ^$EXPECTED_PATH_PREFIX ]]; then
        echo "❌ Research document not in expected directory structure"
        echo "   Expected: $EXPECTED_PATH_PREFIX*"
        echo "   Actual: $doc"
        exit 1
    fi
    
    echo "✅ Document in correct directory structure"
}

validate_required_sections() {
    local doc="$1"
    
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if ! grep -q "$section" "$doc"; then
            echo "❌ Missing required section: $section"
            exit 1
        fi
    done
    
    echo "✅ All required sections present (${#REQUIRED_SECTIONS[@]} sections)"
}

validate_no_placeholders() {
    # Check for common placeholder text (skip YAML frontmatter)
    local placeholders=("TODO" "FIXME" "XXX" "\\.\\.\\.")
    
    # Skip YAML frontmatter when checking for placeholders
    local content_without_frontmatter
    if head -20 "$RESEARCH_DOC" | grep -q "^---"; then
        # Find the end of frontmatter and get content after it
        content_without_frontmatter=$(awk '/^---$/{if(++c==2) f=1; next} f' "$RESEARCH_DOC")
    else
        content_without_frontmatter=$(cat "$RESEARCH_DOC")
    fi
    
    for placeholder in "${placeholders[@]}"; do
        if echo "$content_without_frontmatter" | grep -q "$placeholder"; then
            echo "❌ Found placeholder text: $placeholder"
            echo "   Research document appears incomplete"
            exit 1
        fi
    done
    
    # Check for bracket placeholders like [TODO] or [PLACEHOLDER] but not valid markdown links
    if echo "$content_without_frontmatter" | grep -q "\\[TODO\\]\\|\\[FIXME\\]\\|\\[PLACEHOLDER\\]\\|\\[XXX\\]"; then
        echo "❌ Found bracket placeholder text"
        echo "   Research document appears incomplete"
        exit 1
    fi
    
    echo "✅ No placeholder text found"
}

main() {
    echo "🔍 Multi-repo research validation"
    echo "📄 Document: $RESEARCH_DOC"
    
    parse_config
    
    # Standard validations
    validate_file_exists
    validate_yaml_frontmatter
    validate_thoughts_directory_structure "$RESEARCH_DOC"
    validate_required_sections "$RESEARCH_DOC"
    validate_file_references
    validate_no_placeholders
    
    # Repository-specific validations
    validate_repo_specific_patterns "$RESEARCH_DOC"
    
    echo ""
    echo "✅ Multi-repo research validation PASSED"
    echo "📊 Document statistics:"
    echo "   - Repository: $REPO_NAME"
    echo "   - File references: $(grep -c '`[^`]*\.[a-z]*:' "$RESEARCH_DOC")"
    echo "   - Word count: $(wc -w < "$RESEARCH_DOC")"
    echo "   - Validation level: $MIN_REFS min refs"
}

# Usage help
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [config_json] [research_document]"
    echo ""
    echo "Examples:"
    echo "  $0 '{\"repo_name\":\"curatefor.me\",\"validation\":{\"research_min_refs\":3}}' research.md"
    echo "  $0 thoughts/shared/research/2025-08-17_my-research.md"
    echo "  $0 .github/dev-config.yml thoughts/shared/research/2025-08-17_my-research.md"
    exit 0
fi

main "$@"