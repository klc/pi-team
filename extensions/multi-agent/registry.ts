/**
 * Agent Registry
 * Manages agent definitions loaded from agents/ directory
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { AgentDefinition, AgentRegistry as IAgentRegistry } from "./types.js";

export class AgentRegistry implements IAgentRegistry {
  agents = new Map<string, AgentDefinition>();
  private agentsDir: string;
  private builtInAgentsDir?: string;

  constructor(cwd: string, builtInAgentsDir?: string) {
    this.agentsDir = path.join(cwd, "agents");
    this.builtInAgentsDir = builtInAgentsDir;
    this.loadAgents();
  }

  private loadAgents(): void {
    if (this.builtInAgentsDir && path.resolve(this.builtInAgentsDir) !== path.resolve(this.agentsDir)) {
      this.loadFromDir(this.builtInAgentsDir);
    }

    this.loadFromDir(this.agentsDir);
  }

  private loadFromDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      return;
    }

    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;

      const filePath = path.join(dir, entry);
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) continue;

      const name = path.basename(entry, ".md");
      const content = fs.readFileSync(filePath, "utf-8");

      const def = this.parseAgentFile(name, filePath, content);
      if (def) {
        this.agents.set(name, def);
      }
    }
  }

  private parseAgentFile(
    name: string,
    filePath: string,
    content: string
  ): AgentDefinition | null {
    // Extract description from first non-frontmatter heading or first paragraph
    const lines = content.split("\n");
    let description = "";
    let inFrontmatter = false;

    for (const line of lines) {
      if (line.trim() === "---") {
        inFrontmatter = !inFrontmatter;
        continue;
      }
      if (inFrontmatter) continue;

      if (line.startsWith("# ")) {
        description = line.replace("# ", "").trim();
        break;
      }
      if (line.trim() && !description) {
        description = line.trim();
        break;
      }
    }

    // Parse description from frontmatter if present
    const descMatch = content.match(/^description:\s*(.+)$/m);
    if (descMatch) {
      description = descMatch[1].trim();
    }

    // Parse allowed-tools from frontmatter if present
    const allowedToolsMatch = content.match(/^allowed-tools:\s*(.+)$/m);
    const allowedTools = allowedToolsMatch
      ? allowedToolsMatch[1].trim().split(/\s+/)
      : undefined;

    // Parse model override from frontmatter
    const modelMatch = content.match(/^model:\s*(.+)$/m);
    const model = modelMatch ? modelMatch[1].trim() : undefined;

    return {
      name,
      description: description || `${name} agent`,
      systemPromptPath: filePath,
      allowedTools,
      model,
    };
  }

  get(name: string): AgentDefinition | undefined {
    return this.agents.get(name);
  }

  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  register(def: AgentDefinition): void {
    this.agents.set(def.name, def);
  }

  reload(): void {
    this.agents.clear();
    this.loadAgents();
  }
}
