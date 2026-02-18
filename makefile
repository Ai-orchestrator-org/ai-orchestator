start-mcp:
	@echo "Starting Click up MCP..."
	@cd click-up-mcp && pnpm install && pnpm start


start-core:
	@echo "Starting Core server"

start:start-core start-mcp
