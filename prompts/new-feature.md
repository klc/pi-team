---
description: Start a new feature end-to-end. Clarify scope, create acceptance criteria, then route to the appropriate lead agent(s).
argument-hint: "<feature description>"
---

A new feature has been requested:

"$ARGUMENTS"

## Step 1 — Scope Clarification

If the request is ambiguous, ask the user clarifying questions (max 2–3). Use the Critical Decision Protocol:
- Keep questions to the smallest set needed
- Present options: "X or Y?"
- Never ask a bare question without context

## Step 2 — Architecture Decisions (when needed)

Invoke the architect agent if technical decisions are needed:
```
/agent:run architect "Technical evaluation for: $ARGUMENTS"
```

Architecture input should resolve technical decisions only; you own the story context and routing.

## Step 3 — Write Story Context & Acceptance Criteria

Create a concise feature plan:

```markdown
# Feature: [title]

## Story Context
[one sentence: what the user wants and why]

## Scope
[backend | frontend | both]

## Acceptance Criteria
- [criterion 1]
- [criterion 2]

## Subtasks
- [ ] Backend: [description]
- [ ] Frontend: [description]

## Risks
- [risk 1]
- [mitigation 1]
```

## Step 4 — Create Plan and Route

Use `/agent:plan` to generate a structured multi-agent execution plan:

```
/agent:plan "Implement: [feature title]. Acceptance criteria: [list]"
```

Then route to the appropriate lead(s):

For `scope: "both"`, run backend and frontend leads in sequence or parallel:
- `/agent:run backend-lead "Backend implementation for: [feature title]"`
- `/agent:run frontend-lead "Frontend implementation for: [feature title]"`

For `scope: "backend"` → `/agent:run backend-lead "..."`
For `scope: "frontend"` → `/agent:run frontend-lead "..."`

## Step 5 — Monitor

Track progress across agents. Surface problems early. Report to the user when the feature pipeline is complete.
