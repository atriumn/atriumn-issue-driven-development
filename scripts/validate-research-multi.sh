#!/bin/bash
# scripts/validate-research-multi.sh - Multi-repo aware version

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_JSON="${1}"  # Configuration passed as JSON from workflow
RESEARCH_DOC="${2}"

# Parse configuration from JSON or file
parse_config() {
    if [ -z "$CONFIG_JSON" ]; then
        echo "❌ No configuration provided"
        exit 1
    fi
    
    # Check if it's a file path or JSON
    if [ -f "$CONFIG_JSON" ]; then
        # It's a file path - load and convert to JSON
        if ! command -v yq >/dev/null 2>&1; then
            echo "❌ yq is required but not installed. Please install yq to use this script."
            exit 1
        fi
        CONFIG_JSON=$(yq eval -o=json '.' "$CONFIG_JSON")
    fi
    
    # Extract validation settings using jq
    if ! command -v jq >/dev/null 2>&1; then
        echo "❌ jq is required but not installed. Please install jq to use this script."
        exit 1
    fi
    
    MIN_REFS=$(echo "$CONFIG_JSON" | jq -r '.validation.research_min_refs // 3')
    THOUGHTS_DIR=$(echo "$CONFIG_JSON" | jq -r '.thoughts_directory // "thoughts/"')
    REPO_NAME=$(echo "$CONFIG_JSON" | jq -r '.repo_name // "unknown"')
    
    # Get required sections if specified
    REQUIRED_SECTIONS_JSON=$(echo "$CONFIG_JSON" | jq -r '.validation.research_required_sections // null')
    
    # Set default required sections if none specified
    if [ "$REQUIRED_SECTIONS_JSON" = "null" ]; then
        REQUIRED_SECTIONS=(
            "## Research Question"
            "## Summary"
            "## Detailed Findings"
            "## Code References"
            "## Architecture Insights"
        )
    else
        # Parse custom required sections from JSON
        mapfile -t REQUIRED_SECTIONS < <(echo "$REQUIRED_SECTIONS_JSON" | jq -r '.[]')
    fi
    
    echo "📝 Using multi-repo configuration:"
    echo "   Repository: $REPO_NAME"
    echo "   Min file references: $MIN_REFS"
    echo "   Thoughts directory: $THOUGHTS_DIR"
    echo "   Required sections: ${#REQUIRED_SECTIONS[@]} sections"
}

validate_repo_specific_patterns() {
    local doc="$1"
    
    echo "🔍 Applying repository-specific validation rules..."
    
    case "$REPO_NAME" in
        "platform-api")
            # Platform API specific validations
            echo "   Checking platform-api specific requirements..."
            
            if ! grep -q -i "api\|endpoint\|service" "$doc"; then
                echo "⚠️  Platform API research should mention API/service considerations"
            fi
            
            if ! grep -q -i "security\|auth\|permission" "$doc"; then
                echo "⚠️  Platform API research should consider security implications"
            fi
            
            if ! grep -q -i "performance\|scale\|load" "$doc"; then
                echo "⚠️  Platform API research should consider performance implications"
            fi
            ;;
            
        "curatefor.me")
            # curatefor.me specific validations
            echo "   Checking curatefor.me specific requirements..."
            
            if grep -q -i "hld\|daemon" "$doc" && ! grep -q -i "humanlayer" "$doc"; then
                echo "⚠️  HLD-related research should mention humanlayer context"
            fi
            
            if grep -q -i "curation\|content" "$doc" && ! grep -q -i "user.*experience\|workflow" "$doc"; then
                echo "⚠️  Content curation research should consider user workflows"
            fi
            ;;
            
        *)
            echo "   Using generic validation rules for $REPO_NAME"
            ;;
    esac
    
    echo "✅ Repository-specific validation complete"
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

validate_file_references() {
    local doc="$1"
    
    # Count file references with pattern: `filename.ext:line`
    local file_refs=$(grep -c '`[^`]*\.[a-z]*:' "$doc" || echo "0")
    
    if [ "$file_refs" -lt "$MIN_REFS" ]; then
        echo "❌ Insufficient file references ($file_refs found, need $MIN_REFS)"
        echo "   Pattern expected: \`filename.ext:line\`"
        echo "   Repository '$REPO_NAME' requires minimum $MIN_REFS references"
        exit 1
    fi
    
    echo "✅ File references sufficient ($file_refs found, need $MIN_REFS)"
}

