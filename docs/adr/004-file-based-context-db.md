# ADR-004: File-Based JSON Context Database

## Status: Accepted

## Context

The orchestrator needs persistent storage for:
- Orchestration configuration (team IDs, space IDs, folder IDs)
- Scheduling state (which tasks are pending, in-progress, etc.)
- Agent session tracking (which agent is working on which task)
- Agent continuity files (context for session resumption)

## Decision

Use **file-based JSON storage** in the `context/orchestration/` directory. Each concern is a separate JSON file:
- `config.json` — ClickUp workspace configuration
- `schedule.json` — Task scheduling state
- `task-sessions.json` — Agent session → task mappings

The `IContextDB` interface provides atomic read/write operations with file locking.

## Consequences

- **Positive**: Zero infrastructure dependency — no database server to manage
- **Positive**: Human-readable and git-trackable — easy debugging and version control
- **Positive**: Simple backup — copy the directory
- **Negative**: Not suitable for concurrent writes from multiple orchestrator instances
- **Negative**: No query capabilities beyond full file read
- **Mitigation**: The orchestrator is designed as a single-instance service. If multi-instance is needed later, the `IContextDB` interface allows a Postgres/Redis implementation to be swapped in without code changes