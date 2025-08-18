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
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test result tracking
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   Validation Scripts Test Suite${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
}

print_test_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    TESTS_RUN=$((TESTS_RUN + 1))
    
    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $test_name"
        TESTS_PASSED=$((TESTS_PASSED + 1))
    else
        echo -e "${RED}❌ FAIL${NC}: $test_name"
        if [ -n "$details" ]; then
            echo -e "   ${YELLOW}Details: $details${NC}"
        fi
        TESTS_FAILED=$((TESTS_FAILED + 1))
    fi
}

# Create test data
setup_test_data() {
    echo -e "${BLUE}Setting up test data...${NC}"
    rm -rf "$TEST_DATA_DIR"
    mkdir -p "$TEST_DATA_DIR"
    
    # Create valid research document
    cat > "$TEST_DATA_DIR/valid-research.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
topic: "Test Research Document"
status: complete
tags: [research, testing]
---

# Research: Test Topic

**Date**: 2025-08-17T14:30:00-05:00
**Researcher**: test-user

## Research Question

How do we test validation scripts effectively?

## Summary

This is a comprehensive test research document that validates all required sections and patterns. The research covers validation script testing methodologies and includes proper file references as required by the validation framework.

## Detailed Findings

### Key Requirements Analysis
- Validation scripts must check for proper YAML frontmatter
- File references are critical for traceability
- All required sections must be present

### Technical Implementation
Found relevant implementation details in the following files:
- Configuration system defined in `configs/schema.yml:45`
- Main validation logic in `scripts/validate-research.sh:75` 
- Helper functions located in `lib/utils.ts:123`

## Code References

- `scripts/validate-research.sh:26` - Configuration loading logic
- `configs/default.yml:12` - Default validation settings
- `test/test-data/sample.md:89` - Example valid document structure
- `templates/decision-record-template.md:34` - Template structure reference

## Architecture Insights

The validation system follows a modular architecture where each validation script can be configured independently through YAML configuration files. This allows for repository-specific customization while maintaining consistent validation standards across all projects.

## Historical Context (from thoughts/)

None available for this test document.

## Related Research

This test document validates the research validation framework itself.

## Open Questions

None - all validation requirements have been addressed in this test document.
EOF

    # Create invalid research document (missing sections)
    cat > "$TEST_DATA_DIR/invalid-research-missing-sections.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
topic: "Incomplete Research"
status: incomplete
---

# Incomplete Research

This research is missing required sections and file references.

## Summary

This document is intentionally incomplete for testing validation failure cases.
EOF

    # Create invalid research document (missing frontmatter)
    cat > "$TEST_DATA_DIR/invalid-research-no-frontmatter.md" << 'EOF'
# Research Without Frontmatter

This document has no YAML frontmatter.

## Research Question
How to test missing frontmatter?

## Summary  
This should fail validation.

## Detailed Findings
No findings because no frontmatter.

## Code References
- `some/file.js:123` - Some reference

## Architecture Insights
None.
EOF

    # Create invalid research with insufficient file references
    cat > "$TEST_DATA_DIR/invalid-research-no-refs.md" << 'EOF'
---
date: 2025-08-17T14:30:00-05:00
researcher: test-user
topic: "Research Without File References"
status: complete
---

# Research: No File References

## Research Question
How to test insufficient file references?

## Summary
This document has all required sections but insufficient file references.

## Detailed Findings
Some findings without proper file references.

## Code References
This section exists but has no actual file references.

## Architecture Insights
Some insights without file references.
EOF

    # Create valid implementation plan
    cat > "$TEST_DATA_DIR/valid-plan.md" << 'EOF'
---
date: 2025-08-17T15:00:00-05:00
researcher: test-user
topic: "Test Implementation Plan"
status: complete
---

# Test Feature Implementation Plan

## Overview
Implementation plan for testing validation scripts.

## Implementation Approach
Systematic testing approach using shell scripts and test data.

## Phase 1: Setup
Create test infrastructure and sample documents.

#### Automated Verification:
- [ ] Test scripts run successfully: `./test/test-validation-scripts.sh`
- [ ] All validation scripts are executable: `find scripts/ -name "*.sh" -executable`
- [ ] Configuration files are valid: `make validate-config`

#### Manual Verification:
- [ ] Test output is readable and informative
- [ ] Error messages are clear and actionable
- [ ] Test coverage includes all validation scenarios

## Phase 2: Validation
Run comprehensive validation tests.

#### Automated Verification:
- [ ] Research validation tests pass: `make test-research-validation`
- [ ] Plan validation tests pass: `make test-plan-validation`
- [ ] All tests complete without errors: `make test-all`

#### Manual Verification:
- [ ] Test results are accurate
- [ ] Edge cases are properly handled
- [ ] Documentation is up to date
EOF

    # Create invalid plan (missing sections)
    cat > "$TEST_DATA_DIR/invalid-plan-missing-sections.md" << 'EOF'
---
date: 2025-08-17T15:00:00-05:00
researcher: test-user
topic: "Incomplete Plan"
status: incomplete
---

# Incomplete Implementation Plan

This plan is missing required sections.

## Overview
Some overview text.
EOF

    echo -e "${GREEN}✅ Test data setup complete${NC}"
}

