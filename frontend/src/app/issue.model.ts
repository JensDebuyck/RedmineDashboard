export interface CustomField {
  id: number;
  name: string;
  value: string | string[];
}

export interface Issue {
  id: number;
  subject: string;
  project: { id: number; name: string };
  tracker: { id: number; name: string };
  status: { id: number; name: string };
  priority: { id: number; name: string };
  author: { id: number; name: string };
  description: string;
  start_date: string | null;
  due_date: string | null;
  done_ratio: number;
  custom_fields: CustomField[];
  created_on: string;
  updated_on: string;
  closed_on: string | null;
  note?: string;
}
