export type Priority = 'high' | 'medium' | 'low';
export type TaskStatus = 'active' | 'overdue' | 'completed';
export type Task = {
  id: number;
  title: string;
  summary: string;
  description: string;
  category: string;
  priority: Priority;
  deadline: number;
  completedAt: number | null;
};

export const priorities: Record<Priority, string> = { high: 'Высокий', medium: 'Средний', low: 'Низкий' };

export function taskStatus(task: Task, now: number): TaskStatus {
  if (task.completedAt !== null) return 'completed';
  return task.deadline <= now ? 'overdue' : 'active';
}

export function completionDelay(task: Task): number {
  return task.completedAt === null ? 0 : Math.max(0, task.completedAt - task.deadline);
}

export function clockText(milliseconds: number): string {
  const seconds = Math.ceil(Math.abs(milliseconds) / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds / 60) % 60;
  const rest = seconds % 60;
  if (hours >= 24) return `${Math.floor(hours / 24)} д ${String(hours % 24).padStart(2, '0')} ч`;
  return [hours, minutes, rest].map(value => String(value).padStart(2, '0')).join(':');
}

const deadlineFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
export function dateText(value: number): string { return deadlineFormat.format(value); }

