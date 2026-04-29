import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { IssueService } from '../../services/issues';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './stats.html',
  styleUrls: ['./stats.css']
})
export class StatsComponent implements OnInit {

  dailyStats: { date: string; count: number }[] = [];

  private STORAGE_STATS = 'stats_daily';
  private STORAGE_SEEN = 'stats_seen_ids';

  private statsStore: Record<string, number> = {};
  private seenIds: Set<number> = new Set();

  private refreshInterval: any;

  constructor(
    private issueService: IssueService,
    private cdr: ChangeDetectorRef // ✅ belangrijk
  ) {}

  ngOnInit(): void {
    this.loadFromStorage();
    this.loadIssues();

    this.refreshInterval = setInterval(() => {

      this.loadIssues();
    },3000);
  }

  ngOnDestroy(): void {
    if(this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  // -----------------------------
  // STORAGE
  // -----------------------------
  private loadFromStorage(): void {
    const savedStats = localStorage.getItem(this.STORAGE_STATS);
    const savedSeen = localStorage.getItem(this.STORAGE_SEEN);

    this.statsStore = savedStats ? JSON.parse(savedStats) : {};
    this.seenIds = new Set(savedSeen ? JSON.parse(savedSeen) : []);
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_STATS, JSON.stringify(this.statsStore));
    localStorage.setItem(this.STORAGE_SEEN, JSON.stringify([...this.seenIds]));
  }

  // -----------------------------
  // FETCH + COUNT
  // -----------------------------
  private loadIssues(): void {



    this.issueService.getIssues().subscribe({
      next: (data) => {

        const issues = data?.issues ?? [];


        let newCount = 0;

        for (const issue of issues) {

          if (!issue?.id || !issue?.created_on) continue;

          // alleen nieuwe tickets tellen
          if (this.seenIds.has(issue.id)) continue;

          this.seenIds.add(issue.id);
          newCount++;

          const dateKey = this.getDateKey(issue.created_on);

          this.statsStore[dateKey] = (this.statsStore[dateKey] || 0) + 1;
        }



        this.saveToStorage();
        this.buildDisplayStats();

        // 🔥 BELANGRIJK voor @for rendering
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Failed to load issues', err);
      }
    });
  }

  // -----------------------------
  // BUILD UI DATA
  // -----------------------------
  private buildDisplayStats(): void {
    const last7Days = this.getLast7Days();

    this.dailyStats = last7Days.map(date => ({
      date,
      count: this.statsStore[date] || 0
    }));


  }

  // -----------------------------
  // HELPERS
  // -----------------------------
  private getLast7Days(): string[] {
    const days: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(this.getDateKey(d));
    }

    return days;
  }

  private getDateKey(input: string | Date): string {
    const d = new Date(input);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  isToday(date: string): boolean {
    return date === this.getDateKey(new Date());
  }

  formatDisplayDate(date: string): string {
    return new Date(date).toLocaleDateString('nl-BE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }
}
