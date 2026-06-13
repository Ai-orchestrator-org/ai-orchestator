export const CLICKUP_TOOL_MAPPINGS = {
  createTask: 'Create_Task',
  getTask: 'Get_Task',
  updateTask: 'Update_Task',
  deleteTask: 'Delete_Task',
  listTasks: 'Get_Tasks',
  getAvailableTools: 'List_Tools',
} as const;

export type ClickUpToolName = (typeof CLICKUP_TOOL_MAPPINGS)[keyof typeof CLICKUP_TOOL_MAPPINGS];

export const CLICKUP_RESPONSE_PATTERNS = {
  taskId: /task with id ([\w]+)/i,
  taskUrl: /https:\/\/app\.clickup\.com\/\S+/,
  listItems: /^\d+\.\s/m,
} as const;