# Test research validation script
test_research_validation() {
    echo
    echo -e "${BLUE}Testing Research Validation Script${NC}"
    echo "======================================"
    
    # Test 1: Valid research document should pass
    if "$SCRIPTS_DIR/validate-research.sh" "$TEST_DATA_DIR/valid-research.md" >/dev/null 2>&1; then
        print_test_result "Valid research document" "PASS"
    else
        print_test_result "Valid research document" "FAIL" "Valid document failed validation"
    fi
    
    # Test 2: Invalid document (missing sections) should fail
    if ! "$SCRIPTS_DIR/validate-research.sh" "$TEST_DATA_DIR/invalid-research-missing-sections.md" >/dev/null 2>&1; then
        print_test_result "Invalid research (missing sections)" "PASS"
    else
        print_test_result "Invalid research (missing sections)" "FAIL" "Invalid document passed validation"
    fi
    
    # Test 3: Invalid document (no frontmatter) should fail
    if ! "$SCRIPTS_DIR/validate-research.sh" "$TEST_DATA_DIR/invalid-research-no-frontmatter.md" >/dev/null 2>&1; then
        print_test_result "Invalid research (no frontmatter)" "PASS"
    else
        print_test_result "Invalid research (no frontmatter)" "FAIL" "Document without frontmatter passed validation"
    fi
    
    # Test 4: Invalid document (insufficient file references) should fail
    if ! "$SCRIPTS_DIR/validate-research.sh" "$TEST_DATA_DIR/invalid-research-no-refs.md" >/dev/null 2>&1; then
        print_test_result "Invalid research (insufficient file refs)" "PASS"
    else
        print_test_result "Invalid research (insufficient file refs)" "FAIL" "Document with insufficient file references passed validation"
    fi
    
    # Test 5: Non-existent file should fail
    if ! "$SCRIPTS_DIR/validate-research.sh" "$TEST_DATA_DIR/non-existent.md" >/dev/null 2>&1; then
        print_test_result "Non-existent research file" "PASS"
    else
        print_test_result "Non-existent research file" "FAIL" "Non-existent file somehow passed validation"
    fi
}

# Test plan validation script
test_plan_validation() {
    echo
    echo -e "${BLUE}Testing Plan Validation Script${NC}"
    echo "================================"
    
    # Test 1: Valid plan document should pass
    if "$SCRIPTS_DIR/validate-plan.sh" "$TEST_DATA_DIR/valid-plan.md" >/dev/null 2>&1; then
        print_test_result "Valid plan document" "PASS"
    else
        print_test_result "Valid plan document" "FAIL" "Valid plan failed validation"
    fi
    
    # Test 2: Invalid plan (missing sections) should fail
    if ! "$SCRIPTS_DIR/validate-plan.sh" "$TEST_DATA_DIR/invalid-plan-missing-sections.md" >/dev/null 2>&1; then
        print_test_result "Invalid plan (missing sections)" "PASS"
    else
        print_test_result "Invalid plan (missing sections)" "FAIL" "Invalid plan passed validation"
    fi
    
    # Test 3: Non-existent file should fail
    if ! "$SCRIPTS_DIR/validate-plan.sh" "$TEST_DATA_DIR/non-existent-plan.md" >/dev/null 2>&1; then
        print_test_result "Non-existent plan file" "PASS"
    else
        print_test_result "Non-existent plan file" "FAIL" "Non-existent file somehow passed validation"
    fi
}

