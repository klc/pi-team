/**
 * OpenSpec Integration Module
 *
 * Adds OpenSpec workflow commands to the multi-agent orchestrator:
 *   /opsx:propose  → Create planning artifacts (proposal, specs, design, tasks)
 *   /opsx:apply    → Implement tasks from a change
 *   /opsx:archive  → Merge delta specs and archive the change
 *   /opsx:sync     → Merge all pending delta specs into main specs
 *
 * Works alongside existing /agent:* commands and tools.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const OPEN_SPEC_DIR = "openspec";
const CHANGES_DIR = "openspec/changes";
const SPECS_DIR = "openspec/specs";
const ARCHIVE_DIR = "openspec/changes/archive";

// ── Helpers ─────────────────────────────────────────────────────────

function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[\s_]+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function listChanges(cwd: string): { name: string; path: string; date: Date }[] {
  const changesPath = path.join(cwd, CHANGES_DIR);
  if (!fs.existsSync(changesPath)) return [];

  return fs
    .readdirSync(changesPath)
    .filter((name) => name !== "archive")
    .map((name) => {
      const p = path.join(changesPath, name);
      const stat = fs.statSync(p);
      return { name, path: p, date: stat.mtime };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

function readOpenSpecSkill(cwd: string): string {
  const skillPath = path.join(cwd, ".pi", "skills", "openspec", "SKILL.md");
  if (fs.existsSync(skillPath)) {
    return fs.readFileSync(skillPath, "utf-8");
  }
  // Fallback: read from package files
  const pkgPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "skills",
    "openspec",
    "SKILL.md"
  );
  if (fs.existsSync(pkgPath)) {
    return fs.readFileSync(pkgPath, "utf-8");
  }
  return "";
}

function collectSpecs(dir: string, prefix: string): string {
  let out = "";
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      out += collectSpecs(p, path.join(prefix, entry));
    } else if (entry.endsWith(".md")) {
      out += `\n\n# ${path.join(prefix, entry)}\n\n`;
      out += fs.readFileSync(p, "utf-8");
    }
  }
  return out;
}

function mergeRecursive(dir: string, relPath: string, specsTargetDir: string): void {
  for (const entry of fs.readdirSync(dir)) {
    const p = path.join(dir, entry);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      mergeRecursive(p, path.join(relPath, entry), specsTargetDir);
    } else if (entry.endsWith(".md")) {
      const deltaPath = p;
      const mainPath = path.join(specsTargetDir, relPath, entry);
      mergeDeltaSpec(deltaPath, mainPath);
    }
  }
}

function mergeDeltaSpec(deltaPath: string, mainPath: string): void {
  // Simple merge: append delta spec content to main spec
  if (!fs.existsSync(deltaPath)) return;
  const delta = fs.readFileSync(deltaPath, "utf-8");

  ensureDir(path.dirname(mainPath));
  if (fs.existsSync(mainPath)) {
    const main = fs.readFileSync(mainPath, "utf-8");
    // Add a merge delimiter
    fs.writeFileSync(
      mainPath,
      `${main}\n\n<!-- Merged from delta spec -->\n\n${delta}`,
      "utf-8"
    );
  } else {
    fs.writeFileSync(mainPath, delta, "utf-8");
  }
}

function buildProposePrompt(
  changeName: string,
  description: string,
  skillContent: string,
  availableAgents: string
): string {
  return `
You are the **OpenSpec Supervisor**. Create a complete change proposal following the OpenSpec framework.

## OpenSpec Skill Reference
${skillContent.slice(0, 4000)}

## Available Agents
${availableAgents}

## Task
Create a new change named **"${changeName}"** for: ${description}

## Instructions

1. Create the directory: \`openspec/changes/${changeName}/\`
2. Write these artifacts using the \`write\` tool:
   - \`openspec/changes/${changeName}/proposal.md\` — Why, What, Scope, Non-Goals, Success Criteria
   - \`openspec/changes/${changeName}/specs/<domain>/spec.md\` — Delta specs (only what changes). Use RFC 2119 keywords (SHALL, MUST, SHOULD). Include Given/When/Then scenarios.
   - \`openspec/changes/${changeName}/design.md\` — Components, data model, API changes, implementation plan
   - \`openspec/changes/${changeName}/tasks.md\` — Numbered checklist of concrete implementation tasks. Mark backend tasks with [Backend] and frontend tasks with [Frontend].

3. After creating artifacts, report:
   - What files were created
   - Key decisions made
   - Next step: run \`/opsx:apply ${changeName}\` to begin implementation

Rules:
- Write specs as delta specs (only describe what changes, not existing behavior).
- Use concrete, verifiable scenarios.
- Tasks must be granular enough for a single agent to handle.
- If the change touches both backend and frontend, create specs in the appropriate domains.
`;
}

function buildApplyPrompt(
  changeName: string,
  tasksContent: string,
  designContent: string,
  specContent: string,
  availableAgents: string
): string {
  return `
You are the **OpenSpec Implementation Supervisor**. Implement the change "${changeName}".

## Available Agents
${availableAgents}

## Change Design
${designContent.slice(0, 3000)}

## Specifications
${specContent.slice(0, 3000)}

## Tasks
${tasksContent}

## Instructions

1. Read each unchecked task from tasks.md.
2. For each task, determine the right agent:
   - Backend/API/Database tasks → delegate to \`backend-lead\` or \`senior-backend\`
   - Frontend/UI/Component tasks → delegate to \`frontend-lead\` or \`senior-frontend\`
   - Tests → delegate to \`tester\`
   - Use \`delegate_task\` tool to spawn agents.
3. After each task is complete, update \`openspec/changes/${changeName}/tasks.md\` to mark it done (\`- [x]\`).
4. When all tasks are done, report completion and suggest running \`/opsx:verify ${changeName}\`.

Rules:
- Pass full context (design + relevant specs) to each agent in the task description.
- If a task fails, surface the error and ask the user whether to retry or adjust.
- Update task checkboxes as you go.
`;
}

function buildVerifyPrompt(
  changeName: string,
  specContent: string,
  tasksContent: string,
  designContent: string
): string {
  return `
You are the **OpenSpec Verifier**. Validate the implementation of "${changeName}" against its artifacts.

## Specifications
${specContent.slice(0, 4000)}

## Design
${designContent.slice(0, 2000)}

## Tasks
${tasksContent}

## Verification Dimensions

Run these checks and report results:

### Completeness
- Are all tasks in tasks.md checked off?
- Are all requirements in specs implemented?
- Are all scenarios covered by code or tests?

### Correctness
- Does the implementation match spec intent?
- Are edge cases from scenarios handled?
- Do error states match spec definitions?

### Coherence
- Are design decisions reflected in code structure?
- Is naming consistent with design.md?

Report:
- Critical issues (must fix before archive)
- Warnings (should fix)
- Ready to archive: Yes / No (with conditions)
`;
}

// ── Command Registration ────────────────────────────────────────────

export function registerOpenSpecCommands(
  pi: ExtensionAPI,
  formatAgentList: () => string,
  cwd: string
): void {
  // Helper to init OpenSpec dirs
  function initOpenSpec(): void {
    ensureDir(path.join(cwd, SPECS_DIR));
    ensureDir(path.join(cwd, CHANGES_DIR));
    ensureDir(path.join(cwd, ARCHIVE_DIR));
  }

  /**
   * /opsx:propose <change-name-or-description>
   */
  pi.registerCommand("opsx:propose", {
    description:
      "Create a new OpenSpec change with planning artifacts: /opsx:propose add-dark-mode",
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      if (!trimmed) {
        ctx.ui.notify("Usage: /opsx:propose <change-name-or-description>", "error");
        return;
      }

      initOpenSpec();

      // Determine change name
      let changeName = toKebabCase(trimmed);
      // If it's just a long description, take first 3-4 words
      if (changeName.length > 50) {
        const words = trimmed.split(/\s+/).slice(0, 4);
        changeName = toKebabCase(words.join(" "));
      }

      const changePath = path.join(cwd, CHANGES_DIR, changeName);
      if (fs.existsSync(changePath)) {
        ctx.ui.notify(
          `Change "${changeName}" already exists. Use a different name or /opsx:apply ${changeName}`,
          "error"
        );
        return;
      }

      ensureDir(changePath);
      ensureDir(path.join(changePath, "specs"));

      // Create metadata file
      fs.writeFileSync(
        path.join(changePath, ".openspec.yaml"),
        `version: 1\nname: ${changeName}\ncreated: ${new Date().toISOString()}\nstatus: proposed\n`,
        "utf-8"
      );

      ctx.ui.notify(`Creating change "${changeName}"...`, "info");

      const skillContent = readOpenSpecSkill(cwd);
      const availableAgents = formatAgentList();
      const prompt = buildProposePrompt(changeName, trimmed, skillContent, availableAgents);

      await pi.sendUserMessage(prompt);
    },
  });

  /**
   * /opsx:apply [change-name]
   */
  pi.registerCommand("opsx:apply", {
    description: "Implement tasks from an OpenSpec change: /opsx:apply add-dark-mode",
    handler: async (args, ctx) => {
      initOpenSpec();

      let changeName = args.trim();
      if (!changeName) {
        const changes = listChanges(cwd);
        if (changes.length === 0) {
          ctx.ui.notify("No active changes found. Run /opsx:propose first.", "error");
          return;
        }
        changeName = changes[0].name;
        ctx.ui.notify(`No change specified. Using most recent: ${changeName}`, "info");
      }

      const changePath = path.join(cwd, CHANGES_DIR, changeName);
      if (!fs.existsSync(changePath)) {
        ctx.ui.notify(`Change "${changeName}" not found in openspec/changes/`, "error");
        return;
      }

      const tasksPath = path.join(changePath, "tasks.md");
      const designPath = path.join(changePath, "design.md");
      const specsDir = path.join(changePath, "specs");

      let tasksContent = "";
      let designContent = "";
      let specContent = "";

      if (fs.existsSync(tasksPath)) {
        tasksContent = fs.readFileSync(tasksPath, "utf-8");
      } else {
        ctx.ui.notify(`No tasks.md found for change "${changeName}". Run /opsx:propose first.`, "error");
        return;
      }

      if (fs.existsSync(designPath)) {
        designContent = fs.readFileSync(designPath, "utf-8");
      }

      // Read all delta specs
      if (fs.existsSync(specsDir)) {
        specContent = collectSpecs(specsDir, "");
      }

      ctx.ui.notify(`Applying change "${changeName}"...`, "info");

      const availableAgents = formatAgentList();
      const prompt = buildApplyPrompt(changeName, tasksContent, designContent, specContent, availableAgents);

      await pi.sendUserMessage(prompt);
    },
  });

  /**
   * /opsx:verify [change-name]
   */
  pi.registerCommand("opsx:verify", {
    description: "Verify implementation against OpenSpec artifacts: /opsx:verify add-dark-mode",
    handler: async (args, ctx) => {
      initOpenSpec();

      let changeName = args.trim();
      if (!changeName) {
        const changes = listChanges(cwd);
        if (changes.length === 0) {
          ctx.ui.notify("No active changes found.", "error");
          return;
        }
        changeName = changes[0].name;
      }

      const changePath = path.join(cwd, CHANGES_DIR, changeName);
      if (!fs.existsSync(changePath)) {
        ctx.ui.notify(`Change "${changeName}" not found.`, "error");
        return;
      }

      const tasksPath = path.join(changePath, "tasks.md");
      const designPath = path.join(changePath, "design.md");
      const specsDir = path.join(changePath, "specs");

      let tasksContent = fs.existsSync(tasksPath) ? fs.readFileSync(tasksPath, "utf-8") : "(no tasks.md)";
      let designContent = fs.existsSync(designPath) ? fs.readFileSync(designPath, "utf-8") : "(no design.md)";

      let specContent = "";
      if (fs.existsSync(specsDir)) {
        specContent = collectSpecs(specsDir, "");
      }

      ctx.ui.notify(`Verifying change "${changeName}"...`, "info");

      const prompt = buildVerifyPrompt(changeName, specContent, tasksContent, designContent);
      await pi.sendUserMessage(prompt);
    },
  });

  /**
   * /opsx:archive [change-name]
   */
  pi.registerCommand("opsx:archive", {
    description: "Archive an OpenSpec change and merge delta specs: /opsx:archive add-dark-mode",
    handler: async (args, ctx) => {
      initOpenSpec();

      let changeName = args.trim();
      if (!changeName) {
        const changes = listChanges(cwd);
        if (changes.length === 0) {
          ctx.ui.notify("No active changes found.", "error");
          return;
        }
        changeName = changes[0].name;
        ctx.ui.notify(`No change specified. Using most recent: ${changeName}`, "info");
      }

      const changePath = path.join(cwd, CHANGES_DIR, changeName);
      if (!fs.existsSync(changePath)) {
        ctx.ui.notify(`Change "${changeName}" not found.`, "error");
        return;
      }

      // Merge delta specs into main specs
      const changeSpecsDir = path.join(changePath, "specs");
      if (fs.existsSync(changeSpecsDir)) {
        mergeRecursive(changeSpecsDir, "", path.join(cwd, SPECS_DIR));
      }

      // Move to archive
      const dateStr = new Date().toISOString().split("T")[0];
      const archiveName = `${dateStr}-${changeName}`;
      const archivePath = path.join(cwd, ARCHIVE_DIR, archiveName);
      ensureDir(path.join(cwd, ARCHIVE_DIR));
      fs.renameSync(changePath, archivePath);

      ctx.ui.notify(
        `✓ Archived "${changeName}" to openspec/changes/archive/${archiveName}/\n` +
          `✓ Delta specs merged into openspec/specs/`,
        "info"
      );
    },
  });

  /**
   * /opsx:sync
   */
  pi.registerCommand("opsx:sync", {
    description: "Merge all pending delta specs into main specs without archiving",
    handler: async (_args, ctx) => {
      initOpenSpec();

      const changes = listChanges(cwd);
      let mergedCount = 0;

      for (const change of changes) {
        const specsDir = path.join(change.path, "specs");
        if (!fs.existsSync(specsDir)) continue;

        mergeRecursive(specsDir, "", path.join(cwd, SPECS_DIR));
        mergedCount++;
      }

      ctx.ui.notify(
        `✓ Synced delta specs from ${mergedCount} active change(s) into openspec/specs/`,
        "info"
      );
    },
  });

  /**
   * /opsx:list
   */
  pi.registerCommand("opsx:list", {
    description: "List all active OpenSpec changes",
    handler: async (_args, ctx) => {
      initOpenSpec();
      const changes = listChanges(cwd);

      if (changes.length === 0) {
        ctx.ui.notify("No active changes. Run /opsx:propose to create one.", "info");
        return;
      }

      const lines = ["## Active OpenSpec Changes"];
      for (const change of changes) {
        const tasksPath = path.join(change.path, "tasks.md");
        let progress = "";
        if (fs.existsSync(tasksPath)) {
          const tasks = fs.readFileSync(tasksPath, "utf-8");
          const allTasks = tasks.match(/^\s*- \[[ x/]\]/gim) || [];
          const done = tasks.match(/^\s*- \[x\]/gim) || [];
          const total = allTasks.length;
          const doneCount = done.length;
          progress = total > 0 ? ` (${doneCount}/${total} tasks)` : "";
        }
        lines.push(`- **${change.name}**${progress} — ${change.date.toLocaleDateString()}`);
      }

      ctx.ui.notify(lines.join("\n"), "info");
    },
  });
}
