import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterLink, RouterLinkActive],
  templateUrl: './notes.html',
  styleUrls: ['./notes.css'],
})
export class NotesComponent implements OnInit {

  notes: any[] = [];
  loading = true;

  constructor(private cdr: ChangeDetectorRef) {}

  async ngOnInit() {
    console.log('📝 NotesComponent init');
    try {
      this.notes = await (window as any).electronAPI.getAllNotes();
      console.log('✅ Notes ontvangen:', this.notes);
    } catch (err) {
      console.error('❌ Failed to load notes:', err);
      this.notes = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges(); // ✅ forceer re-render
    }
  }
}
