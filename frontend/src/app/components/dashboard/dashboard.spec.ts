import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DashboardComponent } from './dashboard';
import { Issue } from '../../issue.model';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter by status, priority and date correctly', () => {
    const nowIso = new Date().toISOString();
    const oldIso = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString();
    const issues = [
      {
        id: 1,
        subject: 'Issue one',
        created_on: nowIso,
        status: { id: 1, name: 'New' },
        priority: { id: 3, name: 'High' },
        project: { id: 1, name: 'A' },
        tracker: { id: 1, name: 'Bug' },
        author: { id: 1, name: 'User' },
      },
      {
        id: 2,
        subject: 'Issue two',
        created_on: oldIso,
        status: { id: 2, name: 'Resolved' },
        priority: { id: 5, name: 'Low' },
        project: { id: 1, name: 'A' },
        tracker: { id: 1, name: 'Bug' },
        author: { id: 1, name: 'User' },
      }
    ] as Issue[];

    component.issues = issues;
    component.filterStatus = 'new';
    component.filterPriority = '3';
    component.filterDay = 'today';
    expect(component.getFilteredIssues().map(i => i.id)).toEqual([1]);
  });
});
