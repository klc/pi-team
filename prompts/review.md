---
description: Full code review — quality, security, runtime constraints, and test coverage. Runs the reviewer agent on current changes.
---

Review the current changes in this repository.

## Setup

1. Read the `AGENTS.md` for project conventions
2. Check the project stack documentation if available

## Scope

Run `git diff origin/main...HEAD` (or `origin/master...HEAD`) to see all changes.
If no upstream branch exists, use `git diff HEAD~1` or review staged changes with `git diff --cached`.

## Review Checklist

- [ ] Naming and structure conventions followed
- [ ] No business logic in controllers or route handlers
- [ ] All errors handled explicitly — no silent failures
- [ ] Input validation on all external data
- [ ] No debug artifacts (console.log, var_dump, dd, print_r)
- [ ] Tests written for new code (≥ 80% coverage on new logic)
- [ ] All runtime constraints respected
- [ ] No secrets or hardcoded credentials in code
- [ ] Commit messages follow conventional format

## Execution

Run the reviewer agent on the changes:

```
/agent:run reviewer "Review the current changes. Focus on: quality, security, runtime constraints, and test coverage."
```

## Report Format

Produce a structured review report with:

- 🔴 Blockers (must fix before merge)
- 🟡 Required changes (must fix)
- 🟢 Suggestions (optional)

**Verdict:** ✅ Approved | 🔄 Changes Required | 🔴 Blocked

If security-sensitive code changed, also run:
```
/agent:run security-auditor "Security audit of the current changes"
```
