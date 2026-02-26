export interface SortableVulnerability {
  cvssScore: number | null;
  severity: string | null;
  publishedAt: Date | string | null;
  createdAt: Date | string;
}

export const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  none: 4,
};

export function sortVulnerabilities<T extends SortableVulnerability>(
  items: T[],
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): T[] {
  const sorted = [...items];

  sorted.sort((a, b) => {
    let valA: number, valB: number;

    switch (sortBy) {
      case 'cvssScore':
        valA = a.cvssScore ?? -1;
        valB = b.cvssScore ?? -1;
        break;
      case 'severity':
        valA = SEVERITY_ORDER[a.severity || 'none'] ?? 99;
        valB = SEVERITY_ORDER[b.severity || 'none'] ?? 99;
        break;
      case 'publishedAt': {
        const tA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const tB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        valA = tA;
        valB = tB;
        break;
      }
      case 'createdAt':
      default: {
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
        break;
      }
    }

    const diff = sortOrder === 'asc' ? valA - valB : valB - valA;
    return diff;
  });

  return sorted;
}
