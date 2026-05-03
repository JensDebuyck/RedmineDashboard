import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MyTicketsService } from '../../services/my-tickets';
import { Issue } from '../../issue.model';

interface TicketRow {
  issue:        Issue;
  totalSeconds: number;
  // actieve timer state
  running:      boolean;
  entryId:      number | null;
  elapsed:      number; // seconden sinds start huidige sessie
}

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './my-tickets.html',
  styleUrls: ['./my-tickets.css'],
})
export class MyTicketsComponent implements OnInit, OnDestroy {

  rows: TicketRow[] = [];
  loading = true;
  error: string | null = null;

  private tickInterval: any;

  constructor(
    private myTicketsService: MyTicketsService,
    private cdr: ChangeDetectorRef,
  ) {}

  async ngOnInit(): Promise<void> {
    this.loadTickets();

    // ⏱️ elke seconde elapsed updaten voor actieve timers
    this.tickInterval = setInterval(() => {
      let hasRunning = false;
      for (const row of this.rows) {
        if (row.running) {
          row.elapsed++;
          hasRunning = true;
        }
      }
      if (hasRunning) this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.tickInterval);
  }

  private loadTickets(): void {
    this.myTicketsService.getMyTickets().subscribe({
      next: async (data) => {
        const issues = data.issues ?? [];

        this.rows = await Promise.all(
          issues.map(async (issue) => ({
            issue,
            totalSeconds: await (window as any).electronAPI.getTotalTime(issue.id),
            running:      false,
            entryId:      null,
            elapsed:      0,
          }))
        );

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load tickets.';
        this.loading = false;
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }

  async startTimer(row: TicketRow): Promise<void> {
    const entryId = await (window as any).electronAPI.startTimer(row.issue.id);
    row.entryId = entryId;
    row.elapsed = 0;
    row.running = true;
    this.cdr.detectChanges();
  }

  async stopTimer(row: TicketRow): Promise<void> {
    if (row.entryId === null) return;

    await (window as any).electronAPI.stopTimer(row.entryId, row.elapsed);

    row.totalSeconds += row.elapsed;
    row.elapsed  = 0;
    row.running  = false;
    row.entryId  = null;
    this.cdr.detectChanges();
  }

  // HH:MM:SS formatter
  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  getStatusClass(statusName: string): string {
    const map: Record<string, string> = {
      New:           'status-new',
      'In Progress': 'status-progress',
      Resolved:      'status-resolved',
      Closed:        'status-closed',
      Feedback:      'status-feedback',
    };
    return map[statusName] ?? 'status-default';
  }

  getPriorityClass(priority: any): string {
    switch (priority?.id) {
      case 1: return 'prio-low';
      case 2: return 'prio-normal';
      case 3: return 'prio-high';
      case 4: return 'prio-normal';
      case 5: return 'prio-low';
    }
    return 'prio-unknown';
  }
}
