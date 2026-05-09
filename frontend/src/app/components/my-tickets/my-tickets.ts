import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MyTicketsService } from '../../services/my-tickets';
import { TimerService } from '../../services/timer';
import { Issue } from '../../issue.model';
import { NotificationService} from '../../services/notification';

interface TicketRow {
  issue: Issue;
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

  filterStatus: string = 'active';

  private tickInterval: any;

  constructor(
    private myTicketsService: MyTicketsService,
    private cdr: ChangeDetectorRef,
    public timerService: TimerService,
    private notificationService: NotificationService,
  ) {}

  ngOnInit(): void {
    this.loadTickets();

    // Enkel UI refreshen, timer telt door in de service
    this.tickInterval = setInterval(() => {
      const anyRunning = this.rows.some(r => this.timerService.isRunning(r.issue.id));
      if (anyRunning) this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy(): void {
    clearInterval(this.tickInterval);
    // Timer blijft doorlopen in de service!
  }

  private loadTickets(): void {
    this.myTicketsService.getMyTickets().subscribe({
      next: async (data) => {
        const issues = data.issues ?? [];
        this.notificationService.checkNewTickets(issues);
        // Total time ophalen en in de service zetten
        await Promise.all(
          issues.map(async (issue) => {
            const total = await (window as any).electronAPI.getTotalTime(issue.id);
            const state = this.timerService.getState(issue.id);
            // Alleen overschrijven als timer niet loopt (anders is totalSeconds al bijgewerkt)
            if (!state.running) {
              state.totalSeconds = total;
            }
          })
        );

        this.rows = issues.map(issue => ({ issue }));
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
      if (this.filterStatus === 'active') return row.issue.status.name !== 'Resolved';
      return row.issue.status.name === this.filterStatus;
    });
  }

  async startTimer(row: TicketRow): Promise<void> {
    await this.timerService.start(row.issue.id);
    this.cdr.detectChanges();
  }

  async stopTimer(row: TicketRow): Promise<void> {
    await this.timerService.stop(row.issue.id);
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
      'New':               'status-new',
      'In Progress':       'status-progress',
      'Resolved':          'status-resolved',
      'Closed':            'status-closed',
      'Feedback Customer': 'status-feedback-customer',
      'Pending Customer':  'status-pending-customer',
      'Pending Subtask':   'status-pending-subtask',
      'OnHold':            'status-onhold',
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
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  getAgeClass(row: TicketRow): string {
    const age = this.getAgeInDays(row);
    if (age >= 10) return 'ticket-red';
    if (age >= 7)  return 'ticket-orange';
    if (age >= 5)  return 'ticket-yellow';
    return 'ticket-green';
  }

  openTicket(id: number): void {
    (window as any).electronAPI.openExternal(
      `https://redmine.trustteam.be/issues/${id}`
    );
  }
}
