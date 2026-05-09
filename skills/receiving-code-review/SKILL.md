---
name: receiving-code-review
description: Protocol for receiving code review feedback. Verify before implementing, ask before assuming, technical pushback is allowed.
---

# Receiving Code Review

> Read when you receive code review feedback that requires fixes. Enforces: verify before implementing, ask before assuming, one item at a time, technical pushback is allowed.

---

## Core Principle

```
Verify before implementing. Ask before assuming. Technical correctness over social comfort.
```

---

## The Protocol

When you receive code review feedback:

### 1. READ — Complete feedback without reacting

Read all items before implementing any of them. Do not start fixing item 1 while reading item 3.

### 2. UNDERSTAND — Restate each requirement

For each item, restate it in your own words to confirm you understand what's being asked. If you can't restate it clearly, you don't understand it.

### 3. VERIFY — Check against codebase reality

Before implementing each suggestion:
- Does the suggested change actually exist in the codebase as described?
- Would this break existing functionality?
- Is there a reason the current code is written this way?

### 4. EVALUATE — Is it technically sound for THIS codebase?

You are allowed to push back. If a suggestion seems wrong:
- Check if the reviewer understood the full context
- If you believe the suggestion would break something, say so with evidence
- If it conflicts with a prior architectural decision, raise it with the lead

### 5. RESPOND — Technical acknowledgment or reasoned pushback

- If you agree and understand: "Understood. Fixing [X] because [Y]."
- If unclear: "Need clarification on item 4 before I can implement it."
- If you disagree: "Item 3 suggests X, but the current code does Y because of Z constraint. Should I change this anyway?"

### 6. IMPLEMENT — One item at a time, test each

Do not batch all fixes into one commit. Fix one item, run tests, confirm it passes, then move to the next.

---

## If ANY Item Is Unclear

**STOP. Do not implement anything yet.**

Ask for clarification on the unclear items BEFORE starting.

Why: Items may be related. Partial understanding = wrong implementation.

Example:
```
❌ WRONG: Implement items 1,2,3 now, ask about 4,5 later
✅ RIGHT: "I understand items 1,2,3. Need clarification on 4 and 5 before proceeding."
```

---

## You Are Allowed to Push Back

The reviewer is providing feedback, not issuing commands.

If a suggestion is technically incorrect for this codebase:
- Grep for actual usage: does this pattern exist elsewhere?
- Check the coding-standards for constraints that might affect the suggestion
- State your concern: "This change would break X because Y. Is the intention to also change X?"

If the suggestion conflicts with the lead's prior decisions: escalate to the lead, don't implement.

---

## After Implementing All Fixes

1. Run the full test suite — all tests must pass
2. Verify each fix actually addresses the review item
3. Report back to the lead with evidence:

```
✅ CODE REVIEW FIXES COMPLETE

Items addressed:
- [Item 1]: [what was changed and why]
- [Item 2]: [what was changed and why]

Tests: [X passing / X total]

Items I pushed back on:
- [Item N]: [technical reason, awaiting lead decision]
```

---

## Common Traps

| Trap | What to do instead |
|---|---|
| Fixing all items at once in one commit | Fix one at a time, test each |
| Implementing without understanding | Restate first, ask if unclear |
| "Social" acceptance (reviewer must be right) | Verify technically, push back if wrong |
| Fixing symptoms of the review, not the issue | Re-read the exact finding, verify the fix addresses it |
| Not running tests after each fix | Tests after every single item |
