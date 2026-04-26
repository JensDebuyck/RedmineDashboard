import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../issue.model';

@Injectable({ providedIn: 'root' })
export class IssueService {
  private apiUrl = 'http://localhost:3000/api/issues';

  constructor(private http: HttpClient) {}

  getIssues(): Observable<{ issues: Issue[] }> {
    return this.http.get<{ issues: Issue[] }>(this.apiUrl);
  }
}
