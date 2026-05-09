import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../issue.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IssueService {
  private apiUrl = `${environment.apiUrl}/projects/software-kortrijk/issues.json?query_id=1601&sort=start_date%3Adesc%2Cpriority%3Adesc%2Ccreated_on`;

  constructor(private http: HttpClient) {}

  getIssues(): Observable<{ issues: Issue[]; total_count: number }> {
    return this.http.get<{ issues: Issue[]; total_count: number }>(this.apiUrl);
  }
}
