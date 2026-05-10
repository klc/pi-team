/**
 * Agent Model Picker
 * TUI-based per-agent model assignment with persistent agent list
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
  Container,
  type SelectItem,
  SelectList,
  Text,
  type Component,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";

const BUILTIN_AGENTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "agents"
);

interface AgentInfo {
  name: string;
  filePath: string;
  currentModel?: string;
}

function getAgentsDir(cwd: string): string {
  return path.join(cwd, "agents");
}

function listAgentsFromDir(dir: string): AgentInfo[] {
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const filePath = path.join(dir, f);
      const content = fs.readFileSync(filePath, "utf-8");
      const modelMatch = content.match(/^model:\s*(.+)$/m);
      return {
        name: path.basename(f, ".md"),
        filePath,
        currentModel: modelMatch ? modelMatch[1].trim() : undefined,
      };
    });
}

function listAgents(cwd: string): AgentInfo[] {
  const builtIn = listAgentsFromDir(BUILTIN_AGENTS_DIR);
  const custom = listAgentsFromDir(getAgentsDir(cwd));

  // Custom agents override built-in by name
  const map = new Map<string, AgentInfo>();
  for (const a of builtIn) map.set(a.name, a);
  for (const a of custom) map.set(a.name, a);

  return Array.from(map.values());
}

function updateAgentModel(filePath: string, newModel: string): void {
  let content = fs.readFileSync(filePath, "utf-8");

  if (/^model:\s*.+$/m.test(content)) {
    content = content.replace(/^model:\s*.+$/m, `model: ${newModel}`);
  } else {
    const frontmatterEnd = content.indexOf("\n---\n");
    if (frontmatterEnd !== -1) {
      const insertPos = frontmatterEnd + 1; // after \n, before ---
      content =
        content.slice(0, insertPos) +
        `model: ${newModel}\n` +
        content.slice(insertPos);
    } else {
      content = `---\nmodel: ${newModel}\n---\n\n${content}`;
    }
  }

  fs.writeFileSync(filePath, content, "utf-8");
}

function removeAgentModel(filePath: string): void {
  let content = fs.readFileSync(filePath, "utf-8");
  content = content.replace(/^model:\s*.+\n?/m, "");
  fs.writeFileSync(filePath, content, "utf-8");
}

type PickerMode = "agents" | "models";

class AgentModelPicker implements Component {
  private mode: PickerMode = "agents";
  private agents: AgentInfo[];
  private modelItems: SelectItem[];
  private selectedAgent?: AgentInfo;

  private agentList: SelectList;
  private modelList: SelectList;

  private onDone: () => void;
  private onNotify: (msg: string, type: "info" | "warning" | "error") => void;
  private requestRender: () => void;
  private theme: any;

  constructor(
    agents: AgentInfo[],
    availableModels: { provider: string; id: string; name?: string }[],
    theme: any,
    onDone: () => void,
    onNotify: (msg: string, type: "info" | "warning" | "error") => void,
    requestRender: () => void
  ) {
    this.agents = agents;
    this.theme = theme;
    this.onDone = onDone;
    this.onNotify = onNotify;
    this.requestRender = requestRender;

    this.agentList = this.buildAgentList();

    this.modelItems = [
      { value: "", label: "(none)", description: "Use pi's default model" },
      ...availableModels.map((m) => ({
        value: `${m.provider}/${m.id}`,
        label: `${m.provider}/${m.id}`,
        description: m.name || "",
      })),
    ];

    this.modelList = new SelectList(this.modelItems, Math.min(this.modelItems.length, 12), {
      selectedPrefix: (t: string) => theme.fg("accent", t),
      selectedText: (t: string) => theme.fg("accent", t),
      description: (t: string) => theme.fg("muted", t),
      scrollInfo: (t: string) => theme.fg("dim", t),
      noMatch: (t: string) => theme.fg("dim", t),
    });
    this.modelList.onSelect = (item) => this.applyModel(item.value);
    this.modelList.onCancel = () => this.enterAgentMode();
  }

  private enterModelMode(agentName: string): void {
    this.selectedAgent = this.agents.find((a) => a.name === agentName);
    if (!this.selectedAgent) return;

    // Pre-select current model in the list
    let startIndex = 0;
    if (this.selectedAgent.currentModel) {
      const idx = this.modelItems.findIndex(
        (m) => m.value === this.selectedAgent!.currentModel
      );
      if (idx >= 0) startIndex = idx;
    }
    // Rebuild model list with pre-selection
    // SelectList doesn't have a setSelected method, so we rebuild it
    this.modelList = new SelectList(this.modelItems, Math.min(this.modelItems.length, 12), {
      selectedPrefix: (t: string) => this.theme.fg("accent", t),
      selectedText: (t: string) => this.theme.fg("accent", t),
      description: (t: string) => this.theme.fg("muted", t),
      scrollInfo: (t: string) => this.theme.fg("dim", t),
      noMatch: (t: string) => this.theme.fg("dim", t),
    });
    // Hack: set internal selected index via handleInput simulation
    // Actually, let's just rebuild with current model highlighted by scrolling
    // SelectList constructor doesn't take initial selection. We'd need to navigate.
    // For simplicity, we won't pre-select. User can see current model in the title.
    this.modelList.onSelect = (item) => this.applyModel(item.value);
    this.modelList.onCancel = () => this.enterAgentMode();

    this.mode = "models";
    this.invalidate();
    this.requestRender();
  }

  private buildAgentList(): SelectList {
    const items: SelectItem[] = this.agents.map((a) => ({
      value: a.name,
      label: a.name,
      description: a.currentModel
        ? `model: ${a.currentModel}`
        : "no model assigned",
    }));
    const list = new SelectList(items, Math.min(items.length, 10), {
      selectedPrefix: (t: string) => this.theme.fg("accent", t),
      selectedText: (t: string) => this.theme.fg("accent", t),
      description: (t: string) => this.theme.fg("muted", t),
      scrollInfo: (t: string) => this.theme.fg("dim", t),
      noMatch: (t: string) => this.theme.fg("dim", t),
    });
    list.onSelect = (item) => this.enterModelMode(item.value);
    list.onCancel = () => this.onDone();
    return list;
  }

  private enterAgentMode(): void {
    this.mode = "agents";
    this.selectedAgent = undefined;
    this.agentList = this.buildAgentList();
    this.invalidate();
    this.requestRender();
  }

  private applyModel(modelValue: string): void {
    if (!this.selectedAgent) return;

    if (modelValue === "") {
      removeAgentModel(this.selectedAgent.filePath);
      this.selectedAgent.currentModel = undefined;
      this.onNotify(`Cleared model for ${this.selectedAgent.name}`, "info");
    } else {
      updateAgentModel(this.selectedAgent.filePath, modelValue);
      this.selectedAgent.currentModel = modelValue;
      this.onNotify(
        `Set ${this.selectedAgent.name} → ${modelValue}`,
        "info"
      );
    }

    this.enterAgentMode();
  }

  render(width: number): string[] {
    if (this.mode === "agents") {
      return this.renderAgentMode(width);
    }
    return this.renderModelMode(width);
  }

  private padLine(content: string, targetWidth: number): string {
    const vis = visibleWidth(content);
    if (vis >= targetWidth) return content;
    return content + " ".repeat(targetWidth - vis);
  }

  private renderAgentMode(width: number): string[] {
    const inner = width - 2;
    const lines: string[] = [];

    lines.push("┌" + "─".repeat(inner) + "┐");
    lines.push("│" + this.padLine(this.theme.fg("accent", this.theme.bold(" Agent Model Assignment ")), inner) + "│");
    lines.push("├" + "─".repeat(inner) + "┤");

    const listLines = this.agentList.render(inner);
    for (const line of listLines) {
      lines.push("│" + this.padLine(line, inner) + "│");
    }

    lines.push("├" + "─".repeat(inner) + "┤");
    lines.push("│" + this.padLine(this.theme.fg("dim", " ↑↓ navigate  •  enter select model  •  esc exit "), inner) + "│");
    lines.push("└" + "─".repeat(inner) + "┘");

    return lines;
  }

  private renderModelMode(width: number): string[] {
    const inner = width - 2;
    const lines: string[] = [];
    const agentName = this.selectedAgent?.name ?? "";
    const current = this.selectedAgent?.currentModel ?? "none";

    lines.push("┌" + "─".repeat(inner) + "┐");
    lines.push("│" + this.padLine(this.theme.fg("accent", this.theme.bold(` Model for ${agentName} `)), inner) + "│");
    lines.push("│" + this.padLine(this.theme.fg("muted", ` current: ${current} `), inner) + "│");
    lines.push("├" + "─".repeat(inner) + "┤");

    const listLines = this.modelList.render(inner);
    for (const line of listLines) {
      lines.push("│" + this.padLine(line, inner) + "│");
    }

    lines.push("├" + "─".repeat(inner) + "┤");
    lines.push("│" + this.padLine(this.theme.fg("dim", " ↑↓ navigate  •  enter apply  •  esc back "), inner) + "│");
    lines.push("└" + "─".repeat(inner) + "┘");

    return lines;
  }

  handleInput(data: string): void {
    if (this.mode === "agents") {
      this.agentList.handleInput?.(data);
    } else {
      this.modelList.handleInput?.(data);
    }
  }

  invalidate(): void {
    this.agentList.invalidate();
    this.modelList.invalidate();
  }
}

export default function (pi: ExtensionAPI) {
  pi.registerCommand("agent:model", {
    description: "Assign models to agents via TUI",
    handler: async (_args, ctx) => {
      const agents = listAgents(ctx.cwd);
      if (agents.length === 0) {
        ctx.ui.notify("No agents found in agents/", "warning");
        return;
      }

      const models = ctx.modelRegistry.getAvailable().map((m) => ({
        provider: m.provider,
        id: m.id,
        name: m.name,
      }));

      await ctx.ui.custom<void>((tui, theme, _kb, done) => {
        const picker = new AgentModelPicker(
          agents,
          models,
          theme,
          () => done(),
          (msg, type) => ctx.ui.notify(msg, type),
          () => tui.requestRender()
        );

        return picker;
      }, { overlay: true });
    },
  });
}
