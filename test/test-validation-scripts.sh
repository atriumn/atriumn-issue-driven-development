#!/bin/bash
# test/test-validation-scripts.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DATA_DIR="$SCRIPT_DIR/test-data"
SCRIPTS_DIR="$SCRIPT_DIR/../scripts"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Create test data
setup_test_data() {
    mkdir -p "$TEST_DATA_DIR"
    
    # Create valid research document
    cat > "$TEST_DATA_DIR/valid-research.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
topic: "Test Research"
status: complete
---

# Research: Test Topic

## Research Question
How do we test validation scripts?

## Summary
This is a test research document with sufficient content and references.

## Detailed Findings
Found relevant code patterns in multiple files. The implementation uses a modular approach
with clear separation of concerns.

## Code References
- `src/main.js:45` - Main function initialization
- `lib/utils.ts:67` - Utility functions for validation
- `config/app.yml:12` - Configuration settings
- `test/fixtures.json:8` - Test data structure

## Architecture Insights
The system follows a layered architecture with clear interfaces between components.
This allows for better testability and maintainability.
EOF

    # Create invalid research document (missing sections and references)
    cat > "$TEST_DATA_DIR/invalid-research.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
topic: "Incomplete Research"
status: draft
---

# Incomplete Research

This research is missing required sections and has insufficient file references.

## Research Question
What happens when validation fails?

## Summary
TODO: Complete this section

Only one reference: `test.js:1`
EOF

    # Create valid implementation plan
    cat > "$TEST_DATA_DIR/valid-plan.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
topic: "Test Implementation Plan"
status: complete
---

# Implementation Plan: Test Feature

## Implementation Approach
We will implement this feature using a phased approach with comprehensive testing.

## Phase 1: Foundation
Set up the basic structure and core functionality.

#### Automated Verification:
- `make test` - Run unit tests
- `make lint` - Check code style

#### Manual Verification:
- Verify UI components render correctly
- Test user workflows manually

## Phase 2: Integration
Connect all components and add advanced features.

#### Automated Verification:
- `npm run integration-test` - Run integration tests

#### Manual Verification:
- Test cross-browser compatibility
- Verify performance meets requirements
EOF

    # Create invalid implementation plan
    cat > "$TEST_DATA_DIR/invalid-plan.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
---

# Incomplete Plan

This plan is missing required sections.

TODO: Add implementation approach
FIXME: Define phases properly
EOF

    log_info "Test data created in $TEST_DATA_DIR"
}

test_research_validation() {
    echo "🧪 Testing research validation..."
    
    if [ "$YQ_AVAILABLE" = "false" ]; then
        log_warn "Skipping research validation test - yq not available"
        return 0
    fi
    
    # Test valid document (use default config, pass research doc as second param)
    if "$SCRIPTS_DIR/validate-research.sh" "" "$TEST_DATA_DIR/valid-research.md" >/dev/null 2>&1; then
        log_info "Valid research document passed validation"
    else
        log_error "Valid research document failed validation"
        return 1
    fi
    
    # Test invalid document (should fail)
    if "$SCRIPTS_DIR/validate-research.sh" "" "$TEST_DATA_DIR/invalid-research.md" >/dev/null 2>&1; then
        log_error "Invalid research document incorrectly passed validation"
        return 1
    else
        log_info "Invalid research document correctly failed validation"
    fi
    
    # Test missing file
    if "$SCRIPTS_DIR/validate-research.sh" "" "$TEST_DATA_DIR/nonexistent.md" >/dev/null 2>&1; then
        log_error "Nonexistent file incorrectly passed validation"
        return 1
    else
        log_info "Nonexistent file correctly failed validation"
    fi
}

test_plan_validation() {
    echo "🧪 Testing plan validation..."
    
    if [ "$YQ_AVAILABLE" = "false" ]; then
        log_warn "Skipping plan validation test - yq not available"
        return 0
    fi
    
    # Test valid document (use default config, pass plan doc as second param)
    if "$SCRIPTS_DIR/validate-plan.sh" "" "$TEST_DATA_DIR/valid-plan.md" >/dev/null 2>&1; then
        log_info "Valid plan document passed validation"
    else
        log_error "Valid plan document failed validation"
        return 1
    fi
    
    # Test invalid document (should fail)
    if "$SCRIPTS_DIR/validate-plan.sh" "" "$TEST_DATA_DIR/invalid-plan.md" >/dev/null 2>&1; then
        log_error "Invalid plan document incorrectly passed validation"
        return 1
    else
        log_info "Invalid plan document correctly failed validation"
    fi
}

test_help_output() {
    echo "🧪 Testing help output..."
    
    # Test research script help
    if "$SCRIPTS_DIR/validate-research.sh" --help | grep -q "Usage:"; then
        log_info "Research script help output works"
    else
        log_error "Research script help output missing"
        return 1
    fi
    
    # Test plan script help
    if "$SCRIPTS_DIR/validate-plan.sh" --help | grep -q "Usage:"; then
        log_info "Plan script help output works"
    else
        log_error "Plan script help output missing"
        return 1
    fi
    
    # Test implementation script help
    if "$SCRIPTS_DIR/validate-implementation.sh" --help | grep -q "Usage:"; then
        log_info "Implementation script help output works"
    else
        log_error "Implementation script help output missing"
        return 1
    fi
    
    # Test PR script help
    if "$SCRIPTS_DIR/validate-pr.sh" --help | grep -q "Usage:"; then
        log_info "PR script help output works"
    else
        log_error "PR script help output missing"
        return 1
    fi
}

test_script_dependencies() {
    echo "🧪 Testing script dependencies..."
    
    # Check if scripts handle missing yq gracefully
    if command -v yq >/dev/null 2>&1; then
        log_info "yq is available for testing"
        YQ_AVAILABLE=true
    else
        log_warn "yq not available - skipping validation tests that require yq"
        YQ_AVAILABLE=false
    fi
    
    # Check if scripts handle missing gh gracefully
    if command -v gh >/dev/null 2>&1; then
        log_info "GitHub CLI is available for testing"
        GH_AVAILABLE=true
    else
        log_warn "GitHub CLI not available - skipping PR validation tests"
        GH_AVAILABLE=false
    fi
}

cleanup() {
    rm -rf "$TEST_DATA_DIR"
    log_info "Test data cleaned up"
}

run_all_tests() {
    echo "🚀 Starting validation script tests..."
    echo ""
    
    test_script_dependencies
    echo ""
    
    setup_test_data
    
    test_research_validation
    echo ""
    
    test_plan_validation
    echo ""
    
    test_help_output
    echo ""
    
    cleanup
    
    echo "✅ All validation script tests completed successfully!"
}

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "Usage: $0 [test_name]"
    echo ""
    echo "Available tests:"
    echo "  research     - Test research validation"
    echo "  plan         - Test plan validation"
    echo "  help         - Test help output"
    echo "  deps         - Test dependencies"
    echo "  all          - Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0 all"
    echo "  $0 research"
    exit 0
fi

# Run specific test or all tests
case "${1:-all}" in
    research)
        test_script_dependencies
        setup_test_data
        test_research_validation
        cleanup
        ;;
    plan)
        test_script_dependencies
        setup_test_data
        test_plan_validation
        cleanup
        ;;
    help)
        test_help_output
        ;;
    deps)
        test_script_dependencies
        ;;
    all)
        run_all_tests
        ;;
    *)
        echo "Unknown test: $1"
        exit 1
        ;;
esac