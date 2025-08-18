# Makefile for Shared Workflows Validation Scripts
# 
# This Makefile provides convenient commands for testing and validating
# the development pipeline components.

.PHONY: help test test-validation test-research test-plan test-implementation test-pr validate-config install-deps check-deps clean

# Default target
help:
	@echo "Shared Workflows Validation Commands"
	@echo "====================================="
	@echo ""
	@echo "Testing Commands:"
	@echo "  make test                 - Run all validation script tests"
	@echo "  make test-validation      - Run validation script test suite"
	@echo ""
	@echo "Individual Validation Commands:"
	@echo "  make test-research DOC=<file>    - Test research document validation"
	@echo "  make test-plan DOC=<file>        - Test implementation plan validation"
	@echo "  make test-implementation BRANCH=<name> - Test implementation validation"
	@echo "  make test-pr PR=<number>         - Test PR validation"
	@echo ""
	@echo "Configuration Commands:"
	@echo "  make validate-config      - Validate configuration files"
	@echo "  make check-deps          - Check required dependencies"
	@echo "  make install-deps        - Install required dependencies (macOS)"
	@echo ""
	@echo "Utility Commands:"
	@echo "  make clean               - Clean up test artifacts"
	@echo "  make help                - Show this help message"
	@echo ""
	@echo "Examples:"
	@echo "  make test-research DOC=thoughts/shared/research/my-research.md"
	@echo "  make test-plan DOC=thoughts/shared/plans/my-plan.md" 
	@echo "  make test-implementation BRANCH=feature/issue-123-my-feature"
	@echo "  make test-pr PR=456"

# Check if required dependencies are installed
check-deps:
	@echo "🔍 Checking dependencies..."
	@command -v yq >/dev/null 2>&1 || (echo "❌ yq is required but not installed. Run 'make install-deps' or see https://github.com/mikefarah/yq" && exit 1)
	@command -v gh >/dev/null 2>&1 || (echo "❌ GitHub CLI (gh) is required but not installed. See https://cli.github.com/" && exit 1)
	@echo "✅ All dependencies are installed"

# Install dependencies on macOS (requires Homebrew)
install-deps:
	@echo "📦 Installing dependencies..."
	@if command -v brew >/dev/null 2>&1; then \
		brew install yq gh; \
		echo "✅ Dependencies installed successfully"; \
	else \
		echo "❌ Homebrew not found. Please install manually:"; \
		echo "   - yq: https://github.com/mikefarah/yq"; \
		echo "   - gh: https://cli.github.com/"; \
		exit 1; \
	fi

# Run all tests
test: test-validation

# Run validation script test suite
test-validation: check-deps
	@echo "🧪 Running validation script test suite..."
	@./test/test-validation-scripts.sh

# Test research document validation
test-research:
	@if [ -z "$(DOC)" ]; then \
		echo "❌ Usage: make test-research DOC=<document_path>"; \
		echo "   Example: make test-research DOC=thoughts/shared/research/my-research.md"; \
		exit 1; \
	fi
	@echo "🔍 Validating research document: $(DOC)"
	@./scripts/validate-research.sh "$(DOC)"

# Test implementation plan validation
test-plan:
	@if [ -z "$(DOC)" ]; then \
		echo "❌ Usage: make test-plan DOC=<document_path>"; \
		echo "   Example: make test-plan DOC=thoughts/shared/plans/my-plan.md"; \
		exit 1; \
	fi
	@echo "📋 Validating implementation plan: $(DOC)"
	@./scripts/validate-plan.sh "$(DOC)"

# Test implementation validation
test-implementation:
	@if [ -z "$(BRANCH)" ]; then \
		echo "❌ Usage: make test-implementation BRANCH=<branch_name>"; \
		echo "   Example: make test-implementation BRANCH=feature/issue-123-my-feature"; \
		exit 1; \
	fi
	@echo "⚙️ Validating implementation on branch: $(BRANCH)"
	@./scripts/validate-implementation.sh "$(BRANCH)"

# Test PR validation
test-pr:
	@if [ -z "$(PR)" ]; then \
		echo "❌ Usage: make test-pr PR=<pr_number>"; \
		echo "   Example: make test-pr PR=456"; \
		exit 1; \
	fi
	@echo "🔄 Validating PR: #$(PR)"
	@./scripts/validate-pr.sh "$(PR)"

# Validate configuration files
validate-config: check-deps
	@echo "⚙️ Validating configuration files..."
	@echo "📝 Checking default.yml..."
	@yq eval '.' configs/default.yml >/dev/null && echo "✅ configs/default.yml is valid"
	@echo "📝 Checking schema.yml..."
	@yq eval '.' configs/schema.yml >/dev/null && echo "✅ configs/schema.yml is valid"
	@if [ -f configs/curatefor.me.yml ]; then \
		echo "📝 Checking curatefor.me.yml..."; \
		yq eval '.' configs/curatefor.me.yml >/dev/null && echo "✅ configs/curatefor.me.yml is valid"; \
	fi
	@echo "✅ All configuration files are valid"

# Clean up test artifacts
clean:
	@echo "🧹 Cleaning up test artifacts..."
	@rm -rf test/test-data
	@echo "✅ Cleanup complete"

# Development helpers
.PHONY: make-scripts-executable lint-scripts

# Ensure all scripts are executable
make-scripts-executable:
	@echo "🔧 Making all scripts executable..."
	@chmod +x scripts/*.sh
	@chmod +x test/*.sh
	@echo "✅ All scripts are now executable"

# Lint shell scripts (requires shellcheck)
lint-scripts:
	@if command -v shellcheck >/dev/null 2>&1; then \
		echo "🔍 Linting shell scripts..."; \
		shellcheck scripts/*.sh test/*.sh; \
		echo "✅ Script linting complete"; \
	else \
		echo "⚠️  shellcheck not installed. Install with: brew install shellcheck"; \
	fi