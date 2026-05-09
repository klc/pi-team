/**
 * Agent Runner
 * Spawns child pi processes to execute agent tasks
 */

import { spawn } from "node:child_process";
import * as fs from "node:fs";
import type { AgentDefinition, AgentRunResult } from "./types.js";

export async function runAgent(
  agent: AgentDefinition,
  task: string,
  signal?: AbortSignal,
  cwd?: string
): Promise<AgentRunResult> {
  const startTime = Date.now();

  const systemPrompt = fs.readFileSync(agent.systemPromptPath, "utf-8");

  const args: string[] = [
    "--print",
    "--no-session",
    "--system-prompt",
    systemPrompt,
  ];

  if (agent.model) {
    args.push("--model", agent.model);
  }

  if (agent.allowedTools) {
    args.push("--tools", agent.allowedTools.join(","));
  }

  // Append project context if AGENTS.md exists in cwd
  // (child pi will discover it automatically via parent dir walk)

  const child = spawn("pi", [...args, task], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
    cwd,
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (data: Buffer) => {
      stdout += data.toString("utf-8");
    });

    child.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString("utf-8");
    });

    const cleanup = () => {
      child.kill("SIGTERM");
    };

    signal?.addEventListener("abort", cleanup);

    child.on("close", (code) => {
      signal?.removeEventListener("abort", cleanup);
      const durationMs = Date.now() - startTime;

      resolve({
        agentName: agent.name,
        task,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? -1,
        durationMs,
        success: code === 0,
      });
    });

    child.on("error", (err) => {
      signal?.removeEventListener("abort", cleanup);
      reject(err);
    });
  });
}
