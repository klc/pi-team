# Graph Report - .  (2026-05-10)

## Corpus Check
- Corpus is ~19,650 words - fits in a single context window. You may not need a graph.

## Summary
- 122 nodes · 178 edges · 18 communities (8 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 6% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.76)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Extension Core & Types|Extension Core & Types]]
- [[_COMMUNITY_Orchestrator Components|Orchestrator Components]]
- [[_COMMUNITY_Model Picker Helpers|Model Picker Helpers]]
- [[_COMMUNITY_Project Analysis Tools|Project Analysis Tools]]
- [[_COMMUNITY_Developer Agents & Skills|Developer Agents & Skills]]
- [[_COMMUNITY_Model Picker UI|Model Picker UI]]
- [[_COMMUNITY_Agent Registry|Agent Registry]]
- [[_COMMUNITY_Quality Assurance & Review|Quality Assurance & Review]]
- [[_COMMUNITY_Planning & Architecture|Planning & Architecture]]
- [[_COMMUNITY_Plan Execution Engine|Plan Execution Engine]]
- [[_COMMUNITY_Debugging & Testing|Debugging & Testing]]
- [[_COMMUNITY_List Command|List Command]]
- [[_COMMUNITY_Run Command|Run Command]]
- [[_COMMUNITY_Plan Command|Plan Command]]
- [[_COMMUNITY_Init Prompt|Init Prompt]]
- [[_COMMUNITY_Research Agent|Research Agent]]
- [[_COMMUNITY_Design Agent|Design Agent]]
- [[_COMMUNITY_Review Protocol|Review Protocol]]

## God Nodes (most connected - your core abstractions)
1. `AgentModelPicker` - 11 edges
2. `AgentRegistry` - 11 edges
3. `Pi Multi-Agent Orchestrator Extension` - 9 edges
4. `frontend-lead Agent` - 9 edges
5. `backend-lead Agent` - 8 edges
6. `Coding Standards Skill` - 7 edges
7. `reviewer Agent` - 7 edges
8. `Orchestrator` - 6 edges
9. `Verification Before Completion Skill` - 6 edges
10. `execute()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `Pi Multi-Agent Orchestrator Extension` --references--> `Custom Agent Markdown Format`  [INFERRED]
  extensions/multi-agent/index.ts → README.md
- `complexity_score Tool` --conceptually_related_to--> `reviewer Agent`  [INFERRED]
  extensions/multi-agent/project-tools.ts → agents/reviewer.md
- `stack_detect Tool` --conceptually_related_to--> `Project Stack Template Skill`  [INFERRED]
  extensions/multi-agent/project-tools.ts → skills/project-stack-template/SKILL.md
- `complexity_score Tool` --conceptually_related_to--> `performance-analyst Agent`  [INFERRED]
  extensions/multi-agent/project-tools.ts → agents/performance-analyst.md
- `AgentRegistry` --reads--> `Agent Frontmatter Schema (name, description, allowed-tools, model)`  [EXTRACTED]
  extensions/multi-agent/registry.ts → agents/architect.md

## Hyperedges (group relationships)
- **Backend Delivery Cycle** — agent_backend_lead, agent_senior_backend, agent_junior_backend, agent_reviewer, agent_tester [EXTRACTED 1.00]
- **Frontend Delivery Cycle** — agent_frontend_lead, agent_senior_frontend, agent_junior_frontend, agent_reviewer, agent_seo_auditor, agent_tester [EXTRACTED 1.00]
- **TDD Governance Triangle** — tdd_principle, skill_coding_standards, verification_protocol [INFERRED 0.85]

## Communities (18 total, 10 thin omitted)

### Community 0 - "Extension Core & Types"
Cohesion: 0.16
Nodes (16): runAgent(), agent, availableAgents, BUILTIN_AGENTS_DIR, execute(), formatAgentList(), formatResult(), formatted (+8 more)

### Community 1 - "Orchestrator Components"
Cohesion: 0.19
Nodes (14): Agent Frontmatter Schema (name, description, allowed-tools, model), AgentModelPicker, performance-analyst Agent, AgentRegistry, AgentRunner, complexity_score Tool, Custom Agent Markdown Format, delegate_task Tool (+6 more)

### Community 2 - "Model Picker Helpers"
Cohesion: 0.19
Nodes (11): AgentInfo, agents, BUILTIN_AGENTS_DIR, getAgentsDir(), listAgents(), listAgentsFromDir(), models, picker (+3 more)

### Community 3 - "Project Analysis Tools"
Cohesion: 0.2
Nodes (8): analyzeFile(), analyzeFileRaw(), Detection, FileAnalysis, FunctionAnalysis, registerComplexityScoreTool(), registerStackDetectTool(), SUPPORTED_EXTENSIONS

### Community 4 - "Developer Agents & Skills"
Cohesion: 0.33
Nodes (11): coder Agent, junior-backend Agent, junior-frontend Agent, senior-backend Agent, senior-frontend Agent, Coding Standards Skill, Receiving Code Review Skill, Verification Before Completion Skill (+3 more)

### Community 7 - "Quality Assurance & Review"
Cohesion: 0.29
Nodes (8): frontend-lead Agent, reviewer Agent, security-auditor Agent, seo-auditor Agent, OWASP Top 10 Coverage, Review Prompt Template, SEO/GEO Audit Dimensions, Review Severity Levels (Blocker/Required/Suggestion)

### Community 8 - "Planning & Architecture"
Cohesion: 0.29
Nodes (8): Architecture Decision Record (ADR) Format, architect Agent, backend-lead Agent, project-manager Agent, Complexity Assessment Matrix, Critical Decision Protocol, Brainstorm Prompt Template, New-Feature Prompt Template

### Community 10 - "Debugging & Testing"
Cohesion: 0.5
Nodes (4): debugger Agent, tester Agent, Bugfix Prompt Template, Systematic Debugging Skill

## Knowledge Gaps
- **39 isolated node(s):** `BUILTIN_AGENTS_DIR`, `AgentInfo`, `PickerMode`, `agents`, `models` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AgentModelPicker` connect `Model Picker UI` to `Model Picker Helpers`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **Why does `reviewer Agent` connect `Quality Assurance & Review` to `Planning & Architecture`, `Orchestrator Components`, `Debugging & Testing`, `Developer Agents & Skills`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `AgentRegistry` connect `Agent Registry` to `Extension Core & Types`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **What connects `BUILTIN_AGENTS_DIR`, `AgentInfo`, `PickerMode` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._