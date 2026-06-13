# AI Orchestrator — Conventions

## Git Commits
- Conventional Commits format: `type(scope): description`
- `git add -A` before each commit
- Small atomic commits per logical change

## TypeScript
- Strict mode enabled
- No `enum` — use `as const` + `typeof`
- No `any` without a comment explaining why
- Interfaces prefixed with `I` (e.g., `ITaskStorage`, `IAgentProvider`)
- Injection tokens as `Symbol` constants

## NestJS
- Module-per-feature pattern
- Expose `*Module` and `*Service` via module exports
- Use `@Injectable()` for all providers
- Use `@Inject(TOKEN)` for interface-based injection
- `ConfigService.getOrThrow()` for env vars — never `process.env`

## Project Structure
- Nx monorepo with `libs/` and `apps/`
- Import paths: `@ai-orchestrator/<lib-name>`
- Each lib has `src/lib/` with `index.ts` barrel

## Testing
- Jest for all libs and apps
- Unit tests co-located with source (`.spec.ts`)
- E2E tests in `test/` directories
- All implementations must have at least one integration test

## Naming
- Libraries: kebab-case (`mcp-task-storage`, `file-context-db`)
- Classes: PascalCase (`McpTaskStorageService`, `FileContextDbService`)
- Files: kebab-case (`mcp-task-storage.service.ts`)
- Interfaces: `I` prefix (`ITaskStorage`)
- Injection tokens: `SCREAMING_SNAKE` (`TASK_STORAGE`, `AGENT_PROVIDER`)

## Ports
- Orchestrator: 3001
- ClickUp MCP: 3000
- OpenCode: 4096