export interface BorrowedTimeReading {
  remainingSeconds: number;
  progress: number;
  bonusSeconds: number;
  bonusId: number;
  bonusVisible: boolean;
  glitching: boolean;
  ended: boolean;
}

export interface BorrowedClock {
  tick(allowBonus?: boolean): BorrowedTimeReading;
}

declare global {
  var DeathlineTime: {
    createClock(options?: { now?: () => number; random?: () => number; initialSeconds?: number }): BorrowedClock;
    formatTime(seconds: number): string;
  };
}
