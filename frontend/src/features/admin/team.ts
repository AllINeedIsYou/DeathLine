import { type Task, taskStatus } from '../employee/tasks';

export type Worker = { id: number; memberId: number; teamRole?: 'admin' | 'employee'; name: string; initials: string; role: string; color: string; rating: number | null; email: string; telegram: string; phone: string; timeZone: string };
export type WorkerProfileDraft = Pick<Worker, 'name' | 'role' | 'email' | 'telegram' | 'phone' | 'timeZone'>;
export type TeamTask = Task & { workerId: number; createdAt: number };
export function workerMetrics(worker: Worker, tasks: TeamTask[], now: number) {
  const assigned = tasks.filter(task => task.workerId === worker.id);
  const completed = assigned.filter(task => task.completedAt !== null);
  return { total: assigned.length, completed: completed.length, open: assigned.length - completed.length, overdue: assigned.filter(task => taskStatus(task, now) === 'overdue').length, onTime: completed.length ? Math.round(completed.filter(task => task.completedAt! <= task.deadline).length / completed.length * 100) : null };
}
