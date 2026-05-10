/**
 * Agent Model Picker
 * TUI-based per-agent model assignment with persistent agent list
 */
import { SelectList, visibleWidth, } from "@earendil-works/pi-tui";
import { fileURLToPath } from "node:url";
import * as fs from "node:fs";
import * as path from "node:path";
const BUILTIN_AGENTS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "agents");
function getAgentsDir(cwd) {
    return path.join(cwd, "agents");
}
function listAgentsFromDir(dir) {
    if (!fs.existsSync(dir))
        return [];
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
function listAgents(cwd) {
    const builtIn = listAgentsFromDir(BUILTIN_AGENTS_DIR);
    const custom = listAgentsFromDir(getAgentsDir(cwd));
    // Custom agents override built-in by name
    const map = new Map();
    for (const a of builtIn)
        map.set(a.name, a);
    for (const a of custom)
        map.set(a.name, a);
    return Array.from(map.values());
}
function updateAgentModel(filePath, newModel) {
    let content = fs.readFileSync(filePath, "utf-8");
    if (/^model:\s*.+$/m.test(content)) {
        content = content.replace(/^model:\s*.+$/m, `model: ${newModel}`);
    }
    else {
        const frontmatterEnd = content.indexOf("\n---\n");
        if (frontmatterEnd !== -1) {
            const insertPos = frontmatterEnd + "\n---\n".length;
            content =
                content.slice(0, insertPos) +
                    `model: ${newModel}\n` +
                    content.slice(insertPos);
        }
        else {
            content = `---\nmodel: ${newModel}\n---\n\n${content}`;
        }
    }
    fs.writeFileSync(filePath, content, "utf-8");
}
function removeAgentModel(filePath) {
    let content = fs.readFileSync(filePath, "utf-8");
    content = content.replace(/^model:\s*.+\n?/m, "");
    fs.writeFileSync(filePath, content, "utf-8");
}
class AgentModelPicker {
    mode = "agents";
    agents;
    modelItems;
    selectedAgent;
    agentList;
    modelList;
    onDone;
    onNotify;
    requestRender;
    theme;
    constructor(agents, availableModels, theme, onDone, onNotify, requestRender) {
        this.agents = agents;
        this.theme = theme;
        this.onDone = onDone;
        this.onNotify = onNotify;
        this.requestRender = requestRender;
        const agentSelectItems = agents.map((a) => ({
            value: a.name,
            label: a.name,
            description: a.currentModel
                ? `model: ${a.currentModel}`
                : "no model assigned",
        }));
        this.agentList = new SelectList(agentSelectItems, Math.min(agentSelectItems.length, 10), {
            selectedPrefix: (t) => theme.fg("accent", t),
            selectedText: (t) => theme.fg("accent", t),
            description: (t) => theme.fg("muted", t),
            scrollInfo: (t) => theme.fg("dim", t),
            noMatch: (t) => theme.fg("dim", t),
        });
        this.agentList.onSelect = (item) => this.enterModelMode(item.value);
        this.agentList.onCancel = () => onDone();
        this.modelItems = [
            { value: "", label: "(none)", description: "Use pi's default model" },
            ...availableModels.map((m) => ({
                value: `${m.provider}/${m.id}`,
                label: `${m.provider}/${m.id}`,
                description: m.name || "",
            })),
        ];
        this.modelList = new SelectList(this.modelItems, Math.min(this.modelItems.length, 12), {
            selectedPrefix: (t) => theme.fg("accent", t),
            selectedText: (t) => theme.fg("accent", t),
            description: (t) => theme.fg("muted", t),
            scrollInfo: (t) => theme.fg("dim", t),
            noMatch: (t) => theme.fg("dim", t),
        });
        this.modelList.onSelect = (item) => this.applyModel(item.value);
        this.modelList.onCancel = () => this.enterAgentMode();
    }
    enterModelMode(agentName) {
        this.selectedAgent = this.agents.find((a) => a.name === agentName);
        if (!this.selectedAgent)
            return;
        // Pre-select current model in the list
        let startIndex = 0;
        if (this.selectedAgent.currentModel) {
            const idx = this.modelItems.findIndex((m) => m.value === this.selectedAgent.currentModel);
            if (idx >= 0)
                startIndex = idx;
        }
        // Rebuild model list with pre-selection
        // SelectList doesn't have a setSelected method, so we rebuild it
        this.modelList = new SelectList(this.modelItems, Math.min(this.modelItems.length, 12), {
            selectedPrefix: (t) => this.theme.fg("accent", t),
            selectedText: (t) => this.theme.fg("accent", t),
            description: (t) => this.theme.fg("muted", t),
            scrollInfo: (t) => this.theme.fg("dim", t),
            noMatch: (t) => this.theme.fg("dim", t),
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
    enterAgentMode() {
        this.mode = "agents";
        this.selectedAgent = undefined;
        this.invalidate();
        this.requestRender();
    }
    applyModel(modelValue) {
        if (!this.selectedAgent)
            return;
        if (modelValue === "") {
            removeAgentModel(this.selectedAgent.filePath);
            this.selectedAgent.currentModel = undefined;
            this.onNotify(`Cleared model for ${this.selectedAgent.name}`, "info");
        }
        else {
            updateAgentModel(this.selectedAgent.filePath, modelValue);
            this.selectedAgent.currentModel = modelValue;
            this.onNotify(`Set ${this.selectedAgent.name} → ${modelValue}`, "info");
        }
        // Update agent list item description
        const agentSelectItems = this.agentList;
        if (agentSelectItems.items) {
            const item = agentSelectItems.items.find((i) => i.value === this.selectedAgent.name);
            if (item) {
                item.description = this.selectedAgent.currentModel
                    ? `model: ${this.selectedAgent.currentModel}`
                    : "no model assigned";
            }
        }
        this.enterAgentMode();
    }
    render(width) {
        if (this.mode === "agents") {
            return this.renderAgentMode(width);
        }
        return this.renderModelMode(width);
    }
    padLine(content, targetWidth) {
        const vis = visibleWidth(content);
        if (vis >= targetWidth)
            return content;
        return content + " ".repeat(targetWidth - vis);
    }
    renderAgentMode(width) {
        const inner = width - 2;
        const lines = [];
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
    renderModelMode(width) {
        const inner = width - 2;
        const lines = [];
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
    handleInput(data) {
        if (this.mode === "agents") {
            this.agentList.handleInput?.(data);
        }
        else {
            this.modelList.handleInput?.(data);
        }
    }
    invalidate() {
        this.agentList.invalidate();
        this.modelList.invalidate();
    }
}
export default function (pi) {
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
            await ctx.ui.custom((tui, theme, _kb, done) => {
                const picker = new AgentModelPicker(agents, models, theme, () => done(), (msg, type) => ctx.ui.notify(msg, type), () => tui.requestRender());
                return picker;
            }, { overlay: true });
        },
    });
}
