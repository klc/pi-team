---
name: verification-before-completion
description: Verification protocol. Run commands, read output, then report. No claims without evidence.
---

# Verification Before Completion

> Read before reporting any task, fix, or feature as complete. Requires running actual commands and reading actual output before claiming success. "I think it works" is not verification.

---

## The Iron Law

```
BEFORE claiming completion: RUN the verification command. READ the output. THEN report.
```

**Saying "it should work" or "I believe it's fixed" without running verification is lying.**

---

## The 5-Step Verification Protocol

Before claiming ANY status or expressing satisfaction:

1. **IDENTIFY** — What command proves this claim?
2. **RUN** — Execute the FULL command (fresh, not cached)
3. **READ** — Full output, check exit code, count failures explicitly
4. **VERIFY** — Does the output actually confirm the claim?
   - If NO → State the actual status with evidence
   - If YES → State the claim WITH the evidence
5. **ONLY THEN** — Make the claim

**Skip any step = not verified.**

---

## What Requires Verification

### After implementing a feature:
```bash
# Run the actual test command
php artisan test --filter=YourFeatureTest
npm run test
```
- Read the output line by line
- Count: X tests, Y passed, Z failed
- Check exit code (0 = all pass)

### After fixing a bug:
```bash
# 1. Write regression test (RED)
# 2. Confirm it fails
# 3. Apply fix
# 4. Confirm it now passes (GREEN)
# 5. Run full suite — no regressions
```
- ✅ Correct: Write → Run (FAIL) → Fix → Run (PASS) → Full suite (PASS)
- ❌ Wrong: "I've fixed the bug, tests should pass now"

### After a code review fix:
- Re-read the specific review finding
- Verify the fix actually addresses it (not just touches the same file)
- Run the test that would catch a regression

### After completing a task from a plan:
- Re-read the acceptance criteria one by one
- For each criterion: what command proves it? Run it.
- If a criterion has no automated test: note it explicitly as "manually verified: [what you did]"
- Report gaps: "Criteria 1-3 verified by tests. Criteria 4 manually verified. Criteria 5 requires a browser test which cannot be automated in this context."

---

## Verification Anti-Patterns

| What you might say | What you should do instead |
|---|---|
| "Tests pass" | Run tests, paste the count: "17 tests, 17 passed" |
| "I've fixed the issue" | Show before/after: test failed, fix applied, test passes |
| "It should work now" | Make it work, verify it works, THEN say it works |
| "I've implemented X" | Show the test that proves X works |
| "The build succeeds" | Run the build, show the output |
| "No errors" | Run linter/type-check, show "0 errors" output |

---

## Completion Report Format

Your completion report MUST include actual verification output:

```
✅ IMPLEMENTATION COMPLETE

Tests: 23 passing / 23 total (0 failures)
Build: exit code 0
Linter: 0 errors

[Paste key test output lines if relevant]
```

**Do not write "tests pass" without having actually run them and read the output.**

---

## For the Tester Agent

Your QA report MUST include:
- The exact test command run
- The exact output (at minimum: count of passed/failed)
- For each acceptance criterion: the specific evidence it was met

A tester report that says "all tests pass" without showing the test run output is incomplete.

---

## For the Reviewer Agent

When reviewing, verify:
- `git diff origin/main...HEAD` — actually read every changed line
- Do not approve based on the developer's description of what they changed
- Check that the stated acceptance criteria are actually met by the code, not just "addressed"
