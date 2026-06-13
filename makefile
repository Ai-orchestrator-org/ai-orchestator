.PHONY: build serve test lint typecheck start-mcp clean

build:
	@echo "Building orchestrator-server..."
	nx build orchestrator-server

serve:
	@echo "Starting orchestrator-server in dev mode..."
	nx serve orchestrator-server

test:
	@echo "Running all tests..."
	nx run-many --target=test --all

lint:
	@echo "Linting all projects..."
	nx run-many --target=lint --all

typecheck:
	@echo "Typechecking all projects..."
	nx run-many --target=typecheck --all

start-mcp:
	@echo "Starting ClickUp MCP..."
	@cd click-up-mcp && pnpm install && pnpm start

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist/ .nx/ coverage/
	find . -name 'node_modules' -type d -prune -exec rm -rf {} +

dev: start-mcp serve

build-all:
	nx run-many --target=build --all