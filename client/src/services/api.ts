const API_BASE = '/api';

export interface TechStack {
  id: string;
  name: string;
  version: string | null;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { vulnerabilities: number };
}

export interface Vulnerability {
  id: string;
  cveId: string | null;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceId: string | null;
  cvssScore: number | null;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical' | null;
  exploitability: 'none' | 'poc' | 'functional' | 'high' | null;
  affectedVersions: string | null;
  patchedVersion: string | null;
  aiSummary: string | null;
  aiImpact: string | null;
  aiRemediation: string | null;
  publishedAt: string | null;
  createdAt: string;
  techStacks?: Array<{
    isAffected: boolean;
    matchConfidence: number | null;
    techStack: { id: string; name: string; version: string | null; category: string | null };
  }>;
}

export interface VulnerabilityStats {
  total: number;
  today: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  bySource: Record<string, number>;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  isRead: boolean;
  vulnerabilityId: string | null;
  createdAt: string;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Tech Stacks API
export const techStacksApi = {
  getAll: () => request<TechStack[]>('/tech-stacks'),

  getById: (id: string) => request<TechStack>(`/tech-stacks/${id}`),

  create: (data: { name: string; version?: string; category?: string }) =>
    request<TechStack>('/tech-stacks', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  update: (id: string, data: Partial<TechStack>) =>
    request<TechStack>(`/tech-stacks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  delete: (id: string) =>
    request<void>(`/tech-stacks/${id}`, { method: 'DELETE' }),

  toggle: (id: string) =>
    request<TechStack>(`/tech-stacks/${id}/toggle`, { method: 'PATCH' })
};

// Vulnerabilities API
export const vulnerabilitiesApi = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    source?: string;
    severity?: string;
    techStackId?: string;
    timeRange?: string;
    timeFrom?: string;
    timeTo?: string;
    sortBy?: string;
    sortOrder?: string;
    cveId?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.append(key, String(value));
      });
    }
    return request<{ data: Vulnerability[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/vulnerabilities?${searchParams}`
    );
  },

  getStats: () => request<VulnerabilityStats>('/vulnerabilities/stats'),

  getById: (id: string) => request<Vulnerability>(`/vulnerabilities/${id}`),

  delete: (id: string) =>
    request<void>(`/vulnerabilities/${id}`, { method: 'DELETE' })
};

// Notifications API
export const notificationsApi = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    return request<{ data: Notification[]; unreadCount: number; pagination: any }>(
      `/notifications?${searchParams}`
    );
  },

  markAsRead: (id: string) =>
    request<Notification>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllAsRead: () =>
    request<void>('/notifications/read-all', { method: 'PATCH' }),

  delete: (id: string) =>
    request<void>(`/notifications/${id}`, { method: 'DELETE' }),

  clear: () =>
    request<void>('/notifications', { method: 'DELETE' })
};

// Settings API
export const settingsApi = {
  getAll: () => request<Record<string, string>>('/settings'),

  update: (settings: Record<string, string>) =>
    request<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    })
};

// Manual trigger
export const triggerVulnerabilityCheck = () =>
  request<{ message: string }>('/check-vulnerabilities', { method: 'POST' });
