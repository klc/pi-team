---
name: coding-standards
description: Universal code quality rules, Definition of Done, review severity levels, and documentation standards.
---

# Coding Standards

> Universal code quality rules, Definition of Done, review severity levels, and documentation standards.
> Read this file before reviewing or writing any code.

---

## The Foundation

Three processes govern all code work in this team:

1. **Test-Driven Development** — No code before tests. Iron law.
2. **Verification Before Completion** — No "it should work." Run it, read the output, then report.
3. **Systematic Debugging** — No random fixes. Root cause first, always.

Violating these is not a style preference — it is a process failure.

---

## Universal Code Quality Rules

### Every function / method must

- Do one thing and name itself after that thing
- Have a cyclomatic complexity below 10
- Handle its errors explicitly — no silent failures
- Never log sensitive data (passwords, tokens, PII)

### Every pull request must

- [ ] Tests written BEFORE implementation (TDD — verified by developer)
- [ ] All existing tests passing (run and verified, not assumed)
- [ ] No hardcoded secrets or environment-specific values
- [ ] Input validation on all external data (HTTP requests, file uploads, queue messages)
- [ ] Structured logging for key operations
- [ ] All external calls wrapped with timeout and error handling

---

## Security Baseline

Apply these regardless of stack:

- Validate and sanitize all user input before use
- Use parameterized queries — never string-concatenate SQL
- Never expose internal error details to API consumers
- Apply rate limiting to all public-facing endpoints
- Enforce authentication before authorization checks
- Never store plaintext secrets — use environment variables or a secrets manager
- Apply principle of least privilege to all roles and service accounts

---

## Definition of Done

A task is **Done** when ALL of the following are true:

- [ ] Tests written BEFORE code (TDD — developer confirms RED→GREEN→REFACTOR)
- [ ] All tests passing — run and verified, output read, count confirmed
- [ ] No regressions — full suite passes
- [ ] No linting errors
- [ ] All project runtime constraints respected
- [ ] Code committed with correct conventional commit format
- [ ] Completion report sent to lead WITH test output evidence

A task is NOT done when:
- Developer says "tests should pass" without running them
- Tests pass but were written after the code
- Only the new tests pass but the full suite wasn't run
- Acceptance criteria were not checked one by one

---

## Code Review Standards

Reviewers classify findings into three levels:

| Level | Meaning | Blocks merge? |
|---|---|---|
| 🔴 Blocker | Security issue, data loss risk, broken core logic, missing auth, runtime constraint violated | Yes |
| 🟡 Required | Standards violation, missing test, performance issue with easy fix | Yes |
| 🟢 Suggestion | Style preference, optional improvement, future consideration | No |

A PR is approved only when there are zero 🔴 Blockers and zero 🟡 Required items.

**Reviewers must read every changed line.** "Looks reasonable" is not a review.

---

## Documentation Rules

- Write inline comments for **why**, not **what** — the code already says what
- Document non-obvious decisions at the function or module level
- Keep API documentation (OpenAPI / README / type definitions) in sync with implementation
- Record significant architecture decisions as ADRs (work with architect agent)
