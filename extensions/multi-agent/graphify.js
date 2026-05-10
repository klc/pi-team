/**
 * Graphify Integration Module
 *
 * Provides graph query capabilities for the multi-agent orchestrator.
 * Reads graphify-out/graph.json and GRAPH_REPORT.md to give agents
 * persistent memory of the codebase architecture.
 */
import * as fs from "node:fs";
import * as path from "node:path";
// ── State ──────────────────────────────────────────────────────────
let cachedGraph = null;
let cachedMtime = 0;
// ── Helpers ────────────────────────────────────────────────────────
function getGraphPath(cwd) {
    return path.join(cwd, "graphify-out", "graph.json");
}
function getReportPath(cwd) {
    return path.join(cwd, "graphify-out", "GRAPH_REPORT.md");
}
function loadGraph(cwd) {
    const graphPath = getGraphPath(cwd);
    if (!fs.existsSync(graphPath))
        return null;
    const stat = fs.statSync(graphPath);
    if (cachedGraph && stat.mtimeMs === cachedMtime) {
        return cachedGraph;
    }
    try {
        const raw = fs.readFileSync(graphPath, "utf-8");
        const data = JSON.parse(raw);
        cachedGraph = data;
        cachedMtime = stat.mtimeMs;
        return data;
    }
    catch {
        return null;
    }
}
function buildAdjacency(graph) {
    const adj = new Map();
    for (const node of graph.nodes) {
        adj.set(node.id, []);
    }
    for (const edge of graph.links) {
        const srcList = adj.get(edge.source);
        const tgtList = adj.get(edge.target);
        if (srcList)
            srcList.push({ target: edge.target, edge });
        if (tgtList)
            tgtList.push({ target: edge.source, edge });
    }
    return adj;
}
function findNodesByLabel(graph, term, limit = 3) {
    const lower = term.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    const scored = graph.nodes
        .map((n) => {
        const label = n.label.toLowerCase();
        const score = words.reduce((s, w) => s + (label.includes(w) ? 1 : 0), 0);
        return { node: n, score };
    })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.node);
}
// ── Public API ─────────────────────────────────────────────────────
export function checkGraphify(cwd) {
    const graphPath = getGraphPath(cwd);
    const reportPath = getReportPath(cwd);
    if (!fs.existsSync(graphPath)) {
        return { available: false, reason: "graphify-out/graph.json not found. Run `graphify .` first." };
    }
    const graph = loadGraph(cwd);
    if (!graph) {
        return { available: false, reason: "graph.json exists but could not be parsed." };
    }
    const communities = new Set(graph.nodes.map((n) => n.community).filter((c) => c !== undefined));
    return {
        available: true,
        graphPath,
        reportPath: fs.existsSync(reportPath) ? reportPath : undefined,
        nodeCount: graph.nodes.length,
        edgeCount: graph.links.length,
        communityCount: communities.size,
    };
}
export function queryGraph(cwd, question, mode = "bfs", budget = 2000) {
    const graph = loadGraph(cwd);
    if (!graph)
        return null;
    const startNodes = findNodesByLabel(graph, question, 3);
    if (startNodes.length === 0)
        return { mode, startNodes: [], nodes: [], edges: [] };
    const adj = buildAdjacency(graph);
    const visited = new Set();
    const subgraphEdges = [];
    if (mode === "dfs") {
        const stack = startNodes.map((n) => [n.id, 0]);
        while (stack.length > 0) {
            const [nodeId, depth] = stack.pop();
            if (visited.has(nodeId) || depth > 6)
                continue;
            visited.add(nodeId);
            for (const neighbor of adj.get(nodeId) || []) {
                if (!visited.has(neighbor.target)) {
                    stack.push([neighbor.target, depth + 1]);
                    subgraphEdges.push({
                        source: nodeId,
                        target: neighbor.target,
                        relation: neighbor.edge.relation,
                        confidence: neighbor.edge.confidence,
                    });
                }
            }
        }
    }
    else {
        let frontier = new Set(startNodes.map((n) => n.id));
        for (const id of frontier)
            visited.add(id);
        for (let i = 0; i < 3; i++) {
            const nextFrontier = new Set();
            for (const nId of frontier) {
                for (const neighbor of adj.get(nId) || []) {
                    if (!visited.has(neighbor.target)) {
                        visited.add(neighbor.target);
                        nextFrontier.add(neighbor.target);
                        subgraphEdges.push({
                            source: nId,
                            target: neighbor.target,
                            relation: neighbor.edge.relation,
                            confidence: neighbor.edge.confidence,
                        });
                    }
                }
            }
            frontier = nextFrontier;
        }
    }
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const resultNodes = Array.from(visited)
        .map((id) => nodeMap.get(id))
        .filter((n) => n !== undefined);
    // Relevance sort
    const terms = question.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
    resultNodes.sort((a, b) => {
        const scoreA = terms.reduce((s, t) => s + (a.label.toLowerCase().includes(t) ? 1 : 0), 0);
        const scoreB = terms.reduce((s, t) => s + (b.label.toLowerCase().includes(t) ? 1 : 0), 0);
        return scoreB - scoreA;
    });
    return { mode, startNodes: startNodes.map((n) => n.label), nodes: resultNodes, edges: subgraphEdges };
}
export function findPath(cwd, fromTerm, toTerm) {
    const graph = loadGraph(cwd);
    if (!graph)
        return null;
    const fromNodes = findNodesByLabel(graph, fromTerm, 1);
    const toNodes = findNodesByLabel(graph, toTerm, 1);
    if (fromNodes.length === 0 || toNodes.length === 0) {
        return { found: false, hops: 0, path: [] };
    }
    const src = fromNodes[0].id;
    const tgt = toNodes[0].id;
    const adj = buildAdjacency(graph);
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    // BFS shortest path
    const queue = [src];
    const visited = new Set([src]);
    const parent = new Map();
    while (queue.length > 0) {
        const current = queue.shift();
        if (current === tgt)
            break;
        for (const neighbor of adj.get(current) || []) {
            if (!visited.has(neighbor.target)) {
                visited.add(neighbor.target);
                parent.set(neighbor.target, { node: current, edge: neighbor.edge });
                queue.push(neighbor.target);
            }
        }
    }
    if (!parent.has(tgt) && src !== tgt) {
        return { found: false, hops: 0, path: [] };
    }
    // Reconstruct path
    const path = [];
    let current = tgt;
    while (current !== src) {
        const p = parent.get(current);
        if (!p)
            break;
        const node = nodeMap.get(current);
        if (node) {
            path.unshift({ node, edgeRelation: p.edge.relation, edgeConfidence: p.edge.confidence });
        }
        current = p.node;
    }
    const srcNode = nodeMap.get(src);
    if (srcNode)
        path.unshift({ node: srcNode });
    return { found: true, hops: path.length - 1, path };
}
export function explainNode(cwd, term) {
    const graph = loadGraph(cwd);
    if (!graph)
        return null;
    const matches = findNodesByLabel(graph, term, 1);
    if (matches.length === 0)
        return { node: null, connections: [] };
    const node = matches[0];
    const adj = buildAdjacency(graph);
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const connections = [];
    for (const neighbor of adj.get(node.id) || []) {
        const neighborNode = nodeMap.get(neighbor.target);
        if (neighborNode) {
            connections.push({
                label: neighborNode.label,
                relation: neighbor.edge.relation,
                confidence: neighbor.edge.confidence,
                sourceFile: neighborNode.source_file || "",
            });
        }
    }
    return { node, connections };
}
export function getGraphSummary(cwd) {
    const status = checkGraphify(cwd);
    if (!status.available)
        return null;
    const reportPath = getReportPath(cwd);
    if (!fs.existsSync(reportPath)) {
        return `Graphify is active (${status.nodeCount} nodes, ${status.edgeCount} edges, ${status.communityCount} communities).`;
    }
    try {
        const report = fs.readFileSync(reportPath, "utf-8");
        // Extract key sections
        const sections = [];
        // God Nodes
        const godMatch = report.match(/## God Nodes[\s\S]*?(?=## |$)/);
        if (godMatch)
            sections.push(godMatch[0].trim());
        // Surprising Connections
        const surpriseMatch = report.match(/## Surprising Connections[\s\S]*?(?=## |$)/);
        if (surpriseMatch)
            sections.push(surpriseMatch[0].trim());
        // Communities
        const commMatch = report.match(/## Communities[\s\S]*?(?=## |$)/);
        if (commMatch)
            sections.push(commMatch[0].trim());
        return sections.join("\n\n");
    }
    catch {
        return `Graphify is active (${status.nodeCount} nodes, ${status.edgeCount} edges, ${status.communityCount} communities).`;
    }
}
