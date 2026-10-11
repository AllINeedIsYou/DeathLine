import { type TeamTask, type Worker } from './team';

export function monthlyGoatEntries(workers: Worker[], tasks: TeamTask[], now: number) {
  const date = new Date(now);
  const start = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
  const inMonth = (at: number) => at >= start && at <= now;
  return workers.map(worker => {
    const assigned = tasks.filter(task => task.workerId === worker.id);
    const completed = assigned.filter(task => task.completedAt !== null && inMonth(task.completedAt));
    const overdue = assigned.filter(task => task.completedAt === null && inMonth(task.deadline));
    const onTime = completed.filter(task => task.completedAt! <= task.deadline).length;
    return { worker, completed: completed.length, overdue: overdue.length, evaluated: completed.length + overdue.length, onTime: completed.length ? Math.round(onTime / completed.length * 100) : null };
  });
}
export type GoatEntry = ReturnType<typeof monthlyGoatEntries>[number];

export function goatHighlights(entries: GoatEntry[]) {
  const eligible = entries.filter(entry => entry.evaluated >= 5);
  const bestScore = Math.max(...eligible.map(entry => entry.worker.rating));
  const worstScore = Math.min(...eligible.map(entry => entry.worker.rating));
  return {
    eligible,
    best: eligible.filter(entry => entry.worker.rating === bestScore),
    // Do not pick an arbitrary loser when everyone has the same score, or there is only one participant.
    worst: bestScore === worstScore ? [] : eligible.filter(entry => entry.worker.rating === worstScore),
  };
}
