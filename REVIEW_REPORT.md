# Pi-Team Project Review Report

> **Date:** 2026-05-10  
> **Scope:** Full project review — code, prompts, agent definitions, skills, documentation  
> **Files reviewed:** 16 agents, 5 prompts, 7 skills, 8 TS modules, README, AGENTS.md, package.json

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical (code bug) | 2 |
| 🟠 High (incorrect behavior or documentation) | 7 |
| 🟡 Medium (residual/leftover, DRY violation) | 8 |
| 🟢 Low (minor, cosmetic) | 6 |
| **Total** | **23** |

---

## 🔴 Critical — Code Bugs

### C1. `registry.ts` ignores frontmatter `description:` field

**Location:** [registry.ts:52-96](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/registry.ts#L52-L96)

The `parseAgentFile()` method extracts the description from the **first H1 heading** after frontmatter (e.g. `# Software Architect`), but **every agent file** has a rich `description:` field in frontmatter that gets silently ignored.

```diff
 // Current behavior: "Software Architect" 
 // Expected behavior: "Designs software architecture, data models, APIs..."
```

**Impact:** `/agent:list`, `list_agents` tool, and `delegate_task` error messages all show generic heading text instead of the detailed descriptions that explain when to use each agent. This reduces the LLM's ability to choose the correct agent.

**Fix:** Parse `description:` from frontmatter like `allowed-tools:` and `model:` are parsed:

```typescript
const descMatch = content.match(/^description:\s*(.+)$/m);
// Use frontmatter description if available, fall back to heading
```

---

### C2. `agent-model-picker.ts` inserts `model:` OUTSIDE frontmatter

**Location:** [agent-model-picker.ts:72-79](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/agent-model-picker.ts#L72-L79)

When adding a model to an agent that doesn't already have one, `updateAgentModel()` does:

```typescript
const frontmatterEnd = content.indexOf("\n---\n");
const insertPos = frontmatterEnd + "\n---\n".length;
// Inserts AFTER the closing ---, i.e. OUTSIDE frontmatter
```

The model line ends up between the closing `---` and the body content — **outside** the YAML frontmatter block. This works only because `registry.ts` uses a regex that searches the entire file, not just frontmatter. But it's semantically wrong and will break if any tool parses frontmatter properly.

**Fix:** Insert before the closing `---`:

```typescript
const insertPos = frontmatterEnd + 1; // After \n, before ---
content = content.slice(0, insertPos) + `model: ${newModel}\n` + content.slice(insertPos);
```

---

## 🟠 High — Incorrect Behavior / Documentation

### H1. Agent count inconsistency across documentation

| Location | Says | Actual |
|----------|------|--------|
| [README.md:3](file:///Users/mkilic/www/klc/pit2/README.md#L3) | "16 specialized AI agents" | ✅ |
| [README.md:25](file:///Users/mkilic/www/klc/pit2/README.md#L25) | "17 built-in agents" | ❌ |
| [README.md:171](file:///Users/mkilic/www/klc/pit2/README.md#L171) | "17 agents" | ❌ |
| [package.json:4](file:///Users/mkilic/www/klc/pit2/package.json#L4) | "17 specialized agents" | ❌ |

**Actual count:** 16 agent files in `agents/` directory. The README agent table also lists exactly 15 rows (missing `designer` from the table at lines 96-113).

**Fix:** Correct all references to **16** and add `designer` to the README agent table.

---

### H2. `types.ts` defines `thinkingLevel` — never parsed or used

**Location:** [types.ts:12](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/types.ts#L12)

`AgentDefinition` has `thinkingLevel?: string` but:
- `registry.ts` never parses it from frontmatter
- `agent-runner.ts` never passes it to the child process
- No agent file defines it

**Impact:** Dead interface field. If a user adds `thinkingLevel:` to an agent file, nothing happens.

**Fix:** Either implement parsing + passing to `pi --thinking-level`, or remove the field from the interface.

---

### H3. `.memory/` references — leftover from a previous system

**Locations:**
- [bugfix.md:21-23](file:///Users/mkilic/www/klc/pit2/prompts/bugfix.md#L21-L23) — `Search .memory/ for similar bugs`
- [project-manager.md:116-118](file:///Users/mkilic/www/klc/pit2/agents/project-manager.md#L116-L118) — `Search .memory/ for related context`

There is **no `.memory/` infrastructure** anywhere in this project. No code creates, reads, or manages a `.memory/` directory. These references are residual from a previous system design.

**Impact:** Agents will run `grep -r ... .memory/` and get no results or errors. Wasted tool calls.

**Fix:** Remove `.memory/` references or implement the memory system.

---

### H4. Variable shadowing in `graphify.ts` — `path` shadows module import

**Location:** [graphify.ts:282](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/graphify.ts#L282)

```typescript
import * as path from "node:path";  // Line 10
// ...
const path: { node: GraphNode; ... }[] = [];  // Line 282 — SHADOWS the import
```

Inside `findPath()`, the local variable `path` shadows the `node:path` module import. Works at runtime because the module isn't used after this point, but it's a maintenance hazard.

**Fix:** Rename to `tracePath`, `resultPath`, or `pathSteps`.

---

### H5. README agent table is missing `designer` agent

**Location:** [README.md:96-113](file:///Users/mkilic/www/klc/pit2/README.md#L96-L113)

The "Available Agents" table in README lists 15 agents but the `designer` agent is missing. The `agents/` directory has 16 agents including `designer.md`.

**Fix:** Add a row for `designer`:
```markdown
| `designer` | Visual design system & component patterns |
```

---

### H6. `openspec.ts` task counting ignores in-progress and uppercase states

**Location:** [openspec.ts:531-533](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L531-L533)

```typescript
const total = (tasks.match(/- \[ \]/g) || []).length + (tasks.match(/- \[x\]/g) || []).length;
const done = (tasks.match(/- \[x\]/g) || []).length;
```

This regex:
- ❌ Misses `- [/]` (in-progress) tasks — documented in AGENTS.md as valid notation
- ❌ Misses `- [X]` (uppercase)
- ❌ Won't match indented tasks like `  - [ ]`

**Fix:** Use case-insensitive regex and include `[/]`:

```typescript
const allTasks = tasks.match(/- \[[ x/]\]/gi) || [];
const done = tasks.match(/- \[x\]/gi) || [];
```

---

### H7. `.openspec.yaml` metadata file is written but never read

**Location:** [openspec.ts:268-272](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L268-L272)

`/opsx:propose` creates `.openspec.yaml` with version, name, created date, and status fields. But **no code ever reads this file**. The status field is never updated by any command (`/opsx:apply`, `/opsx:verify`, `/opsx:archive`).

**Impact:** Dead metadata file. Users might expect status tracking but it's not implemented.

**Fix:** Either read and update this file in other commands, or remove it.

---

## 🟡 Medium — Residual Code / DRY Violations

### M1. Duplicate `collectSpecs` function (DRY violation)

**Locations:**
- [openspec.ts:330-344](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L330-L344) — in `/opsx:apply`
- [openspec.ts:389-403](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L389-L403) — in `/opsx:verify`

Identical `collectSpecs` inner function defined twice.

**Fix:** Extract to a shared helper function.

---

### M2. Duplicate `mergeRecursive` function (DRY violation)

**Locations:**
- [openspec.ts:441-454](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L441-L454) — in `/opsx:archive`
- [openspec.ts:487-500](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L487-L500) — in `/opsx:sync`

Identical merge logic defined twice.

**Fix:** Extract to a shared helper.

---

### M3. `agent-model-picker.ts` uses `as any` hack to access internal state

**Location:** [agent-model-picker.ts:219](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/agent-model-picker.ts#L219)

```typescript
const agentSelectItems = this.agentList as any;
if (agentSelectItems.items) { ... }
```

Accesses `SelectList` internal `items` property via `any` cast. Will break silently if the TUI library changes internals.

**Fix:** Track items separately or use a public API if available.

---

### M4. Compiled `.js` files alongside `.ts` sources (no `outDir`)

**Location:** [tsconfig.json](file:///Users/mkilic/www/klc/pit2/tsconfig.json)

No `outDir` is configured, so `tsc` outputs `.js` files into the same directory as `.ts` files. This means:
- 18 files in `extensions/multi-agent/` (9 `.ts` + 9 `.js`)
- Both are committed to git
- Risk of stale `.js` if someone edits `.ts` but forgets to rebuild

**Fix:** Either add `"outDir": "dist"` and update package.json `files`, or add a pre-commit hook to rebuild.

---

### M5. No test suite

**Location:** [package.json:20](file:///Users/mkilic/www/klc/pit2/package.json#L20)

```json
"test": "echo 'Error: no test specified' && exit 1"
```

No tests exist for any extension module. The `orchestrator.parsePlan()` regex, `graphify.ts` graph traversal, and `registry.ts` parsing logic are all untested.

---

### M6. `.gitignore` is too minimal

**Location:** [.gitignore](file:///Users/mkilic/www/klc/pit2/.gitignore)

Only excludes `.idea`, `.pi`, `node_modules`. Missing:
- `openspec/` (runtime-generated per-project)
- `graphify-out/` (runtime-generated per-project)
- `*.map` (if source maps are generated)
- `.DS_Store` (macOS)

---

### M7. `bugfix.md` — `grep` without `-F` flag on user input

**Location:** [bugfix.md:23](file:///Users/mkilic/www/klc/pit2/prompts/bugfix.md#L23)

```bash
grep -r "$ARGUMENTS" .memory/ --include="*.md" 2>/dev/null | head -5
```

`$ARGUMENTS` is user input passed directly to `grep` as a regex pattern. Special characters like `(`, `*`, `+` will cause errors.

**Fix:** Use `grep -rF` (fixed-string) instead of `grep -r`.

---

### M8. Hardcoded model assignments may fail on different Pi installations

All 16 agent files have hardcoded `model:` assignments:

| Model | Agents |
|-------|--------|
| `opencode-go/kimi-k2.6` | architect, backend-lead, debugger, frontend-lead, performance-analyst, security-auditor, senior-backend |
| `opencode-go/deepseek-v4-flash` | junior-backend, junior-frontend, tester |
| `opencode-go/mimo-v2.5-pro` | designer, project-manager, researcher, senior-frontend |
| `opencode-go/minimax-m2.7` | reviewer, seo-auditor |

These are all `opencode-go/` provider models. If a user's Pi installation doesn't have the `opencode-go` provider, **all agent spawns will fail**. There's no fallback mechanism.

**Consideration:** Document this dependency in README, or remove hardcoded models so they use Pi's default.

---

## 🟢 Low — Minor Issues

### L1. AGENTS.md has Turkish text in the Reference Skills section

**Location:** [AGENTS.md:59](file:///Users/mkilic/www/klc/pit2/AGENTS.md#L59)

```markdown
Agent'lar `read` tool'uyla bu referans dosyalarını okuyabilir:
```

The rest of the document is in English. This is a language consistency issue.

---

### L2. `openspec.ts` skill path reference — `.pi/skills/openspec/SKILL.md`

**Location:** [openspec.ts:57](file:///Users/mkilic/www/klc/pit2/extensions/multi-agent/openspec.ts#L57)

`readOpenSpecSkill` checks `.pi/skills/openspec/SKILL.md` first. This assumes Pi maps installed package skills to `.pi/skills/` — verify this is correct for the pi runtime.

---

### L3. `project-stack-template/SKILL.md` has Turkish text

**Location:** [project-stack-template/SKILL.md:9](file:///Users/mkilic/www/klc/pit2/skills/project-stack-template/SKILL.md#L9)

```markdown
> Agent'lar projenin stack bilgisine buradan erişir.
```

Language inconsistency in an otherwise English document.

---

### L4. `openspec/SKILL.md` missing frontmatter

**Location:** [openspec/SKILL.md](file:///Users/mkilic/www/klc/pit2/skills/openspec/SKILL.md)

Unlike other skill files, `openspec/SKILL.md` has **no frontmatter** (`---` block with name/description). Other skills like `coding-standards`, `graphify`, etc. all have frontmatter.

---

### L5. `peerDependencies` uses `"typebox": "*"` 

**Location:** [package.json:30](file:///Users/mkilic/www/klc/pit2/package.json#L30)

The standard npm package is `@sinclair/typebox`. If this is a Pi-specific alias, it should be documented. If not, this could cause installation issues.

---

### L6. Inconsistent agent `description` source in AGENTS.md vs code

**Location:** [AGENTS.md:7-24](file:///Users/mkilic/www/klc/pit2/AGENTS.md#L7-L24)

The AGENTS.md "Available Agents" table has manually-written Role descriptions that differ from both the frontmatter `description:` fields and the H1 headings in agent files. Three separate sources of truth for agent descriptions.
