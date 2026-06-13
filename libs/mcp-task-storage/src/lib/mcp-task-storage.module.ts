import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpTaskStorageService } from './mcp-task-storage.service';
import { TASK_STORAGE } from '@ai-orchestrator/core-interfaces';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: TASK_STORAGE,
      useClass: McpTaskStorageService,
    },
  ],
  exports: [TASK_STORAGE],
})
export class McpTaskStorageModule {}