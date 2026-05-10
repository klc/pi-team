/**
 * Orchestrator
 * Plans and coordinates multi-agent task execution
 */
import { runAgent } from "./agent-runner.js";
export class Orchestrator {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    /**
     * Parse a plan string into structured tasks.
     * Expected format (from LLM):
     *   1. agentName → task description
     *   2. agentName → task description
     */
    parsePlan(planText) {
        const lines = planText.split("\n");
        const tasks = [];
        let summary = "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            // Skip markdown headers used for summary
            if (trimmed.startsWith("#") || trimmed.startsWith("**")) {
                if (!summary)
                    summary = trimmed.replace(/[#*]/g, "").trim();
                continue;
            }
            // Match numbered task lines like:
            // 1. architect → Design login flow with JWT
            // 2. senior-backend: Implement auth controller
            const match = trimmed.match(/^\d+\.\s*([\w-]+)\s*(?:→|:|-)\s*(.+)$/i);
            if (match) {
                const [, agentName, task] = match;
                tasks.push({ agentName: agentName.toLowerCase(), task: task.trim() });
            }
        }
        return { tasks, summary: summary || "Multi-agent execution plan" };
    }
    /**
     * Execute a parsed plan sequentially.
     * Each task result is injected into the next task's context.
     */
    async executePlan(plan, signal, onTaskStart, onTaskComplete, cwd) {
        const results = [];
        let accumulatedContext = "";
        for (const task of plan.tasks) {
            const agent = this.registry.get(task.agentName);
            if (!agent) {
                const errorResult = {
                    agentName: task.agentName,
                    task: task.task,
                    stdout: "",
                    stderr: `Agent "${task.agentName}" not found in registry.`,
                    exitCode: -1,
                    durationMs: 0,
                    success: false,
                };
                results.push(errorResult);
                onTaskComplete?.(errorResult);
                continue;
            }
            // Build task with previous context
            const contextualTask = accumulatedContext
                ? `Previous work:\n${accumulatedContext}\n\nYour task:\n${task.task}`
                : task.task;
            onTaskStart?.(agent.name, task.task);
            const result = await runAgent(agent, contextualTask, signal, cwd);
            results.push(result);
            onTaskComplete?.(result);
            if (result.success) {
                accumulatedContext += `\n--- ${agent.name} output ---\n${result.stdout}`;
            }
            else {
                accumulatedContext += `\n--- ${agent.name} ERROR ---\n${result.stderr || result.stdout}`;
            }
        }
        const summary = this.summarizeResults(results);
        return { results, summary };
    }
    summarizeResults(results) {
        const total = results.length;
        const succeeded = results.filter((r) => r.success).length;
        const failed = total - succeeded;
        const totalTime = results.reduce((sum, r) => sum + r.durationMs, 0);
        let text = `Plan executed: ${succeeded}/${total} tasks succeeded`;
        if (failed > 0)
            text += `, ${failed} failed`;
        text += ` (total time: ${(totalTime / 1000).toFixed(1)}s)\n\n`;
        for (const r of results) {
            const icon = r.success ? "✓" : "✗";
            text += `${icon} **${r.agentName}**: ${r.task}\n`;
            if (!r.success) {
                text += `  Error: ${(r.stderr || r.stdout).slice(0, 200)}\n`;
            }
        }
        return text;
    }
}
