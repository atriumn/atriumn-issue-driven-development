You are running in CI on branch "${feature_ref}", issue #${issue_number}, repository "${repository}".
Do not ask questions. Do not wait for input. Do not use Bash.

TASK:
1) Scan the repo to understand the high-level architecture (frontend in packages/frontend, lambdas in packages/functions, shared in packages/core).
2) Produce a single research document that answers: "${task_description}".
3) Write it to path EXACTLY: ${output_path}
4) The file MUST be created in this run (non-empty), with this minimal structure:

---
date: [ISO timestamp]
branch: "${feature_ref}"
repository: "${repository}"
issue: "${issue_number}"
task_pack_id: "research"
task_pack_version: 1
runner: "claude-code"
status: complete
---

# Research for issue #${issue_number}

## Summary
- What the codebase organization is
- Key risks, assumptions, and unknowns relevant to the task

## Detailed Findings
- Frontend (packages/frontend): noteworthy components/files
- Functions (packages/functions): noteworthy handlers/tests
- Core (packages/core): noteworthy utilities/types
- Any cross-cutting concerns (auth, types, build/test setup)

## Code References
- List 5–15 concrete file paths

## Next Steps
- 3–7 concrete follow-ups

RULES:
- Only use Read/Grep/Glob/LS/Edit/Write/TodoWrite. Never call Bash.
- If a directory is missing, do NOT create it; choose an existing one or use the specified path.
- End by ensuring the file at ${output_path} exists and is non-empty.