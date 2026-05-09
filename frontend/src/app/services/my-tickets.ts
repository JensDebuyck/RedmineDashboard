import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../issue.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MyTicketsService {
  private apiUrl = `${environment.apiUrl}/issues.json`;

  constructor(private http: HttpClient) {}

  getMyTickets(): Observable<{ issues: Issue[] }> {
    return this.http.get<{ issues: Issue[] }>(this.apiUrl, {
      params: {
        assigned_to_id: '665',
        status_id: '1|2|3|4|7|8|10',
        sort: 'status,priority:desc,updated_on:desc'
      }
    });
  }
}
