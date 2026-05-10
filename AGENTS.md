# Multi-Agent System

This project uses the **Pi Multi-Agent Orchestrator** extension.

## Available Agents

| Agent | Role | When to Use |
|-------|------|-------------|
| `architect` | System design, data models, API contracts | Before writing code; when planning new features |
| `backend-lead` | Backend task coordination & quality ownership | Coordinating backend implementation → review → testing |
| `debugger` | Root cause analysis & fix recommendations | When bugs are unclear or complex |
| `designer` | Visual design system & component patterns | Establishing UI/UX standards |
| `frontend-lead` | Frontend task coordination & quality ownership | Coordinating frontend implementation → review → SEO → testing |
| `junior-backend` | Straightforward backend tasks, CRUD, tests | Simple backend work under guidance |
| `junior-frontend` | Simple UI components, styling fixes | Simple frontend work under guidance |
| `performance-analyst` | Bottleneck identification & optimization | Performance issues, profiling |
| `project-manager` | Scope clarification, sprint planning, coordination | Feature scoping, task breakdown, risk management |
| `researcher` | Technology research & library comparison | Evaluating options, making informed decisions |
| `reviewer` | Code review, security, performance audit | After code is written, before merging |
| `security-auditor` | OWASP Top 10, vulnerability assessment | Security-sensitive code changes |
| `seo-auditor` | Technical SEO & GEO readiness audit | Pages/Layouts changes, SEO requirements |
| `senior-backend` | Complex backend features & integrations | Complex backend work, architecture changes |
| `senior-frontend` | Complex UI components & state management | Complex frontend work, SSR issues |
| `tester` | Unit/integration tests, coverage analysis | When adding or modifying features |

## Commands

### Prompt Templates
- `/brainstorm <idea>` — Collaborative ideation session
- `/bugfix <description>` — Bug investigation & fix pipeline
- `/init` — Scan project structure and stack, initialize OpenSpec
- `/new-feature <description>` — End-to-end feature delivery via OpenSpec
- `/review` — Full code review on current changes

### Interactive Commands
- `/agent:list` — Show all available agents
- `/agent:plan <task>` — Generate a multi-agent execution plan
- `/agent:run <agent> <task>` — Run a single agent manually
- `/agent:model` — Assign models to agents via TUI

### OpenSpec Commands (Spec-Driven Workflow)
- `/opsx:propose <name>` — Create a new change with planning artifacts
- `/opsx:apply [name]` — Implement tasks from a change
- `/opsx:verify [name]` — Validate implementation against specs
- `/opsx:archive [name]` — Archive a completed change and merge delta specs
- `/opsx:sync` — Merge all pending delta specs into main specs
- `/opsx:list` — List all active changes

### Tools
- `stack_detect({ verbose?: boolean })` — Auto-detect project tech stack
- `complexity_score({ path: string, threshold?: number, top?: number })` — Estimate cyclomatic complexity
- `graphify_check()` — Check if graphify knowledge graph is available
- `graphify_query({ question, mode?, budget? })` — Query the codebase knowledge graph (BFS/DFS)
- `graphify_path({ from, to })` — Find shortest path between two concepts
- `graphify_explain({ concept })` — Explain a node and its connections
- `graphify_report()` — Get architectural overview (God Nodes, Surprising Connections, Communities)

### Reference Skills
Agents can read these reference files using the `read` tool:

| Skill | File | Who Uses It |
|-------|------|-------------|
| Coding Standards | `.pi/skills/coding-standards/SKILL.md` | All developer & reviewer agents |
| Systematic Debugging | `.pi/skills/systematic-debugging/SKILL.md` | debugger agent |
| Verification Before Completion | `.pi/skills/verification-before-completion/SKILL.md` | All developer & tester agents |
| Receiving Code Review | `.pi/skills/receiving-code-review/SKILL.md` | All developer agents |
| Project Stack Template | `.pi/skills/project-stack-template/SKILL.md` | Template for project setup |
| Graphify | `.pi/skills/graphify/SKILL.md` | project-manager, architect, debugger, backend-lead, frontend-lead |
| OpenSpec | `.pi/skills/openspec/SKILL.md` | architect, project-manager, backend-lead, frontend-lead, reviewer, tester |

### LLM Tools
The supervisor (main pi LLM) can also delegate via tools:
- `list_agents` — Discover available agents
- `delegate_task` — Delegate a subtask to a specific agent
- `execute_plan` — Run a structured plan across multiple agents

## Graphify Integration

When `graphify` is installed and `graphify-out/graph.json` exists, the orchestrator automatically injects architectural context into `/agent:plan` operations. Agents with graphify tools in their `allowed-tools` can query the persistent knowledge graph for:

- **God Nodes** — Core abstractions with the highest connectivity
- **Surprising Connections** — Hidden cross-file dependencies
- **Communities** — Functional clusters in the codebase
- **Path Tracing** — Dependency chains between components

Agents that use graphify: `project-manager`, `architect`, `debugger`, `backend-lead`, `frontend-lead`

To enable graphify for a project:
```bash
pip install graphifyy
graphify .
```

## OpenSpec Workflow Example

```
User: "/opsx:propose add-dark-mode"

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this
     ✓ specs/ui/spec.md — delta spec with scenarios
     ✓ design.md — technical approach
     ✓ tasks.md — implementation checklist
     Ready for implementation!

User: "/opsx:apply"

AI:  Implementing tasks...
     ✓ 1.1 [Backend] Add theme context provider
     ✓ 1.2 [Frontend] Create toggle component
     ✓ 2.1 [Frontend] Add CSS variables
     ✓ 2.2 [Backend] Wire up localStorage
     All tasks complete!

User: "/opsx:verify"

AI:  Verifying add-dark-mode...
     COMPLETENESS: ✓ All tasks done, all requirements implemented
     CORRECTNESS:  ✓ Matches spec intent
     COHERENCE:    ✓ Naming consistent with design
     Ready to archive: Yes

User: "/opsx:archive"

AI:  ✓ Merged delta specs into openspec/specs/ui/spec.md
     ✓ Archived to openspec/changes/archive/2025-05-10-add-dark-mode/
```

## Legacy Workflow Example

```
User: "Implement user authentication with JWT"

1. Supervisor decides to plan first
2. /agent:plan → queries graphify for auth-related communities and dependencies → produces plan:
   1. architect → Design auth flow and token strategy
   2. senior-backend → Implement auth middleware and routes
   3. reviewer → Review for security issues
   4. security-auditor → Security audit
   5. tester → Write tests for auth flow

3. execute_plan → runs agents sequentially
   - Each agent may query graphify for architectural context
4. Supervisor synthesizes results and presents to user
```

## Adding New Agents

Create a new `.md` file in `agents/`:

```markdown
---
name: my-agent
description: What this agent does and when to use it.
allowed-tools: read write edit bash
---

# My Agent

System prompt content here...
```

Reload with `/reload` or restart pi to pick up new agents.
