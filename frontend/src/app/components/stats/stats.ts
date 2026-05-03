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
export class StatsComponent implements OnInit, OnDestroy {

  dailyStats: { date: string; count: number }[] = [];

  private statsStore: Record<string, number> = {};
  private seenIds: Set<number> = new Set();
  private refreshInterval: any;

  constructor(
    private issueService: IssueService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadFromSQLite();
    this.loadIssues();
    this.refreshInterval = setInterval(() => this.loadIssues(), 30000);
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }

  // -----------------------------
  // SQLITE
  // -----------------------------
  private async loadFromSQLite(): Promise<void> {
    try {
      const api = (window as any).electronAPI;
      this.statsStore = await api.getStats();
      const ids = await api.getSeenIds();
      this.seenIds = new Set(ids);
      console.log('✅ Stats geladen uit SQLite');
    } catch (err) {
      console.warn('⚠️ SQLite niet bereikbaar', err);
    }
  }

  private async saveToSQLite(newIds: number[]): Promise<void> {
    try {
      const api = (window as any).electronAPI;
      // Stats opslaan
      for (const [dateKey, count] of Object.entries(this.statsStore)) {
        await api.saveStat(dateKey, count);
      }
      // Nieuwe seen IDs opslaan
      if (newIds.length > 0) {
        await api.saveSeenIds(newIds);
      }
    } catch (err) {
      console.error('❌ Opslaan in SQLite mislukt', err);
    }
  }

  // -----------------------------
  // FETCH + COUNT
  // -----------------------------
  private loadIssues(): void {
    this.issueService.getIssues().subscribe({
      next: async (data) => {
        const issues = data?.issues ?? [];
        const newIds: number[] = [];

        for (const issue of issues) {
          if (!issue?.id || !issue?.created_on) continue;
          if (this.seenIds.has(issue.id)) continue;

          this.seenIds.add(issue.id);
          newIds.push(issue.id);

          const dateKey = this.getDateKey(issue.created_on);
          this.statsStore[dateKey] = (this.statsStore[dateKey] || 0) + 1;
        }

        if (newIds.length > 0) {
          await this.saveToSQLite(newIds);
        }

        this.buildDisplayStats();
        this.cdr.detectChanges();
      },
      error: (err) => console.error('❌ Failed to load issues', err)
    });
  }

  // -----------------------------
  // BUILD UI DATA
  // -----------------------------
  private buildDisplayStats(): void {
    this.dailyStats = this.getLast7Days().map(date => ({
      date,
      count: this.statsStore[date] || 0
    }));
  }

  // -----------------------------
  // HELPERS
  // -----------------------------
  private getLast7Days(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return this.getDateKey(d);
    });
  }

  private getDateKey(input: string | Date): string {
    const d = new Date(input);
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0')
    ].join('-');
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
