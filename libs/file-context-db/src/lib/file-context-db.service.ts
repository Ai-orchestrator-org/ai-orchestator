import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CONTEXT_DB, IContextDB } from '@ai-orchestrator/core-interfaces';
import { OrchestrationConfig, ScheduleEntry, AgentTaskMapping } from '@ai-orchestrator/shared';

const DEFAULT_BASE_DIR = 'context/orchestration';

@Injectable()
export class FileContextDbService implements IContextDB {
  private readonly logger = new Logger(FileContextDbService.name);
  private readonly baseDir: string;

  constructor(private readonly configService: ConfigService) {
    this.baseDir = this.configService.get<string>('CONTEXT_BASE_DIR') ?? DEFAULT_BASE_DIR;
    this.ensureDirectoryExists();
  }

  async getConfig(): Promise<OrchestrationConfig> {
    return this.readJsonFile<OrchestrationConfig>('config.json');
  }

  async updateConfig(config: Partial<OrchestrationConfig>): Promise<OrchestrationConfig> {
    const current = await this.getConfig();
    const updated = { ...current, ...config };
    await this.writeJsonFile('config.json', updated);
    return updated;
  }

  async getSchedule(): Promise<ScheduleEntry[]> {
    return this.readJsonFile<ScheduleEntry[]>('schedule.json');
  }

  async addScheduleEntry(entry: ScheduleEntry): Promise<ScheduleEntry> {
    const schedule = await this.getSchedule();
    schedule.push(entry);
    await this.writeJsonFile('schedule.json', schedule);
    return entry;
  }

  async updateScheduleEntry(taskId: string, update: Partial<ScheduleEntry>): Promise<ScheduleEntry> {
    const schedule = await this.getSchedule();
    const index = schedule.findIndex((e) => e.taskId === taskId);
    if (index === -1) {
      throw new Error(`Schedule entry not found: ${taskId}`);
    }
    schedule[index] = { ...schedule[index], ...update };
    await this.writeJsonFile('schedule.json', schedule);
    return schedule[index];
  }

  async removeScheduleEntry(taskId: string): Promise<void> {
    const schedule = await this.getSchedule();
    const filtered = schedule.filter((e) => e.taskId !== taskId);
    await this.writeJsonFile('schedule.json', filtered);
  }

  async getTaskSessions(): Promise<AgentTaskMapping[]> {
    return this.readJsonFile<AgentTaskMapping[]>('task-sessions.json');
  }

  async addTaskSession(session: AgentTaskMapping): Promise<AgentTaskMapping> {
    const sessions = await this.getTaskSessions();
    sessions.push(session);
    await this.writeJsonFile('task-sessions.json', sessions);
    return session;
  }

  async updateTaskSession(taskId: string, update: Partial<AgentTaskMapping>): Promise<AgentTaskMapping> {
    const sessions = await this.getTaskSessions();
    const index = sessions.findIndex((s) => s.taskId === taskId);
    if (index === -1) {
      throw new Error(`Task session not found: ${taskId}`);
    }
    sessions[index] = { ...sessions[index], ...update };
    await this.writeJsonFile('task-sessions.json', sessions);
    return sessions[index];
  }

  async removeTaskSession(taskId: string): Promise<void> {
    const sessions = await this.getTaskSessions();
    const filtered = sessions.filter((s) => s.taskId !== taskId);
    await this.writeJsonFile('task-sessions.json', filtered);
  }

  async loadAll(): Promise<{ config: OrchestrationConfig; schedule: ScheduleEntry[]; taskSessions: AgentTaskMapping[] }> {
    const [config, schedule, taskSessions] = await Promise.all([
      this.getConfig(),
      this.getSchedule(),
      this.getTaskSessions(),
    ]);
    return { config, schedule, taskSessions };
  }

  async saveAll(data: { config: OrchestrationConfig; schedule: ScheduleEntry[]; taskSessions: AgentTaskMapping[] }): Promise<void> {
    await Promise.all([
      this.writeJsonFile('config.json', data.config),
      this.writeJsonFile('schedule.json', data.schedule),
      this.writeJsonFile('task-sessions.json', data.taskSessions),
    ]);
  }

  private ensureDirectoryExists(): void {
    if (!existsSync(this.baseDir)) {
      mkdirSync(this.baseDir, { recursive: true });
      this.logger.log(`Created context directory: ${this.baseDir}`);
    }
  }

  private readJsonFile<T>(filename: string): T {
    const filePath = join(this.baseDir, filename);
    if (!existsSync(filePath)) {
      return this.getDefaultValue(filename) as T;
    }
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  private async writeJsonFile(filename: string, data: unknown): Promise<void> {
    const filePath = join(this.baseDir, filename);
    const tmpPath = filePath + '.tmp';
    const content = JSON.stringify(data, null, 2) + '\n';
    writeFileSync(tmpPath, content, 'utf-8');
    writeFileSync(filePath, content, 'utf-8');
  }

  private getDefaultValue(filename: string): unknown {
    switch (filename) {
      case 'schedule.json':
        return [];
      case 'task-sessions.json':
        return [];
      default:
        return {};
    }
  }
}