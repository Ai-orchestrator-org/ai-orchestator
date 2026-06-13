import { TaskResult, TaskPriority, TaskStatus } from '@ai-orchestrator/shared';

export function parseCreateTaskResponse(raw: string): TaskResult {
  const idMatch = raw.match(/task with id ([\w]+)/i) || raw.match(/id[:\s]+([\w]+)/i);
  const urlMatch = raw.match(/https:\/\/app\.clickup\.com\/\S+/);

  return {
    id: idMatch?.[1] ?? '',
    name: '',
    description: raw,
    status: TaskStatus.Pending,
    priority: TaskPriority.Normal,
    listId: '',
    url: urlMatch?.[0],
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function parseGetTaskResponse(raw: string): TaskResult {
  const lines = raw.split('\n');
  const fields: Record<string, string> = {};

  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      fields[key.trim().toLowerCase()] = valueParts.join(':').trim();
    }
  }

  return {
    id: fields['id'] ?? fields['task id'] ?? '',
    name: fields['name'] ?? fields['task name'] ?? '',
    description: fields['description'] ?? fields['desc'] ?? '',
    status: mapStatus(fields['status'] ?? ''),
    priority: mapPriority(fields['priority'] ?? ''),
    listId: fields['list id'] ?? fields['list'] ?? '',
    url: fields['url'] ?? '',
    assignee: fields['assignee'] ?? undefined,
    tags: fields['tags'] ? fields['tags'].split(',').map((t) => t.trim()) : [],
    createdAt: fields['created at'] ?? fields['date created'] ?? new Date().toISOString(),
    updatedAt: fields['updated at'] ?? fields['date updated'] ?? new Date().toISOString(),
  };
}

export function parseListTasksResponse(raw: string): TaskResult[] {
  if (!raw || raw.trim().length === 0) {
    return [];
  }

  const taskBlocks = raw.split(/\n(?=\d+\.)/).filter(Boolean);

  return taskBlocks.map((block) => {
    const idMatch = block.match(/id[:\s]+([\w]+)/i);
    return {
      id: idMatch?.[1] ?? '',
      name: block.split('\n')[0]?.replace(/^\d+\.\s*/, '').trim() ?? '',
      description: block,
      status: TaskStatus.Pending,
      priority: TaskPriority.Normal,
      listId: '',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}

export function parseToolListResponse(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function mapStatus(rawStatus: string): TaskStatus {
  const normalized = rawStatus.toLowerCase().replace(/\s+/g, '_');
  const statusMap: Record<string, TaskStatus> = {
    open: TaskStatus.Pending,
    in_progress: TaskStatus.InProgress,
    completed: TaskStatus.Completed,
    approved: TaskStatus.Approved,
    review: TaskStatus.NeedsRevision,
    blocked: TaskStatus.Blocked,
    done: TaskStatus.Done,
  };
  return statusMap[normalized] ?? TaskStatus.Pending;
}

function mapPriority(rawPriority: string): TaskPriority {
  const normalized = rawPriority.toLowerCase().trim();
  const priorityMap: Record<string, TaskPriority> = {
    urgent: TaskPriority.Urgent,
    high: TaskPriority.High,
    normal: TaskPriority.Normal,
    low: TaskPriority.Low,
    medium: TaskPriority.Normal,
  };
  return priorityMap[normalized] ?? TaskPriority.Normal;
}