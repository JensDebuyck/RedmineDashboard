import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssueService } from '../../services/issues';
import { Issue } from '../../issue.model';
import { RouterLink, RouterLinkActive } from '@angular/router';
import {NotificationService} from '../../services/notification';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, FormsModule, RouterLinkActive, RouterLink],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements OnInit {
  issues: Issue[] = [];
  loading = true;
  error: string | null = null;
  filterStatus: string = 'all';
  filterPriority: string = 'all';
  filterDay: string = 'today';

  notes: Record<number, string> = {};

  constructor(
    private issueService: IssueService,
    private cdr: ChangeDetectorRef,
    public notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadNotes();

    this.notificationService.requestPermission();



    this.issueService.getIssues().subscribe({
      next: (data) => {

        const issues = data.issues ?? [];

        this.notificationService.checkNewTickets(issues);

        this.issues = data.issues;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to load issues.';
        this.loading = false;
        this.cdr.detectChanges();
        console.error(err);
      },
    });
  }

  loadNotes() {
    const saved = localStorage.getItem('issueNotes');
    this.notes = saved ? JSON.parse(saved) : {};
  }

  saveNote() {
    localStorage.setItem('issueNotes', JSON.stringify(this.notes));
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

  getAgeClass(issue: Issue): string {
    const created = new Date(issue.created_on);
    const now = new Date();

    const diffTime = now.getTime() - created.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays >= 10) {
      return 'ticket-red';
    }

    if (diffDays >= 7) {
      return 'ticket-orange';
    }

    if (diffDays >= 5) {
      return 'ticket-yellow';
    }

    return 'ticket-green';
  }

  getPriorityClass(priority: any): string {
    const id = priority?.id;
    const name = (priority?.name || '').toLowerCase();

    // 1. Eerst op ID (meest betrouwbaar)
    switch (id) {
      case 1:
        return 'prio-low';
      case 2:
        return 'prio-normal';
      case 3:
        return 'prio-high';
      case 4:
        return 'prio-normal';
      case 5:
        return 'prio-low';
    }

    return 'prio-unknown';
  }

  getIssueAgeInDays(issue: Issue): number {
    const created = new Date(issue.created_on);
    const now = new Date();

    const diff = now.getTime() - created.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  getFilteredIssues(): Issue[] {
    return this.issues.filter(issue => {

      // STATUS FILTER
      if (this.filterStatus !== 'all' &&
        issue.status.name.toLowerCase() !== this.filterStatus) {
        return false;
      }

      // PRIORITY FILTER
      if (this.filterPriority !== 'all') {

        const prioId = issue.priority?.id?.toString();
        const prioName = issue.priority?.name || '';

        // 👉 speciale case voor "/"
        const isUnknownPrio = prioName.trim() === '/';

        if (this.filterPriority === 'unknown') {
          if (!isUnknownPrio) return false;
        }
        else if (prioId !== this.filterPriority) {
          return false;
        }
      }

      // DAY FILTER
      const age = this.getIssueAgeInDays(issue);

      if (this.filterDay === 'today' && age > 1) return false;
      if (this.filterDay === 'week' && age > 7) return false;
      if (this.filterDay === 'month' && age > 30) return false;

      return true;
    });
  }


}


