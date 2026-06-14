import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { TASK_STORAGE, ITaskStorage } from '@ai-orchestrator/core-interfaces';
import { TaskCreateInput, TaskUpdateInput } from '@ai-orchestrator/shared';

@Controller('api/tasks')
export class TaskController {
  constructor(
    @Inject(TASK_STORAGE) private readonly taskStorage: ITaskStorage,
  ) {}

  @Post()
  async createTask(@Body() input: TaskCreateInput) {
    return this.taskStorage.createTask(input);
  }

  @Get('tools')
  async getAvailableTools() {
    return this.taskStorage.getAvailableTools();
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return this.taskStorage.getTask(id);
  }

  @Get()
  async listTasks(@Query('listId') listId: string, @Query() query: Record<string, string>) {
    const { listId: _listId, ...filters } = query;
    return this.taskStorage.listTasks(listId, filters);
  }

  @Patch(':id')
  async updateTask(@Param('id') id: string, @Body() input: TaskUpdateInput) {
    return this.taskStorage.updateTask(id, input);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    await this.taskStorage.deleteTask(id);
    return { deleted: true, id };
  }
}