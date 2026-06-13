import { Injectable, Inject } from '@nestjs/common';
import { OrchestratorService } from '@ai-orchestrator/orchestrator';

@Injectable()
export class AppService {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  getStatus() {
    return {
      name: 'ai-orchestrator',
      version: '0.0.1',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}