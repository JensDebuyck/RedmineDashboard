import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class NoteService {

  async getNote(ticketId: number): Promise<string> {
    return window.electronAPI.getNote(ticketId);
  }

  async saveNote(ticket: any): Promise<boolean> {
    return window.electronAPI.saveNote(ticket);
  }

  // ✅ HIER MOET DIT KOMEN
  async getAllNotes(): Promise<any[]> {
    return window.electronAPI.getAllNotes();
  }
}
