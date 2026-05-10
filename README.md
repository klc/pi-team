# pi-team

**Multi-Agent Orchestrator** for [Pi](https://pi.dev) — a package that adds 16 specialized AI agents to your coding assistant, now with **OpenSpec** spec-driven workflow integration.

Each agent has a dedicated role (architect, reviewer, security-auditor, etc.) and can be invoked individually or orchestrated into multi-step execution plans. OpenSpec adds a lightweight spec layer so you agree on what to build before any code is written.

## Quick Start

Install the package:

```bash
pi install git:github.com/klc/pi-team
```

After installation, Pi will auto-load the extension and agents on the next start.

> **Note on versioning:** The command above always tracks the latest commit on the default branch and will be updated automatically when you run `pi update`. If you want to pin a specific version, append a tag or branch ref (e.g. `@v0.1.0`). Pinned refs are skipped by `pi update`.

## Available Commands

### Agent Commands

| Command | Description |
|---------|-------------|
| `/agent:list` | Show all 16 built-in agents |
| `/agent:run <agent> <task>` | Run a single agent with a task |
| `/agent:plan <description>` | Generate a structured multi-agent execution plan |

### OpenSpec Commands (Spec-Driven Workflow)

| Command | Description |
|---------|-------------|
| `/opsx:propose <name>` | Create a new change with planning artifacts (proposal, specs, design, tasks) |
| `/opsx:apply [name]` | Implement tasks from a change using the right agents |
| `/opsx:verify [name]` | Validate implementation against specs |
| `/opsx:archive [name]` | Archive a completed change and merge delta specs |
| `/opsx:sync` | Merge all pending delta specs into main specs |
| `/opsx:list` | List all active changes |

## OpenSpec Workflow Example

```
You: /opsx:propose add-dark-mode

AI:  Created openspec/changes/add-dark-mode/
     ✓ proposal.md — why we're doing this, what's changing
     ✓ specs/ui/spec.md — requirements and scenarios
     ✓ design.md — technical approach
     ✓ tasks.md — implementation checklist
     Ready for implementation!

You: /opsx:apply

AI:  Implementing tasks...
     ✓ 1.1 [Backend] Add theme context provider
     ✓ 1.2 [Frontend] Create toggle component
     ✓ 2.1 [Frontend] Add CSS variables
     ✓ 2.2 [Backend] Wire up localStorage
     All tasks complete!

You: /opsx:archive

AI:  ✓ Merged delta specs into openspec/specs/ui/spec.md
     ✓ Archived to openspec/changes/archive/2025-05-10-add-dark-mode/
```

## Legacy Agent Workflow

### Run a single agent

```
/agent:run reviewer "Review the auth middleware for security issues"
```

### Create an execution plan

```
/agent:plan "Build a REST API with JWT authentication"
```

Pi will analyze the task and suggest which agents to run in which order.

### Execute a plan automatically

The LLM can call the `execute_plan` tool with a numbered plan:

```
1. architect → Design the API contract and data models
2. senior-backend → Implement the auth middleware and routes
3. tester → Write integration tests for the auth flow
4. reviewer → Code review for security and performance
```

## Available Agents

| Agent | Role |
|-------|------|
| `architect` | System design, data models, API contracts, OpenSpec design artifacts |
| `backend-lead` | Backend coordination & quality ownership |
| `debugger` | Root cause analysis & fix recommendations |
| `designer` | Visual design system & component patterns |
| `frontend-lead` | Frontend coordination & quality ownership |
| `junior-backend` | Straightforward backend tasks, CRUD, tests |
| `junior-frontend` | Simple UI components, styling fixes |
| `performance-analyst` | Bottleneck identification & optimization |
| `project-manager` | Scope clarification, sprint planning, OpenSpec specs & tasks |
| `researcher` | Technology research & library comparison |
| `reviewer` | Code review, security, performance audit |
| `security-auditor` | OWASP Top 10, vulnerability assessment |
| `seo-auditor` | Technical SEO & GEO readiness audit |
| `senior-backend` | Complex backend features & integrations |
| `senior-frontend` | Complex UI components & state management |
| `tester` | Unit/integration tests, coverage analysis |

## Custom Agents

You can add your own agents by creating `.md` files in an `agents/` directory inside your project. They will be discovered alongside the built-in agents.

Agent file format:

```markdown
---
name: my-agent
allowed-tools: read write edit bash
---

# My Agent Description

System prompt content here...
```

## LLM Tools

The extension also registers callable tools that the LLM can use during conversation:

- **`list_agents`** — List available agents
- **`delegate_task`** — Delegate a subtask to a specific agent
- **`execute_plan`** — Run a full multi-agent plan sequentially

## Project Tools

Additional tools available to all agents:

- **`stack_detect`** — Auto-detect project tech stack
- **`complexity_score`** — Estimate cyclomatic complexity of files

## Graphify Integration

When [graphify](https://github.com/safishamsi/graphify) is installed, agents gain persistent knowledge graph access:

- **`graphify_check`** — Verify graphify is available
- **`graphify_query`** — BFS/DFS traversal for architectural context
- **`graphify_path`** — Shortest path between two concepts
- **`graphify_explain`** — Deep dive into a node and its connections
- **`graphify_report`** — High-level overview (God Nodes, Surprising Connections, Communities)

Agents with graphify support: `project-manager`, `architect`, `debugger`, `backend-lead`, `frontend-lead`

To set up graphify for a project:
```bash
pip install graphifyy
graphify .
```

The `/agent:plan` command automatically includes graphify context when a graph is present.

## Package Structure

```
extensions/    # Extension source code
agents/        # Built-in agent definitions (16 agents)
skills/        # Reusable skill templates
               ├── openspec/SKILL.md   # OpenSpec artifact formats & workflow
prompts/       # Prompt templates (brainstorm, bugfix, new-feature, init, etc.)
```

## Requirements

- Pi `^0.74.0`
- Node.js 20+

## License

MIT
