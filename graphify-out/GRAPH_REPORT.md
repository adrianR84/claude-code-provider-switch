# Graph Report - claude-code-provider-switch  (2026-05-13)

## Corpus Check
- 31 files · ~27,094 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 508 nodes · 912 edges · 36 communities (28 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d2a68513`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]

## God Nodes (most connected - your core abstractions)
1. `log()` - 38 edges
2. `main()` - 23 edges
3. `loadEnvFile()` - 22 edges
4. `showInteractiveMenu()` - 18 edges
5. `updateConfigFile()` - 18 edges
6. `Model Cache` - 17 edges
7. `Configuration Module` - 16 edges
8. `ModelCache` - 15 edges
9. `launchOllama()` - 15 edges
10. `launchAnthropic()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Model Cache` --rationale_for--> `Dual-Tier Model Cache (Memory + Disk)`  [EXTRACTED]
  lib/cache.js → wiki/topics/core.md
- `modelCache Singleton` --conceptually_related_to--> `Model Cache`  [EXTRACTED]
  wiki/topics/core.md → lib/cache.js
- `Configuration Module` --conceptually_related_to--> `findBestMatchingModel Fuzzy Search`  [EXTRACTED]
  lib/config.js → wiki/topics/core.md
- `Configuration Module` --rationale_for--> `Merged Global + Local Config Pattern`  [EXTRACTED]
  lib/config.js → wiki/topics/core.md
- `Constants Module` --rationale_for--> `Single Provider Registry in constants.js`  [EXTRACTED]
  lib/constants.js → wiki/topics/core.md

## Hyperedges (group relationships)
- **Provider Authentication Flow** — loadEnvFile, getDefaultProvider, getProviderDefaultModel, NetworkError, AuthenticationError, findBestMatchingModel, lib_validation [EXTRACTED 1.00]
- **Provider Launch Architecture** — lib_openrouter, lib_anthropic, lib_ollama, lib_minimax, lib_default, showModelSelectionForProvider, showModelSelection_openrouter, showModelSelection_anthropic, showModelSelection_ollama, showModelSelection_minimax, findBestMatchingModel, lib_cache, lib_validation [EXTRACTED 1.00]
- **Error Class Hierarchy** — ProviderError, NetworkError, AuthenticationError, ValidationError, CacheError [EXTRACTED 1.00]
- **Provider Launcher Pattern** — launch_anthropic, launch_openrouter, launch_ollama, launch_minimax [EXTRACTED 1.00]
- **Shared showModelSelection TTY Pattern** — showmodelselection_openrouter, showmodelselection_anthropic, showmodelselection_ollama, virtual_scrolling_model_picker, raw_mode_readline_tui [EXTRACTED 1.00]
- **Core lib Shared Infrastructure** — lib_config, lib_cache, lib_errors, lib_validation, lib_constants [EXTRACTED 1.00]
- **graphify navigation rules** — graphify-out_GRAPH_REPORT, graphify-out_wiki_index, graphify_query_command, graphify_path_command, graphify_explain_command [EXTRACTED 1.00]
- **Provider topics** — topic_openrouter, topic_ollama, topic_minimax, topic_anthropic [EXTRACTED 1.00]
- **Project topics** — topic_core, topic_bin [EXTRACTED 1.00]

## Communities (36 total, 8 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.1
Nodes (67): {
  ENV_VARS,
  getAllProviderAliases,
  getProviderIdFromCommand,
}, exitGracefully(), {
  getDefaultProvider,
  getDefaultModel,
  getProviderDefaultModel,
}, handleCliMode(), handleError(), handlePostConfiguration(), { launchAnthropic }, { launchDefault } (+59 more)

### Community 1 - "Community 1"
Cohesion: 0.1
Nodes (47): AuthenticationError, CacheError, NetworkError, ProviderError, ValidationError, CLI Entry Point, bin/claude-switch.js CLI Entry Point, Dual-Tier Model Cache (Memory + Disk) (+39 more)

### Community 2 - "Community 2"
Cohesion: 0.04
Nodes (44): 🔧 Advanced Usage, Aliases, Basic Usage, Claude Code Provider Switcher, code:bash (npm install -g @anthropic-ai/claude-code), code:bash (claude-switch --continue           # Continue previous conve), code:bash (claude-switch clear-defaults), code:javascript (const {) (+36 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): 1. Purpose, 2. Architecture, 3. Talks To, 4. API Surface, 5. Data, 6. Key Decisions, 7. Gotchas, 8. Sources (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.11
Nodes (18): AuthenticationError, CacheError, ProviderError, ValidationError, validateHostname(), validateModelName(), validateModelResponse(), validatePort() (+10 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (23): API Surface, Architecture, Bearer auth is optional, Claude Code process, code:block2 (async showModelSelection(): Promise<string>), Data, Environment variables ([lib/constants.js](../lib/constants.js)), Fallback to minimax-m2.5:cloud (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (21): API Surface, Architecture, Cache, code:javascript (// lib/minimax.js), Configuration File, Constants (from `lib/constants.js`), Data, Disabling Non-Essential Traffic (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.12
Nodes (14): claudeDir, DEFAULT_VALUES, ENV_VARS, FILE_PATHS, homeDir, os, path, PROVIDER_ALIASES (+6 more)

### Community 8 - "Community 8"
Cohesion: 0.11
Nodes (18): Anthropic, API Key Management, code:bash (# API Keys for different providers), code:block8 (Configuration: Global (~/.claude/.claude-switch-env)), code:bash (# Launch interactive API key management), ⚙️ Configuration, Configuration Display, Environment Variables (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (17): 2026-04-20 Initial Compilation, 14 source files processed, graphify knowledge graph tool, GRAPH_REPORT.md, graphify output directory, wiki/index.md, graphify explain command, graphify path command (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.16
Nodes (12): { spawn }, spawnClaude(), winQuoteIfNeeded(), http, https, {
  log,
  loadEnvFile,
  findBestMatchingModel,
  promptForApiKey,
  updateConfigFile,
}, { modelCache }, { NetworkError, ValidationError } (+4 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (13): Anthropic Provider Integration, API Surface, Architecture, code:block1 (claude-switch (CLI entry)), Data, `fetchAnthropicModels(apiKey)`, Gotchas, Key Decisions (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (10): HTTP_STATUS, fs, { NetworkError, ValidationError }, {
  OLLAMA,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
}, path, runTests(), { spawn }, test() (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (11): fetchMinimaxModels(), https, {
  log,
  loadEnvFile,
  findBestMatchingModel,
  promptForApiKey,
  updateConfigFile,
}, {
  MINIMAX,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
  ENV_VARS,
  DEFAULT_VALUES,
  getProviderBaseUrl,
}, { modelCache }, {
  NetworkError,
  ValidationError,
  AuthenticationError,
}, showModelSelection(), { spawn } (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (12): API Surface, Architecture, Argument taxonomy, `bin/claude-switch.js` — CLI Entry Point, code:js (// Main router), Data, Gotchas, Internal function signatures (+4 more)

### Community 15 - "Community 15"
Cohesion: 0.15
Nodes (12): API Surface, Architecture, code:block1 (lib/openrouter.js          # Entry point — exports launchOpe), Data, Gotchas, Key Decisions, `launchOpenRouter(showModelMenu?, extraArgs?, directModel?)`, OpenRouter Provider (`lib/openrouter.js`) (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (9): NetworkError, https, {
  log,
  loadEnvFile,
  findBestMatchingModel,
  promptForApiKey,
  updateConfigFile,
}, { modelCache }, {
  NetworkError,
  ValidationError,
  AuthenticationError,
}, {
  OPENROUTER,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
  ENV_VARS,
  DEFAULT_VALUES,
  getProviderBaseUrl,
}, { spawn }, { spawnClaude } (+1 more)

### Community 18 - "Community 18"
Cohesion: 0.2
Nodes (9): {
  ANTHROPIC,
  CACHE,
  HTTP_STATUS,
  DEFAULT_MODELS,
  ENV_VARS,
  DEFAULT_VALUES,
  getProviderBaseUrl,
}, https, {
  log,
  loadEnvFile,
  promptForApiKey,
  updateConfigFile,
  findBestMatchingModel,
}, { modelCache }, {
  NetworkError,
  ValidationError,
  AuthenticationError,
}, { spawn }, { spawnClaude }, { validateAuthToken, validateModelResponse } (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (9): Common Tasks, Core Infrastructure, Cross-Cutting Concepts, Keeping the Wiki Current, Providers, Quick Start, Source Files, Topic Index (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.25
Nodes (6): fs, path, runTests(), { spawn }, test(), testConfig

### Community 21 - "Community 21"
Cohesion: 0.22
Nodes (8): Agent Configuration and Instructions, Agent Instructions, Critical Rules, Development Guidelines, Operating System, Project-Specific Notes, System Information, Terminal Environment

### Community 22 - "Community 22"
Cohesion: 0.29
Nodes (6): { CACHE }, CACHE_DIR, fs, { log }, path, CACHE

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (7): findBestMatchingModel, showModelSelectionForProvider, showModelSelection (Anthropic), showModelSelection (Minimax), showModelSelection (Ollama), showModelSelection (OpenRouter), showProviderMenu

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (5): Claude Code Provider Switcher — Wiki, Concepts, Core, Providers, Topics

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (5): Article Section Template, Concept Registry, Source File Patterns, Topic Registry, Wiki Schema

### Community 26 - "Community 26"
Cohesion: 0.4
Nodes (3): path, { spawn }, testFiles

### Community 27 - "Community 27"
Cohesion: 0.4
Nodes (4): 2026-04-20 — Initial compilation, Compilation Log, Concepts, Topics

## Knowledge Gaps
- **258 isolated node(s):** `{
  showProviderMenu,
  showUsage,
  showDefaults,
  setupDefaults,
  showModelSelectionForProvider,
}`, `{ launchOpenRouter }`, `{ launchAnthropic }`, `{ launchOllama }`, `{ launchMinimax }` (+253 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Claude Code Provider Switcher` connect `Community 2` to `Community 8`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `log()` connect `Community 0` to `Community 7`, `Community 10`, `Community 13`, `Community 16`, `Community 17`, `Community 18`, `Community 22`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `ModelCache` connect `Community 16` to `Community 10`, `Community 13`, `Community 17`, `Community 18`, `Community 22`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `{
  showProviderMenu,
  showUsage,
  showDefaults,
  setupDefaults,
  showModelSelectionForProvider,
}`, `{ launchOpenRouter }`, `{ launchAnthropic }` to the rest of the system?**
  _258 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._