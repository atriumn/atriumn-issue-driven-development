#!/bin/bash
set -e

# Script to create PR with manual approval
# Usage: ./create-manual-pr.sh ISSUE_NUM ISSUE_TITLE BRANCH_NAME BASE_BRANCH REPO_NAME APPROVER_LOGIN RESEARCH_DOC PLAN_DOC DECISION_DOC

ISSUE_NUM="$1"
ISSUE_TITLE="$2"
BRANCH_NAME="$3"
BASE_BRANCH="$4"
REPO_NAME="$5"
APPROVER_LOGIN="$6"
RESEARCH_DOC="$7"
PLAN_DOC="$8"
DECISION_DOC="$9"

PR_TITLE="Implement: $ISSUE_TITLE (#$ISSUE_NUM)"

# Create PR body
cat > pr_body.md << 'EOF'
## Summary
Implementation for issue #{ISSUE_NUM}: {ISSUE_TITLE}

**Human-approved implementation** - Reviewed and approved by @{APPROVER_LOGIN}

## Context Documents
- **Research**: [View Research Doc](https://github.com/{REPO_NAME}/blob/{BRANCH_NAME}/{RESEARCH_DOC})
- **Plan**: [View Implementation Plan](https://github.com/{REPO_NAME}/blob/{BRANCH_NAME}/{PLAN_DOC})  
- **Decision Record**: [View Decision Record](https://github.com/{REPO_NAME}/blob/{BRANCH_NAME}/{DECISION_DOC})

## Test Plan
- [x] Automated validation passed
- [x] Implementation reviewed and approved
- [x] All success criteria met

## Review Guidelines
This PR was generated through the Atriumn Issue-Driven Development pipeline with:
- Human-validated research and planning phases
- Implementation review and approval
- Quality checks

**Closes #{ISSUE_NUM}**

🟣 Generated with [Atriumn Issue-Driven Development](https://github.com/atriumn/atriumn-issue-driven-development)
EOF

# Substitute variables
sed -i.bak "s/{ISSUE_NUM}/$ISSUE_NUM/g" pr_body.md
sed -i.bak "s/{ISSUE_TITLE}/$ISSUE_TITLE/g" pr_body.md
sed -i.bak "s/{APPROVER_LOGIN}/$APPROVER_LOGIN/g" pr_body.md
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