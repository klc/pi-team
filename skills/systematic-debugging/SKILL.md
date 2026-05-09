---
name: systematic-debugging
description: 4-phase debugging protocol. Root cause investigation before any fix attempt.
---

# Systematic Debugging

> Load when investigating any bug, test failure, unexpected behavior, or production incident. Mandates root cause investigation before any fix attempt.

---

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

Random fixes waste time and create new bugs. Quick patches mask underlying issues.

**Violating the letter of this process is violating the spirit of debugging.**

If you haven't completed Phase 1, you cannot propose fixes. Not even "just one quick thing."

---

## When to Use This

- Any test failure
- Any bug or unexpected behavior
- Any production incident
- Any "it was working before" situation
- **Especially when under time pressure** — emergencies make guessing tempting, but systematic is faster

---

## The Four Phases

You MUST complete each phase before proceeding to the next.

### Phase 1 — Root Cause Investigation

**BEFORE attempting ANY fix:**

**1. Read the error message completely**
- Don't skip past errors or warnings
- Read the full stack trace — every line
- Note file names, line numbers, error codes
- The error often contains the exact solution

**2. Reproduce consistently**
- Can you trigger it reliably?
- What are the exact steps?
- Does it happen every time or intermittently?
- If not reliably reproducible → gather more data, do NOT guess

**3. Check recent changes**
- What changed that could cause this?
- `git diff`, `git log --oneline -10`
- New dependencies, config changes, env differences

**4. Gather evidence in multi-component systems**

When the system has multiple layers (controller → service → DB, API → queue → worker):

```
For EACH component boundary:
  - Log what data enters the component
  - Log what data exits the component
  - Verify environment/config propagation
  - Check state at each layer

Run once to gather evidence showing WHERE it breaks.
THEN analyze to identify the failing component.
THEN investigate that specific component.
```

**5. Trace data flow**

When the error is deep in the call stack:
- Where does the bad value originate?
- What called this with the bad value?
- Keep tracing up until you find the source
- Fix at the source, not at the symptom

### Phase 2 — Pattern Analysis

**Find the pattern before proposing a fix:**

1. Find working examples of similar code in the same codebase
2. Read reference implementations COMPLETELY — don't skim
3. List every difference between working and broken, however small
4. Understand all dependencies and assumptions

### Phase 3 — Hypothesis and Testing

**Scientific method:**

1. Form ONE specific hypothesis: "I think X is the root cause because Y"
2. Make the SMALLEST possible change to test the hypothesis
3. One variable at a time — never multiple changes at once
4. If it works → Phase 4. If not → form a NEW hypothesis. Do NOT stack more fixes.

### Phase 4 — Implementation

**Fix the root cause, not the symptom:**

1. **Create a failing test case first**
2. Implement ONE fix addressing the confirmed root cause
3. Verify the test now passes
4. Run the full test suite — no regressions
5. **If the fix doesn't work:** STOP. Return to Phase 1 with new information.

**If 3+ fixes have failed → STOP and question the architecture:**
- Each fix reveals new shared state or coupling in different places
- Fixes require "massive refactoring" to implement
- Each fix creates new symptoms elsewhere

This is NOT a failed hypothesis — this is a wrong architecture. Discuss with the lead before attempting more fixes.

---

## Red Flags — STOP and Return to Phase 1

If you find yourself thinking any of these:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "One more fix attempt" (when you've already tried 2+)

**ALL of these mean: STOP. Return to Phase 1.**

---

## Quick Reference

| Phase | Key Action | Gate |
|---|---|---|
| **1. Root Cause** | Read errors, reproduce, trace data flow | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare | Identify differences |
| **3. Hypothesis** | Form ONE theory, test minimally | Confirmed or new hypothesis |
| **4. Fix** | Create failing test, fix, verify | Tests pass, no regressions |

---

## Report Format

When reporting findings:

```
ROOT CAUSE: [Confirmed cause with evidence]
EVIDENCE: [What proved it]
FIX: [Specific change at the specific location]
TEST: [How to verify it's fixed]
```
