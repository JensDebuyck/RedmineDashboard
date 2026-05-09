import { Injectable } from '@angular/core';

export interface TimerState {
  entryId: number | null;
  sessionSeconds: number;
  lastSessionSeconds: number;
  totalSeconds: number;
  running: boolean;
}

@Injectable({ providedIn: 'root' })
export class TimerService {

  private timers = new Map<number, TimerState>();
  private intervalId: any;

  constructor() {
    this.intervalId = setInterval(() => {
      for (const timer of this.timers.values()) {
        if (timer.running) timer.sessionSeconds += 1;
      }
    }, 1000);
  }

  getState(ticketId: number): TimerState {
    if (!this.timers.has(ticketId)) {
      this.timers.set(ticketId, {
        entryId: null,
        sessionSeconds: 0,
        lastSessionSeconds: 0,
        totalSeconds: 0,
        running: false
      });
    }
    return this.timers.get(ticketId)!;
  }

  setTotal(ticketId: number, seconds: number): void {
    this.getState(ticketId).totalSeconds = seconds;
  }

  async start(ticketId: number): Promise<void> {
    const entryId = await (window as any).electronAPI.startTimer(ticketId);
    const state = this.getState(ticketId);
    state.entryId = entryId;
    state.sessionSeconds = 0;
    state.running = true;
  }

  async stop(ticketId: number): Promise<void> {
    const state = this.getState(ticketId);
    if (!state.running || state.entryId === null) return;

    await (window as any).electronAPI.stopTimer(state.entryId, state.sessionSeconds);
    state.totalSeconds += state.sessionSeconds;
    state.lastSessionSeconds = state.sessionSeconds;
    state.sessionSeconds = 0;
    state.running = false;
    state.entryId = null;
  }

  isRunning(ticketId: number): boolean {
    return this.getState(ticketId).running;
  }
}
