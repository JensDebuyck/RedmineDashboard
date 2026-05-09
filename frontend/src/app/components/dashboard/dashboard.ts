import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssueService } from '../../services/issues';
import { Issue } from '../../issue.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationService } from '../../services/notification';
import { NoteService } from '../../services/notes';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLinkActive, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit, OnDestroy {

  issues: Issue[] = [];
  loading = true;
  saving = false;
  error: string | null = null;

  filterStatus   = 'all';
  filterPriority = 'all';
  filterDay      = 'today';

  private intervalId: any;

  constructor(
    private issueService: IssueService,
    private cdr: ChangeDetectorRef,
    public notificationService: NotificationService,
    private noteService: NoteService,
  ) {}

  ngOnInit(): void {
    this.notificationService.requestPermission();
    this.loadIssues();
    this.intervalId = setInterval(() => this.loadIssues(), 30000);
  }

  ngOnDestroy(): void {
    clearInterval(this.intervalId);
  }

  private loadIssues(): void {
    this.issueService.getIssues().subscribe({
      next: (data) => {
        const issues = data.issues ?? [];
        this.issues = issues;
        this.loading = false;
        this.enrichNotes(issues);
        this.notificationService.checkNewTickets(issues);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load issues.';
        this.loading = false;
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }

  async saveNote(issue: Issue, note: string) {
    this.saving = true;
    try {
      await this.noteService.saveNote({
        ticketId:  issue.id,
        customer:  issue.project?.name  ?? '',
        title:     issue.subject        ?? '',
        priority:  issue.priority?.name ?? '',
        createdAt: issue.created_on,
        note:      note ?? ''
      });
    } finally {
      this.saving = false;
      this.cdr.detectChanges();
    }
  }

  private async enrichNotes(issues: Issue[]) {
    const enriched = await Promise.all(
      issues.map(async (issue) => ({
        ...issue,
        note: await this.noteService.getNote(issue.id)
      }))
    );
    this.issues = enriched;
    this.cdr.detectChanges();
  }

  getFilteredIssues(): Issue[] {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return this.issues.filter(issue => {
      if (this.filterStatus !== 'all' &&
        issue.status.name.toLowerCase() !== this.filterStatus) return false;

      if (this.filterPriority !== 'all') {
        const prioId = issue.priority?.id?.toString();
        const prioName = issue.priority?.name || '';
        const isUnknownPrio = prioName.trim() === '/';

        if (this.filterPriority === 'unknown') {
          if (!isUnknownPrio) return false;
        } else if (prioId !== this.filterPriority) {
          return false;
        }
      }

      const createdStr = issue.created_on.split('T')[0];
      const age = this.getIssueAgeInDays(issue);

      if (this.filterDay === 'today' && createdStr !== todayStr) return false;
      if (this.filterDay === 'week'  && age > 7)  return false;
      if (this.filterDay === 'month' && age > 30) return false;

      return true;
    }).sort((a, b) =>
      new Date(b.created_on).getTime() - new Date(a.created_on).getTime()
    );
  }

  getStatusClass(statusName: string): string {
    const map: Record<string, string> = {
      New:          'status-new',
      'In Progress':'status-progress',
      Resolved:     'status-resolved',
      Closed:       'status-closed',
      Feedback:     'status-feedback',
    };
    return map[statusName] ?? 'status-default';
  }

  getAgeClass(issue: any): string {
    const diffDays = this.getIssueAgeInDays(issue);
    if (diffDays >= 10) return 'ticket-red';
    if (diffDays >= 7)  return 'ticket-orange';
    if (diffDays >= 5)  return 'ticket-yellow';
    return 'ticket-green';
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

  getIssueAgeInDays(issue: any): number {
    const created = new Date(issue.created_on);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }
}
