import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {

  private seenIds = new Set<number>();
  private initialized = false;

  constructor() {
    console.log('🔔 NotificationService initialized');

    // 🧠 optional: restore memory from sessionStorage (fix reload issues)
    const saved = sessionStorage.getItem('seenIds');
    if (saved) {
      try {
        const ids: number[] = JSON.parse(saved);
        this.seenIds = new Set(ids);
        this.initialized = true;
      } catch (e) {
        console.warn('Failed to restore seenIds');
      }
    }
  }

  requestPermission(): void {
    if (!('Notification' in window)) return;

    // 🧠 only ask if not decided yet (fix Chrome re-deny issues)
    if (Notification.permission !== 'default') {
      console.log('🔔 Permission already set:', Notification.permission);
      return;
    }

    Notification.requestPermission().then(p => {
      console.log('🔔 Permission:', p);
    });
  }

  checkNewTickets(issues: any[]): void {

    // ❌ still allow tracking even if notifications are blocked
    const notificationsAllowed = Notification.permission === 'granted';

    // 🧠 first run = baseline
    if (!this.initialized) {
      for (const issue of issues) {
        if (issue?.id) {
          this.seenIds.add(issue.id);
        }
      }

      this.initialized = true;
      this.persist();
      console.log('🧠 Baseline initialized');
      return;
    }

    let newTickets: any[] = [];

    for (const issue of issues) {

      if (!issue?.id) continue;

      if (!this.seenIds.has(issue.id)) {
        this.seenIds.add(issue.id);
        newTickets.push(issue);
      }
    }

    this.persist();

    if (newTickets.length > 0) {

      console.log('🆕 New tickets detected:', newTickets.length);

      // 🔔 only show browser notification if allowed
      if (notificationsAllowed) {
        this.showNotification(newTickets);
      } else {
        // fallback: still log (option for later toast UI)
        console.log('🔕 Notifications blocked, but new tickets detected');
      }
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
      icon: '/favicon.ico',
      silent: true
    });
  }

  private persist(): void {
    sessionStorage.setItem(
      'seenIds',
      JSON.stringify([...this.seenIds])
    );
  }
}
