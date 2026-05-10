---
description: Investigate and fix a bug. Supervisor creates a bug task context and routes it through debugger → developer → reviewer → tester.
argument-hint: "<bug description>"
---

A bug has been reported:

"$ARGUMENTS"

## Investigation Protocol

### Step 1 — Scope Detection

Determine whether the bug belongs to backend, frontend, or both:
- Check the error message, stack trace, or symptoms
- Look at recently changed files
- Identify the component or area affected

### Step 2 — Root Cause Analysis

If the root cause is unclear, invoke the debugger agent:
```
/agent:run debugger "$ARGUMENTS"
```

### Step 3 — Fix Delegation

Once the root cause is identified, delegate the fix:

- If scope is `backend` → `/agent:run senior-backend "Fix: $ARGUMENTS"` (or `/agent:run junior-backend` for simple fixes)
- If scope is `frontend` → `/agent:run senior-frontend "Fix: $ARGUMENTS"` (or `/agent:run junior-frontend` for simple fixes)
- If scope is `both` → plan and run backend and frontend fixes in sequence

### Step 4 — Verification

After the fix is implemented:
- `/agent:run reviewer "Review the fix for: $ARGUMENTS"`
- `/agent:run tester "Test the fix for: $ARGUMENTS"`

### Step 5 — Close

When all verifications pass, report completion to the user with:
- Root cause summary
- Fix description
- Test results