# Test script help functionality
test_help_functionality() {
    echo
    echo -e "${BLUE}Testing Help Functionality${NC}"
    echo "============================"
    
    # Test research script help
    if "$SCRIPTS_DIR/validate-research.sh" --help >/dev/null 2>&1; then
        print_test_result "Research script help flag" "PASS"
    else
        print_test_result "Research script help flag" "FAIL" "Help flag failed"
    fi
    
    # Test plan script help
    if "$SCRIPTS_DIR/validate-plan.sh" --help >/dev/null 2>&1; then
        print_test_result "Plan script help flag" "PASS"
    else
        print_test_result "Plan script help flag" "FAIL" "Help flag failed"
    fi
    
    # Test implementation script help
    if "$SCRIPTS_DIR/validate-implementation.sh" --help >/dev/null 2>&1; then
        print_test_result "Implementation script help flag" "PASS"
    else
        print_test_result "Implementation script help flag" "FAIL" "Help flag failed"
    fi
    
    # Test PR script help
    if "$SCRIPTS_DIR/validate-pr.sh" --help >/dev/null 2>&1; then
        print_test_result "PR script help flag" "PASS"
    else
        print_test_result "PR script help flag" "FAIL" "Help flag failed"
    fi
}

# Test script executable permissions
test_script_permissions() {
    echo
    echo -e "${BLUE}Testing Script Permissions${NC}"
    echo "==========================="
    
    local scripts=("validate-research.sh" "validate-plan.sh" "validate-implementation.sh" "validate-pr.sh")
    
    for script in "${scripts[@]}"; do
        if [ -x "$SCRIPTS_DIR/$script" ]; then
            print_test_result "Script executable: $script" "PASS"
        else
            print_test_result "Script executable: $script" "FAIL" "Script is not executable"
        fi
    done
}

# Test configuration file access
test_config_access() {
    echo
    echo -e "${BLUE}Testing Configuration Access${NC}"
    echo "=============================="
    
    # Test default config exists
    if [ -f "$SCRIPT_DIR/../configs/default.yml" ]; then
        print_test_result "Default config file exists" "PASS"
    else
        print_test_result "Default config file exists" "FAIL" "Default config not found"
    fi
    
    # Test schema file exists
    if [ -f "$SCRIPT_DIR/../configs/schema.yml" ]; then
        print_test_result "Schema config file exists" "PASS"
    else
        print_test_result "Schema config file exists" "FAIL" "Schema config not found"
    fi
    
    # Test if yq is available (required for validation scripts)
    if command -v yq >/dev/null 2>&1; then
        print_test_result "yq command available" "PASS"
    else
        print_test_result "yq command available" "FAIL" "yq is required but not installed"
    fi
}

# Cleanup test data
cleanup() {
    echo
    echo -e "${BLUE}Cleaning up test data...${NC}"
    rm -rf "$TEST_DATA_DIR"
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Print final results
print_summary() {
    echo
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}           Test Results Summary${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo -e "Total tests run: ${BLUE}$TESTS_RUN${NC}"
    echo -e "Tests passed: ${GREEN}$TESTS_PASSED${NC}"
    echo -e "Tests failed: ${RED}$TESTS_FAILED${NC}"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo
        echo -e "${GREEN}🎉 All tests passed! Validation scripts are working correctly.${NC}"
        exit 0
    else
        echo
        echo -e "${RED}❌ Some tests failed. Please review the validation scripts.${NC}"
        exit 1
    fi
}

# Main test execution
main() {
    print_header
    
    # Check prerequisites
    if ! command -v yq >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: yq is not installed. Some tests may fail.${NC}"
        echo -e "   Install yq with: brew install yq (macOS) or see https://github.com/mikefarah/yq"
        echo
    fi
    
    setup_test_data
    test_script_permissions
    test_config_access
    test_help_functionality
    test_research_validation
    test_plan_validation
    
    cleanup
    print_summary
}

# Run tests
main "$@"