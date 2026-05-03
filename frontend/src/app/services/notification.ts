import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  private seenIds = new Set<number>();
  private initialized = false;

  constructor() {
  }

  requestPermission(): void {
    if (!('Notification' in window)) return;

    Notification.requestPermission().then(p => {

    });
  }

  checkNewTickets(issues: any[]): void {

    if (Notification.permission !== 'granted') return;

    // 🧠 eerste keer = baseline
    if (!this.initialized) {
      for (const issue of issues) {
        if (issue?.id) this.seenIds.add(issue.id);
      }

      this.initialized = true;
      return;

    }

    const newTickets: any[] = [];

    for (const issue of issues) {
      if (!issue?.id) continue;

      if (!this.seenIds.has(issue.id)) {
        this.seenIds.add(issue.id);
        newTickets.push(issue);
      }
    }

    if (newTickets.length > 0) {
      this.showNotification(newTickets);
    }


  }

  private showNotification(newTickets: any[]): void {

    const count = newTickets.length;

    const title = count === 1
      ? '🆕 Nieuw ticket'
      : `🆕 ${count} nieuwe tickets`;

    const body = count === 1
      ? newTickets[0].subject || 'Nieuw ticket ontvangen'
      : 'Er zijn nieuwe tickets binnengekomen';

    new Notification(title, {
      body,
      icon: 'favicon.ico',
      silent: true
    });
  }
}
