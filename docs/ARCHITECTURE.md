# AI Orchestrator — Architecture Reference

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     orchestrator-server (port 3001)              │
│                     NestJS App — Composition Root               │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │  AppController    │  │  TaskController   │  │ Orchestration │  │
│  │  GET /            │  │  POST/GET/PATCH   │  │ Controller    │  │
│  │  GET /health      │  │  /api/tasks/*     │  │ /api/orch/*  │  │
│  │  GET /api/status  │  │                    │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────┬────────┘  │
│                                                      │           │
│  ┌───────────────────────────────────────────────────┘           │
│  │                                                                │
│  │  ┌─────────────────────────────────────────────────────────┐  │
│  │  │              OrchestratorModule                          │  │
│  │  │  ┌──────────────────┐   ┌──────────────────────────┐   │  │
│  │  │  │ OrchestratorService│   │  TaskLifecycleService      │   │  │
│  │  │  │ (thin facade)      │──▶│  (runtime engine)         │   │  │
│  │  │  └──────────────────┘   │                              │   │  │
│  │  │                          │  • startTask()              │   │  │
│  │  │                          │  • reviewTask()              │   │  │
│  │  │                          │  • approveTask()             │   │  │
│  │  │                          │  • createPRForTask()         │   │  │
│  │  │                          │  • enqueueTasks()            │   │  │
│  │  │                          │  • dequeueNextTask()          │   │  │
│  │  │                          │  • runSerialPipeline()       │   │  │
│  │  │                          │  • handleAgentEvent()       │   │  │
│  │  │                          └──────────┬───────────────┘   │  │
│  │  │                                     │                   │  │
│  │  │  ┌──────────────────┐               │                   │  │
│  │  │  │   state-machine   │◀────────────┘                   │  │
│  │  │  │   transitionTask()│   canTransition()               │  │
│  │  │  │   getNextStates() │   getTransitionEvent()         │  │
│  │  │  └──────────────────┘   InvalidTransitionError         │  │
│  │  └─────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┼───────────────┐                  │
│              │               │               │                  │
│              ▼               ▼               ▼                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │   6 DI Tokens │ │   6 Adapters  │ │   @Global() │           │
│  │  (interfaces)  │ │  (impls)      │ │   modules    │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ TASK_STORAGE  │ │ McpTask-     │ │ McpTask-     │           │
│  │  ITaskStorage │ │ Storage-     │ │ Storage-     │           │
│  │               │ │ Service      │ │ Module       │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ AGENT_PROVIDER│ │ Opencode-    │ │ Opencode-    │           │
│  │ IAgentProvider│ │ Adapter-     │ │ Adapter-     │           │
│  │               │ │ Service      │ │ Module       │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ CONTEXT_DB   │ │ FileContext- │ │ FileContext- │           │
│  │ IContextDB   │ │ DbService    │ │ DbModule     │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ EVENT_BUS    │ │ NestEventBus-│ │ NestEventBus-│           │
│  │ IEventBus    │ │ Service      │ │ Module       │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ TEST_RUNNER  │ │ ShellTest-  │ │ ShellTest-   │           │
│  │ ITestRunner  │ │ RunnerSvc    │ │ RunnerModule │           │
│  ├──────────────┤ ├──────────────┤ ├──────────────┤           │
│  │ PR_PROVIDER  │ │ GhPrProvider-│ │ GhPrProvider-│           │
│  │ IPRProvider  │ │ Service      │ │ Module       │           │
│  └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                   libs/shared                            │    │
│  │  TaskStatus  │  AgentStatus  │  OpenCodeSessionStatus   │    │
│  │  TaskPriority │  Types (TaskResult, ScheduleEntry, etc) │    │
│  │  Events (TaskCreated, AgentSessionCompleted, etc)       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘

        │                    │                    │
        │ HTTP/MCP           │ SSE/HTTP           │ CLI
        ▼                    ▼                    ▼
┌───────────────┐  ┌─────────────────┐  ┌──────────────────┐
│ ClickUp MCP   │  │ OpenCode Server │  │ GitHub (gh CLI)  │
│ port 3000     │  │ port 4096       │  │                  │
│               │  │                 │  │                  │
│ Task CRUD     │  │ Agent sessions  │  │ PR create/merge │
│ via MCP tools │  │ SSE events      │  │ via `gh` CLI    │
└───────────────┘  └─────────────────┘  └──────────────────┘
```

## Component Responsibilities

| Component | Library | Responsibility |
|-----------|---------|---------------|
| **ITaskStorage** → `McpTaskStorageService` | `libs/mcp-task-storage` | Task CRUD via ClickUp MCP protocol. Creates, reads, updates, deletes tasks through an MCP server. Dynamic ESM import of `@modelcontextprotocol/sdk`. Retry/backoff (3 attempts, 5s delay). Graceful degradation if MCP is down. |
| **IAgentProvider** → `OpencodeAdapterService` | `libs/opencode-adapter` | Manages AI agent sessions via `@opencode-ai/sdk`. Creates sessions, sends prompts, gets diffs, grants permissions, subscribes to SSE events. ESM-only SDK loaded via dynamic `import()`. |
| **IContextDB** → `FileContextDbService` | `libs/file-context-db` | Persists orchestration state as JSON files in `context/orchestration/`. Manages `config.json`, `schedule.json`, `task-sessions.json`. Synchronous reads, atomic-ish writes. |
| **IEventBus** → `NestEventBusService` | `libs/nest-event-bus` | In-process event bus wrapping NestJS `EventEmitter2`. Used for state transition events, task lifecycle signals. |
| **ITestRunner** → `ShellTestRunnerService` | `libs/shell-test-runner` | Runs shell commands (e.g. `make test`, `pnpm test`). Returns exit code, stdout, stderr, duration. |
| **IPRProvider** → `GhPrProviderService` | `libs/gh-pr-provider` | Creates/lists/merges PRs via `gh` CLI. |
| **OrchestratorModule** | `libs/orchestrator` | State machine + task lifecycle. The brain of the system. See below. |
| **shared** | `libs/shared` | Pure types/constants/events. No DI, no NestJS. The lingua franca between all libs. |

## The Brain: libs/orchestrator

### `state-machine.ts` — Declarative transitions

Pure function library. No DI. No side effects.

```
Pending ──task.decomposed──▶ Ready
Pending ──task.dependencies_unmet──▶ Blocked
Ready ──task.agent_assigned──▶ InProgress
Ready ──task.blocked──▶ Blocked
InProgress ──task.completed──▶ Completed
InProgress ──task.agent_failed──▶ NeedsIntervention
Completed ──task.review_approved──▶ Approved
Completed ──task.review_rejected──▶ NeedsRevision
NeedsRevision ──task.rework_started──▶ InProgress
Approved ──task.pr_created──▶ PrCreated
PrCreated ──task.pr_merged──▶ Done
NeedsIntervention ──task.agent_restarted──▶ InProgress
NeedsIntervention ──task.manual_block──▶ Blocked
Blocked ──task.unblocked──▶ Ready
```

Exports:
- `canTransition(from, to)` — boolean guard
- `getNextStates(current)` — possible destinations
- `getTransitionEvent(from, to)` — event name for a transition
- `transitionTask(taskId, from, to)` — validates + returns `TransitionResult` or throws `InvalidTransitionError`

### `TaskLifecycleService` — Runtime engine

The only stateful orchestrator component. Manages:
- **Serial execution** — `processing` flag + `activeTaskId` ensures one task at a time
- **SSE subscription** — `onModuleInit` subscribes to `IAgentProvider.onSessionEvent()` for real-time agent updates
- **Auto-pilot pipeline** — agent completes → auto-review → auto-approve → auto-PR

Key methods and what they do:

| Method | What happens |
|--------|-------------|
| `startTask(taskId)` | Validates transition, creates OpenCode session, transitions `Ready→InProgress`, updates schedule + context DB, sets `processing=true` |
| `reviewTask(taskId)` | Runs `ITestRunner.run()`, auto-transitions: `InProgress→Completed→Approved` (pass) or `InProgress→Completed→NeedsRevision` (fail) |
| `approveTask(taskId)` | Validates + transitions `Completed→Approved`, then auto-calls `createPRForTask()` |
| `createPRForTask(taskId)` | Gets diff from agent, creates PR via `IPRProvider`, transitions `Approved→PrCreated` |
| `enqueueTasks(listId)` | Fetches tasks from MCP, creates `ScheduleEntry` for each new task |
| `dequeueNextTask()` | Finds next pending schedule entry with retries left, calls `startTask()` |
| `runSerialPipeline()` | Entry point for the pipeline — calls `dequeueNextTask()` |
| `handleAgentEvent(event)` | Routes SSE events: `session.diff` → review, `session.error` → fail+retry, `permission.updated` → auto-approve |
| `handleAgentCompleted(taskId)` | Calls `reviewTask()` |
| `handleAgentFailed(taskId)` | Increments retry count. If under max, re-enqueues. If over, marks `NeedsIntervention`. |
| `handlePermissionRequest(event)` | Auto-approves all permissions with `grantPermission(sessionId, permissionId, 'always')` |
| `advanceTask(taskId, newStatus)` | Universal transition helper. Validates, updates task + context DB, emits event, chains: `Approved→createPRForTask()`, terminal states clear `processing` flag |

### `OrchestratorService` — Thin facade

Delegates every method to `TaskLifecycleService`. Exists as a stable public API. Don't add logic here — put it in `TaskLifecycleService`.

## Data Flow: Happy Path

```
1. User → POST /api/orchestration/enqueue {listId}
   │
   ▼
2. enqueueTasks(listId)
   │  McpTaskStorage.listTasks(listId) → ClickUp tasks
   │  FileContextDb.addScheduleEntry() → schedule.json updated
   ▼
3. User → POST /api/orchestration/run
   │
   ▼
4. runSerialPipeline() → dequeueNextTask() → startTask(taskId)
   │  taskStorage.getTask(taskId) → task from ClickUp
   │  transitionTask(taskId, Ready, InProgress)
   │  agentProvider.createSession({taskId, prompt}) → OpenCode session
   │  taskStorage.updateTask(taskId, {status: InProgress})
   │  contextDb.addTaskSession() → task-sessions.json
   │  eventBus.emit('task.agent_assigned', {...})
   │  processing = true, activeTaskId = taskId
   ▼
5. Agent works... SSE events stream in
   │  session.diff → handleAgentCompleted(taskId)
   │  permission.updated → handlePermissionRequest() → auto-approve
   ▼
6. reviewTask(taskId)
   │  testRunner.run({command: 'make test', workingDirectory: ...})
   │  if passed: advanceTask(InProgress→Completed) → advanceTask(Completed→Approved) → createPRForTask()
   │  if failed: advanceTask(InProgress→Completed) → advanceTask(Completed→NeedsRevision)
   ▼
7. createPRForTask(taskId)
   │  agentProvider.getDiff(sessionId) → diff
   │  prProvider.createPullRequest({title, body, head, base})
   │  advanceTask(Approved→PrCreated)
   │  processing = false, activeTaskId = null
   ▼
8. Pipeline complete. dequeueNextTask() picks up next task.
```

## Data Flow: Failure Path

```
Agent fails → SSE session.error event
  │
  ▼
handleAgentFailed(taskId)
  │  increment retryCount in schedule
  │  if retryCount < maxRetries (3):
  │    clear agentSessionId, processing=false, dequeueNextTask()
  │  if retryCount >= maxRetries:
  │    advanceTask(InProgress→NeedsIntervention), processing=false
```

## Persistence: File-Based JSON

```
context/orchestration/
  config.json          ← OrchestrationConfig (ClickUp IDs, URLs, ports)
  schedule.json        ← ScheduleEntry[] (task queue: taskId, retryCount, maxRetries, agentSessionId)
  task-sessions.json   ← AgentTaskMapping[] (taskId→agentSessionId, status, timestamps)
```

Every `TaskLifecycleService` method updates these files via `FileContextDbService`. This is **not production-grade persistence** — it's meant for single-instance, low-throughput use. For M4+ you'd swap `IContextDB` for a Postgres implementation.

## REST API Reference

```
GET  /                           → App info
GET  /health                     → Health check
GET  /api/status                 → MCP + OpenCode connection status

POST /api/tasks                  → Create task (→ ClickUp via MCP)
GET  /api/tasks?listId=          → List tasks
GET  /api/tasks/:id              → Get task
PATCH /api/tasks/:id             → Update task
DELETE /api/tasks/:id            → Delete task
GET  /api/tasks/tools            → List MCP tools

POST /api/orchestration/start/:id     → Start a specific task
POST /api/orchestration/review/:id    → Trigger review (run tests)
POST /api/orchestration/approve/:id   → Approve completed task
POST /api/orchestration/pr/:id        → Create PR for task
POST /api/orchestration/enqueue       → Enqueue tasks from ClickUp list
POST /api/orchestration/run?listId=   → Start serial pipeline
GET  /api/orchestration/status        → Orchestration status
```

## Configuration: .env

```env
MCP_SERVER_URL=http://localhost:3000/mcp     # ClickUp MCP server
OPENCODE_SERVER_URL=http://localhost:4096    # OpenCode agent server
OPENCODE_DIRECTORY=                           # Project dir (uses cwd if empty)
ORCHESTRATOR_PORT=3001                        # This server's port
CONTEXT_BASE_DIR=context/orchestration         # JSON state files directory
```

## Folder Structure

```
ai-orchestrator/
│
├── apps/
│   └── orchestrator-server/        ← NestJS app entry point (composition root)
│       └── src/
│           main.ts                 Bootstrap: NestFactory.create(AppModule), port 3001
│           app.module.ts           Wires ALL adapter modules + OrchestratorModule
│           app.controller.ts        GET /, GET /health, GET /api/status
│           app.service.ts           Health/status checks (MCP + OpenCode connectivity)
│           task.controller.ts       REST CRUD for tasks (delegates to ITaskStorage via MCP)
│           orchestration.controller.ts  Lifecycle API: start/review/approve/pr/enqueue/run/status
│
├── libs/
│   │
│   ├── core-interfaces/            ← THE CONTRACT LAYER — 6 interfaces + Symbol tokens
│   │   └── src/lib/
│   │       task-storage.interface.ts   ITaskStorage + TASK_STORAGE symbol
│   │       agent-provider.interface.ts IAgentProvider + AGENT_PROVIDER symbol + AgentSessionEvent types
│   │       context-db.interface.ts     IContextDB + CONTEXT_DB symbol
│   │       event-bus.interface.ts     IEventBus + EVENT_BUS symbol
│   │       test-runner.interface.ts    ITestRunner + TEST_RUNNER symbol
│   │       pr-provider.interface.ts   IPRProvider + PR_PROVIDER symbol
│   │       index.ts                    Barrel re-export
│   │
│   ├── shared/                     ← PURE TYPES — no DI, no NestJS, no side effects
│   │   └── src/lib/
│   │       constants.ts            TaskStatus, AgentStatus, TaskPriority, OpenCodeSessionStatus (as const)
│   │       types.ts                All interfaces: TaskResult, ScheduleEntry, AgentTaskMapping, etc.
│   │       events.ts               Event classes: TaskCreatedEvent, AgentSessionCompletedEvent, etc.
│   │       index.ts                Barrel re-export
│   │
│   ├── mcp-task-storage/           ← ITaskStorage implementation — talks to ClickUp via MCP protocol
│   │   └── src/lib/
│   │       mcp-task-storage.service.ts   Dynamic import of @modelcontextprotocol/sdk, StreamableHTTP transport
│   │       mcp-task-storage.module.ts     @Global() module, provides TASK_STORAGE token
│   │       tool-mappings.ts              Maps ITaskStorage methods → ClickUp MCP tool names
│   │       response-parsers.ts           Parses MCP JSON responses → TaskResult objects
│   │       mcp-task-storage.service.spec.ts
│   │
│   ├── opencode-adapter/           ← IAgentProvider implementation — talks to OpenCode SDK
│   │   └── src/lib/
│   │       opencode-adapter.service.ts   Dynamic import of @opencode-ai/sdk, session CRUD, SSE subscription
│   │       opencode-adapter.module.ts    @Global() module, provides AGENT_PROVIDER token
│   │       event-mapper.ts              Maps raw OpenCode SSE → AgentSessionEvent with mappedStatus
│   │       __mocks__/opencode-sdk.ts    Jest mock for ESM-only SDK
│   │       opencode-adapter.service.spec.ts
│   │       event-mapper.spec.ts
│   │
│   ├── file-context-db/            ← IContextDB implementation — JSON files on disk
│   │   └── src/lib/
│   │       file-context-db.service.ts    Reads/writes config.json, schedule.json, task-sessions.json
│   │       file-context-db.module.ts     @Global() module, provides CONTEXT_DB token
│   │
│   ├── nest-event-bus/             ← IEventBus implementation — wraps NestJS EventEmitter2
│   │   └── src/lib/
│   │       nest-event-bus.service.ts     In-process emit/on/off, no persistence
│   │       nest-event-bus.module.ts     @Global() module, provides EVENT_BUS token
│   │
│   ├── shell-test-runner/         ← ITestRunner implementation — runs shell commands
│   │   └── src/lib/
│   │       shell-test-runner.service.ts  Spawns child_process, returns exit code + output
│   │       shell-test-runner.module.ts   @Global() module, provides TEST_RUNNER token
│   │
│   ├── gh-pr-provider/            ← IPRProvider implementation — wraps `gh` CLI
│   │   └── src/lib/
│   │       gh-pr-provider.service.ts     create/list/merge PRs via gh commands
│   │       gh-pr-provider.module.ts     @Global() module, provides PR_PROVIDER token
│   │
│   └── orchestrator/              ← THE BRAIN — state machine + lifecycle + scheduling
│       └── src/lib/
│           state-machine.ts            14 transitions, canTransition(), transitionTask(), InvalidTransitionError
│           task-lifecycle.service.ts   Runtime engine: SSE handler, serial executor, review, auto-approve
│           orchestrator.service.ts     Thin facade — delegates to TaskLifecycleService
│           orchestrator.module.ts       NestJS module, provides both services
│           state-machine.spec.ts
│           task-lifecycle.service.spec.ts
│       └── src/index.ts              Barrel exports
│
├── context/
│   └── orchestration/              ← PERSISTENCE — JSON state files
│       config.json                 OrchestrationConfig (ClickUp IDs, URLs, port)
│       schedule.json               ScheduleEntry[] (task queue)
│       task-sessions.json          AgentTaskMapping[] (task→agent mapping)
│
├── click-up-mcp/                   ← Git submodule — ClickUp MCP server (separate process, port 3000)
│
├── docs/adr/                       ← Architecture Decision Records
│   001-004.md                      MCP plugin choice, DI interfaces, file DB, OpenCode SDK
│   005-git-worktrees-for-task-isolation.md  (M4 parallel execution design)
│
├── agent-dump/                     ← Session continuity files
│
├── .env                            ← Environment config (MCP_SERVER_URL, OPENCODE_SERVER_URL, etc.)
├── AGENTS.md                       ← Project guide for AI agents
├── tsconfig.base.json               ← Shared tsconfig (nodenext module resolution for ESM compat)
├── nx.json                          ← Nx workspace config
└── package.json                     ← pnpm workspace root
```

## The Dependency Rule

```
apps/orchestrator-server
    │
    ├── libs/orchestrator          ← depends on core-interfaces + shared
    ├── libs/mcp-task-storage      ← depends on core-interfaces + shared
    ├── libs/opencode-adapter      ← depends on core-interfaces + shared
    ├── libs/file-context-db       ← depends on core-interfaces + shared
    ├── libs/nest-event-bus        ← depends on core-interfaces
    ├── libs/shell-test-runner     ← depends on core-interfaces + shared
    ├── libs/gh-pr-provider        ← depends on core-interfaces + shared
    │
    └── ALL depend on ──────────► libs/core-interfaces ──► libs/shared
                                         ▲                       ▲
                                         │                       │
                                    Symbol tokens            Pure types/constants
                                    Interface contracts       No NestJS, no DI
```

Key rule: **Adapters never import each other. Orchestrator never imports adapters.** Everything goes through the 6 Symbol tokens defined in `core-interfaces`. The `AppModule` is the only place that wires implementations to interfaces.

## Milestone Map

| Folder | Milestone | Status |
|--------|-----------|--------|
| `core-interfaces/` + `shared/` | M0 | Done |
| `file-context-db/` + `nest-event-bus/` | M0 | Done |
| `mcp-task-storage/` | M1 | Done |
| `opencode-adapter/` | M2 | Done |
| `orchestrator/` | M3 | Done |
| `shell-test-runner/` + `gh-pr-provider/` | M0/M5 | Done/Stub |
| `git-worktree/` (not yet created) | M4 | Not started |
| `apps/orchestrator-server/` | M1+M3 | Done |

## Known Issues and Gaps

| Issue | Location | Fix needed |
|-------|----------|-----------|
| `process.cwd()` hardcoded | `task-lifecycle.service.ts` | Replace with `config.projectDirectory` |
| `make test` hardcoded | `task-lifecycle.service.ts` | Replace with `config.testCommand` |
| `base: 'main'` hardcoded | `task-lifecycle.service.ts` | Replace with `config.defaultBranch` |
| No `Pending→Ready` auto-transition | `task-lifecycle.service.ts:startTask()` | Add auto-promote or `prepareTask()` |
| No SSE/polling for lifecycle progress | `OrchestrationController` | Add WebSocket or SSE endpoint for real-time status |
| File-based context DB | `FileContextDbService` | Swap for Postgres when parallel/concurrent |
| No git worktree isolation | M4 gap | Each task operates on same directory — breaks with parallel tasks |
| Permission auto-approve all | `handlePermissionRequest()` | Should have configurable policy (deny-list, allow-list) |
| `OrchestratorService` unused injections | `orchestrator.service.ts` | Facade doesn't use injected services directly |
| No `agentProvider.reconnect()` on SSE failure | `TaskLifecycleService.onModuleInit()` | Should retry SSE subscription if initial connection fails |

## Extending the System

**To add a new interface**: Create `libs/core-interfaces/src/lib/new-thing.interface.ts` with Symbol token + interface. Create `libs/new-thing/` with a `@Global()` module providing the implementation. Import in `AppModule`.

**To add a new task status/transition**: Edit `TASK_STATE_MACHINE` in `state-machine.ts`. Add the constant to `shared/src/lib/constants.ts`. Add the new status type.

**To add a new REST endpoint**: Add to `OrchestrationController` (orchestration) or `TaskController` (task CRUD). Call `OrchestratorService` methods.

**To change the agent provider**: Implement `IAgentProvider` in a new lib. Swap the module registration in `AppModule`. No other code changes needed.

**To change task storage**: Implement `ITaskStorage` in a new lib (e.g. PostgresTaskStorageService). Swap in `AppModule`.

**To run tasks in parallel**: This is M4. Replace the serial `processing` flag with a concurrency pool. Create `IWorktreeManager` for git worktree isolation. Each task gets its own branch + directory.