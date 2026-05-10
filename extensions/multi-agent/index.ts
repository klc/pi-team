/**
 * Multi-Agent Orchestrator Extension for Pi
 *
 * Spawns child pi processes as specialized agents.
 * Commands:
 *   /agent:plan   → Analyze task and produce an execution plan
 *   /agent:run    → Run a single agent with a task
 *   /agent:list   → List available agents
 *
 * Tools (callable by LLM):
 *   delegate_task → Delegate a task to a named agent
 *   list_agents   → List all registered agents
 */

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { AgentRegistry } from "./registry.js";
import { Orchestrator } from "./orchestrator.js";
import type { AgentRunResult } from "./types.js";

import agentModelPicker from "./agent-model-picker.js";
import {
  registerStackDetectTool,
  registerComplexityScoreTool,
  registerGraphifyTools,
} from "./project-tools.js";
import { checkGraphify, getGraphSummary } from "./graphify.js";

const BUILTIN_AGENTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "agents"
);

export default function (pi: ExtensionAPI) {
  agentModelPicker(pi);
  registerStackDetectTool(pi);
  registerComplexityScoreTool(pi);
  registerGraphifyTools(pi);
  // ── State ──────────────────────────────────────────────────────────

  let registry: AgentRegistry;
  let orchestrator: Orchestrator;

  // ── Helpers ────────────────────────────────────────────────────────
  function init(cwd: string) {
    registry = new AgentRegistry(cwd, BUILTIN_AGENTS_DIR);
    orchestrator = new Orchestrator(registry);
  }

  function formatAgentList(): string {
    const agents = registry.list();
    if (agents.length === 0) {
      return "No agents found. Create .md files in `agents/` directory.";
    }
    return agents
      .map((a) => `- **${a.name}**: ${a.description}`)
      .join("\n");
  }

  function formatResult(result: AgentRunResult): string {
    const lines: string[] = [];
    lines.push(`## ${result.agentName} result`);
    lines.push(`- Exit code: ${result.exitCode}`);
    lines.push(`- Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    lines.push("");
    if (result.stdout) {
      lines.push("**Output:**");
      lines.push("```");
      lines.push(result.stdout.slice(0, 8000)); // Protect context window
      lines.push("```");
    }
    if (result.stderr) {
      lines.push("**Errors:**");
      lines.push("```");
      lines.push(result.stderr.slice(0, 2000));
      lines.push("```");
    }
    return lines.join("\n");
  }

  // ── Session lifecycle ──────────────────────────────────────────────
  pi.on("session_start", async (event, ctx) => {
    init(ctx.cwd);
    const count = registry.list().length;
    if (count > 0) {
      ctx.ui.notify(`Multi-agent system loaded (${count} agents)`, "info");
    }
  });

  pi.on("resources_discover", async (event, _ctx) => {
    if (event.reason === "reload") {
      registry?.reload();
    }
  });

  // ── Commands ───────────────────────────────────────────────────────

  /**
   * /agent:list
   * List all registered agents
   */
  pi.registerCommand("agent:list", {
    description: "List available multi-agents",
    handler: async (_args, ctx) => {
      ctx.ui.notify(formatAgentList(), "info");
    },
  });

  /**
   * /agent:run <agent> <task...>
   * Run a single agent with a task
   */
  pi.registerCommand("agent:run", {
    description: "Run an agent with a task: /agent:run senior-backend 'Implement auth'",
    handler: async (args, ctx) => {
      const trimmed = args.trim();
      if (!trimmed) {
        ctx.ui.notify("Usage: /agent:run <agent> <task>", "error");
        return;
      }

      const spaceIdx = trimmed.indexOf(" ");
      const agentName = spaceIdx > 0 ? trimmed.slice(0, spaceIdx) : trimmed;
      const task = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1).trim() : "";

      if (!task) {
        ctx.ui.notify(`Usage: /agent:run ${agentName} <task>`, "error");
        return;
      }

      const agent = registry.get(agentName);
      if (!agent) {
        ctx.ui.notify(`Agent "${agentName}" not found.`, "error");
        return;
      }

      ctx.ui.notify(`Running ${agentName}...`, "info");
      ctx.ui.setStatus("multi-agent", `Running: ${agentName}`);

      try {
        const { runAgent } = await import("./agent-runner.js");
        const result = await runAgent(agent, task, ctx.signal, ctx.cwd);

        ctx.ui.setStatus("multi-agent", "");

        // Persist result to session
        pi.appendEntry("agent-run", {
          agent: agentName,
          task,
          result: {
            success: result.success,
            exitCode: result.exitCode,
            durationMs: result.durationMs,
          },
        });

        // Show result in TUI
        const formatted = formatResult(result);
        ctx.ui.notify(
          result.success ? "Agent completed successfully" : "Agent failed",
          result.success ? "info" : "error"
        );

        // Inject result as a system message so LLM can see it
        pi.sendMessage(
          {
            customType: "agent-result",
            content: formatted,
            display: true,
          },
          { triggerTurn: false }
        );
      } catch (err) {
        ctx.ui.setStatus("multi-agent", "");
        ctx.ui.notify(
          `Agent error: ${err instanceof Error ? err.message : String(err)}`,
          "error"
        );
      }
    },
  });

  /**
   * /agent:plan <description>
   * Analyze a task and produce a structured execution plan
   */
  pi.registerCommand("agent:plan", {
    description:
      "Create a multi-agent execution plan: /agent:plan 'Build a REST API'",
    handler: async (args, ctx) => {
      if (!args.trim()) {
        ctx.ui.notify("Usage: /agent:plan <task description>", "error");
        return;
      }

      const availableAgents = formatAgentList();

      ctx.ui.notify("Generating plan...", "info");

      // Inject a structured planning prompt as a user message
      // This triggers the LLM to produce a numbered plan
      let graphifyContext = "";
      const graphifyStatus = checkGraphify(ctx.cwd);
      if (graphifyStatus.available) {
        const summary = getGraphSummary(ctx.cwd);
        if (summary) {
          graphifyContext = `
## Project Knowledge Graph (graphify)
The project has a persistent knowledge graph with ${graphifyStatus.nodeCount} nodes, ${graphifyStatus.edgeCount} edges, and ${graphifyStatus.communityCount} communities.

Key insights from the graph:
${summary.slice(0, 3000)}

When creating the plan, consider the architectural communities and cross-component connections described above.
`;
        }
      }

      const planPrompt = `
You are the **Supervisor** agent. Create a structured multi-agent execution plan for the following task.

## Available Agents
${availableAgents}
${graphifyContext}

## Task
${args.trim()}

## Instructions
Analyze the task and produce a numbered plan. Each step must follow this exact format:

1. agentName → Brief task description for that agent
2. agentName → Brief task description for that agent
...

Rules:
- Use ONLY the agent names listed above.
- Each step should be a concrete, delegable subtask.
- Include a brief summary line at the top describing the overall approach.
- If a knowledge graph is provided above, use it to understand cross-component dependencies and assign agents accordingly.
- The output will be parsed automatically; stick to the format strictly.
`;

      // Send it as a user message to trigger LLM response
      await pi.sendUserMessage(planPrompt);
    },
  });

  // ── Tools ──────────────────────────────────────────────────────────

  /**
   * list_agents tool
   * LLM callable: returns list of available agents
   */
  pi.registerTool({
    name: "list_agents",
    label: "List Agents",
    description:
      "List all available specialized agents in the multi-agent system. Use before delegating tasks.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      return {
        content: [
          {
            type: "text",
            text: `Available agents:\n${formatAgentList()}`,
          },
        ],
        details: { agents: registry.list().map((a) => a.name) },
      };
    },
  });

  /**
   * delegate_task tool
   * LLM callable: spawns a child pi process for the named agent
   */
  pi.registerTool({
    name: "delegate_task",
    label: "Delegate Task",
    description:
      "Delegate a subtask to a specialized agent. The agent runs in an isolated child pi process and returns its output. Use list_agents first to see available agents.",
    promptSnippet:
      "Delegate a subtask to a named specialist agent running in a child process",
    promptGuidelines: [
      "Use delegate_task when a task requires a different expertise than the current context.",
      "Always call list_agents first if you are unsure which agents are available.",
      "Provide a clear, self-contained task description so the agent can work independently.",
    ],
    parameters: Type.Object({
      agent: Type.String({
        description: "Name of the agent to delegate to (e.g., 'senior-backend', 'reviewer')",
      }),
      task: Type.String({
        description:
          "Clear, self-contained task description for the agent. Include relevant context from previous steps if needed.",
      }),
    }),
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      const agent = registry.get(params.agent);
      if (!agent) {
        return {
          content: [
            {
              type: "text",
              text: `Agent "${params.agent}" not found. Available: ${registry
                .list()
                .map((a) => a.name)
                .join(", ")}`,
            },
          ],
          isError: true,
          details: {},
        };
      }

      onUpdate?.({
        content: [
          { type: "text", text: `Spawning ${agent.name} process...` },
        ],
        details: {},
      });

      const { runAgent } = await import("./agent-runner.js");
      const result = await runAgent(agent, params.task, signal, ctx.cwd);

      // Persist to session
      pi.appendEntry("agent-run", {
        agent: params.agent,
        task: params.task,
        result: {
          success: result.success,
          exitCode: result.exitCode,
          durationMs: result.durationMs,
        },
      });

      return {
        content: [
          {
            type: "text",
            text: formatResult(result),
          },
        ],
        details: {
          exitCode: result.exitCode,
          durationMs: result.durationMs,
          success: result.success,
        },
      };
    },
  });

  /**
   * execute_plan tool
   * LLM callable: executes a full multi-agent plan
   */
  pi.registerTool({
    name: "execute_plan",
    label: "Execute Plan",
    description:
      "Execute a structured multi-agent plan. Provide the plan as a numbered list in the 'plan' field. Each line: '1. agentName → task description'. The tasks run sequentially with accumulated context.",
    parameters: Type.Object({
      plan: Type.String({
        description:
          "Numbered plan. Each line: 'N. agentName → task description'",
      }),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const parsed = orchestrator.parsePlan(params.plan);

      if (parsed.tasks.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "Could not parse plan. Use format: '1. agentName → task description'",
            },
          ],
          isError: true,
          details: {},
        };
      }

      const results: string[] = [];

      const execResult = await orchestrator.executePlan(
        parsed,
        signal,
        (agentName, task) => {
          onUpdate?.({
            content: [
              {
                type: "text",
                text: `▶ Running ${agentName}: ${task.slice(0, 80)}...`,
              },
            ],
            details: {},
          });
        },
        (result) => {
          results.push(formatResult(result));
        },
        ctx.cwd
      );

      return {
        content: [
          {
            type: "text",
            text: execResult.summary + "\n\n" + results.join("\n\n"),
          },
        ],
        details: {
          tasks: parsed.tasks,
          results: execResult.results.map((r) => ({
            agent: r.agentName,
            success: r.success,
            durationMs: r.durationMs,
          })),
        },
      };
    },
  });
}
