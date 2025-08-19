#!/bin/bash
set -e

# Script to create PR with proper formatting
# Usage: ./create-pr.sh ISSUE_NUM ISSUE_TITLE BRANCH_NAME BASE_BRANCH REPO_NAME VALIDATION_RESULTS RESEARCH_DOC PLAN_DOC DECISION_DOC

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
BRANCH_NAME="$3"
BASE_BRANCH="$4"
REPO_NAME="$5"
VALIDATION_RESULTS="$6"
RESEARCH_DOC="$7"
PLAN_DOC="$8"
DECISION_DOC="$9"

PR_TITLE="Implement: $ISSUE_TITLE (#$ISSUE_NUM)"

# Create PR body
cat > pr_body.md << 'EOF'
## Summary
Automated implementation for issue #{ISSUE_NUM}: {ISSUE_TITLE}

**Validation Results:**
{VALIDATION_RESULTS}

## Context Documents
- **Research**: [View Research Doc](https://github.com/{REPO_NAME}/blob/{BRANCH_NAME}/{RESEARCH_DOC})
- **Plan**: [View Implementation Plan](https://github.com/{REPO_NAME}/blob/{BRANCH_NAME}/{PLAN_DOC})  
- **Decision Record**: [View Decision Record](https://github.com/{REPO_NAME}/blob/{BRANCH_NAME}/{DECISION_DOC})

## Test Plan
- [x] Automated validation passed
- [x] Implementation follows approved plan
- [x] All success criteria met

## Review Guidelines
This PR was generated through the Atriumn Issue-Driven Development pipeline with:
- Automated research and planning phases
- Implementation validation
- Quality checks

**Closes #{ISSUE_NUM}**

🟣 Generated with [Atriumn Issue-Driven Development](https://github.com/atriumn/atriumn-issue-driven-development)
EOF

# Substitute variables
sed -i.bak "s/{ISSUE_NUM}/$ISSUE_NUM/g" pr_body.md
sed -i.bak "s/{ISSUE_TITLE}/$ISSUE_TITLE/g" pr_body.md
sed -i.bak "s/{VALIDATION_RESULTS}/$VALIDATION_RESULTS/g" pr_body.md
sed -i.bak "s/{REPO_NAME}/$REPO_NAME/g" pr_body.md
sed -i.bak "s/{BRANCH_NAME}/$BRANCH_NAME/g" pr_body.md
sed -i.bak "s/{RESEARCH_DOC}/$RESEARCH_DOC/g" pr_body.md
sed -i.bak "s/{PLAN_DOC}/$PLAN_DOC/g" pr_body.md
sed -i.bak "s/{DECISION_DOC}/$DECISION_DOC/g" pr_body.md

# Create PR
gh pr create \
  --repo "$REPO_NAME" \
  --title "$PR_TITLE" \
  --head "$BRANCH_NAME" \
  --base "$BASE_BRANCH" \
  --body-file pr_body.md

# Get PR number and return it
PR_NUMBER=$(gh pr view $BRANCH_NAME --repo "$REPO_NAME" --json number --jq -r '.number')
echo "PR_NUMBER=$PR_NUMBER"