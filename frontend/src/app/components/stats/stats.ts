import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {RouterModule} from '@angular/router';
import { IssueService } from '../../services/issues';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './stats.html',
  styleUrls: ['./stats.css']
})
export class StatsComponent implements OnInit {

  issues: any[] = [];
  dailyStats: { date: string; count: number }[] = [];

  constructor(private issueService: IssueService) {
    console.log('🚀 StatsComponent loaded');
  }

  ngOnInit(): void {
    this.loadIssues();
  }

  private loadIssues(): void {
    console.log('📡 Loading issues...');

    this.issueService.getIssues().subscribe({
      next: (data) => {

        console.log('📦 FULL RESPONSE:', data);
        console.log('📦 ISSUES:', data?.issues);

        this.issues = data?.issues ?? [];

        console.log('📊 ASSIGNED this.issues length:', this.issues.length);

        this.buildDailyStats();

        console.log('✅ AFTER BUILD:', this.dailyStats);
      },

      error: (err) => {
        console.error('❌ API ERROR:', err);
      }
    });
  }

  private buildDailyStats(): void {

    console.log('📊 Building daily stats...');

    const perDay: Record<string, number> = {};

    for (const issue of this.issues) {

      if (!issue?.created_on) continue;

      const key = this.getDateKey(issue.created_on);

      perDay[key] = (perDay[key] || 0) + 1;
    }

    console.log('📈 perDay:', perDay);

    const last7Days = this.getLast7Days();

    console.log('📅 last7Days:', last7Days);

    this.dailyStats = last7Days.map(date => ({
      date,
      count: perDay[date] || 0
    }));

    console.log('✅ FINAL dailyStats:', this.dailyStats);
  }

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
    const today = this.getDateKey(new Date());
    return today === date;
  }

  formatDisplayDate(date: string): string {
    const d = new Date(date);

    return d.toLocaleDateString('nl-BE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  }
}
