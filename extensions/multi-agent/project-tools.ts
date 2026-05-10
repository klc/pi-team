/**
 * Project Tools
 * Stack detection and complexity analysis for the multi-agent system.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  checkGraphify,
  queryGraph,
  findPath,
  explainNode,
  getGraphSummary,
} from "./graphify.js";

// ── Stack Detect Tool ──────────────────────────────────────────────

interface Detection {
  value: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

function detect(value: string, confidence: "high" | "medium" | "low", source: string): Detection {
  return { value, confidence, source };
}

export function registerStackDetectTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "stack_detect",
    label: "Stack Detect",
    description:
      "Auto-detect the project's tech stack by scanning dependency files and configuration. " +
      "Returns detected backend language/framework, frontend framework, databases, test tools, " +
      "build commands, and runtime constraints.",
    parameters: Type.Object({
      verbose: Type.Optional(
        Type.Boolean({
          description: "If true, include raw detected values and confidence levels. Defaults to false.",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const root = ctx.cwd;
      const verbose = params.verbose ?? false;

      const read = (p: string): string | null => {
        const full = path.join(root, p);
        if (!fs.existsSync(full)) return null;
        try {
          return fs.readFileSync(full, "utf8");
        } catch {
          return null;
        }
      };

      const readJson = (p: string): Record<string, unknown> | null => {
        const content = read(p);
        if (!content) return null;
        try {
          return JSON.parse(content);
        } catch {
          return null;
        }
      };

      const ls = (p: string): string[] => {
        const full = path.join(root, p);
        if (!fs.existsSync(full)) return [];
        try {
          return fs.readdirSync(full);
        } catch {
          return [];
        }
      };

      // Collect raw file data
      const packageJson = readJson("package.json") as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        scripts?: Record<string, string>;
        name?: string;
      } | null;

      const composerJson = readJson("composer.json") as {
        require?: Record<string, string>;
        "require-dev"?: Record<string, string>;
        scripts?: Record<string, string>;
      } | null;

      const pyprojectToml = read("pyproject.toml");
      const requirementsTxt = read("requirements.txt");
      const goMod = read("go.mod");
      const cargoToml = read("Cargo.toml");
      const gemfile = read("Gemfile");
      const envExample = read(".env.example") ?? read(".env.sample") ?? read(".env");
      const dockerCompose = read("docker-compose.yml") ?? read("docker-compose.yaml");
      const tsconfig = read("tsconfig.json");
      const viteConfig = read("vite.config.ts") ?? read("vite.config.js");
      const rootFiles = ls(".");

      const allDeps = {
        ...(packageJson?.dependencies ?? {}),
        ...(packageJson?.devDependencies ?? {}),
      };
      const composerDeps = {
        ...(composerJson?.require ?? {}),
        ...(composerJson?.["require-dev"] ?? {}),
      };
      const scripts = packageJson?.scripts ?? {};

      // Detection logic
      let backend: Detection | null = null;
      let backendFramework: Detection | null = null;

      if (composerJson) {
        backend = detect("PHP", "high", "composer.json");
        if (composerDeps["laravel/framework"]) {
          const version = composerDeps["laravel/framework"].replace(/[^0-9.]/g, "").split(".")[0];
          backendFramework = detect(`Laravel ${version}`, "high", "composer.json");
        } else if (composerDeps["symfony/symfony"] || composerDeps["symfony/framework-bundle"]) {
          backendFramework = detect("Symfony", "high", "composer.json");
        } else if (composerDeps["slim/slim"]) {
          backendFramework = detect("Slim", "high", "composer.json");
        }
      } else if (goMod) {
        backend = detect("Go", "high", "go.mod");
        if (goMod.includes("github.com/gin-gonic/gin")) backendFramework = detect("Gin", "high", "go.mod");
        else if (goMod.includes("github.com/labstack/echo")) backendFramework = detect("Echo", "high", "go.mod");
        else if (goMod.includes("github.com/gofiber/fiber")) backendFramework = detect("Fiber", "high", "go.mod");
      } else if (pyprojectToml || requirementsTxt) {
        backend = detect("Python", "high", pyprojectToml ? "pyproject.toml" : "requirements.txt");
        const deps = pyprojectToml ?? requirementsTxt ?? "";
        if (deps.includes("django")) backendFramework = detect("Django", "high", "deps");
        else if (deps.includes("fastapi")) backendFramework = detect("FastAPI", "high", "deps");
        else if (deps.includes("flask")) backendFramework = detect("Flask", "high", "deps");
      } else if (gemfile) {
        backend = detect("Ruby", "high", "Gemfile");
        if (gemfile.includes("rails")) backendFramework = detect("Rails", "high", "Gemfile");
      } else if (allDeps["express"] || allDeps["fastify"] || allDeps["@nestjs/core"]) {
        backend = detect("Node.js", "high", "package.json");
        if (allDeps["@nestjs/core"]) backendFramework = detect("NestJS", "high", "package.json");
        else if (allDeps["fastify"]) backendFramework = detect("Fastify", "high", "package.json");
        else if (allDeps["express"]) backendFramework = detect("Express", "high", "package.json");
      } else if (cargoToml) {
        backend = detect("Rust", "high", "Cargo.toml");
      }

      // Runtime
      let runtime: Detection | null = null;
      if (composerDeps["laravel/octane"]) {
        const driver = dockerCompose?.includes("swoole") ? "Swoole" : "RoadRunner";
        runtime = detect(`Laravel Octane (${driver}) — persistent workers, no FPM lifecycle`, "high", "composer.json + docker");
      } else if (goMod || cargoToml) {
        runtime = detect("Long-lived process — static state persists between requests", "medium", "language");
      }

      // Frontend
      let frontendFramework: Detection | null = null;
      let metaFramework: Detection | null = null;
      let styling: Detection | null = null;
      let buildTool: Detection | null = null;
      let ssr: Detection | null = null;

      if (allDeps["vue"] || allDeps["@vue/runtime-core"]) {
        const version = (allDeps["vue"] ?? "").replace(/[^0-9]/g, "")[0] ?? "3";
        frontendFramework = detect(`Vue ${version}`, "high", "package.json");
        if (allDeps["@inertiajs/vue3"] || allDeps["@inertiajs/vue"]) {
          metaFramework = detect("Inertia.js", "high", "package.json");
          ssr = detect("Enabled (Inertia SSR) — browser APIs unavailable during SSR render", "high", "package.json");
        } else if (allDeps["nuxt"]) {
          metaFramework = detect("Nuxt", "high", "package.json");
          ssr = detect("Enabled (Nuxt SSR)", "high", "package.json");
        }
      } else if (allDeps["react"] || allDeps["react-dom"]) {
        frontendFramework = detect("React", "high", "package.json");
        if (allDeps["next"]) {
          metaFramework = detect("Next.js", "high", "package.json");
          ssr = detect("Enabled (Next.js) — use getServerSideProps / server components carefully", "high", "package.json");
        } else if (allDeps["@inertiajs/react"]) {
          metaFramework = detect("Inertia.js", "high", "package.json");
          ssr = detect("Enabled (Inertia SSR) — browser APIs unavailable during SSR render", "high", "package.json");
        }
      } else if (allDeps["svelte"] || allDeps["@sveltejs/kit"]) {
        frontendFramework = detect("Svelte", "high", "package.json");
        if (allDeps["@sveltejs/kit"]) {
          metaFramework = detect("SvelteKit", "high", "package.json");
          ssr = detect("Enabled (SvelteKit)", "high", "package.json");
        }
      }

      if (allDeps["tailwindcss"]) {
        const v = (allDeps["tailwindcss"] ?? "").replace(/[^0-9]/g, "")[0] ?? "3";
        styling = detect(`Tailwind CSS v${v}`, "high", "package.json");
      } else if (allDeps["@emotion/react"] || allDeps["styled-components"]) {
        styling = detect("CSS-in-JS", "high", "package.json");
      } else if (allDeps["sass"] || allDeps["scss"]) {
        styling = detect("SCSS/Sass", "high", "package.json");
      }

      if (viteConfig) {
        buildTool = detect("Vite", "high", "vite.config.*");
      } else if (allDeps["webpack"]) {
        buildTool = detect("Webpack", "high", "package.json");
      } else if (allDeps["turbopack"] || allDeps["next"]) {
        buildTool = detect("Turbopack / Next.js", "medium", "package.json");
      }

      // Databases
      const databases: string[] = [];
      const allDepStr = Object.keys(allDeps).join(" ") + Object.keys(composerDeps).join(" ");
      const envStr = envExample ?? "";

      if (allDepStr.includes("mysql") || envStr.match(/mysql|DB_CONNECTION.*mysql/i)) databases.push("MySQL");
      if (allDepStr.includes("postgres") || envStr.match(/postgres|pgsql/i)) databases.push("PostgreSQL");
      if (allDepStr.includes("mongodb") || allDepStr.includes("mongoose")) databases.push("MongoDB");
      if (allDepStr.includes("sqlite") || envStr.includes("sqlite")) databases.push("SQLite");
      if (allDepStr.includes("redis") || envStr.includes("REDIS")) databases.push("Redis (cache/queue)");
      if (allDepStr.includes("clickhouse") || envStr.includes("CLICKHOUSE")) databases.push("ClickHouse (analytics)");
      if (allDepStr.includes("elasticsearch")) databases.push("Elasticsearch");

      // Test frameworks
      const testFrameworks: string[] = [];
      const testCommands: string[] = [];

      if (composerDeps["pestphp/pest"] || composerDeps["phpunit/phpunit"]) {
        testFrameworks.push(composerDeps["pestphp/pest"] ? "Pest PHP" : "PHPUnit");
        testCommands.push("php artisan test");
      }
      if (allDeps["vitest"]) {
        testFrameworks.push("Vitest");
        testCommands.push(scripts["test"] ?? "npm run test");
      }
      if (allDeps["jest"] || allDeps["@jest/core"]) {
        testFrameworks.push("Jest");
        testCommands.push(scripts["test"] ?? "npm test");
      }
      if (allDeps["@playwright/test"] || allDeps["playwright"]) {
        testFrameworks.push("Playwright (E2E)");
        testCommands.push("npx playwright test");
      }
      if (pyprojectToml?.includes("pytest") || requirementsTxt?.includes("pytest")) {
        testFrameworks.push("pytest");
        testCommands.push("pytest");
      }

      // Dev commands
      const devCommands: string[] = [];
      if (scripts["dev"]) devCommands.push("npm run dev");
      if (scripts["start"]) devCommands.push("npm start");
      if (composerDeps["laravel/octane"]) devCommands.push("php artisan octane:start --watch");
      if (composerDeps["laravel/framework"]) devCommands.push("php artisan serve");

      const buildCommands: string[] = [];
      if (scripts["build"]) buildCommands.push("npm run build");

      // Docker
      const hasDocker = fs.existsSync(path.join(root, "docker-compose.yml")) || fs.existsSync(path.join(root, "docker-compose.yaml"));
      const hasDockerfile = fs.existsSync(path.join(root, "Dockerfile"));

      // CI/CD
      const githubWorkflows = ls(".github/workflows");
      const hasGithubActions = githubWorkflows.length > 0;
      const hasGitlabCI = fs.existsSync(path.join(root, ".gitlab-ci.yml"));

      // Format output
      const lines: string[] = [
        "# Stack Detection Report",
        "",
        "> Generated by stack_detect tool.",
        "",
      ];

      lines.push("## Backend");
      lines.push(`- **Language:** ${backend?.value ?? "Not detected"}`);
      if (backendFramework) lines.push(`- **Framework:** ${backendFramework.value}`);
      if (runtime) lines.push(`- **Runtime:** ${runtime.value}`);
      lines.push("");

      if (frontendFramework) {
        lines.push("## Frontend");
        lines.push(`- **Framework:** ${frontendFramework.value}`);
        if (metaFramework) lines.push(`- **Meta-framework:** ${metaFramework.value}`);
        if (styling) lines.push(`- **Styling:** ${styling.value}`);
        if (buildTool) lines.push(`- **Build tool:** ${buildTool.value}`);
        if (ssr) lines.push(`- **SSR:** ${ssr.value}`);
        if (tsconfig) lines.push(`- **TypeScript:** Yes`);
        lines.push("");
      }

      if (databases.length > 0) {
        lines.push("## Databases");
        for (const db of databases) lines.push(`- ${db}`);
        lines.push("");
      }

      if (testFrameworks.length > 0) {
        lines.push("## Testing");
        lines.push(`- **Frameworks:** ${testFrameworks.join(", ")}`);
        lines.push("- **Test commands:**");
        for (const cmd of testCommands) lines.push(`  - \`${cmd}\``);
        lines.push("");
      }

      if (devCommands.length > 0 || buildCommands.length > 0) {
        lines.push("## Dev & Build Commands");
        if (devCommands.length > 0) {
          lines.push("- **Dev server:**");
          for (const cmd of devCommands) lines.push(`  - \`${cmd}\``);
        }
        if (buildCommands.length > 0) {
          lines.push("- **Build:**");
          for (const cmd of buildCommands) lines.push(`  - \`${cmd}\``);
        }
        lines.push("");
      }

      lines.push("## Infrastructure");
      lines.push(`- **Docker:** ${hasDocker ? "Yes (docker-compose)" : hasDockerfile ? "Yes (Dockerfile only)" : "Not detected"}`);
      lines.push(`- **CI/CD:** ${hasGithubActions ? `GitHub Actions (${githubWorkflows.length} workflows)` : hasGitlabCI ? "GitLab CI" : "Not detected"}`);
      lines.push("");

      // Runtime constraints
      const constraints: string[] = [];
      if (runtime?.value.includes("Octane")) {
        constraints.push("Never use `static` properties to store request-scoped data — workers are persistent");
        constraints.push("Never mutate singleton state — use `app()->scoped()` for request-scoped bindings");
        constraints.push("Always close file handles and custom DB connections in `finally` blocks");
        constraints.push("ClickHouse client: use a fresh instance per request or verified pool");
      }
      if (ssr?.value.includes("Inertia") || ssr?.value.includes("Next") || ssr?.value.includes("Nuxt")) {
        constraints.push("SSR: never access `window`, `document`, or `localStorage` at component setup — defer to `onMounted()`");
        constraints.push("SSR: use `useSSRContext()` or framework-specific server helpers for server-side data");
      }

      if (constraints.length > 0) {
        lines.push("## Detected Runtime Constraints");
        lines.push("");
        for (const c of constraints) lines.push(`- ${c}`);
        lines.push("");
      }

      // Gaps
      const gaps: string[] = [];
      if (!backend) gaps.push("Backend language (no composer.json, go.mod, package.json backend deps, pyproject.toml, or Gemfile detected)");
      if (!backendFramework && backend) gaps.push("Backend framework (language detected but no recognized framework found)");
      if (!frontendFramework && packageJson) gaps.push("Frontend framework (package.json found but no recognized UI framework)");
      if (databases.length === 0) gaps.push("Database (check .env.example or docker-compose for DB config)");
      if (testFrameworks.length === 0) gaps.push("Test framework and test commands");

      if (gaps.length > 0) {
        lines.push("## ⚠️ Gaps — Manual Input Required");
        lines.push("These could not be detected automatically:");
        lines.push("");
        for (const g of gaps) lines.push(`- ${g}`);
        lines.push("");
      }

      if (verbose) {
        lines.push("---");
        lines.push("## Raw Detection Details");
        lines.push("");
        const detections = { backend, backendFramework, runtime, frontendFramework, metaFramework, styling, buildTool, ssr };
        for (const [key, val] of Object.entries(detections)) {
          if (val) lines.push(`- **${key}:** ${val.value} (confidence: ${val.confidence}, source: ${val.source})`);
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          backend: backend?.value ?? null,
          frontend: frontendFramework?.value ?? null,
          databases,
          testFrameworks,
          hasDocker,
          hasGithubActions,
        },
      };
    },
  });
}

// ── Complexity Score Tool ──────────────────────────────────────────

const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx",
  ".php", ".py", ".go", ".rb",
]);

interface FunctionAnalysis {
  name: string;
  line: number;
  score: number;
}

interface FileAnalysis {
  functions: FunctionAnalysis[];
  fileScore: number;
}

export function registerComplexityScoreTool(pi: ExtensionAPI) {
  pi.registerTool({
    name: "complexity_score",
    label: "Complexity Score",
    description:
      "Estimate cyclomatic complexity of a source file or directory. " +
      "Returns a complexity score per function/method and highlights hotspots above the threshold. " +
      "Useful for reviewer and performance-analyst to identify overly complex code.",
    parameters: Type.Object({
      path: Type.String({
        description: "Path to a file or directory to analyze, relative to the project root",
      }),
      threshold: Type.Optional(
        Type.Number({
          description: "Complexity score above which a function is flagged as a hotspot. Defaults to 10.",
        })
      ),
      top: Type.Optional(
        Type.Number({
          description: "For directory scans, return only the top N most complex files. Defaults to 10.",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const threshold = params.threshold ?? 10;
      const top = params.top ?? 10;
      const targetPath = path.resolve(ctx.cwd, params.path);
      const relativePath = path.relative(ctx.cwd, targetPath);
      if (relativePath.startsWith("..") || relativePath === "..") {
        return {
          content: [{ type: "text", text: `Path is outside project root: ${params.path}` }],
          isError: true,
          details: {},
        };
      }

      if (!fs.existsSync(targetPath)) {
        return {
          content: [{ type: "text", text: `Path not found: ${params.path}` }],
          isError: true,
          details: {},
        };
      }

      const stat = fs.statSync(targetPath);

      if (stat.isFile()) {
        const report = analyzeFile(targetPath, params.path, threshold);
        return {
          content: [{ type: "text", text: report }],
          details: {},
        };
      }

      // Directory scan
      const files = collectSourceFiles(targetPath);
      if (files.length === 0) {
        return {
          content: [{ type: "text", text: `No supported source files found in: ${params.path}` }],
          details: {},
        };
      }

      interface FileResult {
        relPath: string;
        maxComplexity: number;
        hotspots: number;
      }

      const results: FileResult[] = [];
      for (const file of files) {
        const relPath = path.relative(ctx.cwd, file);
        const analysis = analyzeFileRaw(file, threshold);
        if (analysis.functions.length > 0) {
          const maxComplexity = Math.max(...analysis.functions.map((f) => f.score));
          const hotspots = analysis.functions.filter((f) => f.score >= threshold).length;
          results.push({ relPath, maxComplexity, hotspots });
        }
      }

      results.sort((a, b) => b.maxComplexity - a.maxComplexity);
      const topFiles = results.slice(0, top);

      const lines: string[] = [
        `# Complexity Analysis: ${params.path}`,
        "",
        `**Files scanned:** ${files.length}`,
        `**Hotspot threshold:** ${threshold}`,
        `**Files with hotspots:** ${results.filter((r) => r.hotspots > 0).length}`,
        "",
        `## Top ${topFiles.length} Most Complex Files`,
        "",
        "| File | Max complexity | Hotspots |",
        "|------|---------------|----------|",
      ];

      for (const r of topFiles) {
        const flag = r.maxComplexity >= threshold ? " 🔴" : r.maxComplexity >= threshold * 0.7 ? " 🟡" : "";
        lines.push(`| ${r.relPath} | ${r.maxComplexity}${flag} | ${r.hotspots} |`);
      }

      if (results.filter((r) => r.hotspots > 0).length === 0) {
        lines.push("", `✅ No functions exceed the complexity threshold of ${threshold}.`);
      } else {
        lines.push(
          "",
          "## Recommendations",
          "",
          `Functions with complexity ≥ ${threshold} should be refactored.`,
          `Run with a specific file path to see detailed per-function breakdown.`
        );
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          filesScanned: files.length,
          hotspotThreshold: threshold,
          filesWithHotspots: results.filter((r) => r.hotspots > 0).length,
          topFiles: topFiles.map((f) => ({
            path: f.relPath,
            maxComplexity: f.maxComplexity,
            hotspots: f.hotspots,
          })),
        },
      };
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  const SKIP_DIRS = new Set(["node_modules", "vendor", ".git", "dist", "build", ".pi", ".pi-agents", "coverage"]);

  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(path.join(d, entry.name));
      } else if (SUPPORTED_EXTENSIONS.has(path.extname(entry.name))) {
        results.push(path.join(d, entry.name));
      }
    }
  }
  walk(dir);
  return results;
}

function analyzeFileRaw(filePath: string, _threshold: number): FileAnalysis {
  let source: string;
  try {
    source = fs.readFileSync(filePath, "utf8");
  } catch {
    return { functions: [], fileScore: 0 };
  }

  const ext = path.extname(filePath);
  const lines = source.split("\n");

  const funcPatterns: Record<string, RegExp> = {
    ".ts": /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\(|(?:public|private|protected|static|async)\s+(?:async\s+)?(\w+)\s*\()/,
    ".tsx": /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\(|(?:public|private|protected|static|async)\s+(?:async\s+)?(\w+)\s*\()/,
    ".js": /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\()/,
    ".jsx": /(?:function\s+(\w+)|(?:async\s+)?(\w+)\s*[=:]\s*(?:async\s+)?\()/,
    ".php": /(?:function\s+(\w+)|public\s+(?:static\s+)?function\s+(\w+)|private\s+(?:static\s+)?function\s+(\w+)|protected\s+(?:static\s+)?function\s+(\w+))/,
    ".py": /def\s+(\w+)\s*\(/,
    ".go": /func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)\s*\(/,
    ".rb": /def\s+(\w+)/,
  };

  const funcPattern = funcPatterns[ext] ?? funcPatterns[".js"];

  const branchKeywords = [
    /\bif\b/, /\belse\b/, /\belif\b/, /\belse\s+if\b/,
    /\bfor\b/, /\bforeach\b/, /\bwhile\b/, /\bdo\b/,
    /\bswitch\b/, /\bcase\b/, /\bcatch\b/, /\bexcept\b/,
    /\?\?/, /\?\s*:/, /&&/, /\|\|/,
  ];

  const functions: FunctionAnalysis[] = [];
  let currentFunc: { name: string; line: number; score: number } | null = null;
  let braceDepth = 0;
  let funcBraceStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const funcMatch = line.match(funcPattern);
    if (funcMatch && !currentFunc) {
      const name = funcMatch[1] ?? funcMatch[2] ?? funcMatch[3] ?? "anonymous";
      currentFunc = { name, line: i + 1, score: 1 };
      funcBraceStart = braceDepth;
    }

    if (currentFunc) {
      for (const kw of branchKeywords) {
        const matches = line.match(new RegExp(kw.source, "g"));
        if (matches) currentFunc.score += matches.length;
      }

      for (const ch of line) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") {
          braceDepth--;
          if (braceDepth <= funcBraceStart && currentFunc) {
            functions.push({ ...currentFunc });
            currentFunc = null;
          }
        }
      }

      if ((ext === ".py" || ext === ".rb") && i > 0) {
        const nextLine = lines[i + 1] ?? "";
        if (nextLine.match(funcPattern)) {
          if (currentFunc) {
            functions.push({ ...currentFunc });
            currentFunc = null;
          }
        }
      }
    } else {
      for (const ch of line) {
        if (ch === "{") braceDepth++;
        else if (ch === "}") braceDepth = Math.max(0, braceDepth - 1);
      }
    }
  }

  if (currentFunc) functions.push(currentFunc);

  const fileScore = functions.length > 0 ? Math.max(...functions.map((f) => f.score)) : 0;
  return { functions, fileScore };
}

// ── Graphify Tools ─────────────────────────────────────────────────

export function registerGraphifyTools(pi: ExtensionAPI) {
  /**
   * graphify_check
   * Returns whether graphify is available and basic stats.
   */
  pi.registerTool({
    name: "graphify_check",
    label: "Graphify Check",
    description:
      "Check if graphify is installed and a graph exists for this project. " +
      "Returns node/edge/community counts and paths to outputs. " +
      "Always call this before using other graphify tools.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const status = checkGraphify(ctx.cwd);
      if (!status.available) {
        return {
          content: [{ type: "text", text: status.reason || "graphify not available." }],
          details: { available: false },
        };
      }
      const text = [
        "# Graphify Status",
        "",
        `**Available:** Yes`,
        `**Nodes:** ${status.nodeCount}`,
        `**Edges:** ${status.edgeCount}`,
        `**Communities:** ${status.communityCount}`,
        `**Graph:** \`${status.graphPath}\``,
      ];
      if (status.reportPath) text.push(`**Report:** \`${status.reportPath}\``);
      return {
        content: [{ type: "text", text: text.join("\n") }],
        details: status,
      };
    },
  });

  /**
   * graphify_query
   * BFS/DFS traversal over the graph.
   */
  pi.registerTool({
    name: "graphify_query",
    label: "Graphify Query",
    description:
      "Query the knowledge graph for context about concepts, files, or agents. " +
      "Use BFS for broad context ('What is X connected to?') and DFS for tracing a specific chain. " +
      "Best for: understanding architecture, finding related components, discovering cross-file connections.",
    parameters: Type.Object({
      question: Type.String({
        description: "The concept or question to query the graph for.",
      }),
      mode: Type.Optional(
        Type.String({
          description: "Traversal mode: 'bfs' (default) for broad context, 'dfs' for deep path tracing.",
        })
      ),
      budget: Type.Optional(
        Type.Number({
          description: "Approximate token budget for the response. Default 2000.",
        })
      ),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const mode = (params.mode as "bfs" | "dfs") ?? "bfs";
      const budget = params.budget ?? 2000;
      const result = queryGraph(ctx.cwd, params.question, mode, budget);

      if (!result) {
        return {
          content: [{ type: "text", text: "No graph found. Run `graphify .` first, then try again." }],
          isError: true,
          details: {},
        };
      }

      if (result.nodes.length === 0) {
        return {
          content: [{ type: "text", text: `No nodes matched the query: "${params.question}"` }],
          details: { mode, startNodes: result.startNodes },
        };
      }

      const lines: string[] = [
        `# Graphify Query: "${params.question}"`,
        "",
        `**Mode:** ${mode.toUpperCase()} | **Start nodes:** ${result.startNodes.join(", ")} | **Found:** ${result.nodes.length} nodes, ${result.edges.length} edges`,
        "",
        "## Nodes",
        "",
      ];

      for (const n of result.nodes.slice(0, 30)) {
        const loc = n.source_location ? ` (${n.source_location})` : "";
        lines.push(`- **${n.label}** [${n.file_type}] \`${n.source_file}\`${loc}`);
      }
      if (result.nodes.length > 30) {
        lines.push(`- ... and ${result.nodes.length - 30} more nodes`);
      }

      if (result.edges.length > 0) {
        lines.push("", "## Edges");
        for (const e of result.edges.slice(0, 30)) {
          const src = result.nodes.find((n) => n.id === e.source)?.label ?? e.source;
          const tgt = result.nodes.find((n) => n.id === e.target)?.label ?? e.target;
          lines.push(`- ${src} --${e.relation}--> ${tgt} [${e.confidence}]`);
        }
        if (result.edges.length > 30) {
          lines.push(`- ... and ${result.edges.length - 30} more edges`);
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          mode,
          nodeCount: result.nodes.length,
          edgeCount: result.edges.length,
          startNodes: result.startNodes,
        },
      };
    },
  });

  /**
   * graphify_path
   * Shortest path between two concepts.
   */
  pi.registerTool({
    name: "graphify_path",
    label: "Graphify Path",
    description:
      "Find the shortest path between two concepts in the knowledge graph. " +
      "Useful for tracing dependencies, understanding how components relate, or finding hidden connections.",
    parameters: Type.Object({
      from: Type.String({
        description: "Source concept name (partial match supported).",
      }),
      to: Type.String({
        description: "Target concept name (partial match supported).",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = findPath(ctx.cwd, params.from, params.to);

      if (!result) {
        return {
          content: [{ type: "text", text: "No graph found. Run `graphify .` first." }],
          isError: true,
          details: {},
        };
      }

      if (!result.found) {
        return {
          content: [{ type: "text", text: `No path found between "${params.from}" and "${params.to}".` }],
          details: { found: false },
        };
      }

      const lines: string[] = [
        `# Path: ${params.from} → ${params.to}`,
        "",
        `**Hops:** ${result.hops}`,
        "",
      ];

      for (let i = 0; i < result.path.length; i++) {
        const step = result.path[i];
        if (i === 0) {
          lines.push(`1. **${step.node.label}** [start]`);
        } else {
          lines.push(`${i + 1}. **${step.node.label}** — *${step.edgeRelation}* [${step.edgeConfidence}]`);
        }
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { found: true, hops: result.hops },
      };
    },
  });

  /**
   * graphify_explain
   * Explain a single node and its connections.
   */
  pi.registerTool({
    name: "graphify_explain",
    label: "Graphify Explain",
    description:
      "Get a plain-language explanation of a concept/node from the knowledge graph, " +
      "including all its direct connections, relations, and confidence levels.",
    parameters: Type.Object({
      concept: Type.String({
        description: "The concept/node to explain (partial match supported).",
      }),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const result = explainNode(ctx.cwd, params.concept);

      if (!result) {
        return {
          content: [{ type: "text", text: "No graph found. Run `graphify .` first." }],
          isError: true,
          details: {},
        };
      }

      if (!result.node) {
        return {
          content: [{ type: "text", text: `No node matching "${params.concept}" found in the graph.` }],
          details: { found: false },
        };
      }

      const n = result.node;
      const lines: string[] = [
        `# ${n.label}`,
        "",
        `**Type:** ${n.file_type}`,
        `**Source:** \`${n.source_file}\`${n.source_location ? ` ${n.source_location}` : ""}`,
        `**Connections:** ${result.connections.length}`,
        "",
        "## Related",
        "",
      ];

      for (const c of result.connections) {
        lines.push(`- **${c.label}** — *${c.relation}* [${c.confidence}] (from \`${c.sourceFile}\`)`);
      }

      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: {
          nodeId: n.id,
          label: n.label,
          connectionCount: result.connections.length,
        },
      };
    },
  });

  /**
   * graphify_report
   * Returns the GRAPH_REPORT.md summary.
   */
  pi.registerTool({
    name: "graphify_report",
    label: "Graphify Report",
    description:
      "Get a summary of the Graph Report including God Nodes, Surprising Connections, and Communities. " +
      "Useful for getting a high-level architectural overview before planning or debugging.",
    parameters: Type.Object({}),
    async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
      const summary = getGraphSummary(ctx.cwd);
      if (!summary) {
        return {
          content: [{ type: "text", text: "No graphify report found. Run `graphify .` first." }],
          isError: true,
          details: {},
        };
      }
      return {
        content: [{ type: "text", text: summary }],
        details: {},
      };
    },
  });
}

// ── Helpers ────────────────────────────────────────────────────────

function analyzeFile(filePath: string, displayPath: string, threshold: number): string {
  const analysis = analyzeFileRaw(filePath, threshold);

  if (analysis.functions.length === 0) {
    return `No functions detected in: ${displayPath}\n\nFile may use a pattern not recognized by this tool, or may be empty.`;
  }

  analysis.functions.sort((a, b) => b.score - a.score);

  const hotspots = analysis.functions.filter((f) => f.score >= threshold);
  const warnings = analysis.functions.filter((f) => f.score >= threshold * 0.7 && f.score < threshold);

  const lines: string[] = [
    `# Complexity Analysis: ${displayPath}`,
    "",
    `**Functions analyzed:** ${analysis.functions.length}`,
    `**Hotspot threshold:** ${threshold}`,
    `**Hotspots (≥${threshold}):** ${hotspots.length}`,
    `**Warnings (≥${Math.round(threshold * 0.7)}):** ${warnings.length}`,
    "",
    "## Function Breakdown",
    "",
    "| Function | Line | Complexity | Status |",
    "|----------|------|-----------|--------|",
  ];

  for (const fn of analysis.functions) {
    let status = "✅ OK";
    if (fn.score >= threshold) status = "🔴 Hotspot — refactor";
    else if (fn.score >= threshold * 0.7) status = "🟡 Warning";
    lines.push(`| \`${fn.name}\` | ${fn.line} | ${fn.score} | ${status} |`);
  }

  if (hotspots.length > 0) {
    lines.push(
      "",
      "## Recommendation",
      "",
      `**${hotspots.length} function(s) exceed the complexity threshold of ${threshold}.**`,
      "",
      "These should be refactored. Each hotspot function should be broken into smaller, single-responsibility functions."
    );
  } else if (warnings.length > 0) {
    lines.push(
      "",
      "## Note",
      "",
      `No hotspots found, but ${warnings.length} function(s) are approaching the threshold.`,
      "Consider simplifying them proactively."
    );
  } else {
    lines.push("", `✅ All functions are within acceptable complexity limits.`);
  }

  return lines.join("\n");
}
