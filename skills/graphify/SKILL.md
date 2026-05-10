---
name: graphify
description: Knowledge graph integration for agents. Use graphify tools to query persistent codebase memory before planning, designing, debugging, or reviewing.
---

# Graphify Skill

Graphify turns the codebase into a persistent knowledge graph with community detection, god nodes, and cross-file relationship tracking. Agents should use it as **architectural memory** before making decisions.

## When to Use

| Situation | Tool | Purpose |
|-----------|------|---------|
| Before any plan/design/debug | `graphify_check` | Verify graph exists |
| Need broad context | `graphify_query --mode bfs` | "What is X connected to?" |
| Need to trace a chain | `graphify_query --mode dfs` | "How does X reach Y?" |
| Find dependency path | `graphify_path` | Shortest path between two concepts |
| Understand a core abstraction | `graphify_explain` | Deep dive into a God Node |
| Get architectural overview | `graphify_report` | God Nodes, Surprising Connections, Communities |

## Workflow

### 1. Check Availability

Always start with:
```bash
graphify_check
```

If unavailable, proceed normally. If available, the response includes node/edge/community counts.

### 2. Gather Context

For **planning** (Project Manager, Leads):
```bash
graphify_report
graphify_query "authentication flow"
```

For **architecture** (Architect):
```bash
graphify_report
graphify_explain "AgentRegistry"
graphify_path "Orchestrator" "AgentRegistry"
```

For **debugging** (Debugger):
```bash
graphify_query "error component name" --mode dfs
graphify_path "user input" "failure point"
```

For **review** (Reviewer):
```bash
graphify_explain "component being reviewed"
graphify_query "related security concepts"
```

### 3. Interpret Results

- **God Nodes**: High-degree nodes are core abstractions. Changes here have wide impact.
- **Surprising Connections**: Cross-community INFERRED edges reveal hidden dependencies.
- **Communities**: Each community is a functional cluster. Changes should respect community boundaries.
- **Bridge Nodes**: Nodes connecting multiple communities are high-risk change points.
- **Isolated Nodes**: May indicate missing documentation or dead code.

### 4. Include in Output

When graphify provides relevant context, include a section:

```markdown
## Graph Context
- **God Nodes involved:** AgentRegistry, Orchestrator
- **Communities affected:** Extension Core & Types, Agent Registry
- **Surprising connection:** Orchestrator → Custom Agent Markdown Format (unexpected)
- **Path traced:** User Request → Orchestrator → AgentRegistry → AgentRunner
```

## Rules

- Never skip `graphify_check`. Don't assume the graph exists.
- If graphify is unavailable, proceed without it — do not fail the task.
- Always cite source_file and source_location from graph nodes when making claims.
- Prefer BFS for exploration, DFS for root cause tracing.
- Use `graphify_path` to prove dependency chains, not just assume them.
