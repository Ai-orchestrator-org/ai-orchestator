# AI Orchestrator — Project Guide

## Architecture

Nx monorepo with NestJS. Six interfaces behind DI. MCP protocol for task storage. OpenCode SDK for agent management.

## Interfaces

| Interface | Injection Token | Implementation |
|-----------|----------------|----------------|
| `ITaskStorage` | `TASK_STORAGE` | `McpTaskStorageService` |
| `IAgentProvider` | `AGENT_PROVIDER` | `OpencodeAdapterService` |
| `IContextDB` | `CONTEXT_DB` | `FileContextDbService` |
| `IEventBus` | `EVENT_BUS` | `NestEventBusService` |
| `ITestRunner` | `TEST_RUNNER` | `ShellTestRunnerService` |
| `IPRProvider` | `PR_PROVIDER` | `GhPrProviderService` |

## Directory Layout

```
apps/orchestrator-server/   # NestJS bootstrap + composition root (port 3001)
libs/shared/                # Types, constants, events (no DI)
libs/core-interfaces/       # 6 interfaces + Symbol injection tokens
libs/file-context-db/       # IContextDB → atomic JSON file writes
libs/nest-event-bus/        # IEventBus → EventEmitter2 wrapper
libs/mcp-task-storage/      # ITaskStorage → MCP client with tool-mappings
libs/opencode-adapter/      # IAgentProvider → OpenCode SDK
libs/shell-test-runner/     # ITestRunner → shell command execution
libs/gh-pr-provider/        # IPRProvider → GitHub CLI
libs/orchestrator/          # State machine + scheduling + coordination
context/orchestration/      # JSON state files (config, schedule, sessions)
```

## Commands

```bash
pnpm build                  # Build orchestrator-server
pnpm serve                  # Start orchestrator-server
pnpm test                   # Run all tests
nx build <lib>              # Build specific lib
nx test <lib>               # Test specific lib
nx serve orchestrator-server # Dev mode with hot reload
```

## Key Design Decisions

- MCP is the plugin system — swap task providers by changing MCP server URL
- OpenCode SDK replaces Golang fork/watcher services
- File-based JSON context DB (not Postgres)
- No TypeScript `enum` — use `as const` + `typeof`
- `ConfigService.getOrThrow()` for env vars — never `process.env`
- Conventional Commits: `type(scope): description`

## Ports

- 3001: Orchestrator Server
- 3000: ClickUp MCP (external, git submodule)
- 4096: OpenCode Server (external)

## ClickUp Workspace (from context.json)

- Team: `90121493812`
- Space: `90126401093`
- Folder: `90129476393`

## ADRs

See `docs/adr/` for architecture decision records.