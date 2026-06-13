import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileContextDbModule } from '@ai-orchestrator/file-context-db';
import { NestEventBusModule } from '@ai-orchestrator/nest-event-bus';
import { McpTaskStorageModule } from '@ai-orchestrator/mcp-task-storage';
import { OpencodeAdapterModule } from '@ai-orchestrator/opencode-adapter';
import { ShellTestRunnerModule } from '@ai-orchestrator/shell-test-runner';
import { GhPrProviderModule } from '@ai-orchestrator/gh-pr-provider';
import { OrchestratorModule } from '@ai-orchestrator/orchestrator';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
    }),
    FileContextDbModule,
    NestEventBusModule,
    McpTaskStorageModule,
    OpencodeAdapterModule,
    ShellTestRunnerModule,
    GhPrProviderModule,
    OrchestratorModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}