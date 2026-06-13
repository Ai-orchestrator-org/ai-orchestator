import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { McpTaskStorageService } from './mcp-task-storage.service';
import { TASK_STORAGE } from '@ai-orchestrator/core-interfaces';

describe('McpTaskStorageService', () => {
  let service: McpTaskStorageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', '.env.local'],
        }),
      ],
      providers: [
        McpTaskStorageService,
        {
          provide: TASK_STORAGE,
          useExisting: McpTaskStorageService,
        },
      ],
    }).compile();

    service = module.get<McpTaskStorageService>(McpTaskStorageService);
  });

  describe('connection', () => {
    it('should have isConnected method', () => {
      expect(typeof service.isConnected).toBe('function');
    });

    it('should have getConnectionError method', () => {
      expect(typeof service.getConnectionError).toBe('function');
    });

    it('should have reconnect method', () => {
      expect(typeof service.reconnect).toBe('function');
    });
  });

  describe('interface compliance', () => {
    it('should implement ITaskStorage methods', () => {
      expect(typeof service.createTask).toBe('function');
      expect(typeof service.getTask).toBe('function');
      expect(typeof service.updateTask).toBe('function');
      expect(typeof service.deleteTask).toBe('function');
      expect(typeof service.listTasks).toBe('function');
      expect(typeof service.getAvailableTools).toBe('function');
    });
  });

  describe('when MCP server is not available', () => {
    it('should report not connected', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should throw when calling tools without connection', async () => {
      await expect(service.getTask('123')).rejects.toThrow('MCP client is not connected');
    });
  });
});