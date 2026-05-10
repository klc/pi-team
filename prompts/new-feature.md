---
description: Start a new feature end-to-end using the OpenSpec workflow. Propose, plan, apply, verify, archive.
argument-hint: "<feature description>"
---

A new feature has been requested:

"$ARGUMENTS"

## Step 1 — Scope Clarification

If the request is ambiguous, ask the user clarifying questions (max 2–3). Use the Critical Decision Protocol:
- Keep questions to the smallest set needed
- Present options: "X or Y?"
- Never ask a bare question without context

## Step 2 — Propose the Change

Run the OpenSpec propose command:

```
/opsx:propose $ARGUMENTS
```

This will:
1. Create `openspec/changes/<name>/`
2. Scaffold the change metadata

Then produce the planning artifacts using the OpenSpec skill:

- **proposal.md** — Why, What, Scope, Non-Goals, Success Criteria
- **specs/<domain>/spec.md** — Delta specs with RFC 2119 keywords and Given/When/Then scenarios
- **design.md** — Components, data model, API changes, implementation plan
- **tasks.md** — Numbered checklist tagged [Backend] / [Frontend] / [Test]

**Agent routing:**
- `architect` → produces `design.md` (and ADRs if needed)
- `project-manager` → produces `specs/` and `tasks.md`

You may delegate to these agents using `delegate_task` or let the LLM generate artifacts directly.

## Step 3 — Verify Planning Artifacts

Before implementation, confirm:
- [ ] `proposal.md` has clear scope and non-goals
- [ ] `design.md` has components and implementation plan
- [ ] `specs/` has at least one delta spec with scenarios
- [ ] `tasks.md` has concrete, assignable tasks

## Step 4 — Apply the Change

Run the implementation command:

```
/opsx:apply
```

This reads `tasks.md` and orchestrates implementation across agents.

**Task routing rules:**
- [Backend] tasks → `backend-lead` or `senior-backend`
- [Frontend] tasks → `frontend-lead` or `senior-frontend`
- [Test] tasks → `tester`
- General / ambiguous → `backend-lead` or `frontend-lead` depending on scope

Use `delegate_task` for each task, passing full context (design + relevant specs).

## Step 5 — Verify

After implementation, run:

```
/opsx:verify
```

This validates:
- **Completeness** — all tasks done, all requirements implemented
- **Correctness** — implementation matches spec intent
- **Coherence** — design decisions reflected in code

## Step 6 — Archive

When verified, run:

```
/opsx:archive
```

This merges delta specs into `openspec/specs/` and moves the change to `openspec/changes/archive/`.

## Communication Rules

- Always respond in the same language the user writes to you
- Report progress after each step
- Surface blockers immediately — never silently stall
