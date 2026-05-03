export {};

declare global {
  interface Window {
    electronAPI: {
      getNote: (ticketId: number) => Promise<string>;
      saveNote: (ticket: any) => Promise<boolean>;
      getAllNotes: () => Promise<any[]>;
      getStats: () => Promise<any>;
      getSeenIds: () => Promise<number[]>;
      saveStat: (dateKey: string, count: number) => Promise<void>;
      saveSeenIds: (ids: number[]) => Promise<void>;
    };
  }
}