validate_required_sections() {
    local doc="$1"
    
    echo "🔍 Checking required sections..."
    
    for section in "${REQUIRED_SECTIONS[@]}"; do
        if ! grep -q "$section" "$doc"; then
            echo "❌ Missing required section: $section"
            exit 1
        fi
        echo "   ✅ Found: $section"
    done
    
    echo "✅ All required sections present (${#REQUIRED_SECTIONS[@]} sections)"
}

validate_research_quality() {
    local doc="$1"
    
    echo "🔍 Checking research quality indicators..."
    
    # Check for substantive content
    local word_count=$(wc -w < "$doc")
    if [ "$word_count" -lt 200 ]; then
        echo "⚠️  Research document seems short ($word_count words). Consider adding more detail."
    else
        echo "✅ Document has substantial content ($word_count words)"
    fi
    
    # Check for code analysis depth
    local code_analysis_lines=$(grep -c -i "implementation\|pattern\|architecture\|design" "$doc" || echo "0")
    if [ "$code_analysis_lines" -lt 3 ]; then
        echo "⚠️  Limited code analysis found. Consider deeper architectural insights."
    else
        echo "✅ Good code analysis depth ($code_analysis_lines relevant lines)"
    fi
}

main() {
    echo "🔍 Multi-repository research validation"
    echo "📄 Document: $RESEARCH_DOC"
    
    parse_config
    
    # Standard validations
    validate_file_exists "$RESEARCH_DOC"
    validate_yaml_frontmatter "$RESEARCH_DOC"
    validate_thoughts_directory_structure "$RESEARCH_DOC"
    validate_required_sections "$RESEARCH_DOC"
    validate_file_references "$RESEARCH_DOC"
    validate_no_placeholders "$RESEARCH_DOC"
    
    # Quality and repository-specific validations
    validate_research_quality "$RESEARCH_DOC"
    validate_repo_specific_patterns "$RESEARCH_DOC"
    
    echo ""
    echo "✅ Multi-repository research validation PASSED"
    echo "📊 Document statistics:"
    echo "   - Repository: $REPO_NAME"
    echo "   - File references: $(grep -c '`[^`]*\.[a-z]*:' "$RESEARCH_DOC")"
    echo "   - Word count: $(wc -w < "$RESEARCH_DOC")"
    echo "   - Validation level: $MIN_REFS min refs"
    echo "   - Thoughts directory: $THOUGHTS_DIR"
}

# Include the standard validation functions
validate_file_exists() {
    if [ ! -f "$1" ]; then
        echo "❌ Research document not found: $1"
        exit 1
    fi
    echo "✅ Research document exists: $1"
}

validate_yaml_frontmatter() {
    if ! head -20 "$1" | grep -q "^---"; then
        echo "❌ Missing YAML frontmatter"
        exit 1
    fi
    
    local required_fields=("date" "researcher" "topic" "status")
    for field in "${required_fields[@]}"; do
        if ! grep -q "^$field:" "$1"; then
            echo "❌ Missing required frontmatter field: $field"
            exit 1
        fi
    done
    echo "✅ YAML frontmatter valid"
}

validate_no_placeholders() {
    local placeholders=("TODO" "FIXME" "XXX" "TBD")
    
    for placeholder in "${placeholders[@]}"; do
        if grep -q "$placeholder" "$1"; then
            echo "❌ Found placeholder text: $placeholder"
            echo "   Research document appears incomplete"
            exit 1
        fi
    done
    
    # Check for question marks pattern (???)
    if grep -q "???" "$1"; then
        echo "❌ Found unresolved questions: ???"
        echo "   Research document appears incomplete"
        exit 1
    fi
    
    echo "✅ No placeholder text found"
}

# Help and usage
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Usage: $0 [config_json_or_file] [research_document]"
    echo ""
    echo "Multi-repository aware research validation script"
    echo ""
    echo "Configuration can be provided as:"
    echo "  - JSON string: '{\"repo_name\":\"curatefor.me\",\"validation\":{\"research_min_refs\":3}}'"
    echo "  - File path: 'configs/curatefor.me.yml'"
    echo ""
    echo "Examples:"
    echo "  $0 configs/curatefor.me.yml research.md"
    echo "  $0 '{\"repo_name\":\"platform-api\",\"validation\":{\"research_min_refs\":5}}' research.md"
    echo ""
    echo "Environment requirements:"
    echo "  - jq (for JSON processing)"
    echo "  - yq (for YAML processing, if using config files)"
    exit 0
fi

if [ $# -lt 2 ]; then
    echo "❌ Insufficient arguments"
    echo "Usage: $0 [config_json_or_file] [research_document]"
    echo "Use --help for more information"
    exit 1
fi

main "$@"