import type { TeamTask, Worker, WorkerProfileDraft } from '../admin/team';
import { serviceUnavailable } from '../../shared/service';

type TaskDraft = Pick<TeamTask, 'title' | 'description' | 'workerId' | 'priority' | 'deadline'>;
const emptyTeam: { tasks: TeamTask[]; workers: Worker[] } = { tasks: [], workers: [] };
// Wire this boundary to the current user's team after auth is implemented.
// No seeded records, generated deadlines or browser-local business data.
export function useTeamData() { return emptyTeam; }
export function saveTaskData(_teamId: string, _workers: Worker[], _draft: TaskDraft, _id?: number): number { return serviceUnavailable(); }
export function saveProfileData(_teamId: string, _workerId: number, _draft: WorkerProfileDraft): void { serviceUnavailable(); }
export function completeTaskData(_taskId: number): void { serviceUnavailable(); }
export function savePrivateNote(_value: string): void { serviceUnavailable(); }
