# AI Orchestrator — Architecture

## Overview

The AI Orchestrator transforms Product Requirement Documents (PRDs) into ClickUp tasks, spawns AI coding agents via OpenCode SDK, monitors progress, validates results, and creates pull requests — all orchestrated through a NestJS application with interface-driven dependency injection.

## Data Flow

```
PRD Input → Orchestrator → ClickUp (via MCP) → Agent (via OpenCode SDK)
                ↑                                    ↓
                └────── Review ← Test/Validate ←───┘
                        ↓
                   Create PR (via GitHub CLI)
```

## Component Responsibilities

| Component | Interface | Implementation | Purpose |
|-----------|-----------|---------------|---------|
| Task Storage | `ITaskStorage` | `mcp-task-storage` | CRUD operations on tasks via MCP protocol |
| Agent Provider | `IAgentProvider` | `opencode-adapter` | Create, prompt, monitor, abort agent sessions |
| Context DB | `IContextDB` | `file-context-db` | Persistent state (config, schedule, sessions) |
| Event Bus | `IEventBus` | `nest-event-bus` | Publish/subscribe for cross-module events |
| Test Runner | `ITestRunner` | `shell-test-runner` | Execute test commands and capture results |
| PR Provider | `IPRProvider` | `gh-pr-provider` | Create and manage GitHub pull requests |
| Orchestrator | — | `orchestrator` | State machine, scheduling, coordination logic |

## Task State Machine

```
pending → ready → in_progress → completed → approved → pr_created → done
  │         │         │            │           │
  │         │         │            └→ needs_revision
  │         │         └→ needs_intervention
  │         └→ blocked
  └→ blocked
```

## Key Design Decisions

1. **MCP is the plugin system** — swap ClickUp → Jira by changing MCP server URL (ADR-001)
2. **OpenCode SDK replaces Golang services** — single TypeScript stack (ADR-002)
3. **Interface-driven DI** — swap any implementation by changing DI registration (ADR-003)
4. **File-based context DB** — zero infra, human-readable (ADR-004)

## Ports

| Service | Port |
|---------|------|
| Orchestrator Server | 3001 |
| ClickUp MCP | 3000 |
| OpenCode Server | 4096 |

## Directory Structure

```
apps/
  orchestrator-server/    # NestJS app (composition root)
libs/
  shared/                 # Types, constants, events
  core-interfaces/        # 6 interfaces + DI injection tokens
  file-context-db/        # IContextDB → JSON files
  nest-event-bus/         # IEventBus → EventEmitter2
  mcp-task-storage/        # ITaskStorage → MCP client
  opencode-adapter/        # IAgentProvider → OpenCode SDK
  shell-test-runner/       # ITestRunner → shell
  gh-pr-provider/          # IPRProvider → GitHub CLI
  orchestrator/            # State machine + coordination
context/
  orchestration/          # JSON state files
  agents/                  # Agent continuity files
```