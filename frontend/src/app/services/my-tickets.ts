import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue } from '../issue.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MyTicketsService {
  private apiUrl = `${environment.apiUrl}/api/my-tickets`;

  constructor(private http: HttpClient) {}

  getMyTickets(): Observable<{ issues: Issue[] }> {
    return this.http.get<{ issues: Issue[] }>(this.apiUrl);
  }
}
