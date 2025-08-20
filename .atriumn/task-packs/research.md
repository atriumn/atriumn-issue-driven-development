# Research Codebase (Single-Session, File-Backed)

You are the RESEARCH COORDINATOR for this run.

Allowed tools only: Read, Grep, Glob, LS, Write, Edit, MultiEdit, TodoWrite  
Disallowed: Bash/shell, MCP/CLI/web/Linear/external calls.  
Do everything **inside this one session**.

## Inputs (provided below the prompt)
- `feature_ref`
- `issue_number`
- `repository`
- `task_description`
- `output_path` → `thoughts/shared/research/issue-${issue_number}.md`
- `decision_record_path` → `thoughts/shared/decisions/issue-${issue_number}.md`

## Process (follow **in order**)

1) **Read any directly mentioned files first (if any)**
   - If `task_description` or linked issue text mentions specific files, Read them fully (no limit/offset).
   - Take scratch notes; do not write final documents yet.

2) **Analyze and decompose the research question**
   - Break the topic into research areas.
   - Use `TodoWrite` to record a short research plan (subtasks).

3) **Spawn conceptual sub-agents (sequential in this session) and write scratch files**
   - a) locator → WHERE relevant files/dirs live + 1-line purpose each  
     Write to: `thoughts/shared/research/tmp/${issue_number}_locator.md`
   - b) analyzer → HOW key flows work with **file:line** citations  
     Write to: `thoughts/shared/research/tmp/${issue_number}_analyzer.md`
   - c) patterns → similar implementations, tests, conventions  
     Write to: `thoughts/shared/research/tmp/${issue_number}_patterns.md`
   - d) thoughts-locator → relevant docs under `thoughts/` related to the topic  
     Write to: `thoughts/shared/research/tmp/${issue_number}_thoughts_locator.md`
   - e) thoughts-analyzer → extract key insights from the most relevant `thoughts/` docs (cite actual paths)  
     Write to: `thoughts/shared/research/tmp/${issue_number}_thoughts_analyzer.md`

   Rules:
   - Base every claim on files you actually read.
   - Use **concrete file:line** citations for code.
   - `thoughts/` content is historical context; code is primary truth.

4) **Synthesize**
   - After all five scratch files exist and are non-empty, synthesize into the final outputs.

5) **Write the Research Document** to `${output_path}` with this exact structure (fill only what you can derive—no placeholders):

---
date: [ISO 8601 you generate]
branch: "${feature_ref}"
repository: "${repository}"
issue: "${issue_number}"
topic: "${task_description}"
runner: "claude-code"
status: "complete"
---

# Research: ${task_description}

## Research Question
- Restate in 1–2 lines.

## Summary
- Concise, actionable summary answering the question.

## Detailed Findings
- Organize by areas discovered from the repo (do **not** assume a tech stack name).
- For each area:
  - Findings with precise **file:line** citations.
  - Connections to other components.
  - Notable implementation details.

## Code References
- Compact list of all concrete **file:line** citations used above.

## Architecture Insights
- Patterns, conventions, design decisions discovered.

## Historical Context (from `thoughts/`)
- Relevant insights with actual `thoughts/` paths.

## Related Research
- Paths to other relevant docs inside `thoughts/`, if applicable.

## Open Questions
- Gaps or items needing follow-up.

6) **Write the Decision Record** to `${decision_record_path}`:

---
date: [ISO 8601 you generate]
issue: "${issue_number}"
topic: "${task_description}"
status: "draft"
runner: "claude-code"
---

# Decision Record: Research for Issue #${issue_number}

## Context
- Brief context of the repo and research topic.

## Options Considered
- Option A: …
- Option B: …
- (List only options supported by code/docs you found.)

## Recommendation
- Evidence-backed recommendation.

## Risks & Unknowns
- Notable risks, edge cases, missing info.

## Next Actions
- Concrete next actions tied to findings (bullet list).

## Guardrails
- Read mentioned files first.
- Use `TodoWrite` for the plan.
- No external calls.
- Cite **file:line** for code; cite `thoughts/` by actual paths.
- Ensure all 5 scratch files + 2 final artifacts exist and are non-empty.