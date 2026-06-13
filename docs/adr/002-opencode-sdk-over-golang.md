# ADR-002: OpenCode SDK over Golang Fork/Watcher Services

## Status: Accepted

## Context

The orchestrator needs to spawn and manage AI coding agent sessions. The original design called for separate Golang services (fork-service, watcher-service) to manage agent processes.

## Decision

Use the **OpenCode SDK** (`@opencode-ai/sdk`) for all agent session management. The SDK provides:
- Session creation and lifecycle management
- Prompt sending and response handling
- Session abort/stop
- Diff retrieval for code changes
- Permission management
- Event streaming

This replaces the need for Golang fork-service and watcher-service entirely.

## Consequences

- **Positive**: Single language stack (TypeScript/NestJS) — no Golang runtime dependency
- **Positive**: SDK is purpose-built for agent interaction — eliminates custom process management
- **Positive**: Simpler deployment — one Node.js process instead of three separate services
- **Negative**: Tied to OpenCode SDK API stability
- **Negative**: Less control over process-level details compared to a fork-based approach
- **Mitigation**: The `IAgentProvider` interface isolates the SDK dependency; if needed, a different provider can be swapped in