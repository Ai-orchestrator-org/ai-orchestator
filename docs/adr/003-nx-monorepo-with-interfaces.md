# ADR-003: Nx Monorepo with Interface-Driven DI

## Status: Accepted

## Context

The orchestrator has multiple components (task storage, agent management, context DB, event bus, test runner, PR provider) that need to be composed together. We need a project structure that supports clear module boundaries, dependency injection, and testability.

## Decision

Use **Nx monorepo** with **NestJS Dependency Injection** and **interface-driven architecture**. Each component is a separate Nx library with:
- An interface (`ITaskStorage`, `IAgentProvider`, etc.) defining the contract
- A Symbol injection token for DI registration
- One or more implementations registered via NestJS module providers

The composition root (`apps/orchestrator-server`) wires everything together.

Library structure:
```
libs/
├── shared/              # Types, constants, events (no DI, pure TS)
├── core-interfaces/     # All 6 interfaces + injection tokens
├── file-context-db/     # IContextDB → JSON file implementation
├── nest-event-bus/      # IEventBus → EventEmitter2 wrapper
├── mcp-task-storage/    # ITaskStorage → MCP client implementation
├── opencode-adapter/    # IAgentProvider → OpenCode SDK wrapper
├── shell-test-runner/   # ITestRunner → shell command execution
├── gh-pr-provider/      # IPRProvider → GitHub CLI wrapper
└── orchestrator/        # Orchestration logic (state machine, scheduling)
apps/
└── orchestrator-server/  # NestJS bootstrap + composition root
```

## Consequences

- **Positive**: Any implementation can be swapped by changing the DI registration — zero coupling to concrete classes
- **Positive**: Nx enforces module boundaries via eslint rules and dependency constraints
- **Positive**: Each lib can be independently tested and built
- **Positive**: Single pnpm workspace — no duplicate dependencies
- **Negative**: Nx adds configuration complexity (project.json, nx.json per lib)
- **Negative**: More files than a single-app structure
- **Mitigation**: The interface layer is thin and consistent; the payoff in testability and swapability justifies the file count