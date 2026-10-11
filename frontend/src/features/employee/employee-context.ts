import type { Team } from '../auth/invitations';
import type { TeamTask, Worker } from '../admin/team';
import { monthlyGoatEntries } from '../admin/monthly-goat';

export type EmployeeMembership = { name: string; team: Team; workerId: number };
export function publicTeamGoat(_teamId: string, now: number, teamTasks: TeamTask[] = [], teamWorkers: Worker[] = []) {
  const eligible = monthlyGoatEntries(teamWorkers, teamTasks, now).filter(entry => entry.evaluated >= 5);
  const best = Math.max(...eligible.map(entry => entry.worker.rating));
  return eligible.filter(entry => entry.worker.rating === best).map(entry => ({
    name: entry.worker.name, initials: entry.worker.initials, role: entry.worker.role,
    score: entry.worker.rating, completed: entry.completed, onTime: entry.onTime,
  }));
}
