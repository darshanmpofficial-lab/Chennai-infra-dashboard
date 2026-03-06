export interface User {
  email: string;
  role: 'citizen' | 'authority';
  name: string;
}

export interface Issue {
  id: number;
  type: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url?: string;
  status: 'Pending' | 'In Progress' | 'Resolved';
  created_at: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  priority_reason?: string;
  reporter_email: string;
}

export interface Stats {
  total: number;
  pending: number;
  resolved: number;
  avgResolutionTime: string;
}
