// ========== Vulnerability Search Result (scraper output) ==========
export interface VulnerabilityResult {
  cveId: string | null;
  title: string;
  description: string;
  url: string;
  source: 'nvd' | 'github' | 'cve_circl' | 'security_blog' | 'twitter';
  sourceId?: string;
  publishedAt?: Date;
  cvssScore?: number;
  severity?: 'none' | 'low' | 'medium' | 'high' | 'critical';
  author?: {
    name: string;
    username?: string;
    avatar?: string;
    followers?: number;
    verified?: boolean;
  };
  likeCount?: number;
  retweetCount?: number;
  viewCount?: number;
}

// ========== AI Vulnerability Analysis Output ==========
export interface VulnerabilityAnalysis {
  isReal: boolean;
  relevance: number;
  cvssScore: number;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  exploitability: 'none' | 'poc' | 'functional' | 'high';
  affectedVersions: string;
  patchedVersion: string;
  isAffected: boolean;
  matchConfidence: number;
  aiSummary: string;
  aiImpact: string;
  aiRemediation: string;
}

// ========== DB Query Types ==========
export interface VulnerabilityWithTechStacks {
  id: string;
  cveId: string | null;
  title: string;
  description: string;
  url: string;
  source: string;
  sourceId: string | null;
  cvssScore: number | null;
  severity: string | null;
  exploitability: string | null;
  affectedVersions: string | null;
  patchedVersion: string | null;
  aiSummary: string | null;
  aiImpact: string | null;
  aiRemediation: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  techStacks: Array<{
    id: string;
    techStackId: string;
    vulnerabilityId: string;
    isAffected: boolean;
    matchConfidence: number | null;
    techStack: {
      id: string;
      name: string;
      version: string | null;
      category: string | null;
    };
  }>;
}
