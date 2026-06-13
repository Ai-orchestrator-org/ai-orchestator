# ADR-001: MCP as the Abstraction Layer for Task Storage

## Status: Accepted

## Context

The orchestrator needs to interact with task management systems (ClickUp, Jira, Linear, etc.). We need an abstraction that allows swapping task backends without changing application code.

## Decision

Use the **Model Context Protocol (MCP)** as the abstraction boundary. Instead of building per-vendor adapters (e.g., `clickup-adapter`, `jira-adapter`), we build a single `mcp-task-storage` library that communicates with any MCP-compatible task server via the MCP protocol.

The MCP server (e.g., ClickUp MCP) runs as a separate process and exposes tools like `create_task`, `update_task`, `get_task`. Our `mcp-task-storage` lib connects via StreamableHTTP transport, calls these tools, and parses the text responses back into domain types.

## Consequences

- **Positive**: Swapping task providers requires only changing the MCP server URL — zero code changes in the orchestrator
- **Positive**: MCP handles authentication, rate limiting, and API quirks at the server level
- **Positive**: We get access to any MCP-compatible tool server, not just task management
- **Negative**: MCP tool responses are text-based (not structured JSON), so we need response parsers per provider
- **Negative**: We depend on the MCP protocol staying stable and supported
- **Mitigation**: `tool-mappings.ts` maps abstract operations to concrete tool names per provider, and response parsers handle text → domain type conversion