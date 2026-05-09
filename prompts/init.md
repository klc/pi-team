---
description: Scan the current project, detect stack and structure, verify AGENTS.md, and report what was found.
argument-hint: "[optional project name]"
---

Scan the current project and report its structure, stack, and conventions.

## Phase 1 — Folder Check

First, check whether the current folder contains an existing project:

```bash
find . -mindepth 1 -maxdepth 2 \
  -not -path './.git/*' \
  -not -name '.git' \
  -not -path './.pi/*' \
  -not -name '.pi' \
  -not -name '.DS_Store' \
  | head -5
```

**If the folder is empty**, tell the user and stop:

```
This folder appears to be empty. /init is for scanning an existing project.
```

## Phase 2 — Automated Discovery

First, run the `stack_detect` tool for structured stack detection:

```
stack_detect({ verbose: true })
```

Then run these bash commands for additional context:

```bash
# Folder structure — 3 levels deep
find . -type d \
  -not -path '*/node_modules/*' \
  -not -path '*/.git/*' \
  -not -path '*/vendor/*' \
  -not -path '*/__pycache__/*' \
  -not -path '*/dist/*' \
  -not -path '*/build/*' \
  | sort | head -80

# Existing tests
find . -type f \( -name '*.test.*' -o -name '*.spec.*' -o -name '*Test.php' -o -name 'test_*.py' \) \
  | grep -v node_modules | grep -v vendor | head -20

# Environment variables — names only
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null || true

# CI/CD workflows
ls .github/workflows/ 2>/dev/null || true

# Git history
git log --oneline -10 2>/dev/null || true

# Detect language/framework from key files
test -f package.json && echo "Node.js project" || true
test -f composer.json && echo "PHP project" || true
test -f Cargo.toml && echo "Rust project" || true
test -f pyproject.toml && echo "Python project" || true
test -f go.mod && echo "Go project" || true
```

## Phase 3 — Report

Produce a structured report:

```markdown
# Project Scan: [name]

## Stack Overview
- Language & framework: [detected]
- Test framework & commands: [detected]
- Build commands: [detected]

## Project Structure
[annotated tree]

## Key Files
- Entry points
- Config files
- Test directories

## Observations
- [notable patterns]
- [missing conventions]
- [potential issues]
```

## Phase 4 — AGENTS.md Check

Check if `AGENTS.md` exists and has the multi-agent setup:

```bash
test -f AGENTS.md && echo "exists" || echo "missing"
```

If missing, create a minimal `AGENTS.md`:

```markdown
# Multi-Agent System

This project uses the **Pi Multi-Agent Orchestrator** extension.

## Available Agents

| Agent | Role | When to Use |
|-------|------|-------------|
| architect | System design | Before writing code |
| coder | Implementation | Writing/refactoring code |
| reviewer | Code review | After code is written |
| tester | QA testing | Verifying implementation |
| debugger | Root cause analysis | When bugs are unclear |
| ... | ... | ... |

## Commands
- `/agent:list` — Show all available agents
- `/agent:plan <task>` — Generate a multi-agent execution plan
- `/agent:run <agent> <task>` — Run a single agent manually
```

## Phase 5 — Confirm

```
✅ Scan complete

Stack:     [summary]
Tests:     [command]
Build:     [command]
AGENTS.md: [status]

Next steps:
1. Run /new-feature to start building
2. Run /agent:list to see available agents
3. Edit AGENTS.md to add project-specific rules
```
