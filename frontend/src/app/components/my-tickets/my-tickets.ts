import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MyTicketsService } from '../../services/my-tickets';
import { Issue } from '../../issue.model';

interface TicketRow {
  issue: Issue;

  totalSeconds: number;

  running: boolean;
  entryId: number | null;

  sessionSeconds: number;
  lastSessionSeconds: number;
}

@Component({
  selector: 'app-my-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './my-tickets.html',
  styleUrls: ['./my-tickets.css'],
})
export class MyTicketsComponent implements OnInit, OnDestroy {

  rows: TicketRow[] = [];
  loading = true;
  error: string | null = null;

  filterStatus: string = 'all';

  private tickInterval: any;

  constructor(
    private myTicketsService: MyTicketsService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTickets();

    this.tickInterval = setInterval(() => {
      let changed = false;

      for (const row of this.rows) {
        if (row.running) {
          row.sessionSeconds += 1;
          changed = true;
        }
      }

      if (changed) this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.tickInterval);
  }

  private loadTickets(): void {
    this.myTicketsService.getMyTickets().subscribe({
      next: async (data) => {
        const issues = data.issues ?? [];

        const newRows: TicketRow[] = await Promise.all(
          issues.map(async (issue) => {
            const existing = this.rows.find(r => r.issue.id === issue.id);

            return {
              issue,
              totalSeconds: await (window as any).electronAPI.getTotalTime(issue.id),

              running: existing?.running ?? false,
              entryId: existing?.entryId ?? null,

              sessionSeconds: existing?.sessionSeconds ?? 0,
              lastSessionSeconds: existing?.lastSessionSeconds ?? 0,
            };
          })
        );

        this.rows = newRows;
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

  getFilteredRows(): TicketRow[] {
    return this.rows.filter(row => {
      if (this.filterStatus === 'all') return true;
      return row.issue.status.name === this.filterStatus;
    });
  }

  async startTimer(row: TicketRow): Promise<void> {
    const entryId = await (window as any).electronAPI.startTimer(row.issue.id);

    row.entryId = entryId;
    row.sessionSeconds = 0;
    row.running = true;

    this.cdr.detectChanges();
  }

  async stopTimer(row: TicketRow): Promise<void> {
    if (row.entryId === null) return;

    await (window as any).electronAPI.stopTimer(row.entryId, row.sessionSeconds);

    row.totalSeconds += row.sessionSeconds;
    row.lastSessionSeconds = row.sessionSeconds;

    row.sessionSeconds = 0;
    row.running = false;
    row.entryId = null;

    this.cdr.detectChanges();
  }

  formatTime(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00:00';

    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  getStatusClass(statusName: string): string {
    const map: Record<string, string> = {
      New: 'status-new',
      'In Progress': 'status-progress',
      Resolved: 'status-resolved',
      Closed: 'status-closed',
      Feedback: 'status-feedback',
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

  getAgeInDays(row: TicketRow): number {
    const created = new Date(row.issue.created_on);
    const now = new Date();

    return Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  getAgeClass(row: TicketRow): string {
    const age = this.getAgeInDays(row);

    if (age >= 10) return 'ticket-red';
    if (age >= 7) return 'ticket-orange';
    if (age >= 5) return 'ticket-yellow';
    return 'ticket-green';
  }
}
