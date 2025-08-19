You are running in CI on branch "${feature_ref}", issue #${issue_number}, repository "${repository}".
Do not ask questions. Do not wait for input. Do not use Bash.

TASK:
1) Review the research document at thoughts/shared/research/issue-${issue_number}.md to understand the context and findings.
2) Analyze the specific requirements for: "${task_description}".
3) Create a detailed implementation plan that covers technical approach, file changes, testing strategy, and risks.
4) Write it to path EXACTLY: ${output_path}
5) The file MUST be created in this run (non-empty), with this minimal structure:

---
date: [ISO timestamp]
branch: "${feature_ref}"
repository: "${repository}"
issue: "${issue_number}"
task_pack_id: "plan"
task_pack_version: 1
runner: "claude-code"
status: complete
---

# Implementation Plan for Issue #${issue_number}

## Overview
- Brief summary of the feature/fix to be implemented
- Key objectives and success criteria

## Technical Approach
- Architecture decisions and design patterns
- Integration points with existing systems
- Data flow and API changes

## Implementation Steps
1. **Phase 1**: [Description]
   - Specific files to modify/create
   - Code changes required
   
2. **Phase 2**: [Description]
   - Dependencies and prerequisites
   - Implementation details

3. **Phase 3**: [Description]
   - Testing and validation
   - Deployment considerations

## File Changes
- List specific files that will be modified or created
- Brief description of changes for each file
- Dependencies between changes

## Testing Strategy
- Unit tests to be written/modified
- Integration tests required
- Manual testing scenarios
- Acceptance criteria validation

## Risks and Mitigations
- Technical risks identified
- Potential breaking changes
- Rollback strategy
- Performance considerations

## Dependencies
- External libraries or services
- Team coordination required
- Infrastructure changes needed

## Acceptance Criteria
- Specific, testable requirements
- Definition of done
- Success metrics

RULES:
- Only use Read/Grep/Glob/LS/Edit/Write/TodoWrite. Never call Bash.
- Always reference the research document for context and findings.
- Be specific about file paths and implementation details.
- End by ensuring the file at ${output_path} exists and is non-empty.